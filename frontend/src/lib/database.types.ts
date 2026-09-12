
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          nome: string
          cpf_cnpj: string | null
          email: string | null
          telefone: string | null
          endereco: string | null
          cidade: string | null
          estado: string | null
          cep: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cpf_cnpj?: string | null
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cpf_cnpj?: string | null
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      compras: {
        Row: {
          id: string
          numero: string | null
          fornecedor_id: string
          data_compra: string
          valor_total: number
          status: string | null
          observacoes: string | null
          usuario_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero?: string | null
          fornecedor_id: string
          data_compra?: string
          valor_total?: number
          status?: string | null
          observacoes?: string | null
          usuario_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero?: string | null
          fornecedor_id?: string
          data_compra?: string
          valor_total?: number
          status?: string | null
          observacoes?: string | null
          usuario_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      compras_itens: {
        Row: {
          id: string
          compra_id: string
          produto_id: string
          quantidade: number
          valor_unitario: number
          valor_total: number
          created_at: string
        }
        Insert: {
          id?: string
          compra_id: string
          produto_id: string
          quantidade: number
          valor_unitario: number
          valor_total: number
          created_at?: string
        }
        Update: {
          id?: string
          compra_id?: string
          produto_id?: string
          quantidade?: number
          valor_unitario?: number
          valor_total?: number
          created_at?: string
        }
      }
      configuracoes: {
        Row: {
          id: string
          usuario_id: string | null
          chave: string
          valor: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id?: string | null
          chave: string
          valor: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string | null
          chave?: string
          valor?: string
          created_at?: string
          updated_at?: string
        }
      }
      fornecedores: {
        Row: {
          id: string
          nome: string
          cnpj: string | null
          email: string | null
          telefone: string | null
          endereco: string | null
          cidade: string | null
          estado: string | null
          cep: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj?: string | null
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string | null
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      grupos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      logs: {
        Row: {
          id: string
          usuario_id: string | null
          acao: string
          tabela: string | null
          registro_id: string | null
          detalhes: Json | null
          ip: string | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id?: string | null
          acao: string
          tabela?: string | null
          registro_id?: string | null
          detalhes?: Json | null
          ip?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string | null
          acao?: string
          tabela?: string | null
          registro_id?: string | null
          detalhes?: Json | null
          ip?: string | null
          created_at?: string
        }
      }
      movimentacoes_estoque: {
        Row: {
          id: string
          produto_id: string
          tipo: string
          quantidade: number
          motivo: string
          documento_id: string | null
          observacoes: string | null
          usuario_id: string
          created_at: string
        }
        Insert: {
          id?: string
          produto_id: string
          tipo: string
          quantidade: number
          motivo: string
          documento_id?: string | null
          observacoes?: string | null
          usuario_id: string
          created_at?: string
        }
        Update: {
          id?: string
          produto_id?: string
          tipo?: string
          quantidade?: number
          motivo?: string
          documento_id?: string | null
          observacoes?: string | null
          usuario_id?: string
          created_at?: string
        }
      }
      produtos: {
        Row: {
          id: string
          codigo: string | null
          codigo_barras: string | null
          nome: string
          descricao: string | null
          grupo_id: string | null
          subgrupo_id: string | null
          sub_subgrupo_id: string | null
          preco_custo: number
          preco_venda: number
          estoque_atual: number
          estoque_minimo: number
          unidade: string | null
          imagem_url: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo?: string | null
          codigo_barras?: string | null
          nome: string
          descricao?: string | null
          grupo_id?: string | null
          subgrupo_id?: string | null
          sub_subgrupo_id?: string | null
          preco_custo?: number
          preco_venda?: number
          estoque_atual?: number
          estoque_minimo?: number
          unidade?: string | null
          imagem_url?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string | null
          codigo_barras?: string | null
          nome?: string
          descricao?: string | null
          grupo_id?: string | null
          subgrupo_id?: string | null
          sub_subgrupo_id?: string | null
          preco_custo?: number
          preco_venda?: number
          estoque_atual?: number
          estoque_minimo?: number
          unidade?: string | null
          imagem_url?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          nome: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      sub_subgrupos: {
        Row: {
          id: string
          subgrupo_id: string
          nome: string
          descricao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subgrupo_id: string
          nome: string
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subgrupo_id?: string
          nome?: string
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subgrupos: {
        Row: {
          id: string
          grupo_id: string
          nome: string
          descricao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          grupo_id: string
          nome: string
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          grupo_id?: string
          nome?: string
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["user_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
        }
      }
      vendas: {
        Row: {
          id: string
          numero: string | null
          cliente_id: string | null
          data_venda: string
          valor_total: number
          status: string | null
          forma_pagamento: string | null
          observacoes: string | null
          usuario_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero?: string | null
          cliente_id?: string | null
          data_venda?: string
          valor_total?: number
          status?: string | null
          forma_pagamento?: string | null
          observacoes?: string | null
          usuario_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero?: string | null
          cliente_id?: string | null
          data_venda?: string
          valor_total?: number
          status?: string | null
          forma_pagamento?: string | null
          observacoes?: string | null
          usuario_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      vendas_itens: {
        Row: {
          id: string
          venda_id: string
          produto_id: string
          quantidade: number
          valor_unitario: number
          valor_total: number
          created_at: string
        }
        Insert: {
          id?: string
          venda_id: string
          produto_id: string
          quantidade: number
          valor_unitario: number
          valor_total: number
          created_at?: string
        }
        Update: {
          id?: string
          venda_id?: string
          produto_id?: string
          quantidade?: number
          valor_unitario?: number
          valor_total?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      user_role: "admin" | "operador" | "vendedor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
