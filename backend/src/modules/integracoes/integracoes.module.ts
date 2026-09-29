import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracaoMarketplace } from './entities/integracao-marketplace.entity.js';
import { OAuthState } from './entities/oauth-state.entity.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ItemPedido } from '../pedidos/entities/item-pedido.entity.js';
import { Produto } from '../catalogo/entities/produto.entity.js';
import { MarketplaceSyncCron } from './cron/marketplace-sync.cron.js';
import { PedidosModule } from '../pedidos/pedidos.module.js';

import { IntegracoesController } from './integracoes.controller.js';
import { IntegracoesService } from './integracoes.service.js';
import { OAuthStateService } from './oauth-state.service.js';
import { IntegrationCredentialsCryptoService } from './crypto/integration-crypto.service.js';
import { MarketplaceAdapterRegistry } from './adapters/adapter.registry.js';
import { FakeMarketplaceAdapter } from './adapters/fake-marketplace.adapter.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegracaoMarketplace,
      OAuthState,
      Pedido,
      ItemPedido,
      Produto,
    ]),
    PedidosModule,
    AuditoriaModule,
  ],
  controllers: [IntegracoesController],
  providers: [
    MarketplaceSyncCron,
    IntegracoesService,
    OAuthStateService,
    IntegrationCredentialsCryptoService,
    MarketplaceAdapterRegistry,
    FakeMarketplaceAdapter,
    {
      provide: 'ADAPTER_INIT',
      useFactory: (
        registry: MarketplaceAdapterRegistry,
        fakeAdapter: FakeMarketplaceAdapter
      ) => {
        if (process.env.NODE_ENV === 'test') {
          registry.register(fakeAdapter);
        }
      },
      inject: [MarketplaceAdapterRegistry, FakeMarketplaceAdapter],
    }
  ],
  exports: [MarketplaceSyncCron],
})
export class IntegracoesModule {}
