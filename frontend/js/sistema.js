// ===== DADOS DA API =====
let contas = [];
let fatos = [];
let funcionarios = [];

// ===== SALVAR =====
function salvarDados(){
    console.log("Salvamento local desativado. Aguardando API.");
}

// =========================
// CADASTRO FUNCIONÁRIO
// =========================
function cadastrarFuncionario(){
    let nome = document.getElementById("nome").value;
    let cargo = document.getElementById("cargo").value;
    let salario = document.getElementById("salario").value;

    funcionarios.push({nome, cargo, salario});
    salvarDados();

    alert("Funcionário cadastrado!");
    listarFuncionarios();
}

function listarFuncionarios(){
    let lista = document.getElementById("listaFuncionarios");
    lista.innerHTML = "";

    funcionarios.forEach(f => {
        lista.innerHTML += `<li>${f.nome} - ${f.cargo} - R$ ${f.salario}</li>`;
    });
}

// =========================
// CONTAS CONTÁBEIS
// =========================
function cadastrarConta(){
    let nome = document.getElementById("contaNome").value;
    let tipo = document.getElementById("contaTipo").value;

    contas.push({nome, tipo});
    salvarDados();

    alert("Conta cadastrada!");
    listarContas();
}

function listarContas(){
    let lista = document.getElementById("listaContas");
    lista.innerHTML = "";

    contas.forEach(c => {
        lista.innerHTML += `<li>${c.nome} (${c.tipo})</li>`;
    });
}

// =========================
// FATOS CONTÁBEIS
// =========================
function cadastrarFato(){
    let data = document.getElementById("data").value;
    let descricao = document.getElementById("descricao").value;
    let debito = document.getElementById("debito").value;
    let credito = document.getElementById("credito").value;
    let valor = parseFloat(document.getElementById("valor").value);

    if(debito === credito){
        alert("Débito e crédito não podem ser iguais!");
        return;
    }

    fatos.push({data, descricao, debito, credito, valor});
    salvarDados();

    alert("Fato registrado!");
}

// =========================
// DIÁRIO
// =========================
function gerarDiario(){
    let lista = document.getElementById("diario");
    lista.innerHTML = "";

    fatos.forEach(f => {
        lista.innerHTML += `
            <div>
                <strong>${f.data}</strong><br>
                Débito: ${f.debito} - ${f.valor}<br>
                Crédito: ${f.credito} - ${f.valor}<br>
                Histórico: ${f.descricao}
                <hr>
            </div>
        `;
    });
}

// =========================
// RAZÃO
// =========================
function gerarRazao(){
    let container = document.getElementById("razao");
    container.innerHTML = "";

    contas.forEach(conta => {
        let saldo = 0;
        let html = `<h3>${conta.nome}</h3>`;

        fatos.forEach(f => {
            if(f.debito === conta.nome){
                saldo += f.valor;
                html += `Débito: +${f.valor}<br>`;
            }
            if(f.credito === conta.nome){
                saldo -= f.valor;
                html += `Crédito: -${f.valor}<br>`;
            }
        });

        html += `<strong>Saldo: ${saldo}</strong><hr>`;
        container.innerHTML += html;
    });
}

// =========================
// BALANCETE
// =========================
function gerarBalancete(){
    let tabela = document.getElementById("balancete");
    tabela.innerHTML = "";

    let totalDebito = 0;
    let totalCredito = 0;

    contas.forEach(conta => {
        let deb = 0;
        let cred = 0;

        fatos.forEach(f => {
            if(f.debito === conta.nome) deb += f.valor;
            if(f.credito === conta.nome) cred += f.valor;
        });

        totalDebito += deb;
        totalCredito += cred;

        tabela.innerHTML += `
            <tr>
                <td>${conta.nome}</td>
                <td>${deb}</td>
                <td>${cred}</td>
            </tr>
        `;
    });

    tabela.innerHTML += `
        <tr>
            <td><strong>Total</strong></td>
            <td>${totalDebito}</td>
            <td>${totalCredito}</td>
        </tr>
    `;
}