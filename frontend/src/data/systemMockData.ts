import { Ficha, Movimentacao } from '@/services/fichasService';
import { Bobina } from '@/services/materiaPrimaService';
import { Produto } from '@/services/produtosService';
import { Banca } from '@/services/bancasService';

// ==========================================
// BANCAS MOCK (Oficinas de Costura)
// ==========================================
export const mockBancas: Banca[] = [
  {
    id: "banca-1",
    nome: "Confecções Silva & Filhos ME",
    cnpj: "12.345.678/0001-90",
    contato: "Dona Maria Silva",
    telefone: "(11) 98765-4321",
    endereco: "Rua Têxtil, 120 - Brás, São Paulo - SP",
    valorPorPeca: 4.50,
    tipo: "banca"
  },
  {
    id: "banca-2",
    nome: "Atelier Costura Rápida",
    cnpj: "98.765.432/0001-10",
    contato: "Seu Roberto Souza",
    telefone: "(11) 97654-3210",
    endereco: "Av. das Malhas, 450 - Bom Retiro, São Paulo - SP",
    valorPorPeca: 4.80,
    tipo: "banca"
  },
  {
    id: "banca-3",
    nome: "Facção Têxtil Progresso",
    cnpj: "45.678.901/0001-23",
    contato: "Carlos Eduardo",
    telefone: "(11) 96543-2109",
    endereco: "Rua dos Costureiros, 88 - Vila Maria, São Paulo - SP",
    valorPorPeca: 4.20,
    tipo: "banca"
  },
  {
    id: "banca-4",
    nome: "Confecções Bella Moda Ltda",
    cnpj: "33.222.111/0001-55",
    contato: "Luciana Oliveira",
    telefone: "(11) 95432-1098",
    endereco: "Rua Oriente, 310 - Brás, São Paulo - SP",
    valorPorPeca: 5.00,
    tipo: "banca"
  },
  {
    id: "banca-5",
    nome: "Oficina Ponto Nobre",
    cnpj: "66.777.888/0001-44",
    contato: "Marcos Antônio",
    telefone: "(11) 94321-0987",
    endereco: "Rua Silva Teles, 520 - Pari, São Paulo - SP",
    valorPorPeca: 4.60,
    tipo: "banca"
  }
];

// ==========================================
// PRODUTOS MOCK (Peças Acabadas)
// ==========================================
export const mockProdutos: Produto[] = [
  {
    id: "prod-1",
    nome_produto: "Camiseta Masculina Gola Careca Algodão 30.1",
    sku: "CAM-MAS-301-BLK",
    categoria: "Camisetas",
    valor_unitario: 49.90,
    quantidade: 450,
    estoque_minimo: 100,
    localizacao: "Corredor A - Prateleira 2",
    unidade_medida: "UN",
    fornecedor: "Sete Malhas Interno",
    descricao: "Camiseta 100% Algodão Penteado 30.1 com costura reforçada de ombro a ombro."
  },
  {
    id: "prod-2",
    nome_produto: "Camisa Polo Piquet Premium",
    sku: "POL-PQ-NVY",
    categoria: "Polos",
    valor_unitario: 89.90,
    quantidade: 280,
    estoque_minimo: 50,
    localizacao: "Corredor B - Prateleira 1",
    unidade_medida: "UN",
    fornecedor: "Sete Malhas Interno",
    descricao: "Polo em malha piquet com gola retilínea e bordado no peito."
  },
  {
    id: "prod-3",
    nome_produto: "Regata Feminina Ribana Canelada",
    sku: "REG-FEM-RIB-WHT",
    categoria: "Regatas",
    valor_unitario: 39.90,
    quantidade: 520,
    estoque_minimo: 80,
    localizacao: "Corredor A - Prateleira 4",
    unidade_medida: "UN",
    fornecedor: "Sete Malhas Interno",
    descricao: "Regata ajustada ao corpo em ribana 2x1 com excelente elasticidade."
  },
  {
    id: "prod-4",
    nome_produto: "Blusão Moletom Capuz Flannel",
    sku: "MOL-CAP-GRY",
    categoria: "Moletons",
    valor_unitario: 149.90,
    quantidade: 180,
    estoque_minimo: 40,
    localizacao: "Corredor C - Prateleira 3",
    unidade_medida: "UN",
    fornecedor: "Sete Malhas Interno",
    descricao: "Moletom 3 cabos flanelado com bolso canguru e acabamento de alta qualidade."
  },
  {
    id: "prod-5",
    nome_produto: "Calça Jogger Moletinho com Cordão",
    sku: "CAL-JOG-MOL-BLK",
    categoria: "Calças",
    valor_unitario: 99.90,
    quantidade: 210,
    estoque_minimo: 60,
    localizacao: "Corredor C - Prateleira 1",
    unidade_medida: "UN",
    fornecedor: "Sete Malhas Interno",
    descricao: "Calça jogger confortável com punho em ribana e bolsos laterais."
  },
  {
    id: "prod-6",
    nome_produto: "Pijama Manga Longa Viscolycra",
    sku: "PIJ-VIS-BLU",
    categoria: "Pijamas",
    valor_unitario: 119.90,
    quantidade: 140,
    estoque_minimo: 30,
    localizacao: "Corredor D - Prateleira 2",
    unidade_medida: "UN",
    fornecedor: "Sete Malhas Interno",
    descricao: "Conjunto de pijama super macio em viscolycra toque suave."
  }
];

// ==========================================
// MATÉRIA-PRIMA MOCK (Bobinas de Tecido)
// ==========================================
export const mockBobinas: Bobina[] = [
  {
    id: "bob-101",
    tipo_tecido: "Meia Malha Algodão 30.1",
    cor: "Preto Reativo",
    lote: "LOTE-2026-089",
    fornecedor: "Têxtil Cataguases",
    quantidade_total: 120.50,
    quantidade_disponivel: 95.00,
    unidade: "KG",
    localizacao: "Depósito 1 - Rolo 14",
    data_entrada: "2026-07-15",
    status: "em_estoque",
    codigo_barras: "7891234560011",
    codigoBarras: "7891234560011",
    observacoes: "Tecido penteado de alta densidade."
  },
  {
    id: "bob-102",
    tipo_tecido: "Meia Malha Algodão 30.1",
    cor: "Branco Neve",
    lote: "LOTE-2026-090",
    fornecedor: "Têxtil Cataguases",
    quantidade_total: 150.00,
    quantidade_disponivel: 142.50,
    unidade: "KG",
    localizacao: "Depósito 1 - Rolo 18",
    data_entrada: "2026-07-18",
    status: "em_estoque",
    codigo_barras: "7891234560028",
    codigoBarras: "7891234560028",
    observacoes: "Perfeito para tingimento ou estamparia."
  },
  {
    id: "bob-103",
    tipo_tecido: "Ribana 2x1 Canelada",
    cor: "Preto Reativo",
    lote: "LOTE-2026-077",
    fornecedor: "Malharia Santa Maria",
    quantidade_total: 80.00,
    quantidade_disponivel: 12.00,
    unidade: "KG",
    localizacao: "Depósito 1 - Rolo 03",
    data_entrada: "2026-07-02",
    status: "baixo_estoque",
    codigo_barras: "7891234560035",
    codigoBarras: "7891234560035",
    observacoes: "Para punhos e golas. Reposição solicitada."
  },
  {
    id: "bob-104",
    tipo_tecido: "Moletom 3 Cabos Flanelado",
    cor: "Cinza Mescla",
    lote: "LOTE-2026-065",
    fornecedor: "Vicunha Têxtil",
    quantidade_total: 200.00,
    quantidade_disponivel: 185.00,
    unidade: "KG",
    localizacao: "Depósito 2 - Rolo 09",
    data_entrada: "2026-07-10",
    status: "em_estoque",
    codigo_barras: "7891234560042",
    codigoBarras: "7891234560042",
    observacoes: "Espessura encorpada para casacos de inverno."
  },
  {
    id: "bob-105",
    tipo_tecido: "Malha Piquet 100% Algodão",
    cor: "Azul Marinho",
    lote: "LOTE-2026-054",
    fornecedor: "Malharia Santa Maria",
    quantidade_total: 90.00,
    quantidade_disponivel: 0.00,
    unidade: "KG",
    localizacao: "Depósito 2 - Rolo 01",
    data_entrada: "2026-06-25",
    status: "sem_estoque",
    codigo_barras: "7891234560059",
    codigoBarras: "7891234560059",
    observacoes: "Totalmente consumido no último lote de Polos."
  },
  {
    id: "bob-106",
    tipo_tecido: "Viscolycra Premium",
    cor: "Vinho Marsala",
    lote: "LOTE-2026-092",
    fornecedor: "Pettenati Têxtil",
    quantidade_total: 110.00,
    quantidade_disponivel: 88.00,
    unidade: "KG",
    localizacao: "Depósito 1 - Rolo 22",
    data_entrada: "2026-07-20",
    status: "em_estoque",
    codigo_barras: "7891234560066",
    codigoBarras: "7891234560066",
    observacoes: "Toque macio, fluidez garantida."
  }
];

// ==========================================
// FICHAS DE PRODUÇÃO MOCK
// ==========================================
export const mockFichas: Ficha[] = [
  {
    id: 1001,
    codigo: "FICHA-2026-001",
    banca: "Confecções Silva & Filhos ME",
    data_entrada: "2026-07-15",
    data_previsao: "2026-07-30",
    quantidade: 350,
    quantidade_recebida: 200,
    quantidade_perdida: 3,
    status: "recebido_parcialmente",
    produto: "Camiseta Masculina Gola Careca Algodão 30.1",
    produto_id: "prod-1",
    cor: "Preto Reativo",
    tamanho: "M",
    observacoes: "Atenção especial ao acabamento da gola em ribana."
  },
  {
    id: 1002,
    codigo: "FICHA-2026-002",
    banca: "Atelier Costura Rápida",
    data_entrada: "2026-07-18",
    data_previsao: "2026-08-02",
    quantidade: 250,
    quantidade_recebida: 250,
    quantidade_perdida: 2,
    status: "concluido",
    produto: "Camisa Polo Piquet Premium",
    produto_id: "prod-2",
    cor: "Azul Marinho",
    tamanho: "G",
    observacoes: "Lote concluído dentro do prazo estipulado."
  },
  {
    id: 1003,
    codigo: "FICHA-2026-003",
    banca: "Facção Têxtil Progresso",
    data_entrada: "2026-07-22",
    data_previsao: "2026-08-05",
    quantidade: 400,
    quantidade_recebida: 0,
    quantidade_perdida: 0,
    status: "em_producao",
    produto: "Regata Feminina Ribana Canelada",
    produto_id: "prod-3",
    cor: "Branco Neve",
    tamanho: "P",
    observacoes: "Costura de viés duplo nos ombros."
  },
  {
    id: 1004,
    codigo: "FICHA-2026-004",
    banca: "Confecções Bella Moda Ltda",
    data_entrada: "2026-07-25",
    data_previsao: "2026-08-10",
    quantidade: 180,
    quantidade_recebida: 0,
    quantidade_perdida: 0,
    status: "aguardando_retirada",
    produto: "Blusão Moletom Capuz Flannel",
    produto_id: "prod-4",
    cor: "Cinza Mescla",
    tamanho: "GG",
    observacoes: "Corte realizado. Aguardando a retirada pela facção."
  },
  {
    id: 1005,
    codigo: "FICHA-2026-005",
    banca: "Oficina Ponto Nobre",
    data_entrada: "2026-07-10",
    data_previsao: "2026-07-26",
    quantidade: 300,
    quantidade_recebida: 300,
    quantidade_perdida: 5,
    status: "concluido",
    produto: "Calça Jogger Moletinho com Cordão",
    produto_id: "prod-5",
    cor: "Preto Reativo",
    tamanho: "M",
    observacoes: "Entregue e inspecionado pelo controle de qualidade."
  },
  {
    id: 1006,
    codigo: "FICHA-2026-006",
    banca: "Confecções Silva & Filhos ME",
    data_entrada: "2026-07-26",
    data_previsao: "2026-08-08",
    quantidade: 220,
    quantidade_recebida: 80,
    quantidade_perdida: 1,
    status: "recebido_parcialmente",
    produto: "Pijama Manga Longa Viscolycra",
    produto_id: "prod-6",
    cor: "Vinho Marsala",
    tamanho: "G",
    observacoes: "Primeira remessa entregue com sucesso."
  }
];

// ==========================================
// MOVIMENTAÇÕES DE FICHAS MOCK
// ==========================================
export const mockMovimentacoes: Movimentacao[] = [
  {
    id: 501,
    ficha_id: 1001,
    data: "2026-07-15T09:30:00Z",
    tipo: "Entrada",
    quantidade: 350,
    descricao: "Ficha gerada no sistema e corte finalizado.",
    responsavel: "Operador de Corte (Sete Malhas)"
  },
  {
    id: 502,
    ficha_id: 1001,
    data: "2026-07-16T14:15:00Z",
    tipo: "Saída",
    quantidade: 350,
    descricao: "Ficha retirada pela oficina Confecções Silva.",
    responsavel: "Dona Maria Silva"
  },
  {
    id: 503,
    ficha_id: 1001,
    data: "2026-07-23T11:00:00Z",
    tipo: "Retorno",
    quantidade: 200,
    descricao: "Entrega parcial de 200 peças prontas.",
    responsavel: "Expedição Sete Malhas"
  },
  {
    id: 504,
    ficha_id: 1001,
    data: "2026-07-23T11:00:00Z",
    tipo: "Perda",
    quantidade: 3,
    descricao: "3 peças com defeito de costura irrecuperável.",
    responsavel: "Controle de Qualidade"
  }
];

// ==========================================
// FECHAMENTO SEMANAL MOCK
// ==========================================
export const mockFechamentoSemanal = {
  resumoGeral: {
    totalPecasCortadas: 1700,
    totalPecasRecebidas: 830,
    totalPecasPerdidas: 11,
    totalPecasEmProducao: 858,
    valorTotalAPagar: 3818.00,
    valorTotalPago: 2500.00,
    valorPendente: 1318.00
  },
  bancasFechamento: [
    {
      banca_id: "banca-1",
      banca_nome: "Confecções Silva & Filhos ME",
      pecas_cortadas: 570,
      pecas_recebidas: 280,
      pecas_perdidas: 4,
      valor_por_peca: 4.50,
      total_a_pagar: 1260.00,
      total_pago: 1000.00,
      saldo_pendente: 260.00,
      status_pagamento: "pago_parcialmente",
      fichas_associadas: [1001, 1006]
    },
    {
      banca_id: "banca-2",
      banca_nome: "Atelier Costura Rápida",
      pecas_cortadas: 250,
      pecas_recebidas: 250,
      pecas_perdidas: 2,
      valor_por_peca: 4.80,
      total_a_pagar: 1200.00,
      total_pago: 1200.00,
      saldo_pendente: 0.00,
      status_pagamento: "pago",
      fichas_associadas: [1002]
    },
    {
      banca_id: "banca-5",
      banca_nome: "Oficina Ponto Nobre",
      pecas_cortadas: 300,
      pecas_recebidas: 300,
      pecas_perdidas: 5,
      valor_por_peca: 4.60,
      total_a_pagar: 1380.00,
      total_pago: 300.00,
      saldo_pendente: 1080.00,
      status_pagamento: "pendente",
      fichas_associadas: [1005]
    }
  ]
};

// ==========================================
// DADOS DE RELATÓRIOS E ESTATÍSTICAS MOCK
// ==========================================
export const mockRelatoriosDados = {
  mensal: [
    { mes: "Jan", cortadas: 3200, recebidas: 3100, perdidas: 45 },
    { mes: "Fev", cortadas: 3500, recebidas: 3420, perdidas: 38 },
    { mes: "Mar", cortadas: 4100, recebidas: 3980, perdidas: 52 },
    { mes: "Abr", cortadas: 3800, recebidas: 3750, perdidas: 40 },
    { mes: "Mai", cortadas: 4600, recebidas: 4510, perdidas: 60 },
    { mes: "Jun", cortadas: 4900, recebidas: 4820, perdidas: 55 },
    { mes: "Jul", cortadas: 5200, recebidas: 4950, perdidas: 48 }
  ],
  porBanca: [
    { banca: "Confecções Silva ME", recebidas: 1450, perdidas: 18, cortadas: 1800 },
    { banca: "Atelier Costura Rápida", recebidas: 1200, perdidas: 12, cortadas: 1350 },
    { banca: "Facção Têxtil Progresso", recebidas: 980, perdidas: 15, cortadas: 1100 },
    { banca: "Confecções Bella Moda", recebidas: 850, perdidas: 9, cortadas: 950 },
    { banca: "Oficina Ponto Nobre", recebidas: 1100, perdidas: 14, cortadas: 1250 }
  ]
};

// ==========================================
// CLIENTES, FORNECEDORES, VENDAS, COMPRAS MOCK
// ==========================================
export const mockClientes = [
  { id: "cli-1", nome: "Boutique Moda & Estilo Ltda", email: "contato@boutiquemoda.com.br", telefone: "(11) 3344-5566", cidade: "São Paulo - SP", cnpj: "22.333.444/0001-88" },
  { id: "cli-2", nome: "Lojas Vest bem Eireli", email: "compras@lojasvestbem.com", telefone: "(19) 3876-1234", cidade: "Campinas - SP", cnpj: "11.444.777/0001-99" },
  { id: "cli-3", nome: "Distribuidora Têxtil Brasil", email: "vendas@distribuidoratextil.com", telefone: "(47) 3456-7890", cidade: "Blumenau - SC", cnpj: "55.666.777/0001-33" }
];

export const mockFornecedores = [
  { id: "for-1", nome: "Têxtil Cataguases S/A", email: "contato@cataguases.com.br", telefone: "(32) 3429-1000", produto_principal: "Fios e Tecidos de Algodão" },
  { id: "for-2", nome: "Malharia Santa Maria Ltda", email: "vendas@santamariamalhas.com.br", telefone: "(47) 3371-2000", produto_principal: "Ribanas e Meia Malha" },
  { id: "for-3", nome: "Pettenati Indústria Têxtil", email: "comercial@pettenati.com.br", telefone: "(54) 2101-3000", produto_principal: "Viscolycra e Soft" }
];

export const mockTerceiros = [
  {
    idTerceiro: "ter-1",
    id: "ter-1",
    nome: "Confecções Silva & Filhos ME",
    cnpj: "12.345.678/0001-90",
    email: "contato@silvaconfeccoes.com",
    telefone: "(11) 98765-4321",
    endereco: "Rua Têxtil, 120",
    cidade: "São Paulo",
    estado: "SP",
    cep: "03001-000",
    tipo: "banca",
    chave_pix: "12.345.678/0001-90",
    numero: "120"
  },
  {
    idTerceiro: "ter-2",
    id: "ter-2",
    nome: "Atelier Costura Rápida",
    cnpj: "98.765.432/0001-10",
    email: "roberto@costurarapida.com.br",
    telefone: "(11) 97654-3210",
    endereco: "Av. das Malhas, 450",
    cidade: "São Paulo",
    estado: "SP",
    cep: "01123-010",
    tipo: "banca",
    chave_pix: "roberto@costurarapida.com.br",
    numero: "450"
  },
  {
    idTerceiro: "ter-3",
    id: "ter-3",
    nome: "Facção Têxtil Progresso",
    cnpj: "45.678.901/0001-23",
    email: "carlos@faccaoprogresso.com",
    telefone: "(11) 96543-2109",
    endereco: "Rua dos Costureiros, 88",
    cidade: "São Paulo",
    estado: "SP",
    cep: "02115-020",
    tipo: "banca",
    chave_pix: "45.678.901/0001-23",
    numero: "88"
  },
  {
    idTerceiro: "ter-4",
    id: "ter-4",
    nome: "Confecções Bella Moda Ltda",
    cnpj: "33.222.111/0001-55",
    email: "luciana@bellamoda.com.br",
    telefone: "(11) 95432-1098",
    endereco: "Rua Oriente, 310",
    cidade: "São Paulo",
    estado: "SP",
    cep: "03016-000",
    tipo: "banca",
    chave_pix: "33.222.111/0001-55",
    numero: "310"
  },
  {
    idTerceiro: "ter-5",
    id: "ter-5",
    nome: "Oficina Ponto Nobre",
    cnpj: "66.777.888/0001-44",
    email: "marcos@pontonobre.com",
    telefone: "(11) 94321-0987",
    endereco: "Rua Silva Teles, 520",
    cidade: "São Paulo",
    estado: "SP",
    cep: "03026-001",
    tipo: "banca",
    chave_pix: "11943210987",
    numero: "520"
  },
  {
    idTerceiro: "ter-6",
    id: "ter-6",
    nome: "Têxtil Cataguases S/A",
    cnpj: "33.444.555/0001-66",
    email: "contato@cataguases.com.br",
    telefone: "(32) 3429-1000",
    endereco: "Av. Têxtil, 1000",
    cidade: "Cataguases",
    estado: "MG",
    cep: "36770-000",
    tipo: "fornecedor",
    chave_pix: "33.444.555/0001-66",
    numero: "1000"
  },
  {
    idTerceiro: "ter-7",
    id: "ter-7",
    nome: "Malharia Santa Maria Ltda",
    cnpj: "77.888.999/0001-22",
    email: "vendas@santamariamalhas.com.br",
    telefone: "(47) 3371-2000",
    endereco: "Rua Industrial, 500",
    cidade: "Jaraguá do Sul",
    estado: "SC",
    cep: "89251-000",
    tipo: "fornecedor",
    chave_pix: "vendas@santamariamalhas.com.br",
    numero: "500"
  },
  {
    idTerceiro: "ter-8",
    id: "ter-8",
    nome: "Pettenati Indústria Têxtil",
    cnpj: "88.999.000/0001-44",
    email: "comercial@pettenati.com.br",
    telefone: "(54) 2101-3000",
    endereco: "Rodovia BR 116, km 140",
    cidade: "Caxias do Sul",
    estado: "RS",
    cep: "95001-970",
    tipo: "fornecedor",
    chave_pix: "88.999.000/0001-44",
    numero: "s/n"
  }
];
