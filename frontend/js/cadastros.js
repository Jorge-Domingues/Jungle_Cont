let funcionarios = [];
let abaAtual = 'funcionario';
let listaContasGlobal = [];
let editandoContaId = null;

/* ===== TROCAR ABA ===== */
function trocarAba(tipo) {
    abaAtual = tipo;
    document.querySelectorAll(".form").forEach(f => f.classList.remove("ativo"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

    const tabela = document.getElementById("tabela");
    const cabecalho = document.getElementById("cabecalhoTabela");
    if (tabela) tabela.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">Carregando...</td></tr>';

    if (tipo === "funcionario") {
        document.getElementById("formFuncionario").classList.add("ativo");
        document.querySelectorAll(".tab")[0].classList.add("active");
        document.getElementById("tituloLista").innerText = "Funcionários";
        if (cabecalho) cabecalho.innerHTML = '<tr><th>Nome</th><th>CPF</th><th>Data</th><th>Conta</th><th>Salário</th><th style="width:80px">Ações</th></tr>';
        carregarFuncionarios();
    } else {
        document.getElementById("formConta").classList.add("ativo");
        document.querySelectorAll(".tab")[1].classList.add("active");
        document.getElementById("tituloLista").innerText = "Plano de Contas";
        if (cabecalho) cabecalho.innerHTML = '<tr><th>Código</th><th>Conta</th><th>Tipo</th><th>Nat.</th><th>Class.</th><th style="width:120px">Ações</th></tr>';
        carregarContas();
    }
}

/* ===== MÁSCARAS ===== */
document.getElementById("cpf").addEventListener("input", function(e) {
    let v = e.target.value.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = v;
});

document.getElementById("salario").addEventListener("input", function(e) {
    let v = e.target.value.replace(/\D/g, "");
    v = (parseInt(v || '0') / 100).toFixed(2);
    v = v.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    e.target.value = "R$ " + v;
});

document.getElementById("saldoInicialConta").addEventListener("input", function(e) {
    let v = e.target.value.replace(/\D/g, "");
    v = (parseInt(v || '0') / 100).toFixed(2);
    v = v.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    e.target.value = "R$ " + v;
});

/* ===== NATUREZA AUTOMÁTICA ===== */
function atualizarNatureza() {
    const tipo = document.getElementById("tipoConta").value;
    const natureza = document.getElementById("naturezaConta");

    if (tipo === 'Ativo' || tipo === 'Despesa') {
        natureza.value = 'Devedora';
    } else if (tipo === 'Passivo' || tipo === 'Receita' || tipo === 'Patrimônio Líquido') {
        natureza.value = 'Credora';
    }
}

/* ===== VALIDAÇÃO CPF ===== */
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    return resto === parseInt(cpf[10]);
}

function validarFuncionario(nome, cpf, data, conta, salario) {
    if (nome.value.trim().length < 3 || /\d/.test(nome.value)) {
        mostrarModal("erro", "Nome inválido!"); nome.focus(); return false;
    }
    if (!validarCPF(cpf.value)) {
        mostrarModal("erro", "CPF inválido!"); cpf.focus(); return false;
    }
    if (!data.value || new Date(data.value) > new Date()) {
        mostrarModal("erro", "Data inválida!"); data.focus(); return false;
    }
    if (conta.value.length < 3) {
        mostrarModal("erro", "Conta inválida!"); conta.focus(); return false;
    }
    let valor = salario.value.replace("R$ ", "").replace(/\./g, "").replace(",", ".");
    if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
        mostrarModal("erro", "Salário inválido!"); salario.focus(); return false;
    }
    return true;
}

/* ===== API: FUNCIONÁRIOS ===== */
async function carregarFuncionarios() {
    try {
        const resp = await fetch('/api/funcionarios', { credentials: 'include' });
        funcionarios = await resp.json();
        renderizar();
    } catch (err) { console.error("Erro:", err); }
}

async function cadastrarFuncionario() {
    let nome = document.getElementById("nome");
    let cpf = document.getElementById("cpf");
    let data = document.getElementById("data");
    let conta = document.getElementById("conta");
    let salario = document.getElementById("salario");

    if (!validarFuncionario(nome, cpf, data, conta, salario)) return;

    let valorLimpo = salario.value.replace("R$ ", "").replace(/\./g, "").replace(",", ".");

    try {
        const resp = await fetch('/api/funcionarios', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome.value, cpf: cpf.value, data: data.value,
                conta: conta.value, salario: parseFloat(valorLimpo)
            })
        });

        if (resp.ok) {
            mostrarModal("sucesso", "Funcionário cadastrado!");
            document.querySelectorAll("#formFuncionario input").forEach(i => i.value = "");
            carregarFuncionarios();
        } else {
            const err = await resp.json();
            mostrarModal("erro", err.error || "Erro ao salvar.");
        }
    } catch (err) { mostrarModal("erro", "Erro de conexão."); }
}

/* ===== API: CONTAS ===== */
async function carregarContas() {
    try {
        const resp = await fetch('/api/contas', { credentials: 'include' });
        if (!resp.ok) throw new Error('API retornou ' + resp.status);
        listaContasGlobal = await resp.json();

        // Popular select de conta pai
        const selectPai = document.getElementById("contaPaiConta");
        selectPai.innerHTML = '<option value="">Nenhuma (conta raiz)</option>';
        listaContasGlobal.filter(c => !c.analitica || c.analitica === 0).forEach(c => {
            selectPai.innerHTML += `<option value="${c.id}">${c.codigo} — ${c.nome}</option>`;
        });

        renderizar();
    } catch (err) {
        console.error("Erro ao carregar contas:", err);
        const tabela = document.getElementById("tabela");
        if (tabela) tabela.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:20px">Erro ao carregar contas. Verifique o console.</td></tr>';
    }
}

async function cadastrarConta() {
    const codigo = document.getElementById("codigoConta").value;
    const nome = document.getElementById("nomeConta").value;
    const tipo = document.getElementById("tipoConta").value;
    const natureza = document.getElementById("naturezaConta").value;
    const contaPaiId = document.getElementById("contaPaiConta").value;
    const analitica = document.getElementById("analiticaConta").value === 'true';
    const saldoStr = document.getElementById("saldoInicialConta").value;
    const descricao = document.getElementById("descricaoConta").value;

    if (!codigo || !nome || !tipo || !natureza) {
        mostrarModal("erro", "Código, nome, tipo e natureza são obrigatórios!");
        return;
    }

    let saldoNum = 0;
    if (saldoStr) {
        saldoNum = parseFloat(saldoStr.replace("R$ ", "").replace(/\./g, "").replace(",", ".")) || 0;
    }

    if (!editandoContaId && saldoNum > 0) {
        let confirmar = await perguntar("ATENÇÃO: Você está inserindo um Saldo Inicial manualmente. Deseja confirmar?");
        if (!confirmar) return;
    }

    const cor = getCorTipo(tipo);

    const payload = {
        codigo, nome, tipo, natureza,
        conta_pai_id: contaPaiId || null,
        analitica, saldo_inicial: saldoNum,
        descricao, cor
    };

    try {
        const url = editandoContaId ? `/api/contas/${editandoContaId}` : '/api/contas';
        const method = editandoContaId ? 'PUT' : 'POST';

        console.log('[cadastrarConta] Enviando:', payload);
        const resp = await fetch(url, {
            method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log('[cadastrarConta] Status:', resp.status);

        if (resp.ok) {
            mostrarModal("sucesso", editandoContaId ? "Conta atualizada!" : "Conta cadastrada!");
            cancelarEdicaoConta();
            carregarContas();
        } else {
            const err = await resp.json();
            console.error('[cadastrarConta] Erro:', err);
            mostrarModal("erro", err.error || "Erro ao salvar.");
        }
    } catch (err) {
        console.error('[cadastrarConta] Exceção:', err);
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
    document.getElementById("naturezaConta").value = conta.natureza;
    document.getElementById("contaPaiConta").value = conta.conta_pai_id || "";
    document.getElementById("analiticaConta").value = conta.analitica ? 'true' : 'false';
    document.getElementById("descricaoConta").value = conta.descricao || "";

    const saldoFormatado = (parseFloat(conta.saldo_inicial) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById("saldoInicialConta").value = saldoFormatado;

    document.getElementById("btnSalvarConta").innerText = "Salvar Alterações";
    document.getElementById("btnCancelarEdicaoConta").style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoConta() {
    editandoContaId = null;
    document.getElementById("codigoConta").value = "";
    document.getElementById("nomeConta").value = "";
    document.getElementById("tipoConta").value = "";
    document.getElementById("naturezaConta").value = "";
    document.getElementById("contaPaiConta").value = "";
    document.getElementById("analiticaConta").value = "true";
    document.getElementById("saldoInicialConta").value = "";
    document.getElementById("descricaoConta").value = "";
    document.getElementById("btnSalvarConta").innerText = "Cadastrar Conta";
    document.getElementById("btnCancelarEdicaoConta").style.display = "none";
}

/* ===== RENDER ===== */
function renderizar() {
    const tabela = document.getElementById("tabela");
    const cabecalho = document.getElementById("cabecalhoTabela");
    if (!tabela || !cabecalho) return;
    tabela.innerHTML = "";

    if (abaAtual === 'funcionario') {
        cabecalho.innerHTML = `<tr><th>Nome</th><th>CPF</th><th>Data</th><th>Conta</th><th>Salário</th><th style="width:80px">Ações</th></tr>`;
        if (funcionarios.length === 0) {
            tabela.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">Nenhum funcionário cadastrado.</td></tr>';
        }
        funcionarios.forEach(f => {
            tabela.innerHTML += `
            <tr>
                <td>${f.nome}</td>
                <td>${f.cpf}</td>
                <td>${new Date(f.data_ingresso).toLocaleDateString("pt-BR", {timeZone:'UTC'})}</td>
                <td>${f.conta}</td>
                <td>R$ ${parseFloat(f.salario).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                <td>
                    <button class="btn-delete" onclick="apagarFuncionario(${f.id})" title="Excluir">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    } else {
        cabecalho.innerHTML = `<tr><th>Código</th><th>Conta</th><th>Tipo</th><th>Nat.</th><th>Class.</th><th style="width:120px">Ações</th></tr>`;
        if (listaContasGlobal.length === 0) {
            tabela.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">Nenhuma conta cadastrada.</td></tr>';
        }
        listaContasGlobal.forEach(c => {
            const cor = c.cor || getCorTipo(c.tipo);
            const nivel = (c.codigo.match(/\./g) || []).length;
            const indent = nivel * 16;
            const isAnalitica = c.analitica === 1 || c.analitica === true;
            const fontWeight = isAnalitica ? 'normal' : 'bold';

            tabela.innerHTML += `
            <tr style="font-weight: ${fontWeight}">
                <td><small style="color:#94a3b8;font-weight:700">${c.codigo}</small></td>
                <td style="padding-left: ${indent + 14}px">
                    ${!isAnalitica ? '<i class="icon-svg icon-folder" style="margin-right:4px"></i> ' : ''}${c.nome}
                </td>
                <td><span style="color:white;background:${cor};padding:3px 8px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase">${c.tipo}</span></td>
                <td><small style="color:${c.natureza === 'Devedora' ? '#16a34a' : '#dc2626'};font-weight:600">${c.natureza === 'Devedora' ? 'Dev' : 'Cred'}</small></td>
                <td><small style="color:#64748b">${isAnalitica ? 'Analítica' : 'Sintética'}</small></td>
                <td style="display:flex;gap:6px">
                    <button class="btn-edit" onclick="prepararEdicaoConta(${c.id})" title="Editar" style="background:#3b82f6;border:none;color:white;padding:5px 8px;border-radius:6px;cursor:pointer">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="btn-delete" onclick="apagarConta(${c.id})" title="Excluir">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    }
}

/* ===== CORES ===== */
function getCorTipo(tipo) {
    const cores = {
        'Ativo': '#10b981', 'Passivo': '#f59e0b',
        'Patrimônio Líquido': '#8b5cf6',
        'Receita': '#3b82f6', 'Despesa': '#ef4444'
    };
    return cores[tipo] || '#64748b';
}

/* ===== EXCLUIR ===== */
async function apagarFuncionario(id) {
    if (!confirm("Excluir este funcionário?")) return;
    try {
        const resp = await fetch(`/api/funcionarios/${id}`, { method: 'DELETE', credentials: 'include' });
        if (resp.ok) { mostrarModal("sucesso", "Funcionário removido!"); carregarFuncionarios(); }
        else { const err = await resp.json(); mostrarModal("erro", err.error || "Erro."); }
    } catch (err) { mostrarModal("erro", "Erro de conexão."); }
}

async function apagarConta(id) {
    let confirmar = await perguntar("Tem certeza que deseja excluir esta conta?");
    if (!confirmar) return;
    try {
        const resp = await fetch(`/api/contas/${id}`, { method: 'DELETE', credentials: 'include' });
        if (resp.ok) { mostrarModal("sucesso", "Conta removida!"); carregarContas(); }
        else { const err = await resp.json(); mostrarModal("erro", err.error || "Erro ao excluir."); }
    } catch (err) { mostrarModal("erro", "Erro de conexão."); }
}

/* ===== MODAL ===== */
function mostrarModal(tipo, mensagem) {
    const modal = document.getElementById("modal");
    const texto = document.getElementById("modalTexto");
    const icon = document.getElementById("modalIcon");
    const box = modal.querySelector(".modal-box");
    const btnOk = document.getElementById("btnModalOk");
    const btnCancel = document.getElementById("btnModalCancelar");

    texto.innerText = mensagem;
    btnCancel.style.display = "none";
    btnOk.innerText = "OK";
    btnOk.onclick = fecharModal;

    box.classList.remove("sucesso", "erro", "atencao");

    if (tipo === "sucesso") {
        icon.innerHTML = ''; icon.className = 'icon-svg icon-check'; box.classList.add("sucesso");
        setTimeout(fecharModal, 2000);
    } else if (tipo === "erro") {
        icon.innerHTML = ''; icon.className = 'icon-svg icon-x'; box.classList.add("erro");
    } else if (tipo === "atencao") {
        icon.innerHTML = ''; icon.className = 'icon-svg icon-warning'; box.classList.add("atencao");
    }
    modal.classList.add("show");
}

function perguntar(mensagem) {
    return new Promise(resolve => {
        const modal = document.getElementById("modal");
        const texto = document.getElementById("modalTexto");
        const icon = document.getElementById("modalIcon");
        const btnOk = document.getElementById("btnModalOk");
        const btnCancel = document.getElementById("btnModalCancelar");
        const box = modal.querySelector(".modal-box");

        texto.innerText = mensagem;
        icon.innerHTML = ''; icon.className = 'icon-svg icon-warning';
        box.classList.remove("sucesso", "erro");
        box.classList.add("atencao");

        btnOk.innerText = "Confirmar";
        btnCancel.style.display = "block";
        btnCancel.innerText = "Cancelar";

        btnOk.onclick = () => { fecharModal(); resolve(true); };
        btnCancel.onclick = () => { fecharModal(); resolve(false); };

        modal.classList.add("show");
    });
}

function fecharModal() {
    document.getElementById("modal").classList.remove("show");
}

/* INIT */
carregarFuncionarios();