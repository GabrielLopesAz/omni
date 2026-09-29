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

export interface IMarketplaceAdapter {
  provider: string;
  getAuthorizationUrl(context: AuthorizationContext): Promise<string>;
  exchangeAuthorizationCode(code: string, context: AuthorizationContext): Promise<MarketplaceCredentials>;
  refreshAccessToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials>;
  revokeAuthorization?(credentials: MarketplaceCredentials): Promise<void>;
}
