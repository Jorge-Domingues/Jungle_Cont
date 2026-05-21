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

-- --------------------------------------------------------
-- Dados da tabela `contas`
INSERT INTO `contas` (`id`, `nome`, `tipo`, `codigo`, `saldo_inicial`, `descricao`, `cor`) VALUES (1, 'Caixa Geral', 'Ativo', '1.1.01', '1000.00', 'Conta de caixa para movimentacoes internas', '#10b981');
INSERT INTO `contas` (`id`, `nome`, `tipo`, `codigo`, `saldo_inicial`, `descricao`, `cor`) VALUES (2, 'Banco Principal', 'Ativo', '1.1.02', '5000.00', 'Conta bancaria principal da empresa', '#10b981');
INSERT INTO `contas` (`id`, `nome`, `tipo`, `codigo`, `saldo_inicial`, `descricao`, `cor`) VALUES (3, 'Receita de Vendas', 'Receita', '3.1.01', '0.00', 'Receitas geradas por vendas de produtos', '#3b82f6');
INSERT INTO `contas` (`id`, `nome`, `tipo`, `codigo`, `saldo_inicial`, `descricao`, `cor`) VALUES (4, 'Servicos Prestados', 'Receita', '3.1.02', '0.00', 'Receitas geradas por servicos prestados', '#3b82f6');
INSERT INTO `contas` (`id`, `nome`, `tipo`, `codigo`, `saldo_inicial`, `descricao`, `cor`) VALUES (5, 'Fornecedores', 'Passivo', '2.1.01', '0.00', 'Obrigacoes com fornecedores', '#f59e0b');
INSERT INTO `contas` (`id`, `nome`, `tipo`, `codigo`, `saldo_inicial`, `descricao`, `cor`) VALUES (6, 'Salarios a Pagar', 'Passivo', '2.1.02', '0.00', 'Obrigacoes de folha salarial', '#f59e0b');
INSERT INTO `contas` (`id`, `nome`, `tipo`, `codigo`, `saldo_inicial`, `descricao`, `cor`) VALUES (7, 'Despesas Administrativas', 'Despesa', '4.1.01', '0.00', 'Despesas administrativas gerais', '#ef4444');
INSERT INTO `contas` (`id`, `nome`, `tipo`, `codigo`, `saldo_inicial`, `descricao`, `cor`) VALUES (8, 'Marketing e Publicidade', 'Despesa', '4.1.02', '0.00', 'Despesas com marketing e publicidade', '#ef4444');

-- --------------------------------------------------------
-- Dados da tabela `fatos`
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (1, '2026-01-05', 'Venda de produtos no mercado local', 'entrada', '18500.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (2, '2026-01-05', 'Venda de produtos no mercado local', 'saida', '18500.00', 3);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (3, '2026-01-08', 'Pagamento de despesas em dinheiro', 'entrada', '420.00', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (4, '2026-01-08', 'Pagamento de despesas em dinheiro', 'saida', '420.00', 1);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (5, '2026-01-12', 'Pagamento de fornecedor de insumos', 'entrada', '7200.00', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (6, '2026-01-12', 'Pagamento de fornecedor de insumos', 'saida', '7200.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (7, '2026-01-25', 'Recebimento por servicos prestados', 'entrada', '9400.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (8, '2026-01-25', 'Recebimento por servicos prestados', 'saida', '9400.00', 4);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (9, '2026-02-03', 'Despesa com campanha de marketing', 'entrada', '3100.00', 8);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (10, '2026-02-03', 'Despesa com campanha de marketing', 'saida', '3100.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (11, '2026-02-10', 'Provisionamento da folha salarial', 'entrada', '37400.00', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (12, '2026-02-10', 'Provisionamento da folha salarial', 'saida', '37400.00', 6);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (13, '2026-02-14', 'Pagamento de tarifas bancarias', 'entrada', '180.00', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (14, '2026-02-14', 'Pagamento de tarifas bancarias', 'saida', '180.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (15, '2026-02-18', 'Venda corporativa para cliente recorrente', 'entrada', '26800.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (16, '2026-02-18', 'Venda corporativa para cliente recorrente', 'saida', '26800.00', 3);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (17, '2026-02-20', 'Pagamento parcial de fornecedor', 'entrada', '2800.00', 5);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (18, '2026-02-20', 'Pagamento parcial de fornecedor', 'saida', '2800.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (19, '2026-02-28', 'Baixa de salarios pagos', 'entrada', '37400.00', 6);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (20, '2026-02-28', 'Baixa de salarios pagos', 'saida', '37400.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (21, '2026-03-04', 'Compra de equipamentos administrativos a prazo', 'entrada', '12500.00', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (22, '2026-03-04', 'Compra de equipamentos administrativos a prazo', 'saida', '12500.00', 5);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (23, '2026-03-12', 'Contrato de servicos concluido', 'entrada', '12800.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (24, '2026-03-12', 'Contrato de servicos concluido', 'saida', '12800.00', 4);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (25, '2026-03-22', 'Pagamento de aluguel do escritorio', 'entrada', '4800.00', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (26, '2026-03-22', 'Pagamento de aluguel do escritorio', 'saida', '4800.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (27, '2026-04-02', 'Venda online de produtos', 'entrada', '11200.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (28, '2026-04-02', 'Venda online de produtos', 'saida', '11200.00', 3);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (29, '2026-04-05', 'Producao de material publicitario', 'entrada', '1850.00', 8);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (30, '2026-04-05', 'Producao de material publicitario', 'saida', '1850.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (31, '2026-04-11', 'Pagamento de servicos de TI', 'entrada', '2600.00', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (32, '2026-04-11', 'Pagamento de servicos de TI', 'saida', '2600.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (33, '2026-04-16', 'Recebimento de consultoria tecnica', 'entrada', '9600.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (34, '2026-04-16', 'Recebimento de consultoria tecnica', 'saida', '9600.00', 4);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (35, '2026-04-23', 'Recebimento de projeto especial', 'entrada', '22100.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (36, '2026-04-23', 'Recebimento de projeto especial', 'saida', '22100.00', 3);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (37, '2026-05-03', 'Compra de material de escritorio', 'entrada', '1350.00', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (38, '2026-05-03', 'Compra de material de escritorio', 'saida', '1350.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (39, '2026-05-09', 'Venda de assinaturas mensais', 'entrada', '17600.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (40, '2026-05-09', 'Venda de assinaturas mensais', 'saida', '17600.00', 3);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (41, '2026-05-18', 'Despesa com treinamento da equipe', 'entrada', '3900.00', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (42, '2026-05-18', 'Despesa com treinamento da equipe', 'saida', '3900.00', 2);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (43, '2026-05-21', 'Pagamento de Folha - Ana Souza', 'entrada', '4051.18', 7);
INSERT INTO `fatos` (`id`, `data`, `descricao`, `tipo`, `valor`, `conta_id`) VALUES (44, '2026-05-21', 'Pagamento de Folha - Ana Souza', 'saida', '4051.18', 2);

-- --------------------------------------------------------
-- Dados da tabela `folhas`
INSERT INTO `folhas` (`id`, `funcionario_id`, `nome_funcionario`, `mes_referencia`, `salario_base`, `total_proventos`, `total_descontos`, `valor_liquido`, `data_gravacao`, `conta_id`, `fato_id`) VALUES (1, 1, 'Ana Souza', '2026-05', '4500.00', '4500.00', '448.82', '4051.18', '2026-05-21 06:27:31', 2, 44);

-- --------------------------------------------------------
-- Dados da tabela `funcionarios`
INSERT INTO `funcionarios` (`id`, `nome`, `cpf`, `data_ingresso`, `conta`, `salario`) VALUES (1, 'Ana Souza', '123.456.789-10', '2022-03-14', 'Salarios a Pagar', '4500.00');
INSERT INTO `funcionarios` (`id`, `nome`, `cpf`, `data_ingresso`, `conta`, `salario`) VALUES (2, 'Bruno Lima', '234.567.890-11', '2021-08-02', 'Salarios a Pagar', '5200.00');
INSERT INTO `funcionarios` (`id`, `nome`, `cpf`, `data_ingresso`, `conta`, `salario`) VALUES (3, 'Carla Mendes', '345.678.901-12', '2023-01-20', 'Salarios a Pagar', '3900.00');
INSERT INTO `funcionarios` (`id`, `nome`, `cpf`, `data_ingresso`, `conta`, `salario`) VALUES (4, 'Diego Rocha', '456.789.012-13', '2020-11-05', 'Salarios a Pagar', '6100.00');
INSERT INTO `funcionarios` (`id`, `nome`, `cpf`, `data_ingresso`, `conta`, `salario`) VALUES (5, 'Elisa Torres', '567.890.123-14', '2024-04-10', 'Salarios a Pagar', '3200.00');
INSERT INTO `funcionarios` (`id`, `nome`, `cpf`, `data_ingresso`, `conta`, `salario`) VALUES (6, 'Felipe Martins', '678.901.234-15', '2022-09-28', 'Salarios a Pagar', '4800.00');
INSERT INTO `funcionarios` (`id`, `nome`, `cpf`, `data_ingresso`, `conta`, `salario`) VALUES (7, 'Gabriela Costa', '789.012.345-16', '2023-06-12', 'Salarios a Pagar', '4100.00');
INSERT INTO `funcionarios` (`id`, `nome`, `cpf`, `data_ingresso`, `conta`, `salario`) VALUES (8, 'Henrique Alves', '890.123.456-17', '2021-12-01', 'Salarios a Pagar', '5600.00');

-- --------------------------------------------------------
-- Dados da tabela `usuarios`
INSERT INTO `usuarios` (`id`, `login`, `senha`) VALUES (2, 'jorge', '$2a$10$DD1QaSmWSq0.xJn50zJXnOXFY4sL1qq1cLHP/i4UbRaqprJ07EVDu');
INSERT INTO `usuarios` (`id`, `login`, `senha`) VALUES (6, 'logan', '$2a$10$cQV6PyBNtkKmv00SH1x7qeB5.mWTGLw2qM6e4BqzYN6tLneFWxbki');
INSERT INTO `usuarios` (`id`, `login`, `senha`) VALUES (7, 'natan', '$2a$10$KBIM7J1Qz3eg/TlI7LxLD.8QQBlGXhoYcTEijYOkr/O.vFUYzs4UO');
INSERT INTO `usuarios` (`id`, `login`, `senha`) VALUES (8, 'gabriel', '$2a$10$Isg7Wrz4UYylIFdD2AQDnO8.j0k0bPxVAVmOmJ69/e6yn3UwqNmIO');

SET FOREIGN_KEY_CHECKS = 1;
