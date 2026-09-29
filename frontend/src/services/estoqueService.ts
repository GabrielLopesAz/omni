import { api } from '@/services/api';

export interface EstoqueResponse {
  id: string;
  idProduto: string;
  quantidadeDisponivel: number;
  quantidadeReservada: number;
  updatedAt: string;
}

export const estoqueService = {
  // Ajusta o estoque via endpoint de ajuste (ENTRADA ou SAIDA)
  async ajustarEstoque(idProduto: string, quantidade: number, tipo: 'ENTRADA' | 'SAIDA', motivo: string): Promise<EstoqueResponse> {
    const response = await api.put(`/produtos/${idProduto}/estoque`, { quantidade, tipo, motivo });
    return response.data;
  }
};
