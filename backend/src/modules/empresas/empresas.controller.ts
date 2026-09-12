import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmpresasService } from './empresas.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('api/v1/empresa')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE')
  async getEmpresa() {
    return this.empresasService.getEmpresa();
  }

  @Put()
  @Roles('ADMIN')
  async updateEmpresa(@Body() data: any) {
    return this.empresasService.updateEmpresa(data);
  }
}
