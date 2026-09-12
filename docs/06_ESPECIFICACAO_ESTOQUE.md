# 06. Especificação do Módulo de Estoque

A tela de Estoque (`src/pages/omni/Estoque.tsx`) é o visor central da saúde do e-commerce. Ela exibe os níveis físicos, reservados e disponíveis, alertando para rupturas de estoque que podem penalizar a conta do vendedor nos marketplaces.

---

## 1. Regras de Negócio Core (O que o Frontend exibe)

O sistema trabalha com três dimensões de estoque por SKU:
1. **Disponível (`quantidadeDisponivel`):** É o estoque real que pode ser vendido (é o número enviado para a Shopee, ML, etc).
2. **Reservado (`quantidadeReservada`):** Estoque de pedidos que já caíram no sistema, mas ainda não foram bipados/expedidos.
3. **Físico (Cálculo em Memória):** É a soma de `Disponível + Reservado`. Representa o que realmente existe na prateleira do galpão naquele momento.

> **REGRA DE OURO (RN-006):** O operador humano **nunca** consegue alterar manualmente o estoque "Reservado" por essa tela. O reservado só é alterado sistemicamente quando um pedido é importado, cancelado ou expedido. As movimentações manuais afetam unicamente o estoque **Disponível**.

---

## 2. Abastecimento de Dados (GET /produtos)

O Frontend (React) buscará os dados da listagem consumindo um endpoint unificado de produtos que já traz a junção (JOIN/Eager Loading) da tabela de estoque.

- **Endpoint:** `GET /api/v1/produtos`
- **Filtros (Query Params suportados no Backend):**
  - `?search=camiseta` (Filtra por Nome ou SKU usando `LIKE %camiseta%`)
  - (O Frontend atual filtra em memória, mas para grandes volumes, o filtro deve ser passado para o backend).
- **Formato esperado (JSON):**
  ```json
  [
    {
      "id": "uuid",
      "sku": "CAM-PRETA",
      "nome": "Camiseta Preta",
      "categoria": "Vestuário",
      "precoBase": 49.90,
      "imagemUrl": "...",
      "estoque": {
        "quantidadeDisponivel": 50,
        "quantidadeReservada": 12
      }
    }
  ]
  ```

---

## 3. Movimentação Manual (Entrada e Saída)

Quando o operador clica no botão "Movimentar" ou "Nova Entrada", abre-se o modal `MovimentacaoEstoqueModal`.

### 3.1. O Endpoint de Movimentação
- **Endpoint:** `POST /api/v1/estoque/movimentacao`
- **Payload:**
  ```json
  {
    "id_produto": "uuid",
    "tipo": "ENTRADA", // ou "SAIDA"
    "quantidade": 15,
    "motivo": "Devolução de fornecedor"
  }
  ```

### 3.2. Regras e Validações no Backend (NestJS)
- **Bloqueio de Saldo Negativo:** Se `tipo === 'SAIDA'`, o NestJS deve checar se `quantidadeDisponivel >= payload.quantidade`. Se não for, retorna `HTTP 400 Bad Request` ("Saldo insuficiente para esta saída").
- **Auditoria Obrigatória:** Toda chamada neste endpoint deve fazer um `INSERT` na tabela `auditoria_logs` registrando o usuário logado (via JWT), a quantidade anterior, a nova quantidade e o motivo inserido no modal.

---

## 4. UI/UX e Padrões Visuais

- **Métricas de Topo (Cards):** O frontend calcula em *runtime* quantos SKUs estão em ruptura (Disponível = 0), quantos estão baixos (Disponível < 10) e o valor financeiro do estoque (`Disponível * precoBase`).
- **Estados Visuais na Tabela (Badges):**
  - `Disponível == 0` 🔴 **Ruptura** (Badge vermelho).
  - `Disponível < 10` 🟡 **Baixo** (Badge amarelo).
  - `Disponível >= 10` 🟢 **Saudável** (Badge verde).
- **Gestão de Estado (React Query):** Após o modal de movimentação retornar Sucesso (200), o frontend deve invalidar a query de estoque (`queryClient.invalidateQueries(['produtos'])`) para que a tela se atualize sozinha instantaneamente, sem precisar de `window.location.reload()`.
