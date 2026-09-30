import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { IntegracaoMarketplace } from './entities/integracao-marketplace.entity.js';
import { OAuthStateService } from './oauth-state.service.js';
import { MarketplaceAdapterRegistry } from './adapters/adapter.registry.js';
import { IntegrationCredentialsCryptoService } from './crypto/integration-crypto.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { MarketplaceCredentials } from './adapters/marketplace-adapter.interface.js';

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
      '',
      'integracoes_marketplace',
      null,
      { provider }
    );

    return { authorizationUrl };
  }

  async callback(provider: string, code: string, rawState: string, ip: string): Promise<void> {
    const adapter = this.adapterRegistry.getAdapter(provider);
    
    // Validar e consumir state.
    const stateObj = await this.oauthStateService.validateAndConsumeState(rawState, provider);
    
    // Troca de token via Adapter
    const credentials = await adapter.exchangeAuthorizationCode(code, {
      idEmpresa: stateObj.idEmpresa,
      idUsuario: stateObj.idUsuario,
      state: rawState,
      provider,
    });

    await this.dataSource.transaction(async (manager) => {
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
      integracao.lastError = null;

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

    const previousStatus = integracao.status;

    // Tentar revogar token real
    let revokeError: string | null = null;
    if (integracao.accessTokenEncrypted) {
      try {
        const accessToken = this.cryptoService.decrypt(integracao.accessTokenEncrypted);
        const refreshToken = integracao.refreshTokenEncrypted ? this.cryptoService.decrypt(integracao.refreshTokenEncrypted) : undefined;
        const adapter = this.adapterRegistry.getAdapter(integracao.provider);
        
        if (adapter.revokeAuthorization) {
          await adapter.revokeAuthorization({ accessToken, refreshToken });
        }
      } catch (e: any) {
        revokeError = e.message || 'Falha desconhecida ao revogar no provider';
      }
    }

    integracao.status = 'DESCONECTADO';
    integracao.accessTokenEncrypted = null;
    integracao.refreshTokenEncrypted = null;
    integracao.tokenExpiresAt = null;
    integracao.disconnectedAt = new Date();
    if (revokeError) {
      integracao.lastError = 'Aviso no Revoke: ' + revokeError;
    }

    await this.integracaoRepo.save(integracao);

    await this.auditoriaService.logAction(
      'INTEGRACAO_DESCONECTADA',
      idUsuario,
      ip,
      'integracoes_marketplace',
      { status: previousStatus },
      { status: 'DESCONECTADO', provider: integracao.provider, revokeError },
    );
  }

  async getValidCredentials(id: string, idEmpresa: string): Promise<MarketplaceCredentials> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Pessimistic lock para evitar multiplos refreshes concorrentes na mesma integracao
      const integracao = await manager.findOne(IntegracaoMarketplace, {
        where: { id, idEmpresa },
        lock: { mode: 'pessimistic_write' },
      });

      if (!integracao) throw new NotFoundException('Integração não encontrada');
      if (integracao.status === 'DESCONECTADO' || !integracao.accessTokenEncrypted) {
        throw new BadRequestException('Integração desconectada ou sem credenciais');
      }

      const now = new Date();
      const expiresAt = integracao.tokenExpiresAt;
      
      // Se falta menos de 5 min para expirar, considera como precisa de refresh
      const isExpiring = expiresAt ? (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) : false;

      const currentAccessToken = this.cryptoService.decrypt(integracao.accessTokenEncrypted);
      const currentRefreshToken = integracao.refreshTokenEncrypted ? this.cryptoService.decrypt(integracao.refreshTokenEncrypted) : undefined;

      if (!isExpiring) {
        return {
          accessToken: currentAccessToken,
          refreshToken: currentRefreshToken,
          externalAccountId: integracao.externalAccountId || undefined
        };
      }

      // Necessario renovar
      if (!currentRefreshToken) {
        integracao.status = 'ERRO';
        integracao.lastError = 'Token expirado e sem refresh_token disponivel';
        await manager.save(IntegracaoMarketplace, integracao);
        throw new BadRequestException('Integração expirou permanentemente');
      }

      const adapter = this.adapterRegistry.getAdapter(integracao.provider);
      let newCreds: MarketplaceCredentials;
      try {
        newCreds = await adapter.refreshAccessToken({
          accessToken: currentAccessToken,
          refreshToken: currentRefreshToken,
        });
      } catch (e: any) {
        integracao.status = 'ERRO';
        integracao.lastError = 'Falha ao renovar token: ' + (e.message || 'Erro desconhecido');
        await manager.save(IntegracaoMarketplace, integracao);
        throw new InternalServerErrorException('Falha no refresh token no marketplace');
      }

      // Salva novas credenciais
      integracao.accessTokenEncrypted = this.cryptoService.encrypt(newCreds.accessToken);
      if (newCreds.refreshToken) {
        integracao.refreshTokenEncrypted = this.cryptoService.encrypt(newCreds.refreshToken);
      }
      if (newCreds.expiresIn) {
        integracao.tokenExpiresAt = new Date(Date.now() + newCreds.expiresIn * 1000);
      }
      integracao.lastError = null;

      await manager.save(IntegracaoMarketplace, integracao);

      await this.auditoriaService.logAction(
        'TOKEN_REFRESH',
        null as any, // ID_USUARIO
        '127.0.0.1', 
        'integracoes_marketplace',
        null,
        { provider: integracao.provider, id_integracao: integracao.id },
        manager
      );

      return {
        accessToken: newCreds.accessToken,
        refreshToken: newCreds.refreshToken || currentRefreshToken,
        externalAccountId: integracao.externalAccountId || undefined
      };
    });
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
    if (i.tokenExpiresAt && i.tokenExpiresAt < new Date()) return 'ATENCAO'; 
    return 'OK';
  }
}
