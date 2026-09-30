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
    const classId = 1; // Testing with class_id 1
    const [students] = await connection.query(`
      SELECT
        s.id as student_id,
        COALESCE(s.admission_number, s.student_id) as admission_number,
        CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as student_name,
        COUNT(a.id) as total_records,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'ACTIVE'
      LEFT JOIN class_sessions cs ON cs.class_id = ? AND cs.status = 'CONDUCTED'
      LEFT JOIN attendance_records a ON a.student_id = s.id AND a.class_session_id = cs.id
      WHERE se.class_id = ? AND s.status = 'ACTIVE'
      GROUP BY s.id, s.admission_number, s.student_id, u.first_name, u.last_name
      ORDER BY u.first_name ASC
    `, [classId, classId]);
    
    console.log(`Found ${students.length} students:`);
    console.log(students);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

run();
