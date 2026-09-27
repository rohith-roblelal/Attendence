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
    const teacherId = 1;

    console.log('Cleaning up foreign key dependencies for teacher', teacherId);
    
    await connection.execute('DELETE FROM tutor_assignments WHERE teacher_id = ?', [teacherId]);
    console.log('Deleted tutor_assignments');
    
    await connection.execute('DELETE FROM department_hod_assignments WHERE teacher_id = ?', [teacherId]);
    console.log('Deleted department_hod_assignments');
    
    await connection.execute('DELETE FROM class_subjects WHERE teacher_id = ?', [teacherId]);
    console.log('Deleted class_subjects');

    const [result] = await connection.execute('DELETE FROM teachers WHERE id = ? LIMIT 1', [teacherId]);
    console.log('Query successful. Rows affected:', result.affectedRows);
  } catch (error) {
    console.error('Error executing query:', error.message);
  } finally {
    await connection.end();
  }
}

run();
