import { pool } from '../../src/db/pool';

export const seedDatabase = async () => {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE attendance_records');
    await conn.query('TRUNCATE TABLE student_enrollments');
    await conn.query('TRUNCATE TABLE students');
    await conn.query('TRUNCATE TABLE class_sessions');
    await conn.query('TRUNCATE TABLE class_subjects');
    await conn.query('TRUNCATE TABLE subjects');
    await conn.query('TRUNCATE TABLE classes');
    await conn.query('TRUNCATE TABLE semesters');
    await conn.query('TRUNCATE TABLE admission_batches');
    await conn.query('TRUNCATE TABLE academic_years');
    await conn.query('TRUNCATE TABLE teachers');
    await conn.query('TRUNCATE TABLE users');
    await conn.query('TRUNCATE TABLE departments');

    // Minimal Seed
    await conn.query('TRUNCATE TABLE roles');

    // 0. Roles
    await conn.query(`INSERT INTO roles (id, name, description, created_at) VALUES 
      (1, 'ADMINISTRATION', 'Admin role', NOW()),
      (2, 'TEACHER', 'Teacher role', NOW()),
      (3, 'STUDENT', 'Student role', NOW())`);

    // 1. Department
    await conn.query(`INSERT INTO departments (id, name, code, is_active, created_at, updated_at) VALUES (1, 'Computer Science', 'CS', 1, NOW(), NOW())`);


    
    // 2. Users (Admin, Teacher A, Teacher B, Student A)
    // role_id: 1=ADMIN, 2=TEACHER, 3=STUDENT
    await conn.query(`INSERT INTO users (id, username, password_hash, role_id, is_active, created_at, updated_at) VALUES 
      (1, 'admin', 'hash', 1, 1, NOW(), NOW()),
      (2, 'teacher_a', 'hash', 2, 1, NOW(), NOW()),
      (3, 'teacher_b', 'hash', 2, 1, NOW(), NOW()),
      (4, 'student_a', 'hash', 3, 1, NOW(), NOW())`);

    // 3. Teachers
    await conn.query(`INSERT INTO teachers (id, user_id, teacher_id, first_name, last_name, status, created_at, updated_at) VALUES 
      (1, 2, 'T001', 'Teacher', 'A', 'ACTIVE', NOW(), NOW()),
      (2, 3, 'T002', 'Teacher', 'B', 'ACTIVE', NOW(), NOW())`);


    // 4. Academic Structure
    await conn.query(`INSERT INTO academic_years (id, name, start_date, end_date, is_active, created_at, updated_at) VALUES (1, '2026-2027', '2026-01-01', '2027-01-01', 1, NOW(), NOW())`);
    await conn.query(`INSERT INTO admission_batches (id, academic_year_id, department_id, batch_name, admission_year, created_at) VALUES (1, 1, 1, 'CS2026', 2026, NOW())`);
    await conn.query(`INSERT INTO semesters (id, academic_year_id, semester_number, name, start_date, end_date, created_at) VALUES (1, 1, 1, 'Sem 1', '2026-01-01', '2026-06-01', NOW())`);
    await conn.query(`INSERT INTO classes (id, admission_batch_id, semester_id, section_name, class_code, is_active, created_at, updated_at) VALUES (1, 1, 1, 'A', 'CS-A', 1, NOW(), NOW())`);
    await conn.query(`INSERT INTO subjects (id, code, name, subject_type, default_contact_hours, credits, is_active, created_at, updated_at) VALUES 
      (1, 'M1', 'Math', 'THEORY', 1, 3, 1, NOW(), NOW()),
      (2, 'P1', 'Physics', 'THEORY', 1, 3, 1, NOW(), NOW())`);

    // 5. Class Subjects (Assignments)
    await conn.query(`INSERT INTO class_subjects (id, class_id, subject_id, teacher_id, start_date, is_active, created_at, updated_at) VALUES 
      (1, 1, 1, 1, '2026-01-01', 1, NOW(), NOW()),
      (2, 1, 2, 2, '2026-01-01', 1, NOW(), NOW())`); 

    // 6. Class Sessions
    await conn.query(`INSERT INTO class_sessions (id, class_id, class_subject_id, assigned_teacher_id, conducted_by_teacher_id, session_date, period_number, contact_hours, status, source, created_at, updated_at) VALUES 
      (1, 1, 1, 1, 1, '2026-01-01', 1, 1, 'CONDUCTED', 'REGULAR', NOW(), NOW()), 
      (2, 1, 2, 2, 2, '2026-01-01', 2, 1, 'CONDUCTED', 'REGULAR', NOW(), NOW())`); 

    // 7. Students & Enrollments
    await conn.query(`INSERT INTO students (id, user_id, student_id, first_name, last_name, status, created_at, updated_at) VALUES (1, 4, 'S001', 'Student', 'A', 'ACTIVE', NOW(), NOW())`);
    await conn.query(`INSERT INTO student_enrollments (id, student_id, class_id, start_date, end_date, status, created_at) VALUES (1, 1, 1, '2026-01-01', NULL, 'ACTIVE', NOW())`);

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
};
