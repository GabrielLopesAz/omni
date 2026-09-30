import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationCredentialsCryptoService } from './integration-crypto.service.js';
import { ConfigService } from '@nestjs/config';

describe('IntegrationCredentialsCryptoService', () => {
  let service: IntegrationCredentialsCryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationCredentialsCryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI='),
          },
        },
      ],
    }).compile();

    service = module.get<IntegrationCredentialsCryptoService>(IntegrationCredentialsCryptoService);
  });

  it('deve criptografar e descriptografar corretamente', () => {
    const text = 'my-secret-token';
    const encrypted = service.encrypt(text);
    expect(encrypted).not.toBe(text);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(text);
  });

  it('deve gerar ciphertexts unicos para o mesmo plaintext (IV aleatorio)', () => {
    const text = 'same-text';
    const encrypted1 = service.encrypt(text);
    const encrypted2 = service.encrypt(text);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('deve falhar ao descriptografar texto alterado (tampered ciphertext)', () => {
    const text = 'secret-data';
    let encrypted = service.encrypt(text);
    
    // Corrompe o hex
    const corrupted = encrypted.substring(0, encrypted.length - 2) + 'ff';
    expect(() => service.decrypt(corrupted)).toThrow();
  });
});

