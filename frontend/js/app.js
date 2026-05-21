async function logar(){

    var login = document.getElementById('login').value;
    var senha = document.getElementById('senha').value;

    if(!login || !senha) {
        mostrarModal("erro", "Preencha login e senha!");
        return;
    }

    try {
        let response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, senha })
        });

        let data = await response.json();

        if(response.ok){
            // No caso de sucesso, vamos direto para a home
            location.href = '/home.html';
        } else {
            mostrarModal("erro", data.error || "Usuário ou senha incorreta!");
        }
    } catch(err) {
        mostrarModal("erro", "Erro ao conectar com a API: " + err);
    }
}

/* MODAL */
function mostrarModal(tipo, mensagem){
    let modal = document.getElementById("modal");
    let texto = document.getElementById("modalTexto");
    let icon = document.getElementById("modalIcon");
    let box = modal.querySelector(".modal-box");

    texto.innerText = mensagem;
    box.classList.remove("sucesso", "erro");

    if(tipo === "sucesso"){
        icon.innerHTML = ''; icon.className = 'icon-svg icon-check';
        box.classList.add("sucesso");
    } else {
        icon.innerHTML = ''; icon.className = 'icon-svg icon-x';
        box.classList.add("erro");
    }

    modal.classList.add("show");
}

function fecharModal(){
    document.getElementById("modal").classList.remove("show");
}