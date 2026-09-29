import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { IntegracaoMarketplace } from './entities/integracao-marketplace.entity.js';
import { OAuthStateService } from './oauth-state.service.js';
import { MarketplaceAdapterRegistry } from './adapters/adapter.registry.js';
import { IntegrationCredentialsCryptoService } from './crypto/integration-crypto.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';

@Injectable()
export class IntegracoesService {
  constructor(
    @InjectRepository(IntegracaoMarketplace)
    private integracaoRepo: Repository<IntegracaoMarketplace>,
    private oauthStateService: OAuthStateService,
    private adapterRegistry: MarketplaceAdapterRegistry,
    private cryptoService: IntegrationCredentialsCryptoService,
    private auditoriaService: AuditoriaService,
    private dataSource: DataSource,
  ) {}

  async connect(provider: string, idEmpresa: string, idUsuario: string): Promise<{ authorizationUrl: string }> {
    const adapter = this.adapterRegistry.getAdapter(provider);
    
    // Generate secure state
    const state = await this.oauthStateService.generateState(provider, idEmpresa, idUsuario);
    
    const authorizationUrl = await adapter.getAuthorizationUrl({
      idEmpresa,
      idUsuario,
      state,
      provider,
    });

    await this.auditoriaService.logAction(
      'INTEGRACAO_CONNECT_INICIADA',
      idUsuario,
      '', // IP omitido no service por simplicidade, no controller temos o IP
      'integracoes_marketplace',
      null,
      { provider }
    );

    return { authorizationUrl };
  }

  async callback(provider: string, code: string, rawState: string, ip: string): Promise<void> {
    const adapter = this.adapterRegistry.getAdapter(provider);
    
    // Validar e consumir state. Isso garante 1-time use e isolamento de tenant.
    const stateObj = await this.oauthStateService.validateAndConsumeState(rawState, provider);
    
    // Troca de token via Adapter
    const credentials = await adapter.exchangeAuthorizationCode(code, {
      idEmpresa: stateObj.idEmpresa,
      idUsuario: stateObj.idUsuario,
      state: rawState,
      provider,
    });

    // Transacao para persistir as credenciais e auditoria
    await this.dataSource.transaction(async (manager) => {
      // Procurar se ja existe pelo unique key: empresa + provider + account_id
      let integracao = await manager.findOne(IntegracaoMarketplace, {
        where: {
          idEmpresa: stateObj.idEmpresa,
          provider: provider.toUpperCase(),
          externalAccountId: credentials.externalAccountId ? credentials.externalAccountId : IsNull(),
        }
      });

      const isNew = !integracao;

      if (!integracao) {
        integracao = manager.create(IntegracaoMarketplace, {
          idEmpresa: stateObj.idEmpresa,
          provider: provider.toUpperCase(),
          nome: provider.toUpperCase(),
          externalAccountId: credentials.externalAccountId,
          externalAccountName: credentials.externalAccountName,
        });
      }

      integracao.status = 'CONECTADO';
      integracao.accessTokenEncrypted = this.cryptoService.encrypt(credentials.accessToken);
      integracao.refreshTokenEncrypted = credentials.refreshToken ? this.cryptoService.encrypt(credentials.refreshToken) : null;
      integracao.tokenExpiresAt = credentials.expiresIn ? new Date(Date.now() + credentials.expiresIn * 1000) : null;
      integracao.scopes = credentials.scopes ? credentials.scopes.join(',') : null;
      integracao.connectedAt = new Date();
      integracao.disconnectedAt = null;

      await manager.save(IntegracaoMarketplace, integracao);

      await this.auditoriaService.logAction(
        isNew ? 'INTEGRACAO_CONECTADA' : 'INTEGRACAO_REAUTORIZADA',
        stateObj.idUsuario,
        ip,
        'integracoes_marketplace',
        isNew ? null : { status: 'PENDENTE' },
        { status: 'CONECTADO', provider, externalAccountId: credentials.externalAccountId },
        manager
      );
    });
  }

  async disconnect(id: string, idEmpresa: string, idUsuario: string, ip: string): Promise<void> {
    const integracao = await this.integracaoRepo.findOne({ where: { id, idEmpresa } });
    if (!integracao) {
      throw new NotFoundException('Integracao nao encontrada');
    }

    if (integracao.status === 'DESCONECTADO') {
      throw new BadRequestException('Integracao ja esta desconectada');
    }

    try {
      const adapter = this.adapterRegistry.getAdapter(integracao.provider);
      if (adapter.revokeAuthorization) {
        await adapter.revokeAuthorization({
          accessToken: 'REVOKED', // O adapter resolveria isso.
        });
      }
    } catch (e) {
      // Ignorar falha no revoke remoto para garantir q vamos limpar os tokens locais
    }

    const previousStatus = integracao.status;

    integracao.status = 'DESCONECTADO';
    integracao.accessTokenEncrypted = null;
    integracao.refreshTokenEncrypted = null;
    integracao.tokenExpiresAt = null;
    integracao.disconnectedAt = new Date();

    await this.integracaoRepo.save(integracao);

    await this.auditoriaService.logAction(
      'INTEGRACAO_DESCONECTADA',
      idUsuario,
      ip,
      'integracoes_marketplace',
      { status: previousStatus },
      { status: 'DESCONECTADO', provider: integracao.provider },
    );
  }

  async listar(idEmpresa: string) {
    const integracoes = await this.integracaoRepo.find({
      where: { idEmpresa },
      select: {
        id: true, provider: true, nome: true, externalAccountId: true, externalAccountName: true,
        status: true, connectedAt: true, disconnectedAt: true, lastSyncAt: true, lastSuccessAt: true,
        lastErrorAt: true, lastError: true, tokenExpiresAt: true
      }
    });
    
    return integracoes.map(i => ({
      ...i,
      health: this.calculateHealth(i)
    }));
  }

  private calculateHealth(i: Partial<IntegracaoMarketplace>) {
    if (i.status === 'DESCONECTADO') return 'DESCONECTADO';
    if (i.status === 'ERRO') return 'ERRO';
    if (i.tokenExpiresAt && i.tokenExpiresAt < new Date()) return 'ATENCAO'; // Token expirado e talvez exija refresh (q falhou)
    return 'OK';
  }
}
