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

    // Mock das requisições do ShopeeClient
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
      if (path === '/api/v2/auth/token/get') {
        return {
          error: '', message: '', request_id: 'req123',
          access_token: 'fake_access', refresh_token: 'fake_refresh',
          expire_in: 14400, merchant_id: 111, shop_id: 222
        };
      }
      return {};
    });

    vi.spyOn(shopeeClient, 'shopRequest').mockImplementation(async (path: string, token: string, shopId: string, payload?: any, query?: any) => {
      if (path === '/api/v2/shop/get_shop_info') {
        return {
          error: '', message: '', request_id: 'req123',
          shop_name: 'Loja Teste E2E', region: 'BR', status: 'NORMAL'
        };
      }
      if (path === '/api/v2/order/get_order_list') {
        if (!query?.cursor) {
          return {
            error: '', message: '', request_id: 'req1',
            response: { more: true, next_cursor: 'page2', order_list: [{ order_sn: 'BR230101XYZ' }] }
          };
        } else {
          return {
            error: '', message: '', request_id: 'req2',
            response: { more: false, next_cursor: '', order_list: [{ order_sn: 'BR230102ABC' }] }
          };
        }
      }
      if (path === '/api/v2/order/get_order_detail') {
        return {
          error: '', message: '', request_id: 'req123',
          response: {
            order_list: [
              {
                order_sn: 'BR230101XYZ',
                order_status: 'READY_TO_SHIP',
                create_time: Math.floor(Date.now() / 1000) - 3600,
                update_time: Math.floor(Date.now() / 1000) - 1800,
                total_amount: 150.5,
                buyer_username: 'shopeebuyer',
                item_list: [
                  {
                    item_id: 999, item_name: 'Produto Shopee', item_sku: 'SKU-SHOPEE',
                    model_id: 0, model_name: '', model_sku: 'SKU-SHOPEE',
                    model_quantity_purchased: 2, model_discounted_price: 75.25
                  }
                ]
              },
              {
                order_sn: 'BR230102ABC',
                order_status: 'PROCESSED',
                create_time: Math.floor(Date.now() / 1000) - 3600,
                update_time: Math.floor(Date.now() / 1000) - 1800,
                total_amount: 100.0,
                buyer_username: 'shopeebuyer2',
                item_list: [
                  {
                    item_id: 999, item_name: 'Produto Shopee', item_sku: 'SKU-SHOPEE',
                    model_id: 0, model_name: '', model_sku: 'SKU-SHOPEE',
                    model_quantity_purchased: 1, model_discounted_price: 100.0
                  }
                ]
              }
            ]
          }
        };
      }
      return {};
    });
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
    
    const encryptedToken = cryptoService.encrypt('fake_access_token');
    const encryptedRefresh = cryptoService.encrypt('fake_refresh_token');

    await dataSource.query(`
      INSERT INTO integracoes_marketplace 
      (id, id_empresa, provider, status, external_account_id, access_token_encrypted, refresh_token_encrypted, token_expires_at) 
      VALUES 
      ('int-shopee', 'emp-shopee', 'SHOPEE', 'CONECTADO', '222', '${encryptedToken}', '${encryptedRefresh}', '2030-01-01 00:00:00')
    `);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve simular integracao Shopee completa e lidar com concorrencia distribuida', async () => {
    const getOrdersSpy = vi.spyOn(shopeeAdapter, 'getOrders');

    const exec1 = syncService.syncIntegration('int-shopee', 'emp-shopee');
    (syncService as any).runningSyncs.clear();
    const exec2 = syncService.syncIntegration('int-shopee', 'emp-shopee');

    await Promise.allSettled([exec1, exec2]);

    expect(getOrdersSpy).toHaveBeenCalledTimes(1);

    const pedidos = await dataSource.query(`SELECT * FROM pedidos WHERE id_integracao = 'int-shopee' ORDER BY id_pedido_marketplace ASC`);
    expect(pedidos.length).toBe(2);
    expect(pedidos[0].id_pedido_marketplace).toBe('BR230101XYZ');
    expect(pedidos[1].id_pedido_marketplace).toBe('BR230102ABC');

    const estoque = await dataSource.query(`SELECT quantidade_disponivel, quantidade_reservada FROM estoque WHERE id_produto = 'prod-shopee'`);
    expect(Number(estoque[0].quantidade_disponivel)).toBe(7); // 10 - 3 (2 from XYZ, 1 from ABC)
    expect(Number(estoque[0].quantidade_reservada)).toBe(3);
  });

  it('deve rotacionar o token (refresh) caso proximo de expirar', async () => {
    await dataSource.query(`UPDATE integracoes_marketplace SET token_expires_at = DATE_ADD(NOW(), INTERVAL 1 MINUTE) WHERE id = 'int-shopee'`);

    await syncService.syncIntegration('int-shopee', 'emp-shopee');

    const rows = await dataSource.query(`SELECT access_token_encrypted, refresh_token_encrypted, token_expires_at FROM integracoes_marketplace WHERE id = 'int-shopee'`);
    const newAccess = cryptoService.decrypt(rows[0].access_token_encrypted);
    const newRefresh = cryptoService.decrypt(rows[0].refresh_token_encrypted);

    expect(newAccess).toBe('NEW_access');
    expect(newRefresh).toBe('NEW_refresh');
    
    expect(new Date(rows[0].token_expires_at).getTime()).toBeGreaterThan(Date.now() + 100000); 
  });
});
