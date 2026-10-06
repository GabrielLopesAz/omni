export interface AuthorizationContext {
  idEmpresa: string;
  idUsuario: string;
  state: string;
  provider: string;
}

export interface MarketplaceCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  externalAccountId?: string;
  externalAccountName?: string;
  scopes?: string[];
}

export interface MarketplaceAuthorizationCallback {
  code: string;
  state: string;
  externalAccountIdHint?: string;
}

export type MarketplaceOrderAction = 'IMPORT' | 'CANCEL' | 'UPDATE_STATUS' | 'IGNORE' | 'CONFLICT' | 'ERROR';

export interface NormalizedMarketplaceOrder {
  action: MarketplaceOrderAction;
  processingError?: string;
  externalOrderId: string;
  externalStatus: string;
  customerName: string | null;
  totalAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
  items: NormalizedMarketplaceOrderItem[];
}

export interface NormalizedMarketplaceOrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface IMarketplaceAdapter {
  provider: string;
  
  getAuthorizationUrl(context: AuthorizationContext): Promise<string>;
  
  // Custom parsing callback params, mainly because Shopee has shop_id and no native state
  parseAuthorizationCallback?(query: Record<string, any>): MarketplaceAuthorizationCallback;
  
  exchangeAuthorizationCode(
    code: string, 
    context: AuthorizationContext, 
    callbackData?: MarketplaceAuthorizationCallback
  ): Promise<MarketplaceCredentials>;
  
  refreshAccessToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials>;
  
  revokeAuthorization?(credentials: MarketplaceCredentials): Promise<void>;
  
  // Data Sync
  getOrders?(credentials: MarketplaceCredentials, timeFrom: Date, timeTo: Date): Promise<NormalizedMarketplaceOrder[]>;
}



