import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OAuthState } from './entities/oauth-state.entity.js';
import * as crypto from 'crypto';

@Injectable()
export class OAuthStateService {
  constructor(
    @InjectRepository(OAuthState)
    private oauthStateRepo: Repository<OAuthState>,
  ) {}

  async generateState(provider: string, idEmpresa: string, idUsuario: string): Promise<string> {
    const rawState = crypto.randomBytes(32).toString('hex');
    
    // Hash state on DB if we want, but since it's 1-time and we just need it for a redirect,
    // storing the secure random string itself is acceptable given it has high entropy.
    // The requirement says "Preferencialmente guardar hash do state", so we can do that.
    const hashedState = crypto.createHash('sha256').update(rawState).digest('hex');

    const stateObj = this.oauthStateRepo.create({
      state: hashedState,
      provider: provider.toUpperCase(),
      idEmpresa,
      idUsuario,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    });

    await this.oauthStateRepo.save(stateObj);

    // Return the rawState to the user, they will use it.
    // Wait, the callback will return the rawState, so we must hash it again to verify.
    return rawState;
  }

  async validateAndConsumeState(rawState: string, provider: string): Promise<OAuthState> {
    if (!rawState) throw new BadRequestException('State is required');
    
    const hashedState = crypto.createHash('sha256').update(rawState).digest('hex');

    const stateObj = await this.oauthStateRepo.findOne({ where: { state: hashedState } });
    if (!stateObj) {
      throw new BadRequestException('State invalido ou inexistente');
    }

    if (stateObj.usedAt) {
      throw new BadRequestException('State ja utilizado (Replay attack)');
    }

    if (stateObj.expiresAt < new Date()) {
      throw new BadRequestException('State expirado');
    }

    if (stateObj.provider !== provider.toUpperCase()) {
      throw new BadRequestException('Provider divergente no state');
    }

    // Marca como usado atomicamente
    const updateResult = await this.oauthStateRepo.query(
      `UPDATE oauth_states SET used_at = ? WHERE state = ? AND used_at IS NULL`,
      [new Date(), hashedState]
    );

    if (updateResult.affectedRows === 0) {
      throw new BadRequestException('State ja utilizado (Replay attack)');
    }

    // stateObj already has the original data to return (idEmpresa, idUsuario, etc)
    return stateObj;
  }
}
