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

  const [roles] = await connection.query('SELECT * FROM roles');
  console.log(roles);
  
  if (roles.length === 0) {
    console.log('Inserting default roles...');
    await connection.query("INSERT INTO roles (name, description) VALUES ('ADMINISTRATION', 'System Administrator'), ('HOD', 'Head of Department'), ('TUTOR', 'Class Tutor'), ('TEACHER', 'Subject Teacher'), ('STUDENT', 'Student')");
  }
  
  await connection.end();
}

run().catch(console.error);
