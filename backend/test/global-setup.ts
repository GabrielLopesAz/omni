import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export default async function setup() {
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    throw new Error('E2E suites must not run against production');
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'omni_test';

  if (!database.endsWith('test')) {
    throw new Error(`DB_NAME must be a test database. Got: ${database}`);
  }

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await connection.changeUser({ database });

  // Read the schema
  const schemaPath = path.resolve(__dirname, '../migrations/01-oauth-integracoes.sql');
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    try {
      const statements = sql.split(';').filter(s => s.trim().length > 0);
      for (const stmt of statements) {
         await connection.query(stmt);
      }
      console.log('✅ global-setup: Migrations aplicadas no banco de teste');
    } catch (e) {
      console.error('❌ global-setup: Erro ao rodar migration', e);
      throw e;
    }
  }

  await connection.end();
}
