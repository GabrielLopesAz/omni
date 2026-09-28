import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosController } from './pedidos.controller.js';
import { PedidosService } from './pedidos.service.js';
import { Pedido } from './entities/pedido.entity.js';
import { ItemPedido } from './entities/item-pedido.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, ItemPedido])],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService, TypeOrmModule],
})
export class PedidosModule {}
