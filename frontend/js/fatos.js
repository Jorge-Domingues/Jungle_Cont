/* ===== DADOS (API) ===== */
async function carregarFatos() {
    try {
        const response = await fetch('/api/fatos');
        fatos = await response.json();
        renderizarFatos();
    } catch (err) {
        console.error("Erro ao carregar fatos:", err);
    }
}

async function carregarContas() {
    try {
        const response = await fetch('/api/contas');
        const contas = await response.json();
        const select = document.getElementById("conta");
        select.innerHTML = '<option value="">Selecione uma conta</option>';
        contas.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
        });
    } catch (err) {
        console.error("Erro ao carregar contas:", err);
    }
}

/* ===== REGISTRAR FATO ===== */
async function registrarFato(){
    let conta = document.getElementById("conta");
    let tipo = document.getElementById("tipo");
    let data = document.getElementById("data");
    let valor = document.getElementById("valor");
    let historico = document.getElementById("historico");

    if(!conta.value || !tipo.value || !data.value || !valor.value || !historico.value.trim()){
        mostrarModal("erro", "Preencha todos os campos!");
        return;
    }

    let valorNum = valor.value.replace("R$ ", "").replace(/\./g, "").replace(",", ".");

    let payload = {
        conta_id: conta.value,
        tipo: tipo.value,
        data: data.value,
        valor: parseFloat(valorNum),
        historico: historico.value
    };

    try {
        const response = await fetch('/api/fatos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            mostrarModal("sucesso", "Lançamento registrado!");
            limparCampos();
            carregarFatos();
        } else {
            mostrarModal("erro", "Erro ao salvar fato.");
        }
    } catch (err) {
        mostrarModal("erro", "Erro de conexão.");
    }
}

/* ===== RENDER ===== */
function renderizarFatos(){
    let tabela = document.getElementById("tabelaFatos");
    if (!tabela) return;
    tabela.innerHTML = "";

    fatos.forEach(f => {
        tabela.innerHTML += `
        <tr>
            <td>${f.nome_conta || 'N/A'}</td>
            <td>${f.tipo}</td>
            <td>${f.descricao || f.historico}</td>
            <td>${formatarData(f.data)}</td>
            <td>R$ ${parseFloat(f.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        </tr>
        `;
    });
}

/* ===== FORMATAR DATA ===== */
function formatarData(data){
    if(!data) return "";
    return new Date(data).toLocaleDateString("pt-BR", {timeZone: 'UTC'});
}

/* ===== LIMPAR CAMPOS ===== */
function limparCampos(){
    document.getElementById("tipo").value = "";
    document.getElementById("data").value = "";
    document.getElementById("valor").value = "";
    document.getElementById("historico").value = "";
}

/* ===== MÁSCARA DE VALOR ===== */
document.getElementById("valor").addEventListener("input", function(e){
    let v = e.target.value.replace(/\D/g, "");
    v = (v / 100).toFixed(2) + "";
    v = v.replace(".", ",");
    v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    e.target.value = "R$ " + v;
});

/* ===== MODAL ===== */
function mostrarModal(tipo, mensagem){

    let modal = document.getElementById("modal");
    let texto = document.getElementById("modalTexto");
    let icon = document.getElementById("modalIcon");
    let box = modal.querySelector(".modal-box");

    texto.innerText = mensagem;

    box.classList.remove("sucesso", "erro");

    if(tipo === "sucesso"){
        icon.innerText = "✔";
        box.classList.add("sucesso");
        setTimeout(fecharModal, 2000);
    } else {
        icon.innerText = "✖";
        box.classList.add("erro");
    }

    modal.classList.add("show");
}

/* ===== FECHAR MODAL ===== */
function fecharModal(){
    document.getElementById("modal").classList.remove("show");
}

/* ===== INICIAR ===== */
carregarContas();
carregarFatos();