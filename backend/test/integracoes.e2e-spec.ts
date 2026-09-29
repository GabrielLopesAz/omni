import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

describe('Integracoes Marketplace (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let dataSource: DataSource;

  let tokenAdminEmpA: string;
  let tokenAdminEmpB: string;
  let tokenConfEmpA: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = app.get(JwtService);
    dataSource = app.get(DataSource);

    // Run migrations dynamically for test env
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS \`oauth_states\` (
        \`state\` varchar(128) NOT NULL,
        \`provider\` varchar(50) NOT NULL,
        \`id_empresa\` varchar(36) NOT NULL,
        \`id_usuario\` varchar(36) NOT NULL,
        \`expires_at\` timestamp NOT NULL,
        \`used_at\` timestamp NULL DEFAULT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`state\`),
        KEY \`fk_oauth_states_empresa\` (\`id_empresa\`),
        KEY \`fk_oauth_states_usuario\` (\`id_usuario\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Alter integrations table
    try {
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`provider\` varchar(50) NOT NULL AFTER \`id_empresa\``);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`external_account_id\` varchar(100) NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`external_account_name\` varchar(255) NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`access_token_encrypted\` text NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`refresh_token_encrypted\` text NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`token_expires_at\` timestamp NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`scopes\` text NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`connected_at\` timestamp NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`disconnected_at\` timestamp NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`last_sync_at\` timestamp NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`last_success_at\` timestamp NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`last_error_at\` timestamp NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`last_error\` text NULL`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` ADD COLUMN IF NOT EXISTS \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` DROP COLUMN IF EXISTS \`credenciais\``);
      await dataSource.query(`ALTER TABLE \`integracoes_marketplace\` DROP COLUMN IF EXISTS \`ultima_sincronizacao\``);
    } catch(e) {}

    // Clean up safely
    try { await dataSource.query(`DELETE FROM auditoria_logs WHERE id_usuario IN ('usr-a', 'usr-b', 'usr-ca')`); } catch(e){}
    try { await dataSource.query(`DELETE FROM integracoes_marketplace WHERE id_empresa IN ('emp-a', 'emp-b')`); } catch(e){}
    try { await dataSource.query(`DELETE FROM oauth_states WHERE id_empresa IN ('emp-a', 'emp-b')`); } catch(e){}
    try { await dataSource.query(`DELETE FROM usuarios WHERE id IN ('usr-a', 'usr-b', 'usr-ca')`); } catch(e){}
    try { await dataSource.query(`DELETE FROM empresas WHERE id IN ('emp-a', 'emp-b')`); } catch(e){}

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

  describe('Disconnect', () => {
    let idIntegracao: string;

    beforeAll(async () => {
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
