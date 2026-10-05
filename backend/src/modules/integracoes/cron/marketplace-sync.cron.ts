import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegracaoMarketplace } from '../entities/integracao-marketplace.entity.js';
import { MarketplaceSyncService } from '../sync/marketplace-sync.service.js';

@Injectable()
export class MarketplaceSyncCron {
  private readonly logger = new Logger(MarketplaceSyncCron.name);

  constructor(
    @InjectRepository(IntegracaoMarketplace)
    private readonly integracaoRepo: Repository<IntegracaoMarketplace>,
    private readonly syncService: MarketplaceSyncService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE) // Ou EVERY_5_MINUTES, EVERY_MINUTE no dev
  async handleCron() {
    this.logger.debug('Iniciando cron de sincronizacao de Marketplaces...');
    
    // Busca integracoes conectadas ativas
    const integracoes = await this.integracaoRepo.find({ where: { status: 'CONECTADO' } });
    
    if (integracoes.length === 0) {
      return;
    }

    // Dispara em paralelo, mas o Set interno do MarketplaceSyncService previne sobreposicoes na mesma integracao
    await Promise.allSettled(
      integracoes.map(i => this.syncService.syncIntegration(i.id, i.idEmpresa))
    );
  }
}
