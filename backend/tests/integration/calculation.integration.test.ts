import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import { seedDatabase } from '../fixtures/seed';
import jwt from 'jsonwebtoken';

describe('Phase 16: Attendance Calculation & Business Logic Tests', () => {
  beforeAll(async () => {
    process.env.DB_NAME = 'college_attendance_test';
    await seedDatabase();
  });

  afterAll(async () => {
    // await pool.end();
  });

  const generateToken = (userId: number, role: string) => {
    return jwt.sign({ id: userId, role, username: 'tester' }, process.env.JWT_SECRET || 'super-secret-key-change-in-prod', { expiresIn: '1h' });
  };
  
  const studentAToken = generateToken(4, 'STUDENT'); // Student A
  const teacherAToken = generateToken(2, 'TEACHER'); // Teacher A

  beforeEach(async () => {
    await pool.query('DELETE FROM attendance_audit_logs');
    await pool.query('DELETE FROM attendance_records');
    await pool.query('DELETE FROM class_sessions WHERE id > 2'); // Keep initial seed sessions
  });
  
  const seedSessions = async (total: number, present: number, subjectId: number = 1, classSubjectId: number = 1) => {
    let sessionValues = [];
    let attendanceValues = [];
    
    const [row]: any = await pool.query('SELECT MAX(id) as maxId FROM class_sessions');
    let startId = (row[0].maxId || 0) + 1;

    for (let i = 1; i <= total; i++) {
      const sessionId = startId + i;
      // using class_id 1
      sessionValues.push(`(${sessionId}, 1, ${classSubjectId}, 1, 1, '2026-09-01', ${i}, 1, 'CONDUCTED', 'REGULAR', NOW(), NOW())`);
      
      if (i <= present) {
        attendanceValues.push(`(1, ${sessionId}, 'PRESENT', 1, NOW(), NOW())`);
      } else {
        attendanceValues.push(`(1, ${sessionId}, 'ABSENT', 1, NOW(), NOW())`);
      }
    }
    
    if (sessionValues.length > 0) {
      await pool.query(`INSERT INTO class_sessions (id, class_id, class_subject_id, assigned_teacher_id, conducted_by_teacher_id, session_date, period_number, contact_hours, status, source, created_at, updated_at) VALUES ${sessionValues.join(',')}`);
    }
    if (attendanceValues.length > 0) {
      await pool.query(`INSERT INTO attendance_records (student_id, class_session_id, status, marked_by, marked_at, updated_at) VALUES ${attendanceValues.join(',')}`);
    }
  };

  describe('Calculation Precision & Edge Cases', () => {
    test('Case A: 0 present / 0 total', async () => {
      const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.attendance.total_records).toBe(0);
      expect(res.body.data.attendance.present_records).toBe(0);
      expect(res.body.data.attendance.current_percentage).toBe(0); // 0% not NaN
    });

    test('Case B: 0 present / 10 total', async () => {
      await seedSessions(10, 0);
      const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.attendance.current_percentage).toBe(0);
    });

    test('Case C: 1 present / 1 total', async () => {
      await seedSessions(1, 1);
      const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.attendance.current_percentage).toBe(100);
    });

    test('Case D: 5 present / 10 total', async () => {
      await seedSessions(10, 5);
      const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.attendance.current_percentage).toBe(50);
    });

    test('Case E: 9 present / 10 total', async () => {
      await seedSessions(10, 9);
      const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.attendance.current_percentage).toBe(90);
    });

    test('Case F: 8 present / 9 total (No rounding/SQL Float Precision)', async () => {
      await seedSessions(9, 8);
      const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.attendance.current_percentage).toBe(88.88888888888889);
    });

    test('Case G: 2 present / 3 total', async () => {
      await seedSessions(3, 2);
      const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.attendance.current_percentage).toBeCloseTo(66.66666, 4);
    });

    test('Case H: All present', async () => {
      await seedSessions(5, 5);
      const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.attendance.current_percentage).toBe(100);
    });
  });

  describe('Subject Isolation & Database Aggregation', () => {
    test('Student receives attendance calculated separately for each subject', async () => {
      // Seed Subject A (class_subject_id 1): 8/10
      await seedSessions(10, 8, 1, 1);
      // Seed Subject B (class_subject_id 2): 15/20
      await seedSessions(20, 15, 1, 2); // Seed adds another 20

      const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(res.status).toBe(200);
      
      const subjects = res.body.data.subjectAttendance;
      expect(subjects.length).toBe(2);

      const math = subjects.find((s: any) => s.subject_code === 'M1');
      expect(math).toBeDefined();
      expect(math.total_sessions).toBeGreaterThanOrEqual(10);
      expect(Number(math.present_sessions)).toBeGreaterThanOrEqual(8);

      // The overall percentage should combine them
      expect(res.body.data.attendance.total_records).toBeGreaterThanOrEqual(30);
      expect(res.body.data.attendance.present_records).toBe(23);
      expect(res.body.data.attendance.current_percentage).toBeCloseTo((23/30)*100, 4);
    });
  });

  describe('Attendance Mutations & Validity', () => {
    test('CREATE adds exactly one record', async () => {
      // Create one attendance record for Session 1 using Teacher A
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${teacherAToken}`])
        .send({ class_session_id: 1, student_id: 1, status: 'PRESENT' });
        
      expect(res.status).toBe(201);
      
      // Verify via student dashboard
      const dash = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(dash.body.data.attendance.total_records).toBe(1);
      expect(dash.body.data.attendance.present_records).toBe(1);
    });

    test('UPDATE correctly changes percentage', async () => {
      const createRes = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${teacherAToken}`])
        .send({ class_session_id: 1, student_id: 1, status: 'PRESENT' });
      
      const recordId = createRes.body.data.id;
      
      // Update to ABSENT
      const updateRes = await request(app)
        .patch(`/api/v1/attendance/${recordId}`)
        .set('Cookie', [`token=${teacherAToken}`])
        .send({ status: 'ABSENT' });
        
      expect(updateRes.status).toBe(200);
      
      const dash = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentAToken}`]);
      expect(dash.body.data.attendance.total_records).toBe(1);
      expect(dash.body.data.attendance.present_records).toBe(0);
      expect(dash.body.data.attendance.current_percentage).toBe(0);
    });
    
    test('Duplicate attendance behavior (Unique Constraint Check)', async () => {
      await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${teacherAToken}`])
        .send({ class_session_id: 1, student_id: 1, status: 'PRESENT' });
        
      // Try again
      const dupRes = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${teacherAToken}`])
        .send({ class_session_id: 1, student_id: 1, status: 'PRESENT' });
      
      // The API should handle uniqueness properly, it should reject or update
      expect(dupRes.status).not.toBe(500); // 500 implies unhandled database error!
      expect([409, 400]).toContain(dupRes.status);
    });
    
    test('Invalid attendance data handles gracefully', async () => {
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Cookie', [`token=${teacherAToken}`])
        .send({ class_session_id: 99999, student_id: 99999, status: 'INVALID_STATUS' });
        
      expect([400, 403]).toContain(res.status);
    });
  });
});
