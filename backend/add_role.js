const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [roles] = await conn.query('SELECT * FROM roles');
  console.log('Current roles:', roles);

  const hasHod = roles.some(r => r.name === 'HOD');
  if (!hasHod) {
    await conn.query(`INSERT INTO roles (name, description, created_at) VALUES ('HOD', 'Head of Department', NOW())`);
    console.log('Inserted HOD role.');
  } else {
    console.log('HOD role already exists.');
  }
  
  process.exit(0);
}

run().catch(console.error);
