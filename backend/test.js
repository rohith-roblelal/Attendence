const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'password',
    database: 'school_management'
  });
  
  const [users] = await pool.query('SELECT u.id, u.username, r.name as role FROM users u JOIN roles r ON u.role_id = r.id');
  console.log('USERS:', users);
  
  const [teachers] = await pool.query('SELECT * FROM teachers');
  console.log('TEACHERS:', teachers);
  
  pool.end();
}
test();
