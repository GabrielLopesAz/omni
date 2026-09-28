import { Test, TestingModule } from '@nestjs/testing';
import { PedidosService } from './pedidos.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Pedido } from './entities/pedido.entity.js';
import { ItemPedido } from './entities/item-pedido.entity.js';

describe('PedidosService (Motor de Pedidos)', () => {
  let service: PedidosService;

  const mockEntityManager = {
    findOne: vi.fn(),
    find: vi.fn(),
    query: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockPedidoRepo = {
    manager: {
      transaction: vi.fn().mockImplementation(async (cb) => {
        return cb(mockEntityManager);
      }),
    },
    createQueryBuilder: vi.fn(),
    findOne: vi.fn(),
  };

  const mockItemPedidoRepo = {
    find: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosService,
        { provide: getRepositoryToken(Pedido), useValue: mockPedidoRepo },
        { provide: getRepositoryToken(ItemPedido), useValue: mockItemPedidoRepo },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
  });

  describe('Validação de Itens', () => {
    it('deve abortar importação se quantidade for <= 0', async () => {
      await expect(service.importarPedidoMarketplace('int1', 'emp1', {}, [
        { sku: 'SKU-OK', quantidade: 0, precoUnitario: 10 }
      ])).rejects.toThrow('Quantidade inválida para o SKU SKU-OK');
    });

    it('deve abortar se quantidade for negativa', async () => {
      await expect(service.importarPedidoMarketplace('int1', 'emp1', {}, [
        { sku: 'SKU-OK', quantidade: -5, precoUnitario: 10 }
      ])).rejects.toThrow('Quantidade inválida para o SKU SKU-OK');
    });

    it('deve abortar se quantidade não for inteira', async () => {
      await expect(service.importarPedidoMarketplace('int1', 'emp1', {}, [
        { sku: 'SKU-OK', quantidade: 1.5, precoUnitario: 10 }
      ])).rejects.toThrow('Quantidade inválida para o SKU SKU-OK');
    });
  });

  describe('Idempotência', () => {
    it('deve ignorar pedido duplicado (idempotência no banco)', async () => {
      mockEntityManager.findOne.mockResolvedValue({ id: 'pedido_existente' });

      await service.importarPedidoMarketplace('int1', 'emp1', { id_pedido_marketplace: 'ext1' }, [
        { sku: 'SKU-1', quantidade: 1, precoUnitario: 10 }
      ]);

      expect(mockEntityManager.query).not.toHaveBeenCalled(); // Nenhuma reserva feita
      expect(mockEntityManager.save).not.toHaveBeenCalled(); // Nenhum pedido salvo
    });

    it('deve tratar colisão de Unique Key na transação sem jogar erro', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.query.mockResolvedValue([{ id: 'prod1' }]);
      mockEntityManager.query.mockResolvedValueOnce([{ id: 'prod1' }]); // SELECT
      mockEntityManager.query.mockResolvedValueOnce({ affectedRows: 1 }); // UPDATE
      
      const erroDuplicado: any = new Error('Duplicate entry');
      erroDuplicado.code = 'ER_DUP_ENTRY';
      erroDuplicado.message = 'Duplicate entry uk_pedido_integracao';
      
      mockPedidoRepo.manager.transaction.mockImplementationOnce(() => {
        throw erroDuplicado;
      });

      await expect(service.importarPedidoMarketplace('int1', 'emp1', { id_pedido_marketplace: 'ext1' }, [
        { sku: 'SKU-1', quantidade: 1, precoUnitario: 10 }
      ])).resolves.not.toThrow();
    });
  });

  describe('Estoque e Rollback Parcial', () => {
    it('deve abortar e fazer rollback se estoque for insuficiente', async () => {
      mockEntityManager.findOne.mockResolvedValue(null); // Pedido não existe
      
      mockEntityManager.query.mockReset();
      mockEntityManager.query.mockImplementation(async (q) => {
        if (q.includes('produtos')) return [{ id: 'prod-1' }];
        if (q.includes('estoque')) return { affectedRows: 0 }; // Falhou UPDATE
        return [];
      });

      await expect(service.importarPedidoMarketplace('int1', 'emp1', { id_pedido_marketplace: 'ext1' }, [
        { sku: 'SKU-1', quantidade: 5, precoUnitario: 10 }
      ])).rejects.toThrow('Estoque insuficiente para o produto SKU-1');
      
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });
  });

  describe('Cancelamento de Pedido', () => {
    it('deve estornar estoque corretamente ao cancelar', async () => {
      const mockPedido = { id: 'ped-1', status: 'Pendente' };
      mockEntityManager.findOne.mockResolvedValue(mockPedido);
      mockEntityManager.find.mockResolvedValue([
        { idProduto: 'prod-1', quantidade: 3 }
      ]);
      mockEntityManager.query.mockImplementation(async (q) => {
        if (q.includes('SELECT quantidade_reservada')) return [{ quantidade_reservada: 5 }];
        if (q.includes('UPDATE estoque')) return { affectedRows: 1 };
        return [];
      });

      await service.cancelarPedido('ped-1');

      expect(mockPedido.status).toBe('Cancelado');
      expect(mockEntityManager.save).toHaveBeenCalledWith(Pedido, mockPedido);
    });

    it('não deve alterar estoque se já estiver cancelado', async () => {
      const mockPedido = { id: 'ped-1', status: 'Cancelado' };
      mockEntityManager.findOne.mockResolvedValue(mockPedido);

      await service.cancelarPedido('ped-1');

      expect(mockEntityManager.find).not.toHaveBeenCalled(); // Não buscou itens
      expect(mockEntityManager.query).not.toHaveBeenCalled(); // Não mudou estoque
    });
  });
});
