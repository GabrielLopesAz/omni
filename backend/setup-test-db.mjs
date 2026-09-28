import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    multipleStatements: true
  });

  await connection.query('DROP DATABASE IF EXISTS omni_test');
  await connection.query('CREATE DATABASE omni_test');
  await connection.query('USE omni_test');

  const files = [
    '001_omni_schema.sql',
    '002_correcoes_schema.sql',
    '003_cleanup_triggers.sql'
  ];

  for (const file of files) {
    const filePath = path.join(__dirname, 'database', file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Applying ${file}...`);
    await connection.query(sql);
  }

  console.log('Done!');
  await connection.end();
}

run().catch(console.error);
