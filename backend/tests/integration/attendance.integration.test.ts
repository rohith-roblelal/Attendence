import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import { seedDatabase } from '../fixtures/seed';
import jwt from 'jsonwebtoken';

describe('Attendance API Integration Tests (IDOR)', () => {

  beforeAll(async () => {
    // Force DB to test DB
    process.env.DB_NAME = 'college_attendance_test';
    // Run the seed to reset DB state deterministically
    await seedDatabase();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM attendance_records');
  });

  afterAll(async () => {
    await pool.end();
  });

  const generateToken = (userId: number, role: string, username: string = 'testuser') => {
    return jwt.sign(
      { id: userId, role, username },
      process.env.JWT_SECRET || 'super-secret-key-change-in-prod',
      { expiresIn: '1h' }
    );
  };

  describe('POST /api/v1/attendance', () => {

    test('Teacher A attempting to CREATE attendance for Teacher B session (Session 2) is DENIED', async () => {
      // Teacher A has userId=2, teacherId=1. Session 2 belongs to Teacher B (teacherId=2).
      const token = generateToken(2, 'TEACHER', 'teacher_a');
      
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${token}`])
        .send({
          class_session_id: 2, // Session 2 is Teacher B's
          student_id: 1, // Student A
          status: 'PRESENT'
        });
      
      // We expect a 403 Forbidden because Teacher A does not own Session 2
      expect(res.status).toBe(403);
    });

    test('Teacher A attempting to CREATE attendance for Teacher A session (Session 1) is ALLOWED', async () => {
      // Teacher A has userId=2, teacherId=1. Session 1 belongs to Teacher A (teacherId=1).
      const token = generateToken(2, 'TEACHER', 'teacher_a');
      
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${token}`])
        .send({
          class_session_id: 1, // Session 1 is Teacher A's
          student_id: 1, // Student A
          status: 'PRESENT'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBeDefined();
    });

    test('Unenrolled Student attempting to receive attendance is REJECTED', async () => {
      // Teacher A has userId=2, teacherId=1. Session 1 belongs to Teacher A (teacherId=1).
      const token = generateToken(2, 'TEACHER', 'teacher_a');
      
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${token}`])
        .send({
          class_session_id: 1, 
          student_id: 999, // Unknown / Unenrolled student
          status: 'PRESENT'
        });
      
      expect(res.status).toBe(409); // 'Student not enrolled in the class for the session date'
    });
  });
  
  describe('PATCH /api/v1/attendance/:id', () => {
    test('Teacher A attempting to UPDATE attendance for Teacher B session is DENIED', async () => {
      const token = generateToken(2, 'TEACHER', 'teacher_a');
      
      const res = await request(app)
        .patch('/api/v1/attendance/9999') // Test using a fake id, which triggers a 404 or 403.
        .set('Cookie', [`token=${token}`])
        .send({ status: 'ABSENT' });
      
      expect(res.status).toBe(403); // authorizeScope intercepts and returns 403
    });
  });

  describe('POST /api/v1/attendance/bulk', () => {
    test('Teacher A attempting to BULK CREATE attendance for Teacher B session is DENIED', async () => {
      const token = generateToken(2, 'TEACHER', 'teacher_a');
      
      const res = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Cookie', [`token=${token}`])
        .send({
          class_session_id: 2, // Session 2 belongs to Teacher B
          records: [
            { student_id: 1, status: 'PRESENT' }
          ]
        });
        
      expect(res.status).toBe(403);
    });

    test('Teacher A attempting to BULK CREATE attendance for Own session is ALLOWED', async () => {
      const token = generateToken(2, 'TEACHER', 'teacher_a');
      
      const res = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Cookie', [`token=${token}`])
        .send({
          class_session_id: 1, // Session 1 belongs to Teacher A
          records: [
            { student_id: 1, status: 'PRESENT' } // Student 1 is enrolled in Class 1
          ]
        });
        
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
    });

    test('Transaction Atomicity: One invalid record rolls back the entire bulk operation', async () => {
      const token = generateToken(2, 'TEACHER', 'teacher_a');
      
      const res = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Cookie', [`token=${token}`])
        .send({
          class_session_id: 1, 
          records: [
            { student_id: 1, status: 'PRESENT' }, // Valid
            { student_id: 999, status: 'PRESENT' } // Invalid: Unenrolled
          ]
        });
        
      expect(res.status).toBe(409); // Rollback triggered by 999
    });
  });

  describe('Role-Based Access (Admin, HOD, Tutor)', () => {
    test('Admin attempting to CREATE attendance is globally ALLOWED', async () => {
      const token = generateToken(1, 'ADMINISTRATION', 'admin');
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${token}`])
        .send({ class_session_id: 2, student_id: 1, status: 'PRESENT' });
      
      expect(res.status).toBe(201);
    });

    test('Unassigned HOD attempting to CREATE attendance for out-of-scope department is DENIED', async () => {
      // Teacher A (userId=2) is not explicitly assigned as HOD in the DB seed for Department 1.
      const token = generateToken(2, 'HOD', 'teacher_a');
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${token}`])
        .send({ class_session_id: 2, student_id: 1, status: 'PRESENT' });
      expect(res.status).toBe(403);
    });

    test('Unassigned Tutor attempting to CREATE attendance for out-of-scope class is DENIED', async () => {
      // Teacher A is not explicitly assigned as Tutor for Class 1.
      const token = generateToken(2, 'TUTOR', 'teacher_a');
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${token}`])
        .send({ class_session_id: 2, student_id: 1, status: 'PRESENT' });
      expect(res.status).toBe(403);
    });
  });

});
