import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogisticaController } from './logistica.controller.js';
import { LogisticaService } from './logistica.service.js';
import { Conferencia } from './entities/conferencia.entity.js';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ItemPedido } from '../pedidos/entities/item-pedido.entity.js';
import { Estoque } from '../catalogo/entities/estoque.entity.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conferencia, Pedido, ItemPedido, Estoque]),
    AuditoriaModule,
  ],
  controllers: [LogisticaController],
  providers: [LogisticaService],
})
export class LogisticaModule {}
