-- Dump completo do banco Jungle Cont
-- Banco: jungle_cont
-- Gerado em: 2026-05-21
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `jungle_cont` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `jungle_cont`;

-- --------------------------------------------------------
-- Estrutura da tabela `contas`
DROP TABLE IF EXISTS `contas`;
CREATE TABLE `contas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `tipo` varchar(100) NOT NULL,
  `codigo` varchar(20) DEFAULT NULL,
  `saldo_inicial` decimal(12,2) DEFAULT 0.00,
  `descricao` text DEFAULT NULL,
  `cor` varchar(7) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------
-- Estrutura da tabela `fatos`
DROP TABLE IF EXISTS `fatos`;
CREATE TABLE `fatos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `data` date NOT NULL,
  `descricao` text NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `conta_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `conta_id` (`conta_id`),
  CONSTRAINT `fk_fatos_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------
-- Estrutura da tabela `folhas`
DROP TABLE IF EXISTS `folhas`;
CREATE TABLE `folhas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `funcionario_id` int(11) DEFAULT NULL,
  `nome_funcionario` varchar(255) DEFAULT NULL,
  `mes_referencia` varchar(20) DEFAULT NULL,
  `salario_base` decimal(10,2) DEFAULT NULL,
  `total_proventos` decimal(10,2) DEFAULT NULL,
  `total_descontos` decimal(10,2) DEFAULT NULL,
  `valor_liquido` decimal(10,2) DEFAULT NULL,
  `data_gravacao` timestamp NULL DEFAULT current_timestamp(),
  `conta_id` int(11) DEFAULT NULL,
  `fato_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `funcionario_id` (`funcionario_id`),
  KEY `fk_folha_conta` (`conta_id`),
  KEY `idx_folhas_fato_id` (`fato_id`),
  CONSTRAINT `fk_folhas_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`),
  CONSTRAINT `fk_folhas_fato` FOREIGN KEY (`fato_id`) REFERENCES `fatos` (`id`),
  CONSTRAINT `fk_folhas_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------
-- Estrutura da tabela `funcionarios`
DROP TABLE IF EXISTS `funcionarios`;
CREATE TABLE `funcionarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `cpf` varchar(14) NOT NULL,
  `data_ingresso` date NOT NULL,
  `conta` varchar(100) NOT NULL,
  `salario` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf` (`cpf`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------
-- Estrutura da tabela `usuarios`
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `login` varchar(100) NOT NULL,
  `senha` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `login` (`login`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO `usuarios` (`login`, `senha`) VALUES 
('jorge', '123'),
('logan', '123'),
('gabriel', '123'),
('natan', '123');

SET FOREIGN_KEY_CHECKS = 1;
