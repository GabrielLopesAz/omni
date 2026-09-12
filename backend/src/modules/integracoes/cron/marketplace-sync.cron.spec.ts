import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceSyncCron } from './marketplace-sync.cron.js';
import { CryptoService } from '../../../shared/crypto/crypto.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IntegracaoMarketplace } from '../entities/integracao-marketplace.entity.js';
import { Pedido } from '../../pedidos/entities/pedido.entity.js';
import { ItemPedido } from '../../pedidos/entities/item-pedido.entity.js';
import { Produto } from '../../catalogo/entities/produto.entity.js';
import { Logger } from '@nestjs/common';

describe('MarketplaceSyncCron (Motor Assíncrono)', () => {
  let cron: MarketplaceSyncCron;

  const mockIntegracaoRepo = {
    find: vi.fn(),
    save: vi.fn(),
  };

  const mockCryptoService = {
    decrypt: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceSyncCron,
        { provide: getRepositoryToken(IntegracaoMarketplace), useValue: mockIntegracaoRepo },
        { provide: getRepositoryToken(Pedido), useValue: {} },
        { provide: getRepositoryToken(ItemPedido), useValue: {} },
        { provide: getRepositoryToken(Produto), useValue: {} },
        { provide: CryptoService, useValue: mockCryptoService },
      ],
    }).compile();

    cron = module.get<MarketplaceSyncCron>(MarketplaceSyncCron);
    // Evita poluir o console com logs nos testes
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('deve usar Promise.allSettled e não quebrar o loop se uma integração falhar (Timeout Resiliência)', async () => {
    // Simulando 2 integrações, onde a primeira vai dar erro (Timeout) e a segunda vai dar Sucesso
    mockIntegracaoRepo.find.mockResolvedValue([
      { nome: 'Shopee_Falha', credenciais: 'mock_cred' },
      { nome: 'Shopee', credenciais: 'mock_cred' } // O Mock no Cron tem "Shopee" que retorna []
    ]);

    mockCryptoService.decrypt.mockReturnValue('{}');

    // Ao rodar o cron, a primeira deve lançar exceção (por não ter adapter configurado)
    // Mas o cron NÃO deve jogar a exceção para cima, e sim tratar com allSettled.
    
    await expect(cron.handleCron()).resolves.toBeUndefined();
    
    // A integração da Shopee (que funciona) deve ter seu repositório salvo atualizando a data
    expect(mockIntegracaoRepo.save).toHaveBeenCalledTimes(1);
    const savedArg = mockIntegracaoRepo.save.mock.calls[0][0];
    expect(savedArg.nome).toBe('Shopee');
  });
});
