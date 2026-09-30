import { sanitizeExternalError } from '../../shared/utils/error-sanitizer.util.js';
import { Controller, Post, Get, Param, Query, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { IntegracoesService } from './integracoes.service.js';

@Controller('api/v1/integracoes')
export class IntegracoesController {
  constructor(private readonly integracoesService: IntegracoesService) {}

  @Post(':provider/connect')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async connect(
    @Param('provider') provider: string,
    @Req() req: any,
  ) {
    const idEmpresa = req.user?.empresaId;
    const idUsuario = req.user?.userId;
    if (!idEmpresa || !idUsuario) throw new UnauthorizedException();
    
    return this.integracoesService.connect(provider, idEmpresa, idUsuario);
  }

  // Callback publico. Nao usa JWT, usa o state.
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    try {
      if (!state) throw new Error('State ausente');
      await this.integracoesService.callback(provider, code, state, req.ip);
      return res.redirect(`/integracoes?status=success&provider=${provider}`);
    } catch (error: any) {
      let publicError = 'INTERNAL_ERROR';
      const msg = sanitizeExternalError(error);
      
      if (msg.includes('State')) {
         publicError = msg.includes('expirado') ? 'STATE_EXPIRED' : 'INVALID_STATE';
      } else if (msg.includes('provider divergente') || msg.includes('Provider divergente')) {
         publicError = 'PROVIDER_MISMATCH';
      } else if (msg.includes('autorizaÃ§Ã£o') || msg.includes('authorization') || msg.includes('code')) {
         publicError = 'AUTHORIZATION_FAILED';
      }
      
      // Log do erro real no servidor para debug
      console.error(`[OAuth Callback Error] Provider: ${provider} - ${msg}`);

      return res.redirect(`/integracoes?status=error&provider=${provider}&message=${publicError}`);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GERENTE')
  async listar(@Req() req: any) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException();
    return this.integracoesService.listar(idEmpresa);
  }

  @Post(':id/disconnect')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async disconnect(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const idEmpresa = req.user?.empresaId;
    const idUsuario = req.user?.userId;
    if (!idEmpresa || !idUsuario) throw new UnauthorizedException();

    await this.integracoesService.disconnect(id, idEmpresa, idUsuario, req.ip);
    return { message: 'Desconectado com sucesso' };
  }
}

