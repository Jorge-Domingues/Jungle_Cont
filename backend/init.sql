-- ============================================================
-- Jungle Cont — Sistema Contábil Formal (Partidas Dobradas)
-- Banco: jungle_cont
-- Versão: 3.0
-- ============================================================
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `jungle_cont` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `jungle_cont`;

-- ============================================================
-- 1. USUÁRIOS
-- ============================================================
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `login` VARCHAR(100) NOT NULL,
  `senha` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `login` (`login`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. PLANO DE CONTAS (Hierárquico)
-- ============================================================
DROP TABLE IF EXISTS `contas`;
CREATE TABLE `contas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(20) NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `tipo` ENUM('Ativo','Passivo','Patrimônio Líquido','Receita','Despesa') NOT NULL,
  `natureza` ENUM('Devedora','Credora') NOT NULL,
  `conta_pai_id` INT DEFAULT NULL,
  `analitica` BOOLEAN DEFAULT TRUE,
  `saldo_inicial` DECIMAL(15,2) DEFAULT 0.00,
  `descricao` TEXT DEFAULT NULL,
  `cor` VARCHAR(7) DEFAULT NULL,
  `ativa` BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_conta_pai` (`conta_pai_id`),
  KEY `idx_tipo` (`tipo`),
  CONSTRAINT `fk_conta_pai` FOREIGN KEY (`conta_pai_id`) REFERENCES `contas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. LANÇAMENTOS CONTÁBEIS (Cabeçalho)
-- ============================================================
DROP TABLE IF EXISTS `lancamentos`;
CREATE TABLE `lancamentos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `data` DATE NOT NULL,
  `data_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `descricao` TEXT NOT NULL,
  `origem` VARCHAR(50) DEFAULT 'manual',
  `origem_id` INT DEFAULT NULL,
  `usuario_id` INT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_data` (`data`),
  KEY `idx_origem` (`origem`),
  CONSTRAINT `fk_lancamento_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. PARTIDAS (Itens do Lançamento — Débito e Crédito)
-- ============================================================
DROP TABLE IF EXISTS `partidas`;
CREATE TABLE `partidas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lancamento_id` INT NOT NULL,
  `conta_id` INT NOT NULL,
  `tipo` ENUM('D','C') NOT NULL,
  `valor` DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lancamento` (`lancamento_id`),
  KEY `idx_conta` (`conta_id`),
  CONSTRAINT `fk_partida_lancamento` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partida_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. FUNCIONÁRIOS
-- ============================================================
DROP TABLE IF EXISTS `funcionarios`;
CREATE TABLE `funcionarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `cpf` VARCHAR(14) NOT NULL,
  `data_ingresso` DATE NOT NULL,
  `conta` VARCHAR(100) NOT NULL,
  `salario` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf` (`cpf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. FOLHAS DE PAGAMENTO
-- ============================================================
DROP TABLE IF EXISTS `folhas`;
CREATE TABLE `folhas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `funcionario_id` INT DEFAULT NULL,
  `nome_funcionario` VARCHAR(255) DEFAULT NULL,
  `mes_referencia` VARCHAR(20) DEFAULT NULL,
  `salario_base` DECIMAL(10,2) DEFAULT NULL,
  `total_proventos` DECIMAL(10,2) DEFAULT NULL,
  `total_descontos` DECIMAL(10,2) DEFAULT NULL,
  `valor_liquido` DECIMAL(10,2) DEFAULT NULL,
  `data_gravacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `lancamento_id` INT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_funcionario` (`funcionario_id`),
  KEY `idx_lancamento` (`lancamento_id`),
  CONSTRAINT `fk_folha_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`),
  CONSTRAINT `fk_folha_lancamento` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. SEED: Plano de Contas Padrão Brasileiro
-- ============================================================

-- GRUPO 1: ATIVO
INSERT INTO `contas` (`codigo`, `nome`, `tipo`, `natureza`, `conta_pai_id`, `analitica`, `cor`) VALUES
('1',       'ATIVO',                    'Ativo',    'Devedora', NULL, FALSE, '#10b981'),
('1.1',     'ATIVO CIRCULANTE',         'Ativo',    'Devedora', 1,    FALSE, '#10b981'),
('1.1.01',  'Caixa',                    'Ativo',    'Devedora', 2,    TRUE,  '#10b981'),
('1.1.02',  'Banco Conta Movimento',    'Ativo',    'Devedora', 2,    TRUE,  '#10b981'),
('1.1.03',  'Clientes a Receber',       'Ativo',    'Devedora', 2,    TRUE,  '#10b981'),
('1.2',     'ATIVO NÃO CIRCULANTE',     'Ativo',    'Devedora', 1,    FALSE, '#10b981'),
('1.2.01',  'Imobilizado',              'Ativo',    'Devedora', 6,    TRUE,  '#10b981');

-- GRUPO 2: PASSIVO
INSERT INTO `contas` (`codigo`, `nome`, `tipo`, `natureza`, `conta_pai_id`, `analitica`, `cor`) VALUES
('2',       'PASSIVO',                  'Passivo',  'Credora',  NULL, FALSE, '#f59e0b'),
('2.1',     'PASSIVO CIRCULANTE',       'Passivo',  'Credora',  8,    FALSE, '#f59e0b'),
('2.1.01',  'Fornecedores',             'Passivo',  'Credora',  9,    TRUE,  '#f59e0b'),
('2.1.02',  'Salários a Pagar',         'Passivo',  'Credora',  9,    TRUE,  '#f59e0b'),
('2.1.03',  'INSS a Recolher',          'Passivo',  'Credora',  9,    TRUE,  '#f59e0b'),
('2.1.04',  'FGTS a Recolher',          'Passivo',  'Credora',  9,    TRUE,  '#f59e0b'),
('2.1.05',  'IRRF a Recolher',          'Passivo',  'Credora',  9,    TRUE,  '#f59e0b');

-- GRUPO 3: PATRIMÔNIO LÍQUIDO
INSERT INTO `contas` (`codigo`, `nome`, `tipo`, `natureza`, `conta_pai_id`, `analitica`, `cor`) VALUES
('3',       'PATRIMÔNIO LÍQUIDO',       'Patrimônio Líquido', 'Credora', NULL, FALSE, '#8b5cf6'),
('3.1',     'CAPITAL E RESERVAS',       'Patrimônio Líquido', 'Credora', 15,   FALSE, '#8b5cf6'),
('3.1.01',  'Capital Social',           'Patrimônio Líquido', 'Credora', 16,   TRUE,  '#8b5cf6'),
('3.1.02',  'Lucros Acumulados',        'Patrimônio Líquido', 'Credora', 16,   TRUE,  '#8b5cf6');

-- GRUPO 4: RECEITAS
INSERT INTO `contas` (`codigo`, `nome`, `tipo`, `natureza`, `conta_pai_id`, `analitica`, `cor`) VALUES
('4',       'RECEITAS',                 'Receita',  'Credora',  NULL, FALSE, '#3b82f6'),
('4.1',     'RECEITAS OPERACIONAIS',    'Receita',  'Credora',  19,   FALSE, '#3b82f6'),
('4.1.01',  'Receita de Vendas',        'Receita',  'Credora',  20,   TRUE,  '#3b82f6'),
('4.1.02',  'Receita de Serviços',      'Receita',  'Credora',  20,   TRUE,  '#3b82f6');

-- GRUPO 5: DESPESAS
INSERT INTO `contas` (`codigo`, `nome`, `tipo`, `natureza`, `conta_pai_id`, `analitica`, `cor`) VALUES
('5',       'DESPESAS',                 'Despesa',  'Devedora', NULL, FALSE, '#ef4444'),
('5.1',     'DESPESAS OPERACIONAIS',    'Despesa',  'Devedora', 23,   FALSE, '#ef4444'),
('5.1.01',  'Despesas com Pessoal',     'Despesa',  'Devedora', 24,   TRUE,  '#ef4444'),
('5.1.02',  'Encargos Sociais (INSS)',  'Despesa',  'Devedora', 24,   TRUE,  '#ef4444'),
('5.1.03',  'Encargos Sociais (FGTS)',  'Despesa',  'Devedora', 24,   TRUE,  '#ef4444'),
('5.1.04',  'Despesas Administrativas', 'Despesa',  'Devedora', 24,   TRUE,  '#ef4444'),
('5.1.05',  'Despesas com Aluguel',     'Despesa',  'Devedora', 24,   TRUE,  '#ef4444'),
('5.1.06',  'Despesas com Serviços',    'Despesa',  'Devedora', 24,   TRUE,  '#ef4444');

-- ============================================================
-- 8. SEED: Usuários padrão (senhas serão hashadas na app)
-- ============================================================
INSERT INTO `usuarios` (`login`, `senha`) VALUES
('jorge', '$2a$10$placeholder_hash_jorge'),
('logan', '$2a$10$placeholder_hash_logan'),
('gabriel', '$2a$10$placeholder_hash_gabriel'),
('natan', '$2a$10$placeholder_hash_natan');

-- ============================================================
-- 9. SEED: FUNCIONÁRIOS
-- ============================================================
INSERT INTO `funcionarios` (`nome`, `cpf`, `data_ingresso`, `conta`, `salario`) VALUES
('Maria Souza',    '123.456.789-00', '2024-03-15', '5.1.01 - Despesas com Pessoal', 3500.00),
('João Pereira',   '987.654.321-00', '2023-11-01', '5.1.01 - Despesas com Pessoal', 2800.00),
('Ana Lima',       '111.222.333-44', '2025-02-10', '5.1.01 - Despesas com Pessoal', 4200.00),
('Carlos Mendes',  '555.666.777-88', '2022-07-20', '5.1.01 - Despesas com Pessoal', 5500.00);

-- ============================================================
-- 10. SEED: LANÇAMENTOS + PARTIDAS (com variáveis)
-- ============================================================
SET @uid := (SELECT id FROM usuarios WHERE login='jorge' LIMIT 1);

-- Lançamento 1: Integralização de Capital Social
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-02', 'Integralização de capital social', 'manual', NULL, @uid);
SET @l1 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l1, (SELECT id FROM contas WHERE codigo='1.1.02'), 'D', 50000.00),
(@l1, (SELECT id FROM contas WHERE codigo='3.1.01'), 'C', 50000.00);

-- Lançamento 2: Venda de serviços à vista
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-05', 'Venda de serviços à vista', 'manual', NULL, @uid);
SET @l2 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l2, (SELECT id FROM contas WHERE codigo='1.1.02'), 'D', 2500.00),
(@l2, (SELECT id FROM contas WHERE codigo='4.1.02'), 'C', 2500.00);

-- Lançamento 3: Pagamento de fornecedor de serviços
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-06', 'Pagamento de fornecedor de serviços', 'manual', NULL, @uid);
SET @l3 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l3, (SELECT id FROM contas WHERE codigo='5.1.06'), 'D', 1200.00),
(@l3, (SELECT id FROM contas WHERE codigo='1.1.01'), 'C', 1200.00);

-- Lançamento 4: Pagamento de aluguel
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-08', 'Pagamento de aluguel da sede', 'manual', NULL, @uid);
SET @l4 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l4, (SELECT id FROM contas WHERE codigo='5.1.05'), 'D', 2200.00),
(@l4, (SELECT id FROM contas WHERE codigo='1.1.02'), 'C', 2200.00);

-- Lançamento 5: Venda a prazo (cliente)
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-09', 'Venda de mercadorias a prazo', 'manual', NULL, @uid);
SET @l5 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l5, (SELECT id FROM contas WHERE codigo='1.1.03'), 'D', 7800.00),
(@l5, (SELECT id FROM contas WHERE codigo='4.1.01'), 'C', 7800.00);

-- Lançamento 6: Reconhecimento da folha - Maria
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-10', 'Reconhecimento folha - Maria Souza', 'folha', NULL, @uid);
SET @l6 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l6, (SELECT id FROM contas WHERE codigo='5.1.01'), 'D', 3500.00),
(@l6, (SELECT id FROM contas WHERE codigo='2.1.02'), 'C', 3500.00);

-- Lançamento 7: Encargos sociais da folha - Maria
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-10', 'Encargos sociais - Maria Souza', 'folha', NULL, @uid);
SET @l7 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l7, (SELECT id FROM contas WHERE codigo='5.1.02'), 'D', 280.00),
(@l7, (SELECT id FROM contas WHERE codigo='2.1.03'), 'C', 280.00),
(@l7, (SELECT id FROM contas WHERE codigo='5.1.03'), 'D', 280.00),
(@l7, (SELECT id FROM contas WHERE codigo='2.1.04'), 'C', 280.00);

-- Lançamento 8: Pagamento da folha - Maria
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-15', 'Pagamento de folha - Maria Souza', 'folha', NULL, @uid);
SET @l8 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l8, (SELECT id FROM contas WHERE codigo='2.1.02'), 'D', 3200.00),
(@l8, (SELECT id FROM contas WHERE codigo='1.1.02'), 'C', 3200.00);

-- Lançamento 9: Compra de imobilizado (à vista)
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-18', 'Compra de equipamentos', 'manual', NULL, @uid);
SET @l9 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l9, (SELECT id FROM contas WHERE codigo='1.2.01'), 'D', 8500.00),
(@l9, (SELECT id FROM contas WHERE codigo='1.1.02'), 'C', 8500.00);

-- Lançamento 10: Recebimento de cliente
INSERT INTO `lancamentos` (`data`, `descricao`, `origem`, `origem_id`, `usuario_id`)
VALUES ('2026-01-22', 'Recebimento de duplicata de cliente', 'manual', NULL, @uid);
SET @l10 := LAST_INSERT_ID();
INSERT INTO `partidas` (`lancamento_id`, `conta_id`, `tipo`, `valor`) VALUES
(@l10, (SELECT id FROM contas WHERE codigo='1.1.02'), 'D', 3000.00),
(@l10, (SELECT id FROM contas WHERE codigo='1.1.03'), 'C', 3000.00);

-- ============================================================
-- 11. SEED: FOLHAS DE PAGAMENTO
-- ============================================================
INSERT INTO `folhas`
(`funcionario_id`, `nome_funcionario`, `mes_referencia`, `salario_base`, `total_proventos`, `total_descontos`, `valor_liquido`, `lancamento_id`)
VALUES
((SELECT id FROM funcionarios WHERE nome='Maria Souza' LIMIT 1),
 'Maria Souza',   '2026-01', 3500.00, 3600.00, 400.00, 3200.00, @l6),
((SELECT id FROM funcionarios WHERE nome='João Pereira' LIMIT 1),
 'João Pereira',  '2025-12', 2800.00, 2900.00, 320.00, 2580.00, NULL),
((SELECT id FROM funcionarios WHERE nome='Ana Lima' LIMIT 1),
 'Ana Lima',      '2026-01', 4200.00, 4400.00, 520.00, 3880.00, NULL);

SET FOREIGN_KEY_CHECKS = 1;
