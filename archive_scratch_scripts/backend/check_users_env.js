const mysql = require('mysql2/promise');
async function checkUsers() {
  const c = await mysql.createConnection({
    host: 'mysql-1a2de5c8-rohithroblelal-ffc2.h.aivencloud.com',
    port: 26400,
    user: 'avnadmin',
    password: 'AVNS_EhI6r93TjSbXgWMmF0N',
    database: 'college_attendance'
  });
  
  try {
    const [users] = await c.query("SELECT id, username, role_id, is_active FROM users");
    console.log("Users in college_attendance database:", users);
  } catch (err) {
    console.log("Error querying users:", err.message);
  }
  
  c.end();
}
checkUsers();
