let listaFatos = [];
let listaContas = [];

/* ===== CARREGAR DADOS INICIAIS ===== */
async function carregarDados() {
    try {
        // Carregar Contas para o Select
        const respContas = await fetch('/api/contas');
        listaContas = await respContas.json();
        
        const select = document.getElementById("selectConta");
        select.innerHTML = '<option value="">Selecione uma conta...</option>';
        listaContas.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
        });

        // Carregar Fatos (Geral)
        const respFatos = await fetch('/api/fatos');
        listaFatos = await respFatos.json();
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

/* ===== FILTRAR E RENDERIZAR RAZÃO ===== */
function carregarRazao() {
    const contaId = document.getElementById("selectConta").value;
    if (!contaId) return;

    const conta = listaContas.find(c => c.id == contaId);
    const fatosFiltrados = listaFatos.filter(f => f.conta_id == contaId);
    
    const grid = document.getElementById("gridRazao");
    grid.innerHTML = "";

    // Iniciar o saldo com o Saldo Inicial cadastrado no banco
    let saldo = parseFloat(conta.saldo_inicial) || 0;
    
    let html = `
    <div class="razao-container" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <h2 style="margin-bottom: 20px; color: #1e293b;">Livro Razão — ${conta.nome}</h2>

        <div class="tabela-razao">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8fafc; text-align: left;">
                        <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">DATA</th>
                        <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">HISTÓRICO</th>
                        <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">DÉBITO</th>
                        <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">CRÉDITO</th>
                        <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">SALDO</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- LINHA DO SALDO INICIAL -->
                    <tr style="border-bottom: 1px solid #f1f5f9; background: #fffcf5;">
                        <td style="padding: 12px; color: #64748b;">---</td>
                        <td style="padding: 12px; font-weight: 600;">Saldo Inicial</td>
                        <td style="padding: 12px;">-</td>
                        <td style="padding: 12px;">-</td>
                        <td style="padding: 12px; font-weight: 700;">${formatarMoeda(saldo)}</td>
                    </tr>
    `;

    fatosFiltrados.reverse().forEach(f => { // Ordenar do mais antigo para o mais novo
        let valor = parseFloat(f.valor);
        let debito = "-";
        let credito = "-";

        // Lógica de Saldo: Entrada (Débito) aumenta, Saída (Crédito) diminui (Simplificado para o usuário)
        if (f.tipo === "entrada" || f.tipo === "Débito") {
            saldo += valor;
            debito = formatarMoeda(valor);
        } else {
            saldo -= valor;
            credito = formatarMoeda(valor);
        }

        html += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px;">${formatarData(f.data)}</td>
            <td style="padding: 12px;">${f.descricao || f.historico}</td>
            <td style="padding: 12px; color: #10b981;">${debito}</td>
            <td style="padding: 12px; color: #ef4444;">${credito}</td>
            <td style="padding: 12px; font-weight: 700; color: ${saldo >= 0 ? '#1e293b' : '#ef4444'};">
                ${formatarMoeda(saldo)}
            </td>
        </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    </div>
    `;

    grid.innerHTML = html;
}

/* ===== UTILITÁRIOS ===== */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
    return new Date(data).toLocaleDateString("pt-BR", {timeZone: 'UTC'});
}

/* INIT */
carregarDados();