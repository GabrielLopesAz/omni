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
      console.warn('⚠️ Forçando NODE_ENV=test para segurança da suíte E2E.');
      process.env.NODE_ENV = 'test';
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
    await dataSource.query(`INSERT INTO empresas (id, razao_social, cnpj) VALUES (?, 'Empresa Teste', '00000000000000')`, [idEmpresa]);
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
});
