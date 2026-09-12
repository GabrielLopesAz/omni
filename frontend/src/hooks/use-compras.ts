import { useState, useEffect } from "react";
import axios from "axios";
import { useSocketIO } from "./useSocketIO";
import { toast } from "@/components/ui/sonner";

import { getApiUrl } from '@/config/api';

const API_URL = getApiUrl();

export interface Compra {
  idCompra?: number;
  id?: number;
  fornecedor_id?: number;
  fornecedor?: string;
  data_compra: string;
  valor_total: number;
  forma_pagamento?: string;
  status?: 'pendente' | 'pago' | 'cancelado' | 'recebido';
  data_entrega?: string;
  data_previsao_entrega?: string;
  observacoes?: string;
  usuario_id?: number;
  criado_em?: string;
  atualizado_em?: string;
}

export function useCompras() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, connected } = useSocketIO();

  const fetchCompras = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/compras`);
      const data = Array.isArray(response.data) ? response.data : (response.data.items || []);
      setCompras(data);
      setError(null);
    } catch (err) {
      setError("Erro ao carregar dados de compras");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompras();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Configurar ouvintes para os eventos do Socket.IO
    socket.on('compra_criada', (novaCompra: Compra) => {
      console.log('Compra criada:', novaCompra);
      setCompras((prevCompras) => [...prevCompras, novaCompra]);
      toast.success(`Nova compra registrada: ${novaCompra.fornecedor || 'Fornecedor não especificado'}`);
    });

    socket.on('compra_atualizada', (compraAtualizada: Compra) => {
      console.log('Compra atualizada:', compraAtualizada);
      setCompras((prevCompras) => 
        prevCompras.map((compra) => 
          (compra.idCompra === compraAtualizada.idCompra || compra.id === compraAtualizada.idCompra) 
            ? compraAtualizada 
            : compra
        )
      );
      toast.success(`Compra atualizada: ${compraAtualizada.fornecedor || '#' + compraAtualizada.idCompra}`);
    });

    socket.on('compra_excluida', (compraExcluida: Compra) => {
      console.log('Compra excluída:', compraExcluida);
      setCompras((prevCompras) => 
        prevCompras.filter((compra) => 
          compra.idCompra !== compraExcluida.idCompra && compra.id !== compraExcluida.idCompra
        )
      );
      toast.success(`Compra removida: ${compraExcluida.fornecedor || '#' + compraExcluida.idCompra}`);
    });

    // Limpar ouvintes ao desmontar o componente
    return () => {
      socket.off('compra_criada');
      socket.off('compra_atualizada');
      socket.off('compra_excluida');
    };
  }, [socket]);

  const adicionarCompra = async (compra: Compra) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/compras`, compra);
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao adicionar compra");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const atualizarCompra = async (idCompra: number, compra: Partial<Compra>) => {
    setIsLoading(true);
    try {
      const response = await axios.put(`${API_URL}/compras`, { ...compra, idCompra });
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao atualizar compra");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const excluirCompra = async (idCompra: number) => {
    setIsLoading(true);
    try {
      const response = await axios.delete(`${API_URL}/compras/${idCompra}`);
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao excluir compra");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    compras, 
    isLoading, 
    error, 
    adicionarCompra, 
    atualizarCompra, 
    excluirCompra,
    recarregarCompras: fetchCompras,
    socketConnected: connected
  };
} 