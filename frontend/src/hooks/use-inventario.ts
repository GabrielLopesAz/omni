import { useState, useEffect } from "react";
import axios from "axios";
import { useSocketIO } from "./useSocketIO";
import { toast } from "@/components/ui/sonner";

import { getApiUrl } from '@/config/api';

const API_URL = getApiUrl();

export interface ItemEstoque {
  id?: number;
  nome: string;
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
  observacoes?: string;
  status?: 'ativo' | 'inativo' | 'baixo';
  criado_em?: string;
  atualizado_em?: string;
  estoque_minimo?: number;
  descricao?: string;
  imagem_url?: string;
}

export function useEstoque() {
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocketIO();

  const fetchEstoque = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/estoque`);
      const data = response.data.items;
      setEstoque(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar estoque:', err);
      setError('Erro ao carregar dados do estoque');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstoque();

    if (socket) {
      socket.on('estoque_item_criado', (novoItem: ItemEstoque) => {
        setEstoque((prevItems) => [...prevItems, novoItem]);
        toast.success(`Item adicionado: ${novoItem.nome}`);
      });

      socket.on('estoque_item_atualizado', (itemAtualizado: ItemEstoque) => {
        setEstoque((prevItems) =>
          prevItems.map((item) =>
            item.id === itemAtualizado.id
              ? itemAtualizado
              : item
          )
        );
        toast.success(`Item atualizado: ${itemAtualizado.nome}`);
      });

      socket.on('estoque_item_excluido', (itemExcluido: ItemEstoque) => {
        setEstoque((prevItems) =>
          prevItems.filter((item) => item.id !== itemExcluido.id)
        );
        toast.success(`Item removido: ${itemExcluido.nome}`);
      });
    }

    return () => {
      if (socket) {
        socket.off('estoque_item_criado');
        socket.off('estoque_item_atualizado');
        socket.off('estoque_item_excluido');
      }
    };
  }, [socket]);

  const adicionarItem = async (item: ItemEstoque) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/estoque`, item);
      const novoItem = response.data;
      setEstoque((prevItems) => [...prevItems, novoItem]);
      setError(null);
      return novoItem;
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      setError('Erro ao adicionar item ao estoque');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const atualizarItem = async (id: number, item: Partial<ItemEstoque>) => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_URL}/estoque`, { ...item, id });
      const itemAtualizado = response.data;
      setEstoque((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? itemAtualizado : item
        )
      );
      setError(null);
      return itemAtualizado;
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
      setError('Erro ao atualizar item do estoque');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const excluirItem = async (id: number) => {
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/estoque/${id}`);
      setEstoque((prevItems) =>
        prevItems.filter((item) => item.id !== id)
      );
      setError(null);
    } catch (err) {
      console.error('Erro ao excluir item:', err);
      setError('Erro ao excluir item do estoque');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    estoque,
    loading,
    error,
    adicionarItem,
    atualizarItem,
    excluirItem,
    recarregarEstoque: fetchEstoque,
  };
} 