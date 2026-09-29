import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { CatalogoService } from '../src/modules/catalogo/catalogo.service.js';

describe('Catálogo e Estoque (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let catalogoService: CatalogoService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    catalogoService = moduleFixture.get<CatalogoService>(CatalogoService);

    // Setup de Empresas de teste para Multi-tenant
    await dataSource.query(`DELETE FROM estoque WHERE id_produto IN (SELECT id FROM produtos WHERE id_empresa IN ('emp-a', 'emp-b'))`);
    await dataSource.query(`DELETE FROM itens_pedido WHERE id_produto IN (SELECT id FROM produtos WHERE id_empresa IN ('emp-a', 'emp-b'))`);
    await dataSource.query(`DELETE FROM pedidos WHERE id_empresa IN ('emp-a', 'emp-b')`);
    await dataSource.query(`DELETE FROM produtos WHERE id_empresa IN ('emp-a', 'emp-b')`);
    await dataSource.query(`DELETE FROM empresas WHERE id IN ('emp-a', 'emp-b')`);
    await dataSource.query(`DELETE FROM usuarios WHERE id = 'usr1'`);
    await dataSource.query(`INSERT INTO empresas (id, nome, cnpj) VALUES ('emp-a', 'Empresa A', '0001'), ('emp-b', 'Empresa B', '0002')`);
    await dataSource.query(`INSERT INTO usuarios (id, nome, email, senha_hash, id_empresa) VALUES ('usr1', 'User 1', 'u1@u.com', 'hash', 'emp-a')`);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve realizar operações de Produto de forma multi-tenant', async () => {
    // Empresa A cria produto
    const prodA = await catalogoService.create({ sku: 'SKU-MT-1', nome: 'Prod A', precoBase: 10, estoqueInicial: 5 }, 'emp-a');
    
    // Empresa B não consegue acessar produto da Empresa A
    await expect(catalogoService.findOne(prodA.id, 'emp-b')).rejects.toThrow('Produto não encontrado');

    // Empresa B tenta editar produto da Empresa A
    await expect(catalogoService.update(prodA.id, { nome: 'Hacked' }, 'emp-b')).rejects.toThrow('Produto não encontrado');
    
    // Empresa A consegue ver seu produto
    const p = await catalogoService.findOne(prodA.id, 'emp-a');
    expect(p.nome).toBe('Prod A');
  });

  it('deve rejeitar duplicidade concorrente de SKU na mesma empresa', async () => {
    const p1 = catalogoService.create({ sku: 'SKU-DUP', nome: 'T1', precoBase: 10 }, 'emp-a');
    const p2 = catalogoService.create({ sku: 'SKU-DUP', nome: 'T2', precoBase: 10 }, 'emp-a');
    
    const results = await Promise.allSettled([p1, p2]);
    const success = results.filter(r => r.status === 'fulfilled');
    const errors = results.filter(r => r.status === 'rejected');

    expect(success.length).toBe(1);
    expect(errors.length).toBe(1);
    expect((errors[0] as PromiseRejectedResult).reason.message).toContain('cadastrado');
  });

  it('deve permitir mesmo SKU em empresas diferentes', async () => {
    await catalogoService.create({ sku: 'SKU-GLOBAL', nome: 'T1', precoBase: 10 }, 'emp-a');
    const pB = await catalogoService.create({ sku: 'SKU-GLOBAL', nome: 'T2', precoBase: 10 }, 'emp-b');
    expect(pB).toBeDefined();
    expect(pB.idEmpresa).toBe('emp-b');
  });

  it('deve suportar concorrência na movimentação manual de estoque sem lost updates', async () => {
    const prod = await catalogoService.create({ sku: 'SKU-EST', nome: 'Prod Est', precoBase: 10, estoqueInicial: 10 }, 'emp-a');
    const idProduto = prod.id;

    // Concorrência SAÍDA (A=7, B=5) -> apenas um deve passar
    const reqA = catalogoService.ajustarEstoque(idProduto, 7, 'SAIDA', 'Test', 'emp-a', 'usr1');
    const reqB = catalogoService.ajustarEstoque(idProduto, 5, 'SAIDA', 'Test', 'emp-a', 'usr1');

    const results = await Promise.allSettled([reqA, reqB]);
    
    const success = results.filter(r => r.status === 'fulfilled');
    const errors = results.filter(r => r.status === 'rejected');

    if (success.length !== 1) console.log(errors);

    expect(success.length).toBe(1);
    expect(errors.length).toBe(1);
    expect((errors[0] as PromiseRejectedResult).reason.message).toContain('Estoque insuficiente');

    let [estoqueDb] = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = ?`, [idProduto]);
    
    // O saldo deve ser 10 - 7 = 3 (ou 10 - 5 = 5)
    expect(Number(estoqueDb.quantidade_disponivel)).toBeGreaterThanOrEqual(3);

    // Concorrência ENTRADA (+3, +4)
    const inA = catalogoService.ajustarEstoque(idProduto, 3, 'ENTRADA', 'Test', 'emp-a', 'usr1');
    const inB = catalogoService.ajustarEstoque(idProduto, 4, 'ENTRADA', 'Test', 'emp-a', 'usr1');

    await Promise.all([inA, inB]);

    let [estoqueFinal] = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = ?`, [idProduto]);
    // Saldo anterior (3) + 7 = 10 (ou se B passou primeiro, 5 + 7 = 12)
    // O importante é que a soma aumentou exatos 7 a partir do saldo intermediário.
    expect(Number(estoqueFinal.quantidade_disponivel)).toBe(Number(estoqueDb.quantidade_disponivel) + 7);
  });

  it('deve falhar a transação se o log de auditoria falhar (Rollback)', async () => {
    const prod = await catalogoService.create({ sku: 'SKU-ROLLBACK', nome: 'Rollback', precoBase: 10, estoqueInicial: 10 }, 'emp-a');
    
    try {
      // usr-invalido vai violar FK da auditoria
      await catalogoService.ajustarEstoque(prod.id, 5, 'ENTRADA', 'Teste rollback log', 'emp-a', 'usr-invalido');
    } catch (e: any) {
      expect(e.message).toContain('a foreign key constraint fails');
    }

    const p = await catalogoService.findOne(prod.id, 'emp-a');
    expect(Number(p.estoque.quantidadeDisponivel)).toBe(10); // não alterou o estoque pois falhou na auditoria
  });

  it('não deve criar log se falhar o estoque por saldo insuficiente', async () => {
    const prod = await catalogoService.create({ sku: 'SKU-NO-LOG', nome: 'No Log', precoBase: 10, estoqueInicial: 10 }, 'emp-a');

    try {
      await catalogoService.ajustarEstoque(prod.id, 20, 'SAIDA', 'Saída inválida', 'emp-a', 'usr1');
    } catch (e: any) {
      expect(e.message).toContain('Estoque insuficiente');
    }

    // Confirma que não gerou log de sucesso
    const logs = await dataSource.query(`SELECT * FROM auditoria_logs WHERE tabela_afetada = 'estoque' AND dados_novos LIKE '%Saída inválida%'`);
    expect(logs.length).toBe(0);
  });
});
