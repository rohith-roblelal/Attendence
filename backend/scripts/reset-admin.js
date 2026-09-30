const mysql = require('mysql2/promise');
const argon2 = require('argon2');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'college_attendance'
  });

  try {
    const passwordHash = await argon2.hash('admin123');
    await connection.query('UPDATE users SET password_hash = ? WHERE username = ?', [passwordHash, 'admin']);
    console.log('Password successfully reset to: admin123');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

run();
