const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'attendance_db'
  });

  const [rows] = await connection.query('SELECT username, r.name as role FROM users u JOIN roles r ON u.role_id = r.id LIMIT 10');
  console.log(rows);
  await connection.end();
}

run().catch(console.error);
