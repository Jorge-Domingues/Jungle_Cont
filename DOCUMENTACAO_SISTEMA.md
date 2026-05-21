# 🌿 Jungle Cont - Documentação Oficial do Sistema
**Versão:** 2.0 (Edição Premium de Alta Integridade)  
**Status:** Produção / Estável  
**Autor:** Antigravity AI & Jungle Team  

---

## 1. Introdução e Filosofia do Projeto
O **Jungle Cont** nasceu da necessidade de desmistificar a contabilidade para o pequeno empresário. O nome "Jungle" (Selva) remete ao ambiente de negócios: desafiador, dinâmico e que exige ferramentas resilientes para o crescimento. 

Diferente de softwares genéricos de "controle de caixa", o Jungle Cont é um sistema de **integridade contábil pura**. Ele não apenas registra que o dinheiro saiu, mas exige que o usuário defina a origem e o destino de cada centavo, garantindo que o **Balanço Patrimonial** esteja sempre em equilíbrio.

---

## 2. Stack de Tecnologias (Arquitetura Profunda)
O sistema foi projetado para ser "Zero-Dependency" no frontend e "Bulletproof" no backend.

*   **Backend (Cérebro):** Node.js utilizando o módulo `http` nativo para processamento de rotas. Isso elimina vulnerabilidades de frameworks terceiros e garante uma execução extremamente leve.
*   **Frontend (Interface):** Desenvolvido em **Vanilla JavaScript**. Não utiliza React, Vue ou Angular, o que significa que o código é interpretado instantaneamente pelo navegador, sem necessidade de compilação, facilitando auditorias e customizações rápidas.
*   **Camada de Dados:** MariaDB 11.x. Escolhido por sua compatibilidade total com MySQL, mas com melhorias significativas em performance de escrita e segurança de transações.
*   **Virtualização:** Docker Engine. Todo o ecossistema é encapsulado em containers, permitindo que o sistema rode de forma idêntica em Windows, Linux ou Mac, sem conflitos de versão de software.

---

## 3. Dicionário de Dados e Estrutura de Tabelas
Para desenvolvedores e auditores, aqui está a anatomia do banco de dados `jungle_cont`:

### 3.1. Tabela `contas` (O Coração)
*   `id`: Chave primária única.
*   `codigo`: String de identificação (Ex: 1.1.01). Essencial para a hierarquia do plano de contas.
*   `nome`: Nome descritivo da conta.
*   `tipo`: Classificador de natureza (Ativo, Passivo, Receita, Despesa).
*   `saldo_inicial`: Valor de abertura da conta. Crucial para o cálculo do saldo acumulado no Razão.
*   `cor`: Hexadecimal da cor (Ex: #ef4444). Usado para branding visual por tipo de conta.

### 3.2. Tabela `fatos` (O Livro Diário)
*   `conta_id`: Vínculo (FK) com a conta afetada.
*   `descricao`: O "porquê" do movimento.
*   `valor`: Valor monetário da operação.
*   `tipo`: Se o movimento é uma "entrada" (Débito) ou "saída" (Crédito).
*   `data`: Timestamp da ocorrência.

### 3.3. Tabela `folhas` (Gestão de Pessoal)
*   `funcionario_id`: Quem recebeu.
*   `valor_liquido`: O que saiu do banco.
*   `conta_id`: **Vínculo de Origem.** De qual conta de Ativo o dinheiro foi retirado.
*   `fato_id`: **Vínculo Contábil.** O ID do registro no Livro Diário que comprova o pagamento.

---

## 4. Manual Contábil para o Usuário
Para operar o Jungle Cont, é importante entender os pilares da contabilidade moderna:

### 4.1. A Equação Fundamental
O sistema valida constantemente a equação:
> **Ativo = Passivo + Patrimônio Líquido**

Se você tem R$ 10.000 no banco (Ativo) e não deve nada a ninguém (Passivo), seu Patrimônio Líquido é de R$ 10.000. Se você tomar um empréstimo de R$ 2.000, seu Ativo sobe para R$ 12.000, mas seu Passivo também sobe para R$ 2.000, mantendo a balança equilibrada.

### 4.2. Natureza das Contas
O Jungle Cont automatiza o comportamento dos saldos:
*   **Contas de Ativo (Bancos, Clientes):** São aumentadas por **Débitos** e diminuídas por **Créditos**.
*   **Contas de Passivo (Dívidas, Fornecedores):** São aumentadas por **Créditos** e diminuídas por **Débitos**.
*   **Contas de Resultado (Receitas/Despesas):** Medem a performance da empresa em um período.

---

## 5. Glossário de Termos (Traduzindo o "Contabilês")
*   **Fato Contábil:** Qualquer evento que altere o patrimônio (ex: uma venda, um pagamento).
*   **Livro Razão:** O "extrato" de uma conta específica. É onde você vê o detalhe de tudo o que aconteceu com o seu Banco ou suas Vendas.
*   **Balancete:** Um resumo de todas as contas para verificar se a contabilidade "bateu".
*   **Partidas Dobradas:** O método de registrar uma entrada e uma saída para cada evento. Se você vendeu, o dinheiro **entrou** no Banco e **saiu** da conta de Vendas.

---

## 6. Segurança e Experiência do Usuário (UX)
O Jungle Cont prioriza a **segurança operacional**:
*   **Confirmação Gráfica:** Ao inserir saldos iniciais manuais, o sistema exige uma confirmação via modal customizado, impedindo que erros de digitação alterem o balanço sem aviso.
*   **Integridade Referencial:** O sistema impede a exclusão de contas que possuam fatos vinculados, protegendo o histórico financeiro da empresa.
*   **Interface Glassmorphism:** O design utiliza transparências e cores vibrantes para reduzir a fadiga visual do operador, tornando a gestão uma tarefa agradável.

---

## 7. Roadmap e Visão de Futuro
O sistema está preparado para evoluções modulares:
1.  **Módulo DRE:** Implementação do Demonstrativo de Resultado do Exercício para análise de lucro líquido.
2.  **Exportação em Excel/PDF:** Geração automática de relatórios formatados para envio a contadores externos.
3.  **Multi-Empresa:** Suporte para gerir várias empresas dentro da mesma infraestrutura.
4.  **Dashboard de BI:** Gráficos interativos para análise de tendências de gastos e receitas.

---

## 8. Guia de Operação Rápida (Startup)
1.  **Ligar:** Execute `INICIAR_JUNGLE_CONT.bat`.
2.  **Acessar:** Abra o navegador em `http://localhost:3000`.
3.  **Cadastrar:** Crie suas contas de Ativo (Bancos) com seus respectivos saldos reais.
4.  **Operar:** Registre suas vendas e despesas diariamente.
5.  **Monitorar:** Olhe o Balancete toda sexta-feira para garantir que a saúde financeira está em dia.

---
*Documento oficial gerado e validado pelo motor de inteligência artificial Antigravity para a plataforma Jungle Cont.*
