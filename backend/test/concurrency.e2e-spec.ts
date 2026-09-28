import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PedidosService } from '../src/modules/pedidos/pedidos.service.js';
import { DataSource } from 'typeorm';

describe('Concorrência Banco de Dados (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let pedidosService: PedidosService;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Ambiente inválido! Testes E2E DEVEM rodar em ambiente de teste (NODE_ENV=test)');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    dataSource = app.get(DataSource);
    
    // Fail-fast se o banco de dados não for de teste
    if (!dataSource.options.database?.toString().includes('test')) {
      throw new Error(`PERIGO: Execução abortada! O banco de dados conectado (${dataSource.options.database}) não é um banco de teste. Configure DB_NAME=omni_test para e2e.`);
    }

    pedidosService = app.get(PedidosService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve lidar com requisições simultâneas e manter consistência do estoque (Race Condition)', async () => {
    const idEmpresa = 'emp-teste-conc';
    const idIntegracao = 'int-teste-conc';
    const idProduto = 'prod-teste-conc';
    const sku = 'SKU-CONC-1';

    // Limpeza inicial
    await dataSource.query(`DELETE FROM itens_pedido WHERE id_produto = ?`, [idProduto]);
    await dataSource.query(`DELETE FROM pedidos WHERE id_empresa = ?`, [idEmpresa]);
    await dataSource.query(`DELETE FROM estoque WHERE id_produto = ?`, [idProduto]);
    await dataSource.query(`DELETE FROM produtos WHERE id = ?`, [idProduto]);
    await dataSource.query(`DELETE FROM integracoes_marketplace WHERE id = ?`, [idIntegracao]);
    await dataSource.query(`DELETE FROM empresas WHERE id = ?`, [idEmpresa]);

    // Setup de Dados Reais
    await dataSource.query(`INSERT INTO empresas (id, nome, cnpj) VALUES (?, 'Empresa Teste', '00000000000000')`, [idEmpresa]);
    await dataSource.query(`INSERT INTO integracoes_marketplace (id, id_empresa, nome, credenciais) VALUES (?, ?, 'Mercado Livre', '{}')`, [idIntegracao, idEmpresa]);
    await dataSource.query(`INSERT INTO produtos (id, id_empresa, nome, sku) VALUES (?, ?, 'Produto Teste', ?)`, [idProduto, idEmpresa, sku]);
    await dataSource.query(`INSERT INTO estoque (id_produto, quantidade_disponivel, quantidade_reservada) VALUES (?, 10, 0)`, [idProduto]);

    // 2 workers disparam importações concorrentes (A = 7, B = 5)
    // O Estoque é 10, logo um terá que ser recusado.
    const reqA = pedidosService.importarPedidoMarketplace(idIntegracao, idEmpresa, {
      id_pedido_marketplace: 'ext-A',
      cliente_nome: 'Cliente A',
      valor_total: 700,
      taxas_marketplace: 0
    }, [{ sku, quantidade: 7, precoUnitario: 100 }]);

    const reqB = pedidosService.importarPedidoMarketplace(idIntegracao, idEmpresa, {
      id_pedido_marketplace: 'ext-B',
      cliente_nome: 'Cliente B',
      valor_total: 500,
      taxas_marketplace: 0
    }, [{ sku, quantidade: 5, precoUnitario: 100 }]);

    const resultados = await Promise.allSettled([reqA, reqB]);

    // Análise
    const fulfilled = resultados.filter(r => r.status === 'fulfilled');
    const rejected = resultados.filter(r => r.status === 'rejected');
    
    // Apenas UMA das requisições DEVE ter sucesso
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    
    // Confirma que a outra falhou especificamente por falta de estoque (rejeita deadlocks ou perdas silenciosas)
    // Se o driver lançar ER_DEADLOCK, o teste irá falhar porque esperamos 'Estoque insuficiente'
    // Opcionalmente no mundo real, TypeORM com retry-logic trataria ER_DEADLOCK. Para a validação atômica básica:
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain('Estoque insuficiente');

    // Verifica integridade atômica
    const estoqueCompleto = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = ?`, [idProduto]);
    const pedidosCompletos = await dataSource.query(`SELECT * FROM pedidos WHERE id_empresa = ?`, [idEmpresa]);
    
    expect(pedidosCompletos.length).toBe(1); // Apenas 1 pedido deve ter sido persistido

    const [estoqueFinal] = estoqueCompleto;
    
    expect(Number(estoqueFinal.quantidade_disponivel)).toBeGreaterThanOrEqual(0);
    expect(Number(estoqueFinal.quantidade_reservada)).toBeLessThanOrEqual(10);
    expect(Number(estoqueFinal.quantidade_disponivel) + Number(estoqueFinal.quantidade_reservada)).toBe(10);
  });

  it('deve ser idempotente ao importar o mesmo pedido (Integridade UNIQUE)', async () => {
    const idEmpresa = 'emp-teste-conc';
    const idIntegracao = 'int-teste-conc';
    const sku = 'SKU-CONC-1';
    const idPedidoExt = 'ext-IDEMPOTENCIA-1';

    // Cria o primeiro pedido
    await pedidosService.importarPedidoMarketplace(idIntegracao, idEmpresa, {
      id_pedido_marketplace: idPedidoExt,
      cliente_nome: 'Cliente Unico',
      valor_total: 100,
      taxas_marketplace: 0
    }, [{ sku, quantidade: 1, precoUnitario: 100 }]);

    const check1 = await dataSource.query(`SELECT * FROM pedidos WHERE id_pedido_marketplace = ?`, [idPedidoExt]);
    expect(check1.length).toBe(1);

    // A segunda importação deve falhar e não alterar estoque nem gerar duplicata
    try {
      await pedidosService.importarPedidoMarketplace(idIntegracao, idEmpresa, {
        id_pedido_marketplace: idPedidoExt,
        cliente_nome: 'Cliente Unico Duplicado',
        valor_total: 100,
        taxas_marketplace: 0
      }, [{ sku, quantidade: 1, precoUnitario: 100 }]);
    } catch (e: any) {
      // TypeORM retorna QueryFailedError: ER_DUP_ENTRY para a UNIQUE KEY (id_integracao, id_pedido_marketplace)
      expect(e.code === 'ER_DUP_ENTRY' || e.message.includes('Duplicate')).toBeTruthy();
    }

    const pedidosDb = await dataSource.query(`SELECT * FROM pedidos WHERE id_pedido_marketplace = ?`, [idPedidoExt]);
    expect(pedidosDb.length).toBe(1); // Apenas um salvo
  });

  it('deve realizar rollback de estoque parcial em falhas (Atomicidade)', async () => {
    const idEmpresa = 'emp-teste-conc';
    const idIntegracao = 'int-teste-conc';
    const idProduto = 'prod-teste-conc';
    const sku = 'SKU-CONC-1';

    const idProdutoB = 'prod-teste-rb';
    const skuB = 'SKU-ROLLBACK-1';

    // Cria produto B com apenas 3 de estoque
    await dataSource.query(`DELETE FROM itens_pedido WHERE id_produto = ?`, [idProdutoB]);
    await dataSource.query(`DELETE FROM estoque WHERE id_produto = ?`, [idProdutoB]);
    await dataSource.query(`DELETE FROM produtos WHERE id = ?`, [idProdutoB]);
    await dataSource.query(`INSERT INTO produtos (id, id_empresa, nome, sku) VALUES (?, ?, 'Produto B', ?)`, [idProdutoB, idEmpresa, skuB]);
    await dataSource.query(`INSERT INTO estoque (id_produto, quantidade_disponivel, quantidade_reservada) VALUES (?, 3, 0)`, [idProdutoB]);

    // O SKU-A já teve pedidos nas asserções anteriores, vamos forçar seu estoque para 10 de disp
    await dataSource.query(`UPDATE estoque SET quantidade_disponivel = 10, quantidade_reservada = 0 WHERE id_produto = ?`, [idProduto]);

    try {
      await pedidosService.importarPedidoMarketplace(idIntegracao, idEmpresa, {
        id_pedido_marketplace: 'ext-ROLLBACK-X',
        cliente_nome: 'Cliente Rollback',
        valor_total: 100,
        taxas_marketplace: 0
      }, [
        { sku, quantidade: 2, precoUnitario: 10 }, // Sucesso
        { sku: skuB, quantidade: 10, precoUnitario: 10 } // Falha
      ]);
    } catch(e: any) {
      expect(e.message).toContain('Estoque insuficiente');
    }

    // Valida que o estado anterior do estoque foi mantido (nada foi reservado/baixado)
    const [estoqueA] = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = ?`, [idProduto]);
    const [estoqueB] = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = ?`, [idProdutoB]);

    expect(Number(estoqueA.quantidade_disponivel)).toBe(10);
    expect(Number(estoqueA.quantidade_reservada)).toBe(0);

    expect(Number(estoqueB.quantidade_disponivel)).toBe(3);
    expect(Number(estoqueB.quantidade_reservada)).toBe(0);

    // Valida que pedido e itens não existem
    const pedidos = await dataSource.query(`SELECT * FROM pedidos WHERE id_pedido_marketplace = 'ext-ROLLBACK-X'`);
    expect(pedidos.length).toBe(0);
  });

  it('deve realizar estorno correto ao cancelar pedido e evitar duplo estorno', async () => {
    const idEmpresa = 'emp-teste-conc';
    const idIntegracao = 'int-teste-conc';
    const idProduto = 'prod-teste-conc';
    const sku = 'SKU-CONC-1';
    const idPedidoExt = 'ext-CANCEL-1';

    // Restaura estoque inicial para 10 disponível, 0 reservado
    await dataSource.query(`UPDATE estoque SET quantidade_disponivel = 10, quantidade_reservada = 0 WHERE id_produto = ?`, [idProduto]);

    // Importar pedido com quantidade 4
    await pedidosService.importarPedidoMarketplace(idIntegracao, idEmpresa, {
      id_pedido_marketplace: idPedidoExt,
      cliente_nome: 'Cliente Cancelamento',
      valor_total: 400,
      taxas_marketplace: 0
    }, [{ sku, quantidade: 4, precoUnitario: 100 }]);

    let [estoqueAposImport] = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = ?`, [idProduto]);
    expect(Number(estoqueAposImport.quantidade_disponivel)).toBe(6);
    expect(Number(estoqueAposImport.quantidade_reservada)).toBe(4);

    const [pedidoCriado] = await dataSource.query(`SELECT id FROM pedidos WHERE id_pedido_marketplace = ?`, [idPedidoExt]);
    
    // Primeiro cancelamento
    await pedidosService.cancelarPedido(pedidoCriado.id);

    let [estoqueAposCancel] = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = ?`, [idProduto]);
    expect(Number(estoqueAposCancel.quantidade_disponivel)).toBe(10);
    expect(Number(estoqueAposCancel.quantidade_reservada)).toBe(0);

    const [pedidoCancelado] = await dataSource.query(`SELECT status FROM pedidos WHERE id = ?`, [pedidoCriado.id]);
    expect(pedidoCancelado.status).toBe('Cancelado');

    // Segundo cancelamento
    await pedidosService.cancelarPedido(pedidoCriado.id);

    // O estoque deve permanecer intacto (evitar duplo estorno)
    let [estoqueSegundoCancel] = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = ?`, [idProduto]);
    expect(Number(estoqueSegundoCancel.quantidade_disponivel)).toBe(10);
    expect(Number(estoqueSegundoCancel.quantidade_reservada)).toBe(0);
  });
});
