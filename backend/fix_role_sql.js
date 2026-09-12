import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'omni',
  });

  const [roles] = await connection.execute('SELECT id FROM roles WHERE nome = ?', ['ADMIN']);
  if (roles.length > 0) {
    const roleId = roles[0].id;
    await connection.execute('UPDATE usuarios SET id_role = ? WHERE email = ?', [roleId, 'admin@omni.com']);
    console.log('Update success!');
  } else {
    console.log('Role ADMIN not found');
  }

  await connection.end();
}

run().catch(console.error);
