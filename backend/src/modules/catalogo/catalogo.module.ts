import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoController } from './catalogo.controller.js';
import { CatalogoService } from './catalogo.service.js';
import { Produto } from './entities/produto.entity.js';
import { Estoque } from './entities/estoque.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Produto, Estoque])],
  controllers: [CatalogoController],
  providers: [CatalogoService],
  exports: [CatalogoService],
})
export class CatalogoModule {}
