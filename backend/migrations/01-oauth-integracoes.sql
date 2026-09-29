
-- OAuth State table
CREATE TABLE IF NOT EXISTS \oauth_states\ (
  \state\ varchar(128) NOT NULL,
  \provider\ varchar(50) NOT NULL,
  \id_empresa\ varchar(36) NOT NULL,
  \id_usuario\ varchar(36) NOT NULL,
  \expires_at\ timestamp NOT NULL,
  \used_at\ timestamp NULL DEFAULT NULL,
  \created_at\ timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\state\),
  KEY \k_oauth_states_empresa\ (\id_empresa\),
  KEY \k_oauth_states_usuario\ (\id_usuario\),
  CONSTRAINT \k_oauth_states_empresa\ FOREIGN KEY (\id_empresa\) REFERENCES \empresas\ (\id\) ON DELETE CASCADE,
  CONSTRAINT \k_oauth_states_usuario\ FOREIGN KEY (\id_usuario\) REFERENCES \usuarios\ (\id\) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Alter integracoes_marketplace table to support OAuth
ALTER TABLE \integracoes_marketplace\
  ADD COLUMN IF NOT EXISTS \provider\ varchar(50) NOT NULL AFTER \id_empresa\,
  ADD COLUMN IF NOT EXISTS \external_account_id\ varchar(100) NULL AFTER \
ome\,
  ADD COLUMN IF NOT EXISTS \external_account_name\ varchar(255) NULL AFTER \external_account_id\,
  ADD COLUMN IF NOT EXISTS \ccess_token_encrypted\ text NULL AFTER \status\,
  ADD COLUMN IF NOT EXISTS \efresh_token_encrypted\ text NULL AFTER \ccess_token_encrypted\,
  ADD COLUMN IF NOT EXISTS \	oken_expires_at\ timestamp NULL AFTER \efresh_token_encrypted\,
  ADD COLUMN IF NOT EXISTS \scopes\ text NULL AFTER \	oken_expires_at\,
  ADD COLUMN IF NOT EXISTS \connected_at\ timestamp NULL AFTER \scopes\,
  ADD COLUMN IF NOT EXISTS \disconnected_at\ timestamp NULL AFTER \connected_at\,
  ADD COLUMN IF NOT EXISTS \last_sync_at\ timestamp NULL AFTER \disconnected_at\,
  ADD COLUMN IF NOT EXISTS \last_success_at\ timestamp NULL AFTER \last_sync_at\,
  ADD COLUMN IF NOT EXISTS \last_error_at\ timestamp NULL AFTER \last_success_at\,
  ADD COLUMN IF NOT EXISTS \last_error\ text NULL AFTER \last_error_at\,
  ADD COLUMN IF NOT EXISTS \updated_at\ timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER \created_at\;

-- Drop old credenciais column
ALTER TABLE \integracoes_marketplace\ DROP COLUMN IF EXISTS \credenciais\;
ALTER TABLE \integracoes_marketplace\ DROP COLUMN IF EXISTS \ultima_sincronizacao\;

-- Add Unique Constraint for Multi-account
-- Using a named constraint so it doesn't conflict
ALTER TABLE \integracoes_marketplace\
  ADD UNIQUE INDEX \idx_unique_empresa_provider_account\ (\id_empresa\, \provider\, \external_account_id\);

