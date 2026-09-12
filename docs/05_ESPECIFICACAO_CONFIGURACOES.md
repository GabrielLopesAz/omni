# 05. Especificação do Módulo de Configurações

O módulo de Configurações (`src/pages/omni/Configuracoes.tsx`) é o painel de controle central do sistema OMNI. É aqui que os gestores administram os dados da empresa (Tenant), cadastram novos operadores e gerenciam as chaves secretas dos 9 marketplaces integrados.

Esta documentação define o comportamento exato que deve ser implementado no Frontend e no Backend.

---

## 1. Regras Globais e de Acesso (RBAC)

1. **Proteção de Rota (Guards):** 
   - Apenas usuários com a *Role* `ADMIN` ou `GERENTE` podem acessar a rota `/configuracoes`.
   - Se um usuário `CONFERENTE` tentar acessar (via URL direta), o React deve redirecioná-lo para `/logistica/conferencia`.
   - O Backend (NestJS) deve blindar todas as rotas da API `/api/v1/configuracoes/*` usando um `RolesGuard`. Retornar `403 Forbidden` em caso de acesso indevido.

---

## 2. Abas (Tabs) e Suas Funcionalidades

O componente já usa o `Tabs` do Shadcn UI. Abaixo o comportamento de cada aba:

### 2.1. Tab: Dados da Empresa (Tenant)
Responsável por atualizar os dados base que aparecerão em relatórios e impressões.

- **Frontend:**
  - Formulário validado com `react-hook-form` e `zod`.
  - Máscara obrigatória no campo CNPJ (ex: `12.345.678/0001-99`).
- **Backend (API):**
  - `GET /api/v1/empresa` -> Retorna os dados do tenant atrelado ao JWT do usuário logado.
  - `PUT /api/v1/empresa` -> Atualiza os dados no MySQL.

### 2.2. Tab: Usuários e Permissões
Gestão de operadores e gerentes da plataforma.

- **Frontend:**
  - Tabela listando os usuários cadastrados (Nome, Email, Role, Status).
  - Botão "Adicionar Usuário" que abre um **Modal/Dialog**.
  - O Modal deve conter os campos: Nome, Email, Senha Temporária e um `Select` de Role (Admin, Gerente, Conferente, Financeiro).
- **Backend (API):**
  - `GET /api/v1/usuarios`
  - `POST /api/v1/usuarios` -> O backend deve interceptar a "Senha Temporária", gerar o hash com `bcrypt` (Salt: 10) e salvar no MySQL.
  - `PATCH /api/v1/usuarios/{id}/status` -> Ativa/Inativa um usuário em vez de excluí-lo (Soft delete/Inactivation).
- **Regra de Negócio (RN-005):** O sistema não permite inativar ou alterar a Role do último usuário `ADMIN` do tenant.

### 2.3. Tab: Integrações e Marketplaces (O mais Crítico)
Local onde se conecta Shopee, Mercado Livre, Amazon, etc.

- **Frontend:**
  - Grid de Cards ilustrando cada Marketplace suportado.
  - Indicador visual de Status (🟢 Conectado e Sincronizando, 🔴 Erro de Autenticação, ⚪ Não Configurado).
  - Ao clicar em "Conectar", abre um Modal para inserção de credenciais (Client ID, Client Secret, Access Token).
- **Backend (API):**
  - `GET /api/v1/integracoes` -> Retorna a lista de integrações ativas. **SEGURANÇA:** O backend deve **mascarar** os tokens ao devolver para o frontend (Ex: enviar `shopee_token: "sk-*******9A8Z"` em vez da chave real).
  - `POST /api/v1/integracoes/{provedor}` -> Recebe as chaves em texto plano (via HTTPS) e, antes de salvar no banco, o NestJS deve criptografar o JSON de credenciais usando `AES-256-GCM`.

---

## 3. Gestão de Estado e Validação (Frontend)

Para manter o código limpo, sustentável e "Premium":

1. **Gerenciamento de Server State:** É obrigatório o uso de `React Query (@tanstack/react-query)` (ou `SWR`) para fazer os `GET`s das configurações. Isso permite manter um cache eficiente e fazer *Optimistic Updates* (atualizar a UI na mesma hora em que o usuário clica em salvar, sem esperar o request inteiro voltar).
2. **Validação (Zod):** Todo modal e formulário de configuração deve ter um schema do Zod garantindo, por exemplo, que um "E-mail" de novo usuário seja válido antes do botão de submit ser habilitado.
3. **Feedbacks:** O `Toast` do Shadcn UI deve ser usado intensamente aqui. Ex: "Usuário cadastrado com sucesso", "Erro ao atualizar credenciais do Mercado Livre".

---

## 4. Estratégia de Testes desta Tela

- **Teste Unitário (Backend):** Garantir que a lógica que mascara a chave secreta (`maskSecretKey`) nunca retorne o segredo puro no endpoint `GET /integracoes`.
- **Teste de Integração (Frontend):** Preencher o Modal de "Novo Usuário" com um e-mail inválido e garantir que o Zod trava a requisição disparando a mensagem de erro no input.
