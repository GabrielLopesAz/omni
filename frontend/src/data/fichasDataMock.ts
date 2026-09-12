import { Ficha, Movimentacao } from '@/services/fichasService';
import { format, addDays, subDays } from 'date-fns';

// Bancas disponíveis para exemplo
const bancas = [
  'Confecções Maria Ltda',
  'Costura Express',
  'Malhas do Sul',
  'Costura Rápida ME',
  'Confecções Oliveira',
  'Atelier Fashion',
  'Tecidos & Cia',
  'Costura Fina',
  'Bordados Silva',
  'Facção Têxtil'
];

// Produtos para exemplo
const produtos = [
  'Camiseta Básica',
  'Calça Jeans',
  'Vestido Festa',
  'Uniforme Escolar',
  'Blusa Feminina',
  'Jaqueta Inverno',
  'Shorts Esportivo',
  'Pijama Infantil',
  'Camisa Social',
  'Avental Restaurante'
];

// Cores para exemplo
const cores = [
  'Azul',
  'Preto',
  'Branco',
  'Vermelho',
  'Verde',
  'Amarelo',
  'Rosa',
  'Cinza',
  'Marrom',
  'Laranja'
];

// Função para gerar uma data aleatória dentro de um intervalo
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Gerar fichas em produção
export const fichasEmProducao: Ficha[] = Array(35).fill(null).map((_, index) => {
  const dataEntrada = randomDate(subDays(new Date(), 30), new Date());
  return {
    id: `EP-${index + 1000}`,
    codigo: `FICHA-${Math.floor(1000 + Math.random() * 9000)}`,
    banca: bancas[Math.floor(Math.random() * bancas.length)],
    dataEntrada,
    dataPrevisao: addDays(dataEntrada, Math.floor(Math.random() * 20) + 5),
    quantidade: Math.floor(Math.random() * 500) + 50,
    status: "em-producao",
    produto: produtos[Math.floor(Math.random() * produtos.length)],
    cor: cores[Math.floor(Math.random() * cores.length)],
    observacoes: "Ficha em produção"
  };
});

// Gerar fichas concluídas
export const fichasConcluidas: Ficha[] = Array(20).fill(null).map((_, index) => {
  const dataEntrada = randomDate(subDays(new Date(), 60), subDays(new Date(), 30));
  return {
    id: `CO-${index + 2000}`,
    codigo: `FICHA-${Math.floor(1000 + Math.random() * 9000)}`,
    banca: bancas[Math.floor(Math.random() * bancas.length)],
    dataEntrada,
    dataPrevisao: addDays(dataEntrada, Math.floor(Math.random() * 20) + 5),
    quantidade: Math.floor(Math.random() * 500) + 50,
    status: "concluido",
    produto: produtos[Math.floor(Math.random() * produtos.length)],
    cor: cores[Math.floor(Math.random() * cores.length)],
    observacoes: "Ficha concluída"
  };
});

// Gerar fichas aguardando retirada
export const fichasAguardandoRetirada: Ficha[] = Array(15).fill(null).map((_, index) => {
  const dataEntrada = randomDate(subDays(new Date(), 5), new Date());
  return {
    id: `AR-${index + 3000}`,
    codigo: `FICHA-${Math.floor(1000 + Math.random() * 9000)}`,
    banca: bancas[Math.floor(Math.random() * bancas.length)],
    dataEntrada,
    dataPrevisao: addDays(dataEntrada, Math.floor(Math.random() * 20) + 5),
    quantidade: Math.floor(Math.random() * 500) + 50,
    status: "aguardando-retirada",
    produto: produtos[Math.floor(Math.random() * produtos.length)],
    cor: cores[Math.floor(Math.random() * cores.length)],
    observacoes: "Aguardando retirada pela banca"
  };
});

// Combinar todas as fichas
export const todasFichas: Ficha[] = [
  ...fichasEmProducao,
  ...fichasConcluidas,
  ...fichasAguardandoRetirada
];

// Gerar movimentações para uma ficha
export const gerarMovimentacoesMock = (fichaId: string): Movimentacao[] => {
  const movimentacoes: Movimentacao[] = [];
  const numMovimentacoes = Math.floor(Math.random() * 5) + 1;
  
  for (let i = 0; i < numMovimentacoes; i++) {
    movimentacoes.push({
      id: `MOV-${fichaId}-${i}`,
      fichaId,
      data: randomDate(subDays(new Date(), 30), new Date()),
      tipo: ["Entrada", "Saída", "Retorno", "Conclusão"][Math.floor(Math.random() * 4)] as any,
      quantidade: Math.floor(Math.random() * 100) + 10,
      descricao: "Movimentação realizada pela banca",
      responsavel: "Usuário Teste"
    });
  }
  
  return movimentacoes;
}; 