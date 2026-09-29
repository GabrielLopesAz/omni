import { Controller, Post, Get, Param, Body, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogisticaService } from './logistica.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { BipagemDto } from './dto/bipagem.dto.js';

@Controller('api/v1')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LogisticaController {
  constructor(private readonly logisticaService: LogisticaService) {}

  @Get('conferencia/:id_pedido')
  @Roles('CONFERENTE', 'ADMIN', 'GERENTE')
  async getPedido(
    @Param('id_pedido') idPedido: string,
    @Req() req: any,
  ) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto');
    return this.logisticaService.getPedidoParaConferencia(idPedido, idEmpresa);
  }

  @Post('conferencia/:id_pedido/bipar')
  @Roles('CONFERENTE', 'ADMIN', 'GERENTE')
  async biparItem(
    @Param('id_pedido') idPedido: string,
    @Body() body: BipagemDto,
    @Req() req: any,
  ) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto');
    const idUsuario = req.user?.userId;
    if (!idUsuario) throw new UnauthorizedException('Usuário não identificado no contexto');
    const ip = req.ip;
    return this.logisticaService.biparItem(idPedido, body.sku, idUsuario, ip, idEmpresa);
  }

  @Post('logistica/pedidos/:id/expedir')
  @Roles('CONFERENTE', 'ADMIN', 'GERENTE')
  async expedir(
    @Param('id') idPedido: string,
    @Req() req: any,
  ) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto');
    const idUsuario = req.user?.userId;
    if (!idUsuario) throw new UnauthorizedException('Usuário não identificado no contexto');
    return this.logisticaService.expedir(idPedido, idEmpresa, idUsuario, req.ip);
  }
}
