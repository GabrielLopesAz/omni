import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegracaoMarketplace } from '../entities/integracao-marketplace.entity.js';
import { IntegracoesService } from '../integracoes.service.js';
import { MarketplaceAdapterRegistry } from '../adapters/adapter.registry.js';
import { PedidosService } from '../../pedidos/pedidos.service.js';
import * as crypto from 'crypto';

@Injectable()
export class MarketplaceSyncService {
  private readonly logger = new Logger(MarketplaceSyncService.name);
  private runningSyncs = new Set<string>();

  constructor(
    @InjectRepository(IntegracaoMarketplace)
    private readonly integracaoRepo: Repository<IntegracaoMarketplace>,
    private readonly integracoesService: IntegracoesService,
    private readonly adapterRegistry: MarketplaceAdapterRegistry,
    private readonly pedidosService: PedidosService,
  ) {}

  async syncIntegration(idIntegracao: string, idEmpresa: string): Promise<void> {
    const lockKey = `${idEmpresa}:${idIntegracao}`;
    
    // 1. Otimização local (In-Memory)
    if (this.runningSyncs.has(lockKey)) {
      this.logger.warn(`Sync local já está rodando para integração ${idIntegracao}. Pulando.`);
      return;
    }
    this.runningSyncs.add(lockKey);

    const ownerId = crypto.randomUUID();

    try {
      // 2. Lock Distribuído no Banco de Dados
      // Tenta adquirir o lease. Expirará em 15 minutos se o processo morrer.
      const lockAcquired = await this.acquireLock(idIntegracao, idEmpresa, ownerId, 15);
      if (!lockAcquired) {
        this.logger.warn(`Sync bloqueado no banco (lock ativo) para integração ${idIntegracao}. Pulando.`);
        return;
      }

      // 3. Obter credenciais válidas (faz refresh se necessário via IntegracoesService)
      let credentials;
      try {
        credentials = await this.integracoesService.getValidCredentials(idIntegracao, idEmpresa);
      } catch (err: any) {
        this.logger.error(`Não foi possível obter credenciais válidas para ${idIntegracao}: ${err.message}`);
        await this.updateSyncStatus(idIntegracao, idEmpresa, null, `Erro credenciais: ${err.message}`);
        return;
      }

      // 4. Carregar integração para ver checkpoint de data
      const integracao = await this.integracaoRepo.findOne({ where: { id: idIntegracao, idEmpresa } });
      if (!integracao) return;

      const adapter = this.adapterRegistry.getAdapter(integracao.provider);
      if (!adapter.getOrders) {
        this.logger.log(`Adapter ${integracao.provider} não suporta importação de pedidos.`);
        return;
      }

      // Overlap window: Pega pedidos dos últimos 15 minutos
      const overlapMinutes = 15;
      const now = new Date();
      let timeFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000); 
      
      if (integracao.lastSuccessAt) {
        timeFrom = new Date(integracao.lastSuccessAt.getTime() - overlapMinutes * 60 * 1000);
      }
      const timeTo = now;

      // 5. Buscar pedidos do Marketplace
      let orders;
      try {
        orders = await adapter.getOrders(credentials, timeFrom, timeTo);
      } catch (err: any) {
        this.logger.error(`Erro ao buscar pedidos na integração ${idIntegracao}: ${err.message}`);
        await this.updateSyncStatus(idIntegracao, idEmpresa, null, `Erro API: ${err.message}`);
        return;
      }

      // 6. Importar cada pedido
      let successCount = 0;
      let errorCount = 0;

      for (const order of orders) {
        try {
          await this.pedidosService.importarPedidoMarketplace(
            idIntegracao,
            idEmpresa,
            {
              id_pedido_marketplace: order.externalOrderId,
              cliente_nome: order.customerName || 'Cliente',
              valor_total: order.totalAmount,
              taxas_marketplace: 0
            },
            order.items.map(item => ({
              sku: item.sku,
              quantidade: item.quantity,
              precoUnitario: item.unitPrice
            }))
          );
          successCount++;
        } catch (importErr: any) {
          this.logger.warn(`Falha ao importar pedido ${order.externalOrderId} da integracao ${idIntegracao}: ${importErr.message}`);
          errorCount++;
        }
      }

      // 7. Atualizar sucesso
      await this.updateSyncStatus(idIntegracao, idEmpresa, now, null);
      this.logger.log(`Sync ${idIntegracao} finalizado: ${successCount} sucesso, ${errorCount} erros.`);

    } finally {
      this.runningSyncs.delete(lockKey);
      await this.releaseLock(idIntegracao, idEmpresa, ownerId);
    }
  }

  private async acquireLock(id: string, idEmpresa: string, owner: string, timeoutMinutes: number): Promise<boolean> {
    const lockUntil = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    // Tenta atualizar se nao tiver dono ou se o tempo do dono atual ja expirou
    const updateResult = await this.integracaoRepo.manager.query(`
      UPDATE integracoes_marketplace 
      SET sync_lock_owner = ?, sync_lock_until = ? 
      WHERE id = ? AND id_empresa = ? AND (
        sync_lock_until IS NULL 
        OR sync_lock_until < NOW()
      )
    `, [owner, lockUntil, id, idEmpresa]);

    // O MySQL2 driver retorna updateResult com affectedRows em index 0 ou property, vamos verificar dependendo do driver
    const affected = updateResult.affectedRows ?? updateResult[1];
    return affected === 1;
  }

  private async releaseLock(id: string, idEmpresa: string, owner: string): Promise<void> {
    await this.integracaoRepo.manager.query(`
      UPDATE integracoes_marketplace 
      SET sync_lock_owner = NULL, sync_lock_until = NULL 
      WHERE id = ? AND id_empresa = ? AND sync_lock_owner = ?
    `, [id, idEmpresa, owner]);
  }

  private async updateSyncStatus(id: string, idEmpresa: string, successTime: Date | null, errorMsg: string | null) {
    const integracao = await this.integracaoRepo.findOne({ where: { id, idEmpresa } });
    if (!integracao) return;

    integracao.lastSyncAt = new Date();
    if (successTime) {
      integracao.lastSuccessAt = successTime;
      integracao.lastError = null;
    }
    if (errorMsg) {
      integracao.lastErrorAt = new Date();
      integracao.lastError = errorMsg;
    }
    await this.integracaoRepo.save(integracao);
  }
}
