import axios from 'axios';
import { getApiUrl } from '@/config/api';

const API_URL = getApiUrl();

export interface Produto {
  id: string;
  idEmpresa?: string;
  sku: string;
  nome: string;
  categoria?: string;
  precoBase: number;
  custoUnitario: number;
  imagemUrl?: string | null;
  createdAt?: string;
  estoque?: {
    quantidadeDisponivel: number;
    quantidadeReservada: number;
  };
}

export const produtosService = {
  async listarProdutos(): Promise<Produto[]> {
    const response = await axios.get(`${API_URL}/produtos`);
    return response.data;
  },

  async buscarProduto(id: string): Promise<Produto> {
    const response = await axios.get(`${API_URL}/produtos/${id}`);
    return response.data;
  },

  async criarProduto(produto: Partial<Produto> & { estoqueInicial?: number }): Promise<Produto> {
    const response = await axios.post(`${API_URL}/produtos`, produto);
    return response.data;
  },

  async atualizarProduto(id: string, produto: Partial<Produto>): Promise<Produto> {
    const response = await axios.put(`${API_URL}/produtos/${id}`, produto);
    return response.data;
  },

  async excluirProduto(id: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${API_URL}/produtos/${id}`);
    return response.data;
  }
};