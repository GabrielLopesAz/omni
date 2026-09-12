# 04. Especificação do Frontend (React + Vite + Tailwind)

Este documento dita as regras para a construção das interfaces do **Painel OMNI**, focando especificamente no módulo de **Autenticação (Login)** e **Logística (Conferência)**. Todo o desenvolvimento visual deve usar como referência os componentes já existentes no repositório base (ex: `src/pages/omni/Conferencia.tsx`).

---

## 1. Módulo de Autenticação (Login)

A tela de login é a porta de entrada e a barreira de segurança primária (RBAC).

### 1.1. Especificação Visual e Componentes
- **Layout:** *Split screen* (metade da tela com imagem/pattern corporativo do OMNI e a outra metade com o formulário centralizado).
- **Componentes Shadcn UI exigidos:** `Card`, `Input`, `Button`, `Label`, `Form`, `toast` (para mensagens de erro).
- **Comportamento Visual:**
  - O botão de "Entrar" deve apresentar um *spinner* (`Lucide-react Loader2` com `animate-spin`) enquanto a requisição à API é feita.
  - Erros de credenciais devem disparar um *Toast* (notificação no canto superior) em cor vermelha (`variant="destructive"`).

### 1.2. Integração com a API (Contexto de Estado)
- A tela fará um `POST /api/v1/auth/login`.
- **Tratamento do JWT:** O token recebido **não** deve ser guardado no `localStorage` solto sem controle. Recomenda-se criar um `AuthContext` (React Context API) ou utilizar `Zustand`.
- **Injeção de Header:** Ao logar, o token deve ser injetado nos headers do Axios (`Authorization: Bearer <token>`) para todas as requisições subsequentes.
- **Redirecionamento Condicional:**
  - Se a *role* for `ADMIN` ou `GERENTE` -> Redirecionar para o `/dashboard`.
  - Se a *role* for `CONFERENTE` -> Redirecionar direto para `/logistica/conferencia` (ele não tem acesso aos demais painéis).

---

## 2. Módulo de Logística (Bipagem / Conferência)

Esta tela é o coração operacional do estoque. O operador passará horas nela usando um leitor de código de barras.

### 2.1. Regras de Ergonomia (UX Otimizado)
- O `Input` do código de barras **deve estar sempre em foco** (`autoFocus` persistente). O operador não pode precisar usar o mouse para clicar no campo antes de bipar.
- A tela deve ocupar quase toda a altura útil (`h-[calc(100vh-8rem)]`) para máxima visibilidade, ocultando distrações não essenciais.

### 2.2. Algoritmo de Bipagem (Lógica no React)
Ao submeter o formulário (o leitor de código de barras sempre envia um `Enter` no final):
1. Captura-se a string (Ex: `789123456`).
2. Faz-se a requisição: `POST /api/v1/conferencia/{id_pedido}/bipar` enviando o código.

### 2.3. Respostas Visuais e Sonoras (Feedback)

Esta lógica de feedback é **obrigatória** para reduzir erros de despacho. O frontend deve reproduzir áudios rápidos usando a API HTML5 `<audio>`.

#### 🟢 Cenário 1: Bipagem Correta (Sucesso)
- **Condição:** API retorna 200 (Item confirmado).
- **Ação Visual:** A linha do item no pedido pisca, mudando o background para `bg-emerald-500/10` e a borda para `border-emerald-500/20`. O contador do item altera (ex: 0/1 -> 1/1) e exibe o ícone `CheckSquare`.
- **Ação Sonora:** Toca `beep-success.mp3` (Bipe curto e agradável).

#### 🔴 Cenário 2: Erro (Item Errado ou Quantidade Excedida)
- **Condição:** API retorna 400 (Erro de regra de negócio).
- **Ação Visual:** A tela principal (ou o card do leitor) deve piscar fortemente em vermelho (`bg-rose-500/20` com borda `border-rose-500`). Mostrar alerta grande centralizado temporário (`toast` crítico).
- **Ação Sonora:** Toca `beep-error.mp3` (Som grave ou agudo de alerta, chamando a atenção do operador que não está olhando para a tela).
- **Bloqueio:** O campo do código de barras é limpo e volta a focar.

### 2.4. Finalização da Conferência
- O botão **"Finalizar Conferência"** (`Button size="lg"`) deve permanecer `disabled` (cinza inativo) até que o contador de itens da tela bata 100% (ex: 3/3 Conferidos).
- Ao ser clicado (ou atingir 100% de forma automática), o sistema dispara `POST /api/v1/conferencia/{id_pedido}/finalizar`, muda o status da tela para sucesso, limpa a área de trabalho e carrega o próximo pedido `Pendente` automaticamente.

---

## 3. Qualidade de Código Frontend
1. **Estrutura de Arquivos:** Manter componentes isolados em `src/components/omni/`. As lógicas de API devem ficar em `src/services/api.ts`.
2. **Tipagem:** O TypeScript deve espelhar estritamente os retornos do NestJS (Interfaces de Pedido, ItemPedido, Produto). Não usar `any`.
3. **Responsividade:** Embora a conferência ocorra primordialmente em desktops/monitores num galpão, a tela deve ser usável em tablets via CSS Grid/Flexbox, seguindo as classes do Tailwind já presentes no repositório.
