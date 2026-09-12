import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pedido } from '../../pedidos/entities/pedido.entity.js';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

@Entity('conferencias')
export class Conferencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_pedido', nullable: true })
  idPedido: string;

  @ManyToOne(() => Pedido, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;

  @Column({ name: 'id_usuario', nullable: true })
  idUsuario: string;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 50, default: 'Pendente' })
  status: string;

  @CreateDateColumn({ type: 'timestamp', name: 'data_conferencia' })
  dataConferencia: Date;
}
