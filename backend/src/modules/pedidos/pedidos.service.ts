import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from './entities/pedido.entity.js';
import { ItemPedido } from './entities/item-pedido.entity.js';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private pedidoRepo: Repository<Pedido>,
    @InjectRepository(ItemPedido)
    private itemPedidoRepo: Repository<ItemPedido>,
  ) {}

  async listar(status?: string): Promise<Pedido[]> {
    const query = this.pedidoRepo.createQueryBuilder('pedido')
      .leftJoinAndSelect('pedido.empresa', 'empresa')
      .leftJoinAndSelect('pedido.integracao', 'integracao');

    if (status) {
      query.where('pedido.status = :status', { status });
    }

    return query.getMany();
  }

  async buscarPorId(id: string): Promise<Pedido> {
    const pedido = await this.pedidoRepo.findOne({
      where: { id },
      relations: { empresa: true, integracao: true },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const itens = await this.itemPedidoRepo.find({
      where: { idPedido: id },
      relations: { produto: true },
    });
    
    (pedido as any).itens = itens;
    return pedido;
  }

  /**
   * Importa um pedido do marketplace de forma idempotente e com reserva atômica de estoque.
   * Se o estoque for insuficiente, a transação falhará e fará rollback de tudo.
   */
  async importarPedidoMarketplace(
    integracaoId: string,
    empresaId: string,
    dadosPedido: any, // Adaptado do formato de entrada do marketplace
    itens: Array<{ sku: string; quantidade: number; precoUnitario: number }>
  ): Promise<void> {
    await this.pedidoRepo.manager.transaction(async (manager) => {
      // 1. Verificação Idempotente
      const pedidoExistente = await manager.findOne(Pedido, {
        where: {
          idIntegracao: integracaoId,
          idPedidoMarketplace: dadosPedido.id_pedido_marketplace,
        }
      });

      if (pedidoExistente) {
        // Pedido já importado, ignora.
        return;
      }

      // 2. Reserva de Estoque Atômica
      for (const item of itens) {
        // Encontra produto pelo SKU e Empresa
        // (Nota: Produto entity precisa ser carregada ou importada aqui se precisarmos do id. Assumiremos que a query pode ser direta)
        
        // Em um sistema real, buscaríamos o id do produto a partir do SKU e Empresa
        const [produto] = await manager.query(
          `SELECT id FROM produtos WHERE sku = ? AND id_empresa = ? LIMIT 1`,
          [item.sku, empresaId]
        );

        if (!produto) {
          throw new Error(`Produto não encontrado para o SKU ${item.sku}`);
        }

        const result = await manager.query(
          `UPDATE estoque 
           SET quantidade_disponivel = quantidade_disponivel - ?,
               quantidade_reservada = quantidade_reservada + ?
           WHERE id_produto = ? AND quantidade_disponivel >= ?`,
          [item.quantidade, item.quantidade, produto.id, item.quantidade]
        );

        // Verifica affectedRows no mysql
        if (result.affectedRows === 0) {
          throw new Error(`Estoque insuficiente para o produto ${item.sku}`);
        }
      }

      // 3. Persistência do Pedido
      const novoPedido = manager.create(Pedido, {
        idIntegracao: integracaoId,
        idEmpresa: empresaId,
        idPedidoMarketplace: dadosPedido.id_pedido_marketplace,
        clienteNome: dadosPedido.cliente_nome,
        valorTotal: dadosPedido.valor_total,
        taxasMarketplace: dadosPedido.taxas_marketplace,
        status: 'Pendente'
      });

      const pedidoSalvo = await manager.save(Pedido, novoPedido);

      // 4. Persistência dos Itens
      for (const item of itens) {
        const [produto] = await manager.query(
          `SELECT id FROM produtos WHERE sku = ? AND id_empresa = ? LIMIT 1`,
          [item.sku, empresaId]
        );
        
        const novoItem = manager.create(ItemPedido, {
          idPedido: pedidoSalvo.id,
          idProduto: produto.id,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          quantidadeBipada: 0
        });

        await manager.save(ItemPedido, novoItem);
      }
    });
  }
}
