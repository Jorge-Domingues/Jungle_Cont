/* ============================================================
   DRE.JS — Demonstração do Resultado do Exercício
   ============================================================ */

async function carregarDRE() {
    try {
        const inicio = document.getElementById("filtroInicio").value;
        const fim = document.getElementById("filtroFim").value;

        let url = '/api/relatorios/dre';
        const params = [];
        if (inicio) params.push(`inicio=${inicio}`);
        if (fim) params.push(`fim=${fim}`);
        if (params.length) url += '?' + params.join('&');

        const resp = await fetch(url, { credentials: 'include' });
        const data = await resp.json();
        renderizarDRE(data);
    } catch (err) {
        console.error("Erro ao carregar DRE:", err);
    }
}

function renderizarDRE(data) {
    const container = document.getElementById("dreContainer");

    const receitas = data.itens.filter(i => i.tipo === 'Receita');
    const despesas = data.itens.filter(i => i.tipo === 'Despesa');

    const receitasHTML = receitas.map(r => `
        <div class="dre-linha">
            <span class="dre-codigo">${r.codigo}</span>
            <span class="dre-nome">${r.nome}</span>
            <span class="dre-dots"></span>
            <span class="dre-valor positivo">${formatarMoeda(r.saldo)}</span>
        </div>
    `).join('') || '<div class="dre-vazio">Nenhuma receita no período</div>';

    const despesasHTML = despesas.map(d => `
        <div class="dre-linha">
            <span class="dre-codigo">${d.codigo}</span>
            <span class="dre-nome">${d.nome}</span>
            <span class="dre-dots"></span>
            <span class="dre-valor negativo">(${formatarMoeda(d.saldo)})</span>
        </div>
    `).join('') || '<div class="dre-vazio">Nenhuma despesa no período</div>';

    const isLucro = data.resultado >= 0;

    container.innerHTML = `
        <div class="dre-card">
            <div class="dre-header">
                <h2>DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO</h2>
                <p class="dre-periodo">${getPeriodoTexto()}</p>
            </div>

            <div class="dre-secao">
                <h3 class="secao-titulo receita-titulo">
                    <i class="fa-solid fa-arrow-trend-up"></i> RECEITAS OPERACIONAIS
                </h3>
                ${receitasHTML}
                <div class="dre-subtotal">
                    <span>Total de Receitas</span>
                    <span class="positivo">${formatarMoeda(data.totalReceitas)}</span>
                </div>
            </div>

            <div class="dre-secao">
                <h3 class="secao-titulo despesa-titulo">
                    <i class="fa-solid fa-arrow-trend-down"></i> DESPESAS OPERACIONAIS
                </h3>
                ${despesasHTML}
                <div class="dre-subtotal">
                    <span>Total de Despesas</span>
                    <span class="negativo">(${formatarMoeda(data.totalDespesas)})</span>
                </div>
            </div>

            <div class="dre-resultado ${isLucro ? 'lucro' : 'prejuizo'}">
                <div class="resultado-label">
                    <span class="resultado-icon"><i class="icon-svg ${isLucro ? 'icon-chart-up' : 'icon-chart-down'}"></i></span>
                    <span>${isLucro ? 'LUCRO LÍQUIDO DO EXERCÍCIO' : 'PREJUÍZO LÍQUIDO DO EXERCÍCIO'}</span>
                </div>
                <span class="resultado-valor">${formatarMoeda(Math.abs(data.resultado))}</span>
            </div>
        </div>
    `;
}

function getPeriodoTexto() {
    const inicio = document.getElementById("filtroInicio").value;
    const fim = document.getElementById("filtroFim").value;

    if (inicio && fim) {
        return `Período: ${formatarData(inicio)} a ${formatarData(fim)}`;
    }
    return `Posição acumulada até ${new Date().toLocaleDateString('pt-BR')}`;
}

function formatarMoeda(valor) {
    return Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
    if (!data) return "";
    return new Date(data).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
}

carregarDRE();
