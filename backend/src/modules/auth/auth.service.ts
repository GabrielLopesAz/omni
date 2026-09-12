import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuarios/entities/usuario.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usuarioRepository.findOne({
      where: { email, ativo: true },
      relations: { role: true, empresa: true },
    });

    if (user && await bcrypt.compare(pass, user.senhaHash)) {
      const { senhaHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role?.nome,
      empresaId: user.empresa?.id
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role?.nome
      }
    };
  }

  async register(body: any) {
    const { email, password, nome } = body;
    
    // Check if user already exists
    const existingUser = await this.usuarioRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new UnauthorizedException('E-mail já está em uso');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const senhaHash = await bcrypt.hash(password, salt);

    // Create user (defaulting role to null or finding default if needed)
    const newUser = this.usuarioRepository.create({
      nome,
      email,
      senhaHash,
      ativo: true
    });

    await this.usuarioRepository.save(newUser);
    
    return this.login(newUser); // Return token so frontend can auto-login or just return success
  }
}
