import { Test, TestingModule } from '@nestjs/testing';
import { LogisticaService } from './logistica.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ItemPedido } from '../pedidos/entities/item-pedido.entity.js';
import { Conferencia } from './entities/conferencia.entity.js';
import { Estoque } from '../catalogo/entities/estoque.entity.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { BadRequestException } from '@nestjs/common';
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
  const mockEstoqueRepo = {};
  const mockAuditoriaService = {
    logAction: vi.fn(),
  };

  // Manager mock atualizado com findOne + find + save + query
  const mockEntityManager = {
    findOne: vi.fn(),
    find: vi.fn(),
    save: vi.fn(),
    query: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  };

  const mockDataSource = {
    transaction: vi.fn().mockImplementation(async (cb) => {
      return cb(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEntityManager.findOne.mockReset();
    mockEntityManager.find.mockReset();
    mockEntityManager.query.mockReset();
    mockEntityManager.save.mockReset();
    
    // Reconfigura defaults
    mockEntityManager.query.mockResolvedValue({ affectedRows: 1 });
    mockEntityManager.findOne.mockResolvedValue(null);
    mockEntityManager.find.mockResolvedValue([]);
    mockEntityManager.save.mockResolvedValue({});
    
    // clearAllMocks também limpa o transaction — reconfigurar
    mockDataSource.transaction.mockImplementation(async (cb: (m: typeof mockEntityManager) => unknown) => cb(mockEntityManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogisticaService,
        { provide: getRepositoryToken(Pedido), useValue: mockPedidoRepo },
        { provide: getRepositoryToken(ItemPedido), useValue: mockItemRepo },
        { provide: getRepositoryToken(Conferencia), useValue: mockConferenciaRepo },
        { provide: getRepositoryToken(Estoque), useValue: mockEstoqueRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<LogisticaService>(LogisticaService);
  });

  it('deve retornar Erro 400 (SKU Inválido) se bipar um produto que não está no pedido', async () => {
    const pedido = { id: '1', idEmpresa: 'emp-1', status: 'Pendente' };
    mockEntityManager.findOne.mockResolvedValue(pedido);
    mockEntityManager.find
      .mockResolvedValueOnce([{ id: 'item1', produto: { sku: 'SKU-CERTO' }, quantidade: 1, quantidadeBipada: 0 }]) // items com lock
      .mockResolvedValueOnce([{ id: 'item1', quantidade: 1, quantidadeBipada: 0 }]); // re-read fresco

    await expect(service.biparItem('1', 'SKU-ERRADO', 'user-1', '127.0.0.1', 'emp-1'))
      .rejects.toThrow(BadRequestException);

    expect(mockAuditoriaService.logAction).toHaveBeenCalledWith(
      'BIPAGEM_ERRO_SKU_INVALIDO', 'user-1', '127.0.0.1', 'itens_pedido', null, { sku: 'SKU-ERRADO' }
    );
  });

  it('deve retornar Erro 400 (QTD Excedida) ao tentar bipar produto além da quantidade (Regra RN-003)', async () => {
    const pedido = { id: '1', idEmpresa: 'emp-1', status: 'Pendente' };
    mockEntityManager.findOne.mockResolvedValueOnce(pedido);
    // O item tem quantidadeBipada já igual à quantidade — deve rejeitar ANTES do UPDATE
    // Configura o find para retornar o item completo em qualquer chamada
    const itemCompleto = { id: 'item1', produto: { sku: 'SKU-LIMITE' }, quantidade: 1, quantidadeBipada: 1 };
    mockEntityManager.find.mockResolvedValueOnce([itemCompleto]);

    await expect(service.biparItem('1', 'SKU-LIMITE', 'user-1', '127.0.0.1', 'emp-1'))
      .rejects.toThrow(BadRequestException);

    // A auditoria deve ter sido chamada com QTD_EXCEDIDA (não SKU_INVALIDO)
    const calls = mockAuditoriaService.logAction.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe('BIPAGEM_ERRO_QTD_EXCEDIDA');
  });

  it('deve registrar bipagem com sucesso e alterar status do pedido para EM_SEPARACAO', async () => {
    const pedido = { id: '1', idEmpresa: 'emp-1', status: 'Pendente', versao: 1 };
    mockEntityManager.findOne.mockResolvedValue(pedido);
    mockEntityManager.find
      .mockResolvedValueOnce([{ id: 'item1', produto: { sku: 'SKU-OK' }, quantidade: 2, quantidadeBipada: 0 }]) // items com lock
      .mockResolvedValueOnce([{ id: 'item1', quantidade: 2, quantidadeBipada: 1 }]); // re-read fresco após UPDATE
    mockEntityManager.save.mockResolvedValue(pedido);

    const result = await service.biparItem('1', 'SKU-OK', 'user-1', '127.0.0.1', 'emp-1');

    expect(result.message).toBe('Bipagem registrada com sucesso');
    expect(pedido.status).toBe('EM_SEPARACAO');
    expect(mockEntityManager.save).toHaveBeenCalledWith(Pedido, pedido);
    expect(mockAuditoriaService.logAction).toHaveBeenCalledWith(
      'BIPAGEM_SUCESSO', 'user-1', '127.0.0.1', 'itens_pedido',
      expect.any(Object),
      expect.any(Object),
      mockEntityManager
    );
  });
});
