import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaLog } from './entities/auditoria-log.entity.js';
import { AuditoriaService } from './auditoria.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaLog])],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
