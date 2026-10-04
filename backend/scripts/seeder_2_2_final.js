const mysql = require('mysql2/promise');
const argon2 = require('argon2');

async function setup() {
  const conn = await mysql.createConnection({host: '127.0.0.1', user: 'root', password: '', database: 'college_attendance'});
  
  // Create Dept 3
  await conn.execute("INSERT IGNORE INTO departments (id, code, name, is_active) VALUES (3, 'D3', 'Dept 3', 1)");
  
  // Set up HOD B (teacher_id=2) for Dept 3
  await conn.execute("INSERT IGNORE INTO department_hod_assignments (department_id, teacher_id, academic_year_id, start_date, is_active) VALUES (3, 2, 1, CURDATE(), 1)");
  
  // We already have HOD A (teacher_id=1) for Dept 1. (from query)
  
  // Ensure Class 2 exists
  await conn.execute("INSERT IGNORE INTO admission_batches (id, department_id, batch_name, admission_year) VALUES (3, 3, 'B3', 2026)");
  await conn.execute("INSERT IGNORE INTO classes (id, admission_batch_id, semester_id, class_code, is_active) VALUES (2, 3, 1, 'C2', 1)");
  
  // Set up Tutor A (teacher_id=1) for Class 1
  await conn.execute("INSERT IGNORE INTO tutor_assignments (class_id, teacher_id, start_date, is_active, assigned_by) VALUES (1, 1, CURDATE(), 1, 1)");
  
  // Set up Tutor B (teacher_id=2) for Class 2
  await conn.execute("INSERT IGNORE INTO tutor_assignments (class_id, teacher_id, start_date, is_active, assigned_by) VALUES (2, 2, CURDATE(), 1, 1)");
  
  console.log('Phase 2.2 Relational Data injected successfully');
  conn.end();
}
setup().catch(console.error);
