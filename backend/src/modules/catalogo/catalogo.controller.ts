import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CatalogoService } from './catalogo.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CreateProdutoDto, UpdateProdutoDto, AjusteEstoqueDto } from './dto/catalogo.dto.js';

@Controller('api/v1/produtos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE', 'FINANCEIRO')
  async findAll(@Req() req: any) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto do usuário.');
    return this.catalogoService.findAll(idEmpresa);
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'FINANCEIRO')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto do usuário.');
    return this.catalogoService.findOne(id, idEmpresa);
  }

  @Post()
  @Roles('ADMIN', 'GERENTE')
  async create(@Body() body: CreateProdutoDto, @Req() req: any) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto do usuário.');
    return this.catalogoService.create(body, idEmpresa);
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE')
  async update(@Param('id') id: string, @Body() body: UpdateProdutoDto, @Req() req: any) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto do usuário.');
    return this.catalogoService.update(id, body, idEmpresa);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GERENTE')
  async remove(@Param('id') id: string, @Req() req: any) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto do usuário.');
    return this.catalogoService.remove(id, idEmpresa);
  }

  @Put(':id/estoque')
  @Roles('ADMIN', 'GERENTE')
  async updateEstoque(
    @Param('id') id: string, 
    @Body() body: AjusteEstoqueDto,
    @Req() req: any
  ) {
    const idEmpresa = req.user?.empresaId;
    if (!idEmpresa) throw new UnauthorizedException('Empresa não identificada no contexto do usuário.');
    const idUsuario = req.user?.userId;
      if (!idUsuario) throw new UnauthorizedException('Usuário não identificado no contexto.');
    return this.catalogoService.ajustarEstoque(id, body.quantidade, body.tipo, body.motivo, idEmpresa, idUsuario);
  }
}
