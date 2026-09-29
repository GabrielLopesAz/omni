import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsEnum, MinLength } from 'class-validator';

export class CreateProdutoDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsOptional()
  categoria?: string;

  @IsNumber()
  @Min(0)
  precoBase: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  custoUnitario?: number;

  @IsString()
  @IsOptional()
  imagemUrl?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estoqueInicial?: number;
}

export class UpdateProdutoDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsOptional()
  categoria?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  precoBase?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  custoUnitario?: number;

  @IsString()
  @IsOptional()
  imagemUrl?: string;
}

export enum TipoMovimentacao {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA'
}

export class AjusteEstoqueDto {
  @IsNumber()
  @Min(1)
  quantidade: number;

  @IsEnum(TipoMovimentacao)
  tipo: TipoMovimentacao;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  motivo: string;
}
