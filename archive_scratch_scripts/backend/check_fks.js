const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({
    host: 'mysql-b47678e-rohithroblelal-ffc2.g.aivencloud.com',
    port: 26400,
    user: 'avnadmin',
    password: 'AVNS_ESGJKC7fGA2aDRffmp1',
    database: 'defaultdb'
  });
  const [rows] = await c.query("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA = 'defaultdb' AND REFERENCED_TABLE_NAME = 'subjects'");
  console.log(JSON.stringify(rows, null, 2));
  c.end();
}
run().catch(console.error);
