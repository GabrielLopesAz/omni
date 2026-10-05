import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from './entities/pedido.entity.js';
import { ItemPedido } from './entities/item-pedido.entity.js';

export interface MarketplaceOrderImportDto {
  id_pedido_marketplace: string;
  cliente_nome: string;
  valor_total: number;
  taxas_marketplace?: number;
}

export interface MarketplaceOrderItemDto {
  sku: string;
  quantidade: number;
  precoUnitario: number;
}

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private pedidoRepo: Repository<Pedido>,
    @InjectRepository(ItemPedido)
    private itemPedidoRepo: Repository<ItemPedido>,
  ) {}

  async listar(idEmpresa: string, status?: string): Promise<Pedido[]> {
    const query = this.pedidoRepo.createQueryBuilder('pedido')
      
      .leftJoinAndSelect('pedido.integracao', 'integracao')
      .where('pedido.idEmpresa = :idEmpresa', { idEmpresa });

    if (status) {
      query.andWhere('pedido.status = :status', { status });
    }

    return query.getMany();
  }

  async buscarPorId(id: string, idEmpresa: string): Promise<Pedido> {
    const pedido = await this.pedidoRepo.findOne({
      where: { id, idEmpresa },
      relations: { integracao: true },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido nÃ£o encontrado');
    }

    const itens = await this.itemPedidoRepo.find({
      where: { idPedido: id },
      relations: { produto: true },
    });
    
    (pedido as any).itens = itens;
    return pedido;
  }

  async importarPedidoMarketplace(
    integracaoId: string,
    empresaId: string,
    dadosPedido: MarketplaceOrderImportDto,
    itens: MarketplaceOrderItemDto[]
  ): Promise<void> {
    if (!itens || itens.length === 0) {
      throw new Error('Pedido sem itens');
    }

    const mapItens: Array<MarketplaceOrderItemDto & { idProduto?: string }> = [];

    for (const item of itens) {
      if (!item.sku || item.sku.trim() === '') {
        throw new Error('SKU invÃ¡lido ou vazio');
      }
      if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
        throw new Error(`Quantidade invÃ¡lida para o SKU ${item.sku}`);
      }
      if (typeof item.precoUnitario !== 'number' || item.precoUnitario < 0) {
        throw new Error(`PreÃ§o unitÃ¡rio invÃ¡lido para o SKU ${item.sku}`);
      }
      mapItens.push({ ...item });
    }

    try {
      await this.pedidoRepo.manager.transaction(async (manager) => {
        const pedidoExistente = await manager.findOne(Pedido, {
          where: {
            idIntegracao: integracaoId,
            idPedidoMarketplace: dadosPedido.id_pedido_marketplace,
          }
        });

        if (pedidoExistente) {
          return;
        }

        for (const item of mapItens) {
          const [produto] = await manager.query(
            `SELECT id FROM produtos WHERE sku = ? AND id_empresa = ? LIMIT 1`,
            [item.sku, empresaId]
          );

          if (!produto) {
            throw new Error(`Produto nÃ£o encontrado para o SKU ${item.sku}`);
          }
          
          item.idProduto = produto.id; 

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

        for (const item of mapItens) {
          const novoItem = manager.create(ItemPedido, {
            idPedido: pedidoSalvo.id,
            idProduto: item.idProduto,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            quantidadeBipada: 0
          });

          await manager.save(ItemPedido, novoItem);
        }
      });
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY' && err.message.includes('uk_pedido_integracao')) {
        return;
      }
      console.error('ERRO EM IMPORTAR:', err);
      throw err;
    }
  }

  async cancelarPedido(idPedido: string, idEmpresa: string): Promise<void> {
console.log('CANCELAR:', idPedido, idEmpresa);
    await this.pedidoRepo.manager.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: idPedido, idEmpresa } });
      
      if (!pedido) {
        throw new NotFoundException('Pedido nÃ£o encontrado');
      }

      if (pedido.status === 'Cancelado') {
        return;
      }

      const itens = await manager.find(ItemPedido, { where: { idPedido } });

      for (const item of itens) {
        const [estoque] = await manager.query(
          `SELECT quantidade_reservada FROM estoque WHERE id_produto = ? LIMIT 1`,
          [item.idProduto]
        );

        if (!estoque || estoque.quantidade_reservada < item.quantidade) {
          throw new Error(`InconsistÃªncia: Reserva atual Ã© menor que a quantidade a devolver para o produto ID ${item.idProduto}`);
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


