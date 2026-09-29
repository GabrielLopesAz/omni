import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Empresa } from '../../empresas/entities/empresa.entity.js';

@Entity('integracoes_marketplace')
@Unique(['idEmpresa', 'provider', 'externalAccountId'])
export class IntegracaoMarketplace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_empresa' })
  idEmpresa: string;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_empresa' })
  empresa: Empresa;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'varchar', length: 100, name: 'external_account_id', nullable: true })
  externalAccountId: string;

  @Column({ type: 'varchar', length: 255, name: 'external_account_name', nullable: true })
  externalAccountName: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDENTE' })
  status: string;

  @Column({ type: 'text', name: 'access_token_encrypted', nullable: true })
  accessTokenEncrypted: string;

  @Column({ type: 'text', name: 'refresh_token_encrypted', nullable: true })
  refreshTokenEncrypted: string;

  @Column({ type: 'timestamp', name: 'token_expires_at', nullable: true })
  tokenExpiresAt: Date;

  @Column({ type: 'text', nullable: true })
  scopes: string;

  @Column({ type: 'timestamp', name: 'connected_at', nullable: true })
  connectedAt: Date;

  @Column({ type: 'timestamp', name: 'disconnected_at', nullable: true })
  disconnectedAt: Date;

  @Column({ type: 'timestamp', name: 'last_sync_at', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'timestamp', name: 'last_success_at', nullable: true })
  lastSuccessAt: Date;

  @Column({ type: 'timestamp', name: 'last_error_at', nullable: true })
  lastErrorAt: Date;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
