const http = require('http');
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'jungle-secret-key-987654321';

// Funções auxiliares para Cookies e Autenticação
function parseCookies(req) {
    const list = {};
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return list;

    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        list[name] = decodeURIComponent(value);
    });
    return list;
}

function generateToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    try {
        const decodedBody = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        if (decodedBody.exp < Date.now()) {
            return null; // Expirado
        }
        return decodedBody;
    } catch (e) {
        return null;
    }
}

// Conexão com o banco de dados
const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'jungle_user',
    password: process.env.DB_PASSWORD || 'jungle_password',
    database: process.env.DB_NAME || 'jungle_cont',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 5
});

const server = http.createServer(async (req, res) => {
    // Adiciona cabeçalhos CORS (permite que o frontend se comunique com a API)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde ao preflight do navegador
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Extrair o path limpo da URL (ignorando query strings como ?t=123)
    const urlParsed = new URL(req.url, `http://${req.headers.host}`);
    const pathName = urlParsed.pathname;

    // Barreira de Autenticação para APIs sensíveis
    const isPublicApi = pathName === '/api/login' || pathName === '/api/health';
    if (pathName.startsWith('/api') && !isPublicApi) {
        const cookies = parseCookies(req);
        const token = cookies['jungle_session'];
        const sessionUser = verifyToken(token);
        if (!sessionUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Sessão expirada ou não autenticada' }));
            return;
        }
    }

    // Rota de teste
    if (pathName === '/api/health' && req.method === 'GET') {
        console.log("[API] GET /api/health iniciou");
        let conn;
        try {
            conn = await pool.getConnection();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log("[API] GET /api/health terminou");
            res.end(JSON.stringify({ status: 'API Node.js pura rodando e conectada ao banco MariaDB!' }));
        } catch (err) {
            console.error("[API] ERRO /api/health:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Erro ao conectar ao banco de dados', detalhe: err.message }));
        } finally {
            if (conn) conn.release();
        }
        return;
    }

    // Listar Usuários
    if (pathName === '/api/usuarios' && req.method === 'GET') {
        console.log("[API] GET /api/usuarios iniciou");
        try {
            const rows = await pool.query("SELECT id, login FROM usuarios");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log("[API] GET /api/usuarios terminou");
            res.end(JSON.stringify(rows));
        } catch (err) {
            console.error("[API] ERRO /api/usuarios:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Criar Usuário
    if (pathName === '/api/usuarios' && req.method === 'POST') {
        console.log("[API] POST /api/usuarios iniciou");
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { login, senha } = JSON.parse(body);
                const hash = await bcrypt.hash(senha, 10);
                await pool.query("INSERT INTO usuarios (login, senha) VALUES (?, ?)", [login, hash]);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                console.log("[API] POST /api/usuarios terminou");
                res.end(JSON.stringify({ mensagem: 'Usuário criado!' }));
            } catch (err) {
                console.error("[API] ERRO /api/usuarios:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Excluir Usuário
    if (pathName.startsWith('/api/usuarios') && req.method === 'DELETE') {
        console.log("[API] DELETE /api/usuarios iniciou");
        const id = urlParsed.searchParams.get('id');
        try {
            await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log("[API] DELETE /api/usuarios terminou");
            res.end(JSON.stringify({ mensagem: 'Usuário excluído!' }));
        } catch (err) {
            console.error("[API] ERRO /api/usuarios:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Listar Fatos
    if (pathName === '/api/fatos' && req.method === 'GET') {
        console.log("[API] GET /api/fatos iniciou");
        try {
            // JOIN para trazer o nome da conta
            const rows = await pool.query(`
                SELECT f.*, c.nome as nome_conta 
                FROM fatos f 
                LEFT JOIN contas c ON f.conta_id = c.id 
                ORDER BY f.data DESC
            `);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log("[API] GET /api/fatos terminou");
            res.end(JSON.stringify(rows));
        } catch (err) {
            console.error("[API] ERRO /api/fatos:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Criar Fato
    if (pathName === '/api/fatos' && req.method === 'POST') {
        console.log("[API] POST /api/fatos iniciou");
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { conta_id, tipo, historico, data, valor } = JSON.parse(body);
                await pool.query(
                    "INSERT INTO fatos (conta_id, tipo, descricao, data, valor) VALUES (?, ?, ?, ?, ?)", 
                    [conta_id, tipo, historico, data, valor]
                );
                res.writeHead(201, { 'Content-Type': 'application/json' });
                console.log("[API] POST /api/fatos terminou");
                res.end(JSON.stringify({ mensagem: 'Fato registrado!' }));
            } catch (err) {
                console.error("[API] ERRO /api/fatos:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Listar Contas
    if (pathName === '/api/contas' && req.method === 'GET') {
        console.log("[API] GET /api/contas iniciou");
        try {
            const rows = await pool.query("SELECT * FROM contas");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log("[API] GET /api/contas terminou");
            res.end(JSON.stringify(rows));
        } catch (err) {
            console.error("[API] ERRO /api/contas:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Criar Conta
    if (pathName === '/api/contas' && req.method === 'POST') {
        console.log("[API] POST /api/contas iniciou");
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { nome, tipo, codigo, saldo_inicial, descricao, cor } = JSON.parse(body);
                await pool.query(
                    "INSERT INTO contas (nome, tipo, codigo, saldo_inicial, descricao, cor) VALUES (?, ?, ?, ?, ?, ?)", 
                    [nome, tipo, codigo, saldo_inicial, descricao, cor]
                );
                res.writeHead(201, { 'Content-Type': 'application/json' });
                console.log("[API] POST /api/contas terminou");
                res.end(JSON.stringify({ mensagem: 'Conta cadastrada!' }));
            } catch (err) {
                console.error("[API] ERRO /api/contas:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Listar Funcionários
    if (pathName === '/api/funcionarios' && req.method === 'GET') {
        console.log("[API] GET /api/funcionarios iniciou");
        try {
            const rows = await pool.query("SELECT * FROM funcionarios");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log("[API] GET /api/funcionarios terminou");
            res.end(JSON.stringify(rows));
        } catch (err) {
            console.error("[API] ERRO /api/funcionarios:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Criar Funcionário
    if (pathName === '/api/funcionarios' && req.method === 'POST') {
        console.log("[API] POST /api/funcionarios iniciou");
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { nome, cpf, data, conta, salario } = JSON.parse(body);
                await pool.query("INSERT INTO funcionarios (nome, cpf, data_ingresso, conta, salario) VALUES (?, ?, ?, ?, ?)", [nome, cpf, data, conta, salario]);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                console.log("[API] POST /api/funcionarios terminou");
                res.end(JSON.stringify({ mensagem: 'Funcionário cadastrado!' }));
            } catch (err) {
                console.error("[API] ERRO /api/funcionarios:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Excluir Funcionário
    if (pathName.startsWith('/api/funcionarios/') && req.method === 'DELETE') {
        console.log("[API] DELETE /api/funcionarios iniciou");
        try {
            const id = pathName.split('/').pop();
            await pool.query("DELETE FROM funcionarios WHERE id = ?", [id]);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log("[API] DELETE /api/funcionarios terminou");
            res.end(JSON.stringify({ mensagem: 'Funcionário removido!' }));
        } catch (err) {
            console.error("[API] ERRO /api/funcionarios:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Editar Conta
    if (pathName.startsWith('/api/contas/') && req.method === 'PUT') {
        console.log("[API] PUT /api/contas iniciou");
        const id = pathName.split('/').pop();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { nome, tipo, codigo, saldo_inicial, descricao, cor } = JSON.parse(body);
                await pool.query(
                    "UPDATE contas SET nome=?, tipo=?, codigo=?, saldo_inicial=?, descricao=?, cor=? WHERE id=?", 
                    [nome, tipo, codigo, saldo_inicial, descricao, cor, id]
                );
                res.writeHead(200, { 'Content-Type': 'application/json' });
                console.log("[API] PUT /api/contas terminou");
                res.end(JSON.stringify({ mensagem: 'Conta atualizada!' }));
            } catch (err) {
                console.error("[API] ERRO /api/contas:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Excluir Conta
    if (pathName.startsWith('/api/contas/') && req.method === 'DELETE') {
        console.log("[API] DELETE /api/contas iniciou");
        try {
            const id = pathName.split('/').pop();
            await pool.query("DELETE FROM contas WHERE id = ?", [id]);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log("[API] DELETE /api/contas terminou");
            res.end(JSON.stringify({ mensagem: 'Conta removida!' }));
        } catch (err) {
            console.error("[API] ERRO /api/contas:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Erro ao excluir: " + err.message }));
        }
        return;
    }

    // Gravar Folha de Pagamento
    if (pathName === '/api/folhas' && req.method === 'POST') {
        console.log("[API] POST /api/folhas iniciou");
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            let conn;
            try {
                const { funcionario_id, nome, salario_base, proventos, descontos, liquido, conta_id } = JSON.parse(body);
                conn = await pool.getConnection();
                
                // 1. Gravar Fato Contábil (Saída) vinculado à conta escolhida
                const resFato = await conn.query(
                    "INSERT INTO fatos (conta_id, descricao, valor, tipo, data) VALUES (?, ?, ?, ?, ?)",
                    [conta_id, `Pagamento de Folha - ${nome}`, liquido, 'saida', new Date()]
                );
                const fato_id = Number(resFato.insertId);

                // 2. Gravar Histórico de Folha vinculado ao Fato e à Conta
                await conn.query(
                    "INSERT INTO folhas (funcionario_id, nome_funcionario, salario_base, total_proventos, total_descontos, valor_liquido, conta_id, fato_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [funcionario_id, nome, salario_base, proventos, descontos, liquido, conta_id, fato_id]
                );

                res.writeHead(201, { 'Content-Type': 'application/json' });
                console.log("[API] POST /api/folhas terminou");
                res.end(JSON.stringify({ mensagem: 'Folha gravada e integrada com sucesso!' }));
            } catch (err) {
                console.error("[API] ERRO /api/folhas:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            } finally {
                if (conn) conn.release();
            }
        });
        return;
    }

    // Rota de Login
    if (pathName === '/api/login' && req.method === 'POST') {
        console.log("[API] POST /api/login iniciou");
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { login, senha } = JSON.parse(body);

                const rows = await pool.query("SELECT * FROM usuarios WHERE login = ?", [login]);

                if (rows.length > 0) {
                    const usuario = rows[0];
                    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

                    if (senhaCorreta) {
                        const token = generateToken({ id: Number(usuario.id), login: usuario.login });
                        res.writeHead(200, { 
                            'Content-Type': 'application/json',
                            'Set-Cookie': `jungle_session=${token}; Path=/; SameSite=Lax; Max-Age=86400`
                        });
                        console.log("[API] POST /api/login terminou");
                        res.end(JSON.stringify({ mensagem: 'Login aprovado!' }));
                    } else {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Login ou senha incorretos' }));
                    }
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Login ou senha incorretos' }));
                }
            } catch (err) {
                console.error("[API] ERRO /api/login:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erro no servidor', detalhe: err.message }));
            }
        });
        return;
    }

    // Rota de Logout
    if (pathName === '/api/logout') {
        console.log("[API] GET /api/logout iniciou");
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': 'jungle_session=; Path=/; SameSite=Lax; Max-Age=0'
        });
        console.log("[API] GET /api/logout terminou");
        res.end(JSON.stringify({ mensagem: 'Logout realizado!' }));
        return;
    }
    // Entrega de arquivos estáticos do Frontend
    if (!req.url.startsWith('/api')) {
        let safeUrl = req.url.split('?')[0];
        if (safeUrl === '/') safeUrl = '/index.html';

        const extname = String(path.extname(safeUrl)).toLowerCase();

        // Se for uma página HTML, vamos verificar a autenticação
        if (extname === '.html' || safeUrl === '/index.html') {
            const cookies = parseCookies(req);
            const token = cookies['jungle_session'];
            const sessionUser = verifyToken(token);

            if (safeUrl === '/index.html') {
                // Se já estiver logado e acessar a página de login, redireciona para a home
                if (sessionUser) {
                    res.writeHead(302, { 'Location': '/home.html' });
                    res.end();
                    return;
                }
            } else {
                // Se for outra página HTML e não estiver logado, redireciona para o login
                if (!sessionUser) {
                    res.writeHead(302, { 'Location': '/index.html' });
                    res.end();
                    return;
                }
            }
        }
        
        // Remove a barra inicial do safeUrl para não confundir o path.join
        const relativePath = safeUrl.startsWith('/') ? safeUrl.slice(1) : safeUrl;
        const filePath = path.join('/frontend', relativePath);

        console.log(`[Static] Tentando entregar: ${filePath}`);
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                console.error(`[Static Error] Erro ao ler ${filePath}: ${error.code}`);
                if (error.code == 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(`<h1>404 Arquivo não encontrado</h1><p>Caminho tentado no servidor: ${filePath}</p>`);
                } else {
                    res.writeHead(500);
                    res.end('Erro interno do servidor: ' + error.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
        return;
    }

// Rota da API não encontrada
res.writeHead(404, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ error: 'Rota da API não encontrada' }));
});

const PORT = 3000;
server.listen(PORT, async () => {
    console.log(`Servidor raiz rodando na porta ${PORT}`);
    let conn;
    try {
        console.log("Tentando conectar ao banco de dados em:", process.env.DB_HOST || 'localhost');
        conn = await pool.getConnection();
        console.log("✅ Conexão com o Banco de Dados estabelecida com sucesso!");
    } catch (err) {
        console.error("❌ ERRO ao conectar no Banco de Dados:", err.message);
    } finally {
        if (conn) conn.release();
    }
});
