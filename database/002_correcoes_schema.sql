-- Migration 002: Correções de Schema para Production Readiness
-- Este script corrige problemas de integridade e overselling na base atual

-- 1. Adicionar quantidade_bipada em itens_pedido (caso não exista)
ALTER TABLE itens_pedido 
ADD COLUMN quantidade_bipada INT NOT NULL DEFAULT 0;

-- 2. Garantir idempotência nos pedidos externos
-- Remove possíveis duplicatas antigas antes de aplicar o índice (opcional, mantendo apenas a mais recente se houver)
-- Omitido para não apagar dados sem consentimento, mas o índice previne futuros problemas.
ALTER TABLE pedidos 
ADD UNIQUE KEY uk_pedido_integracao (id_integracao, id_pedido_marketplace);

-- 3. Remover Triggers de Estoque Inseguras
-- A reserva e baixa passam a ser controladas por transações e travas lógicas
-- no nível da aplicação (LogisticaService e Polling)
DROP TRIGGER IF EXISTS trigger_baixa_estoque;
DROP TRIGGER IF EXISTS trigger_estorno_estoque;
