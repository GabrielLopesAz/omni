import { Controller, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogisticaService } from './logistica.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('api/v1')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LogisticaController {
  constructor(private readonly logisticaService: LogisticaService) {}

  @Post('conferencia/:id_pedido/bipar')
  @Roles('CONFERENTE', 'ADMIN')
  async biparItem(
    @Param('id_pedido') idPedido: string,
    @Body('sku') sku: string,
    @Req() req: any,
  ) {
    // No RolesGuard já garantimos req.user
    const idUsuario = req.user?.userId;
    const ip = req.ip;
    return this.logisticaService.biparItem(idPedido, sku, idUsuario, ip);
  }
}
