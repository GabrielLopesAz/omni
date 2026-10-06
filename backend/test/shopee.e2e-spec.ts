import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { DataSource } from 'typeorm';
import { ShopeeClient } from '../src/modules/integracoes/adapters/shopee/shopee-client.js';
import { ShopeeAdapter } from '../src/modules/integracoes/adapters/shopee/shopee.adapter.js';
import { MarketplaceSyncService } from '../src/modules/integracoes/sync/marketplace-sync.service.js';
import { PedidosService } from '../src/modules/pedidos/pedidos.service.js';
import { IntegrationCredentialsCryptoService } from '../src/modules/integracoes/crypto/integration-crypto.service.js';

describe('Shopee Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let shopeeClient: ShopeeClient;
  let syncService: MarketplaceSyncService;
  let pedidosService: PedidosService;
  let cryptoService: IntegrationCredentialsCryptoService;
  let shopeeAdapter: ShopeeAdapter;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    shopeeClient = app.get(ShopeeClient);
    syncService = app.get(MarketplaceSyncService);
    pedidosService = app.get(PedidosService);
    cryptoService = app.get(IntegrationCredentialsCryptoService);
    shopeeAdapter = app.get(ShopeeAdapter);
  });
  
  beforeEach(async () => {
    await dataSource.query(`DELETE FROM itens_pedido`);
    await dataSource.query(`DELETE FROM pedidos`);
    await dataSource.query(`DELETE FROM estoque`);
    await dataSource.query(`DELETE FROM produtos`);
    await dataSource.query(`DELETE FROM integracoes_marketplace`);
    await dataSource.query(`DELETE FROM usuarios`);
    await dataSource.query(`DELETE FROM empresas`);

    await dataSource.query(`INSERT INTO empresas (id, nome, cnpj) VALUES ('emp-shopee', 'Empresa Shopee', '00000000000000')`);
    await dataSource.query(`INSERT INTO produtos (id, id_empresa, nome, sku) VALUES ('prod-shopee', 'emp-shopee', 'Produto Shopee', 'SKU-SHOPEE')`);
    await dataSource.query(`INSERT INTO estoque (id_produto, quantidade_disponivel, quantidade_reservada) VALUES ('prod-shopee', 10, 0)`);
    
    // Multi-item test products
    await dataSource.query(`INSERT INTO produtos (id, id_empresa, nome, sku) VALUES ('prod-a', 'emp-shopee', 'Produto A', 'SKU-A')`);
    await dataSource.query(`INSERT INTO estoque (id_produto, quantidade_disponivel, quantidade_reservada) VALUES ('prod-a', 5, 0)`);
    await dataSource.query(`INSERT INTO produtos (id, id_empresa, nome, sku) VALUES ('prod-b', 'emp-shopee', 'Produto B', 'SKU-B')`);
    await dataSource.query(`INSERT INTO estoque (id_produto, quantidade_disponivel, quantidade_reservada) VALUES ('prod-b', 0, 0)`);

    const encryptedToken = cryptoService.encrypt('fake_access_token');
    const encryptedRefresh = cryptoService.encrypt('fake_refresh_token');

    await dataSource.query(`
      INSERT INTO integracoes_marketplace 
      (id, id_empresa, provider, status, external_account_id, access_token_encrypted, refresh_token_encrypted, token_expires_at) 
      VALUES 
      ('int-shopee', 'emp-shopee', 'SHOPEE', 'CONECTADO', '222', '${encryptedToken}', '${encryptedRefresh}', '2030-01-01 00:00:00')
    `);

    vi.restoreAllMocks();

    vi.spyOn(shopeeClient, 'isConfigured').mockReturnValue(true);
    vi.spyOn(shopeeClient, 'getPartnerId').mockReturnValue('123456');

    vi.spyOn(shopeeClient, 'publicRequest').mockImplementation(async (path: string, payload: any) => {
      if (path === '/api/v2/auth/access_token/get') {
        return {
          error: '', message: '', request_id: 'req123',
          access_token: 'NEW_access', refresh_token: 'NEW_refresh',
          expire_in: 14400, merchant_id: 111, shop_id: 222
        };
      }
      return {};
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const setupMock = (orderList: any[]) => {
    vi.spyOn(shopeeClient, 'shopRequest').mockImplementation(async (path: string, token: string, shopId: string, payload?: any, query?: any) => {
      if (path === '/api/v2/order/get_order_list') {
        return {
          error: '', message: '', request_id: 'req1',
          response: { more: false, next_cursor: '', order_list: orderList.map(o => ({ order_sn: o.order_sn })) }
        };
      }
      if (path === '/api/v2/order/get_order_detail') {
        return {
          error: '', message: '', request_id: 'req123',
          response: {
            order_list: orderList
          }
        };
      }
      return {};
    });
  }

  it('deve simular integracao Shopee completa e lidar com concorrencia distribuida', async () => {
    setupMock([
      {
        order_sn: 'BR230101XYZ',
        order_status: 'READY_TO_SHIP',
        create_time: Math.floor(Date.now() / 1000) - 3600,
        update_time: Math.floor(Date.now() / 1000) - 1800,
        total_amount: 150.5,
        buyer_username: 'shopeebuyer',
        item_list: [{ item_id: 999, model_sku: 'SKU-SHOPEE', model_quantity_purchased: 2, model_discounted_price: 75.25 }]
      }
    ]);

    const getOrdersSpy = vi.spyOn(shopeeAdapter, 'getOrders');

    const exec1 = syncService.syncIntegration('int-shopee', 'emp-shopee');
    (syncService as any).runningSyncs.clear();
    const exec2 = syncService.syncIntegration('int-shopee', 'emp-shopee');

    await Promise.allSettled([exec1, exec2]);

    expect(getOrdersSpy).toHaveBeenCalledTimes(1);

    const pedidos = await dataSource.query(`SELECT * FROM pedidos WHERE id_integracao = 'int-shopee'`);
    expect(pedidos.length).toBe(1);
    expect(pedidos[0].status).toBe('Aprovado');

    const estoque = await dataSource.query(`SELECT quantidade_disponivel, quantidade_reservada FROM estoque WHERE id_produto = 'prod-shopee'`);
    expect(Number(estoque[0].quantidade_disponivel)).toBe(8); // 10 - 2
    expect(Number(estoque[0].quantidade_reservada)).toBe(2);
  });

  it('deve rotacionar o token (refresh) caso proximo de expirar', async () => {
    setupMock([]);
    await dataSource.query(`UPDATE integracoes_marketplace SET token_expires_at = DATE_ADD(NOW(), INTERVAL 1 MINUTE) WHERE id = 'int-shopee'`);

    await syncService.syncIntegration('int-shopee', 'emp-shopee');

    const rows = await dataSource.query(`SELECT access_token_encrypted, refresh_token_encrypted, token_expires_at FROM integracoes_marketplace WHERE id = 'int-shopee'`);
    const newAccess = cryptoService.decrypt(rows[0].access_token_encrypted);
    const newRefresh = cryptoService.decrypt(rows[0].refresh_token_encrypted);

    expect(newAccess).toBe('NEW_access');
    expect(newRefresh).toBe('NEW_refresh');
  });

  it('cancelamento remoto (idempotente) com estorno de estoque', async () => {
    // Primeiro importa o pedido
    setupMock([
      {
        order_sn: 'BR-CANCEL',
        order_status: 'PROCESSED',
        create_time: Math.floor(Date.now() / 1000) - 3600,
        update_time: Math.floor(Date.now() / 1000) - 1800,
        total_amount: 100,
        buyer_username: 'shopeebuyer',
        item_list: [{ item_id: 999, model_sku: 'SKU-SHOPEE', model_quantity_purchased: 2, model_discounted_price: 50 }]
      }
    ]);
    await syncService.syncIntegration('int-shopee', 'emp-shopee');

    // Verifica se reservou 2
    let estoque = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = 'prod-shopee'`);
    expect(Number(estoque[0].quantidade_disponivel)).toBe(8);
    expect(Number(estoque[0].quantidade_reservada)).toBe(2);

    // Agora simula o retorno CANCELLED da shopee
    setupMock([
      {
        order_sn: 'BR-CANCEL',
        order_status: 'CANCELLED',
        create_time: Math.floor(Date.now() / 1000) - 3600,
        update_time: Math.floor(Date.now() / 1000),
        total_amount: 100,
        buyer_username: 'shopeebuyer',
        item_list: [{ item_id: 999, model_sku: 'SKU-SHOPEE', model_quantity_purchased: 2, model_discounted_price: 50 }]
      }
    ]);
    const summary = await syncService.syncIntegration('int-shopee', 'emp-shopee');

    expect(summary.cancelled).toBe(1);

    // Verifica se estornou 2
    estoque = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = 'prod-shopee'`);
    expect(Number(estoque[0].quantidade_disponivel)).toBe(10);
    expect(Number(estoque[0].quantidade_reservada)).toBe(0);

    const pedidos = await dataSource.query(`SELECT status FROM pedidos WHERE id_pedido_marketplace = 'BR-CANCEL'`);
    expect(pedidos[0].status).toBe('Cancelado');
  });

  it('cancelamento remoto de pedido despachado -> CONFLICT', async () => {
    // Importa
    setupMock([
      {
        order_sn: 'BR-DESP',
        order_status: 'READY_TO_SHIP',
        create_time: Math.floor(Date.now() / 1000) - 3600,
        update_time: Math.floor(Date.now() / 1000) - 1800,
        total_amount: 100,
        buyer_username: 'shopeebuyer',
        item_list: [{ item_id: 999, model_sku: 'SKU-SHOPEE', model_quantity_purchased: 1, model_discounted_price: 50 }]
      }
    ]);
    await syncService.syncIntegration('int-shopee', 'emp-shopee');

    // Despacha internamente
    await dataSource.query(`UPDATE pedidos SET status = 'Despachado' WHERE id_pedido_marketplace = 'BR-DESP'`);
    // Simula expedicao do estoque
    await dataSource.query(`UPDATE estoque SET quantidade_reservada = quantidade_reservada - 1 WHERE id_produto = 'prod-shopee'`);

    // Shopee retorna CANCELLED
    setupMock([
      {
        order_sn: 'BR-DESP',
        order_status: 'CANCELLED',
        create_time: Math.floor(Date.now() / 1000) - 3600,
        update_time: Math.floor(Date.now() / 1000),
        total_amount: 100,
        buyer_username: 'shopeebuyer',
        item_list: [{ item_id: 999, model_sku: 'SKU-SHOPEE', model_quantity_purchased: 1, model_discounted_price: 50 }]
      }
    ]);
    const summary = await syncService.syncIntegration('int-shopee', 'emp-shopee');
    
    // Ele tenta cancelar, mas como ta despachado lanÃ§a conflito no try/catch
    expect(summary.failed).toBe(0); // Ignore conflict failures
    expect(summary.cancelled).toBe(0);

    const pedidos = await dataSource.query(`SELECT status FROM pedidos WHERE id_pedido_marketplace = 'BR-DESP'`);
    expect(pedidos[0].status).toBe('Despachado'); // Nao alterado
  });

  it('SKU inexistente -> rollback e erro logado, elegivel a retry (nao avanÃ§a lastSuccessAt)', async () => {
    setupMock([
      {
        order_sn: 'BR-SKU-INEX',
        order_status: 'READY_TO_SHIP',
        create_time: Math.floor(Date.now() / 1000) - 3600,
        update_time: Math.floor(Date.now() / 1000) - 1800,
        total_amount: 100,
        buyer_username: 'shopeebuyer',
        item_list: [{ item_id: 999, model_sku: 'SKU-FANTASMA', model_quantity_purchased: 1, model_discounted_price: 100 }]
      }
    ]);
    
    // ForÃ§a o ultimo sucesso
    await dataSource.query(`UPDATE integracoes_marketplace SET last_success_at = '2026-01-01 10:00:00' WHERE id = 'int-shopee'`);

    const summary = await syncService.syncIntegration('int-shopee', 'emp-shopee');
    expect(summary.failed).toBe(1);
    expect(summary.imported).toBe(0);

    const integracao = await dataSource.query(`SELECT last_success_at FROM integracoes_marketplace WHERE id = 'int-shopee'`);
    // last_success_at NAO avanÃ§a
    expect(new Date(integracao[0].last_success_at).toISOString().startsWith('2026-01-01')).toBe(true);
  });

  it('Rollback multi-item: se um SKU falhar, o pedido inteiro e reservas sao abortados', async () => {
    setupMock([
      {
        order_sn: 'BR-MULTI',
        order_status: 'READY_TO_SHIP',
        create_time: Math.floor(Date.now() / 1000) - 3600,
        update_time: Math.floor(Date.now() / 1000) - 1800,
        total_amount: 100,
        buyer_username: 'shopeebuyer',
        item_list: [
          { item_id: 1, model_sku: 'SKU-A', model_quantity_purchased: 1, model_discounted_price: 50 }, // Tem estoque (5)
          { item_id: 2, model_sku: 'SKU-B', model_quantity_purchased: 1, model_discounted_price: 50 }, // Nao tem estoque (0)
        ]
      }
    ]);

    const summary = await syncService.syncIntegration('int-shopee', 'emp-shopee');
    expect(summary.failed).toBe(1);

    const estoqueA = await dataSource.query(`SELECT * FROM estoque WHERE id_produto = 'prod-a'`);
    expect(Number(estoqueA[0].quantidade_disponivel)).toBe(5); // Rollback efetuado, continua 5

    const pedidos = await dataSource.query(`SELECT * FROM pedidos WHERE id_pedido_marketplace = 'BR-MULTI'`);
    expect(pedidos.length).toBe(0); // Nao importou
  });

  it('Status SHIPPED de pedido Pendente registra conflito e não altera o status', async () => {
    await dataSource.query(`INSERT INTO pedidos (id, id_empresa, id_integracao, id_pedido_marketplace, cliente_nome, valor_total, taxas_marketplace, status) VALUES ('ped-ship', 'emp-shopee', 'int-shopee', 'BR-SHIP', 'Cliente', 100, 0, 'Pendente')`);

    setupMock([
      {
        order_sn: 'BR-SHIP',
        order_status: 'SHIPPED',
        create_time: Math.floor(Date.now() / 1000) - 3600,
        update_time: Math.floor(Date.now() / 1000),
        total_amount: 100,
        buyer_username: 'shopeebuyer',
        item_list: [{ item_id: 1, model_sku: 'SKU-SHOPEE', model_quantity_purchased: 1, model_discounted_price: 100 }]
      }
    ]);

    const summary = await syncService.syncIntegration('int-shopee', 'emp-shopee');
    expect(summary.conflicts).toBe(1);

    const pedidos = await dataSource.query(`SELECT status FROM pedidos WHERE id_pedido_marketplace = 'BR-SHIP'`);
    expect(pedidos[0].status).toBe('Pendente');

    const auditoria = await dataSource.query(`SELECT * FROM auditoria_logs WHERE acao = 'MARKETPLACE_STATUS_CONFLICT'`);
    expect(auditoria.length).toBeGreaterThan(0);
  });

});



