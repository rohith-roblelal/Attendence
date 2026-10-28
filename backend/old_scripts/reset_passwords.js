const mysql = require('mysql2/promise');
const argon2 = require('argon2');
require('dotenv').config();

async function reset() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_attendance'
  });

  const newPassword = 'password123';
  const newHash = await argon2.hash(newPassword);

  await conn.query('UPDATE users SET password_hash = ? WHERE username != ?', [newHash, 'admin']);
  
  const [users] = await conn.query('SELECT u.username, r.name as role FROM users u JOIN roles r ON u.role_id = r.id');
  
  const grouped = {};
  for (const u of users) {
    if (!grouped[u.role]) grouped[u.role] = [];
    grouped[u.role].push(u.username);
  }
  
  for (const [role, list] of Object.entries(grouped)) {
    console.log(`\n=== ${role} ===`);
    for (const user of list.slice(0, 5)) {
      console.log(`Username: ${user} | Password: ${role === 'ADMINISTRATION' ? 'admin123' : newPassword}`);
    }
    if (list.length > 5) {
      console.log(`... and ${list.length - 5} more.`);
    }
  }

  await conn.end();
}

reset().catch(console.error);
