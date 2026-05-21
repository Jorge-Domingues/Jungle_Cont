const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');

const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'jungle_user',
    password: process.env.DB_PASSWORD || 'jungle_password',
    database: 'mysql',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 1
});

async function executarMigracao() {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Ler arquivo SQL
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Dividir por ; e executar cada comando
        const comandos = sql.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
        
        console.log(`\n🚀 Executando ${comandos.length} comandos SQL...\n`);
        
        for (let i = 0; i < comandos.length; i++) {
            const cmd = comandos[i];
            try {
                await conn.query(cmd);
                console.log(`✅ Comando ${i + 1}/${comandos.length} executado com sucesso`);
            } catch (err) {
                console.error(`❌ Erro no comando ${i + 1}:`, err.message);
                console.error(`   SQL: ${cmd.substring(0, 100)}...`);
            }
        }
        
        console.log(`\n✅ Migração concluída!\n`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro fatal:', err.message);
        process.exit(1);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

executarMigracao();
