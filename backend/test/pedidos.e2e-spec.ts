import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { clearDatabaseSafely } from './test-utils.js';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('Pedidos Multi-Tenant (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokenEmpA: string;
  let tokenEmpB: string;
  let idPedidoA: string;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') throw new Error('FAIL-FAST: NODE_ENV must be test');
    if (!process.env.DB_NAME || !process.env.DB_NAME.endsWith('test')) throw new Error('FAIL-FAST: DB_NAME must end with test');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    dataSource = app.get(DataSource);
    await clearDatabaseSafely(dataSource, ['itens_pedido', 'pedidos', 'estoque', 'produtos', 'integracoes_marketplace', 'usuarios', 'empresas']);

    // Setup: 2 companies, 2 users, 1 order for empA
    await dataSource.query(`INSERT INTO empresas (id, nome) VALUES ('emp-A', 'Empresa A'), ('emp-B', 'Empresa B')`);
    await dataSource.query(`INSERT INTO usuarios (id, id_empresa, nome, email, senha_hash) VALUES 
      ('usr-A', 'emp-A', 'Admin A', 'a@a.com', '...'),
      ('usr-B', 'emp-B', 'Admin B', 'b@b.com', '...')`);

    const jwtService = app.get(JwtService);
    tokenEmpA = jwtService.sign({ sub: 'usr-A', email: 'a@a.com', role: 'ADMIN', empresaId: 'emp-A' });
    tokenEmpB = jwtService.sign({ sub: 'usr-B', email: 'b@b.com', role: 'ADMIN', empresaId: 'emp-B' });

    // Criar integraÃ§Ã£o e pedido pra emp-A
    await dataSource.query(`INSERT INTO integracoes_marketplace (id, id_empresa, provider, status) VALUES ('int-A', 'emp-A', 'FAKE_MARKETPLACE', 'CONECTADO')`);
    await dataSource.query(`INSERT INTO pedidos (id, id_integracao, id_empresa, cliente_nome, status, id_pedido_marketplace) VALUES ('ped-A', 'int-A', 'emp-A', 'Cliente A', 'Pendente', 'EXT-1')`);
    idPedidoA = 'ped-A';
  });

  afterAll(async () => {
    await app.close();
  });

  it('listar() - Empresa A deve ver o pedido A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pedidos')
      .set('Authorization', 'Bearer ' + tokenEmpA)
      .expect(200);

    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(idPedidoA);
  });

  it('listar() - Empresa B NÃƒO deve ver o pedido A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pedidos')
      .set('Authorization', 'Bearer ' + tokenEmpB)
      .expect(200);

    expect(res.body.length).toBe(0);
  });

  it('buscarPorId() - Empresa A acessa seu pedido A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pedidos/' + idPedidoA)
      .set('Authorization', 'Bearer ' + tokenEmpA)
      .expect(200);

    expect(res.body.id).toBe(idPedidoA);
  });

  it('buscarPorId() - Empresa B NÃƒO consegue acessar pedido A (404)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pedidos/' + idPedidoA)
      .set('Authorization', 'Bearer ' + tokenEmpB)
      .expect(404);
  });
});



