import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ItemPedido } from '../pedidos/entities/item-pedido.entity.js';
import { Conferencia } from './entities/conferencia.entity.js';
import { Estoque } from '../catalogo/entities/estoque.entity.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';

@Injectable()
export class LogisticaService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(ItemPedido)
    private readonly itemRepo: Repository<ItemPedido>,
    @InjectRepository(Conferencia)
    private readonly conferenciaRepo: Repository<Conferencia>,
    private readonly auditoriaService: AuditoriaService,
    private dataSource: DataSource,
  ) {}

  async getPedidoParaConferencia(idPedido: string, idEmpresa: string) {
    const pedido = await this.pedidoRepo.findOne({ where: { id: idPedido, idEmpresa } });
    if (!pedido) throw new NotFoundException('Pedido não encontrado ou não pertence à empresa');
    if (pedido.status === 'Cancelado') throw new BadRequestException('Pedido cancelado não pode ser conferido');

    const itens = await this.itemRepo.find({
      where: { idPedido },
      relations: { produto: true },
    });

    return {
      id: pedido.id,
      status: pedido.status,
      clienteNome: pedido.clienteNome,
      idEmpresa: pedido.idEmpresa,
      itens: itens.map(i => ({
        id: i.id,
        idProduto: i.idProduto,
        sku: i.produto?.sku ?? '',
        nomeProduto: i.produto?.nome ?? '',
        imagemUrl: i.produto?.imagemUrl ?? null,
        quantidade: i.quantidade,
        quantidadeBipada: i.quantidadeBipada,
      })),
    };
  }

  async biparItem(idPedido: string, sku: string, idUsuario: string, ip: string, idEmpresa: string) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Lock no pedido para serializar bipagens
      const pedido = await manager.findOne(Pedido, {
        where: { id: idPedido, idEmpresa },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pedido) throw new NotFoundException('Pedido não encontrado ou não pertence à empresa');
      if (pedido.status === 'Cancelado') throw new BadRequestException('Pedido cancelado não pode ser bipado');
      if (pedido.status === 'Conferido') throw new BadRequestException('Pedido já foi totalmente conferido');
      if (pedido.status === 'Despachado') throw new BadRequestException('Pedido já foi despachado');

      // 2. Lock nos itens
      const itens = await manager.find(ItemPedido, {
        where: { idPedido },
        relations: { produto: true },
        lock: { mode: 'pessimistic_write' },
      });

      const itemAlvo = itens.find(i => i.produto?.sku === sku);
      if (!itemAlvo) {
        await this.auditoriaService.logAction('BIPAGEM_ERRO_SKU_INVALIDO', idUsuario, ip, 'itens_pedido', null, { sku });
        throw new BadRequestException(`Produto não pertence a este pedido.`);
      }

      if (itemAlvo.quantidadeBipada >= itemAlvo.quantidade) {
        await this.auditoriaService.logAction('BIPAGEM_ERRO_QTD_EXCEDIDA', idUsuario, ip, 'itens_pedido', null, { sku });
        throw new BadRequestException('Quantidade excedida: item já foi totalmente bipado.');
      }

      // 3. UPDATE atômico condicional para evitar lost update
      const updateResult = await manager.query(
        `UPDATE itens_pedido SET quantidade_bipada = quantidade_bipada + 1 WHERE id = ? AND quantidade_bipada < quantidade`,
        [itemAlvo.id]
      );
      if (updateResult.affectedRows === 0) {
        throw new BadRequestException('Bipagem rejeitada: item já foi completado por outra operação simultânea.');
      }

      // 4. Re-read para verificar estado atual
      const itensFrescos = await manager.find(ItemPedido, { where: { idPedido } });
      const todosBipados = itensFrescos.every(i => {
        const qtdAtual = i.id === itemAlvo.id ? itemAlvo.quantidadeBipada + 1 : i.quantidadeBipada;
        return qtdAtual === i.quantidade;
      });

      // 5. Transição de status
      if (pedido.status === 'Pendente') pedido.status = 'EM_SEPARACAO';
      if (todosBipados) pedido.status = 'Conferido';

      await manager.save(Pedido, pedido);

      // 6. Auditoria
      await this.auditoriaService.logAction(
        'BIPAGEM_SUCESSO', idUsuario, ip, 'itens_pedido',
        { sku, quantidadeBipada: itemAlvo.quantidadeBipada },
        { sku, quantidadeBipada: itemAlvo.quantidadeBipada + 1, pedidoStatus: pedido.status },
        manager
      );

      return {
        message: todosBipados ? 'Pedido totalmente conferido' : 'Bipagem registrada com sucesso',
        sku,
        quantidadeBipada: itemAlvo.quantidadeBipada + 1,
        quantidadePedida: itemAlvo.quantidade,
        pedidoStatus: pedido.status,
      };
    });
  }

  async expedir(idPedido: string, idEmpresa: string, idUsuario: string, ip: string) {
    return await this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, {
        where: { id: idPedido, idEmpresa },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pedido) throw new NotFoundException('Pedido não encontrado ou não pertence à empresa');

      // Idempotência
      if (pedido.status === 'Despachado') {
        return { message: 'Pedido já foi despachado anteriormente', status: 'Despachado' };
      }

      if (pedido.status !== 'Conferido') {
        throw new BadRequestException(`Pedido não pode ser expedido. Status atual: ${pedido.status}. Necessário: Conferido`);
      }

      const itens = await manager.find(ItemPedido, {
        where: { idPedido },
        lock: { mode: 'pessimistic_write' },
      });

      // Validação extra: todos conferidos
      const incompleto = itens.find(i => i.quantidadeBipada !== i.quantidade);
      if (incompleto) {
        throw new BadRequestException('Há itens não conferidos. Conferência deve ser completa antes da expedição.');
      }

      // Baixar quantidade_reservada atomicamente por item
      for (const item of itens) {
        const result = await manager.query(
          `UPDATE estoque SET quantidade_reservada = quantidade_reservada - ? WHERE id_produto = ? AND quantidade_reservada >= ?`,
          [item.quantidade, item.idProduto, item.quantidade]
        );
        if (result.affectedRows === 0) {
          throw new BadRequestException(`Estoque reservado insuficiente para produto ${item.idProduto}`);
        }
      }

      pedido.status = 'Despachado';
      await manager.save(Pedido, pedido);

      await this.auditoriaService.logAction(
        'EXPEDICAO',
        idUsuario, ip, 'pedidos',
        { status: 'Conferido' },
        { status: 'Despachado', itenExpedidos: itens.length },
        manager
      );

      return { message: 'Pedido expedido com sucesso', status: 'Despachado' };
    });
  }
}
