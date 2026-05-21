// Interceptador global para capturar 401 Unauthorized de qualquer chamada de API
(function() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch(...args);
            if (response.status === 401) {
                window.location.href = '/index.html';
            }
            return response;
        } catch (error) {
            throw error;
        }
    };
})();

async function carregarSidebar() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;

    try {
        const response = await fetch('/sidebar.html');
        const html = await response.json(); 
    } catch (e) {}
}

// Versão autoinvocável que renderiza e gerencia a barra lateral:
(async function() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;

    try {
        const response = await fetch('/sidebar.html');
        const text = await response.text();
        container.innerHTML = text;

        // Marcar link ativo
        const path = window.location.pathname;
        const links = {
            '/home.html': 'link-home',
            '/cadastros.html': 'link-cadastros',
            '/fatos.html': 'link-fatos',
            '/diario.html': 'link-diario',
            '/razao.html': 'link-razao',
            '/balancete.html': 'link-balancete',
            '/folha.html': 'link-folha',
            '/usuarios.html': 'link-usuarios'
        };

        const activeId = links[path];
        if (activeId) {
            const el = document.getElementById(activeId);
            if (el) el.classList.add('active');
        }

        // Lógica de Clique no Logout
        const logoutBtn = container.querySelector('.logout-link');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await fetch('/api/logout', { method: 'POST' });
                } catch (err) {
                    console.error("Erro ao realizar logout:", err);
                }
                // Redireciona sempre para o login
                window.location.href = '/index.html';
            });
        }
    } catch (err) {
        console.error("Erro ao carregar sidebar:", err);
    }
})();
