import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { isMockMode } from '@/config/mockConfig';
import { mockFichas, mockMovimentacoes, mockRelatoriosDados } from '@/data/systemMockData';

const API_URL = getApiUrl();

export type Ficha = {
  id: number;
  codigo: string;
  banca: string;
  data_entrada: Date | string;
  data_previsao: Date | string;
  quantidade: number;
  quantidade_recebida: number;
  quantidade_perdida: number;
  status: "aguardando_retirada" | "em_producao" | "concluido" | "recebido_parcialmente";
  produto: string;
  produto_id: string;
  cor: string;
  tamanho: "P" | "M" | "G" | "GG";
  observacoes: string;
};

export interface Movimentacao {
  id: number;
  ficha_id: number;
  data: string | Date;
  tipo: "Entrada" | "Saída" | "Retorno" | "Conclusão" | "Perda";
  quantidade: number;
  descricao: string;
  responsavel: string;
}

// In-memory mock store
let localMockFichas = [...mockFichas];
let localMockMovimentacoes = [...mockMovimentacoes];

export const fichasService = {
  async listarFichas(): Promise<Ficha[]> {
    if (isMockMode()) {
      return localMockFichas;
    }
    try {
      const response = await axios.get(`${API_URL}/fichas`);
      return response.data;
    } catch {
      return localMockFichas;
    }
  },

  async buscarFicha(id: number): Promise<Ficha> {
    if (isMockMode()) {
      const found = localMockFichas.find(f => f.id === Number(id));
      if (found) return found;
      return localMockFichas[0];
    }
    try {
      const response = await axios.get(`${API_URL}/fichas/${id}`);
      return response.data;
    } catch {
      return localMockFichas.find(f => f.id === Number(id)) || localMockFichas[0];
    }
  },

  async criarFicha(ficha: Omit<Ficha, 'id'>): Promise<Ficha> {
    if (isMockMode()) {
      const newFicha: Ficha = {
        ...ficha,
        id: Math.floor(1000 + Math.random() * 9000),
        quantidade_recebida: ficha.quantidade_recebida || 0,
        quantidade_perdida: ficha.quantidade_perdida || 0,
        status: ficha.status || 'em_producao'
      };
      localMockFichas.unshift(newFicha);
      return newFicha;
    }
    try {
      const response = await axios.post(`${API_URL}/fichas`, ficha);
      return response.data.data;
    } catch {
      const newFicha: Ficha = {
        ...ficha,
        id: Math.floor(1000 + Math.random() * 9000),
        quantidade_recebida: 0,
        quantidade_perdida: 0,
        status: 'em_producao'
      };
      localMockFichas.unshift(newFicha);
      return newFicha;
    }
  },

  async atualizarFicha(ficha: Ficha): Promise<Ficha> {
    if (isMockMode()) {
      localMockFichas = localMockFichas.map(f => f.id === ficha.id ? { ...f, ...ficha } : f);
      return ficha;
    }
    try {
      const fichaParaEnviar = {
        ...ficha,
        data_entrada: ficha.data_entrada instanceof Date ? ficha.data_entrada.toISOString() : ficha.data_entrada,
        data_previsao: ficha.data_previsao instanceof Date ? ficha.data_previsao.toISOString() : ficha.data_previsao
      };
      const response = await axios.put(`${API_URL}/fichas/${ficha.id}`, fichaParaEnviar);
      return response.data.data;
    } catch {
      localMockFichas = localMockFichas.map(f => f.id === ficha.id ? { ...f, ...ficha } : f);
      return ficha;
    }
  },

  async excluirFicha(id: number): Promise<void> {
    if (isMockMode()) {
      localMockFichas = localMockFichas.filter(f => f.id !== Number(id));
      return;
    }
    try {
      await axios.delete(`${API_URL}/fichas/${id}`);
    } catch {
      localMockFichas = localMockFichas.filter(f => f.id !== Number(id));
    }
  },

  async concluirFicha(id: number): Promise<Ficha> {
    if (isMockMode()) {
      const ficha = localMockFichas.find(f => f.id === Number(id));
      if (ficha) {
        ficha.status = 'concluido';
        ficha.quantidade_recebida = ficha.quantidade;
      }
      return ficha || localMockFichas[0];
    }
    try {
      const response = await axios.post(`${API_URL}/fichas/${id}/concluir`);
      return response.data.data;
    } catch {
      const ficha = localMockFichas.find(f => f.id === Number(id));
      if (ficha) {
        ficha.status = 'concluido';
      }
      return ficha || localMockFichas[0];
    }
  },

  async registrarMovimentacao(
    id: number, 
    tipo:  "Entrada" | "Saída" | "Retorno" | "Conclusão" | "Perda", 
    quantidade: number, 
    descricao: string, 
    responsavel?: string
  ): Promise<Ficha> {
    const fichaAtual = await this.buscarFicha(id);
    const novaQuantidadeRecebida = (fichaAtual.quantidade_recebida || 0) + (tipo === 'Retorno' || tipo === 'Conclusão' ? quantidade : 0);
    const novaQuantidadePerdida = (fichaAtual.quantidade_perdida || 0) + (tipo === 'Perda' ? quantidade : 0);

    const fichaAtualizada = await this.atualizarFicha({
      ...fichaAtual,
      quantidade_recebida: novaQuantidadeRecebida,
      quantidade_perdida: novaQuantidadePerdida,
      status: novaQuantidadeRecebida >= fichaAtual.quantidade ? "concluido" : "recebido_parcialmente"
    });

    localMockMovimentacoes.unshift({
      id: Math.floor(500 + Math.random() * 9000),
      ficha_id: id,
      data: new Date().toISOString(),
      tipo,
      quantidade,
      descricao,
      responsavel: responsavel || "Operador Sete Malhas"
    });

    return fichaAtualizada;
  },

  async buscarMovimentacoes(id: number): Promise<Movimentacao[]> {
    if (isMockMode()) {
      return localMockMovimentacoes.filter(m => m.ficha_id === Number(id));
    }
    try {
      const response = await axios.get(`${API_URL}/fichas/${id}/movimentacoes`);
      return response.data;
    } catch {
      return localMockMovimentacoes.filter(m => m.ficha_id === Number(id));
    }
  },

  async buscarRelatorio(_dataInicio?: string, _dataFim?: string): Promise<any> {
    if (isMockMode()) {
      return {
        totalFichas: localMockFichas.length,
        totalProducao: localMockFichas.reduce((acc, f) => acc + f.quantidade, 0),
        totalRecebido: localMockFichas.reduce((acc, f) => acc + (f.quantidade_recebida || 0), 0),
        totalPerdido: localMockFichas.reduce((acc, f) => acc + (f.quantidade_perdida || 0), 0),
        bancas: mockRelatoriosDados.porBanca,
        mensal: mockRelatoriosDados.mensal
      };
    }
    try {
      const response = await axios.get(`${API_URL}/fichas/relatorio`);
      return response.data;
    } catch {
      return {
        totalFichas: localMockFichas.length,
        totalProducao: localMockFichas.reduce((acc, f) => acc + f.quantidade, 0),
        totalRecebido: localMockFichas.reduce((acc, f) => acc + (f.quantidade_recebida || 0), 0),
        totalPerdido: localMockFichas.reduce((acc, f) => acc + (f.quantidade_perdida || 0), 0),
        bancas: mockRelatoriosDados.porBanca,
        mensal: mockRelatoriosDados.mensal
      };
    }
  },

  async buscarDadosSemanais(_dataInicio: string, _dataFim: string): Promise<any> {
    return this.buscarRelatorio();
  },

  async buscarRecebidosUltimosMeses(): Promise<any[]> {
    return mockRelatoriosDados.mensal.map(m => ({ mes: m.mes, quantidade: m.recebidas, total_recebido: m.recebidas }));
  },

  async buscarPerdidasUltimosMeses(): Promise<any[]> {
    return mockRelatoriosDados.mensal.map(m => ({ mes: m.mes, quantidade: m.perdidas, total_perdido: m.perdidas }));
  },

  async buscarCortadasUltimosMeses(): Promise<any[]> {
    return mockRelatoriosDados.mensal.map(m => ({ mes: m.mes, quantidade: m.cortadas, total_cortada: m.cortadas }));
  },

  async buscarDadosConsolidadosPeriodo(): Promise<any> {
    return {
      total_cortadas: 1700,
      total_recebidas: 830,
      total_perdidas: 11,
      emProducao: 858,
      cortadas: 1700,
      recebidas: 830,
      perdidas: 11
    };
  },

  async buscarRecebidosDetalhadosPorBanca(): Promise<any[]> {
    return mockRelatoriosDados.porBanca.map(b => ({ banca: b.banca, quantidade: b.recebidas, total_recebido: b.recebidas, valor_total: b.recebidas * 4.5 }));
  },

  async buscarPerdidasDetalhadasPorBanca(): Promise<any[]> {
    return mockRelatoriosDados.porBanca.map(b => ({ banca: b.banca, quantidade: b.perdidas, total_perdido: b.perdidas, valor_total: b.perdidas * 4.5 }));
  },

  async buscarCortadasDetalhadasPorBanca(): Promise<any[]> {
    return mockRelatoriosDados.porBanca.map(b => ({ banca: b.banca, quantidade: b.cortadas, total_cortada: b.cortadas, valor_total: b.cortadas * 4.5 }));
  }
};