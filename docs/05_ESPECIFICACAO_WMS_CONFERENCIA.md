# Especificação WMS: Módulo de Conferência

Este documento define a nova arquitetura de UX/UI e o fluxo operacional da página de Conferência de Pedidos (`Conferencia.tsx`) para o projeto OMNI, substituindo diretrizes anteriores sobre bipagem unitária cega.

## 1. Visão Geral do Fluxo

A tela foi redesenhada para oferecer suporte visual contínuo ao operador de logística (Conferente), dividindo a interface em três pilares principais:
1. **Busca Inicial:** Inserção do código do Pedido ou Venda (via laser de código de barras ou digitação manual).
2. **Painel de Detalhes (Esquerda/Centro):** Focado na verificação visual da peça, com ênfase na foto, SKU, nome, tamanho e cor.
3. **Painel de Controle e Checklist (Direita):** Gerencia a listagem do pedido atual e controla o avanço do status geral, travando a finalização enquanto existirem pendências.

## 2. Regras de Interface e Estado

### 2.1. Busca e Carregamento
- O campo principal de busca do pedido inicia focado (`autoFocus`) para leitura rápida pelo leitor de código de barras.
- Ao submeter (Enter), o frontend requisita o array de itens vinculados àquele pedido no backend.
- O campo é limpo após o sucesso para facilitar a próxima leitura sem o uso do mouse.

### 2.2. Exibição da Lista de Itens (Painel Direito)
A lista (Checklist) dita o ritmo da operação. Cada item possui três estados possíveis:
- **`pendente` (Padrão):** Fundo limpo, caixa de seleção desmarcada.
- **`conferido` (Sucesso):** Fundo verde translúcido (`bg-emerald-500/10`), texto verde, caixa de seleção marcada.
- **`problema` (Alerta):** Fundo vermelho translúcido (`bg-rose-500/10`), texto vermelho, seleção bloqueada/disabled.

O operador tem a liberdade de selecionar a linha de qualquer item da lista com um clique (ou touch) para enviar aquele item para exibição detalhada no painel central.

### 2.3. Painel de Verificação (Centro/Esquerda)
Quando um item é ativado:
- **Detalhes Visuais:** É renderizada a fotografia da peça (fundamental para verificação de cor e estampa), SKU, Tamanho, Cor e Nome.
- **Botões de Ação:** 
  - `Reportar Problema` fica disponível (em destaque, muitas vezes associado à cor de alerta).

### 2.4. Tratativa de Problemas (Modal)
- Ao clicar em "Reportar Problema", um **Modal overlay** trava a tela (impedindo interação paralela) obrigando o operador a inserir o texto/motivo da inconsistência (ex: "Peça manchada", "Tamanho P ao invés de M").
- Ao salvar:
  1. A `checkbox` desse item na lista é desmarcada (se estivesse marcada) e travada.
  2. A cor do card passa a indicar urgência visual (Vermelho).
  3. Uma requisição para atualizar o status *desse item específico* no backend é acionada (ou salva para lote).

### 2.5. Liberação e Finalização (Checkout)
A maior premissa sistêmica de travamento de erros:
- O botão primário **"Finalizar Transferência"** no rodapé do painel direito é montado em estado `disabled`.
- Sua liberação ocorre **apenas quando a propriedade `checked` de TODOS os itens for `true`**.
- Se um item estiver marcado como "problema", a conferência global **não** pode ser finalizada em seu fluxo feliz. (Para casos em que 1 item com problema deve permitir a transferência dos outros, exige-se uma rota de "Transferência Parcial" em regra de negócio posterior, ou a remoção do item problemático do pacote via Retrabalho).
- Ao clicar em "Finalizar":
  1. O pedido muda para status `Conferido`.
  2. Um *Toast* de sucesso surge.
  3. A tela é resetada e liberada para o próximo `id_pedido`.

## 3. Integração com Banco de Dados / APIs

- **`GET /api/v1/conferencia/:id_pedido` (A implementar):** Retorna `Pedido` e `ItemPedido[]`.
- **`POST /api/v1/conferencia/problema` (A implementar):** Registra auditoria/motivo de avaria.
- **`PUT /api/v1/pedidos/:id_pedido/status` (A implementar):** Efetiva a transferência geral de `Em Separação` para `Conferido`.
