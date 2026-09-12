import { getApiUrl } from '@/config/api';

const API_URL = getApiUrl();

export interface ItemEstoque {
  id?: number;
  nome_produto: string;
  sku?: string;
  quantidade: number;
  unidade?: string;
  categoria?: string;
  localizacao?: string;
  preco_unitario?: number;
  data_entrada?: string;
  data_validade?: string;
  codigo_barras?: string;
  fornecedor_id?: number;
  fornecedor?: string;
  status?: 'ativo' | 'inativo' | 'baixo';
  criado_em?: string;
  atualizado_em?: string;
  estoque_minimo?: number;
  descricao?: string;
  imagem_url?: string;
}

export const estoqueService = {
  async listarItens(): Promise<ItemEstoque[]> {
    const response = await axios.get(`${API_URL}/estoque`);
    return response.data.items;
  },

  async buscarItem(id: number): Promise<ItemEstoque> {
    const response = await axios.get(`${API_URL}/estoque/${id}`);
    return response.data;
  },

  async uploadImagem(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('imagem', file);

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.url;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao fazer upload da imagem');
      throw error;
    }
  },

  async criarItem(item: Omit<ItemEstoque, 'id'>): Promise<ItemEstoque> {
    const response = await axios.post(`${API_URL}/estoque`, item);
    return response.data;
  },

  async atualizarItem(item: ItemEstoque): Promise<ItemEstoque> {
    const response = await axios.put(`${API_URL}/estoque`, item);
    return response.data;
  },

  async excluirItem(id: number): Promise<void> {
    await axios.delete(`${API_URL}/estoque/${id}`);
  }
}; 