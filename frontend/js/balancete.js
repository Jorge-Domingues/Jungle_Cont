let listaContas = [];
let listaFatos = [];

/* ===== CARREGAR DADOS ===== */
async function carregarDados() {
    try {
        const respContas = await fetch('/api/contas');
        listaContas = await respContas.json();

        const respFatos = await fetch('/api/fatos');
        listaFatos = await respFatos.json();

        processarBalancete();
    } catch (err) {
        console.error("Erro ao carregar dados do balancete:", err);
    }
}

/* ===== PROCESSAR E RENDERIZAR ===== */
function processarBalancete() {
    const tbody = document.getElementById("balanceteBody");
    tbody.innerHTML = "";

    let totalAtivo = 0;
    let totalPassivo = 0;
    let totalReceita = 0;
    let totalDespesa = 0;

    let totalGeralDebito = 0;
    let totalGeralCredito = 0;

    // Atualizar data no título
    const dataHoje = new Date().toLocaleDateString("pt-BR");
    document.querySelector("h1 span").innerText = `(${dataHoje})`;

    listaContas.forEach(conta => {
        const fatosDaConta = listaFatos.filter(f => f.conta_id === conta.id);
        
        let somaDebitos = 0;
        let somaCreditos = 0;

        fatosDaConta.forEach(f => {
            const valor = parseFloat(f.valor);
            if (f.tipo === "entrada" || f.tipo === "Débito") {
                somaDebitos += valor;
            } else {
                somaCreditos += valor;
            }
        });

        // Cálculo do Saldo Final baseado na natureza da conta
        let saldoFinal = 0;
        const saldoInicial = parseFloat(conta.saldo_inicial) || 0;

        if (conta.tipo === "Ativo" || conta.tipo === "Despesa") {
            // Natureza Devedora (Débito aumenta)
            saldoFinal = saldoInicial + somaDebitos - somaCreditos;
        } else {
            // Natureza Credora (Crédito aumenta - Passivo e Receita)
            saldoFinal = saldoInicial + somaCreditos - somaDebitos;
        }

        // Acumular totais para o resumo
        if (conta.tipo === "Ativo") totalAtivo += saldoFinal;
        if (conta.tipo === "Passivo") totalPassivo += saldoFinal;
        if (conta.tipo === "Receita") totalReceita += saldoFinal;
        if (conta.tipo === "Despesa") totalDespesa += saldoFinal;

        totalGeralDebito += somaDebitos;
        totalGeralCredito += somaCreditos;

        // Renderizar Linha
        const cor = conta.cor || '#64748b';
        tbody.innerHTML += `
            <tr>
                <td><small style="color: #64748b; font-weight: bold;">${conta.codigo || '---'}</small></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${cor};"></div>
                        <strong>${conta.nome}</strong>
                    </div>
                </td>
                <td>${formatarMoeda(somaDebitos)}</td>
                <td>${formatarMoeda(somaCreditos)}</td>
                <td style="font-weight: bold; color: ${saldoFinal < 0 ? '#ef4444' : '#1e293b'}">
                    ${formatarMoeda(saldoFinal)}
                </td>
            </tr>
        `;
    });

    // Atualizar Resumo Patrimonial
    atualizarResumo(totalAtivo, totalPassivo, totalReceita, totalDespesa);
}

/* ===== ATUALIZAR CARDS LATERAIS ===== */
function atualizarResumo(ativo, passivo, receita, despesa) {
    // Patrimônio Líquido = Ativo - Passivo + (Receita - Despesa)
    const lucroPrejuizo = receita - despesa;
    const pl = ativo - passivo;

    const cardResumo = document.querySelector(".card:nth-child(1)");
    cardResumo.innerHTML = `
        <h3>Resumo Patrimonial</h3>
        <p>Total Ativo <span class="positivo">${formatarMoeda(ativo)}</span></p>
        <p>Total Passivo <span class="negativo">${formatarMoeda(passivo)}</span></p>
        <p>Resultado (L/P) <span class="${lucroPrejuizo >= 0 ? 'positivo' : 'negativo'}">${formatarMoeda(lucroPrejuizo)}</span></p>
        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #e2e8f0;">
        <p><strong>Patrimônio Líquido</strong> <span style="font-weight: bold;">${formatarMoeda(pl + lucroPrejuizo)}</span></p>
    `;

    const cardEquacao = document.querySelector(".card:nth-child(2)");
    cardEquacao.innerHTML = `
        <h3>Equação Fundamental</h3>
        <div class="equacao" style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px;">
            <span class="ativo">Ativo</span>
            <span>=</span>
            <span class="passivo">Passivo + PL</span>
        </div>
        <div class="equacao valores" style="display: flex; justify-content: space-between; font-weight: bold;">
            <span class="ativo">${formatarMoeda(ativo)}</span>
            <span>=</span>
            <span style="color: #6366f1;">${formatarMoeda(passivo + (pl + lucroPrejuizo))}</span>
        </div>
    `;
}

/* ===== UTILITÁRIOS ===== */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Iniciar
carregarDados();