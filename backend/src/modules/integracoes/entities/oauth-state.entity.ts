import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Empresa } from '../../empresas/entities/empresa.entity.js';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

@Entity('oauth_states')
export class OAuthState {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  state: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ name: 'id_empresa' })
  idEmpresa: string;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_empresa' })
  empresa: Empresa;

  @Column({ name: 'id_usuario' })
  idUsuario: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', name: 'used_at', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
