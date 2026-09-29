import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { LogisticaService } from '../src/modules/logistica/logistica.service.js';
import { CatalogoService } from '../src/modules/catalogo/catalogo.service.js';
import { PedidosService } from '../src/modules/pedidos/pedidos.service.js';

describe('Logística / Conferência (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let logisticaService: LogisticaService;
  let catalogoService: CatalogoService;
  let pedidosService: PedidosService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    logisticaService = moduleFixture.get<LogisticaService>(LogisticaService);
    catalogoService = moduleFixture.get<CatalogoService>(CatalogoService);
    pedidosService = moduleFixture.get<PedidosService>(PedidosService);

    // Setup de testes
    await dataSource.query(`DELETE FROM auditoria_logs`);
    await dataSource.query(`DELETE FROM estoque WHERE id_produto IN (SELECT id FROM produtos WHERE id_empresa IN ('log-emp', 'log-emp2'))`);
    await dataSource.query(`DELETE FROM itens_pedido WHERE id_produto IN (SELECT id FROM produtos WHERE id_empresa IN ('log-emp', 'log-emp2'))`);
    await dataSource.query(`DELETE FROM pedidos WHERE id_empresa IN ('log-emp', 'log-emp2')`);
    await dataSource.query(`DELETE FROM produtos WHERE id_empresa IN ('log-emp', 'log-emp2')`);
    await dataSource.query(`DELETE FROM empresas WHERE id IN ('log-emp', 'log-emp2')`);
    await dataSource.query(`DELETE FROM usuarios WHERE id = 'log-usr'`);
    
    await dataSource.query(`INSERT INTO empresas (id, nome, cnpj) VALUES ('log-emp', 'Empresa Log', '1111'), ('log-emp2', 'Empresa Log 2', '2222')`);
    await dataSource.query(`INSERT INTO usuarios (id, nome, email, senha_hash, id_empresa) VALUES ('log-usr', 'User Log', 'log@u.com', 'hash', 'log-emp')`);
  });

  afterAll(async () => {
    await app.close();
  });

  let pedidoConferencia: any;
  let idProdutoA: string;
  let idProdutoB: string;

  it('Setup: criar pedido para conferência', async () => {
    const prodA = await catalogoService.create({ sku: 'SKU-LOG-A', nome: 'Prod A', precoBase: 10, estoqueInicial: 10 }, 'log-emp');
    const prodB = await catalogoService.create({ sku: 'SKU-LOG-B', nome: 'Prod B', precoBase: 10, estoqueInicial: 10 }, 'log-emp');
    idProdutoA = prodA.id;
    idProdutoB = prodB.id;

    const idPedido = 'ped-log-test-1';
    await dataSource.query(`
      INSERT INTO pedidos (id, id_empresa, cliente_nome, status, valor_total, taxas_marketplace)
      VALUES (?, 'log-emp', 'Cliente Teste', 'Pendente', 30, 0)
    `, [idPedido]);
    
    pedidoConferencia = { id: idPedido, status: 'Pendente' };

    await dataSource.query(`
      INSERT INTO itens_pedido (id, id_pedido, id_produto, quantidade, preco_unitario, quantidade_bipada)
      VALUES 
      (UUID(), ?, ?, 2, 10, 0),
      (UUID(), ?, ?, 1, 10, 0)
    `, [pedidoConferencia.id, idProdutoA, pedidoConferencia.id, idProdutoB]);

    // O catalogoService já atualiza estoque_disponivel = 10, e estoque_reservada = 0
    // O pedido precisa de estoque reservado. Vamos simular isso.
    await dataSource.query(`UPDATE estoque SET quantidade_disponivel = 8, quantidade_reservada = 2 WHERE id_produto = ?`, [idProdutoA]);
    await dataSource.query(`UPDATE estoque SET quantidade_disponivel = 9, quantidade_reservada = 1 WHERE id_produto = ?`, [idProdutoB]);
  });

  it('GET pedido — sucesso com itens', async () => {
    const res = await logisticaService.getPedidoParaConferencia(pedidoConferencia.id, 'log-emp');
    expect(res.id).toBe(pedidoConferencia.id);
    expect(res.itens.length).toBe(2);
    expect(res.itens[0].quantidadeBipada).toBe(0);
  });

  it('GET pedido — 404 não encontrado', async () => {
    await expect(logisticaService.getPedidoParaConferencia('uuid-invalido', 'log-emp')).rejects.toThrow('Pedido não encontrado');
  });

  it('GET pedido — tenant isolation (empresa diferente → 404)', async () => {
    await expect(logisticaService.getPedidoParaConferencia(pedidoConferencia.id, 'log-emp2')).rejects.toThrow('Pedido não encontrado');
  });

  it('bipar — SKU correto aceita', async () => {
    const res = await logisticaService.biparItem(pedidoConferencia.id, 'SKU-LOG-A', 'log-usr', '127.0.0.1', 'log-emp');
    expect(res.quantidadeBipada).toBe(1);
    expect(res.pedidoStatus).toBe('EM_SEPARACAO');
  });

  it('bipar — SKU errado rejeita sem alterar banco', async () => {
    await expect(logisticaService.biparItem(pedidoConferencia.id, 'SKU-INEXISTENTE', 'log-usr', '127.0.0.1', 'log-emp')).rejects.toThrow('Produto não pertence');
  });

  it('bipar — scan excedente rejeita (3a em quantidade=2)', async () => {
    await logisticaService.biparItem(pedidoConferencia.id, 'SKU-LOG-A', 'log-usr', '127.0.0.1', 'log-emp'); // Agora tem 2
    await expect(logisticaService.biparItem(pedidoConferencia.id, 'SKU-LOG-A', 'log-usr', '127.0.0.1', 'log-emp')).rejects.toThrow('Quantidade excedida');
  });

  it('bipar — pedido cancelado rejeita', async () => {
    const pedCancId = 'ped-log-canc-1';
    await dataSource.query(`
      INSERT INTO pedidos (id, id_empresa, cliente_nome, status, valor_total, taxas_marketplace)
      VALUES (?, 'log-emp', 'Cliente Canc', 'Cancelado', 10, 0)
    `, [pedCancId]);
    await dataSource.query(`
      INSERT INTO itens_pedido (id, id_pedido, id_produto, quantidade, preco_unitario, quantidade_bipada)
      VALUES (UUID(), ?, ?, 1, 10, 0)
    `, [pedCancId, idProdutoA]);
    
    await expect(logisticaService.biparItem(pedCancId, 'SKU-LOG-A', 'log-usr', '127.0.0.1', 'log-emp')).rejects.toThrow('Pedido cancelado');
  });

  it('concorrência — dois scans simultâneos quantidade=1 → 1 sucesso 1 falha', async () => {
    const prodConc = await catalogoService.create({ sku: 'SKU-CONC', nome: 'Prod Conc', precoBase: 10, estoqueInicial: 10 }, 'log-emp');
    
    const pedConcId = 'ped-log-conc-1';
    await dataSource.query(`
      INSERT INTO pedidos (id, id_empresa, cliente_nome, status, valor_total, taxas_marketplace)
      VALUES (?, 'log-emp', 'Conc', 'Pendente', 10, 0)
    `, [pedConcId]);
    await dataSource.query(`
      INSERT INTO itens_pedido (id, id_pedido, id_produto, quantidade, preco_unitario, quantidade_bipada)
      VALUES (UUID(), ?, ?, 1, 10, 0)
    `, [pedConcId, prodConc.id]);

    const req1 = logisticaService.biparItem(pedConcId, 'SKU-CONC', 'log-usr', '127.0.0.1', 'log-emp');
    const req2 = logisticaService.biparItem(pedConcId, 'SKU-CONC', 'log-usr', '127.0.0.1', 'log-emp');

    const results = await Promise.allSettled([req1, req2]);
    const success = results.filter(r => r.status === 'fulfilled');
    const errors = results.filter(r => r.status === 'rejected');

    expect(success.length).toBe(1);
    expect(errors.length).toBe(1);
    expect((errors[0] as PromiseRejectedResult).reason.message).toMatch(/Quantidade excedida|Pedido já foi totalmente conferido|Bipagem rejeitada/);
  });

  it('expedir — antes de conferido → rejeita', async () => {
    await expect(logisticaService.expedir(pedidoConferencia.id, 'log-emp', 'log-usr', '127.0.0.1')).rejects.toThrow('Pedido não pode ser expedido');
  });

  it('conclusão — todos bipados → status Conferido', async () => {
    // Falta bipar SKU-LOG-B (q=1)
    const res = await logisticaService.biparItem(pedidoConferencia.id, 'SKU-LOG-B', 'log-usr', '127.0.0.1', 'log-emp');
    expect(res.pedidoStatus).toBe('Conferido');
    expect(res.message).toBe('Pedido totalmente conferido');
  });

  it('expedir — após conferido → aceita, reservado decrementado', async () => {
    let [estoqueAntes] = await dataSource.query(`SELECT quantidade_reservada FROM estoque WHERE id_produto = ?`, [idProdutoB]);
    expect(estoqueAntes.quantidade_reservada).toBe(1);

    const res = await logisticaService.expedir(pedidoConferencia.id, 'log-emp', 'log-usr', '127.0.0.1');
    expect(res.status).toBe('Despachado');

    let [estoqueDepois] = await dataSource.query(`SELECT quantidade_reservada FROM estoque WHERE id_produto = ?`, [idProdutoB]);
    expect(estoqueDepois.quantidade_reservada).toBe(0);
  });

  it('expedir — idempotência → segunda chamada retorna sem erro', async () => {
    const res = await logisticaService.expedir(pedidoConferencia.id, 'log-emp', 'log-usr', '127.0.0.1');
    expect(res.status).toBe('Despachado');
    expect(res.message).toContain('já foi despachado');
  });

});
