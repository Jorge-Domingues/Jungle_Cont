/* ============================================================
   BALANCETE.JS — Balancete de Verificação
   ============================================================ */

async function carregarBalancete() {
    try {
        const inicio = document.getElementById("filtroInicio").value;
        const fim = document.getElementById("filtroFim").value;

        let url = '/api/relatorios/balancete';
        const params = [];
        if (inicio) params.push(`inicio=${inicio}`);
        if (fim) params.push(`fim=${fim}`);
        if (params.length) url += '?' + params.join('&');

        const resp = await fetch(url, { credentials: 'include' });
        const data = await resp.json();

        renderizarBalancete(data);
    } catch (err) {
        console.error("Erro ao carregar balancete:", err);
    }
}

function renderizarBalancete(data) {
    const tbody = document.getElementById("balanceteBody");
    const tfoot = document.getElementById("balanceteFoot");
    tbody.innerHTML = "";

    const dataHoje = new Date().toLocaleDateString("pt-BR");
    document.getElementById("dataRef").innerText = `(${dataHoje})`;

    let totalAtivo = 0, totalPassivo = 0, totalPL = 0;
    let totalReceita = 0, totalDespesa = 0;

    data.contas.forEach(c => {
        const corNatureza = c.natureza === 'Devedora' ? '#16a34a' : '#dc2626';
        const saldoColor = c.saldo < 0 ? '#ef4444' : '#1e293b';

        tbody.innerHTML += `
            <tr>
                <td><small style="color: #94a3b8; font-weight: 700;">${c.codigo}</small></td>
                <td><strong>${c.nome}</strong></td>
                <td><span class="badge-natureza" style="color: ${corNatureza}">${c.natureza === 'Devedora' ? 'Dev' : 'Cred'}</span></td>
                <td class="valor-debito">${formatarMoeda(c.debitos)}</td>
                <td class="valor-credito">${formatarMoeda(c.creditos)}</td>
                <td style="font-weight: 700; color: ${saldoColor}">${formatarMoeda(c.saldo)}</td>
            </tr>
        `;

        if (c.tipo === 'Ativo') totalAtivo += c.saldo;
        else if (c.tipo === 'Passivo') totalPassivo += c.saldo;
        else if (c.tipo === 'Patrimônio Líquido') totalPL += c.saldo;
        else if (c.tipo === 'Receita') totalReceita += c.saldo;
        else if (c.tipo === 'Despesa') totalDespesa += c.saldo;
    });

    // Totais
    tfoot.innerHTML = `
        <tr class="total-row">
            <td colspan="3"><strong>TOTAIS</strong></td>
            <td class="valor-debito"><strong>${formatarMoeda(data.totais.debitos)}</strong></td>
            <td class="valor-credito"><strong>${formatarMoeda(data.totais.creditos)}</strong></td>
            <td><strong>${formatarMoeda(data.totais.saldo_devedor - data.totais.saldo_credor)}</strong></td>
        </tr>
    `;

    // Resumo
    const resultado = totalReceita - totalDespesa;
    document.getElementById("cardResumo").innerHTML = `
        <h3>Resumo Patrimonial</h3>
        <p>Total Ativo <span class="val-positivo">${formatarMoeda(totalAtivo)}</span></p>
        <p>Total Passivo <span class="val-negativo">${formatarMoeda(totalPassivo)}</span></p>
        <p>Patrimônio Líquido <span class="val-neutro">${formatarMoeda(totalPL)}</span></p>
        <hr>
        <p>Receitas <span class="val-positivo">${formatarMoeda(totalReceita)}</span></p>
        <p>Despesas <span class="val-negativo">${formatarMoeda(totalDespesa)}</span></p>
        <p><strong>Resultado</strong> <span style="font-weight:700;">${formatarMoeda(resultado)}</span></p>
    `;

    // Equação
    const plTotal = totalPL + resultado;
    document.getElementById("cardEquacao").innerHTML = `
        <h3>Equação Fundamental</h3>
        <div class="equacao-visual">
            <div class="eq-lado">
                <span class="eq-label">Ativo</span>
                <span class="eq-valor">${formatarMoeda(totalAtivo)}</span>
            </div>
            <span class="eq-sinal">=</span>
            <div class="eq-lado">
                <span class="eq-label">Passivo + PL</span>
                <span class="eq-valor">${formatarMoeda(totalPassivo + plTotal)}</span>
            </div>
        </div>
    `;

    // Status
    const equilibrado = data.totais.equilibrado;
    document.getElementById("cardStatus").innerHTML = `
        <h3>Status</h3>
        <div class="status-indicator ${equilibrado ? 'ok' : 'erro'}">
            <span class="status-icon"><i class="icon-svg ${equilibrado ? 'icon-check' : 'icon-x'}"></i></span>
            <span class="status-text">${equilibrado ? 'Contabilidade Equilibrada' : 'DESEQUILÍBRIO DETECTADO'}</span>
        </div>
        <p class="status-detail">
            Saldos Devedores: ${formatarMoeda(data.totais.saldo_devedor)}<br>
            Saldos Credores: ${formatarMoeda(data.totais.saldo_credor)}
        </p>
    `;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

carregarBalancete();