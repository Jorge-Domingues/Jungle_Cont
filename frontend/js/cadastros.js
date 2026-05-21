let funcionarios = []; // Aguardando API

let abaAtual = 'funcionario';

/* TROCAR ABA */
function trocarAba(tipo){
    abaAtual = tipo;
    document.querySelectorAll(".form").forEach(f=>f.classList.remove("ativo"));
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));

    if(tipo==="funcionario"){
        document.getElementById("formFuncionario").classList.add("ativo");
        document.querySelectorAll(".tab")[0].classList.add("active");
        document.getElementById("tituloLista").innerText = "Funcionários";
        carregarFuncionarios();
    }else{
        document.getElementById("formConta").classList.add("ativo");
        document.querySelectorAll(".tab")[1].classList.add("active");
        document.getElementById("tituloLista").innerText = "Plano de Contas";
        carregarContas();
    }
}

/* ===== MÁSCARAS ===== */

// CPF
document.getElementById("cpf").addEventListener("input", function(e){
    let v = e.target.value.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = v;
});

// SALÁRIO
document.getElementById("salario").addEventListener("input", function(e){
    let v = e.target.value.replace(/\D/g, "");
    v = (v / 100).toFixed(2) + "";
    v = v.replace(".", ",");
    v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    e.target.value = "R$ " + v;
});

// CONTA (somente números)
document.getElementById("conta").addEventListener("input", function(e){
    e.target.value = e.target.value.replace(/\D/g, "");
});

// SALDO INICIAL CONTA
document.getElementById("saldoInicialConta").addEventListener("input", function(e){
    let v = e.target.value.replace(/\D/g, "");
    v = (v / 100).toFixed(2) + "";
    v = v.replace(".", ",");
    v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    e.target.value = "R$ " + v;
});

/* ===== VALIDAÇÃO CPF REAL ===== */
function validarCPF(cpf){
    cpf = cpf.replace(/\D/g, "");

    if(cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let soma = 0;
    for(let i=0; i<9; i++){
        soma += parseInt(cpf[i]) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if(resto === 10) resto = 0;
    if(resto !== parseInt(cpf[9])) return false;

    soma = 0;
    for(let i=0; i<10; i++){
        soma += parseInt(cpf[i]) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if(resto === 10) resto = 0;

    return resto === parseInt(cpf[10]);
}

/* ===== VALIDAÇÃO COMPLETA ===== */
function validarFuncionario(nome, cpf, data, conta, salario){

    if(nome.value.trim().length < 3 || /\d/.test(nome.value)){
        mostrarModal("erro", "Nome inválido!");
        nome.focus();
        return false;
    }

    if(!validarCPF(cpf.value)){
        mostrarModal("erro", "CPF inválido!");
        cpf.focus();
        return false;
    }

    let hoje = new Date();
    let dataInput = new Date(data.value);

    if(!data.value || dataInput > hoje){
        mostrarModal("erro", "Data inválida!");
        data.focus();
        return false;
    }

    if(conta.value.length < 3){
        mostrarModal("erro", "Conta inválida!");
        conta.focus();
        return false;
    }

    let valor = salario.value.replace("R$ ", "").replace(/\./g, "").replace(",", ".");
    let num = parseFloat(valor);

    if(isNaN(num) || num <= 0){
        mostrarModal("erro", "Salário inválido!");
        salario.focus();
        return false;
    }

    return true;
}

let contas = [];

/* ===== DADOS (API) ===== */
async function carregarFuncionarios() {
    try {
        const response = await fetch('/api/funcionarios');
        funcionarios = await response.json();
        if(abaAtual === 'funcionario') renderizar();
    } catch (err) {
        console.error("Erro ao carregar funcionários:", err);
    }
}

async function carregarContas() {
    try {
        const response = await fetch('/api/contas');
        contas = await response.json();
        if(abaAtual === 'conta') renderizar();
    } catch (err) {
        console.error("Erro ao carregar contas:", err);
    }
}

/* CADASTRAR FUNCIONÁRIO */
async function cadastrarFuncionario(){
    let nome = document.getElementById("nome");
    let cpf = document.getElementById("cpf");
    let data = document.getElementById("data");
    let conta = document.getElementById("conta");
    let salario = document.getElementById("salario");

    if(!validarFuncionario(nome,cpf,data,conta,salario)) return;

    // Limpar o valor do salário para número
    let valorLimpo = salario.value.replace("R$ ", "").replace(/\./g, "").replace(",", ".");

    let payload = {
        nome: nome.value,
        cpf: cpf.value,
        data: data.value,
        conta: conta.value,
        salario: parseFloat(valorLimpo)
    };

    try {
        const response = await fetch('/api/funcionarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            mostrarModal("sucesso", "Funcionário cadastrado com sucesso!");
            limpar();
            carregarFuncionarios();
        } else {
            const dataErr = await response.json();
            mostrarModal("erro", dataErr.error || "Erro ao salvar no banco.");
        }
    } catch (err) {
        mostrarModal("erro", "Erro de conexão com o servidor.");
    }
}

let editandoContaId = null;

/* CADASTRAR OU EDITAR CONTA */
async function cadastrarConta(){
    let codigo = document.getElementById("codigoConta");
    let nome = document.getElementById("nomeConta");
    let tipo = document.getElementById("tipoConta");
    let saldo = document.getElementById("saldoInicialConta");
    let descricao = document.getElementById("descricaoConta");

    if(!nome.value || !tipo.value){
        mostrarModal("erro", "Nome e Tipo são obrigatórios!");
        return;
    }

    // Limpar saldo para número
    let saldoNum = 0;
    if(saldo.value) {
        saldoNum = parseFloat(saldo.value.replace("R$ ", "").replace(/\./g, "").replace(",", "."));
    }

    // Se estivermos editando, não precisamos confirmar o saldo inicial de novo (opcional)
    if (!editandoContaId && saldoNum > 0) {
        let confirmar = await perguntar("ATENÇÃO: Você está inserindo um Saldo Inicial manualmente. Isso criará um valor inicial na conta sem passar pelo Livro Diário. Deseja confirmar?");
        if (!confirmar) return;
    }

    // Definir cor baseada no tipo
    let cor = getCorTipo(tipo.value);

    let payload = {
        codigo: codigo.value,
        nome: nome.value,
        tipo: tipo.value,
        saldo_inicial: saldoNum,
        descricao: descricao.value,
        cor: cor
    };

    try {
        const url = editandoContaId ? `/api/contas/${editandoContaId}` : '/api/contas';
        const method = editandoContaId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            mostrarModal("sucesso", editandoContaId ? "Conta atualizada!" : "Conta cadastrada!");
            cancelarEdicaoConta(); // Limpa tudo e volta ao normal
            carregarContas();
        } else {
            const dataErr = await response.json();
            mostrarModal("erro", dataErr.error || "Erro ao salvar conta.");
        }
    } catch (err) {
        mostrarModal("erro", "Erro de conexão.");
    }
}

function prepararEdicaoConta(id) {
    const conta = listaContasGlobal.find(c => c.id == id);
    if (!conta) return;

    editandoContaId = id;
    
    document.getElementById("codigoConta").value = conta.codigo || "";
    document.getElementById("nomeConta").value = conta.nome;
    document.getElementById("tipoConta").value = conta.tipo;
    document.getElementById("descricaoConta").value = conta.descricao || "";
    
    // Formatar saldo para o input
    const saldoFormatado = (conta.saldo_inicial || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById("saldoInicialConta").value = saldoFormatado;

    // Mudar botões
    document.getElementById("btnSalvarConta").innerText = "Salvar Alterações";
    document.getElementById("btnCancelarEdicaoConta").style.display = "block";
    
    // Rolar para o topo (onde está o form)
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoConta() {
    editandoContaId = null;
    document.getElementById("codigoConta").value = "";
    document.getElementById("nomeConta").value = "";
    document.getElementById("tipoConta").value = "";
    document.getElementById("saldoInicialConta").value = "";
    document.getElementById("descricaoConta").value = "";

    document.getElementById("btnSalvarConta").innerText = "Cadastrar Conta";
    document.getElementById("btnCancelarEdicaoConta").style.display = "none";
}

let listaContasGlobal = [];

async function carregarContas(){
    try {
        const response = await fetch('/api/contas');
        listaContasGlobal = await response.json();
        contas = listaContasGlobal; // Sincroniza com a variável antiga se necessário
        renderizar();
    } catch (err) {
        console.error("Erro ao carregar contas:", err);
    }
}

/* RENDER */
function renderizar(){
    let tabela = document.getElementById("tabela");
    let cabecalho = document.getElementById("cabecalhoTabela");
    if (!tabela || !cabecalho) return;

    tabela.innerHTML="";

    if(abaAtual === 'funcionario'){
        cabecalho.innerHTML = `
            <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Data</th>
                <th>Conta</th>
                <th>Salário</th>
                <th style="width: 80px;">Ações</th>
            </tr>
        `;
        funcionarios.forEach(f=>{
            tabela.innerHTML += `
            <tr>
                <td>${f.nome}</td>
                <td>${f.cpf}</td>
                <td>${new Date(f.data_ingresso).toLocaleDateString("pt-BR", {timeZone: 'UTC'})}</td>
                <td>${f.conta}</td>
                <td>R$ ${parseFloat(f.salario).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td>
                    <button class="btn-delete" onclick="apagarFuncionario(${f.id})" title="Excluir">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        });
    } else {
        cabecalho.innerHTML = `
            <tr>
                <th>Código</th>
                <th>Nome da Conta</th>
                <th>Tipo</th>
                <th style="width: 120px;">Ações</th>
            </tr>
        `;
        contas.forEach(c=>{
            const cor = c.cor || getCorTipo(c.tipo); // Usa a cor do banco ou a padrão
            tabela.innerHTML += `
            <tr>
                <td><small style="color: #64748b; font-weight: bold;">${c.codigo || '---'}</small></td>
                <td>${c.nome}</td>
                <td><span style="color: white; background: ${cor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${c.tipo}</span></td>
                <td style="display: flex; gap: 8px;">
                    <button class="btn-edit" onclick="prepararEdicaoConta(${c.id})" title="Editar" style="background: #3b82f6; border: none; color: white; padding: 5px 10px; border-radius: 6px; cursor: pointer;">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="btn-delete" onclick="apagarConta(${c.id})" title="Excluir">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        });
    }
}

/* ===== CORES DOS TIPOS ===== */
function getCorTipo(tipo) {
    switch (tipo) {
        case 'Ativo': return '#10b981';   // Verde
        case 'Passivo': return '#f59e0b'; // Laranja
        case 'Receita': return '#3b82f6'; // Azul
        case 'Despesa': return '#ef4444'; // Vermelho
        default: return '#64748b';       // Cinza
    }
}

/* ===== EXCLUIR DADOS ===== */
async function apagarFuncionario(id) {
    if(!confirm("Tem certeza que deseja excluir este funcionário?")) return;
    try {
        const response = await fetch(`/api/funcionarios/${id}`, { method: 'DELETE' });
        if(response.ok) {
            mostrarModal("sucesso", "Funcionário removido!");
            carregarFuncionarios();
        } else {
            const dataErr = await response.json();
            mostrarModal("erro", dataErr.error || "Erro ao excluir funcionário.");
        }
    } catch (err) {
        mostrarModal("erro", "Erro de conexão.");
    }
}

async function apagarConta(id) {
    let confirmar = await perguntar("Tem certeza que deseja excluir esta conta?");
    if(!confirmar) return;
    try {
        const response = await fetch(`/api/contas/${id}`, { method: 'DELETE' });
        if(response.ok) {
            mostrarModal("sucesso", "Conta removida!");
            carregarContas();
        } else {
            const dataErr = await response.json();
            mostrarModal("erro", dataErr.error || "Erro ao excluir conta.");
        }
    } catch (err) {
        mostrarModal("erro", "Erro de conexão.");
    }
}

/* ===== MODAL ===== */
function mostrarModal(tipo, mensagem){
    let modal = document.getElementById("modal");
    let texto = document.getElementById("modalTexto");
    let icon = document.getElementById("modalIcon");
    let box = modal.querySelector(".modal-box");
    let btnOk = document.getElementById("btnModalOk");
    let btnCancel = document.getElementById("btnModalCancelar");

    texto.innerText = mensagem;
    btnCancel.style.display = "none"; // Esconde cancelar por padrão
    btnOk.innerText = "OK";
    btnOk.onclick = fecharModal;

    box.classList.remove("sucesso", "erro", "atencao");

    if(tipo === "sucesso"){
        icon.innerText = "✔";
        box.classList.add("sucesso");
        setTimeout(fecharModal, 2000);
    } else if(tipo === "erro") {
        icon.innerText = "✖";
        box.classList.add("erro");
    } else if(tipo === "atencao") {
        icon.innerText = "⚠";
        box.classList.add("atencao");
    }

    modal.classList.add("show");
}

/* FUNÇÃO DE PERGUNTA (Promise para esperar resposta) */
function perguntar(mensagem) {
    return new Promise((resolve) => {
        let modal = document.getElementById("modal");
        let texto = document.getElementById("modalTexto");
        let icon = document.getElementById("modalIcon");
        let btnOk = document.getElementById("btnModalOk");
        let btnCancel = document.getElementById("btnModalCancelar");
        let box = modal.querySelector(".modal-box");

        texto.innerText = mensagem;
        icon.innerText = "⚠";
        box.classList.remove("sucesso", "erro");
        box.classList.add("atencao");

        btnOk.innerText = "Confirmar";
        btnCancel.style.display = "block";
        btnCancel.innerText = "Cancelar";

        btnOk.onclick = () => {
            fecharModal();
            resolve(true);
        };

        btnCancel.onclick = () => {
            fecharModal();
            resolve(false);
        };

        modal.classList.add("show");
    });
}

function fecharModal(){
    document.getElementById("modal").classList.remove("show");
}

/* LIMPAR */
function limpar(){
    document.querySelectorAll("#formFuncionario input").forEach(i=>i.value="");
}

/* INIT */
carregarFuncionarios();