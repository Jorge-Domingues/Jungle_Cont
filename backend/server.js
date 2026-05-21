const http = require('http');
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'jungle-secret-key-987654321';

// ============================================================
// AUTENTICAÇÃO (JWT via Cookie)
// ============================================================
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
        if (decodedBody.exp < Date.now()) return null;
        return decodedBody;
    } catch (e) {
        return null;
    }
}

// ============================================================
// HELPERS
// ============================================================
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error('JSON inválido')); }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function getPathId(pathName, prefix) {
    // Ex: /api/contas/5 → 5
    const rest = pathName.slice(prefix.length);
    const id = parseInt(rest, 10);
    return isNaN(id) ? null : id;
}

// ============================================================
// CONEXÃO COM BANCO DE DADOS
// ============================================================
const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'jungle_user',
    password: process.env.DB_PASSWORD || 'jungle_password',
    database: process.env.DB_NAME || 'jungle_cont',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 5
});

async function garantirEstruturaContas() {
    let conn;
    try {
        conn = await pool.getConnection();
        const colunas = await conn.query("SHOW COLUMNS FROM contas");
        const existentes = new Set(colunas.map(c => c.Field));

        if (!existentes.has('natureza')) {
            await conn.query("ALTER TABLE contas ADD COLUMN natureza ENUM('Devedora','Credora') NOT NULL DEFAULT 'Devedora' AFTER tipo");
            await conn.query("UPDATE contas SET natureza = CASE WHEN tipo IN ('Ativo','Despesa') THEN 'Devedora' ELSE 'Credora' END");
        }

        if (!existentes.has('conta_pai_id')) {
            await conn.query("ALTER TABLE contas ADD COLUMN conta_pai_id INT DEFAULT NULL AFTER natureza");
        }

        if (!existentes.has('analitica')) {
            await conn.query("ALTER TABLE contas ADD COLUMN analitica BOOLEAN DEFAULT TRUE AFTER conta_pai_id");
        }

        if (!existentes.has('saldo_inicial')) {
            await conn.query("ALTER TABLE contas ADD COLUMN saldo_inicial DECIMAL(15,2) DEFAULT 0.00 AFTER analitica");
        }

        if (!existentes.has('descricao')) {
            await conn.query("ALTER TABLE contas ADD COLUMN descricao TEXT DEFAULT NULL AFTER saldo_inicial");
        }

        if (!existentes.has('cor')) {
            await conn.query("ALTER TABLE contas ADD COLUMN cor VARCHAR(7) DEFAULT NULL AFTER descricao");
        }

        if (!existentes.has('ativa')) {
            await conn.query("ALTER TABLE contas ADD COLUMN ativa BOOLEAN DEFAULT TRUE AFTER cor");
        }
    } finally {
        if (conn) conn.release();
    }
}

// ============================================================
// SERVIDOR HTTP
// ============================================================
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const urlParsed = new URL(req.url, `http://${req.headers.host}`);
    const pathName = urlParsed.pathname;

    // ========== BARREIRA DE AUTENTICAÇÃO ==========
    const isPublicApi = pathName === '/api/login' || pathName === '/api/health';
    if (pathName.startsWith('/api') && !isPublicApi) {
        const cookies = parseCookies(req);
        const token = cookies['jungle_session'];
        const sessionUser = verifyToken(token);
        if (!sessionUser) {
            sendJSON(res, 401, { error: 'Sessão expirada ou não autenticada' });
            return;
        }
    }

    try {
        // ========================================================
        // HEALTH CHECK
        // ========================================================
        if (pathName === '/api/health' && req.method === 'GET') {
            let conn;
            try {
                conn = await pool.getConnection();
                sendJSON(res, 200, { status: 'Jungle Cont v3.0 — Sistema Contábil Formal rodando!' });
            } catch (err) {
                sendJSON(res, 500, { error: 'Erro ao conectar ao banco', detalhe: err.message });
            } finally {
                if (conn) conn.release();
            }
            return;
        }

        // ========================================================
        // AUTENTICAÇÃO
        // ========================================================
        if (pathName === '/api/login' && req.method === 'POST') {
            const { login, senha } = await parseBody(req);
            const rows = await pool.query("SELECT * FROM usuarios WHERE login = ?", [login]);

            if (rows.length > 0) {
                const usuario = rows[0];
                // Suporta tanto bcrypt hash quanto texto puro (migração)
                let senhaCorreta = false;
                if (usuario.senha.startsWith('$2')) {
                    senhaCorreta = await bcrypt.compare(senha, usuario.senha);
                } else {
                    senhaCorreta = (senha === usuario.senha);
                    // Se bater em texto puro, re-hashar para bcrypt
                    if (senhaCorreta) {
                        const hash = await bcrypt.hash(senha, 10);
                        await pool.query("UPDATE usuarios SET senha = ? WHERE id = ?", [hash, usuario.id]);
                    }
                }

                if (senhaCorreta) {
                    const token = generateToken({ id: Number(usuario.id), login: usuario.login });
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Set-Cookie': `jungle_session=${token}; Path=/; SameSite=Lax; Max-Age=86400`
                    });
                    res.end(JSON.stringify({ mensagem: 'Login aprovado!' }));
                } else {
                    sendJSON(res, 401, { error: 'Login ou senha incorretos' });
                }
            } else {
                sendJSON(res, 401, { error: 'Login ou senha incorretos' });
            }
            return;
        }

        if (pathName === '/api/logout') {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Set-Cookie': 'jungle_session=; Path=/; SameSite=Lax; Max-Age=0'
            });
            res.end(JSON.stringify({ mensagem: 'Logout realizado!' }));
            return;
        }

        // ========================================================
        // USUÁRIOS
        // ========================================================
        if (pathName === '/api/usuarios' && req.method === 'GET') {
            const rows = await pool.query("SELECT id, login FROM usuarios");
            sendJSON(res, 200, rows);
            return;
        }

        if (pathName === '/api/usuarios' && req.method === 'POST') {
            const { login, senha } = await parseBody(req);
            const hash = await bcrypt.hash(senha, 10);
            await pool.query("INSERT INTO usuarios (login, senha) VALUES (?, ?)", [login, hash]);
            sendJSON(res, 201, { mensagem: 'Usuário criado!' });
            return;
        }

        if (pathName.startsWith('/api/usuarios') && req.method === 'DELETE') {
            const id = urlParsed.searchParams.get('id');
            await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
            sendJSON(res, 200, { mensagem: 'Usuário excluído!' });
            return;
        }

        // ========================================================
        // CONTAS (Plano de Contas Hierárquico)
        // ========================================================
        if (pathName === '/api/contas' && req.method === 'GET') {
            const rows = await pool.query(`
                SELECT c.*, cp.nome as conta_pai_nome, cp.codigo as conta_pai_codigo
                FROM contas c
                LEFT JOIN contas cp ON c.conta_pai_id = cp.id
                ORDER BY c.codigo ASC
            `);
            sendJSON(res, 200, rows);
            return;
        }

        if (pathName === '/api/contas' && req.method === 'POST') {
            try {
                const { codigo, nome, tipo, natureza, conta_pai_id, analitica, saldo_inicial, descricao, cor } = await parseBody(req);

                if (!codigo || !nome || !tipo || !natureza) {
                    sendJSON(res, 400, { error: 'Código, nome, tipo e natureza são obrigatórios' });
                    return;
                }

                await pool.query(
                    `INSERT INTO contas (codigo, nome, tipo, natureza, conta_pai_id, analitica, saldo_inicial, descricao, cor)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [codigo, nome, tipo, natureza, conta_pai_id || null, analitica !== false, saldo_inicial || 0, descricao || null, cor || null]
                );
                sendJSON(res, 201, { mensagem: 'Conta cadastrada!' });
                return;
            } catch (err) {
                console.error('Erro ao cadastrar conta:', err);
                if (err.sqlState === '23000') {
                    sendJSON(res, 409, { error: 'Já existe uma conta com este código.' });
                } else {
                    sendJSON(res, 500, { error: 'Erro interno ao cadastrar conta.' });
                }
                return;
            }
        }

        if (pathName.startsWith('/api/contas/') && req.method === 'PUT') {
            const id = getPathId(pathName, '/api/contas/');
            if (!id) { sendJSON(res, 400, { error: 'ID inválido' }); return; }

            const { codigo, nome, tipo, natureza, conta_pai_id, analitica, saldo_inicial, descricao, cor } = await parseBody(req);
            await pool.query(
                `UPDATE contas SET codigo=?, nome=?, tipo=?, natureza=?, conta_pai_id=?, analitica=?, saldo_inicial=?, descricao=?, cor=? WHERE id=?`,
                [codigo, nome, tipo, natureza, conta_pai_id || null, analitica !== false, saldo_inicial || 0, descricao || null, cor || null, id]
            );
            sendJSON(res, 200, { mensagem: 'Conta atualizada!' });
            return;
        }

        if (pathName.startsWith('/api/contas/') && req.method === 'DELETE') {
            const id = getPathId(pathName, '/api/contas/');
            if (!id) { sendJSON(res, 400, { error: 'ID inválido' }); return; }

            // Verificar se há partidas vinculadas
            const partidas = await pool.query("SELECT COUNT(*) as total FROM partidas WHERE conta_id = ?", [id]);
            if (partidas[0].total > 0) {
                sendJSON(res, 400, { error: 'Não é possível excluir conta com lançamentos vinculados' });
                return;
            }
            // Verificar se há contas filhas
            const filhas = await pool.query("SELECT COUNT(*) as total FROM contas WHERE conta_pai_id = ?", [id]);
            if (filhas[0].total > 0) {
                sendJSON(res, 400, { error: 'Não é possível excluir conta que possui sub-contas' });
                return;
            }

            await pool.query("DELETE FROM contas WHERE id = ?", [id]);
            sendJSON(res, 200, { mensagem: 'Conta removida!' });
            return;
        }

        // ========================================================
        // LANÇAMENTOS CONTÁBEIS (Partidas Dobradas)
        // ========================================================
        if (pathName === '/api/lancamentos' && req.method === 'GET') {
            const inicio = urlParsed.searchParams.get('inicio');
            const fim = urlParsed.searchParams.get('fim');

            let query = `
                SELECT l.*, 
                       u.login as usuario_login
                FROM lancamentos l
                LEFT JOIN usuarios u ON l.usuario_id = u.id
            `;
            const params = [];

            if (inicio && fim) {
                query += ` WHERE l.data BETWEEN ? AND ?`;
                params.push(inicio, fim);
            } else if (inicio) {
                query += ` WHERE l.data >= ?`;
                params.push(inicio);
            } else if (fim) {
                query += ` WHERE l.data <= ?`;
                params.push(fim);
            }

            query += ` ORDER BY l.data DESC, l.id DESC`;
            const lancamentos = await pool.query(query, params);

            // Para cada lançamento, buscar suas partidas
            for (let lanc of lancamentos) {
                const partidas = await pool.query(`
                    SELECT p.*, c.nome as conta_nome, c.codigo as conta_codigo, c.tipo as conta_tipo
                    FROM partidas p
                    JOIN contas c ON p.conta_id = c.id
                    WHERE p.lancamento_id = ?
                    ORDER BY p.tipo ASC, p.id ASC
                `, [lanc.id]);
                lanc.partidas = partidas;
            }

            sendJSON(res, 200, lancamentos);
            return;
        }

        if (pathName === '/api/lancamentos' && req.method === 'POST') {
            const { data, descricao, partidas, origem, origem_id } = await parseBody(req);

            // Validações
            if (!data || !descricao) {
                sendJSON(res, 400, { error: 'Data e descrição são obrigatórios' });
                return;
            }
            if (!partidas || !Array.isArray(partidas) || partidas.length < 2) {
                sendJSON(res, 400, { error: 'Um lançamento precisa ter pelo menos 2 partidas (1 débito + 1 crédito)' });
                return;
            }

            // Validar equilíbrio: Σ Débitos = Σ Créditos
            let totalDebitos = 0;
            let totalCreditos = 0;
            for (const p of partidas) {
                if (!p.conta_id || !p.tipo || !p.valor || p.valor <= 0) {
                    sendJSON(res, 400, { error: 'Cada partida deve ter conta_id, tipo (D/C) e valor positivo' });
                    return;
                }
                if (p.tipo === 'D') totalDebitos += parseFloat(p.valor);
                else if (p.tipo === 'C') totalCreditos += parseFloat(p.valor);
                else {
                    sendJSON(res, 400, { error: `Tipo de partida inválido: "${p.tipo}". Use "D" ou "C"` });
                    return;
                }
            }

            // Comparar com tolerância de centavos (ponto flutuante)
            if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
                sendJSON(res, 400, {
                    error: `Lançamento desequilibrado! Débitos: R$ ${totalDebitos.toFixed(2)}, Créditos: R$ ${totalCreditos.toFixed(2)}`
                });
                return;
            }

            // Verificar se todas as contas são analíticas
            for (const p of partidas) {
                const conta = await pool.query("SELECT analitica, ativa FROM contas WHERE id = ?", [p.conta_id]);
                if (conta.length === 0) {
                    sendJSON(res, 400, { error: `Conta ID ${p.conta_id} não encontrada` });
                    return;
                }
                if (!conta[0].analitica) {
                    sendJSON(res, 400, { error: `Não é possível lançar em conta sintética (ID ${p.conta_id}). Use uma conta analítica.` });
                    return;
                }
                if (!conta[0].ativa) {
                    sendJSON(res, 400, { error: `Conta ID ${p.conta_id} está inativa` });
                    return;
                }
            }

            // Gravar em transação
            let conn;
            try {
                conn = await pool.getConnection();
                await conn.beginTransaction();

                // Obter usuario_id do token
                const cookies = parseCookies(req);
                const token = cookies['jungle_session'];
                const sessionUser = verifyToken(token);
                const userId = sessionUser ? sessionUser.id : null;

                const resLanc = await conn.query(
                    `INSERT INTO lancamentos (data, descricao, origem, origem_id, usuario_id)
                     VALUES (?, ?, ?, ?, ?)`,
                    [data, descricao, origem || 'manual', origem_id || null, userId]
                );
                const lancamentoId = Number(resLanc.insertId);

                for (const p of partidas) {
                    await conn.query(
                        `INSERT INTO partidas (lancamento_id, conta_id, tipo, valor)
                         VALUES (?, ?, ?, ?)`,
                        [lancamentoId, p.conta_id, p.tipo, parseFloat(p.valor)]
                    );
                }

                await conn.commit();
                sendJSON(res, 201, { mensagem: 'Lançamento registrado!', lancamento_id: lancamentoId });
            } catch (err) {
                if (conn) await conn.rollback();
                throw err;
            } finally {
                if (conn) conn.release();
            }
            return;
        }

        if (pathName.startsWith('/api/lancamentos/') && req.method === 'GET') {
            const id = getPathId(pathName, '/api/lancamentos/');
            if (!id) { sendJSON(res, 400, { error: 'ID inválido' }); return; }

            const lancamentos = await pool.query(`
                SELECT l.*, u.login as usuario_login
                FROM lancamentos l
                LEFT JOIN usuarios u ON l.usuario_id = u.id
                WHERE l.id = ?
            `, [id]);

            if (lancamentos.length === 0) {
                sendJSON(res, 404, { error: 'Lançamento não encontrado' });
                return;
            }

            const lanc = lancamentos[0];
            lanc.partidas = await pool.query(`
                SELECT p.*, c.nome as conta_nome, c.codigo as conta_codigo
                FROM partidas p
                JOIN contas c ON p.conta_id = c.id
                WHERE p.lancamento_id = ?
                ORDER BY p.tipo ASC, p.id ASC
            `, [id]);

            sendJSON(res, 200, lanc);
            return;
        }

        if (pathName.startsWith('/api/lancamentos/') && req.method === 'DELETE') {
            const id = getPathId(pathName, '/api/lancamentos/');
            if (!id) { sendJSON(res, 400, { error: 'ID inválido' }); return; }

            await pool.query("DELETE FROM lancamentos WHERE id = ?", [id]);
            sendJSON(res, 200, { mensagem: 'Lançamento excluído!' });
            return;
        }

        // ========================================================
        // RELATÓRIOS CONTÁBEIS
        // ========================================================

        // --- RAZÃO DE UMA CONTA ---
        if (pathName.startsWith('/api/relatorios/razao/') && req.method === 'GET') {
            const contaId = getPathId(pathName, '/api/relatorios/razao/');
            if (!contaId) { sendJSON(res, 400, { error: 'ID de conta inválido' }); return; }

            const inicio = urlParsed.searchParams.get('inicio');
            const fim = urlParsed.searchParams.get('fim');

            // Buscar dados da conta
            const contaRows = await pool.query("SELECT * FROM contas WHERE id = ?", [contaId]);
            if (contaRows.length === 0) {
                sendJSON(res, 404, { error: 'Conta não encontrada' });
                return;
            }
            const conta = contaRows[0];

            // Buscar partidas da conta com dados do lançamento
            let query = `
                SELECT p.id, p.conta_id, p.tipo, p.valor, p.lancamento_id, 
                       l.data, l.descricao as historico
                FROM partidas p
                JOIN lancamentos l ON p.lancamento_id = l.id
                WHERE p.conta_id = ?
            `;
            const params = [contaId];

            if (inicio && fim) {
                query += ` AND l.data BETWEEN ? AND ?`;
                params.push(inicio, fim);
            } else if (inicio) {
                query += ` AND l.data >= ?`;
                params.push(inicio);
            } else if (fim) {
                query += ` AND l.data <= ?`;
                params.push(fim);
            }

            query += ` ORDER BY l.data ASC, l.id ASC`;
            const movimentos = await pool.query(query, params);

            sendJSON(res, 200, { conta, movimentos });
            return;
        }

        // --- BALANCETE DE VERIFICAÇÃO ---
        if (pathName === '/api/relatorios/balancete' && req.method === 'GET') {
            const inicio = urlParsed.searchParams.get('inicio');
            const fim = urlParsed.searchParams.get('fim');

            // Buscar todas as contas analíticas
            const contas = await pool.query(`
                SELECT * FROM contas WHERE analitica = TRUE AND ativa = TRUE ORDER BY codigo ASC
            `);

            const resultado = [];
            let totalDebitos = 0;
            let totalCreditos = 0;
            let totalSaldoDevedor = 0;
            let totalSaldoCredor = 0;

            for (const conta of contas) {
                let queryPartidas = `
                    SELECT p.tipo, SUM(p.valor) as total
                    FROM partidas p
                    JOIN lancamentos l ON p.lancamento_id = l.id
                    WHERE p.conta_id = ?
                `;
                const params = [conta.id];

                if (inicio && fim) {
                    queryPartidas += ` AND l.data BETWEEN ? AND ?`;
                    params.push(inicio, fim);
                } else if (inicio) {
                    queryPartidas += ` AND l.data >= ?`;
                    params.push(inicio);
                } else if (fim) {
                    queryPartidas += ` AND l.data <= ?`;
                    params.push(fim);
                }

                queryPartidas += ` GROUP BY p.tipo`;
                const somas = await pool.query(queryPartidas, params);

                let debitos = 0;
                let creditos = 0;
                somas.forEach(s => {
                    if (s.tipo === 'D') debitos = parseFloat(s.total);
                    if (s.tipo === 'C') creditos = parseFloat(s.total);
                });

                const saldoInicial = parseFloat(conta.saldo_inicial) || 0;

                // Saldo conforme a natureza da conta
                let saldo;
                if (conta.natureza === 'Devedora') {
                    saldo = saldoInicial + debitos - creditos;
                } else {
                    saldo = saldoInicial + creditos - debitos;
                }

                totalDebitos += debitos;
                totalCreditos += creditos;

                if (saldo >= 0 && conta.natureza === 'Devedora') totalSaldoDevedor += saldo;
                else if (saldo >= 0 && conta.natureza === 'Credora') totalSaldoCredor += saldo;
                else if (saldo < 0 && conta.natureza === 'Devedora') totalSaldoCredor += Math.abs(saldo);
                else if (saldo < 0 && conta.natureza === 'Credora') totalSaldoDevedor += Math.abs(saldo);

                resultado.push({
                    id: conta.id,
                    codigo: conta.codigo,
                    nome: conta.nome,
                    tipo: conta.tipo,
                    natureza: conta.natureza,
                    saldo_inicial: saldoInicial,
                    debitos,
                    creditos,
                    saldo
                });
            }

            sendJSON(res, 200, {
                contas: resultado,
                totais: {
                    debitos: totalDebitos,
                    creditos: totalCreditos,
                    saldo_devedor: totalSaldoDevedor,
                    saldo_credor: totalSaldoCredor,
                    equilibrado: Math.abs(totalSaldoDevedor - totalSaldoCredor) < 0.01
                }
            });
            return;
        }

        // --- DRE (Demonstração do Resultado do Exercício) ---
        if (pathName === '/api/relatorios/dre' && req.method === 'GET') {
            const inicio = urlParsed.searchParams.get('inicio');
            const fim = urlParsed.searchParams.get('fim');

            // Buscar receitas (grupo 4) e despesas (grupo 5)
            const contas = await pool.query(`
                SELECT * FROM contas
                WHERE analitica = TRUE AND ativa = TRUE AND tipo IN ('Receita', 'Despesa')
                ORDER BY codigo ASC
            `);

            const itens = [];
            let totalReceitas = 0;
            let totalDespesas = 0;

            for (const conta of contas) {
                let query = `
                    SELECT p.tipo, SUM(p.valor) as total
                    FROM partidas p
                    JOIN lancamentos l ON p.lancamento_id = l.id
                    WHERE p.conta_id = ?
                `;
                const params = [conta.id];

                if (inicio && fim) {
                    query += ` AND l.data BETWEEN ? AND ?`;
                    params.push(inicio, fim);
                } else if (inicio) {
                    query += ` AND l.data >= ?`;
                    params.push(inicio);
                } else if (fim) {
                    query += ` AND l.data <= ?`;
                    params.push(fim);
                }

                query += ` GROUP BY p.tipo`;
                const somas = await pool.query(query, params);

                let debitos = 0;
                let creditos = 0;
                somas.forEach(s => {
                    if (s.tipo === 'D') debitos = parseFloat(s.total);
                    if (s.tipo === 'C') creditos = parseFloat(s.total);
                });

                // Receitas: natureza Credora → saldo = créditos - débitos
                // Despesas: natureza Devedora → saldo = débitos - créditos
                let saldo;
                if (conta.tipo === 'Receita') {
                    saldo = creditos - debitos;
                    totalReceitas += saldo;
                } else {
                    saldo = debitos - creditos;
                    totalDespesas += saldo;
                }

                if (saldo !== 0) {
                    itens.push({
                        codigo: conta.codigo,
                        nome: conta.nome,
                        tipo: conta.tipo,
                        saldo
                    });
                }
            }

            sendJSON(res, 200, {
                itens,
                totalReceitas,
                totalDespesas,
                resultado: totalReceitas - totalDespesas
            });
            return;
        }

        // --- BALANÇO PATRIMONIAL ---
        if (pathName === '/api/relatorios/balanco' && req.method === 'GET') {
            const dataRef = urlParsed.searchParams.get('data');

            const contas = await pool.query(`
                SELECT * FROM contas
                WHERE analitica = TRUE AND ativa = TRUE AND tipo IN ('Ativo', 'Passivo', 'Patrimônio Líquido')
                ORDER BY codigo ASC
            `);

            const ativos = [];
            const passivos = [];
            const pl = [];
            let totalAtivo = 0;
            let totalPassivo = 0;
            let totalPL = 0;

            for (const conta of contas) {
                let query = `
                    SELECT p.tipo, SUM(p.valor) as total
                    FROM partidas p
                    JOIN lancamentos l ON p.lancamento_id = l.id
                    WHERE p.conta_id = ?
                `;
                const params = [conta.id];

                if (dataRef) {
                    query += ` AND l.data <= ?`;
                    params.push(dataRef);
                }

                query += ` GROUP BY p.tipo`;
                const somas = await pool.query(query, params);

                let debitos = 0;
                let creditos = 0;
                somas.forEach(s => {
                    if (s.tipo === 'D') debitos = parseFloat(s.total);
                    if (s.tipo === 'C') creditos = parseFloat(s.total);
                });

                const saldoInicial = parseFloat(conta.saldo_inicial) || 0;
                let saldo;

                if (conta.natureza === 'Devedora') {
                    saldo = saldoInicial + debitos - creditos;
                } else {
                    saldo = saldoInicial + creditos - debitos;
                }

                const item = { codigo: conta.codigo, nome: conta.nome, saldo };

                if (conta.tipo === 'Ativo') {
                    ativos.push(item);
                    totalAtivo += saldo;
                } else if (conta.tipo === 'Passivo') {
                    passivos.push(item);
                    totalPassivo += saldo;
                } else {
                    pl.push(item);
                    totalPL += saldo;
                }
            }

            // Incluir resultado do exercício no PL
            // Buscar receitas - despesas
            const contasResultado = await pool.query(`
                SELECT * FROM contas
                WHERE analitica = TRUE AND ativa = TRUE AND tipo IN ('Receita', 'Despesa')
            `);

            let totalReceitas = 0;
            let totalDespesas = 0;

            for (const conta of contasResultado) {
                let query = `
                    SELECT p.tipo, SUM(p.valor) as total
                    FROM partidas p
                    JOIN lancamentos l ON p.lancamento_id = l.id
                    WHERE p.conta_id = ?
                `;
                const params = [conta.id];
                if (dataRef) {
                    query += ` AND l.data <= ?`;
                    params.push(dataRef);
                }
                query += ` GROUP BY p.tipo`;
                const somas = await pool.query(query, params);

                let debitos = 0;
                let creditos = 0;
                somas.forEach(s => {
                    if (s.tipo === 'D') debitos = parseFloat(s.total);
                    if (s.tipo === 'C') creditos = parseFloat(s.total);
                });

                if (conta.tipo === 'Receita') totalReceitas += (creditos - debitos);
                else totalDespesas += (debitos - creditos);
            }

            const resultadoExercicio = totalReceitas - totalDespesas;
            totalPL += resultadoExercicio;

            sendJSON(res, 200, {
                ativos, passivos, pl,
                totalAtivo,
                totalPassivo,
                totalPL,
                resultadoExercicio,
                equilibrado: Math.abs(totalAtivo - (totalPassivo + totalPL)) < 0.01
            });
            return;
        }

        // ========================================================
        // FUNCIONÁRIOS
        // ========================================================
        if (pathName === '/api/funcionarios' && req.method === 'GET') {
            const rows = await pool.query("SELECT * FROM funcionarios");
            sendJSON(res, 200, rows);
            return;
        }

        if (pathName === '/api/funcionarios' && req.method === 'POST') {
            const { nome, cpf, data, conta, salario } = await parseBody(req);
            await pool.query(
                "INSERT INTO funcionarios (nome, cpf, data_ingresso, conta, salario) VALUES (?, ?, ?, ?, ?)",
                [nome, cpf, data, conta, salario]
            );
            sendJSON(res, 201, { mensagem: 'Funcionário cadastrado!' });
            return;
        }

        if (pathName.startsWith('/api/funcionarios/') && req.method === 'DELETE') {
            const id = getPathId(pathName, '/api/funcionarios/');
            if (!id) { sendJSON(res, 400, { error: 'ID inválido' }); return; }
            await pool.query("DELETE FROM funcionarios WHERE id = ?", [id]);
            sendJSON(res, 200, { mensagem: 'Funcionário removido!' });
            return;
        }

        // ========================================================
        // FOLHA DE PAGAMENTO (Gera Múltiplos Lançamentos)
        // ========================================================
        if (pathName === '/api/folhas' && req.method === 'POST') {
            const { funcionario_id, nome, salario_base, proventos, descontos, liquido, inss, fgts, conta_pagamento_id } = await parseBody(req);

            let conn;
            try {
                conn = await pool.getConnection();
                await conn.beginTransaction();

                const cookies = parseCookies(req);
                const token = cookies['jungle_session'];
                const sessionUser = verifyToken(token);
                const userId = sessionUser ? sessionUser.id : null;

                // Buscar IDs das contas contábeis padrão pelo código
                async function getContaId(codigo) {
                    const rows = await conn.query("SELECT id FROM contas WHERE codigo = ?", [codigo]);
                    return rows.length > 0 ? rows[0].id : null;
                }

                const contaDespPessoal = await getContaId('5.1.01');    // Despesas com Pessoal
                const contaSalariosAPagar = await getContaId('2.1.02'); // Salários a Pagar
                const contaEncINSS = await getContaId('5.1.02');       // Encargos Sociais (INSS)
                const contaINSSRecolher = await getContaId('2.1.03');   // INSS a Recolher
                const contaEncFGTS = await getContaId('5.1.03');       // Encargos Sociais (FGTS)
                const contaFGTSRecolher = await getContaId('2.1.04');  // FGTS a Recolher
                const contaBanco = conta_pagamento_id || await getContaId('1.1.02'); // Banco

                const dataHoje = new Date().toISOString().split('T')[0];

                // Lançamento 1: Reconhecimento da Despesa de Salário
                const resLanc1 = await conn.query(
                    `INSERT INTO lancamentos (data, descricao, origem, origem_id, usuario_id)
                     VALUES (?, ?, 'folha', NULL, ?)`,
                    [dataHoje, `Reconhecimento folha - ${nome}`, userId]
                );
                const lanc1Id = Number(resLanc1.insertId);

                if (contaDespPessoal && contaSalariosAPagar) {
                    await conn.query("INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (?, ?, 'D', ?)", [lanc1Id, contaDespPessoal, proventos]);
                    await conn.query("INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (?, ?, 'C', ?)", [lanc1Id, contaSalariosAPagar, proventos]);
                }

                // Lançamento 2: Encargos (INSS + FGTS)
                const inssVal = parseFloat(inss) || 0;
                const fgtsVal = parseFloat(fgts) || 0;

                if (inssVal > 0 || fgtsVal > 0) {
                    const resLanc2 = await conn.query(
                        `INSERT INTO lancamentos (data, descricao, origem, origem_id, usuario_id)
                         VALUES (?, ?, 'folha', NULL, ?)`,
                        [dataHoje, `Encargos sociais - ${nome}`, userId]
                    );
                    const lanc2Id = Number(resLanc2.insertId);

                    if (inssVal > 0 && contaEncINSS && contaINSSRecolher) {
                        await conn.query("INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (?, ?, 'D', ?)", [lanc2Id, contaEncINSS, inssVal]);
                        await conn.query("INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (?, ?, 'C', ?)", [lanc2Id, contaINSSRecolher, inssVal]);
                    }
                    if (fgtsVal > 0 && contaEncFGTS && contaFGTSRecolher) {
                        await conn.query("INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (?, ?, 'D', ?)", [lanc2Id, contaEncFGTS, fgtsVal]);
                        await conn.query("INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (?, ?, 'C', ?)", [lanc2Id, contaFGTSRecolher, fgtsVal]);
                    }
                }

                // Lançamento 3: Pagamento (saída do Banco)
                const resLanc3 = await conn.query(
                    `INSERT INTO lancamentos (data, descricao, origem, origem_id, usuario_id)
                     VALUES (?, ?, 'folha', NULL, ?)`,
                    [dataHoje, `Pagamento de folha - ${nome}`, userId]
                );
                const lanc3Id = Number(resLanc3.insertId);

                if (contaSalariosAPagar && contaBanco) {
                    await conn.query("INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (?, ?, 'D', ?)", [lanc3Id, contaSalariosAPagar, liquido]);
                    await conn.query("INSERT INTO partidas (lancamento_id, conta_id, tipo, valor) VALUES (?, ?, 'C', ?)", [lanc3Id, contaBanco, liquido]);
                }

                // Gravar histórico da folha
                await conn.query(
                    `INSERT INTO folhas (funcionario_id, nome_funcionario, salario_base, total_proventos, total_descontos, valor_liquido, lancamento_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [funcionario_id, nome, salario_base, proventos, descontos, liquido, lanc1Id]
                );

                await conn.commit();
                sendJSON(res, 201, { mensagem: 'Folha gravada com lançamentos contábeis!' });
            } catch (err) {
                if (conn) await conn.rollback();
                console.error("[API] ERRO /api/folhas:", err);
                sendJSON(res, 500, { error: err.message });
            } finally {
                if (conn) conn.release();
            }
            return;
        }

        // ========================================================
        // ARQUIVOS ESTÁTICOS (Frontend)
        // ========================================================
        if (!pathName.startsWith('/api')) {
            let safeUrl = pathName;
            if (safeUrl === '/') safeUrl = '/index.html';

            const extname = String(path.extname(safeUrl)).toLowerCase();

            // Autenticação para páginas HTML
            if (extname === '.html' || safeUrl === '/index.html') {
                const cookies = parseCookies(req);
                const token = cookies['jungle_session'];
                const sessionUser = verifyToken(token);

                if (safeUrl === '/index.html') {
                    if (sessionUser) {
                        res.writeHead(302, { 'Location': '/home.html' });
                        res.end();
                        return;
                    }
                } else {
                    if (!sessionUser) {
                        res.writeHead(302, { 'Location': '/index.html' });
                        res.end();
                        return;
                    }
                }
            }

            const relativePath = safeUrl.startsWith('/') ? safeUrl.slice(1) : safeUrl;
            const filePath = path.join('/frontend', relativePath);

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
                    if (error.code === 'ENOENT') {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(`<h1>404 Arquivo não encontrado</h1><p>${filePath}</p>`);
                    } else {
                        res.writeHead(500);
                        res.end('Erro interno: ' + error.code);
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
            return;
        }

        // Rota não encontrada
        sendJSON(res, 404, { error: 'Rota da API não encontrada' });

    } catch (err) {
        console.error("[API] ERRO:", err);
        sendJSON(res, 500, { error: err.message });
    }
});

const PORT = 3000;
server.listen(PORT, async () => {
    console.log(`🌿 Jungle Cont v3.0 rodando na porta ${PORT}`);
    let conn;
    try {
        conn = await pool.getConnection();
        console.log("✅ Conexão com o Banco de Dados estabelecida!");
        await garantirEstruturaContas();
        console.log("✅ Estrutura da tabela contas verificada!");
    } catch (err) {
        console.error("❌ ERRO ao conectar no Banco:", err.message);
    } finally {
        if (conn) conn.release();
    }
});
