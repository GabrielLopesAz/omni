-- OAuth State table
CREATE TABLE IF NOT EXISTS `oauth_states` (
  `state` varchar(128) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `id_empresa` varchar(36) NOT NULL,
  `id_usuario` varchar(36) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`state`),
  KEY `fk_oauth_states_empresa` (`id_empresa`),
  KEY `fk_oauth_states_usuario` (`id_usuario`),
  CONSTRAINT `fk_oauth_states_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_oauth_states_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Alter integracoes_marketplace table to support OAuth
-- Instead of blindly adding, we first rename the old credenciais column to keep data if it exists.
-- But MySQL doesn't have RENAME COLUMN IF EXISTS. So we'll keep the columns if they exist.

-- Since MariaDB/MySQL ALTER TABLE ... ADD COLUMN IF NOT EXISTS is supported in MariaDB 10.0+ 
-- we will use it safely.
ALTER TABLE `integracoes_marketplace`
  ADD COLUMN IF NOT EXISTS `provider` varchar(50) NOT NULL DEFAULT 'LEGACY' AFTER `id_empresa`,
  ADD COLUMN IF NOT EXISTS `external_account_id` varchar(100) NULL AFTER `nome`,
  ADD COLUMN IF NOT EXISTS `external_account_name` varchar(255) NULL AFTER `external_account_id`,
  ADD COLUMN IF NOT EXISTS `access_token_encrypted` text NULL AFTER `status`,
  ADD COLUMN IF NOT EXISTS `refresh_token_encrypted` text NULL AFTER `access_token_encrypted`,
  ADD COLUMN IF NOT EXISTS `token_expires_at` timestamp NULL AFTER `refresh_token_encrypted`,
  ADD COLUMN IF NOT EXISTS `scopes` text NULL AFTER `token_expires_at`,
  ADD COLUMN IF NOT EXISTS `connected_at` timestamp NULL AFTER `scopes`,
  ADD COLUMN IF NOT EXISTS `disconnected_at` timestamp NULL AFTER `connected_at`,
  ADD COLUMN IF NOT EXISTS `last_sync_at` timestamp NULL AFTER `disconnected_at`,
  ADD COLUMN IF NOT EXISTS `last_success_at` timestamp NULL AFTER `last_sync_at`,
  ADD COLUMN IF NOT EXISTS `last_error_at` timestamp NULL AFTER `last_success_at`,
  ADD COLUMN IF NOT EXISTS `last_error` text NULL AFTER `last_error_at`,
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Add Unique Constraint for Multi-account
-- Using dynamic SQL (PREPARE) to achieve idempotency in raw SQL
SET @dbname = DATABASE();
SET @index_exists = (
    SELECT COUNT(1) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = @dbname 
      AND TABLE_NAME = 'integracoes_marketplace' 
      AND INDEX_NAME = 'idx_unique_empresa_provider_account'
);
SET @s = IF(@index_exists > 0, 
    'SELECT "Index already exists" AS message', 
    'ALTER TABLE `integracoes_marketplace` ADD UNIQUE INDEX `idx_unique_empresa_provider_account` (`id_empresa`, `provider`, `external_account_id`)'
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
