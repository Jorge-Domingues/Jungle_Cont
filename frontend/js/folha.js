let funcionarios = [];

/* ===== CARREGAR DADOS ===== */
async function carregarFuncionarios() {
    try {
        const response = await fetch('/api/funcionarios');
        funcionarios = await response.json();
        
        const select = document.getElementById("selectFuncionario");
        select.innerHTML = '<option value="">Selecione um funcionário...</option>';
        
        funcionarios.forEach(f => {
            const opt = document.createElement("option");
            opt.value = f.id;
            opt.innerText = f.nome;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Erro ao buscar funcionários:", err);
    }
}

async function carregarContas() {
    try {
        const response = await fetch('/api/contas');
        const contas = await response.json();
        const select = document.getElementById("selectContaPagamento");
        
        // Filtrar apenas contas que são do tipo 'Ativo'
        const contasAtivo = contas.filter(c => c.tipo === 'Ativo');
        
        select.innerHTML = '<option value="">Selecione a conta (Ativos)...</option>';
        contasAtivo.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
        });

        if (contasAtivo.length === 0) {
            select.innerHTML = '<option value="">Nenhuma conta de Ativo cadastrada!</option>';
        }
    } catch (err) {
        console.error("Erro ao buscar contas:", err);
    }
}

/* ===== CÁLCULO PRINCIPAL ===== */
function calcularTudo() {
    const id = document.getElementById("selectFuncionario").value;
    const f = funcionarios.find(func => func.id == id);
    
    if (!f) {
        limparCampos();
        return;
    }

    // Entradas do Contador
    const hExtrasQtd = parseFloat(document.getElementById("horasExtras").value) || 0;
    const faltasQtd = parseFloat(document.getElementById("faltas").value) || 0;
    const bonusValor = parseFloat(document.getElementById("bonus").value) || 0;
    const temVT = document.getElementById("descontarVT").checked;

    // Constantes de Cálculo
    const salarioBase = parseFloat(f.salario);
    const valorHora = salarioBase / 220; 
    
    // Cálculos de Proventos e Descontos
    const valorHExtras = hExtrasQtd * (valorHora * 1.5);
    const valorFaltas = faltasQtd * valorHora;
    const valorVT = temVT ? (salarioBase * 0.06) : 0;
    
    const salarioBruto = salarioBase + valorHExtras + bonusValor - valorFaltas;
    
    const inss = calcularINSS(salarioBruto);
    const fgts = salarioBruto * 0.08;
    const liquido = salarioBruto - inss - valorVT;

    // Atualizar Resumo Lateral
    document.getElementById("resumoSalarioBase").innerText = formatarMoeda(salarioBase);
    document.getElementById("resumoINSS").innerText = "- " + formatarMoeda(inss);
    document.getElementById("resumoFGTS").innerText = formatarMoeda(fgts);
    document.getElementById("resumoLiquido").innerText = formatarMoeda(liquido);

    // Atualizar Tabela de Demonstrativo
    const corpo = document.getElementById("corpoFolha");
    corpo.innerHTML = `
        <tr>
            <td>Salário Base</td>
            <td>Provento</td>
            <td>30 dias</td>
            <td>${formatarMoeda(salarioBase)}</td>
        </tr>
    `;

    if (hExtrasQtd > 0) {
        corpo.innerHTML += `
            <tr>
                <td>Horas Extras (50%)</td>
                <td>Provento</td>
                <td>${hExtrasQtd}h</td>
                <td class="highlight">+ ${formatarMoeda(valorHExtras)}</td>
            </tr>
        `;
    }

    if (bonusValor > 0) {
        corpo.innerHTML += `
            <tr>
                <td>Bonificações / Prêmios</td>
                <td>Provento</td>
                <td>-</td>
                <td class="highlight">+ ${formatarMoeda(bonusValor)}</td>
            </tr>
        `;
    }

    if (faltasQtd > 0) {
        corpo.innerHTML += `
            <tr>
                <td>Faltas / Atrasos</td>
                <td>Desconto</td>
                <td>${faltasQtd}h</td>
                <td class="negative">- ${formatarMoeda(valorFaltas)}</td>
            </tr>
        `;
    }

    if (temVT) {
        corpo.innerHTML += `
            <tr>
                <td>Vale Transporte (6%)</td>
                <td>Desconto</td>
                <td>Sobre Base</td>
                <td class="negative">- ${formatarMoeda(valorVT)}</td>
            </tr>
        `;
    }

    corpo.innerHTML += `
        <tr>
            <td>INSS</td>
            <td>Desconto</td>
            <td>Tabela 2024</td>
            <td class="negative">- ${formatarMoeda(inss)}</td>
        </tr>
        <tr style="background: rgba(16, 185, 129, 0.05)">
            <td><strong>LÍQUIDO A RECEBER</strong></td>
            <td>-</td>
            <td>-</td>
            <td><strong>${formatarMoeda(liquido)}</strong></td>
        </tr>
        <tr style="border-top: 2px solid #eee">
            <td style="color: #64748b; font-size: 0.8rem">FGTS (Base: ${formatarMoeda(salarioBruto)})</td>
            <td style="color: #64748b; font-size: 0.8rem">Informativo</td>
            <td style="color: #64748b; font-size: 0.8rem">8%</td>
            <td style="color: #3b82f6; font-size: 0.8rem">${formatarMoeda(fgts)}</td>
        </tr>
    `;
}

/* ===== CÁLCULO INSS 2024 (Progressivo) ===== */
function calcularINSS(salario) {
    if (salario <= 0) return 0;
    let imposto = 0;
    const faixas = [
        { limite: 1412.00, aliquota: 0.075 },
        { limite: 2666.68, aliquota: 0.09 },
        { limite: 4000.03, aliquota: 0.12 },
        { limite: 7786.02, aliquota: 0.14 }
    ];

    let baseAnterior = 0;
    for (let faixa of faixas) {
        if (salario > baseAnterior) {
            let baseCalculo = Math.min(salario, faixa.limite) - baseAnterior;
            imposto += baseCalculo * faixa.aliquota;
            baseAnterior = faixa.limite;
        } else {
            break;
        }
    }
    return imposto;
}

/* ===== GRAVAR NO BANCO E INTEGRAR CONTABILIDADE ===== */
async function gravarFolha() {
    console.log("Botão Gravar clicado!");
    const id = document.getElementById("selectFuncionario").value;
    const contaId = document.getElementById("selectContaPagamento").value;
    const f = funcionarios.find(func => func.id == id);
    
    if (!f || !contaId) {
        mostrarModal("erro", "Selecione o funcionário e a conta de pagamento!");
        return;
    }

    const hExtrasQtd = parseFloat(document.getElementById("horasExtras").value) || 0;
    const faltasQtd = parseFloat(document.getElementById("faltas").value) || 0;
    const bonusValor = parseFloat(document.getElementById("bonus").value) || 0;
    const temVT = document.getElementById("descontarVT").checked;

    const salarioBase = parseFloat(f.salario);
    const valorHora = salarioBase / 220; 
    const valorHExtras = hExtrasQtd * (valorHora * 1.5);
    const valorFaltas = faltasQtd * valorHora;
    const valorVT = temVT ? (salarioBase * 0.06) : 0;
    
    const proventos = salarioBase + valorHExtras + bonusValor;
    const descontos = valorFaltas + calcularINSS(proventos - valorFaltas) + valorVT;
    const liquido = proventos - descontos;

    try {
        const response = await fetch('/api/folhas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                funcionario_id: f.id,
                conta_id: contaId,
                nome: f.nome,
                salario_base: salarioBase,
                proventos: proventos,
                descontos: descontos,
                liquido: liquido
            })
        });

        if (response.ok) {
            mostrarModal("sucesso", "Folha gravada e lançada no Diário!");
        } else {
            mostrarModal("erro", "Erro ao gravar a folha.");
        }
    } catch (err) {
        mostrarModal("erro", "Erro de conexão com o servidor.");
    }
}

/* ===== UTILITÁRIOS ===== */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function limparCampos() {
    document.getElementById("resumoSalarioBase").innerText = "R$ 0,00";
    document.getElementById("resumoINSS").innerText = "- R$ 0,00";
    document.getElementById("resumoFGTS").innerText = "R$ 0,00";
    document.getElementById("resumoLiquido").innerText = "R$ 0,00";
    document.getElementById("corpoFolha").innerHTML = "";
}

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
        setTimeout(fecharModal, 2500);
    } else {
        icon.innerText = "✖";
        box.classList.add("erro");
    }
    modal.classList.add("show");
}

function fecharModal(){
    document.getElementById("modal").classList.remove("show");
}

/* ===== ABRIR / FECHAR HOLERITE ===== */
function abrirHolerite() {
    const id = document.getElementById("selectFuncionario").value;
    const f = funcionarios.find(func => func.id == id);

    if (!f) {
        mostrarModal("erro", "Selecione um funcionário antes de imprimir o holerite!");
        return;
    }

    // Recalcula todos os valores
    const hExtrasQtd  = parseFloat(document.getElementById("horasExtras").value) || 0;
    const faltasQtd   = parseFloat(document.getElementById("faltas").value) || 0;
    const bonusValor  = parseFloat(document.getElementById("bonus").value) || 0;
    const temVT       = document.getElementById("descontarVT").checked;

    const salarioBase  = parseFloat(f.salario);
    const valorHora    = salarioBase / 220;
    const valorHExtras = hExtrasQtd * (valorHora * 1.5);
    const valorFaltas  = faltasQtd * valorHora;
    const valorVT      = temVT ? salarioBase * 0.06 : 0;
    const salarioBruto = salarioBase + valorHExtras + bonusValor - valorFaltas;
    const inss         = calcularINSS(salarioBruto);
    const fgts         = salarioBruto * 0.08;
    const liquido      = salarioBruto - inss - valorVT;

    // --- Preenche dados do funcionário ---
    document.getElementById("holNome").textContent      = f.nome;
    document.getElementById("holMatricula").textContent = String(f.id).padStart(4, '0');
    document.getElementById("holCPF").textContent       = f.cpf || '—';

    // Admissão formatada
    if (f.data_ingresso) {
        const d = new Date(f.data_ingresso);
        document.getElementById("holAdmissao").textContent =
            d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    // Período = mês/ano atual
    const hoje = new Date();
    const periodo = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    document.getElementById("holPeriodo").textContent =
        periodo.charAt(0).toUpperCase() + periodo.slice(1);

    // --- Monta colunas da tabela de verbas ---
    // Cada coluna é uma div independente, preenchemos linha a linha
    const verbas     = [];
    const refs       = [];
    const vencimentos = [];
    const descontos  = [];

    const addLinha = (verba, ref, venc, desc) => {
        verbas.push(verba);
        refs.push(ref);
        vencimentos.push(venc ? formatarMoeda(venc) : '');
        descontos.push(desc ? formatarMoeda(desc) : '');
    };

    addLinha('Salário Base', '30 dias', salarioBase, null);

    if (hExtrasQtd > 0)
        addLinha('Horas Extras (50%)', `${hExtrasQtd}h`, valorHExtras, null);

    if (bonusValor > 0)
        addLinha('Bonificações / Prêmios', '—', bonusValor, null);

    if (valorFaltas > 0)
        addLinha('Faltas / Atrasos', `${faltasQtd}h`, null, valorFaltas);

    if (temVT)
        addLinha('Vale Transporte (6%)', 'Sobre Base', null, valorVT);

    addLinha('INSS', 'Tabela 2024', null, inss);

    const renderCol = (containerId, items) => {
        const el = document.getElementById(containerId);
        el.innerHTML = items.map(txt =>
            `<div class="hol-row" style="padding:2px 6px;min-height:18px;">${txt}</div>`
        ).join('');
    };

    renderCol('holVerbas',     verbas);
    renderCol('holRefs',       refs);
    renderCol('holVencimentos', vencimentos);
    renderCol('holDescontos',  descontos);

    // Totais
    const totalVenc = salarioBase + valorHExtras + bonusValor;
    const totalDesc = valorFaltas + inss + valorVT;
    document.getElementById("holTotalVenc").textContent = formatarMoeda(totalVenc);
    document.getElementById("holTotalDesc").textContent = formatarMoeda(totalDesc);

    // Líquido
    document.getElementById("holLiquido").textContent = formatarMoeda(liquido);

    // Rodapé de base de cálculo
    document.getElementById("holBaseSalario").textContent = formatarMoeda(salarioBase);
    document.getElementById("holBaseINSS").textContent    = formatarMoeda(salarioBruto);
    document.getElementById("holBaseFGTS").textContent    = formatarMoeda(salarioBruto);
    document.getElementById("holValorFGTS").textContent   = formatarMoeda(fgts);
    document.getElementById("holBaseIRRF").textContent    = formatarMoeda(salarioBruto);

    // Abre o overlay
    document.getElementById("holerite-overlay").classList.add("show");
}

function fecharHolerite() {
    document.getElementById("holerite-overlay").classList.remove("show");
}

/* INIT */
carregarFuncionarios();
carregarContas();
