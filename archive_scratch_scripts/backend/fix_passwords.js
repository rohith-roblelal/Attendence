require('dotenv').config();
const mysql = require('mysql2/promise');
const argon2 = require('argon2');

async function fixPasswords() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    const hash = await argon2.hash('password123');
    await pool.query('UPDATE users SET password_hash = ?', [hash]);
    console.log('Successfully updated all passwords to "password123"');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
fixPasswords();
