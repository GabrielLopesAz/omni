import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

@Entity('auditoria_logs')
export class AuditoriaLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_usuario', nullable: true })
  idUsuario: string;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 100 })
  acao: string;

  @Column({ type: 'varchar', length: 50, name: 'tabela_afetada', nullable: true })
  tabelaAfetada: string;

  @Column({ type: 'json', name: 'dados_antigos', nullable: true })
  dadosAntigos: any;

  @Column({ type: 'json', name: 'dados_novos', nullable: true })
  dadosNovos: any;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
