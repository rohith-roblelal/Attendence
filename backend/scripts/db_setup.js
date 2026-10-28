const mysql = require('mysql2/promise');
const argon2 = require('argon2');
async function run() {
  const hash = await argon2.hash('password123');
  const conn = await mysql.createConnection({host: '127.0.0.1', user: 'root', password: '', database: 'college_attendance'});
  
  // create student b
  const [res] = await conn.execute("INSERT IGNORE INTO users (username, password_hash, role_id, is_active) VALUES (?, ?, 3, 1)", ['student_b', hash]);
  const userId = res.insertId || (await conn.execute("SELECT id FROM users WHERE username='student_b'"))[0][0].id;
  await conn.execute("INSERT IGNORE INTO students (user_id, student_id, first_name, status) VALUES (?, ?, 'StudentB', 'ACTIVE')", [userId, 'S002']);
  
  // create HOD A (assign teacher_a to Dept 1)
  await conn.execute("INSERT IGNORE INTO department_hod_assignments (department_id, teacher_id, start_date, is_active) VALUES (1, 1, CURDATE(), 1)");
  
  // create Tutor A (assign teacher_a to Class 1)
  await conn.execute("INSERT IGNORE INTO class_tutor_assignments (class_id, teacher_id, start_date, is_active) VALUES (1, 1, CURDATE(), 1)");

  // create session for teacher A
  const [s] = await conn.execute("INSERT IGNORE INTO class_sessions (class_id, class_subject_id, session_date, period_number, status, source) VALUES (1, 1, CURDATE(), 1, 'SCHEDULED', 'MANUAL')");
  
  console.log('Test data created');
  conn.end();
}
run();
