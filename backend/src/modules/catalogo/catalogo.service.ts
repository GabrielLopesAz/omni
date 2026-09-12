import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produto } from './entities/produto.entity.js';
import { Estoque } from './entities/estoque.entity.js';

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(Produto)
    private readonly produtoRepo: Repository<Produto>,
    @InjectRepository(Estoque)
    private readonly estoqueRepo: Repository<Estoque>,
  ) {}

  async findAll(idEmpresa?: string) {
    const produtos = await this.produtoRepo.find({
      where: idEmpresa ? { idEmpresa } : {},
      order: { createdAt: 'DESC' }
    });

    // Mapear os estoques correspondentes
    const estoques = await this.estoqueRepo.find({
      where: idEmpresa ? { produto: { idEmpresa } } : {}
    });
    const estoqueMap = new Map(estoques.map(e => [e.idProduto, e]));

    return produtos.map(p => ({
      ...p,
      estoque: estoqueMap.get(p.id) || { quantidadeDisponivel: 0, quantidadeReservada: 0 }
    }));
  }

  async findOne(id: string) {
    const produto = await this.produtoRepo.findOne({ where: { id } });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    const estoque = await this.estoqueRepo.findOne({ where: { idProduto: id } });
    return { ...produto, estoque: estoque || { quantidadeDisponivel: 0, quantidadeReservada: 0 } };
  }

  async create(createDto: any, idEmpresa?: string) {
    try {
      // Checagem manual de duplicidade (pois UNIQUE INDEX do MySQL ignora duplicações se idEmpresa for NULL)
      const existing = await this.produtoRepo.findOne({
        where: idEmpresa ? { sku: createDto.sku, idEmpresa } : { sku: createDto.sku }
      });
      if (existing) {
        throw new BadRequestException('SKU já cadastrado no seu catálogo.');
      }

      const produto = this.produtoRepo.create({
        ...createDto,
        idEmpresa
      });
      const saved = (await this.produtoRepo.save(produto)) as any;
      
      const estoque = this.estoqueRepo.create({
        idProduto: saved.id,
        quantidadeDisponivel: createDto.estoqueInicial || 0,
        quantidadeReservada: 0
      });
      await this.estoqueRepo.save(estoque);

      return { ...saved, estoque };
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505' || error.errno === 1062) {
        throw new BadRequestException('SKU já cadastrado.');
      }
      throw error;
    }
  }

  async update(id: string, updateDto: any) {
    const produto = await this.produtoRepo.findOne({ where: { id } });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    
    // Atualizar apenas os campos passados
    Object.assign(produto, updateDto);
    return this.produtoRepo.save(produto);
  }

  async remove(id: string) {
    const produto = await this.produtoRepo.findOne({ where: { id } });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    
    await this.produtoRepo.remove(produto);
    return { success: true, message: 'Produto removido com sucesso' };
  }

  async ajustarEstoque(idProduto: string, quantidade: number, tipo: 'ENTRADA' | 'SAIDA') {
    const estoque = await this.estoqueRepo.findOne({ where: { idProduto } });
    if (!estoque) throw new NotFoundException('Registro de estoque não encontrado para este produto');

    if (tipo === 'ENTRADA') {
      estoque.quantidadeDisponivel += quantidade;
    } else if (tipo === 'SAIDA') {
      if (estoque.quantidadeDisponivel < quantidade) {
        throw new BadRequestException('Estoque insuficiente para esta saída.');
      }
      estoque.quantidadeDisponivel -= quantidade;
    } else {
      throw new BadRequestException('Tipo de movimentação inválido (use ENTRADA ou SAIDA)');
    }

    return this.estoqueRepo.save(estoque);
  }
}
