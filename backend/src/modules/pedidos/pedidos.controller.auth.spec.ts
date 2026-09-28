import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PedidosModule } from './pedidos.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Pedido } from './entities/pedido.entity.js';
import { ItemPedido } from './entities/item-pedido.entity.js';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../usuarios/entities/role.entity.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import { ConfigModule } from '@nestjs/config';

describe('Autorização e RBAC (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: 'test-secret' })],
        }),
        AuthModule,
        PedidosModule,
      ],
    })
      .overrideProvider(getRepositoryToken(Pedido)).useValue({ find: vi.fn(), createQueryBuilder: vi.fn().mockReturnValue({ leftJoinAndSelect: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), getMany: vi.fn().mockResolvedValue([]) }) })
      .overrideProvider(getRepositoryToken(ItemPedido)).useValue({})
      .overrideProvider(getRepositoryToken(Role)).useValue({})
      .overrideProvider(getRepositoryToken(Usuario)).useValue({ findOne: vi.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('sem token -> 401', async () => {
    return request(app.getHttpServer())
      .get('/api/v1/pedidos')
      .expect(401);
  });

  it('token inválido -> 401', async () => {
    return request(app.getHttpServer())
      .get('/api/v1/pedidos')
      .set('Authorization', 'Bearer token_invalido')
      .expect(401);
  });

  it('token válido, role errada -> 403', async () => {
    const token = jwtService.sign({ sub: 'user1', role: 'VENDEDOR' });
    
    return request(app.getHttpServer())
      .get('/api/v1/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toContain('Acesso negado');
      });
  });

  it('token válido, role correta -> sucesso', async () => {
    const token = jwtService.sign({ sub: 'user2', role: 'ADMIN' });
    
    return request(app.getHttpServer())
      .get('/api/v1/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
