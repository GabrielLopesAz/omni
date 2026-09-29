import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegracaoMarketplace } from '../entities/integracao-marketplace.entity.js';

@Injectable()
export class MarketplaceSyncCron {
  private readonly logger = new Logger(MarketplaceSyncCron.name);

  constructor(
    @InjectRepository(IntegracaoMarketplace)
    private integracaoRepo: Repository<IntegracaoMarketplace>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.log('Iniciando sincronizacao de Marketplaces (Polling)...');
    
    // 1. Busca integracoes conectadas
    const integracoes = await this.integracaoRepo.find({ where: { status: 'CONECTADO' } });
    
    if (integracoes.length === 0) {
      this.logger.log('Nenhuma integracao conectada encontrada.');
      return;
    }

    this.logger.log(`Encontradas ${integracoes.length} integracoes conectadas.`);
    this.logger.log('Sincronizacao de pedidos real sera implementada no pacote P4.2.');
  }
}
