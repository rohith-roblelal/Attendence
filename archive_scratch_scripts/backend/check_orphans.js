const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({ host: '127.0.0.1', user: 'root', password: 'password', database: 'school_management' });
  const [rows] = await pool.query(`
    SELECT u.id, u.username, r.name as role 
    FROM users u 
    JOIN roles r ON u.role_id = r.id 
    WHERE r.name IN ('TEACHER', 'HOD', 'TUTOR')
    AND u.id NOT IN (SELECT user_id FROM teachers WHERE user_id IS NOT NULL)
  `);
  console.log('Users with Teacher roles but NO teacher profile:', rows);
  pool.end();
}
check();
