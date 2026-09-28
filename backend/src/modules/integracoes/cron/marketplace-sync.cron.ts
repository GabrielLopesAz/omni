import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegracaoMarketplace } from '../entities/integracao-marketplace.entity.js';
import { CryptoService } from '../../../shared/crypto/crypto.service.js';
import { Pedido } from '../../pedidos/entities/pedido.entity.js';
import { ItemPedido } from '../../pedidos/entities/item-pedido.entity.js';
import { Produto } from '../../catalogo/entities/produto.entity.js';
import { IMarketplaceAdapter } from '../adapters/marketplace-adapter.interface.js';
import { PedidosService } from '../../pedidos/pedidos.service.js';

@Injectable()
export class MarketplaceSyncCron {
  private readonly logger = new Logger(MarketplaceSyncCron.name);

  constructor(
    @InjectRepository(IntegracaoMarketplace)
    private integracaoRepo: Repository<IntegracaoMarketplace>,
    @InjectRepository(Pedido)
    private pedidoRepo: Repository<Pedido>,
    @InjectRepository(ItemPedido)
    private itemPedidoRepo: Repository<ItemPedido>,
    @InjectRepository(Produto)
    private produtoRepo: Repository<Produto>,
    private cryptoService: CryptoService,
    private pedidosService: PedidosService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.log('Iniciando sincronização de Marketplaces (Polling)...');
    
    // 1. Busca integrações ativas
    const integracoes = await this.integracaoRepo.find({ where: { status: 'ativo' } });
    
    if (integracoes.length === 0) {
      this.logger.log('Nenhuma integração ativa encontrada.');
      return;
    }

    // 2. Prepara as Promises para bater nas APIs concorrentemente
    const syncPromises = integracoes.map(async (integracao) => {
      try {
        // Descriptografa credenciais
        let credenciais;
        if (typeof integracao.credenciais === 'string') {
           const dec = this.cryptoService.decrypt(integracao.credenciais);
           credenciais = JSON.parse(dec);
        } else {
           credenciais = integracao.credenciais; // Mock para testes sem enc
        }

        // Factory do Adapter baseada no nome (ex: MercadoLivreAdapter)
        const adapter = this.getAdapterByNome(integracao.nome);
        if (!adapter) throw new Error(`Adapter para ${integracao.nome} não encontrado`);

        // Busca pedidos pendentes
        const pedidosMarketplace = await adapter.buscarPedidosPendentes(credenciais);
        
        // 3. Otimização: Salvar em Bulk (Batch Insert)
        if (pedidosMarketplace.length > 0) {
           await this.salvarPedidosEmLote(integracao, pedidosMarketplace);
        }
        
        // Atualiza última sincronização
        integracao.ultimaSincronizacao = new Date();
        await this.integracaoRepo.save(integracao);
        
        return { integracao: integracao.nome, status: 'sucesso', pedidosSync: pedidosMarketplace.length };
      } catch (error: any) {
        this.logger.error(`Erro ao sincronizar ${integracao.nome}:`, error.message);
        throw error;
      }
    });

    // 4. allSettled para evitar que o erro de 1 Marketplace quebre o loop
    const results = await Promise.allSettled(syncPromises);
    
    const successes = results.filter(r => r.status === 'fulfilled').length;
    const errors = results.filter(r => r.status === 'rejected').length;
    
    this.logger.log(`Sincronização concluída. Sucesso: ${successes} | Falhas: ${errors}`);
  }

  private getAdapterByNome(nome: string): IMarketplaceAdapter | null {
    // Implementação Dummy Factory: no futuro as classes reais serão instanciadas
    if (nome === 'Shopee') {
      return {
        buscarPedidosPendentes: async (creds) => [],
        atualizarEstoque: async (creds, sku, qtd) => true
      };
    }
    return null;
  }

  private async salvarPedidosEmLote(integracao: IntegracaoMarketplace, pedidos: any[]) {
    for (const p of pedidos) {
      try {
        await this.pedidosService.importarPedidoMarketplace(
          integracao.id, 
          integracao.idEmpresa, 
          p, 
          p.itens
        );
      } catch (err: any) {
        this.logger.error(`Erro ao importar pedido ${p.id_pedido_marketplace}: ${err.message}`);
        // Continua para o próximo pedido para não travar o lote inteiro por causa de um produto sem estoque.
      }
    }
  }
}
