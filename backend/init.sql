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
-- SEED: Usuário padrão do sistema
-- ============================================================
INSERT INTO `usuarios` (`login`, `senha`) VALUES
('admin', 'admin123');

SET FOREIGN_KEY_CHECKS = 1;

