import { api } from './api';

export interface ProdutoResumo {
  id: string;
  sku: string;
  nome: string;
}

export interface EmpresaResumo {
  id: string;
  razao_social: string;
}

export interface IntegracaoResumo {
  id: string;
  nome: string;
  tipo: string;
}

export interface ItemPedidoDetalhe {
  id: string;
  idProduto: string;
  quantidade: number;
  quantidadeBipada: number;
  precoUnitario: number;
  produto?: ProdutoResumo;
}

export interface PedidoResumo {
  id: string;
  idPedidoMarketplace: string;
  clienteNome: string;
  valorTotal: number;
  status: string;
  dataPedido: string;
  empresa?: EmpresaResumo;
  integracao?: IntegracaoResumo;
}

export interface PedidoDetalhe extends PedidoResumo {
  itens: ItemPedidoDetalhe[];
  taxasMarketplace: number;
}

export const pedidosService = {
  listar: async (status?: string): Promise<PedidoResumo[]> => {
    const params = status ? { status } : {};
    const { data } = await api.get<PedidoResumo[]>('/api/v1/pedidos', { params });
    return data;
  },
  
  buscarPorId: async (id: string): Promise<PedidoDetalhe> => {
    const { data } = await api.get<PedidoDetalhe>(`/api/v1/pedidos/${id}`);
    return data;
  }
};
