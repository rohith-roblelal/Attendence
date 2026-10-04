const mysql = require('mysql2/promise');
const argon2 = require('argon2');

async function setup() {
  const conn = await mysql.createConnection({host: '127.0.0.1', user: 'root', password: '', database: 'college_attendance'});
  
  const hash = await argon2.hash('password123');
  
  async function ensureUser(username, roleId) {
    const [res] = await conn.execute("INSERT IGNORE INTO users (username, password_hash, role_id, is_active) VALUES (?, ?, ?, 1)", [username, hash, roleId]);
    if (res.insertId) return res.insertId;
    const [rows] = await conn.execute("SELECT id FROM users WHERE username=?", [username]);
    return rows[0].id;
  }
  
  async function ensureTeacher(userId, firstName, deptId) {
    const teacherIdStr = 'T_' + firstName.replace(/\s+/g, '').toUpperCase().substring(0, 4);
    const [res] = await conn.execute("INSERT IGNORE INTO teachers (user_id, first_name, department_id, teacher_id, status) VALUES (?, ?, ?, ?, 'ACTIVE')", [userId, firstName, deptId, teacherIdStr]);
    if (res.insertId) return res.insertId;
    const [rows] = await conn.execute("SELECT id FROM teachers WHERE user_id=?", [userId]);
    return rows[0].id;
  }

  // 1. Roles
  const [roleRows] = await conn.execute("SELECT id, name FROM roles");
  const roleMap = {};
  roleRows.forEach(r => roleMap[r.name] = r.id);

  // 2. Departments
  await conn.execute("INSERT IGNORE INTO departments (id, code, name, is_active) VALUES (1, 'CS', 'Computer Science', 1)");
  await conn.execute("INSERT IGNORE INTO departments (id, code, name, is_active) VALUES (2, 'ME', 'Mechanical Eng', 1)");
  
  // 3. Academic Year & Semester
  await conn.execute("INSERT IGNORE INTO academic_years (id, name, start_date, end_date, is_current) VALUES (1, '2026-2027', '2026-08-01', '2027-05-31', 1)");
  await conn.execute("INSERT IGNORE INTO semesters (id, academic_year_id, term_number, status) VALUES (1, 1, 1, 'ACTIVE')");
  
  // 4. Batch
  await conn.execute("INSERT IGNORE INTO admission_batches (id, department_id, batch_name, admission_year) VALUES (1, 1, 'CS2026', 2026)");
  await conn.execute("INSERT IGNORE INTO admission_batches (id, department_id, batch_name, admission_year) VALUES (2, 2, 'ME2026', 2026)");

  // 5. Classes
  await conn.execute("INSERT IGNORE INTO classes (id, admission_batch_id, semester_id, class_code, is_active) VALUES (1, 1, 1, 'CS-A', 1)");
  await conn.execute("INSERT IGNORE INTO classes (id, admission_batch_id, semester_id, class_code, is_active) VALUES (2, 2, 1, 'ME-A', 1)");

  // 6. Users & Teachers
  const tA_U = await ensureUser('teacher_a', roleMap['TEACHER']);
  const tB_U = await ensureUser('teacher_b', roleMap['TEACHER']);
  const hA_U = await ensureUser('hod_a', roleMap['HOD']);
  const hB_U = await ensureUser('hod_b', roleMap['HOD']);
  const tuA_U = await ensureUser('tutor_a', roleMap['TUTOR']);
  const tuB_U = await ensureUser('tutor_b', roleMap['TUTOR']);
  
  const tA_T = await ensureTeacher(tA_U, 'Teacher A', 1);
  const tB_T = await ensureTeacher(tB_U, 'Teacher B', 2);
  const hA_T = await ensureTeacher(hA_U, 'HOD A', 1);
  const hB_T = await ensureTeacher(hB_U, 'HOD B', 2);
  const tuA_T = await ensureTeacher(tuA_U, 'Tutor A', 1);
  const tuB_T = await ensureTeacher(tuB_U, 'Tutor B', 2);

  // 7. Students
  const sA_U = await ensureUser('student_a', roleMap['STUDENT']);
  const sB_U = await ensureUser('student_b', roleMap['STUDENT']);
  await conn.execute("INSERT IGNORE INTO students (id, user_id, student_id, first_name, status) VALUES (1, ?, 'S001', 'Student A', 'ACTIVE')", [sA_U]);
  await conn.execute("INSERT IGNORE INTO students (id, user_id, student_id, first_name, status) VALUES (2, ?, 'S002', 'Student B', 'ACTIVE')", [sB_U]);
  
  // Student Enrollments
  await conn.execute("INSERT IGNORE INTO student_enrollments (student_id, class_id, academic_year_id) VALUES (1, 1, 1)");
  await conn.execute("INSERT IGNORE INTO student_enrollments (student_id, class_id, academic_year_id) VALUES (2, 2, 1)");

  // 8. HOD Assignments
  await conn.execute("INSERT IGNORE INTO department_hod_assignments (department_id, teacher_id, academic_year_id, start_date, is_active) VALUES (1, ?, 1, CURDATE(), 1)", [hA_T]);
  await conn.execute("INSERT IGNORE INTO department_hod_assignments (department_id, teacher_id, academic_year_id, start_date, is_active) VALUES (2, ?, 1, CURDATE(), 1)", [hB_T]);

  // 9. Tutor Assignments
  await conn.execute("INSERT IGNORE INTO tutor_assignments (class_id, teacher_id, start_date, is_active) VALUES (1, ?, CURDATE(), 1)", [tuA_T]);
  await conn.execute("INSERT IGNORE INTO tutor_assignments (class_id, teacher_id, start_date, is_active) VALUES (2, ?, CURDATE(), 1)", [tuB_T]);

  // 10. Subjects & Sessions
  await conn.execute("INSERT IGNORE INTO subjects (id, department_id, code, name, is_active) VALUES (1, 1, 'SUB1', 'Subject 1', 1)");
  await conn.execute("INSERT IGNORE INTO class_subjects (id, class_id, subject_id) VALUES (1, 1, 1)");
  await conn.execute("INSERT IGNORE INTO class_subjects (id, class_id, subject_id) VALUES (2, 2, 1)"); // Both classes take this just for test

  // Sessions
  await conn.execute("INSERT IGNORE INTO class_sessions (id, class_id, class_subject_id, session_date, period_number, assigned_teacher_id, conducted_by_teacher_id, status, source) VALUES (1, 1, 1, CURDATE(), 1, ?, ?, 'SCHEDULED', 'MANUAL')", [tA_T, tA_T]);
  await conn.execute("INSERT IGNORE INTO class_sessions (id, class_id, class_subject_id, session_date, period_number, assigned_teacher_id, conducted_by_teacher_id, status, source) VALUES (2, 2, 2, CURDATE(), 1, ?, ?, 'SCHEDULED', 'MANUAL')", [tB_T, tB_T]);

  console.log('Complete structured data generated.');
  
  // Provide mapping summary for tests
  console.log(`
  tA_T: ${tA_T}, tB_T: ${tB_T}
  Session 1 (tA): 1, Session 2 (tB): 2
  Dept A: 1, Dept B: 2
  Class A: 1, Class B: 2
  Student A: 1, Student B: 2
  `);

  conn.end();
}
setup().catch(console.error);
