import { Test, TestingModule } from '@nestjs/testing';
import { LogisticaService } from './logistica.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ItemPedido } from '../pedidos/entities/item-pedido.entity.js';
import { Conferencia } from './entities/conferencia.entity.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('LogisticaService (Bipagem)', () => {
  let service: LogisticaService;

  const mockPedidoRepo = {
    findOne: vi.fn(),
    save: vi.fn(),
  };
  const mockItemRepo = {
    find: vi.fn(),
  };
  const mockConferenciaRepo = {};
  const mockAuditoriaService = {
    logAction: vi.fn(),
  };
  const mockDataSource = {};

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogisticaService,
        { provide: getRepositoryToken(Pedido), useValue: mockPedidoRepo },
        { provide: getRepositoryToken(ItemPedido), useValue: mockItemRepo },
        { provide: getRepositoryToken(Conferencia), useValue: mockConferenciaRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<LogisticaService>(LogisticaService);
  });

  it('deve retornar Erro 400 (SKU Inválido) se bipar um produto que não está no pedido', async () => {
    mockPedidoRepo.findOne.mockResolvedValue({ id: '1', status: 'Pendente' });
    mockItemRepo.find.mockResolvedValue([{ produto: { sku: 'SKU-CERTO' }, quantidade: 1 }]);

    await expect(service.biparItem('1', 'SKU-ERRADO', 'user-1', '127.0.0.1'))
      .rejects.toThrow(BadRequestException);
    
    expect(mockAuditoriaService.logAction).toHaveBeenCalledWith(
      'BIPAGEM_ERRO_SKU_INVALIDO', 'user-1', '127.0.0.1', 'itens_pedido', null, { sku: 'SKU-ERRADO' }
    );
  });

  it('deve retornar Erro 400 (QTD Excedida) ao tentar bipar produto além da quantidade (Regra RN-003)', async () => {
    mockPedidoRepo.findOne.mockResolvedValue({ id: '1', status: 'Pendente' });
    // O mock no logistica.service hardcodeou quantidadeJaBipada = 0.
    // Para forçar o erro no teste onde qtd = 0, se o pedido requer 0 itens, vai exceder.
    mockItemRepo.find.mockResolvedValue([{ produto: { sku: 'SKU-LIMITE' }, quantidade: 0 }]);

    await expect(service.biparItem('1', 'SKU-LIMITE', 'user-1', '127.0.0.1'))
      .rejects.toThrow(new BadRequestException('Quantidade Excedida'));
      
    expect(mockAuditoriaService.logAction).toHaveBeenCalledWith(
      'BIPAGEM_ERRO_QTD_EXCEDIDA', 'user-1', '127.0.0.1', 'itens_pedido', null, { sku: 'SKU-LIMITE' }
    );
  });

  it('deve registrar bipagem com sucesso e alterar status do pedido para EM_SEPARACAO', async () => {
    const pedido = { id: '1', status: 'Pendente', versao: 1 };
    mockPedidoRepo.findOne.mockResolvedValue(pedido);
    mockItemRepo.find.mockResolvedValue([{ produto: { sku: 'SKU-OK' }, quantidade: 2 }]);

    const result = await service.biparItem('1', 'SKU-OK', 'user-1', '127.0.0.1');
    
    expect(result.message).toBe('Bipagem registrada com sucesso');
    expect(pedido.status).toBe('EM_SEPARACAO');
    expect(mockPedidoRepo.save).toHaveBeenCalledWith(pedido);
    expect(mockAuditoriaService.logAction).toHaveBeenCalledWith(
      'BIPAGEM_SUCESSO', 'user-1', '127.0.0.1', 'itens_pedido', null, { sku: 'SKU-OK' }
    );
  });
});
