const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'attendance_db',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const roles = ['ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER', 'STUDENT'];
    for (const role of roles) {
      await connection.query('INSERT IGNORE INTO roles (name, created_at) VALUES (?, NOW())', [role]);
    }
    console.log('Roles inserted successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
run();
