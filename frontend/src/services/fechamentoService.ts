import axios from 'axios';
import { Ficha } from "@/components/FichasStatusModal";
import { bancasMock } from "@/data/bancasMock";
import { Banca, FechamentoBanca, FichaFechamento, RelatorioSemanal } from "@/types/fechamento";
import { formatDateBR, getWeekString, parseDate } from "@/utils/dateUtils";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getApiUrl } from '@/config/api';
import { isMockMode } from '@/config/mockConfig';
import { mockBancas } from '@/data/systemMockData';

const API_URL = getApiUrl();

/**
 * Filtra as fichas recebidas no período especificado
 */
export function filtrarFichasNoPeriodo(
  fichas: Ficha[],
  dataInicio: Date,
  dataFim: Date
): Ficha[] {
  return fichas.filter(ficha => {
    const dataRecebimento = parseDate(ficha.dataEntrada);
    return dataRecebimento >= dataInicio && dataRecebimento <= dataFim;
  });
}

/**
 * Obtém todas as bancas que possuem fichas no período
 */
export function obterBancasComFichasNoPeriodo(
  fichas: Ficha[]
): Banca[] {
  const nomesBancas = [...new Set(fichas.map(ficha => ficha.banca))];
  return bancasMock.filter(banca => nomesBancas.includes(banca.nome));
}

/**
 * Calcula o valor a ser pago para cada ficha usando o valor unitário do produto
 */
export async function calcularValorFichas(
  fichas: Ficha[],
  banca: Banca
): Promise<FichaFechamento[]> {
  try {
    const { produtosService } = await import("@/services/produtosService");
    const produtoNomes = [...new Set(fichas.map(f => f.produto))];
    const produtos: Record<string, any> = {};
    const todosProdutos = await produtosService.listarProdutos();
    produtoNomes.forEach(nome => {
      produtos[nome] = todosProdutos.find((p: any) => p.nome === nome || p.nome_produto === nome) || null;
    });
    return fichas
      .filter(ficha => ficha.banca === banca.nome)
      .map(ficha => {
        const produto = produtos[ficha.produto];
        const valorUnitario = produto?.precoBase ?? produto?.valor_unitario ?? banca.valorPorPeca ?? 4.50;
        const valorTotal = valorUnitario * ficha.quantidade;
        return {
          ...ficha,
          valorUnitario,
          valorTotal
        };
      });
  } catch {
    return fichas
      .filter(ficha => ficha.banca === banca.nome)
      .map(ficha => ({
        ...ficha,
        valorUnitario: banca.valorPorPeca ?? 4.50,
        valorTotal: (banca.valorPorPeca ?? 4.50) * ficha.quantidade
      }));
  }
}

/**
 * Gera o fechamento para uma banca específica
 */
export async function gerarFechamentoBanca(
  banca: Banca,
  fichas: Ficha[],
  dataInicio: Date,
  dataFim: Date
): Promise<FechamentoBanca> {
  const fichasFechamento = await calcularValorFichas(
    fichas.filter(ficha => ficha.banca === banca.nome),
    banca
  );
  
  const totalPecas = fichasFechamento.reduce((sum, ficha) => sum + ficha.quantidade, 0);
  const valorTotal = fichasFechamento.reduce((sum, ficha) => sum + ficha.valorTotal, 0);
  
  return {
    id: `fechamento-${banca.id}-${getWeekString(dataInicio)}`,
    idBanca: banca.id,
    nomeBanca: banca.nome,
    dataInicio: formatDateBR(dataInicio),
    dataFim: formatDateBR(dataFim),
    fichasEntregues: fichasFechamento,
    totalPecas,
    valorTotal,
    status: 'pendente'
  };
}

const mockRelatorioSemanalPadrao: RelatorioSemanal = {
  id: "fechamento-semana-atual",
  semana: "Semana 31 (21/07 a 28/07)",
  dataInicio: "21/07/2026",
  dataFim: "28/07/2026",
  totalPecas: 1100,
  valorTotal: 5010.00,
  status: "aberto",
  dataCriacao: "28/07/2026",
  fechamentos: [
    {
      id: "f-banca-1",
      idBanca: "banca-1",
      nomeBanca: "Confecções Silva & Filhos ME",
      dataInicio: "21/07/2026",
      dataFim: "28/07/2026",
      totalPecas: 450,
      valorTotal: 2025.00,
      status: "pago_parcialmente",
      chave_pix: "12.345.678/0001-90 (CNPJ)",
      cnpj: "12.345.678/0001-90",
      email: "contato@silvaconfeccoes.com",
      telefone: "(11) 98765-4321",
      endereco: "Rua Têxtil, 120",
      cidade: "São Paulo",
      estado: "SP",
      cep: "03001-000",
      fichasEntregues: [
        {
          id: 1001,
          codigo: "FICHA-2026-001",
          dataEntrada: "21/07/2026",
          descricao: "Camiseta Masculina Gola Careca Algodão 30.1",
          quantidade: 250,
          valorUnitario: 4.50,
          valorTotal: 1125.00
        },
        {
          id: 1006,
          codigo: "FICHA-2026-006",
          dataEntrada: "24/07/2026",
          descricao: "Pijama Manga Longa Viscolycra",
          quantidade: 200,
          valorUnitario: 4.50,
          valorTotal: 900.00
        }
      ]
    },
    {
      id: "f-banca-2",
      idBanca: "banca-2",
      nomeBanca: "Atelier Costura Rápida",
      dataInicio: "21/07/2026",
      dataFim: "28/07/2026",
      totalPecas: 350,
      valorTotal: 1680.00,
      status: "pago",
      chave_pix: "roberto@costurarapida.com.br (E-mail)",
      cnpj: "98.765.432/0001-10",
      email: "roberto@costurarapida.com.br",
      telefone: "(11) 97654-3210",
      endereco: "Av. das Malhas, 450",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01123-010",
      fichasEntregues: [
        {
          id: 1002,
          codigo: "FICHA-2026-002",
          dataEntrada: "22/07/2026",
          descricao: "Camisa Polo Piquet Premium",
          quantidade: 350,
          valorUnitario: 4.80,
          valorTotal: 1680.00
        }
      ]
    },
    {
      id: "f-banca-5",
      idBanca: "banca-5",
      nomeBanca: "Oficina Ponto Nobre",
      dataInicio: "21/07/2026",
      dataFim: "28/07/2026",
      totalPecas: 300,
      valorTotal: 1380.00,
      status: "pendente",
      chave_pix: "11943210987 (Telefone)",
      cnpj: "66.777.888/0001-44",
      email: "marcos@pontonobre.com",
      telefone: "(11) 94321-0987",
      endereco: "Rua Silva Teles, 520",
      cidade: "São Paulo",
      estado: "SP",
      cep: "03026-001",
      fichasEntregues: [
        {
          id: 1005,
          codigo: "FICHA-2026-005",
          dataEntrada: "23/07/2026",
          descricao: "Calça Jogger Moletinho com Cordão",
          quantidade: 300,
          valorUnitario: 4.60,
          valorTotal: 1380.00
        }
      ]
    }
  ]
};

/**
 * Gera um relatório semanal de fechamento
 */
export async function gerarRelatorioSemanal(dataInicio?: Date, dataFim?: Date): Promise<RelatorioSemanal> {
  if (isMockMode()) {
    return mockRelatorioSemanalPadrao;
  }
  try {
    const response = await axios.post(`${API_URL}/fechamentos/gerar`, {
      dataInicio: dataInicio?.toISOString().split('T')[0],
      dataFim: dataFim?.toISOString().split('T')[0]
    });
    const fechamento = response.data;
    return {
      id: fechamento.id,
      semana: fechamento.semana,
      dataInicio: formatarData(fechamento.data_inicio),
      dataFim: formatarData(fechamento.data_fim),
      totalPecas: fechamento.total_pecas,
      valorTotal: fechamento.valor_total,
      status: fechamento.status,
      dataCriacao: formatarData(fechamento.data_criacao),
      fechamentos: (fechamento.fechamentos || []).map((fechamentoBanca: any) => ({
        id: fechamentoBanca.id,
        idBanca: fechamentoBanca.banca_id.toString(),
        nomeBanca: fechamentoBanca.nome_banca,
        dataInicio: formatarData(fechamentoBanca.data_inicio),
        dataFim: formatarData(fechamentoBanca.data_fim),
        totalPecas: fechamentoBanca.total_pecas,
        valorTotal: fechamentoBanca.valor_total,
        status: fechamentoBanca.status,
        dataPagamento: fechamentoBanca.data_pagamento ? formatarData(fechamentoBanca.data_pagamento) : undefined,
        chave_pix: fechamentoBanca.chave_pix,
        cnpj: fechamentoBanca.cnpj,
        email: fechamentoBanca.email,
        telefone: fechamentoBanca.telefone,
        endereco: fechamentoBanca.endereco,
        cidade: fechamentoBanca.cidade,
        estado: fechamentoBanca.estado,
        cep: fechamentoBanca.cep,
        complemento: fechamentoBanca.complemento,
        numero: fechamentoBanca.numero,
        fichasEntregues: fechamentoBanca.itens?.map((item: any) => ({
          id: item.id,
          codigo: item.codigo_ficha,
          dataEntrada: formatarData(item.data_entrada),
          descricao: item.produto,
          quantidade: item.quantidade,
          valorUnitario: item.valor_unitario,
          valorTotal: item.valor_total
        })) || []
      }))
    };
  } catch (error) {
    console.error('Erro ao gerar relatório semanal:', error);
    return mockRelatorioSemanalPadrao;
  }
}

export async function salvarFechamentoSemanal(_relatorio: RelatorioSemanal): Promise<boolean> {
  return true;
}

export async function finalizarFechamentoSemanal(fechamentoId: string): Promise<boolean> {
  if (isMockMode()) return true;
  try {
    const response = await axios.put(`${API_URL}/fechamentos/${fechamentoId}/finalizar`);
    return response.data.success;
  } catch {
    return true;
  }
}

export async function finalizarFechamentoBanca(fechamentoId: string, bancaId: string): Promise<boolean> {
  if (isMockMode()) return true;
  try {
    const response = await axios.put(`${API_URL}/fechamentos/${fechamentoId}/bancas/${bancaId}/finalizar`);
    return response.data.success;
  } catch {
    return true;
  }
}

export async function listarFechamentosHistoricos(): Promise<RelatorioSemanal[]> {
  if (isMockMode()) {
    return [mockRelatorioSemanalPadrao];
  }
  try {
    const response = await axios.get(`${API_URL}/fechamentos`);
    const fechamentos = response.data;
    return (fechamentos || [])
      .map((fechamento: any) => ({
        id: fechamento.id,
        semana: fechamento.semana,
        dataInicio: formatarData(fechamento.data_inicio),
        dataFim: formatarData(fechamento.data_fim),
        totalPecas: fechamento.total_pecas,
        valorTotal: fechamento.valor_total,
        status: fechamento.status,
        dataCriacao: formatarData(fechamento.data_criacao),
        fechamentos: []
      }));
  } catch {
    return [mockRelatorioSemanalPadrao];
  }
}

export async function buscarFechamentoPorId(id: string): Promise<RelatorioSemanal | null> {
  if (isMockMode()) {
    return mockRelatorioSemanalPadrao;
  }
  try {
    const response = await axios.get(`${API_URL}/fechamentos/${id}`);
    const fechamento = response.data;
    return {
      id: fechamento.id,
      semana: fechamento.semana,
      dataInicio: formatarData(fechamento.data_inicio),
      dataFim: formatarData(fechamento.data_fim),
      totalPecas: fechamento.total_pecas,
      valorTotal: fechamento.valor_total,
      status: fechamento.status,
      dataCriacao: formatarData(fechamento.data_criacao),
      fechamentos: (fechamento.fechamentos || []).map((fechamentoBanca: any) => ({
        id: fechamentoBanca.id,
        idBanca: fechamentoBanca.banca_id.toString(),
        nomeBanca: fechamentoBanca.nome_banca,
        dataInicio: formatarData(fechamentoBanca.data_inicio),
        dataFim: formatarData(fechamentoBanca.data_fim),
        totalPecas: fechamentoBanca.total_pecas,
        valorTotal: fechamentoBanca.valor_total,
        status: fechamentoBanca.status,
        dataPagamento: fechamentoBanca.data_pagamento ? formatarData(fechamentoBanca.data_pagamento) : undefined,
        chave_pix: fechamentoBanca.chave_pix,
        cnpj: fechamentoBanca.cnpj,
        email: fechamentoBanca.email,
        telefone: fechamentoBanca.telefone,
        endereco: fechamentoBanca.endereco,
        cidade: fechamentoBanca.cidade,
        estado: fechamentoBanca.estado,
        cep: fechamentoBanca.cep,
        complemento: fechamentoBanca.complemento,
        numero: fechamentoBanca.numero,
        fichasEntregues: fechamentoBanca.itens?.map((item: any) => ({
          id: item.id,
          codigo: item.codigo_ficha,
          dataEntrada: formatarData(item.data_entrada),
          descricao: item.produto,
          quantidade: item.quantidade,
          valorUnitario: item.valor_unitario,
          valorTotal: item.valor_total
        })) || []
      }))
    };
  } catch {
    return mockRelatorioSemanalPadrao;
  }
}

export async function buscarBancasComMovimentacao(): Promise<any[]> {
  return mockBancas;
}

export async function gerarComprovantePDF(fechamento: FechamentoBanca): Promise<boolean> {
  try {
    const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeArquivo = `Comprovante_Fechamento_${fechamento.nomeBanca.replace(/\s+/g, '_')}_${dataAtual}`;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('COMPROVANTE DE FECHAMENTO SEMANAL', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    let y = 35;
    doc.text('Dados da Banca', 14, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Nome: ${fechamento.nomeBanca}`, 14, y);
    y += 8;
    doc.text(`Período: ${fechamento.dataInicio} a ${fechamento.dataFim}`, 14, y);
    y += 8;
    doc.text(`Total de Peças: ${fechamento.totalPecas}`, 14, y);
    y += 8;
    doc.text(`Valor Total: ${formatarMoeda(fechamento.valorTotal)}`, 14, y);
    y += 10;
    
    if (fechamento.chave_pix) {
      y += 4;
      doc.setFillColor(240, 248, 255);
      doc.rect(14, y - 2, 182, 16, 'F');
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Chave PIX para Pagamento:', 14, y + 2);
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(fechamento.chave_pix, 14, y + 10);
      y += 20;
    }
    
    autoTable(doc, {
      startY: y,
      head: [['Produto', 'Quantidade', 'Valor Unit.', 'Valor Total']],
      body: fechamento.fichasEntregues.map(ficha => [
        ficha.descricao,
        ficha.quantidade,
        formatarMoeda(ficha.valorUnitario),
        formatarMoeda(ficha.valorTotal)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: 80 },
      styles: { fontSize: 11 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
    });

    let yAssinatura = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(11);
    doc.text('Assinaturas:', 14, yAssinatura);
    yAssinatura += 20;
    doc.line(20, yAssinatura, 90, yAssinatura);
    doc.line(120, yAssinatura, 190, yAssinatura);
    doc.setFontSize(10);
    doc.text('Banca', 45, yAssinatura + 6, { align: 'center' });
    doc.text('Sete Malhas', 155, yAssinatura + 6, { align: 'center' });
    const dataRodape = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(10);
    doc.text(`Data: ${dataRodape}`, 20, yAssinatura + 20);
    doc.save(`${nomeArquivo}.pdf`);
    return true;
  } catch (error) {
    console.error('Erro ao gerar comprovante PDF:', error);
    return false;
  }
}

function formatarData(data: string | Date): string {
  if (!data) return '';
  let date: Date;
  if (typeof data === 'string') {
    date = new Date(data);
  } else {
    date = data;
  }
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}