/* ============================================================
   LANCAMENTOS.JS — Partidas Dobradas
   ============================================================ */

let contasAnaliticas = [];
let partidaCount = 0;

/* ===== CARREGAR CONTAS ANALÍTICAS ===== */
async function carregarContas() {
    try {
        const resp = await fetch('/api/contas', { credentials: 'include' });
        const todas = await resp.json();
        contasAnaliticas = todas.filter(c => c.analitica === 1 || c.analitica === true);
    } catch (err) {
        console.error("Erro ao carregar contas:", err);
    }
}

/* ===== GERAR SELECT DE CONTAS ===== */
function gerarSelectContas(id) {
    let options = '<option value="">Selecione uma conta analítica...</option>';
    contasAnaliticas.forEach(c => {
        const tipo = c.analitica ? '(Analítica)' : '(Sintética)';
        options += `<option value="${c.id}">${c.codigo} — ${c.nome} ${tipo}</option>`;
    });
    return `<select id="${id}" class="select-conta" required>${options}</select>`;
}

/* ===== ADICIONAR LINHA DE PARTIDA ===== */
function adicionarPartida(tipo = 'D', contaId = '', valor = '') {
    partidaCount++;
    const id = partidaCount;
    const container = document.getElementById("partidasContainer");

    const row = document.createElement('div');
    row.className = 'partida-row';
    row.id = `partida-${id}`;
    row.innerHTML = `
        ${gerarSelectContas(`partida-conta-${id}`)}
        <div class="tipo-toggle">
            <button type="button" id="btn-d-${id}" class="${tipo === 'D' ? 'active-d' : ''}" onclick="setTipo(${id},'D')">D</button>
            <button type="button" id="btn-c-${id}" class="${tipo === 'C' ? 'active-c' : ''}" onclick="setTipo(${id},'C')">C</button>
        </div>
        <input type="text" id="partida-valor-${id}" placeholder="R$ 0,00" oninput="mascaraValor(this); atualizarEquilibrio()">
        <button type="button" class="btn-remove-partida" onclick="removerPartida(${id})">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(row);

    // Setar conta se fornecida
    if (contaId) {
        document.getElementById(`partida-conta-${id}`).value = contaId;
    }
    // Setar valor se fornecido
    if (valor) {
        const input = document.getElementById(`partida-valor-${id}`);
        let v = Math.round(valor * 100).toString();
        v = (parseInt(v) / 100).toFixed(2);
        v = v.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        input.value = "R$ " + v;
    }

    atualizarEquilibrio();
}

/* ===== REMOVER PARTIDA ===== */
function removerPartida(id) {
    const row = document.getElementById(`partida-${id}`);
    if (row) row.remove();
    atualizarEquilibrio();
}

/* ===== TOGGLE D/C ===== */
function setTipo(id, tipo) {
    document.getElementById(`btn-d-${id}`).className = tipo === 'D' ? 'active-d' : '';
    document.getElementById(`btn-c-${id}`).className = tipo === 'C' ? 'active-c' : '';
    atualizarEquilibrio();
}

/* ===== OBTER TIPO DE UMA PARTIDA ===== */
function getTipo(id) {
    if (document.getElementById(`btn-d-${id}`).classList.contains('active-d')) return 'D';
    if (document.getElementById(`btn-c-${id}`).classList.contains('active-c')) return 'C';
    return 'D';
}

/* ===== MÁSCARA DE VALOR ===== */
function mascaraValor(input) {
    let v = input.value.replace(/\D/g, "");
    v = (parseInt(v || '0') / 100).toFixed(2);
    v = v.replace(".", ",");
    v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    input.value = "R$ " + v;
}

/* ===== PARSE VALOR ===== */
function parseValor(str) {
    if (!str) return 0;
    return parseFloat(str.replace("R$ ", "").replace(/\./g, "").replace(",", ".")) || 0;
}

/* ===== ATUALIZAR INDICADOR DE EQUILÍBRIO ===== */
function atualizarEquilibrio() {
    let totalD = 0;
    let totalC = 0;

    const rows = document.querySelectorAll('.partida-row');
    rows.forEach(row => {
        const id = parseInt(row.id.replace('partida-', ''));
        const tipo = getTipo(id);
        const valor = parseValor(document.getElementById(`partida-valor-${id}`).value);

        if (tipo === 'D') totalD += valor;
        else totalC += valor;
    });

    document.getElementById("totalDebitos").innerText = formatarMoeda(totalD);
    document.getElementById("totalCreditos").innerText = formatarMoeda(totalC);

    const bar = document.getElementById("equilibrioBar");
    const icon = document.getElementById("equilibrioIcon");
    const btn = document.getElementById("btnRegistrar");

    const equilibrado = Math.abs(totalD - totalC) < 0.01 && totalD > 0;

    bar.classList.remove('equilibrado', 'desequilibrado');
    if (totalD === 0 && totalC === 0) {
        icon.innerHTML = '';
        icon.className = 'icon-svg icon-clock eq-icon pendente';
        btn.disabled = true;
    } else if (equilibrado) {
        icon.innerHTML = '';
        icon.className = 'icon-svg icon-check eq-icon equilibrado';
        bar.classList.add('equilibrado');
        btn.disabled = false;
    } else {
        icon.innerHTML = '';
        icon.className = 'icon-svg icon-x eq-icon desequilibrado';
        bar.classList.add('desequilibrado');
        btn.disabled = true;
    }
}

/* ===== REGISTRAR LANÇAMENTO ===== */
async function registrarLancamento() {
    const data = document.getElementById("lancData").value;
    const descricao = document.getElementById("lancDescricao").value.trim();

    if (!data || !descricao) {
        mostrarModal("erro", "Preencha a data e o histórico!");
        return;
    }

    const partidas = [];
    const rows = document.querySelectorAll('.partida-row');

    for (const row of rows) {
        const id = parseInt(row.id.replace('partida-', ''));
        const conta_id = document.getElementById(`partida-conta-${id}`).value;
        const tipo = getTipo(id);
        const valor = parseValor(document.getElementById(`partida-valor-${id}`).value);

        if (!conta_id) {
            mostrarModal("erro", "Selecione a conta em todas as partidas!");
            return;
        }
        if (valor <= 0) {
            mostrarModal("erro", "Todos os valores devem ser maiores que zero!");
            return;
        }

        partidas.push({ conta_id: parseInt(conta_id), tipo, valor });
    }

    if (partidas.length < 2) {
        mostrarModal("erro", "É necessário pelo menos 2 partidas (1 débito + 1 crédito)!");
        return;
    }

    try {
        const response = await fetch('/api/lancamentos', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, descricao, partidas })
        });

        const result = await response.json();

        if (response.ok) {
            mostrarModal("sucesso", "Lançamento registrado com sucesso!");
            limparFormulario();
            carregarLancamentos();
        } else {
            let mensagem = result.error || "Erro ao registrar lançamento.";
            if (mensagem.includes("sintética")) {
                mensagem += "\n\n💡 Dica: Contas sintéticas (como 'ATIVO', 'PASSIVO') apenas agrupam outras contas. Use contas analíticas como 'Caixa', 'Banco', 'Fornecedores', etc.";
            }
            mostrarModal("erro", mensagem);
        }
    } catch (err) {
        mostrarModal("erro", "Erro de conexão com o servidor.");
    }
}

/* ===== LIMPAR FORMULÁRIO ===== */
function limparFormulario() {
    document.getElementById("lancData").value = '';
    document.getElementById("lancDescricao").value = '';
    document.getElementById("partidasContainer").innerHTML = '';
    partidaCount = 0;
    adicionarPartida('D');
    adicionarPartida('C');
}

/* ===== CARREGAR LANÇAMENTOS RECENTES ===== */
async function carregarLancamentos() {
    try {
        const resp = await fetch('/api/lancamentos', { credentials: 'include' });
        const lancamentos = await resp.json();
        renderizarLancamentos(lancamentos);
    } catch (err) {
        console.error("Erro ao carregar lançamentos:", err);
    }
}

/* ===== RENDERIZAR LANÇAMENTOS ===== */
function renderizarLancamentos(lancamentos) {
    const container = document.getElementById("listaLancamentos");

    if (!lancamentos || lancamentos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-book-open"></i>
                <p>Nenhum lançamento registrado ainda.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = lancamentos.map(l => {
        const partidasHTML = (l.partidas || []).map(p => `
            <div class="lanc-partida-row">
                <span class="p-tipo ${p.tipo}">${p.tipo}</span>
                <span class="p-conta">
                    <span class="p-codigo">${p.conta_codigo}</span>
                    ${p.conta_nome}
                </span>
                <span class="p-valor ${p.tipo}">${formatarMoeda(parseFloat(p.valor))}</span>
            </div>
        `).join('');

        return `
            <div class="lanc-item">
                <div class="lanc-header">
                    <span class="lanc-data">${formatarData(l.data)}</span>
                    <span class="lanc-desc">${l.descricao}</span>
                    <span class="lanc-origem ${l.origem}">${l.origem}</span>
                    <button class="lanc-delete" onclick="excluirLancamento(${l.id})" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div class="lanc-partidas">
                    ${partidasHTML}
                </div>
            </div>
        `;
    }).join('');
}

/* ===== EXCLUIR LANÇAMENTO ===== */
async function excluirLancamento(id) {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;

    try {
        const resp = await fetch(`/api/lancamentos/${id}`, { method: 'DELETE', credentials: 'include' });
        if (resp.ok) {
            mostrarModal("sucesso", "Lançamento excluído!");
            carregarLancamentos();
        } else {
            mostrarModal("erro", "Erro ao excluir.");
        }
    } catch (err) {
        mostrarModal("erro", "Erro de conexão.");
    }
}

/* ===== UTILITÁRIOS ===== */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
    if (!data) return "";
    return new Date(data).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
}

/* ===== MODAL ===== */
function mostrarModal(tipo, mensagem) {
    const modal = document.getElementById("modal");
    const texto = document.getElementById("modalTexto");
    const icon = document.getElementById("modalIcon");
    const box = modal.querySelector(".modal-box");

    texto.innerText = mensagem;
    box.classList.remove("sucesso", "erro");

    if (tipo === "sucesso") {
        icon.innerHTML = ''; icon.className = 'icon-svg icon-check';
        box.classList.add("sucesso");
        setTimeout(fecharModal, 2000);
    } else {
        icon.innerHTML = ''; icon.className = 'icon-svg icon-x';
        box.classList.add("erro");
    }
    modal.classList.add("show");
}

function fecharModal() {
    document.getElementById("modal").classList.remove("show");
}

/* ===== INIT ===== */
async function init() {
    await carregarContas();
    adicionarPartida('D');
    adicionarPartida('C');
    carregarLancamentos();
}
init();
