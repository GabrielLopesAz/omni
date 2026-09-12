# Plano de Implementação OMNI

Este documento detalha as decisões técnicas, regras estéticas e algorítmicas que guiarão o desenvolvimento.

## 1. Design System & UI/UX (Estética Premium)

A interface deve transmitir confiança, estabilidade corporativa e modernidade. 

### 1.1. Paleta de Cores Funcional
- **Primary (Marca/Ações principais):** `Indigo 600` (#4F46E5) a `Indigo 700` (#4338CA).
- **Background:** `Gray 50` (#F9FAFB) com componentes em branco (`#FFFFFF`) e sombras suaves.
- **Cores de Feedback (CRÍTICO para Logística):**
  - *Sucesso (Bipagem correta):* `Emerald 500` (#10B981) - Fundo verde translúcido.
  - *Erro (Bipagem errada):* `Rose 500` (#EF4444) - Alerta em vermelho vibrante.
  - *Aviso (Falta estoque):* `Amber 500` (#F59E0B) - Laranja para estados de alerta.

### 1.2. Tipografia e Interações
- **Fonte:** `Inter` (Google Fonts).
- **Densidade:** Espaçamento corporativo (Grid de 4px a 8px). Tabelas espaçosas (`p-3`).
- **Feedback Sonoro:** Bipe curto de sucesso (`beep-success`) ou erro agudo (`beep-error`) na tela de conferência.

---

## 2. Modelagem de Dados e Segurança

### 2.1. Segurança e Criptografia
A coluna `credenciais` na tabela `integracoes_marketplace` deve ser salva criptografada pelo NestJS utilizando `AES-256-GCM` com uma chave `.env`, garantindo que os *Client Secrets* não fiquem expostos no banco.

---

## 3. Arquitetura do Backend (Node.js + NestJS)

### 3.1. Estrutura de Módulos (DDD)
- `AuthModule`: Guarda rotas e JWT (RolesGuard).
- `MarketplaceModule`: Contém o Padrão Strategy (`IMarketplaceSync`) para suportar os 9 marketplaces.
- `OrdersModule`: Cuida da entrada de pedidos.
- `LogisticsModule`: Lógica pesada de conferência e bipagem.

### 3.2. Engine de Polling (Sincronização)
- Baseado em `@nestjs/schedule`.
- Rotina CRON a cada 5 minutos:
  1. Consulta Integrações Ativas.
  2. Bate na API de cada Marketplace.
  3. Insere dados em Batch no MySQL para não travar a aplicação.

---

## 4. Algoritmo de Conferência (Logística)

### 4.1. Máquina de Estados do Pedido
- `PENDENTE`
- `EM_SEPARACAO` (Sendo conferido)
- `CONFERIDO`
- `EXPEDIDO` (Com rastreio)

### 4.2. Bipagem de Código de Barras
1. React capta o evento de teclado até o `Enter`.
2. Cruza com os itens pendentes do pedido na tela.
3. **Se Bater e faltar qtd:** Incrementa, fica verde, som de sucesso.
4. **Se Não Bater:** Bloqueia, pisca vermelho, emite som de erro, registra log de tentativa falha na auditoria.
