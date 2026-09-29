import { Injectable, BadRequestException } from '@nestjs/common';
import { IMarketplaceAdapter } from './marketplace-adapter.interface.js';

@Injectable()
export class MarketplaceAdapterRegistry {
  private adapters = new Map<string, IMarketplaceAdapter>();

  register(adapter: IMarketplaceAdapter) {
    this.adapters.set(adapter.provider.toUpperCase(), adapter);
  }

  getAdapter(provider: string): IMarketplaceAdapter {
    const adapter = this.adapters.get(provider.toUpperCase());
    if (!adapter) {
      throw new BadRequestException(`Provider ${provider} not available in production`);
    }
    return adapter;
  }
}
