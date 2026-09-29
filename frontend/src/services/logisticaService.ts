import { api } from './api';
import axios from 'axios';

export interface ItemConferencia {
  id: string;
  idProduto: string;
  sku: string;
  nomeProduto: string;
  imagemUrl: string | null;
  quantidade: number;
  quantidadeBipada: number;
}

export interface PedidoConferencia {
  id: string;
  status: string;
  clienteNome: string | null;
  idEmpresa: string;
  itens: ItemConferencia[];
}

export interface BipagemResult {
  message: string;
  sku: string;
  quantidadeBipada: number;
  quantidadePedida: number;
  pedidoStatus: string;
}

export interface ExpedicaoResult {
  message: string;
  status: string;
}

export const logisticaService = {
  async getPedido(idPedido: string): Promise<PedidoConferencia> {
    const { data } = await api.get<PedidoConferencia>(`/conferencia/${idPedido}`);
    return data;
  },

  async bipar(idPedido: string, sku: string): Promise<BipagemResult> {
    const { data } = await api.post<BipagemResult>(`/conferencia/${idPedido}/bipar`, { sku });
    return data;
  },

  async expedir(idPedido: string): Promise<ExpedicaoResult> {
    const { data } = await api.post<ExpedicaoResult>(`/logistica/pedidos/${idPedido}/expedir`);
    return data;
  },
};

export { axios };
