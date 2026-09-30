# P4.1 VALIDADO — LIBERADO PARA PRIMEIRO MARKETPLACE REAL

## O que foi implementado
Nesta fase (P4.1), construímos toda a infraestrutura "core" para as integrações de marketplaces baseadas em OAuth, sem implementar regras específicas de nenhum marketplace real ainda.

- **OAuth State Seguro**: Implementamos a geração e validação de `state` atrelado ao `id_empresa` e `id_usuario`, previnindo CSRF e garantindo que o callback identifique corretamente o contexto sem uso de JWT no front ou na query URL.
- **Armazenamento Seguro de Credenciais**: Criado `IntegrationCredentialsCryptoService` usando `AES-256-GCM`. Access tokens e refresh tokens são criptografados no banco e descriptografados apenas em memória no momento do uso.
- **Registro de Adapters (DI)**: Padrão *Adapter* implementado via `MarketplaceAdapterRegistry`. O fluxo genérico agora chama `connect()` genérico e o registro injeta a estratégia (`FakeMarketplaceAdapter` disponível somente em ambiente de testes).
- **Interface e Testes E2E (Multi-Tenant/RBAC)**: Testes abrangentes implementados (`test/integracoes.e2e-spec.ts`). As rotas da Central exigem role de `ADMIN`. As listagens e deleções verificam o isolamento multi-tenant, permitindo listar apenas integrações da própria empresa.
- **Frontend Real (Central de Integrações)**: A tela de Configurações foi atualizada (`Configuracoes.tsx` -> `IntegracoesTab.tsx`) contendo a listagem de provedores (Shopee, Mercado Livre, Bling), requisição de callback e botão de Desconectar com manipulação do estado via Tanstack Query.

**Evidências**:
A suíte E2E inteira foi refatorada e isolada para impedir que as execuções de concorrência quebrassem os dados globais.
Testes passando:
```text
 ✓ test/integracoes.e2e-spec.ts (11 tests) 434ms
 ✓ test/logistica.e2e-spec.ts (26 tests) 503ms
 ✓ test/concurrency.e2e-spec.ts (4 tests) 380ms
 ✓ test/catalogo.e2e-spec.ts (6 tests) 425ms
 ✓ test/app.e2e-spec.ts (1 test) 281ms

 Test Files  5 passed (5)
      Tests  48 passed (48)
```

## Decisões Técnicas

- **Justificativa do OAuth State**: Usamos a entidade `OAuthState` no DB (`oauth_states`) armazenando `state` (UUID randômico), `provider`, `id_empresa`, `id_usuario` e `expires_at`. Isso elimina a necessidade de carregar tokens no fluxo de redirect para marketplaces e previne falhas de segurança onde callbacks maliciosos poderiam falsificar o tenant ou usuário que aprovou a integração, bem como provê proteção nativa contra *Replay Attacks*.
- **Justificativa da criptografia AES-256-GCM**: O GCM (*Galois/Counter Mode*) oferece tanto criptografia quanto autenticação dos dados. Se o banco de dados for comprometido e o IV e Auth Tag lidos, não será possível descriptografar os tokens sem o `INTEGRATION_ENCRYPTION_KEY` injetado estritamente como variável de ambiente no servidor.
- **Soft Disconnect**: Quando um usuário desconecta um marketplace, excluímos as credenciais e preenchemos `disconnected_at` com status = `DESCONECTADO`, mantendo a restrição de unicidade para aquele `external_account_id`. A desconexão é rastreável e reversível via nova conexão, preservando vínculos históricos de Pedidos.

## Status Atual
- [x] Backend: Rotas Connect, Callback, Get, Disconnect completas e E2E testadas.
- [x] Backend: Migrações raw-sql concluídas e mapeamentos ajustados no TypeORM (adicionado `OAuthState`).
- [x] Frontend: Adicionado o painel de Integrações. `npm run build` passando limpo. Lint sem novas regressões.
- [x] Branch limpa e submetida ao remote: `feature/p4-integracoes-oauth` com HEAD no commit `d050ded` (ou posterior).

Próximo passo: P4.2
