import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Empresa } from '../../empresas/entities/empresa.entity.js';

@Entity('integracoes_marketplace')
export class IntegracaoMarketplace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_empresa', nullable: true })
  idEmpresa: string;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_empresa' })
  empresa: Empresa;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'varchar', length: 50, default: 'warning' })
  status: string;

  @Column({ type: 'timestamp', name: 'ultima_sincronizacao', nullable: true })
  ultimaSincronizacao: Date;

  @Column({ type: 'json', nullable: true })
  credenciais: any; // Armazenará string criptografada pelo CryptoService

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
