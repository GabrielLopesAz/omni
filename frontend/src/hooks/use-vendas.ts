import { useState, useEffect } from "react";
import axios from "axios";
import { useSocketIO } from "./useSocketIO";
import { toast } from "@/components/ui/sonner";

import { getApiUrl } from '@/config/api';

const API_URL = getApiUrl();

export interface Venda {
  idVenda?: number;
  id?: number;
  cliente_id?: number;
  cliente?: string;
  data_venda: string;
  valor_total: number;
  forma_pagamento?: string;
  status?: 'pendente' | 'pago' | 'cancelado' | 'entregue';
  observacoes?: string;
  usuario_id?: number;
  criado_em?: string;
  atualizado_em?: string;
}

export function useVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, connected } = useSocketIO();

  const fetchVendas = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/vendas`);
      const data = Array.isArray(response.data) ? response.data : (response.data.items || []);
      setVendas(data);
      setError(null);
    } catch (err) {
      setError("Erro ao carregar dados de vendas");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendas();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Configurar ouvintes para os eventos do Socket.IO
    socket.on('venda_criada', (novaVenda: Venda) => {
      console.log('Venda criada:', novaVenda);
      setVendas((prevVendas) => [...prevVendas, novaVenda]);
      toast.success(`Nova venda registrada: ${novaVenda.cliente || 'Cliente não especificado'}`);
    });

    socket.on('venda_atualizada', (vendaAtualizada: Venda) => {
      console.log('Venda atualizada:', vendaAtualizada);
      setVendas((prevVendas) => 
        prevVendas.map((venda) => 
          (venda.idVenda === vendaAtualizada.idVenda || venda.id === vendaAtualizada.idVenda) 
            ? vendaAtualizada 
            : venda
        )
      );
      toast.success(`Venda atualizada: ${vendaAtualizada.cliente || '#' + vendaAtualizada.idVenda}`);
    });

    socket.on('venda_excluida', (vendaExcluida: Venda) => {
      console.log('Venda excluída:', vendaExcluida);
      setVendas((prevVendas) => 
        prevVendas.filter((venda) => 
          venda.idVenda !== vendaExcluida.idVenda && venda.id !== vendaExcluida.idVenda
        )
      );
      toast.success(`Venda removida: ${vendaExcluida.cliente || '#' + vendaExcluida.idVenda}`);
    });

    // Limpar ouvintes ao desmontar o componente
    return () => {
      socket.off('venda_criada');
      socket.off('venda_atualizada');
      socket.off('venda_excluida');
    };
  }, [socket]);

  const adicionarVenda = async (venda: Venda) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/vendas`, venda);
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao adicionar venda");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const atualizarVenda = async (idVenda: number, venda: Partial<Venda>) => {
    setIsLoading(true);
    try {
      const response = await axios.put(`${API_URL}/vendas`, { ...venda, idVenda });
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao atualizar venda");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const excluirVenda = async (idVenda: number) => {
    setIsLoading(true);
    try {
      const response = await axios.delete(`${API_URL}/vendas/${idVenda}`);
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao excluir venda");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    vendas, 
    isLoading, 
    error, 
    adicionarVenda, 
    atualizarVenda, 
    excluirVenda,
    recarregarVendas: fetchVendas,
    socketConnected: connected
  };
} 