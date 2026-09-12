import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity.js';
import { Role } from './entities/role.entity.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async getUsuarios() {
    const usuarios = await this.usuarioRepo.find({ relations: { role: true } });
    return usuarios.map(u => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      role: u.role ? u.role.nome : null,
      ativo: u.ativo
    }));
  }

  async createUsuario(data: any) {
    const existing = await this.usuarioRepo.findOne({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('Email já cadastrado');
    }

    const roleEntity = await this.roleRepo.findOne({ where: { nome: data.role } });
    if (!roleEntity) {
      throw new BadRequestException('Role não encontrada');
    }

    const salt = await bcrypt.genSalt();
    const senhaHash = await bcrypt.hash(data.senhaTemporaria || '123456', salt);

    const newUser = this.usuarioRepo.create({
      nome: data.nome,
      email: data.email,
      senhaHash,
      role: roleEntity,
      ativo: true,
    });

    await this.usuarioRepo.save(newUser);
    
    return {
      id: newUser.id,
      nome: newUser.nome,
      email: newUser.email,
      role: roleEntity.nome,
      ativo: newUser.ativo
    };
  }

  async updateUsuario(id: string, data: any) {
    const user = await this.usuarioRepo.findOne({ where: { id }, relations: { role: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (data.email && data.email !== user.email) {
      const existing = await this.usuarioRepo.findOne({ where: { email: data.email } });
      if (existing) throw new BadRequestException('Email já cadastrado para outro usuário');
      user.email = data.email;
    }

    if (data.nome) user.nome = data.nome;
    
    if (data.role) {
      const roleEntity = await this.roleRepo.findOne({ where: { nome: data.role } });
      if (!roleEntity) throw new BadRequestException('Role não encontrada');
      user.role = roleEntity;
    }

    if (data.status !== undefined) {
      user.ativo = data.status === 'ATIVO' || data.status === true;
    } else if (data.ativo !== undefined) {
      user.ativo = data.ativo;
    }

    if (data.senhaTemporaria) {
      const salt = await bcrypt.genSalt();
      user.senhaHash = await bcrypt.hash(data.senhaTemporaria, salt);
    }

    await this.usuarioRepo.save(user);

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role?.nome,
      ativo: user.ativo
    };
  }

  async deleteUsuario(id: string) {
    const user = await this.usuarioRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    
    // Hard delete para simplicidade do CRUD
    await this.usuarioRepo.remove(user);
    return { success: true };
  }
}

