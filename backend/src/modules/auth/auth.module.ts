import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './jwt.strategy.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import { Role } from '../usuarios/entities/role.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Role]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'omni_secret_key_123',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
