import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsuariosService } from './usuarios.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('api/v1/usuarios')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE')
  async getUsuarios() {
    return this.usuariosService.getUsuarios();
  }

  @Post()
  @Roles('ADMIN')
  async createUsuario(@Body() data: any) {
    return this.usuariosService.createUsuario(data);
  }

  @Put(':id')
  @Roles('ADMIN')
  async updateUsuario(@Param('id') id: string, @Body() data: any) {
    return this.usuariosService.updateUsuario(id, data);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deleteUsuario(@Param('id') id: string) {
    return this.usuariosService.deleteUsuario(id);
  }
}

