import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, VersionColumn, Unique } from 'typeorm';
import { Empresa } from '../../empresas/entities/empresa.entity.js';
import { IntegracaoMarketplace } from '../../integracoes/entities/integracao-marketplace.entity.js';

@Entity('pedidos')
@Unique('UQ_integracao_pedido_marketplace', ['idIntegracao', 'idPedidoMarketplace'])
export class Pedido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_empresa', nullable: true })
  idEmpresa: string;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_empresa' })
  empresa: Empresa;

  @Column({ name: 'id_integracao', nullable: true })
  idIntegracao: string;

  @ManyToOne(() => IntegracaoMarketplace, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_integracao' })
  integracao: IntegracaoMarketplace;

  @Column({ type: 'varchar', length: 100, name: 'id_pedido_marketplace', nullable: true })
  @Index()
  idPedidoMarketplace: string;

  @Column({ type: 'varchar', length: 255, name: 'cliente_nome', nullable: true })
  clienteNome: string;

  @Column({ type: 'varchar', length: 50, default: 'Pendente' })
  @Index()
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'data_pedido' })
  dataPedido: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, name: 'valor_total' })
  valorTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, name: 'taxas_marketplace' })
  taxasMarketplace: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transportadora: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  rastreio: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @VersionColumn()
  versao: number;
}
