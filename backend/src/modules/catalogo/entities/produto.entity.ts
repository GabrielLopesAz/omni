import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Empresa } from '../../empresas/entities/empresa.entity.js';

@Entity('produtos')
@Index('uk_produto_empresa_sku', ['idEmpresa', 'sku'], { unique: true })
export class Produto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_empresa', nullable: true })
  idEmpresa: string;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_empresa' })
  empresa: Empresa;

  @Column({ type: 'varchar', length: 100 })
  sku: string;

  @Column({ type: 'varchar', length: 255 })
  nome: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, name: 'preco_base' })
  precoBase: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, name: 'custo_unitario' })
  custoUnitario: number;

  @Column({ type: 'text', name: 'imagem_url', nullable: true })
  imagemUrl: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
