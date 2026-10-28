const mysql = require('mysql2/promise');


async function setup() {
  const conn = await mysql.createConnection({host: '127.0.0.1', user: 'root', password: '', database: 'college_attendance'});
  
  // Actually, I can just use the backend's argon2 module if it's there, or I can just insert the password hash for 'password123' if I know one, or generate one.
  const argon2 = require('argon2');
  const passwordHash = await argon2.hash('password123');

  // Insert or get Departments
  const [depts] = await conn.execute("SELECT id, name FROM departments WHERE name LIKE 'Phase2%'");
  let deptA_id, deptB_id;
  if (depts.length >= 2) {
    deptA_id = depts[0].id;
    deptB_id = depts[1].id;
  } else {
    const [r1] = await conn.execute("INSERT INTO departments (name, code, is_active) VALUES ('Phase2 Dept A', 'P2DA', 1)");
    deptA_id = r1.insertId;
    const [r2] = await conn.execute("INSERT INTO departments (name, code, is_active) VALUES ('Phase2 Dept B', 'P2DB', 1)");
    deptB_id = r2.insertId;
  }

  // Insert or get Batches/Classes
  const [batches] = await conn.execute("SELECT id FROM admission_batches WHERE department_id IN (?, ?)", [deptA_id, deptB_id]);
  let batchA_id, batchB_id;
  if (batches.length >= 2) {
    batchA_id = batches[0].id;
    batchB_id = batches[1].id;
  } else {
    const [r3] = await conn.execute("INSERT INTO admission_batches (department_id, batch_name, start_year, end_year) VALUES (?, 'Phase2 Batch A', 2026, 2030)", [deptA_id]);
    batchA_id = r3.insertId;
    const [r4] = await conn.execute("INSERT INTO admission_batches (department_id, batch_name, start_year, end_year) VALUES (?, 'Phase2 Batch B', 2026, 2030)", [deptB_id]);
    batchB_id = r4.insertId;
  }

  const [classes] = await conn.execute("SELECT id FROM classes WHERE batch_id IN (?, ?)", [batchA_id, batchB_id]);
  let classA_id, classB_id;
  if (classes.length >= 2) {
    classA_id = classes[0].id;
    classB_id = classes[1].id;
  } else {
    const [r5] = await conn.execute("INSERT INTO classes (batch_id, semester_name, section_name, is_active) VALUES (?, 'Sem 1', 'A', 1)", [batchA_id]);
    classA_id = r5.insertId;
    const [r6] = await conn.execute("INSERT INTO classes (batch_id, semester_name, section_name, is_active) VALUES (?, 'Sem 1', 'A', 1)", [batchB_id]);
    classB_id = r6.insertId;
  }

  // Helper to create user
  async function createUser(username, roleId) {
    const [existing] = await conn.execute("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length > 0) return existing[0].id;
    const [res] = await conn.execute("INSERT INTO users (username, password_hash, role_id, is_active) VALUES (?, ?, ?, 1)", [username, passwordHash, roleId]);
    return res.insertId;
  }

  // Create Users
  const adminId = await createUser('phase2_admin', 1);
  const hodAId = await createUser('phase2_hod_a', 2);
  const hodBId = await createUser('phase2_hod_b', 2);
  const tutorAId = await createUser('phase2_tutor_a', 2);
  const tutorBId = await createUser('phase2_tutor_b', 2);
  const teacherAId = await createUser('phase2_teacher_a', 2);
  const teacherBId = await createUser('phase2_teacher_b', 2);
  const studentAId = await createUser('phase2_student_a', 3);
  const studentBId = await createUser('phase2_student_b', 3);

  // Link Teachers
  async function createTeacher(userId, employeeId) {
    const [existing] = await conn.execute("SELECT id FROM teachers WHERE user_id = ?", [userId]);
    if (existing.length > 0) return existing[0].id;
    const [res] = await conn.execute("INSERT INTO teachers (user_id, employee_id, first_name, last_name, status) VALUES (?, ?, 'Test', 'Teacher', 'ACTIVE')", [userId, employeeId]);
    return res.insertId;
  }
  const thodA = await createTeacher(hodAId, 'EMP_HOD_A');
  const thodB = await createTeacher(hodBId, 'EMP_HOD_B');
  const ttutorA = await createTeacher(tutorAId, 'EMP_TUTOR_A');
  const ttutorB = await createTeacher(tutorBId, 'EMP_TUTOR_B');
  const tteacherA = await createTeacher(teacherAId, 'EMP_TEACHER_A');
  const tteacherB = await createTeacher(teacherBId, 'EMP_TEACHER_B');

  // Link Students
  async function createStudent(userId, studentIdStr, classId) {
    const [existing] = await conn.execute("SELECT id FROM students WHERE user_id = ?", [userId]);
    if (existing.length > 0) return existing[0].id;
    const [res] = await conn.execute("INSERT INTO students (user_id, student_id, first_name, status) VALUES (?, ?, 'TestStudent', 'ACTIVE')", [userId, studentIdStr]);
    await conn.execute("INSERT INTO student_enrollments (student_id, class_id, is_active) VALUES (?, ?, 1)", [res.insertId, classId]);
    return res.insertId;
  }
  const stuA = await createStudent(studentAId, 'STU_A', classA_id);
  const stuB = await createStudent(studentBId, 'STU_B', classB_id);

  // Link HODs
  await conn.execute("INSERT IGNORE INTO department_hod_assignments (department_id, teacher_id, start_date, is_active) VALUES (?, ?, CURDATE(), 1)", [deptA_id, thodA]);
  await conn.execute("INSERT IGNORE INTO department_hod_assignments (department_id, teacher_id, start_date, is_active) VALUES (?, ?, CURDATE(), 1)", [deptB_id, thodB]);

  // Link Tutors
  await conn.execute("INSERT IGNORE INTO class_tutor_assignments (class_id, teacher_id, start_date, is_active) VALUES (?, ?, CURDATE(), 1)", [classA_id, ttutorA]);
  await conn.execute("INSERT IGNORE INTO class_tutor_assignments (class_id, teacher_id, start_date, is_active) VALUES (?, ?, CURDATE(), 1)", [classB_id, ttutorB]);

  // Link Subjects
  const [s1] = await conn.execute("INSERT IGNORE INTO subjects (department_id, code, name, type, is_active) VALUES (?, 'P2SA', 'Phase2 Subj A', 'THEORY', 1)", [deptA_id]);
  const [s2] = await conn.execute("INSERT IGNORE INTO subjects (department_id, code, name, type, is_active) VALUES (?, 'P2SB', 'Phase2 Subj B', 'THEORY', 1)", [deptB_id]);
  const subjAId = s1.insertId || (await conn.execute("SELECT id FROM subjects WHERE code='P2SA'"))[0][0].id;
  const subjBId = s2.insertId || (await conn.execute("SELECT id FROM subjects WHERE code='P2SB'"))[0][0].id;

  // Link Class Subjects (Teacher A to Class A Subj A)
  const [cs1] = await conn.execute("INSERT IGNORE INTO class_subjects (class_id, subject_id, teacher_id, is_active) VALUES (?, ?, ?, 1)", [classA_id, subjAId, tteacherA]);
  const [cs2] = await conn.execute("INSERT IGNORE INTO class_subjects (class_id, subject_id, teacher_id, is_active) VALUES (?, ?, ?, 1)", [classB_id, subjBId, tteacherB]);

  // Create Sessions
  const cs1Id = cs1.insertId || (await conn.execute("SELECT id FROM class_subjects WHERE class_id=? AND subject_id=?", [classA_id, subjAId]))[0][0].id;
  const cs2Id = cs2.insertId || (await conn.execute("SELECT id FROM class_subjects WHERE class_id=? AND subject_id=?", [classB_id, subjBId]))[0][0].id;

  const [sess1] = await conn.execute("INSERT IGNORE INTO class_sessions (class_id, class_subject_id, session_date, period_number, status, source) VALUES (?, ?, CURDATE(), 1, 'SCHEDULED', 'MANUAL')", [classA_id, cs1Id]);
  const [sess2] = await conn.execute("INSERT IGNORE INTO class_sessions (class_id, class_subject_id, session_date, period_number, status, source) VALUES (?, ?, CURDATE(), 1, 'SCHEDULED', 'MANUAL')", [classB_id, cs2Id]);

  console.log("TEST DATA READY.");
  console.log({
    deptA_id, deptB_id,
    batchA_id, batchB_id,
    classA_id, classB_id,
    adminId, hodAId, hodBId, tutorAId, tutorBId, teacherAId, teacherBId, studentAId, studentBId,
    thodA, thodB, ttutorA, ttutorB, tteacherA, tteacherB, stuA, stuB,
    cs1Id, cs2Id,
    sess1Id: sess1.insertId, sess2Id: sess2.insertId
  });

  conn.end();
}
setup().catch(console.error);
