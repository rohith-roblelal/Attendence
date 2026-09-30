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
    const teacherId = 10; //KTUSNMAKASHYA's teacher ID based on previous debug
    const [timetable] = await connection.query(`
      SELECT 
        rte.id, rte.day_of_week, rte.period_number,
        sub.name as subject_name, sub.code as subject_code,
        CONCAT(b.batch_name, ' - ', sem.name, ' - ', c.section_name) as class_name
      FROM regular_timetable_entries rte
      JOIN class_subjects cs ON rte.class_subject_id = cs.id
      JOIN subjects sub ON cs.subject_id = sub.id
      JOIN classes c ON rte.class_id = c.id
      JOIN semesters sem ON c.semester_id = sem.id
      JOIN admission_batches b ON c.admission_batch_id = b.id
      WHERE cs.teacher_id = ? AND rte.is_active = TRUE
      ORDER BY rte.day_of_week ASC, rte.period_number ASC
    `, [teacherId]);

    console.log(`Found ${timetable.length} entries:`, timetable);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

run();
