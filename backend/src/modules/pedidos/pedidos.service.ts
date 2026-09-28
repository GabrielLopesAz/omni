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
    dadosPedido: any,
    itens: Array<{ sku: string; quantidade: number; precoUnitario: number }>
  ): Promise<void> {
    // Validação pré-transacional
    if (!itens || itens.length === 0) {
      throw new Error('Pedido sem itens');
    }

    const mapItens: Array<{ sku: string; quantidade: number; precoUnitario: number; idProduto?: string }> = [];

    for (const item of itens) {
      if (!item.sku || item.sku.trim() === '') {
        throw new Error('SKU inválido ou vazio');
      }
      if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
        throw new Error(`Quantidade inválida para o SKU ${item.sku}`);
      }
      if (typeof item.precoUnitario !== 'number' || item.precoUnitario < 0) {
        throw new Error(`Preço unitário inválido para o SKU ${item.sku}`);
      }
      mapItens.push({ ...item });
    }

    try {
      await this.pedidoRepo.manager.transaction(async (manager) => {
        // 1. Verificação Idempotente
        const pedidoExistente = await manager.findOne(Pedido, {
          where: {
            idIntegracao: integracaoId,
            idPedidoMarketplace: dadosPedido.id_pedido_marketplace,
          }
        });

        if (pedidoExistente) {
          // Pedido já importado, ignora pacificamente.
          return;
        }

        // 2. Resolver IDs e Reserva de Estoque Atômica
        for (const item of mapItens) {
          const [produto] = await manager.query(
            `SELECT id FROM produtos WHERE sku = ? AND id_empresa = ? LIMIT 1`,
            [item.sku, empresaId]
          );

          if (!produto) {
            throw new Error(`Produto não encontrado para o SKU ${item.sku}`);
          }
          
          item.idProduto = produto.id; // cache idProduto para reuso

          const result = await manager.query(
            `UPDATE estoque 
             SET quantidade_disponivel = quantidade_disponivel - ?,
                 quantidade_reservada = quantidade_reservada + ?
             WHERE id_produto = ? AND quantidade_disponivel >= ?`,
            [item.quantidade, item.quantidade, produto.id, item.quantidade]
          );

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
        for (const item of mapItens) {
          const novoItem = manager.create(ItemPedido, {
            idPedido: pedidoSalvo.id,
            idProduto: item.idProduto, // reuso da query anterior
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            quantidadeBipada: 0
          });

          await manager.save(ItemPedido, novoItem);
        }
      });
    } catch (err: any) {
      // 5. Tratamento de colisão de Unique Key no nível de banco (caso dois workers rodem exatamente ao mesmo tempo)
      if (err.code === 'ER_DUP_ENTRY' && err.message.includes('uk_pedido_integracao')) {
        // Ignora silenciosamente, pois é colisão idempotente
        return;
      }
      console.error('ERRO EM IMPORTAR:', err);
      throw err;
    }
  }

  /**
   * Restaura o estoque atômica e integralmente em caso de cancelamento, com proteção de idempotência.
   */
  async cancelarPedido(idPedido: string): Promise<void> {
    await this.pedidoRepo.manager.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: idPedido } });
      
      if (!pedido) {
        throw new NotFoundException('Pedido não encontrado');
      }

      if (pedido.status === 'Cancelado') {
        // Idempotente: se já estiver cancelado, não faz nada
        return;
      }

      const itens = await manager.find(ItemPedido, { where: { idPedido } });

      for (const item of itens) {
        // Validação defensiva (nunca permitir que a devolução deixe reservado negativo, embora a query trate)
        const [estoque] = await manager.query(
          `SELECT quantidade_reservada FROM estoque WHERE id_produto = ? LIMIT 1`,
          [item.idProduto]
        );

        if (!estoque || estoque.quantidade_reservada < item.quantidade) {
          throw new Error(`Inconsistência: Reserva atual é menor que a quantidade a devolver para o produto ID ${item.idProduto}`);
        }

        const result = await manager.query(
          `UPDATE estoque
           SET quantidade_disponivel = quantidade_disponivel + ?,
               quantidade_reservada = quantidade_reservada - ?
           WHERE id_produto = ? AND quantidade_reservada >= ?`,
          [item.quantidade, item.quantidade, item.idProduto, item.quantidade]
        );

        if (result.affectedRows === 0) {
          throw new Error('Falha ao restaurar estoque durante cancelamento');
        }
      }

      pedido.status = 'Cancelado';
      await manager.save(Pedido, pedido);
    });
  }
}
