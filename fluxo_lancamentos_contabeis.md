# 📒 Fluxo de Lançamentos Contábeis — Jungle Cont

## Visão Geral

O Jungle Cont opera com dois **pontos de entrada** para lançamentos contábeis e três **pontos de saída** (relatórios). Todo lançamento gira em torno de duas entidades centrais: **Contas** e **Fatos**.

```
┌─────────────────────────────────────────────────────────────┐
│                     PONTOS DE ENTRADA                       │
│                                                             │
│   [1] Lançamento Manual          [2] Folha de Pagamento     │
│      (Fatos Contábeis)               (Automático)           │
└──────────────────┬───────────────────────┬──────────────────┘
                   │                       │
                   ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    NÚCLEO: Tabela `fatos`                    │
│   id | conta_id | tipo | descricao | data | valor           │
└──────────────┬──────────────────────────────────────────────┘
               │ (conta_id → FK)
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tabela `contas`                           │
│   id | nome | tipo | codigo | saldo_inicial | cor           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   PONTOS DE SAÍDA                           │
│   [A] Livro Razão   [B] Balancete   [C] Dashboard (Home)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Estrutura de Dados

### Tabela `contas` — O Plano de Contas
Cada conta é um **grupamento contábil** (ex: Caixa, Banco, Despesas de Pessoal).

| Campo          | Tipo          | Descrição                                 |
|----------------|---------------|-------------------------------------------|
| `id`           | INT (PK)      | Identificador único                       |
| `nome`         | VARCHAR(255)  | Nome da conta (ex: "Caixa")               |
| `tipo`         | VARCHAR(100)  | Classificação (ex: Ativo, Passivo, etc.)  |
| `codigo`       | VARCHAR(20)   | Código contábil (ex: "1.1.01")            |
| `saldo_inicial`| DECIMAL(12,2) | Saldo de abertura da conta                |
| `descricao`    | TEXT          | Descrição livre da conta                  |
| `cor`          | VARCHAR(7)    | Cor de identificação visual (HEX)         |

### Tabela `fatos` — O Diário Contábil
Cada **fato** é um lançamento individual. É o coração do sistema.

| Campo       | Tipo          | Descrição                                        |
|-------------|---------------|--------------------------------------------------|
| `id`        | INT (PK)      | Identificador único                              |
| `conta_id`  | INT (FK)      | Referência à conta afetada                       |
| `tipo`      | VARCHAR(50)   | `"entrada"` (Débito) ou `"saida"` (Crédito)      |
| `descricao` | TEXT          | Histórico do lançamento                          |
| `data`      | DATE          | Data de competência do fato                      |
| `valor`     | DECIMAL(10,2) | Valor monetário do lançamento                    |

### Tabela `folhas` — Histórico de Folha de Pagamento
Registra cada folha gravada, vinculada tanto à **conta** quanto ao **fato** gerado automaticamente.

| Campo              | Tipo          | Descrição                                  |
|--------------------|---------------|--------------------------------------------|
| `id`               | INT (PK)      | Identificador único                        |
| `funcionario_id`   | INT (FK)      | Referência ao funcionário                  |
| `nome_funcionario` | VARCHAR(255)  | Nome em texto (histórico)                  |
| `mes_referencia`   | VARCHAR(20)   | Ex: "Abril/2026"                           |
| `salario_base`     | DECIMAL(10,2) | Salário bruto contratado                   |
| `total_proventos`  | DECIMAL(10,2) | Soma de todos os proventos                 |
| `total_descontos`  | DECIMAL(10,2) | Soma de todos os descontos (INSS, VT...)   |
| `valor_liquido`    | DECIMAL(10,2) | Líquido a pagar ao funcionário             |
| `conta_id`         | INT (FK)      | Conta debitada no pagamento                |
| `fato_id`          | INT (FK)      | Fato contábil gerado pelo pagamento        |
| `data_gravacao`    | TIMESTAMP     | Momento em que a folha foi processada      |

---

## 2. Fluxo A — Lançamento Manual (Fatos Contábeis)

Este é o caminho para registrar **qualquer evento contábil avulso** (receitas, despesas, compras, etc.).

```
Usuário acessa /fatos.html
        │
        ▼
1. Carrega lista de Contas
   GET /api/contas → popula o <select id="conta">
        │
        ▼
2. Usuário preenche o formulário:
   ┌─────────────────────────────────┐
   │  CONTA     → select (id da conta)│
   │  TIPO      → "entrada" | "saida" │
   │  DESCRIÇÃO → texto livre         │
   │  DATA      → date picker         │
   │  VALOR     → R$ (com máscara)    │
   └─────────────────────────────────┘
        │
        ▼
3. Clica em "Registrar Fato"
   → registrarFato() [fatos.js]
   → Valida campos (todos obrigatórios)
   → Formata valor (remove "R$", pontos, troca vírgula por ponto)
        │
        ▼
4. POST /api/fatos
   Body: { conta_id, tipo, data, valor, historico }
        │
        ▼
5. Backend (server.js) executa:
   INSERT INTO fatos (conta_id, tipo, descricao, data, valor)
   VALUES (?, ?, ?, ?, ?)
        │
        ▼
6. Resposta 201 → Modal de sucesso
   → limparCampos()
   → carregarFatos() → GET /api/fatos → re-renderiza tabela
```

### Consulta de Fatos (com JOIN)
Ao listar fatos, o sistema faz um JOIN para trazer o **nome da conta** junto:
```sql
SELECT f.*, c.nome as nome_conta 
FROM fatos f 
LEFT JOIN contas c ON f.conta_id = c.id 
ORDER BY f.data DESC
```

---

## 3. Fluxo B — Lançamento Automático (Folha de Pagamento)

A **Folha de Pagamento** é o único fluxo que gera lançamentos de forma automática, sem intervenção manual em `fatos`.

```
Usuário acessa /folha.html
        │
        ▼
1. Carrega Funcionários e Contas (em paralelo)
   GET /api/funcionarios → popula <select id="selectFuncionario">
   GET /api/contas       → popula <select id="selectContaPagamento">
        │
        ▼
2. Usuário seleciona o funcionário → calcularTudo() [folha.js]
   ┌────────────────────────────────────────────────────────┐
   │  Salário Base   = funcionario.salario                  │
   │  H. Extras (50%)= (salario/220h) × 1.5 × qtd_horas    │
   │  Bonificações   = valor informado                      │
   │                                                        │
   │  INSS Progressivo:                                     │
   │    até R$1.412,00 → 7,5%                               │
   │    até R$2.666,68 → 9%                                 │
   │    até R$4.000,03 → 12%                                │
   │    até R$7.786,02 → 14%                                │
   │                                                        │
   │  Desconto Faltas = (salario/30) × qtd_dias             │
   │  Vale Transporte = 6% do salário (se marcado)          │
   │  FGTS (Provisão) = 8% do salário bruto (informativo)   │
   │                                                        │
   │  LÍQUIDO = (Salário + HE + Bônus) - INSS - Faltas - VT │
   └────────────────────────────────────────────────────────┘
        │
        ▼
3. Clica em "Gravar Folha" → gravarFolha() [folha.js]
   → POST /api/folhas
   Body: { funcionario_id, nome, salario_base, proventos,
           descontos, liquido, conta_id }
        │
        ▼
4. Backend executa DUAS operações em sequência (server.js):

   ┌── Operação 1: Cria o Fato Contábil ──────────────────┐
   │  INSERT INTO fatos                                    │
   │  (conta_id, descricao, valor, tipo, data)             │
   │  VALUES (conta_id, 'Pagamento de Folha - [nome]',     │
   │          liquido, 'saida', NOW())                     │
   │  → Captura o fato_id gerado (insertId)               │
   └───────────────────────────────────────────────────────┘
                        │
                        ▼
   ┌── Operação 2: Cria o Histórico de Folha ─────────────┐
   │  INSERT INTO folhas                                   │
   │  (funcionario_id, nome_funcionario, salario_base,     │
   │   total_proventos, total_descontos, valor_liquido,    │
   │   conta_id, fato_id)                                  │
   │  VALUES (...)                                         │
   │  → fato_id vincula a folha ao lançamento contábil    │
   └───────────────────────────────────────────────────────┘
        │
        ▼
5. Resposta 201 → Modal de sucesso
```

> [!IMPORTANT]
> O lançamento na tabela `fatos` é sempre do tipo **`"saida"`** (Crédito), pois a folha representa uma **saída de caixa** da conta selecionada. O campo `fato_id` em `folhas` garante rastreabilidade total — é possível consultar em qual conta o pagamento foi debitado.

---

## 4. Pontos de Saída (Relatórios)

### A. Livro Razão (`/razao.html`)

Exibe todos os lançamentos agrupados **por conta**.

```
GET /api/contas   → lista contas no <select>
Usuário seleciona uma conta e clica "Filtrar Razão"
      │
      ▼
GET /api/fatos    → todos os fatos (com nome_conta via JOIN)
      │
      ▼
JS filtra fatos onde fato.conta_id === conta selecionada
      │
      ▼
Renderiza: Débitos (entradas) | Créditos (saídas) | Saldo Corrente
```

**Cálculo do Saldo:**
```
Saldo = conta.saldo_inicial 
      + Σ(fatos onde tipo = "entrada")
      - Σ(fatos onde tipo = "saida")
```

---

### B. Balancete (`/balancete.html`)

Exibe **todas as contas** em uma única visão consolidada.

```
GET /api/contas → todas as contas
GET /api/fatos  → todos os fatos
      │
      ▼
Para cada conta, JS calcula:
  Débito Total  = saldo_inicial + Σ(entradas da conta)
  Crédito Total = Σ(saídas da conta)
  Saldo Atual   = Débito Total - Crédito Total
      │
      ▼
Tabela: Código | Conta | Débito | Crédito | Saldo Atual
Painel lateral: Resumo Patrimonial + Equação Fundamental
```

**Equação Fundamental:**
```
Ativo = Passivo + Patrimônio Líquido
```

---

### C. Dashboard / Home (`/home.html`)

Exibe indicadores financeiros resumidos.

```
GET /api/contas → saldo_inicial de cada conta
GET /api/fatos  → movimentações
      │
      ▼
Totais Calculados:
  Total Entradas = Σ(fatos tipo "entrada")
  Total Saídas   = Σ(fatos tipo "saida")
  Saldo Líquido  = Total Entradas - Total Saídas
```

---

## 5. Diagrama Completo de Relacionamentos

```
funcionarios ──────────────────────────────┐
  id, nome, cpf, salario                   │ (FK: funcionario_id)
                                           ▼
                                         folhas ──────────────────┐
                                           │                      │
                                    (FK: fato_id)          (FK: conta_id)
                                           │                      │
                                           ▼                      │
contas ◄──── (FK: conta_id) ───── fatos ◄─┘                      │
  id                                  id                          │
  nome                                conta_id ◄──────────────── ┘
  tipo                                tipo (entrada/saida)
  codigo                              descricao
  saldo_inicial                       data
  cor                                 valor
```

---

## 6. Resumo das Rotas de API

| Método | Rota                   | Módulo         | Função                                    |
|--------|------------------------|----------------|-------------------------------------------|
| GET    | `/api/fatos`           | Lançamentos    | Lista todos os fatos (com nome da conta)  |
| POST   | `/api/fatos`           | Lançamentos    | Registra um novo fato manual              |
| GET    | `/api/contas`          | Plano de Contas| Lista todas as contas                     |
| POST   | `/api/contas`          | Plano de Contas| Cadastra nova conta                       |
| PUT    | `/api/contas/:id`      | Plano de Contas| Edita uma conta existente                 |
| DELETE | `/api/contas/:id`      | Plano de Contas| Remove uma conta                          |
| GET    | `/api/funcionarios`    | RH             | Lista todos os funcionários               |
| POST   | `/api/funcionarios`    | RH             | Cadastra novo funcionário                 |
| DELETE | `/api/funcionarios/:id`| RH             | Remove um funcionário                     |
| POST   | `/api/folhas`          | Folha          | Grava folha + cria fato contábil (2 IDs)  |
| POST   | `/api/login`           | Auth           | Autenticação do usuário                   |

---

## 7. Regras de Negócio Críticas

> [!WARNING]
> **Exclusão em cascata não está implementada.** Se uma conta for excluída enquanto possui fatos vinculados, o banco retornará erro de FK. A exclusão de contas com movimentação deve ser bloqueada no frontend.

> [!NOTE]
> **O FGTS não gera um fato contábil.** Ele é exibido no demonstrativo da folha como **provisão informativa**, mas não cria um lançamento na tabela `fatos`. Para controle de FGTS, seria necessário um lançamento manual posterior.

> [!TIP]
> **Rastreabilidade Total via `fato_id`:** Toda folha gravada gera um `fato_id` que a conecta diretamente ao lançamento contábil. Isso significa que no Razão e no Balancete, os pagamentos de folha aparecem automaticamente, sem duplicidade.
