import { Ficha } from "@/components/FichasStatusModal";

export interface Banca {
  id: string;
  nome: string;
  cnpj?: string;
  contato: string;
  telefone: string;
  endereco?: string;
  valorPorPeca?: number; // Valor padrão por peça
  chave_pix?: string;
}

export interface FichaFechamento extends Ficha {
  valorUnitario: number;
  valorTotal: number;
}

export interface FechamentoBanca {
  id: string;
  idBanca: string;
  nomeBanca: string;
  dataInicio: string;
  dataFim: string;
  fichasEntregues: FichaFechamento[];
  totalPecas: number;
  valorTotal: number;
  status: 'pendente' | 'pago' | 'cancelado';
  dataPagamento?: string;
  observacoes?: string;
  chave_pix?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  complemento?: string;
  numero?: string;
}

export interface RelatorioSemanal {
  id: string;
  semana: string; // Ex: "2023-W27"
  dataInicio: string;
  dataFim: string;
  fechamentos: FechamentoBanca[];
  totalPecas: number;
  valorTotal: number;
  status: 'aberto' | 'fechado' | 'pago';
  dataCriacao: string;
} 