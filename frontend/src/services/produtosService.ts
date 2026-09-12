import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { isMockMode } from '@/config/mockConfig';
import { mockProdutos } from '@/data/systemMockData';

const API_URL = getApiUrl();

export interface Produto {
  id: string;
  nome_produto: string;
  sku: string;
  categoria?: string;
  valor_unitario: number;
  quantidade: number;
  estoque_minimo: number;
  localizacao?: string;
  unidade_medida: string;
  imagem?: string | null;
  codigo_barras?: string | null;
  fornecedor?: string | null;
  descricao?: string;
}

let localProdutos = [...mockProdutos];

export const produtosService = {
  async listarProdutos(): Promise<Produto[]> {
    if (isMockMode()) {
      return localProdutos;
    }
    try {
      const response = await axios.get(`${API_URL}/produtos`);
      return response.data;
    } catch {
      return localProdutos;
    }
  },

  async buscarProduto(id: string): Promise<Produto> {
    if (isMockMode()) {
      return localProdutos.find(p => p.id === id) || localProdutos[0];
    }
    try {
      const response = await axios.get(`${API_URL}/produtos/${id}`);
      return response.data;
    } catch {
      return localProdutos.find(p => p.id === id) || localProdutos[0];
    }
  },

  async criarProduto(produto: Omit<Produto, 'id'>): Promise<Produto> {
    if (isMockMode()) {
      const newProd: Produto = {
        ...produto,
        id: `prod-${Math.floor(10 + Math.random() * 90)}`
      };
      localProdutos.unshift(newProd);
      return newProd;
    }
    try {
      const response = await axios.post(`${API_URL}/produtos`, produto);
      return response.data;
    } catch {
      const newProd: Produto = {
        ...produto,
        id: `prod-${Math.floor(10 + Math.random() * 90)}`
      };
      localProdutos.unshift(newProd);
      return newProd;
    }
  },

  async atualizarProduto(produto: Produto): Promise<Produto> {
    if (isMockMode()) {
      localProdutos = localProdutos.map(p => p.id === produto.id ? { ...p, ...produto } : p);
      return produto;
    }
    try {
      const response = await axios.put(`${API_URL}/produtos/${produto.id}`, produto);
      return response.data;
    } catch {
      localProdutos = localProdutos.map(p => p.id === produto.id ? { ...p, ...produto } : p);
      return produto;
    }
  },

  async excluirProduto(id: string): Promise<void> {
    if (isMockMode()) {
      localProdutos = localProdutos.filter(p => p.id !== id);
      return;
    }
    try {
      await axios.delete(`${API_URL}/produtos/${id}`);
    } catch {
      localProdutos = localProdutos.filter(p => p.id !== id);
    }
  }
};