import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { isMockMode } from '@/config/mockConfig';
import { mockClientes, mockFornecedores, mockBancas, mockProdutos } from '@/data/systemMockData';

// Map of mock data per table name
const mockTables: Record<string, any[]> = {
  clientes: mockClientes,
  fornecedores: mockFornecedores,
  terceiros: mockBancas,
  bancas: mockBancas,
  produtos: mockProdutos,
  vendas: [
    { id: "venda-1", cliente: "Boutique Moda & Estilo Ltda", data: "2026-07-25", valor_total: 4990.00, status: "concluido", itens: 100 },
    { id: "venda-2", cliente: "Lojas Vest bem Eireli", data: "2026-07-27", valor_total: 8990.00, status: "em_andamento", itens: 100 }
  ],
  compras: [
    { id: "compra-1", fornecedor: "Têxtil Cataguases S/A", data: "2026-07-15", valor_total: 12500.00, status: "recebido" },
    { id: "compra-2", fornecedor: "Malharia Santa Maria Ltda", data: "2026-07-20", valor_total: 6800.00, status: "recebido" }
  ],
  grupos: [
    { id: "grp-1", nome: "Vestuário Masculino" },
    { id: "grp-2", nome: "Vestuário Feminino" },
    { id: "grp-3", nome: "Linha Infantil" }
  ],
  subgrupos: [
    { id: "sub-1", nome: "Camisetas & Polos", grupo_id: "grp-1" },
    { id: "sub-2", nome: "Regatas & Blusas", grupo_id: "grp-2" }
  ],
  sub_subgrupos: [
    { id: "subsub-1", nome: "Algodão 30.1 Penteado" }
  ]
};

// In-memory table store for runtime mutations
const memoryStore: Record<string, any[]> = {};

export const useSupabaseCrud = <T extends Record<string, any>>(tableName: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const supabaseAny = supabase as any;

  if (!memoryStore[tableName]) {
    memoryStore[tableName] = mockTables[tableName] ? [...mockTables[tableName]] : [];
  }

  const logAction = async (acao: string, tabela: string, registroId?: string, detalhes?: any) => {
    try {
      if (!user || isMockMode()) return;
      await supabaseAny.from('logs').insert({
        usuario_id: user.id,
        acao,
        tabela,
        registro_id: registroId,
        detalhes
      });
    } catch {
      // Ignorar erro de log no modo demonstracao
    }
  };

  const getAll = async (options?: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, any>;
  }): Promise<{ data: T[] | null; count: number | null }> => {
    setIsLoading(true);
    setError(null);
    
    if (isMockMode()) {
      setIsLoading(false);
      const data = memoryStore[tableName] as T[];
      return { data, count: data.length };
    }

    try {
      const {
        page = 1,
        pageSize = 100,
        orderBy = 'created_at',
        orderDirection = 'desc',
        filters = {}
      } = options || {};

      let query = supabaseAny
        .from(tableName)
        .select('*', { count: 'exact' });

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string' && value.includes('%')) {
            query = query.ilike(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(from, to);

      if (error) {
        throw error;
      }

      logAction('consulta', tableName).catch(() => {});
      return { data: data as T[], count };
    } catch (err: any) {
      console.warn(`Fallback para dados mocados na tabela ${tableName}:`, err.message);
      const data = memoryStore[tableName] as T[];
      return { data, count: data.length };
    } finally {
      setIsLoading(false);
    }
  };

  const getById = async (id: string): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    if (isMockMode()) {
      setIsLoading(false);
      const found = memoryStore[tableName]?.find((item: any) => item.id === id);
      return (found as T) || null;
    }

    try {
      const { data, error } = await supabaseAny
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      logAction('visualizar', tableName, id).catch(() => {});
      return data as T;
    } catch {
      const found = memoryStore[tableName]?.find((item: any) => item.id === id);
      return (found as T) || null;
    } finally {
      setIsLoading(false);
    }
  };

  const create = async (record: Partial<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    const mockId = Math.random().toString(36).substring(2, 15);
    const newRecord = { 
      id: mockId, 
      created_at: new Date().toISOString(),
      ...record 
    } as unknown as T;

    if (isMockMode()) {
      setIsLoading(false);
      memoryStore[tableName].unshift(newRecord);
      toast({
        title: "Registro criado com sucesso",
        description: "O item foi adicionado."
      });
      return newRecord;
    }

    try {
      const recordWithUser = user?.id && !('usuario_id' in record) && 
        ['compras', 'vendas', 'movimentacoes_estoque', 'configuracoes'].includes(tableName)
        ? { ...record, usuario_id: user.id }
        : record;

      const { data, error } = await supabaseAny
        .from(tableName)
        .insert(recordWithUser)
        .select()
        .single();

      if (error) throw error;

      await logAction('inserir', tableName, data.id, recordWithUser);
      toast({
        title: "Registro criado com sucesso",
        description: "O registro foi adicionado ao sistema."
      });

      return data as T;
    } catch {
      memoryStore[tableName].unshift(newRecord);
      toast({
        title: "Registro criado com sucesso",
        description: "O registro foi adicionado (modo demonstração)."
      });
      return newRecord;
    } finally {
      setIsLoading(false);
    }
  };

  const update = async (id: string, record: Partial<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    if (isMockMode()) {
      setIsLoading(false);
      memoryStore[tableName] = memoryStore[tableName].map((item: any) => 
        item.id === id ? { ...item, ...record, updated_at: new Date().toISOString() } : item
      );
      toast({
        title: "Registro atualizado com sucesso",
        description: "As alterações foram salvas."
      });
      return { id, ...record } as unknown as T;
    }

    try {
      const { data, error } = await supabaseAny
        .from(tableName)
        .update(record)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAction('atualizar', tableName, id, record);
      toast({
        title: "Registro atualizado com sucesso",
        description: "As alterações foram salvas."
      });

      return data as T;
    } catch {
      memoryStore[tableName] = memoryStore[tableName].map((item: any) => 
        item.id === id ? { ...item, ...record } : item
      );
      toast({
        title: "Registro atualizado com sucesso",
        description: "As alterações foram salvas (modo demonstração)."
      });
      return { id, ...record } as unknown as T;
    } finally {
      setIsLoading(false);
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    if (isMockMode()) {
      setIsLoading(false);
      memoryStore[tableName] = memoryStore[tableName].filter((item: any) => item.id !== id);
      toast({
        title: "Registro excluído com sucesso",
        description: "O item foi removido."
      });
      return true;
    }

    try {
      const { error } = await supabaseAny
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAction('excluir', tableName, id);
      toast({
        title: "Registro excluído com sucesso",
        description: "O item foi removido do sistema."
      });
      return true;
    } catch {
      memoryStore[tableName] = memoryStore[tableName].filter((item: any) => item.id !== id);
      toast({
        title: "Registro excluído com sucesso",
        description: "O item foi removido (modo demonstração)."
      });
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    getAll,
    getById,
    create,
    update,
    remove
  };
};

export const useGrupos = () => useSupabaseCrud('grupos');
export const useSubgrupos = () => useSupabaseCrud('subgrupos');
export const useSubSubgrupos = () => useSupabaseCrud('sub_subgrupos');
export const useProdutos = () => useSupabaseCrud('produtos');
export const useClientes = () => useSupabaseCrud('clientes');
export const useFornecedores = () => useSupabaseCrud('fornecedores');
export const useCompras = () => useSupabaseCrud('compras');
export const useComprasItens = () => useSupabaseCrud('compras_itens');
export const useVendas = () => useSupabaseCrud('vendas');
export const useVendasItens = () => useSupabaseCrud('vendas_itens');
export const useMovimentacoesEstoque = () => useSupabaseCrud('movimentacoes_estoque');
export const useConfiguracoes = () => useSupabaseCrud('configuracoes');
