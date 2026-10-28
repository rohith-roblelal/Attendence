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

    // 1. Admin User
    await conn.query(`INSERT INTO users (id, username, password_hash, role_id, is_active, created_at, updated_at) VALUES 
      (1, 'admin', '$argon2id$v=19$m=65536,p=4,t=3$VhdE2Nf7QDPNtchqKPR/Lw$eR44KTpzZiMokzqlpQjjsUNZ5JKJrij6Rv1MHrb24G8', 1, 1, NOW(), NOW())`);

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
};
