import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Produto } from './entities/produto.entity.js';
import { Estoque } from './entities/estoque.entity.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { CreateProdutoDto, UpdateProdutoDto } from './dto/catalogo.dto.js';

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(Produto)
    private readonly produtoRepo: Repository<Produto>,
    @InjectRepository(Estoque)
    private readonly estoqueRepo: Repository<Estoque>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(idEmpresa: string) {
    const produtos = await this.produtoRepo.find({
      where: { idEmpresa },
      order: { createdAt: 'DESC' }
    });

    const estoques = await this.estoqueRepo.find({
      where: { produto: { idEmpresa } }
    });
    const estoqueMap = new Map(estoques.map(e => [e.idProduto, e]));

    return produtos.map(p => ({
      ...p,
      estoque: estoqueMap.get(p.id) || { quantidadeDisponivel: 0, quantidadeReservada: 0 }
    }));
  }

  async findOne(id: string, idEmpresa: string) {
    const produto = await this.produtoRepo.findOne({ where: { id, idEmpresa } });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    const estoque = await this.estoqueRepo.findOne({ where: { idProduto: id } });
    return { ...produto, estoque: estoque || { quantidadeDisponivel: 0, quantidadeReservada: 0 } };
  }

  async create(createDto: CreateProdutoDto, idEmpresa: string) {
    return this.entityManager.transaction(async (manager) => {
      const existing = await manager.findOne(Produto, {
        where: { sku: createDto.sku, idEmpresa }
      });
      if (existing) {
        throw new BadRequestException('SKU já cadastrado no seu catálogo.');
      }

      const produto = manager.create(Produto, {
        sku: createDto.sku,
        nome: createDto.nome,
        categoria: createDto.categoria,
        precoBase: createDto.precoBase,
        custoUnitario: createDto.custoUnitario || 0,
        imagemUrl: createDto.imagemUrl,
        idEmpresa
      });
      
      let savedProduto;
      try {
        savedProduto = await manager.save(produto);
      } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY' || error.code === '23505' || error.errno === 1062) {
          throw new BadRequestException('SKU já cadastrado no seu catálogo.');
        }
        throw error;
      }
      
      const estoque = manager.create(Estoque, {
        idProduto: savedProduto.id,
        quantidadeDisponivel: createDto.estoqueInicial || 0,
        quantidadeReservada: 0
      });
      await manager.save(estoque);

      return { ...savedProduto, estoque };
    });
  }

  async update(id: string, updateDto: UpdateProdutoDto, idEmpresa: string) {
    const produto = await this.produtoRepo.findOne({ where: { id, idEmpresa } });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    
    // Atualiza apenas campos permitidos
    if (updateDto.nome !== undefined) produto.nome = updateDto.nome;
    if (updateDto.categoria !== undefined) produto.categoria = updateDto.categoria;
    if (updateDto.precoBase !== undefined) produto.precoBase = updateDto.precoBase;
    if (updateDto.custoUnitario !== undefined) produto.custoUnitario = updateDto.custoUnitario;
    if (updateDto.imagemUrl !== undefined) produto.imagemUrl = updateDto.imagemUrl;

    return this.produtoRepo.save(produto);
  }

  async remove(id: string, idEmpresa: string) {
    const produto = await this.produtoRepo.findOne({ where: { id, idEmpresa } });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    
    try {
      await this.produtoRepo.remove(produto);
      return { success: true, message: 'Produto removido com sucesso' };
    } catch (error: any) {
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED' || error.errno === 1451) {
        throw new BadRequestException('Não é possível remover este produto pois existem registros dependentes (ex: pedidos históricos).');
      }
      throw error;
    }
  }

  async ajustarEstoque(
    idProduto: string, 
    quantidade: number, 
    tipo: 'ENTRADA' | 'SAIDA', 
    motivo: string, 
    idEmpresa: string, 
    idUsuario: string
  ) {
    // Valida se o produto pertence à empresa
    const produto = await this.produtoRepo.findOne({ where: { id: idProduto, idEmpresa } });
    if (!produto) throw new NotFoundException('Produto não encontrado no catálogo da empresa.');

    return this.entityManager.transaction(async (manager) => {
      // 1. SELECT FOR UPDATE is unnecessary if we use direct UPDATE query, but we need previous values for Audit
      // Let's use atomic update statement.
      const queryRunner = manager.queryRunner;
      
      const estoqueAtual = await manager.findOne(Estoque, { where: { idProduto } });
      if (!estoqueAtual) throw new NotFoundException('Estoque não inicializado para este produto.');

      let affected = 0;

      if (tipo === 'ENTRADA') {
        const updateResult = await manager.update(
          Estoque,
          { idProduto },
          { quantidadeDisponivel: () => `quantidade_disponivel + ${quantidade}` }
        );
        affected = updateResult.affected || 0;
      } else if (tipo === 'SAIDA') {
        const updateResult = await manager.query(
          `UPDATE estoque SET quantidade_disponivel = quantidade_disponivel - ? WHERE id_produto = ? AND quantidade_disponivel >= ?`,
          [quantidade, idProduto, quantidade]
        );
        affected = updateResult.affectedRows;
        
        if (affected === 0) {
          throw new BadRequestException('Estoque insuficiente para a quantidade informada ou alteração concorrente.');
        }
      }

      // Audit Log
      await this.auditoriaService.logAction(
        'AJUSTE_ESTOQUE_MANUAL',
        idUsuario,
        'API',
        'estoque',
        { quantidadeDisponivel: estoqueAtual.quantidadeDisponivel, tipo, quantidade },
        { 
          quantidadeDisponivel: tipo === 'ENTRADA' ? estoqueAtual.quantidadeDisponivel + quantidade : estoqueAtual.quantidadeDisponivel - quantidade,
          motivo 
        }
      );

      return manager.findOne(Estoque, { where: { idProduto } });
    });
  }
}
