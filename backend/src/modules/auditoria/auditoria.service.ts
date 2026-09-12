import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaLog } from './entities/auditoria-log.entity.js';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(AuditoriaLog)
    private readonly logRepository: Repository<AuditoriaLog>,
  ) {}

  async logAction(
    acao: string,
    idUsuario: string,
    ipAddress?: string,
    tabelaAfetada?: string,
    dadosAntigos?: any,
    dadosNovos?: any,
  ) {
    const log = this.logRepository.create({
      acao,
      idUsuario,
      ipAddress,
      tabelaAfetada,
      dadosAntigos,
      dadosNovos,
    });
    return this.logRepository.save(log);
  }
}
