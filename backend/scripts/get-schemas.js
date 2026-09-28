const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({host: '127.0.0.1', user: 'root', database: 'college_attendance_test'});
  const tables = [
    'academic_years', 'admission_batches', 'semesters', 'classes', 'subjects', 
    'class_subjects', 'class_sessions', 'student_enrollments', 'roles', 'departments', 'attendance_records'
  ];
  for (const t of tables) {
    try {
      const [res] = await db.query(`SHOW CREATE TABLE \`${t}\``);
      console.log(res[0]['Create Table']);
    } catch (e) {
      console.log('Error ' + t + ': ' + e.message);
    }
  }
  process.exit(0);
}

run();
