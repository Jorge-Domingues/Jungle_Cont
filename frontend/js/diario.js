const { jsPDF } = window.jspdf;

/* ===== DADOS ===== */
async function carregarFatos() {
    try {
        const response = await fetch('/api/fatos');
        fatos = await response.json();
        renderizar();
    } catch (err) {
        console.error("Erro ao carregar fatos:", err);
    }
}

/* ===== RENDER ===== */
function renderizar(){
    let lista = document.getElementById("listaDiario");
    if (!lista) return;
    lista.innerHTML = "";

    fatos.forEach(f => {
        lista.innerHTML += `
        <div class="item">
            <div class="left">
                <span class="data">${formatarData(f.data)}</span>
                <h3>${f.tipo}</h3>
                <p class="historico">Histórico: ${f.descricao || f.historico}</p>
            </div>
            <div class="right">
                <span class="valor">R$ ${parseFloat(f.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
        </div>
        `;
    });
}

/* ===== FORMATAR DATA ===== */
function formatarData(data){
    if(!data) return "";
    return new Date(data).toLocaleDateString("pt-BR", {timeZone: 'UTC'});
}

/* ===== GERAR PDF ===== */
function gerarPDF(){
    let doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Livro Diário", 14, 15);
    doc.setFontSize(10);

    let y = 30;
    fatos.forEach(f => {
        if(y > 270){
            doc.addPage();
            y = 20;
        }
        doc.text(`Data: ${formatarData(f.data)}`, 14, y);
        y += 5;
        doc.text(`Tipo: ${f.tipo}`, 14, y);
        y += 5;
        doc.text(`Histórico: ${f.descricao || f.historico}`, 14, y);
        y += 5;
        doc.text(`Valor: R$ ${parseFloat(f.valor).toFixed(2)}`, 14, y);
        y += 10;
    });
    doc.save("diario.pdf");
}

/* INIT */
carregarFatos();