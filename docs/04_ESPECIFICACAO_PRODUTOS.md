# Especificação Técnica: Rotina de Produtos (Catálogo)

Este documento detalha os requisitos, estrutura de dados, regras de negócio e interfaces para a gestão de Produtos (Catálogo) dentro do sistema OMNI.

## 1. Visão Geral
O módulo de Produtos é o núcleo do catálogo do OMNI. Ele é responsável por manter a base central de mercadorias (SKUs) que serão sincronizadas e vendidas nos marketplaces, além de servir como base para a rotina de Estoque e Logística (conferência via código de barras).

## 2. Modelo de Dados (Banco de Dados)

### Tabela: `produtos`
Esta tabela armazena as informações principais e fiscais de cada item.

| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | UUID / INT | PK | Identificador único do produto |
| `id_empresa` | UUID / INT | FK | Vínculo com a tabela `empresas` (Multi-tenant) |
| `sku` | VARCHAR(50) | UNIQUE, INDEX | Código único de controle interno (SKU) |
| `codigo_barras` | VARCHAR(50) | INDEX | EAN / GTIN utilizado na bipagem logística |
| `nome` | VARCHAR(255)| NOT NULL | Nome / Título comercial do produto |
| `descricao` | TEXT | | Descrição detalhada para os marketplaces |
| `preco_venda` | DECIMAL(10,2)| NOT NULL | Preço base de venda |
| `preco_custo` | DECIMAL(10,2)| | Custo de aquisição para relatórios de lucro |
| `peso` | DECIMAL(10,3)| | Peso em kg (ex: 1.500) |
| `dimensoes` | VARCHAR(100)| | Dimensões formatadas ou campos separados (A,L,P) |
| `ativo` | BOOLEAN | DEFAULT 1 | Status do produto (Soft Delete ou Inativação) |
| `created_at` | TIMESTAMP | | Data de criação |
| `updated_at` | TIMESTAMP | | Última atualização |

### Relacionamento com Estoque (`estoque`)
Para cada produto, existirá uma relação 1:1 ou 1:N com a tabela `estoque`.
- `quantidade_disponivel`: Saldo livre para venda.
- `quantidade_reservada`: Saldo aguardando faturamento/expedição.

## 3. Endpoints (API REST)

O backend em NestJS exporá as seguintes rotas baseadas na controller de Produtos:

- **GET `/api/v1/produtos`**
  - **Descrição:** Lista produtos com suporte a paginação e filtros.
  - **Query Params:** `page`, `limit`, `busca` (por nome, sku ou ean), `ativo`.
  - **Retorno:** Lista de produtos com totalizadores.

- **GET `/api/v1/produtos/:id`**
  - **Descrição:** Retorna os detalhes de um produto específico.

- **POST `/api/v1/produtos`**
  - **Descrição:** Criação de um novo produto.
  - **Body:** `{ sku, codigo_barras, nome, descricao, preco_venda, peso... }`
  - **Validações:** O `sku` deve ser único na base da empresa.

- **PUT `/api/v1/produtos/:id`**
  - **Descrição:** Atualização total ou parcial de um produto existente.

- **DELETE `/api/v1/produtos/:id`**
  - **Descrição:** Inativação do produto (Soft Delete) ou exclusão física caso não haja vínculo com pedidos.

## 4. Regras de Negócio (RNs)

- **RN-PROD-001 (Unicidade de SKU):** Não podem existir dois produtos com o mesmo SKU (Stock Keeping Unit) para a mesma empresa.
- **RN-PROD-002 (Integridade Referencial):** Um produto não pode ser excluído fisicamente se já houver histórico de vendas (pedidos) atrelados a ele. Neste caso, o produto deve ser apenas **inativado** (`ativo = false`).
- **RN-PROD-003 (Validação de Código de Barras):** É altamente recomendado que o `codigo_barras` não seja nulo, pois ele é fundamental para a funcionalidade de conferência e bipagem.
- **RN-PROD-004 (Sincronização de Catálogo):** Ao atualizar preço ou informações chave do produto, o sistema deverá (no futuro ou de imediato) acionar um evento para atualizar o produto nos marketplaces integrados.

## 5. Interface do Usuário (Frontend - React)

A área de produtos contará com:
1. **Tela de Listagem (Data Table):**
   - Tabela com colunas: SKU, Nome, Preço, Estoque Disponível, Status.
   - Barra de busca global (por nome, código de barras ou SKU).
   - Botões de ação para "Editar" e "Inativar" em cada linha.
   - Botão "Novo Produto".

2. **Formulário de Cadastro/Edição:**
   - Campos divididos em seções: 
     - *Informações Básicas* (Nome, SKU, Código de Barras, Descrição).
     - *Precificação* (Preço de Venda, Preço de Custo).
     - *Logística* (Peso, Dimensões).
   - Validação inline com feedback visual usando Shadcn UI.

## 6. Fluxos Futuros e Extensões
- **Importação/Exportação:** Funcionalidade para enviar planilha CSV/Excel e cadastrar SKUs em lote.
- **Vínculos Multi-SKU (Kits):** Um produto OMNI que representa um combo/kit composto por múltiplas unidades de produtos mais simples.
- **Variações:** Produtos com grade (Cor, Tamanho).
