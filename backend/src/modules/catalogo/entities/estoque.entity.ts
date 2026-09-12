import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Produto } from './produto.entity.js';

@Entity('estoque')
export class Estoque {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_produto', unique: true })
  idProduto: string;

  @OneToOne(() => Produto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_produto' })
  produto: Produto;

  @Column({ type: 'int', default: 0, name: 'quantidade_disponivel' })
  quantidadeDisponivel: number;

  @Column({ type: 'int', default: 0, name: 'quantidade_reservada' })
  quantidadeReservada: number;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
