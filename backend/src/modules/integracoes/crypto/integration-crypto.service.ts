import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationCredentialsCryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const keyString = this.configService.get<string>('INTEGRATION_ENCRYPTION_KEY');
    if (!keyString) {
      throw new InternalServerErrorException('INTEGRATION_ENCRYPTION_KEY nao configurada no ambiente.');
    }
    
    this.key = Buffer.from(keyString, 'base64');
    if (this.key.length !== 32) {
      throw new InternalServerErrorException('INTEGRATION_ENCRYPTION_KEY deve ter exatamente 32 bytes decodificados.');
    }
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    
    return `${iv.toString('base64')}:${encrypted}:${authTag}`;
  }

  decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) throw new Error('Formato invalido');
      
      const iv = Buffer.from(parts[0], 'base64');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'base64');
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException('Falha ao descriptografar credenciais da integracao.');
    }
  }
}
