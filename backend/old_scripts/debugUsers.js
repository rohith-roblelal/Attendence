require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_attendance',
  });

  try {
    const [cols] = await connection.query('SHOW COLUMNS FROM users');
    console.log('users columns:', cols.map(c => c.Field));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

run();
