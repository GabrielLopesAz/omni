-- Migration 003: Limpar Triggers e Corrigir Schema
-- Remove as triggers antigas que causavam duplicação no cálculo de estoque
DROP TRIGGER IF EXISTS after_insert_itens_pedido;
DROP TRIGGER IF EXISTS after_update_pedidos;
DROP TRIGGER IF EXISTS after_insert_pedido;
DROP TRIGGER IF EXISTS after_update_item_pedido;

-- Garante coluna e index únicos caso não existam (já feitos no 002, mas redundante aqui para segurança se rodar direto)
-- ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS quantidade_bipada INT DEFAULT 0;
-- ALTER TABLE pedidos ADD UNIQUE KEY IF NOT EXISTS uk_pedido_integracao (id_integracao, id_pedido_marketplace);
