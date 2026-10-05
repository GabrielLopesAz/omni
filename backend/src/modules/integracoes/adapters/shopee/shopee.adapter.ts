import { Injectable, Logger } from '@nestjs/common';
import { IMarketplaceAdapter, AuthorizationContext, MarketplaceCredentials, MarketplaceAuthorizationCallback, NormalizedMarketplaceOrder } from '../marketplace-adapter.interface.js';
import { ShopeeClient } from './shopee-client.js';
import { SHOPEE_API_PATHS, SHOPEE_IMPORTABLE_STATUSES } from './shopee.constants.js';
import { ShopeeShopInfoResponse, ShopeeTokenResponse, ShopeeOrderListResponse, ShopeeOrderDetailResponse } from './shopee.types.js';
import { ShopeeMapper } from './shopee.mapper.js';

@Injectable()
export class ShopeeAdapter implements IMarketplaceAdapter {
  provider = 'SHOPEE';
  private readonly logger = new Logger(ShopeeAdapter.name);

  constructor(
    private readonly shopeeClient: ShopeeClient
  ) {}

  async getAuthorizationUrl(context: AuthorizationContext): Promise<string> {
    if (!this.shopeeClient.isConfigured()) {
      throw new Error('Shopee provider is not configured. Missing Partner ID or Key.');
    }
    // We append the state into our redirect URL so that it returns back properly
    // Shopee API will redirect to this URI with ?code=XXX&shop_id=YYY&redirect_uri=...
    const baseRedirect = process.env.SHOPEE_REDIRECT_URI || 'http://localhost:3000/api/v1/integracoes/SHOPEE/callback';
    const redirectUri = `${baseRedirect}?state=${context.state}`;

    return this.shopeeClient.getAuthUrl(redirectUri);
  }

  parseAuthorizationCallback(query: Record<string, any>): MarketplaceAuthorizationCallback {
    return {
      code: query.code as string,
      state: query.state as string,
      externalAccountIdHint: query.shop_id as string,
    };
  }

  async exchangeAuthorizationCode(
    code: string,
    context: AuthorizationContext,
    callbackData?: MarketplaceAuthorizationCallback
  ): Promise<MarketplaceCredentials> {
    
    if (!callbackData?.externalAccountIdHint) {
      throw new Error('Shopee authorization missing shop_id in callback');
    }
    const shopId = callbackData.externalAccountIdHint;

    const payload = {
      code,
      shop_id: Number(shopId),
      partner_id: Number(this.shopeeClient.getPartnerId())
    };

    const data = await this.shopeeClient.publicRequest<ShopeeTokenResponse>(SHOPEE_API_PATHS.GET_TOKEN, payload);

    if (!data.access_token || !data.refresh_token) {
      throw new Error('Tokens ausentes na resposta da Shopee');
    }

    const credentials = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expire_in,
      externalAccountId: shopId,
    };

    // Identificar a loja (Shop Name)
    try {
      const shopInfo = await this.shopeeClient.shopRequest<ShopeeShopInfoResponse>(
        SHOPEE_API_PATHS.GET_SHOP_INFO,
        credentials.accessToken,
        shopId
      );
      if (shopInfo && shopInfo.shop_name) {
        (credentials as MarketplaceCredentials).externalAccountName = shopInfo.shop_name;
      }
    } catch (e: any) {
      this.logger.error(`NÃ£o foi possÃ­vel obter os dados da loja: ${e.message}`);
      throw new Error(`IntegraÃ§Ã£o falhou ao validar shop_id. Detalhes: ${e.message}`);
    }

    return credentials;
  }

  async refreshAccessToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials> {
    if (!credentials.refreshToken) {
      throw new Error('Refresh token is required');
    }
    
    const shopId = credentials.externalAccountId;
    if (!shopId) {
      throw new Error('Shop ID is required for Shopee refresh token');
    }

    const payload = {
      refresh_token: credentials.refreshToken,
      shop_id: Number(shopId),
      partner_id: Number(this.shopeeClient.getPartnerId())
    };

    const data = await this.shopeeClient.publicRequest<ShopeeTokenResponse>(SHOPEE_API_PATHS.REFRESH_TOKEN, payload);

    if (!data.access_token || !data.refresh_token) {
      throw new Error('Tokens ausentes na resposta de refresh da Shopee');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expire_in,
      externalAccountId: shopId,
    };
  }

  async revokeAuthorization(credentials: MarketplaceCredentials): Promise<void> {
    // Shopee doesn't have an explicit revoke token API, or it's not strictly documented in a standard way to be called during disconnect.
    // OMNI will just clear the credentials on its side.
    return Promise.resolve();
  }

  async getOrders(credentials: MarketplaceCredentials, timeFrom: Date, timeTo: Date): Promise<NormalizedMarketplaceOrder[]> {
    if (!credentials.externalAccountId) throw new Error('Missing Shop ID');

    let cursor = '';
    let hasMore = true;
    const orderSns: string[] = [];

    // PaginaÃ§Ã£o para pegar os order_sn
    while (hasMore) {
      const searchParams: any = {
        time_range_field: 'update_time',
        time_from: Math.floor(timeFrom.getTime() / 1000).toString(),
        time_to: Math.floor(timeTo.getTime() / 1000).toString(),
        page_size: '50',
      };
      if (cursor !== '') {
        searchParams.cursor = cursor;
      }

      const listResponse = await this.shopeeClient.shopRequest<ShopeeOrderListResponse>(
        SHOPEE_API_PATHS.GET_ORDER_LIST,
        credentials.accessToken,
        credentials.externalAccountId,
        {}, // payload Vazio pois Ã© GET
        searchParams
      );

      if (listResponse.response?.order_list) {
        listResponse.response.order_list.forEach(o => orderSns.push(o.order_sn));
      }

      hasMore = listResponse.response?.more || false;
      cursor = listResponse.response?.next_cursor || '';
    }

    if (orderSns.length === 0) return [];

    // Fetch batch order details (Shopee limit is usually 50 per batch)
    const orderDetails: NormalizedMarketplaceOrder[] = [];
    
    // Split in chunks of 50
    for (let i = 0; i < orderSns.length; i += 50) {
      const batchSns = orderSns.slice(i, i + 50);
      
      const searchParams = {
        order_sn_list: batchSns.join(','),
        response_optional_fields: 'buyer_user_id,buyer_username,item_list,shipping_carrier,total_amount'
      };

      const detailResponse = await this.shopeeClient.shopRequest<ShopeeOrderDetailResponse>(
        SHOPEE_API_PATHS.GET_ORDER_DETAIL,
        credentials.accessToken,
        credentials.externalAccountId,
        {},
        searchParams
      );

      if (detailResponse.response?.order_list) {
        for (const rawOrder of detailResponse.response.order_list) {
          // Filtrar por status importaveis (aqueles que reservam estoque)
          if (SHOPEE_IMPORTABLE_STATUSES.includes(rawOrder.order_status)) {
            try {
              const normalized = ShopeeMapper.toNormalizedOrder(rawOrder);
              orderDetails.push(normalized);
            } catch (err: any) {
              this.logger.warn(`Ignorando pedido ${rawOrder.order_sn} da importaÃ§Ã£o. Motivo: ${err.message}`);
              // Continua com outros pedidos
            }
          }
        }
      }
    }

    return orderDetails;
  }
}

