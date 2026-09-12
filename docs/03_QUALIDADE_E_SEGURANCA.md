# Padrões de Qualidade, Segurança e Performance — OMNI

Este documento define as exigências não-funcionais que devem ser rigorosamente seguidas durante a implementação de cada módulo do sistema OMNI.

---

## 1. Diretrizes de Cibersegurança

Para garantir que o sistema não seja vulnerável, todas as implementações devem seguir as regras abaixo:

### 1.1. Proteção de Dados Sensíveis
- **Senhas de Usuários:** Nenhuma senha deve ser salva em texto plano. O módulo de `Auth` deve obrigatoriamente utilizar a biblioteca `bcrypt` com *salt rounds* iguais a 10.
- **Credenciais de Marketplaces (Tokens/API Keys):** Como o sistema baterá em 9 plataformas diferentes, os tokens salvos na coluna `credenciais` (tabela `integracoes_marketplace`) devem ser encriptados no nível da aplicação (Node.js) utilizando criptografia bidirecional forte (`AES-256-GCM`), antes de serem inseridos no MySQL. O vetor de inicialização (IV) deve ser único e armazenado junto com o token criptografado.

### 1.2. Proteção contra Ataques na API (NestJS)
- **Rate Limiting:** Implementar `@nestjs/throttler` globalmente. Proteger especialmente a rota de `/login` para permitir no máximo 5 tentativas erradas por IP em uma janela de 5 minutos (prevenção de Brute Force).
- **Injeção de SQL (SQL Injection):** É estritamente proibido concatenar strings em consultas ao banco. Todo acesso ao banco deve ser mediado pelo ORM (TypeORM/Prisma) ou, se usar queries cruas (Raw Queries), devem usar *Prepared Statements*.
- **Cabeçalhos de Segurança (Helmet):** O `helmet` deve ser ativado no arquivo `main.ts` para mitigar ataques XSS.
- **Auditoria Obrigatória:** Toda rota que altera estado (POST, PUT, DELETE) na logística e nas configurações deve gravar um registro na tabela `auditoria_logs` com o ID do usuário e o IP da requisição.

---

## 2. Diretrizes de Performance

Dado que o sistema rodará inicialmente de forma local via XAMPP, os recursos são limitados (CPU e Memória da máquina do cliente). 

### 2.1. Otimização de Banco de Dados
- **Índices Críticos:** As queries de leitura devem ser instantâneas. Criar índices (B-Tree) nas colunas:
  - `produtos.sku`
  - `pedidos.status`
  - `pedidos.id_pedido_marketplace`
  - `estoque.id_produto`
- **Operações em Lote (Bulk Ops):** Ao sincronizar 50 pedidos do Mercado Livre, a API **NÃO PODE** fazer 50 comandos de `INSERT` individuais. O sistema deve montar um único `INSERT INTO pedidos (...) VALUES (...), (...), (...)` usando o método `save()` em lote do ORM.

### 2.2. Polling Assíncrono Não-Bloqueante
- O CRON de sincronização não pode bloquear a `Event Loop` do Node.js. O uso de `Promise.allSettled()` é mandatório ao bater nas APIs de vários marketplaces ao mesmo tempo. Caso a API da Shopee demore 10 segundos para responder, isso não deve atrasar a sincronização da Amazon.

---

## 3. Especificação de Testes por Fase de Implementação

Nenhuma PR (Pull Request) ou módulo deve ser considerado "Pronto" sem a validação dos cenários abaixo através de Testes Automatizados (Jest) ou Homologação Manual.

### Módulo 1: Autenticação e RBAC
- **Teste Unitário:** Validar se a função de criptografia do `bcrypt` não gera colisões e se o JWT gerado contém a `role` do usuário.
- **Teste de Integração (E2E):** Disparar requisição `/login` com usuário inexistente. (Esperado: HTTP 401).
- **Segurança:** Tentar acessar a rota `/api/v1/configuracoes` com um token cuja Role seja `CONFERENTE`. (Esperado: HTTP 403 Forbidden).

### Módulo 2: Motor de Integrações (Polling)
- **Teste de Performance:** Simular o retorno de 500 pedidos via API Mockada. Validar se a rotina `CRON` consegue salvar todos no MySQL em menos de 3 segundos sem estourar a memória.
- **Teste Extremo (Timeout):** O que acontece se a API da Nuvemshop cair e der *Timeout*? O sistema deve pegar o erro, salvar um log e não interromper a sincronização da Shein. (Resiliência do Worker).
- **Teste de Criptografia:** Validar se a leitura da credencial no banco (que está em AES-256) consegue ser descriptografada com sucesso no momento do Polling para assinar a requisição externa.

### Módulo 3: Logística e Conferência (Bipagem)
- **Teste de Concorrência (Race Condition):** O que acontece se dois operadores abrirem a mesma tela de conferência para o mesmo pedido e biparem ao mesmo tempo? (O banco deve usar _Optimistic Locking_ no registro do pedido).
- **Teste Negativo de Bipagem:** Bipar um produto que tem `quantidade: 2` pela 3ª vez. (Esperado: A API deve barrar e retornar Erro 400 - "Quantidade Excedida").
- **Teste de Trigger do MySQL:** Inserir um `item_pedido` direto no banco simulando uma venda. Validar se a `TRIGGER trigger_baixa_estoque` reduziu o campo `quantidade_disponivel` no momento da inserção.

### Módulo 4: Financeiro e Dashboards
- **Teste de Carga Básica:** O Dashboard tentará ler o faturamento de milhares de pedidos. É proibido trazer todos os pedidos para a memória do Node.js para somar. O cálculo deve ser feito nativamente pelo banco (`SELECT SUM(valor_total) WHERE...`) e as datas devem estar indexadas.
