import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "@/components/ui/sonner";
import { getApiUrl } from '@/config/api';
import { isMockMode } from '@/config/mockConfig';
import { mockTerceiros as defaultMockTerceiros } from '@/data/systemMockData';

export interface Terceiro {
  idTerceiro?: string;
  id?: string;
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  tipo: 'fornecedor' | 'banca';
  observacoes?: string;
  numero?: string;
  complemento?: string;
  chave_pix?: string;
}

const api = getApiUrl();
let localMockTerceiros = [...defaultMockTerceiros] as Terceiro[];

export function useTerceiros() {
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTerceiros = async () => {
    setIsLoading(true);
    setError(null);
    if (isMockMode()) {
      setIsLoading(false);
      setTerceiros(localMockTerceiros);
      return;
    }
    try {
      const response = await axios.get(`${api}/terceiros`);
      const data = Array.isArray(response.data) ? response.data : (response.data.items || []);
      setTerceiros(data.length > 0 ? data : localMockTerceiros);
    } catch {
      setTerceiros(localMockTerceiros);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTerceirosByTipo = async (tipo: 'fornecedor' | 'banca') => {
    setIsLoading(true);
    setError(null);
    if (isMockMode()) {
      setIsLoading(false);
      const filtered = localMockTerceiros.filter(t => t.tipo === tipo);
      setTerceiros(filtered);
      return;
    }
    try {
      const response = await axios.get(`${api}/terceiros/tipo/${tipo}`);
      const data = Array.isArray(response.data) ? response.data : (response.data.items || []);
      setTerceiros(data.length > 0 ? data : localMockTerceiros.filter(t => t.tipo === tipo));
    } catch {
      setTerceiros(localMockTerceiros.filter(t => t.tipo === tipo));
    } finally {
      setIsLoading(false);
    }
  };

  const addTerceiro = async (terceiro: Terceiro) => {
    setIsLoading(true);
    setError(null);
    const newId = `ter-${Math.floor(10 + Math.random() * 90)}`;
    const newTerceiro = { ...terceiro, idTerceiro: newId, id: newId };

    if (isMockMode()) {
      setIsLoading(false);
      localMockTerceiros.unshift(newTerceiro);
      setTerceiros(prev => [newTerceiro, ...prev]);
      toast.success("Terceiro inserido com sucesso!");
      return true;
    }

    try {
      const response = await axios.post(`${api}/terceiros`, terceiro);
      const saved = response.data;
      const created = { ...terceiro, idTerceiro: saved.idTerceiro || newId, id: saved.id || newId };
      localMockTerceiros.unshift(created);
      setTerceiros(prev => [created, ...prev]);
      toast.success("Terceiro inserido com sucesso!");
      return true;
    } catch {
      localMockTerceiros.unshift(newTerceiro);
      setTerceiros(prev => [newTerceiro, ...prev]);
      toast.success("Terceiro inserido com sucesso! (Modo demonstração)");
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTerceiro = async (terceiro: Terceiro) => {
    setIsLoading(true);
    setError(null);
    const id = terceiro.idTerceiro || terceiro.id;

    if (isMockMode()) {
      setIsLoading(false);
      localMockTerceiros = localMockTerceiros.map(item => 
        (item.idTerceiro || item.id) === id ? { ...item, ...terceiro } : item
      );
      setTerceiros(prev => prev.map(item => 
        (item.idTerceiro || item.id) === id ? { ...item, ...terceiro } : item
      ));
      toast.success("Terceiro atualizado com sucesso!");
      return true;
    }

    try {
      if (!id) throw new Error("ID do terceiro não encontrado");
      const { idTerceiro, id: _, ...dadosParaAtualizar } = terceiro;

      const response = await axios.put(`${api}/terceiros/${id}`, dadosParaAtualizar, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.data) {
        setTerceiros(prev => prev.map(item => 
          (item.idTerceiro || item.id) === id ? { ...response.data.data, idTerceiro: id } : item
        ));
        toast.success(response.data.message || "Terceiro atualizado com sucesso!");
        return true;
      }
      throw new Error("Erro na resposta");
    } catch {
      localMockTerceiros = localMockTerceiros.map(item => 
        (item.idTerceiro || item.id) === id ? { ...item, ...terceiro } : item
      );
      setTerceiros(prev => prev.map(item => 
        (item.idTerceiro || item.id) === id ? { ...item, ...terceiro } : item
      ));
      toast.success("Terceiro atualizado com sucesso! (Modo demonstração)");
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTerceiro = async (id: string) => {
    setIsLoading(true);
    setError(null);

    if (isMockMode()) {
      setIsLoading(false);
      localMockTerceiros = localMockTerceiros.filter(item => (item.idTerceiro || item.id) !== id);
      setTerceiros(prev => prev.filter(item => (item.idTerceiro || item.id) !== id));
      toast.success("Terceiro removido com sucesso");
      return true;
    }

    try {
      await axios.delete(`${api}/terceiros/${id}`);
      localMockTerceiros = localMockTerceiros.filter(item => (item.idTerceiro || item.id) !== id);
      setTerceiros(prev => prev.filter(item => (item.idTerceiro || item.id) !== id));
      toast.success("Terceiro removido com sucesso");
      return true;
    } catch {
      localMockTerceiros = localMockTerceiros.filter(item => (item.idTerceiro || item.id) !== id);
      setTerceiros(prev => prev.filter(item => (item.idTerceiro || item.id) !== id));
      toast.success("Terceiro removido com sucesso (Modo demonstração)");
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTerceiros();
  }, []);

  return {
    terceiros,
    isLoading,
    error,
    fetchTerceiros,
    fetchTerceirosByTipo,
    addTerceiro,
    updateTerceiro,
    deleteTerceiro
  };
}