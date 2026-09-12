import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { isMockMode } from '@/config/mockConfig';
import { mockBancas } from '@/data/systemMockData';

const API_URL = getApiUrl();

export interface Banca {
  id: string;
  nome: string;
  cnpj?: string;
  contato: string;
  telefone: string;
  endereco?: string;
  valorPorPeca?: number;
  tipo: string;
}

let localBancas = [...mockBancas];

export const bancasService = {
  async listarBancas(): Promise<Banca[]> {
    if (isMockMode()) {
      return localBancas;
    }
    try {
      const response = await axios.get(`${API_URL}/terceiros?tipo=banca`);
      const filtered = response.data.filter((banca: Banca) => banca.tipo === 'banca');
      return filtered.length > 0 ? filtered : localBancas;
    } catch {
      return localBancas;
    }
  }
};