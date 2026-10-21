const mysql = require('mysql2/promise');
const fs = require('fs');

async function dump() {
  const connection = await mysql.createConnection({
    host: 'mysql-b47678e-rohithroblelal-ffc2.g.aivencloud.com',
    port: 26400,
    user: 'avnadmin',
    password: 'AVNS_ESGJKC7fGA2aDRffmp1',
    database: 'defaultdb'
  });

  const [tables] = await connection.query('SHOW TABLES');
  const data = {};

  for (const row of tables) {
    const tableName = Object.values(row)[0];
    const [rows] = await connection.query(`SELECT * FROM ${tableName}`);
    data[tableName] = rows;
  }

  const outPath = '../frontend/lib/mockData.json';
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log('Data dumped to ' + outPath);
  await connection.end();
}

dump().catch(console.error);
