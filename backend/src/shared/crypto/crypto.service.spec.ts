import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service.js';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('deve criptografar e descriptografar corretamente uma credencial (AES-256-GCM)', () => {
    const secret = JSON.stringify({ token: 'abc-123', apiKey: 'xyz-987' });
    
    const encrypted = service.encrypt(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:encrypted

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('deve falhar ao descriptografar dado adulterado (AuthTag mismatch)', () => {
    const secret = 'dado-super-secreto';
    let encrypted = service.encrypt(secret);
    
    // Adulterando o payload
    const parts = encrypted.split(':');
    parts[2] = parts[2].substring(0, parts[2].length - 1) + '0'; // modifica último caractere
    const adulterated = parts.join(':');

    expect(() => service.decrypt(adulterated)).toThrow();
  });
});
