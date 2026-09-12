import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { IntegracoesModule } from './modules/integracoes/integracoes.module.js';
import { AuditoriaModule } from './modules/auditoria/auditoria.module.js';
import { LogisticaModule } from './modules/logistica/logistica.module.js';
import { CatalogoModule } from './modules/catalogo/catalogo.module.js';
import { EmpresasModule } from './modules/empresas/empresas.module.js';
import { UsuariosModule } from './modules/usuarios/usuarios.module.js';
import { Empresa } from './modules/empresas/entities/empresa.entity.js';
import { Role } from './modules/usuarios/entities/role.entity.js';
import { Usuario } from './modules/usuarios/entities/usuario.entity.js';
import { IntegracaoMarketplace } from './modules/integracoes/entities/integracao-marketplace.entity.js';
import { Produto } from './modules/catalogo/entities/produto.entity.js';
import { Estoque } from './modules/catalogo/entities/estoque.entity.js';
import { Pedido } from './modules/pedidos/entities/pedido.entity.js';
import { ItemPedido } from './modules/pedidos/entities/item-pedido.entity.js';
import { AuditoriaLog } from './modules/auditoria/entities/auditoria-log.entity.js';
import { Conferencia } from './modules/logistica/entities/conferencia.entity.js';
import { SharedModule } from './shared/shared.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 5 * 60, // 5 minutos
      limit: 5, // 5 requisições max
    }]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'omni',
      entities: [
        Empresa, Role, Usuario, IntegracaoMarketplace, Produto, 
        Estoque, Pedido, ItemPedido, AuditoriaLog, Conferencia
      ],
      synchronize: false, // Em produção e homologação deve ser false (usar migrations ou script sql base)
    }),
    SharedModule,
    AuthModule,
    EmpresasModule,
    UsuariosModule,
    IntegracoesModule,
    AuditoriaModule,
    LogisticaModule,
    CatalogoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Aplica o Rate Limiting globalmente
    }
  ],
})
export class AppModule {}
