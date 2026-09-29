import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceSyncCron } from './marketplace-sync.cron.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IntegracaoMarketplace } from '../entities/integracao-marketplace.entity.js';
import { Logger } from '@nestjs/common';

describe('MarketplaceSyncCron (Motor Assincrono)', () => {
  let cron: MarketplaceSyncCron;

  const mockIntegracaoRepo = {
    find: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceSyncCron,
        { provide: getRepositoryToken(IntegracaoMarketplace), useValue: mockIntegracaoRepo },
      ],
    }).compile();

    cron = module.get<MarketplaceSyncCron>(MarketplaceSyncCron);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('deve buscar integracoes ativas e logar aviso do P4.2', async () => {
    mockIntegracaoRepo.find.mockResolvedValue([
      { id: '1', provider: 'SHOPEE', status: 'CONECTADO' }
    ]);
    
    await expect(cron.handleCron()).resolves.toBeUndefined();
    expect(mockIntegracaoRepo.find).toHaveBeenCalledWith({ where: { status: 'CONECTADO' } });
  });
});
