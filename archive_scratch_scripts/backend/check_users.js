const mysql = require('mysql2/promise');
async function checkUsers() {
  const c = await mysql.createConnection({
    host: 'mysql-b47678e-rohithroblelal-ffc2.g.aivencloud.com',
    port: 26400,
    user: 'avnadmin',
    password: 'AVNS_ESGJKC7fGA2aDRffmp1',
    database: 'defaultdb'
  });
  
  try {
    const [users] = await c.query("SELECT id, username, role_id, is_active FROM users");
    console.log("Users in database:", users);
  } catch (err) {
    console.log("Error querying users:", err.message);
  }
  
  c.end();
}
checkUsers();
