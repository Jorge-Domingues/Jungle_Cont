const mariadb = require('mariadb');

async function testarConexao() {
    const pool = mariadb.createPool({
        host: 'localhost',
        user: 'jungle_user',
        password: 'jungle_password',
        database: 'mysql',
        port: 3306,
        connectionLimit: 1
    });

    try {
        const conn = await pool.getConnection();
        console.log('✅ Conexão bem-sucedida!');
        
        const result = await conn.query('SELECT VERSION() as version');
        console.log('Versão do MariaDB:', result[0].version);
        
        conn.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro de conexão:', err.message);
        console.error('Detalhes:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testarConexao();
