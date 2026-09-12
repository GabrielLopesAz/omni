import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto/crypto.service.js';

@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class SharedModule {}
