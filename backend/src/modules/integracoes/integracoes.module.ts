import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracaoMarketplace } from './entities/integracao-marketplace.entity.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ItemPedido } from '../pedidos/entities/item-pedido.entity.js';
import { Produto } from '../catalogo/entities/produto.entity.js';
import { MarketplaceSyncCron } from './cron/marketplace-sync.cron.js';
import { CryptoService } from '../../shared/crypto/crypto.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegracaoMarketplace,
      Pedido,
      ItemPedido,
      Produto,
    ]),
  ],
  providers: [MarketplaceSyncCron, CryptoService],
  exports: [MarketplaceSyncCron],
})
export class IntegracoesModule {}
