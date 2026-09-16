import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CatalogoService } from './catalogo.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

@Controller('api/v1/produtos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  async findAll(@Req() req: any) {
    const idEmpresa = req.user?.empresaId;
    return this.catalogoService.findAll(idEmpresa);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.catalogoService.findOne(id);
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const idEmpresa = req.user?.empresaId;
    return this.catalogoService.create(body, idEmpresa);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.catalogoService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.catalogoService.remove(id);
  }

  @Put(':id/estoque')
  async updateEstoque(
    @Param('id') id: string, 
    @Body() body: { quantidade: number; tipo: 'ENTRADA' | 'SAIDA' }
  ) {
    return this.catalogoService.ajustarEstoque(id, body.quantidade, body.tipo);
  }
}
