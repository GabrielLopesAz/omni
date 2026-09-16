import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PedidosService } from './pedidos.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('api/v1/pedidos')
@UseGuards(RolesGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE', 'CONFERENTE')
  async listar(@Query('status') status?: string) {
    return this.pedidosService.listar(status);
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'CONFERENTE')
  async buscarPorId(@Param('id') id: string) {
    return this.pedidosService.buscarPorId(id);
  }
}
