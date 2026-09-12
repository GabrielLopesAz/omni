import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from './entities/empresa.entity.js';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
  ) {}

  async getEmpresa() {
    const empresa = await this.empresaRepo.createQueryBuilder('e').getOne();
    if (!empresa) return {};
    return {
      razaoSocial: empresa.razaoSocial || '',
      nomeFantasia: empresa.nome || '',
      cnpj: empresa.cnpj || '',
      inscricaoEstadual: empresa.inscricaoEstadual || '',
    };
  }

  async updateEmpresa(data: any) {
    let empresa = await this.empresaRepo.createQueryBuilder('e').getOne();
    if (!empresa) {
      empresa = this.empresaRepo.create();
    }
    
    empresa.nome = data.nomeFantasia || '';
    empresa.razaoSocial = data.razaoSocial || '';
    empresa.cnpj = data.cnpj || '';
    empresa.inscricaoEstadual = data.inscricaoEstadual || '';
    
    await this.empresaRepo.save(empresa);
    return data;
  }
}
