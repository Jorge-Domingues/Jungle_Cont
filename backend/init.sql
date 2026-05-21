CREATE DATABASE IF NOT EXISTS jungle_cont;
USE jungle_cont;

CREATE TABLE IF NOT EXISTS contas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS funcionarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    data_ingresso DATE NOT NULL,
    conta VARCHAR(100) NOT NULL,
    salario DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS fatos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
);

-- Inserir usuário administrador padrão (senha: admin criptografada)
INSERT IGNORE INTO usuarios (login, senha) VALUES ('admin', '$2a$10$noejfe5i9Jl7cGJoRUH.wuvpIz9Oz9lZz3XhQb4kPsZ4ydlOAVkAu');
