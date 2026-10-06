import { sanitizeExternalError } from '../../../shared/utils/error-sanitizer.util.js';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegracaoMarketplace } from '../entities/integracao-marketplace.entity.js';
import { IntegracoesService } from '../integracoes.service.js';
import { MarketplaceAdapterRegistry } from '../adapters/adapter.registry.js';
import { PedidosService } from '../../pedidos/pedidos.service.js';
import * as crypto from 'crypto';

export interface SyncSummary {
  fetched: number;
  imported: number;
  duplicates: number;
  cancelled: number;
  failed: number;
}

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

  async syncIntegration(idIntegracao: string, idEmpresa: string): Promise<SyncSummary> {
    const summary: SyncSummary = { fetched: 0, imported: 0, duplicates: 0, cancelled: 0, failed: 0 };
    const lockKey = `${idEmpresa}:${idIntegracao}`;
    
    if (this.runningSyncs.has(lockKey)) {
      this.logger.warn(`Sync local jÃ¡ estÃ¡ rodando para integraÃ§Ã£o ${idIntegracao}. Pulando.`);
      return summary;
    }
    this.runningSyncs.add(lockKey);

    const ownerId = crypto.randomUUID();

    try {
      const lockAcquired = await this.acquireLock(idIntegracao, idEmpresa, ownerId, 15);
      if (!lockAcquired) {
        this.logger.warn(`Sync bloqueado no banco (lock ativo) para integraÃ§Ã£o ${idIntegracao}. Pulando.`);
        return summary;
      }

      let credentials;
      try {
        credentials = await this.integracoesService.getValidCredentials(idIntegracao, idEmpresa);
      } catch (err: any) {
        this.logger.error(`NÃ£o foi possÃ­vel obter credenciais vÃ¡lidas para ${idIntegracao}: ${sanitizeExternalError(err)}`);
        await this.updateSyncStatus(idIntegracao, idEmpresa, null, `Erro credenciais: ${sanitizeExternalError(err)}`);
        return summary;
      }

      const integracao = await this.integracaoRepo.findOne({ where: { id: idIntegracao, idEmpresa } });
      if (!integracao) return summary;

      const adapter = this.adapterRegistry.getAdapter(integracao.provider);
      if (!adapter.getOrders) {
        this.logger.log(`Adapter ${integracao.provider} nÃ£o suporta importaÃ§Ã£o de pedidos.`);
        return summary;
      }

      const overlapMinutes = 15;
      const now = new Date();
      let timeFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000); 
      
      if (integracao.lastSuccessAt) {
        timeFrom = new Date(integracao.lastSuccessAt.getTime() - overlapMinutes * 60 * 1000);
      }
      const timeTo = now;

      let orders;
      try {
        orders = await adapter.getOrders(credentials, timeFrom, timeTo);
      } catch (err: any) {
        this.logger.error(`Erro ao buscar pedidos na integraÃ§Ã£o ${idIntegracao}: ${sanitizeExternalError(err)}`);
        await this.updateSyncStatus(idIntegracao, idEmpresa, null, `Erro API: ${sanitizeExternalError(err)}`);
        return summary;
      }

      summary.fetched = orders.length;
      let errorCount = 0;

      for (const order of orders) {
        try {
          if (order.action === 'IMPORT') {
            await this.pedidosService.importarPedidoMarketplace(
              idIntegracao,
              idEmpresa,
              {
                id_pedido_marketplace: order.externalOrderId,
                cliente_nome: order.customerName || 'Cliente',
                valor_total: order.totalAmount,
                taxas_marketplace: 0,
                status: order.externalStatus === 'PROCESSED' ? 'EM_SEPARACAO' : 'Aprovado'
              },
              order.items.map(item => ({
                sku: item.sku,
                quantidade: item.quantity,
                precoUnitario: item.unitPrice
              }))
            );
            summary.imported++;
          } else if (order.action === 'CANCEL') {
            await this.pedidosService.cancelarPedidoMarketplace(idIntegracao, idEmpresa, order.externalOrderId);
            summary.cancelled++;
          } else if (order.action === 'UPDATE_STATUS' || order.action === 'CONFLICT') {
             await this.pedidosService.atualizarStatusMarketplace(idIntegracao, idEmpresa, order.externalOrderId, order.externalStatus, order.action);
          }
        } catch (importErr: any) {
          const errMsg = sanitizeExternalError(importErr);
          if (errMsg.includes('CONFLICT')) {
             this.logger.warn(`Conflito ao atualizar pedido ${order.externalOrderId}: ${errMsg}`);
          } else {
             this.logger.warn(`Falha ao processar pedido ${order.externalOrderId} da integracao ${idIntegracao}: ${errMsg}`);
             errorCount++;
             summary.failed++;
          }
        }
      }

      await this.updateSyncStatus(
        idIntegracao, 
        idEmpresa, 
        errorCount === 0 ? now : null, 
        errorCount > 0 ? `Falha parcial em ${errorCount} pedidos` : null
      );
      this.logger.log(`Sync ${idIntegracao} finalizado: ${summary.imported} importados, ${summary.failed} erros.`);

    } finally {
      this.runningSyncs.delete(lockKey);
      await this.releaseLock(idIntegracao, idEmpresa, ownerId);
    }
    
    return summary;
  }

  private async acquireLock(id: string, idEmpresa: string, owner: string, timeoutMinutes: number): Promise<boolean> {
    const lockUntil = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    const updateResult = await this.integracaoRepo.manager.query(`
      UPDATE integracoes_marketplace 
      SET sync_lock_owner = ?, sync_lock_until = ? 
      WHERE id = ? AND id_empresa = ? AND (
        sync_lock_until IS NULL 
        OR sync_lock_until < NOW()
      )
    `, [owner, lockUntil, id, idEmpresa]);

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


