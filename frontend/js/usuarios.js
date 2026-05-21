async function carregarUsuarios() {
    try {
        const response = await fetch('/api/usuarios', { credentials: 'include' });
        const usuarios = await response.json();
        
        const tabela = document.getElementById('tabelaUsuarios');
        tabela.innerHTML = '';
        
        usuarios.forEach(u => {
            tabela.innerHTML += `
                <tr>
                    <td>${u.id}</td>
                    <td>${u.login}</td>
                    <td>
                        <button class="btn-delete" onclick="excluirUsuario(${u.id})">
                            <i class="fa-solid fa-trash"></i> Excluir
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Erro ao carregar usuários:", err);
    }
}

async function cadastrarUsuario() {
    const login = document.getElementById('newLogin').value;
    const senha = document.getElementById('newSenha').value;

    if (!login || !senha) {
        mostrarModal("erro", "Preencha todos os campos!");
        return;
    }

    try {
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, senha })
        });

        if (response.ok) {
            mostrarModal("sucesso", "Usuário cadastrado!");
            document.getElementById('newLogin').value = '';
            document.getElementById('newSenha').value = '';
            carregarUsuarios();
        } else {
            const data = await response.json();
            mostrarModal("erro", data.error || "Erro ao cadastrar");
        }
    } catch (err) {
        mostrarModal("erro", "Erro na conexão com a API");
    }
}

async function excluirUsuario(id) {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
        const response = await fetch(`/api/usuarios?id=${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            mostrarModal("sucesso", "Usuário removido!");
            carregarUsuarios();
        } else {
            mostrarModal("erro", "Não foi possível excluir o usuário.");
        }
    } catch (err) {
        mostrarModal("erro", "Erro na conexão.");
    }
}

function mostrarModal(tipo, mensagem) {
    let modal = document.getElementById("modal");
    let texto = document.getElementById("modalTexto");
    let icon = document.getElementById("modalIcon");
    let box = modal.querySelector(".modal-box");

    texto.innerText = mensagem;
    box.classList.remove("sucesso", "erro");

    if (tipo === "sucesso") {
        icon.innerHTML = ''; icon.className = 'icon-svg icon-check';
        box.classList.add("sucesso");
        setTimeout(fecharModal, 2000);
    } else {
        icon.innerHTML = ''; icon.className = 'icon-svg icon-x';
        box.classList.add("erro");
    }
    modal.classList.add("show");
}

function fecharModal() {
    document.getElementById("modal").classList.remove("show");
}

// Iniciar
carregarUsuarios();
