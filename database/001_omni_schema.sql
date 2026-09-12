-- ==========================================
-- SCRIPT DE BANCO DE DADOS OMNI (MYSQL)
-- ==========================================

-- 1. Empresas (Tenant)
CREATE TABLE empresas (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20),
    plano VARCHAR(50) DEFAULT 'Starter',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Integrações Marketplace
CREATE TABLE integracoes_marketplace (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_empresa VARCHAR(36),
    nome VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'warning',
    ultima_sincronizacao TIMESTAMP,
    credenciais JSON, -- Deve armazenar os dados criptografados (AES-256)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id) ON DELETE CASCADE
);

-- 3. Produtos
CREATE TABLE produtos (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_empresa VARCHAR(36),
    sku VARCHAR(100) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    preco_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    custo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    imagem_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_produto_empresa_sku (id_empresa, sku),
    FOREIGN KEY (id_empresa) REFERENCES empresas(id) ON DELETE CASCADE
);

-- 4. Estoque
CREATE TABLE estoque (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_produto VARCHAR(36) UNIQUE,
    quantidade_disponivel INT NOT NULL DEFAULT 0,
    quantidade_reservada INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_produto) REFERENCES produtos(id) ON DELETE CASCADE
);

-- 5. Pedidos
CREATE TABLE pedidos (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_empresa VARCHAR(36),
    id_integracao VARCHAR(36),
    id_pedido_marketplace VARCHAR(100),
    cliente_nome VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pendente',
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    taxas_marketplace DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    transportadora VARCHAR(100),
    rastreio VARCHAR(100),
    versao INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_integracao) REFERENCES integracoes_marketplace(id) ON DELETE SET NULL
);

-- 6. Itens do Pedido
CREATE TABLE itens_pedido (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_pedido VARCHAR(36),
    id_produto VARCHAR(36),
    quantidade INT NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES produtos(id) ON DELETE CASCADE
);

-- 7. Roles (Papéis de Acesso)
CREATE TABLE roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nome VARCHAR(50) NOT NULL UNIQUE -- Ex: 'ADMIN', 'GERENTE', 'CONFERENTE', 'FINANCEIRO'
);

-- 8. Usuários
CREATE TABLE usuarios (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_empresa VARCHAR(36),
    id_role VARCHAR(36),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_role) REFERENCES roles(id) ON DELETE RESTRICT
);

-- 9. Conferências (Logística)
CREATE TABLE conferencias (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_pedido VARCHAR(36),
    id_usuario VARCHAR(36), -- Conferente
    status VARCHAR(50) DEFAULT 'Pendente',
    data_conferencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 10. Auditoria (Rastreabilidade de Ações)
CREATE TABLE auditoria_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_usuario VARCHAR(36),
    acao VARCHAR(100) NOT NULL, -- Ex: 'LOGIN', 'BIPAGEM_ITEM', 'PEDIDO_EXPEDIDO'
    tabela_afetada VARCHAR(50),
    dados_antigos JSON,
    dados_novos JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ======== REGRAS DE NEGÓCIO (TRIGGERS NO MYSQL) ========

DELIMITER //

-- Trigger disparada APÓS a inserção em itens_pedido (Reserva de Estoque)
CREATE TRIGGER trigger_baixa_estoque
AFTER INSERT ON itens_pedido
FOR EACH ROW
BEGIN
    UPDATE estoque
    SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade,
        quantidade_reservada = quantidade_reservada + NEW.quantidade
    WHERE id_produto = NEW.id_produto;
END //

-- Trigger disparada APÓS alteração do status do pedido (Estorno)
CREATE TRIGGER trigger_estorno_estoque
AFTER UPDATE ON pedidos
FOR EACH ROW
BEGIN
    IF NEW.status = 'Cancelado' AND OLD.status != 'Cancelado' THEN
        -- Para cada item do pedido, atualiza o estoque correspondente
        UPDATE estoque e
        JOIN itens_pedido ip ON e.id_produto = ip.id_produto
        SET e.quantidade_disponivel = e.quantidade_disponivel + ip.quantidade,
            e.quantidade_reservada = e.quantidade_reservada - ip.quantidade
        WHERE ip.id_pedido = NEW.id;
    END IF;
END //

DELIMITER ;

-- ==========================================
-- DADOS INICIAIS
-- ==========================================
INSERT INTO roles (id, nome) VALUES (UUID(), 'ADMIN');
INSERT INTO roles (id, nome) VALUES (UUID(), 'GERENTE');
INSERT INTO roles (id, nome) VALUES (UUID(), 'CONFERENTE');
INSERT INTO roles (id, nome) VALUES (UUID(), 'FINANCEIRO');
