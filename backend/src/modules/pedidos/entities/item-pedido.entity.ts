import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pedido } from './pedido.entity.js';
import { Produto } from '../../catalogo/entities/produto.entity.js';

@Entity('itens_pedido')
export class ItemPedido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_pedido', nullable: true })
  idPedido: string;

  @ManyToOne(() => Pedido, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;

  @Column({ name: 'id_produto', nullable: true })
  idProduto: string;

  @ManyToOne(() => Produto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_produto' })
  produto: Produto;

  @Column({ type: 'int', default: 1 })
  quantidade: number;

  @Column({ type: 'int', default: 0, name: 'quantidade_bipada' })
  quantidadeBipada: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, name: 'preco_unitario' })
  precoUnitario: number;
}
