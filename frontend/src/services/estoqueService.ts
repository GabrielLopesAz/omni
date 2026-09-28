import axios from 'axios';
import { getApiUrl } from '@/config/api';

const API_URL = getApiUrl();

export const estoqueService = {
  // Ajusta o estoque via endpoint de ajuste (ENTRADA ou SAIDA)
  async ajustarEstoque(idProduto: string, quantidade: number, tipo: 'ENTRADA' | 'SAIDA'): Promise<unknown> {
    const response = await axios.put(`${API_URL}/produtos/${idProduto}/estoque`, { quantidade, tipo });
    return response.data;
  }
};
