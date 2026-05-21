/* ============================================================
   RAZAO.JS — Livro Razão por Conta
   ============================================================ */
let listaContas = [];

/* ===== CARREGAR DADOS INICIAIS ===== */
async function carregarDados() {
    try {
        const resp = await fetch('/api/contas', { credentials: 'include' });
        const todas = await resp.json();
        listaContas = todas.filter(c => c.analitica === 1 || c.analitica === true);

        const select = document.getElementById("selectConta");
        select.innerHTML = '<option value="">Selecione uma conta...</option>';
        listaContas.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.codigo} — ${c.nome} (${c.natureza})</option>`;
        });

        // Carregar automaticamente ao trocar
        select.onchange = carregarRazao;
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

/* ===== CARREGAR RAZÃO ===== */
async function carregarRazao() {
    const contaId = document.getElementById("selectConta").value;
    if (!contaId) return;

    const inicio = document.getElementById("filtroInicio").value;
    const fim = document.getElementById("filtroFim").value;

    let url = `/api/relatorios/razao/${contaId}`;
    const params = [];
    if (inicio) params.push(`inicio=${inicio}`);
    if (fim) params.push(`fim=${fim}`);
    if (params.length) url += '?' + params.join('&');

    try {
        console.log(`Buscando razão para conta ${contaId}...`);
        const resp = await fetch(url, { credentials: 'include' });
        const data = await resp.json();
        
        if (data.movimentos && data.movimentos.length === 0) {
            document.getElementById("gridRazao").innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-circle-info"></i>
                    <p>Nenhum movimento encontrado para a conta <strong>${data.conta.nome}</strong> no período selecionado.</p>
                </div>
            `;
            return;
        }

        renderizarRazao(data.conta, data.movimentos);
    } catch (err) {
        console.error("Erro ao carregar razão:", err);
        document.getElementById("gridRazao").innerHTML = `<p style="color:red; text-align:center; padding:20px;">Erro ao carregar dados. Verifique o console.</p>`;
    }
}

/* ===== RENDERIZAR ===== */
function renderizarRazao(conta, movimentos) {
    const grid = document.getElementById("gridRazao");
    const saldoInicial = parseFloat(conta.saldo_inicial) || 0;
    let saldo = saldoInicial;

    // Determinar natureza para cálculo de saldo
    const isDevedora = conta.natureza === 'Devedora';

    let html = `
    <div class="razao-card">
        <div class="razao-header">
            <div class="razao-title">
                <span class="razao-codigo">${conta.codigo}</span>
                <h2>${conta.nome}</h2>
            </div>
            <div class="razao-meta">
                <span class="razao-tipo" style="background: ${conta.cor || '#64748b'}">${conta.tipo}</span>
                <span class="razao-natureza">${conta.natureza}</span>
            </div>
        </div>

        <table class="razao-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Histórico</th>
                    <th>Débito</th>
                    <th>Crédito</th>
                    <th>Saldo</th>
                </tr>
            </thead>
            <tbody>
                <tr class="saldo-inicial-row">
                    <td>—</td>
                    <td><strong>Saldo Inicial</strong></td>
                    <td>—</td>
                    <td>—</td>
                    <td class="saldo-cell"><strong>${formatarMoeda(saldo)}</strong></td>
                </tr>
    `;

    movimentos.forEach(m => {
        const valor = parseFloat(m.valor);
        let debito = '—';
        let credito = '—';

        if (m.tipo === 'D') {
            if (isDevedora) saldo += valor; else saldo -= valor;
            debito = formatarMoeda(valor);
        } else {
            if (isDevedora) saldo -= valor; else saldo += valor;
            credito = formatarMoeda(valor);
        }

        html += `
            <tr>
                <td>${formatarData(m.data)}</td>
                <td>${m.historico}</td>
                <td class="valor-debito">${debito}</td>
                <td class="valor-credito">${credito}</td>
                <td class="saldo-cell" style="color: ${saldo >= 0 ? '#1e293b' : '#ef4444'}">
                    <strong>${formatarMoeda(saldo)}</strong>
                </td>
            </tr>
        `;
    });

    // Totalizar
    let totalDebitos = 0;
    let totalCreditos = 0;
    movimentos.forEach(m => {
        if (m.tipo === 'D') totalDebitos += parseFloat(m.valor);
        else totalCreditos += parseFloat(m.valor);
    });

    html += `
                <tr class="total-row">
                    <td colspan="2"><strong>TOTAIS</strong></td>
                    <td class="valor-debito"><strong>${formatarMoeda(totalDebitos)}</strong></td>
                    <td class="valor-credito"><strong>${formatarMoeda(totalCreditos)}</strong></td>
                    <td class="saldo-cell"><strong>${formatarMoeda(saldo)}</strong></td>
                </tr>
            </tbody>
        </table>
    </div>
    `;

    grid.innerHTML = html;
}

/* ===== UTILITÁRIOS ===== */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
    if (!data) return "";
    return new Date(data).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
}

/* INIT */
carregarDados();