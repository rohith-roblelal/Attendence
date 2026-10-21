const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'mysql-b47678e-rohithroblelal-ffc2.g.aivencloud.com',
    port: 26400,
    user: 'avnadmin',
    password: 'AVNS_ESGJKC7fGA2aDRffmp1',
    database: 'defaultdb'
  });

  const [rows] = await connection.query('SELECT * FROM roles');
  console.log(rows);
  await connection.end();
}

run().catch(console.error);
