import { Injectable } from '@nestjs/common';
import { IMarketplaceAdapter, AuthorizationContext, MarketplaceCredentials } from './marketplace-adapter.interface.js';

@Injectable()
export class FakeMarketplaceAdapter implements IMarketplaceAdapter {
  provider = 'FAKE_MARKETPLACE';

  async getAuthorizationUrl(context: AuthorizationContext): Promise<string> {
    return `https://fake.marketplace.com/oauth?state=${context.state}`;
  }

  async exchangeAuthorizationCode(code: string, context: AuthorizationContext): Promise<MarketplaceCredentials> {
    if (code !== 'valid-fake-code') {
      throw new Error('Fake authorization code invalid');
    }
    return {
      accessToken: 'fake-access-token-123',
      refreshToken: 'fake-refresh-token-456',
      expiresIn: 3600,
      externalAccountId: 'fake-ext-account-' + context.idEmpresa,
      externalAccountName: 'Fake Account ' + context.idEmpresa,
      scopes: ['read', 'write'],
    };
  }

  async refreshAccessToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials> {
    return {
      ...credentials,
      accessToken: 'fake-access-token-refreshed',
      refreshToken: 'fake-refresh-token-refreshed',
      expiresIn: 3600,
    };
  }

  async revokeAuthorization(credentials: MarketplaceCredentials): Promise<void> {
    // Fake successful revoke
  }
}
