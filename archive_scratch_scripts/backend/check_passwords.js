require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkPasswords() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    const [rows] = await pool.query('SELECT id, username, password_hash FROM users');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
checkPasswords();
