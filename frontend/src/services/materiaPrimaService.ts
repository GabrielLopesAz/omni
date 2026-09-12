import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { isMockMode } from '@/config/mockConfig';
import { mockBobinas } from '@/data/systemMockData';

const API_URL = getApiUrl();

export interface Bobina {
  id: string;
  tipo_tecido: string;
  cor: string;
  lote: string;
  fornecedor: string;
  quantidade_total: number;
  quantidade_disponivel: number;
  unidade: string;
  localizacao: string;
  data_entrada: Date | string;
  status: "em_estoque" | "baixo_estoque" | "sem_estoque";
  codigo_barras?: string | null;
  codigoBarras?: string | null;
  observacoes?: string | null;
  criado_em?: string | Date;
  atualizado_em?: string | Date;
}

export interface Movimentacao {
  id: string;
  bobinaId: string;
  data: Date;
  tipo: "Entrada" | "Corte" | "Ajuste";
  quantidade_total: number;
  ordemProducao?: string;
  responsavel: string;
}

export interface Estoque {
  semEstoque: Bobina[];
  baixoEstoque: Bobina[];
  emEstoque: Bobina[];
}

let localBobinas = [...mockBobinas];

export const materiaPrimaService = {
  async listarBobinas(): Promise<Bobina[]> {
    if (isMockMode()) {
      return localBobinas;
    }
    try {
      const response = await axios.get(`${API_URL}/materia-prima`);
      return response.data;
    } catch {
      return localBobinas;
    }
  },

  async retornaEstoque(): Promise<Estoque> {
    const bobinas = await this.listarBobinas();
    return {
      semEstoque: bobinas.filter(b => b.status === "sem_estoque" || b.quantidade_disponivel <= 0),
      baixoEstoque: bobinas.filter(b => b.status === "baixo_estoque" || (b.quantidade_disponivel > 0 && b.quantidade_disponivel <= 20)),
      emEstoque: bobinas.filter(b => b.status === "em_estoque" || b.quantidade_disponivel > 20)
    };
  },

  async buscarBobina(id: string): Promise<Bobina> {
    if (isMockMode()) {
      return localBobinas.find(b => b.id === id) || localBobinas[0];
    }
    try {
      const response = await axios.get(`${API_URL}/materia-prima/${id}`);
      return response.data;
    } catch {
      return localBobinas.find(b => b.id === id) || localBobinas[0];
    }
  },

  async criarBobina(bobina: Omit<Bobina, 'id'>): Promise<Bobina> {
    if (isMockMode()) {
      const newBobina: Bobina = {
        ...bobina,
        id: `bob-${Math.floor(100 + Math.random() * 900)}`
      };
      localBobinas.unshift(newBobina);
      return newBobina;
    }
    try {
      const response = await axios.post(`${API_URL}/materia-prima`, bobina);
      return response.data.data;
    } catch {
      const newBobina: Bobina = {
        ...bobina,
        id: `bob-${Math.floor(100 + Math.random() * 900)}`
      };
      localBobinas.unshift(newBobina);
      return newBobina;
    }
  },

  async atualizarBobina(bobina: Bobina): Promise<Bobina> {
    if (isMockMode()) {
      localBobinas = localBobinas.map(b => b.id === bobina.id ? { ...b, ...bobina } : b);
      return bobina;
    }
    try {
      const { id, ...dadosParaAtualizar } = bobina;
      const response = await axios.put(`${API_URL}/materia-prima/${id}`, dadosParaAtualizar);
      return response.data;
    } catch {
      localBobinas = localBobinas.map(b => b.id === bobina.id ? { ...b, ...bobina } : b);
      return bobina;
    }
  },

  async excluirBobina(id: string): Promise<void> {
    if (isMockMode()) {
      localBobinas = localBobinas.filter(b => b.id !== id);
      return;
    }
    try {
      await axios.delete(`${API_URL}/materia-prima/${id}`);
    } catch {
      localBobinas = localBobinas.filter(b => b.id !== id);
    }
  },

  async registrarCorte(id: string, quantidade: number, _ordemProducao?: string, _responsavel?: string): Promise<Bobina> {
    const bobina = await this.buscarBobina(id);
    const novaQtd = Math.max(0, bobina.quantidade_disponivel - quantidade);
    const statusAtualizado = novaQtd === 0 ? "sem_estoque" : novaQtd <= 20 ? "baixo_estoque" : "em_estoque";
    
    return this.atualizarBobina({
      ...bobina,
      quantidade_disponivel: novaQtd,
      status: statusAtualizado
    });
  },

  async buscarHistorico(id: string): Promise<Movimentacao[]> {
    return [
      {
        id: `mov-${id}-1`,
        bobinaId: id,
        data: new Date(),
        tipo: "Entrada",
        quantidade_total: 100,
        ordemProducao: "OP-2026-001",
        responsavel: "Almoxarifado Sete Malhas"
      }
    ];
  },

  async buscarTiposTecido(): Promise<string[]> {
    const tipos = Array.from(new Set(localBobinas.map(b => b.tipo_tecido)));
    return tipos.length > 0 ? tipos : ["Meia Malha Algodão 30.1", "Ribana 2x1", "Moletom 3 Cabos", "Malha Piquet", "Viscolycra"];
  },

  async buscarCores(): Promise<string[]> {
    const cores = Array.from(new Set(localBobinas.map(b => b.cor)));
    return cores.length > 0 ? cores : ["Preto Reativo", "Branco Neve", "Cinza Mescla", "Azul Marinho", "Vinho Marsala"];
  },

  async buscarCoresPorTipoTecido(tipoTecido: string): Promise<string[]> {
    const cores = localBobinas.filter(b => b.tipo_tecido === tipoTecido).map(b => b.cor);
    return cores.length > 0 ? Array.from(new Set(cores)) : ["Preto Reativo", "Branco Neve"];
  },

  async verificarCodigoBarras(codigoBarras: string): Promise<boolean> {
    return localBobinas.some(b => b.codigo_barras === codigoBarras || b.codigoBarras === codigoBarras);
  }
};