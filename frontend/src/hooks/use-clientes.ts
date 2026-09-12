import { useState, useEffect } from "react";
import axios from "axios";
import { useSocketIO } from "./useSocketIO";

import { getApiUrl } from '@/config/api';

const API_URL = getApiUrl();

export interface Cliente {
  idCliente?: number;
  id?: number;
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, connected } = useSocketIO();

  const fetchClientes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/clientes`);
      const data = Array.isArray(response.data) ? response.data : (response.data.items || []);
      setClientes(data);
      setError(null);
    } catch (err) {
      setError("Erro ao carregar dados de clientes");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Configurar ouvintes para os eventos do Socket.IO
    socket.on('cliente_criado', (novoCliente: Cliente) => {
      console.log('Cliente criado:', novoCliente);
      setClientes((prevClientes) => [...prevClientes, novoCliente]);
    });

    socket.on('cliente_atualizado', (clienteAtualizado: Cliente) => {
      console.log('Cliente atualizado:', clienteAtualizado);
      setClientes((prevClientes) => 
        prevClientes.map((cliente) => 
          (cliente.idCliente === clienteAtualizado.idCliente || cliente.id === clienteAtualizado.idCliente) 
            ? clienteAtualizado 
            : cliente
        )
      );
    });

    socket.on('cliente_excluido', (clienteExcluido: Cliente) => {
      console.log('Cliente excluído:', clienteExcluido);
      setClientes((prevClientes) => 
        prevClientes.filter((cliente) => 
          cliente.idCliente !== clienteExcluido.idCliente && cliente.id !== clienteExcluido.idCliente
        )
      );
    });

    // Limpar ouvintes ao desmontar o componente
    return () => {
      socket.off('cliente_criado');
      socket.off('cliente_atualizado');
      socket.off('cliente_excluido');
    };
  }, [socket]);

  const adicionarCliente = async (cliente: Cliente) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/clientes`, cliente);
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao adicionar cliente");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const atualizarCliente = async (idCliente: number, cliente: Partial<Cliente>) => {
    setIsLoading(true);
    try {
      const response = await axios.put(`${API_URL}/clientes`, { ...cliente, idCliente });
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao atualizar cliente");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const excluirCliente = async (idCliente: number) => {
    setIsLoading(true);
    try {
      const response = await axios.delete(`${API_URL}/clientes/${idCliente}`);
      setError(null);
      return response.data;
    } catch (err) {
      setError("Erro ao excluir cliente");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    clientes, 
    isLoading, 
    error, 
    adicionarCliente, 
    atualizarCliente, 
    excluirCliente,
    recarregarClientes: fetchClientes,
    socketConnected: connected
  };
}
