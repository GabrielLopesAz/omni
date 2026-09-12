import { Ficha } from '@/components/FichasStatusModal';

// Gera uma data aleatória nos últimos 30 dias
const randomDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  return date.toLocaleDateString('pt-BR');
};

// Gera uma data futura aleatória nos próximos 30 dias
const randomFutureDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
  return date.toLocaleDateString('pt-BR');
};

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

// Descrições para exemplo
const descricoes = [
  'Camisetas básicas - lote 1500 unidades',
  'Calças jeans - acabamento especial',
  'Vestidos de festa - alta costura',
  'Uniformes escolares - 500 conjuntos',
  'Blusas femininas - bordado simples',
  'Jaquetas de inverno - forro térmico',
  'Shorts esportivos - tecido dry fit',
  'Pijamas infantis - estampa personalizada',
  'Camisas sociais - tecido anti-amassamento',
  'Aventais para restaurante - com logo bordado'
];

// Gera fichas com status aguardando retirada
export const fichasAguardandoRetirada: Ficha[] = Array(24).fill(null).map((_, index) => ({
  id: `AR-${index + 1000}`,
  codigo: `FICHA-${Math.floor(1000 + Math.random() * 9000)}`,
  banca: bancas[Math.floor(Math.random() * bancas.length)],
  dataEntrada: randomDate(),
  dataPrevisao: randomFutureDate(),
  status: 'aguardando-retirada',
  quantidade: Math.floor(Math.random() * 1000) + 100,
  descricao: descricoes[Math.floor(Math.random() * descricoes.length)]
}));

// Gera fichas com status em produção
export const fichasEmProducao: Ficha[] = Array(48).fill(null).map((_, index) => ({
  id: `EP-${index + 2000}`,
  codigo: `FICHA-${Math.floor(1000 + Math.random() * 9000)}`,
  banca: bancas[Math.floor(Math.random() * bancas.length)],
  dataEntrada: randomDate(),
  dataPrevisao: randomFutureDate(),
  status: 'em-producao',
  quantidade: Math.floor(Math.random() * 1000) + 100,
  descricao: descricoes[Math.floor(Math.random() * descricoes.length)]
}));

// Gera fichas com status recebido
export const fichasRecebidas: Ficha[] = Array(35).fill(null).map((_, index) => ({
  id: `RC-${index + 3000}`,
  codigo: `FICHA-${Math.floor(1000 + Math.random() * 9000)}`,
  banca: bancas[Math.floor(Math.random() * bancas.length)],
  dataEntrada: randomDate(),
  dataPrevisao: randomDate(), // Data de previsão já passou
  status: 'recebido',
  quantidade: Math.floor(Math.random() * 1000) + 100,
  descricao: descricoes[Math.floor(Math.random() * descricoes.length)]
})); 