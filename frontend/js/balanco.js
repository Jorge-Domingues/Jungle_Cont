/* ============================================================
   BALANCO.JS — Balanço Patrimonial
   ============================================================ */

async function carregarBalanco() {
    try {
        const dataRef = document.getElementById("filtroData").value;
        let url = '/api/relatorios/balanco';
        if (dataRef) url += `?data=${dataRef}`;

        const resp = await fetch(url, { credentials: 'include' });
        const data = await resp.json();
        renderizarBalanco(data);
    } catch (err) {
        console.error("Erro ao carregar balanço:", err);
    }
}

function renderizarBalanco(data) {
    const container = document.getElementById("balancoContainer");

    const ativosHTML = data.ativos.map(a => `
        <div class="bp-linha">
            <span class="bp-codigo">${a.codigo}</span>
            <span class="bp-nome">${a.nome}</span>
            <span class="bp-dots"></span>
            <span class="bp-valor">${formatarMoeda(a.saldo)}</span>
        </div>
    `).join('') || '<div class="bp-vazio">Nenhuma conta de ativo</div>';

    const passivosHTML = data.passivos.map(p => `
        <div class="bp-linha">
            <span class="bp-codigo">${p.codigo}</span>
            <span class="bp-nome">${p.nome}</span>
            <span class="bp-dots"></span>
            <span class="bp-valor">${formatarMoeda(p.saldo)}</span>
        </div>
    `).join('') || '<div class="bp-vazio">Nenhuma conta de passivo</div>';

    const plHTML = data.pl.map(p => `
        <div class="bp-linha">
            <span class="bp-codigo">${p.codigo}</span>
            <span class="bp-nome">${p.nome}</span>
            <span class="bp-dots"></span>
            <span class="bp-valor">${formatarMoeda(p.saldo)}</span>
        </div>
    `).join('');

    const dataTexto = document.getElementById("filtroData").value
        ? new Date(document.getElementById("filtroData").value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : new Date().toLocaleDateString('pt-BR');

    container.innerHTML = `
        <div class="bp-header-card">
            <h2>BALANÇO PATRIMONIAL</h2>
            <p>Posição em ${dataTexto}</p>
            <div class="bp-status ${data.equilibrado ? 'ok' : 'erro'}">
                <span><i class="icon-svg ${data.equilibrado ? 'icon-check' : 'icon-x'}"></i> ${data.equilibrado ? 'Equilibrado' : 'Desequilibrado'}</span>
            </div>
        </div>

        <div class="bp-grid">
            <!-- LADO ESQUERDO: ATIVO -->
            <div class="bp-coluna">
                <div class="bp-coluna-header ativo-bg">
                    <i class="fa-solid fa-arrow-up"></i> ATIVO
                </div>
                <div class="bp-coluna-body">
                    ${ativosHTML}
                    <div class="bp-total">
                        <span>TOTAL DO ATIVO</span>
                        <span class="bp-total-valor">${formatarMoeda(data.totalAtivo)}</span>
                    </div>
                </div>
            </div>

            <!-- LADO DIREITO: PASSIVO + PL -->
            <div class="bp-coluna">
                <div class="bp-coluna-header passivo-bg">
                    <i class="fa-solid fa-arrow-down"></i> PASSIVO
                </div>
                <div class="bp-coluna-body">
                    ${passivosHTML}
                    <div class="bp-subtotal">
                        <span>Total Passivo</span>
                        <span>${formatarMoeda(data.totalPassivo)}</span>
                    </div>
                </div>

                <div class="bp-coluna-header pl-bg" style="margin-top: 2px;">
                    <i class="fa-solid fa-gem"></i> PATRIMÔNIO LÍQUIDO
                </div>
                <div class="bp-coluna-body">
                    ${plHTML}
                    ${data.resultadoExercicio !== 0 ? `
                        <div class="bp-linha resultado">
                            <span class="bp-codigo">—</span>
                            <span class="bp-nome"><em>Resultado do Exercício</em></span>
                            <span class="bp-dots"></span>
                            <span class="bp-valor" style="color: ${data.resultadoExercicio >= 0 ? '#059669' : '#dc2626'}">
                                ${formatarMoeda(data.resultadoExercicio)}
                            </span>
                        </div>
                    ` : ''}
                    <div class="bp-subtotal">
                        <span>Total PL</span>
                        <span>${formatarMoeda(data.totalPL)}</span>
                    </div>
                    <div class="bp-total">
                        <span>TOTAL PASSIVO + PL</span>
                        <span class="bp-total-valor">${formatarMoeda(data.totalPassivo + data.totalPL)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

carregarBalanco();
