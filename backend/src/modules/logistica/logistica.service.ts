import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Pedido } from '../pedidos/entities/pedido.entity.js';
import { ItemPedido } from '../pedidos/entities/item-pedido.entity.js';
import { Conferencia } from './entities/conferencia.entity.js';
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

  async biparItem(idPedido: string, sku: string, idUsuario: string, ip: string) {
    // Busca o pedido fora da transação para o optimistic lock inicial
    const pedido = await this.pedidoRepo.findOne({
      where: { id: idPedido },
    });

    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    if (pedido.status !== 'Pendente' && pedido.status !== 'EM_SEPARACAO') {
      throw new BadRequestException('Pedido não está pendente para conferência');
    }

    return await this.dataSource.transaction(async (manager) => {
      // Busca itens dentro da transação para garantir dados frescos
      const itens = await manager.find(ItemPedido, {
        where: { idPedido },
        relations: { produto: true },
      });

      const itemAlvo = itens.find(i => i.produto?.sku === sku);
      if (!itemAlvo) {
        await this.auditoriaService.logAction('BIPAGEM_ERRO_SKU_INVALIDO', idUsuario, ip, 'itens_pedido', null, { sku });
        throw new BadRequestException(`SKU ${sku} não pertence a este pedido`);
      }

      if (itemAlvo.quantidadeBipada >= itemAlvo.quantidade) {
        await this.auditoriaService.logAction('BIPAGEM_ERRO_QTD_EXCEDIDA', idUsuario, ip, 'itens_pedido', null, { sku });
        throw new BadRequestException('Quantidade Excedida');
      }

      // Incrementa a quantidade bipada
      itemAlvo.quantidadeBipada += 1;
      await manager.save(ItemPedido, itemAlvo);

      // Se o pedido estava pendente, atualiza para EM_SEPARACAO. 
      // O TypeORM verificará a versao via optimistic lock no manager.save.
      if (pedido.status === 'Pendente') {
        pedido.status = 'EM_SEPARACAO';
      }
      
      // Checa se finalizou o pedido todo (todos os itens foram totalmente bipados)
      const todosBipados = itens.every(i => 
        (i.id === itemAlvo.id ? itemAlvo.quantidadeBipada : i.quantidadeBipada) === i.quantidade
      );
      
      if (todosBipados) {
        pedido.status = 'Conferido';
      }

      // Salva o pedido usando Optimistic Locking automático do TypeORM
      try {
        await manager.save(Pedido, pedido);
      } catch (err: any) {
        // OptimisticLockVersionMismatchError
        if (err.name === 'OptimisticLockVersionMismatchError') {
          throw new ConflictException('Concorrência detectada: Outro operador modificou este pedido.');
        }
        throw err;
      }

      await this.auditoriaService.logAction('BIPAGEM_SUCESSO', idUsuario, ip, 'itens_pedido', null, { sku });
      
      return { 
        message: todosBipados ? 'Pedido totalmente conferido com sucesso' : 'Bipagem registrada com sucesso', 
        sku, 
        quantidade_restante: itemAlvo.quantidade - itemAlvo.quantidadeBipada,
        pedido_status: pedido.status
      };
    });
  }
}

