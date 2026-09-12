# ESPECIFICAÇÃO TÉCNICA OMNI — SETEMALHAS

Este documento consolida as 28 regras arquiteturais e de negócio do sistema.

## 01. Resumo Executivo
O sistema OMNI é uma plataforma centralizadora de e-commerce e logística. Ele consolida operações de 9 marketplaces globais e regionais em um único painel. Inicialmente hospedado localmente via XAMPP (MySQL) + Node.js (NestJS) e interface em React, o sistema garantirá controle de estoque, processamento de pedidos (via polling) e um fluxo de expedição à prova de falhas com bipagem de produtos.

## 02. Entendimento da Aplicação
A aplicação atua como o cérebro da operação. O objetivo é evitar ruptura de estoque multicanal, garantir que o produto correto seja embalado (conferência) e despachado, além de gerenciar permissões rígidas para que operadores vejam apenas o que lhes compete. 

## 03. Objetivos
- Unificar a gestão de pedidos de 9 marketplaces.
- Prevenir vendas sem estoque através de reservas via banco de dados.
- Eliminar erros de envio utilizando conferência por código de barras.
- Preparar a aplicação local (XAMPP) para uma transição fluida para Cloud no futuro.

## 04. Usuários
- **Administrador / Owner:** Acesso total (Dashboards, Financeiro, Credenciais de APIs).
- **Gerente de Operações:** Acesso a Relatórios, Estoque, Pedidos, Produtos.
- **Conferente / Operador de Logística:** Acesso restrito às telas de Conferência e Expedição.
- **Auditor / Financeiro:** Acesso a Relatórios e Dados Financeiros.

## 05. Módulos
1. **Autenticação & RBAC:** Login e controle de acesso.
2. **Catálogo & Estoque:** Gestão de Produtos (SKU) e saldo.
3. **Marketplaces (Sincronizador):** Engine de Polling para buscar pedidos e enviar saldo.
4. **Central de Pedidos:** Listagem e status dos pedidos.
5. **Logística (Conferência e Expedição):** Bipagem e despacho.
6. **Financeiro & Relatórios:** Consolidação de taxas e lucro.

## 06. Requisitos Funcionais
- **RF-001:** Autenticar usuários e validar papéis (RBAC).
- **RF-002:** Cadastro de credenciais de marketplaces (criptografadas).
- **RF-003:** Realizar *Polling* a cada X minutos para buscar novos pedidos.
- **RF-004:** Bipar código de barras (SKU) na Conferência.
- **RF-005:** Um pedido só avança para "Conferido" se todos os itens forem validados.
- **RF-006:** A expedição deve registrar transportadora e rastreio.

## 07. Requisitos Não Funcionais
- **Performance:** O job de polling não deve bloquear a API principal.
- **Segurança:** Senhas de banco e credenciais de API criptografadas (AES-256).
- **Escalabilidade:** O backend deve ser *Stateless*.
- **UI/UX:** Estética premium, feedback visual claro em caso de erro na bipagem.

## 08. Regras de Negócio
- **RN-001 (Reserva de Estoque):** Pedido importado deve abater o `estoque.quantidade_disponivel` e somar em `estoque.quantidade_reservada`.
- **RN-002 (Estorno):** Se pedido for cancelado, a quantidade reservada retorna ao disponível.
- **RN-003 (Conferência Restrita):** Sistema bloqueia aprovar a conferência se faltar itens.
- **RN-004 (Rate Limit):** Polling deve respeitar as janelas de requisição dos marketplaces.

## 09. Casos de Uso (Principal)
**Conferência de Pedido**
Ator: Conferente.
Ação: Abre conferência, bipa o produto físico. Sistema cruza com o SKU. Se bater, marca como "Separado". Ao finalizar todos, muda pedido para "Conferido".

## 10. Fluxos
`Cron Job` -> `Bate nas APIs` -> `Baixa Pedidos` -> `Salva MySQL` -> `Reserva Estoque` -> `Conferente Bipa` -> `Status 'Conferido'` -> `Expedição` -> `Tracking`.

## 11. Arquitetura
- **Frontend:** React + Vite, TailwindCSS, Shadcn.
- **Backend:** Node.js com NestJS.
- **Banco de Dados:** MySQL (XAMPP).
- **Background Jobs:** NestJS `@Cron` para Polling.

## 12. POO / SOLID
- **S (Single Responsibility):** Services específicos por regra de negócio.
- **O (Open/Closed):** Interfaces genéricas (`IMarketplaceAdapter`) para fácil expansão.
- **D (Dependency Inversion):** Injeção de dependência via NestJS DI.

## 13. Banco de Dados
- Tabelas base: `empresas`, `produtos`, `estoque`, `pedidos`, `itens_pedido`, `conferencias`, `integracoes_marketplace`.
- Segurança: `usuarios`, `roles`, `auditoria_logs`.

## 14. APIs (Contratos REST)
- `POST /api/v1/auth/login`
- `GET /api/v1/pedidos?status=Pendente`
- `POST /api/v1/conferencia/{id_pedido}/bipar`
- `POST /api/v1/expedicao/{id_pedido}`

## 15. Eventos e Polling
Engine acorda a cada 5 minutos, consulta credenciais, bate nas APIs (Magalu, Shopee, etc.) baixando novos pedidos e salva em banco via transações (Bulk Insert).

## 16. Segurança
- JWT (JSON Web Tokens) para Frontend/Backend.
- AES-GCM-256 para salvar Tokens/Client Secrets.

## 17. Performance
- Índices (`INDEX`) nas colunas: `sku`, `status`, `id_pedido_marketplace`.
- Batch processing no Polling para não estourar memória.

## 18. Casos Extremos (Edge Cases)
- **SKU Órfão:** Marketplace vende produto apagado do OMNI.
- **Queda de Rede Local:** CRON de polling tenta acessar e falha silenciosamente.
- **Bipagem Duplicada:** Operador bipa 3x um produto de QTD 2. Sistema rejeita o 3º bipe.

## 19. Estratégia de Testes
- **Unitários:** Adapters dos Marketplaces.
- **Integração:** Fluxo de Conferencia.
- **Segurança:** Testes de rotas proibidas (RBAC).

## 20. Casos de Teste
- **CT-001:** Logar como Admin (Dashboard liberado).
- **CT-002:** Bipar SKU correto (Linha verde, quantidade sobe).
- **CT-003:** Bipar SKU errado (Tela vermelha, bloqueio, som de erro).

## 21. Critérios de Aceite
*Dado que* sou um Operador Logístico logado,
*Quando* eu bipar todos os produtos exigidos em um pedido,
*Então* a tela deve parabenizar a conferência e transferir o pedido para "Prontos para Expedição".

## 22. Riscos Técnicos
- XAMPP corromper banco de dados. Mitigação: Backups.
- Mudanças nas APIs dos 9 marketplaces.

## 23. Débito Técnico Adquirido
- Polling consumirá mais CPU que Webhooks, mas é justificado pela hospedagem local atual.

## 24. Dependências
- XAMPP Server (MySQL porta 3306).
- Node.js 18+.
- Contas ativas nos 9 Marketplaces.

## 25 a 28. Checklist e Backlog
- Setup de Infra -> CRUD de Produtos -> Engine de Polling -> Logística (Conferência) -> Novos Marketplaces.
