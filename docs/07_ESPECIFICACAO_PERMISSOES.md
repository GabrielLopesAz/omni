# 07. Especificação de Permissões e Visões (RBAC)

Este documento define a Matriz de Controle de Acesso Baseado em Papéis (Role-Based Access Control) do sistema OMNI. Todo o comportamento visual (Frontend) e proteção de rotas (Backend) deve obedecer rigorosamente às regras descritas aqui.

---

## 1. Matriz de Acesso por Papel (Role)

O sistema possui 4 papéis baseados no token JWT. As permissões de acesso ao Menu e operações CRUD são divididas da seguinte forma:

### 👑 1. ADMIN (Administrador)
- **Visualização (Telas):** Acesso a 100% do sistema (Dashboards, Produtos, Estoque, Pedidos, Logística, Financeiro, Configurações).
- **Operação (CRUD):** Acesso total para criar, ler, atualizar e excluir em qualquer tela.

### 📦 2. CONFERENTE (Operação/Logística)
- **Visualização (Telas):** Apenas o módulo de **Operação** (Conferência e Expedição).
- **Operação (CRUD):** Realiza CRUD completo apenas dentro das telas de Operação.
- **Restrição Visual:** O menu lateral (Sidebar) deve ocultar completamente todas as outras opções (Dashboards, Produtos, Estoque, Configurações, Financeiro). Se tentar acessar as rotas via URL, deve ser redirecionado de volta para `/conferencia`.

### 👔 3. GERENTE (Gestão de Operação)
- **Visualização (Telas):** Vê todas as telas do sistema, **EXCETO** a aba de "Configurações".
- **Operação (CRUD):** Realiza CRUD em quase todas as telas permitidas.
- **Restrição Específica (Marketplaces):** O Gerente não tem permissão para **Criar ou Alterar** as configurações de integrações (Marketplaces).
  - *Comportamento UI:* Os botões "Adicionar Integração" ou "Salvar Credenciais" nos Marketplaces devem ficar ocultos (ou desabilitados) para o Gerente. Ele pode apenas *ver* o status atual, se a integração permitir.

### 💰 4. FINANCEIRO (Gestão de Contas e Faturamento)
- **Visualização (Telas):** Vê as telas de Gestão, Central de Pedidos, Expedição, Estoque e Produtos.
- **Operação Limitada (Read-Only):** Nas telas de **Estoque** e **Produtos**, o Financeiro tem permissão **apenas de leitura (View-Only)**.
  - *Comportamento UI:* Botões como "Nova Entrada", "Movimentar Estoque", "Adicionar Produto" ou "Editar Produto" devem ficar completamente invisíveis ou desabilitados (disabled).
- **Operação Total (CRUD):** Pode criar/alterar/deletar dados apenas nas telas de **Central de Pedidos**, **Expedição** e nas telas do seu próprio módulo de **Gestão Financeira**.

---

## 2. Regras de Implementação Frontend (React)

Para garantir que a "Visão da Aplicação" funcione corretamente:

1. **Contexto Híbrido (AuthContext):**
   - O React deve extrair o `role` (papel) de dentro do *payload* do Token JWT gerado no login e disponibilizá-lo globalmente (ex: `user.role`).

2. **Menu Dinâmico (Sidebar):**
   - O array de links de navegação (`navItems`) deve ser filtrado com base na `role` do usuário antes do componente `.map()` renderizá-los. 
   - Um Conferente não pode nem sequer ver que a tela de "Financeiro" existe no menu.

3. **Guardiões de Rotas (Private Routes):**
   - Envolver o `<Route />` do `react-router-dom` em um componente de proteção (`<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']} />`). Se o acesso for negado, renderizar a página `/403` ou redirecionar.

4. **Componente de Proteção de UI (`<RequirePermission>`):**
   - Criar um micro-componente (wrapper) para encapsular botões restritos.
   - *Exemplo de Uso:*
     ```tsx
     <RequirePermission allowedRoles={['ADMIN']} module="marketplaces" action="edit">
       <Button>Salvar Chave Secreta</Button>
     </RequirePermission>
     ```

---

## 3. Regras de Implementação Backend (NestJS)

O Frontend esconde o botão, mas a segurança real ocorre no Backend. 
- Todo *Controller* do NestJS deve usar o `@RolesGuard()`.
- Exemplo: No endpoint de `POST /api/v1/estoque/movimentacao`, o decorador deverá ser estritamente `@Roles('ADMIN', 'GERENTE')`. Se o token do `FINANCEIRO` disparar para essa rota via Postman ou console, a API deverá travar retornando `403 Forbidden`.
