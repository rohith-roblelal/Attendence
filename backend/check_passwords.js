const mysql = require('mysql2/promise');
const argon2 = require('argon2');
require('dotenv').config();

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_attendance'
  });

  const [users] = await conn.query('SELECT u.username, u.password_hash, r.name as role FROM users u JOIN roles r ON u.role_id = r.id');
  
  const commonPasswords = ['admin123', 'password123', 'password', '123456', 'student', 'teacher', 'hod'];
  
  for (const user of users) {
    let found = false;
    // Check if password matches username
    if (await argon2.verify(user.password_hash, user.username)) {
      console.log(`User ${user.username} (${user.role}): ${user.username}`);
      found = true;
      continue;
    }
    // Check common passwords
    for (const pwd of commonPasswords) {
      if (await argon2.verify(user.password_hash, pwd)) {
        console.log(`User ${user.username} (${user.role}): ${pwd}`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`User ${user.username} (${user.role}): <unknown>`);
    }
  }
  
  await conn.end();
}

check().catch(console.error);
