import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import { seedDatabase } from '../fixtures/seed';
import jwt from 'jsonwebtoken';

describe('Reports Data Types Normalization', () => {
  beforeAll(async () => {
    process.env.DB_NAME = 'college_attendance_test';
    await seedDatabase();
    
    // Assign Teacher A (id=1, user_id=2) as HOD of Department 1 for Academic Year 1
    await pool.query(`INSERT IGNORE INTO department_hod_assignments 
      (department_id, teacher_id, academic_year_id, start_date, is_active, created_at) 
      VALUES (1, 1, 1, '2026-01-01', TRUE, NOW())`);
  });

  afterAll(async () => {
    // pool end handled by runner or teardown
  });

  const generateToken = (userId: number, role: string) => {
    return jwt.sign({ id: userId, role, username: 'tester' }, process.env.JWT_SECRET || 'super-secret-key-change-in-prod', { expiresIn: '1h' });
  };
  
  const adminToken = generateToken(1, 'ADMINISTRATION'); // Admin
  const studentAToken = generateToken(4, 'STUDENT'); // Student A
  const hodToken = generateToken(2, 'HOD'); // Teacher A who is also HOD

  test('Student Report returns numeric aggregates as numbers', async () => {
    const res = await request(app).get('/api/v1/reports/students/1/attendance').set('Cookie', [`token=${studentAToken}`]);
    expect(res.status).toBe(200);
    
    if (res.body.data && res.body.data.length > 0) {
      const row = res.body.data[0];
      expect(typeof row.total_sessions).toBe('number');
      expect(typeof row.present_sessions).toBe('number');
      expect(typeof row.absent_sessions).toBe('number');
    }
  });

  test('Class Report returns numeric aggregates as numbers', async () => {
    const res = await request(app).get('/api/v1/reports/classes/1/attendance').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
    
    if (res.body.data && res.body.data.length > 0) {
      const row = res.body.data[0];
      expect(typeof row.total_sessions).toBe('number');
      expect(typeof row.present_sessions).toBe('number');
      expect(typeof row.absent_sessions).toBe('number');
      if (row.percentage !== undefined && row.percentage !== null) expect(typeof row.percentage).toBe('number');
    }
  });

  test('Subject Report returns numeric aggregates as numbers', async () => {
    const res = await request(app).get('/api/v1/reports/subjects/1/attendance').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
    
    if (res.body.data && res.body.data.length > 0) {
      const row = res.body.data[0];
      expect(typeof row.total_sessions).toBe('number');
      expect(typeof row.present_sessions).toBe('number');
      if (row.percentage !== undefined && row.percentage !== null) expect(typeof row.percentage).toBe('number');
    }
  });

  test('Department Report returns numeric aggregates as numbers', async () => {
    const res = await request(app).get('/api/v1/reports/department/1/attendance').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
    
    if (res.body.data && res.body.data.length > 0) {
      const row = res.body.data[0];
      expect(typeof row.student_count).toBe('number');
      expect(typeof row.total_records).toBe('number');
      expect(typeof row.present_records).toBe('number');
      if (row.percentage !== undefined && row.percentage !== null) expect(typeof row.percentage).toBe('number');
    }
  });

  test('HOD Department Report returns numeric aggregates as numbers', async () => {
    // Note: HOD report uses teacherId logic inside controller
    const res = await request(app).get('/api/v1/reports/hod/department').set('Cookie', [`token=${hodToken}`]);
    expect(res.status).toBe(200);
    
    if (res.body.data && res.body.data.classSummary && res.body.data.classSummary.length > 0) {
      const classRow = res.body.data.classSummary[0];
      expect(typeof classRow.student_count).toBe('number');
      expect(typeof classRow.total_records).toBe('number');
      expect(typeof classRow.present_records).toBe('number');
    }

    if (res.body.data && res.body.data.studentSummary && res.body.data.studentSummary.length > 0) {
      const studentRow = res.body.data.studentSummary[0];
      expect(typeof studentRow.total_records).toBe('number');
      expect(typeof studentRow.present_records).toBe('number');
    }
  });
});
