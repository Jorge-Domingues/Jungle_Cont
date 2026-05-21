/* ===== DADOS DO DASHBOARD ===== */
async function carregarDashboard() {
    try {
        const respContas = await fetch('/api/contas');
        const contas = await respContas.json();

        const respFatos = await fetch('/api/fatos');
        const fatos = await respFatos.json();

        processarDashboard(contas, fatos);
    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
    }
}

function processarDashboard(contas, fatos) {
    let saldoGeral = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;

    // 1. Calcular Saldo de Ativos (Bancos/Caixa)
    contas.forEach(c => {
        const fatosDaConta = fatos.filter(f => f.conta_id === c.id);
        let somaDebitos = 0;
        let somaCreditos = 0;

        fatosDaConta.forEach(f => {
            const v = parseFloat(f.valor);
            if (f.tipo === "entrada" || f.tipo === "Débito") somaDebitos += v;
            else somaCreditos += v;
        });

        // Só somamos no "Saldo Total" o que for ATIVO
        if (c.tipo === "Ativo") {
            saldoGeral += (parseFloat(c.saldo_inicial) || 0) + somaDebitos - somaCreditos;
        }
    });

    // 2. Calcular Entradas e Saídas Totais (Geral)
    fatos.forEach(f => {
        const v = parseFloat(f.valor);
        if (f.tipo === "entrada" || f.tipo === "Débito") totalEntradas += v;
        else totalSaidas += v;
    });

    // 3. Renderizar Cards
    document.getElementById("saldoTotal").innerHTML = `<span class="saldo-valor">${formatarMoeda(saldoGeral)}</span>`;
    document.getElementById("totalEntradas").innerHTML = `<span class="entrada-valor">${formatarMoeda(totalEntradas)}</span>`;
    document.getElementById("totalSaidas").innerHTML = `<span class="saida-valor">${formatarMoeda(totalSaidas)}</span>`;

    // 4. Renderizar Últimos Lançamentos (Top 5)
    const ultimos = fatos.slice(0, 5);
    const container = document.getElementById("ultimos");
    container.innerHTML = "";

    if (ultimos.length === 0) {
        container.innerHTML = "<p style='color: #64748b; padding: 20px;'>Nenhum lançamento registrado ainda.</p>";
    }

    ultimos.forEach(f => {
        const isEntrada = f.tipo === "entrada" || f.tipo === "Débito";
        container.innerHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; flex-direction: column;">
                <strong style="color: #1e293b;">${f.descricao || 'Lançamento'}</strong>
                <small style="color: #64748b;">${new Date(f.data).toLocaleDateString("pt-BR", {timeZone: 'UTC'})} • ${f.nome_conta || 'Conta Geral'}</small>
            </div>
            <span style="font-weight: bold; color: ${isEntrada ? '#10b981' : '#ef4444'};">
                ${isEntrada ? '+' : '-'} ${formatarMoeda(parseFloat(f.valor))}
            </span>
        </div>
        `;
    });
}

/* ===== UTILITÁRIOS ===== */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Inicializar
carregarDashboard();