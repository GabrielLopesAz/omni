import { Controller, Get, Param, Query, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PedidosService } from './pedidos.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('api/v1/pedidos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE', 'CONFERENTE')
  async listar(@Req() req: any, @Query('status') status?: string) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto');
    return this.pedidosService.listar(idEmpresa, status);
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'CONFERENTE')
  async buscarPorId(@Req() req: any, @Param('id') id: string) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto');
    return this.pedidosService.buscarPorId(id, idEmpresa);
  }
}
