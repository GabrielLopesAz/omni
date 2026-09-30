import { IntegracoesService } from '../src/modules/integracoes/integracoes.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

import { clearDatabaseSafely } from './test-utils.js';

describe('Integracoes Marketplace (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let dataSource: DataSource;

  let tokenAdminEmpA: string;
  let tokenAdminEmpB: string;
  let tokenConfEmpA: string;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') throw new Error('FAIL-FAST: NODE_ENV must be test');
    if (!process.env.DB_NAME || !process.env.DB_NAME.endsWith('test')) throw new Error('FAIL-FAST: DB_NAME must end with test');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = app.get(JwtService);
    dataSource = app.get(DataSource);

    // Clean up safely with fail-fast
    await clearDatabaseSafely(dataSource, [
      'auditoria_logs',
      'integracoes_marketplace',
      'oauth_states',
      'usuarios',
      'empresas'
    ]);

    // Create Tenants
    await dataSource.query(`INSERT INTO empresas (id, nome) VALUES ('emp-a', 'Emp A'), ('emp-b', 'Emp B')`);
    await dataSource.query(`INSERT INTO usuarios (id, id_empresa, nome, email, senha_hash) VALUES ('usr-a', 'emp-a', 'Admin A', 'a@a.com', '123'), ('usr-b', 'emp-b', 'Admin B', 'b@b.com', '123'), ('usr-ca', 'emp-a', 'Conf A', 'c@a.com', '123')`);

    tokenAdminEmpA = jwtService.sign({ sub: 'usr-a', email: 'a@a.com', role: 'ADMIN', empresaId: 'emp-a' });
    tokenAdminEmpB = jwtService.sign({ sub: 'usr-b', email: 'b@b.com', role: 'ADMIN', empresaId: 'emp-b' });
    tokenConfEmpA = jwtService.sign({ sub: 'usr-ca', email: 'c@a.com', role: 'CONFERENTE', empresaId: 'emp-a' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Connect', () => {
    it('deve rejeitar usuarios sem role de ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/integracoes/FAKE_MARKETPLACE/connect')
        .set('Authorization', `Bearer ${tokenConfEmpA}`)
        .expect(403);
    });

    it('deve iniciar conexao para ADMIN e retornar URL com state seguro', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/integracoes/FAKE_MARKETPLACE/connect')
        .set('Authorization', `Bearer ${tokenAdminEmpA}`)
        .expect(201); // Post returns 201 by default in Nest

      expect(res.body.authorizationUrl).toContain('https://fake.marketplace.com/oauth?state=');
    });

    it('deve falhar para provider nao registrado', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/integracoes/INVALID_PROVIDER/connect')
        .set('Authorization', `Bearer ${tokenAdminEmpA}`)
        .expect(400); // Bad Request from adapter registry
    });
  });

  describe('Callback', () => {
    let validState: string;

    beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') throw new Error('FAIL-FAST: NODE_ENV must be test');
    if (!process.env.DB_NAME || !process.env.DB_NAME.endsWith('test')) throw new Error('FAIL-FAST: DB_NAME must end with test');

      const res = await request(app.getHttpServer())
        .post('/api/v1/integracoes/FAKE_MARKETPLACE/connect')
        .set('Authorization', `Bearer ${tokenAdminEmpA}`);
      const url = new URL(res.body.authorizationUrl);
      validState = url.searchParams.get('state') as string;
    });

    it('deve rejeitar state ausente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/integracoes/FAKE_MARKETPLACE/callback?code=valid-fake-code')
        .expect(302)
        .expect('Location', /error/);
    });

    it('deve rejeitar provider divergente', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/integracoes/OTHER_PROVIDER/callback?code=valid-fake-code&state=${validState}`)
        .expect(302)
        .expect('Location', /error/);
    });

    it('deve processar callback e salvar integracao', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/integracoes/FAKE_MARKETPLACE/callback?code=valid-fake-code&state=${validState}`)
        .expect(302)
        .expect('Location', '/integracoes?status=success&provider=FAKE_MARKETPLACE');

      // Verifica banco
      const integracoes = await dataSource.query(`SELECT * FROM integracoes_marketplace WHERE id_empresa = 'emp-a'`);
      expect(integracoes).toHaveLength(1);
      expect(integracoes[0].status).toBe('CONECTADO');
      expect(integracoes[0].access_token_encrypted).not.toBe('fake-access-token-123'); // must be encrypted
      expect(integracoes[0].access_token_encrypted).toContain(':'); // IV:enc:tag format
    });

    it('deve rejeitar state ja utilizado (Replay Attack)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/integracoes/FAKE_MARKETPLACE/callback?code=valid-fake-code&state=${validState}`)
        .expect(302)
        .expect('Location', /error/);
    });
  });

  describe('Listagem e Multi-Tenant', () => {
    it('deve retornar integracoes da empresa sem expor tokens', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/integracoes')
        .set('Authorization', `Bearer ${tokenAdminEmpA}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      const integracao = res.body[0];
      expect(integracao.provider).toBe('FAKE_MARKETPLACE');
      expect(integracao.status).toBe('CONECTADO');
      expect(integracao.accessTokenEncrypted).toBeUndefined(); // Never expose
      expect(integracao.credenciais).toBeUndefined();
    });

    it('nao deve listar integracoes de outras empresas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/integracoes')
        .set('Authorization', `Bearer ${tokenAdminEmpB}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });

  describe('Refresh & Internal Service Logic', () => {
    let idIntegracao: string;
    let integracoesService: IntegracoesService; // We'll grab it from app

    beforeAll(async () => {
      integracoesService = app.get(IntegracoesService);
      const dbRes = await dataSource.query(`SELECT id FROM integracoes_marketplace WHERE id_empresa = 'emp-a' LIMIT 1`);
      idIntegracao = dbRes[0].id;
      // Force token to be expired
      await dataSource.query(`UPDATE integracoes_marketplace SET token_expires_at = '2020-01-01 00:00:00' WHERE id = ?`, [idIntegracao]);
    });

    it('deve renovar token quando expirado chamando getValidCredentials', async () => {
      // Pega credenciais
      const creds = await integracoesService.getValidCredentials(idIntegracao, 'emp-a');
      
      expect(creds.accessToken).toBe('fake-access-token-refreshed');
      expect(creds.refreshToken).toBe('fake-refresh-token-refreshed');
      
      // Verifica banco
      const [integracao] = await dataSource.query(`SELECT * FROM integracoes_marketplace WHERE id = ?`, [idIntegracao]);
      expect(integracao.access_token_encrypted).not.toBe('fake-access-token-refreshed'); // deve estar criptografado
      expect(new Date(integracao.token_expires_at).getFullYear()).toBeGreaterThan(2020); // foi atualizado
    });
    
    it('deve registrar auditoria de TOKEN_REFRESH', async () => {
       const [audit] = await dataSource.query(`SELECT * FROM auditoria_logs WHERE acao = 'TOKEN_REFRESH' ORDER BY created_at DESC LIMIT 1`);
       expect(audit).toBeDefined();
       expect(audit.tabela_afetada).toBe('integracoes_marketplace');
    });

    it('deve lidar com concorrencia chamando getValidCredentials simultaneamente', async () => {
      // Force expiration again
      await dataSource.query(`UPDATE integracoes_marketplace SET token_expires_at = '2020-01-01 00:00:00' WHERE id = ?`, [idIntegracao]);
      
      const results = await Promise.allSettled([
        integracoesService.getValidCredentials(idIntegracao, 'emp-a'),
        integracoesService.getValidCredentials(idIntegracao, 'emp-a')
      ]);
      
      // Both should succeed (one will refresh, the other will either wait on lock and get the refreshed token because isExpiring becomes false)
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      
      const val1 = (results[0] as any).value;
      const val2 = (results[1] as any).value;
      
      expect(val1.accessToken).toBe(val2.accessToken);
    });
  });

  describe('Disconnect', () => {
    let idIntegracao: string;

    beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') throw new Error('FAIL-FAST: NODE_ENV must be test');
    if (!process.env.DB_NAME || !process.env.DB_NAME.endsWith('test')) throw new Error('FAIL-FAST: DB_NAME must end with test');

      const dbRes = await dataSource.query(`SELECT id FROM integracoes_marketplace WHERE id_empresa = 'emp-a' LIMIT 1`);
      idIntegracao = dbRes[0].id;
    });

    it('nao deve permitir empresa B desconectar integracao da empresa A', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/integracoes/${idIntegracao}/disconnect`)
        .set('Authorization', `Bearer ${tokenAdminEmpB}`)
        .expect(404);
    });

    it('deve desconectar integracao e apagar credenciais', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/integracoes/${idIntegracao}/disconnect`)
        .set('Authorization', `Bearer ${tokenAdminEmpA}`)
        .expect(201); // default POST 201

      const [integracao] = await dataSource.query(`SELECT * FROM integracoes_marketplace WHERE id = ?`, [idIntegracao]);
      expect(integracao.status).toBe('DESCONECTADO');
      expect(integracao.access_token_encrypted).toBeNull();
      expect(integracao.disconnected_at).not.toBeNull();
    });
  });
});



