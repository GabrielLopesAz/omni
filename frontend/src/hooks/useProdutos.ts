import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';
import { isMockMode } from '@/config/mockConfig';
import { mockProdutos as defaultMockProdutos } from '@/data/systemMockData';

interface Produto {
  id?: string;
  nome_produto: string;
  sku: string;
  categoria?: string;
  valor_unitario: string | number;
  quantidade: number;
  estoque_minimo: number;
  localizacao?: string;
  unidade_medida: string;
  imagem?: string | null;
  codigo_barras?: string | null;
  fornecedor?: string | null;
  descricao?: string;
}

const url = getApiUrl();

let localMockProdutos = defaultMockProdutos.map(p => ({
  ...p,
  valor_unitario: Number(p.valor_unitario) || 0
}));

export function useProdutos() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatarProduto = (produto: Produto) => {
    return {
      ...produto,
      valor_unitario: produto.valor_unitario ? parseFloat(produto.valor_unitario.toString()) : 0,
      quantidade: Number(produto.quantidade) || 0,
      estoque_minimo: Number(produto.estoque_minimo) || 0,
      imagem: produto.imagem || null,
      codigo_barras: produto.codigo_barras || null,
      fornecedor: produto.fornecedor || null,
      descricao: produto.descricao || ''
    };
  };

  const listar = async () => {
    setIsLoading(true);
    setError(null);
    if (isMockMode()) {
      setIsLoading(false);
      return localMockProdutos;
    }
    try {
      const response = await axios.get(url + '/produtos');
      return response.data;
    } catch {
      return localMockProdutos;
    } finally {
      setIsLoading(false);
    }
  };

  const buscar = async (id: string) => {
    setIsLoading(true);
    setError(null);
    if (isMockMode()) {
      setIsLoading(false);
      return localMockProdutos.find(p => p.id === id) || localMockProdutos[0];
    }
    try {
      const response = await axios.get(url + `/produtos/${id}`);
      return response.data;
    } catch {
      return localMockProdutos.find(p => p.id === id) || localMockProdutos[0];
    } finally {
      setIsLoading(false);
    }
  };

  const criar = async (produto: Produto) => {
    setIsLoading(true);
    setError(null);
    const produtoFormatado = formatarProduto(produto);
    const mockId = `prod-${Math.floor(10 + Math.random() * 90)}`;
    const newProd = { ...produtoFormatado, id: mockId };

    if (isMockMode()) {
      setIsLoading(false);
      localMockProdutos.unshift(newProd);
      toast.success('Produto criado com sucesso!');
      return newProd;
    }

    try {
      const response = await axios.post(url + '/produtos', produtoFormatado);
      toast.success('Produto criado com sucesso!');
      return response.data;
    } catch {
      localMockProdutos.unshift(newProd);
      toast.success('Produto criado com sucesso! (Modo demonstração)');
      return newProd;
    } finally {
      setIsLoading(false);
    }
  };

  const atualizar = async (id: string, produto: Produto) => {
    setIsLoading(true);
    setError(null);
    const produtoFormatado = formatarProduto(produto);

    if (isMockMode()) {
      setIsLoading(false);
      localMockProdutos = localMockProdutos.map(p => p.id === id ? { ...p, ...produtoFormatado, id } : p);
      toast.success('Produto atualizado com sucesso!');
      return { ...produtoFormatado, id };
    }

    try {
      const response = await axios.put(url + `/produtos/${id}`, produtoFormatado);
      toast.success('Produto atualizado com sucesso!');
      return response.data;
    } catch {
      localMockProdutos = localMockProdutos.map(p => p.id === id ? { ...p, ...produtoFormatado, id } : p);
      toast.success('Produto atualizado com sucesso! (Modo demonstração)');
      return { ...produtoFormatado, id };
    } finally {
      setIsLoading(false);
    }
  };

  const excluir = async (id: string) => {
    setIsLoading(true);
    setError(null);

    if (isMockMode()) {
      setIsLoading(false);
      localMockProdutos = localMockProdutos.filter(p => p.id !== id);
      toast.success('Produto excluído com sucesso!');
      return { success: true };
    }

    try {
      const response = await axios.delete(url + `/produtos/${id}`);
      toast.success('Produto excluído com sucesso!');
      return response.data;
    } catch {
      localMockProdutos = localMockProdutos.filter(p => p.id !== id);
      toast.success('Produto excluído com sucesso! (Modo demonstração)');
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const pesquisar = async (termo: string) => {
    setIsLoading(true);
    setError(null);
    if (isMockMode()) {
      setIsLoading(false);
      const lower = termo.toLowerCase();
      return localMockProdutos.filter(p => 
        p.nome_produto.toLowerCase().includes(lower) || 
        p.sku.toLowerCase().includes(lower) ||
        (p.categoria && p.categoria.toLowerCase().includes(lower))
      );
    }

    try {
      const response = await axios.get(url + `/produtos/search?termo=${encodeURIComponent(termo)}`);
      return response.data;
    } catch {
      const lower = termo.toLowerCase();
      return localMockProdutos.filter(p => 
        p.nome_produto.toLowerCase().includes(lower) || 
        p.sku.toLowerCase().includes(lower)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const ajustarEstoque = async (id: string, dadosAjuste: any) => {
    setIsLoading(true);
    setError(null);
    if (isMockMode()) {
      setIsLoading(false);
      localMockProdutos = localMockProdutos.map(p => {
        if (p.id === id) {
          const qtd = Number(dadosAjuste.nova_quantidade) || p.quantidade;
          return { ...p, quantidade: qtd };
        }
        return p;
      });
      toast.success('Estoque ajustado com sucesso!');
      return { success: true };
    }

    try {
      const response = await axios.post(url + `/produtos/${id}/ajustar-estoque`, dadosAjuste);
      toast.success('Estoque ajustado com sucesso!');
      return response.data;
    } catch {
      localMockProdutos = localMockProdutos.map(p => {
        if (p.id === id) {
          const qtd = Number(dadosAjuste.nova_quantidade) || p.quantidade;
          return { ...p, quantidade: qtd };
        }
        return p;
      });
      toast.success('Estoque ajustado com sucesso! (Modo demonstração)');
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImagem = async (_file: File): Promise<string> => {
    return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80';
  };

  return {
    isLoading,
    error,
    listar,
    buscar,
    criar,
    atualizar,
    excluir,
    pesquisar,
    ajustarEstoque,
    uploadImagem
  };
}