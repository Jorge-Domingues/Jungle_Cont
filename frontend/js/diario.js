/* ============================================================
   DIARIO.JS — Livro Diário Formal
   ============================================================ */
let lancamentos = [];

/* ===== CARREGAR DIÁRIO ===== */
async function carregarDiario() {
    try {
        const inicio = document.getElementById("filtroInicio").value;
        const fim = document.getElementById("filtroFim").value;

        let url = '/api/lancamentos';
        const params = [];
        if (inicio) params.push(`inicio=${inicio}`);
        if (fim) params.push(`fim=${fim}`);
        if (params.length) url += '?' + params.join('&');

        const resp = await fetch(url, { credentials: 'include' });
        lancamentos = await resp.json();

        // Ordenar do mais antigo para o mais novo (Diário é cronológico)
        lancamentos.sort((a, b) => new Date(a.data) - new Date(b.data) || a.id - b.id);

        renderizar();
    } catch (err) {
        console.error("Erro ao carregar diário:", err);
    }
}

/* ===== RENDERIZAR ===== */
function renderizar() {
    const container = document.getElementById("diarioContainer");

    if (!lancamentos || lancamentos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-book-open"></i>
                <p>Nenhum lançamento encontrado no período.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = lancamentos.map((l, index) => {
        const debitos = (l.partidas || []).filter(p => p.tipo === 'D');
        const creditos = (l.partidas || []).filter(p => p.tipo === 'C');

        const debitosHTML = debitos.map(p => `
            <div class="diario-partida debito">
                <span class="d-indicator">D</span>
                <span class="d-conta">${p.conta_codigo} — ${p.conta_nome}</span>
                <span class="d-dots"></span>
                <span class="d-valor">${formatarMoeda(parseFloat(p.valor))}</span>
            </div>
        `).join('');

        const creditosHTML = creditos.map(p => `
            <div class="diario-partida credito">
                <span class="c-indicator">C</span>
                <span class="c-conta">${p.conta_codigo} — ${p.conta_nome}</span>
                <span class="d-dots"></span>
                <span class="c-valor">${formatarMoeda(parseFloat(p.valor))}</span>
            </div>
        `).join('');

        return `
            <div class="diario-lancamento">
                <div class="diario-numero">#${String(index + 1).padStart(4, '0')}</div>
                <div class="diario-data">${formatarData(l.data)}</div>
                <div class="diario-body">
                    ${debitosHTML}
                    ${creditosHTML}
                    <div class="diario-historico">
                        <span class="hist-label">Histórico:</span> ${l.descricao}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ===== GERAR PDF ===== */
function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("LIVRO DIÁRIO", 14, 20);
    doc.setFontSize(10);
    doc.text("Jungle Cont — Sistema Contábil", 14, 27);

    let y = 40;

    lancamentos.forEach((l, index) => {
        if (y > 265) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`#${String(index + 1).padStart(4, '0')}  —  ${formatarData(l.data)}`, 14, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        (l.partidas || []).forEach(p => {
            if (y > 275) { doc.addPage(); y = 20; }
            const prefix = p.tipo === 'D' ? 'D  ' : '    C  ';
            const valor = parseFloat(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            doc.text(`${prefix}${p.conta_codigo} — ${p.conta_nome}`, 18, y);
            doc.text(`R$ ${valor}`, 160, y, { align: 'right' });
            y += 5;
        });

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Hist.: ${l.descricao}`, 18, y);
        doc.setTextColor(0);
        y += 10;
    });

    doc.save("livro_diario.pdf");
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
carregarDiario();