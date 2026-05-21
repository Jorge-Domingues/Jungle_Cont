/* ============================================================
   HOME.JS — Dashboard Contábil
   ============================================================ */

async function carregarDashboard() {
    try {
        const [respContas, respLanc, respBalancete] = await Promise.all([
            fetch('/api/contas', { credentials: 'include' }),
            fetch('/api/lancamentos', { credentials: 'include' }),
            fetch('/api/relatorios/balancete', { credentials: 'include' })
        ]);

        const contas = await respContas.json();
        const lancamentos = await respLanc.json();
        const balancete = await respBalancete.json();

        processarDashboard(contas, lancamentos, balancete);
    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
    }
}

function processarDashboard(contas, lancamentos, balancete) {
    // 1. Calcular saldo total dos Ativos
    let saldoAtivos = 0;
    let totalReceitas = 0;
    let totalDespesas = 0;

    balancete.contas.forEach(c => {
        if (c.tipo === 'Ativo') saldoAtivos += c.saldo;
        if (c.tipo === 'Receita') totalReceitas += c.saldo;
        if (c.tipo === 'Despesa') totalDespesas += c.saldo;
    });

    // 2. Renderizar Cards
    document.getElementById("saldoTotal").innerHTML = `
        <i class="icon-svg icon-bank card-icon"></i>
        <span class="card-label">Saldo dos Ativos</span>
        <span class="card-value">${formatarMoeda(saldoAtivos)}</span>
    `;

    document.getElementById("totalEntradas").innerHTML = `
        <i class="icon-svg icon-chart-up card-icon"></i>
        <span class="card-label">Receitas</span>
        <span class="card-value positivo">${formatarMoeda(totalReceitas)}</span>
    `;

    document.getElementById("totalSaidas").innerHTML = `
        <i class="icon-svg icon-chart-down card-icon"></i>
        <span class="card-label">Despesas</span>
        <span class="card-value negativo">${formatarMoeda(totalDespesas)}</span>
    `;

    // 3. Saúde contábil
    const equilibrado = balancete.totais.equilibrado;
    document.getElementById("saudeContabil").innerHTML = `
        <i class="icon-svg ${equilibrado ? 'icon-check' : 'icon-x'} card-icon"></i>
        <span class="card-label">Saúde Contábil</span>
        <span class="card-value ${equilibrado ? 'positivo' : 'negativo'}">${equilibrado ? 'Equilibrada' : 'Desequilíbrio!'}</span>
    `;

    // 4. Últimos lançamentos
    const ultimos = lancamentos.slice(0, 6);
    const container = document.getElementById("ultimos");
    container.innerHTML = "";

    if (ultimos.length === 0) {
        container.innerHTML = "<p style='color:#94a3b8;padding:20px;text-align:center'>Nenhum lançamento registrado.</p>";
        return;
    }

    ultimos.forEach(l => {
        const totalValor = (l.partidas || [])
            .filter(p => p.tipo === 'D')
            .reduce((sum, p) => sum + parseFloat(p.valor), 0);

        const contasEnvolvidas = (l.partidas || [])
            .map(p => `<span class="tag-${p.tipo}">${p.tipo}</span> ${p.conta_codigo}`)
            .join(' · ');

        container.innerHTML += `
        <div class="lanc-item-home">
            <div class="lanc-info">
                <strong>${l.descricao}</strong>
                <small>${formatarData(l.data)} · <span class="origem-badge ${l.origem}">${l.origem}</span></small>
            </div>
            <div class="lanc-valor-home">
                ${formatarMoeda(totalValor)}
            </div>
        </div>
        `;
    });

    // 5. Resumo do plano de contas
    const totalContas = contas.length;
    const analiticas = contas.filter(c => c.analitica === 1 || c.analitica === true).length;
    const sinteticas = totalContas - analiticas;

    document.getElementById("resumoContas").innerHTML = `
        <div class="resumo-item">
            <span class="resumo-numero">${totalContas}</span>
            <span class="resumo-label">Total de Contas</span>
        </div>
        <div class="resumo-item">
            <span class="resumo-numero">${analiticas}</span>
            <span class="resumo-label">Analíticas</span>
        </div>
        <div class="resumo-item">
            <span class="resumo-numero">${sinteticas}</span>
            <span class="resumo-label">Sintéticas</span>
        </div>
        <div class="resumo-item">
            <span class="resumo-numero">${lancamentos.length}</span>
            <span class="resumo-label">Lançamentos</span>
        </div>
    `;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
    if (!data) return "";
    return new Date(data).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
}

carregarDashboard();