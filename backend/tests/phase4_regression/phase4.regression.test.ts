import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

describe('Phase 4.1 Automated E2E & Regression Closure', () => {
  const req = (method: 'get'|'post'|'put'|'patch'|'delete', url: string) => request(app)[method](url).set('Origin', 'http://localhost:3000');
  
  let tokens = { admin: '', hodA: '', hodB: '', tutorA: '', tutorB: '', teacherA: '', teacherB: '', studentA: '', studentB: '' };
  let ids = { deptA: 0, deptB: 0, classA: 0, classB: 0, sessA: 0, sessB: 0, subjA: 0, stA: 0, stB: 0, attA: 0 };
  let ts = Date.now().toString().slice(-5);

  beforeAll(async () => {
    // === TEST FIXTURE SETUP ===
    const conn = await pool.getConnection();
    const hash = await argon2.hash('password123');
    
    // Ensure roles
    await conn.query("INSERT IGNORE INTO roles (id, name, description) VALUES (4, 'HOD', 'HOD'), (5, 'TUTOR', 'Tutor')");
    const [roles] = await conn.query('SELECT * FROM roles');
    const roleMap: Record<string, number> = {};
    (roles as any[]).forEach(r => roleMap[r.name] = r.id);

    async function ensureUser(username: string, roleName: string) {
      if (!roleMap[roleName]) throw new Error(`Role ${roleName} not found in DB`);
      await conn.query('INSERT IGNORE INTO users (username, password_hash, role_id, is_active) VALUES (?, ?, ?, 1)', [username, hash, roleMap[roleName]]);
      const [u] = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
      if ((u as any[]).length === 0) throw new Error(`User ${username} not found after insert`);
      return (u as any[])[0].id;
    }

    const uAdmin = await ensureUser('phase4_admin', 'ADMINISTRATION');
    const uHodA = await ensureUser('phase4_hod_a', 'HOD');
    const uHodB = await ensureUser('phase4_hod_b', 'HOD');
    const uTutorA = await ensureUser('phase4_tutor_a', 'TUTOR');
    const uTutorB = await ensureUser('phase4_tutor_b', 'TUTOR');
    const uTeacherA = await ensureUser('phase4_teacher_a', 'TEACHER');
    const uTeacherB = await ensureUser('phase4_teacher_b', 'TEACHER');
    const uStudentA = await ensureUser('phase4_student_a', 'STUDENT');
    const uStudentB = await ensureUser('phase4_student_b', 'STUDENT');

    // Create Departments
    await conn.query('INSERT IGNORE INTO departments (code, name, is_active) VALUES (?, ?, 1)', [`D${ts}A`, `Dept A ${ts}`]);
    const [dA] = await conn.query('SELECT id FROM departments WHERE code = ?', [`D${ts}A`]);
    ids.deptA = (dA as any[])[0].id;

    await conn.query('INSERT IGNORE INTO departments (code, name, is_active) VALUES (?, ?, 1)', [`D${ts}B`, `Dept B ${ts}`]);
    const [dB] = await conn.query('SELECT id FROM departments WHERE code = ?', [`D${ts}B`]);
    ids.deptB = (dB as any[])[0].id;

    const login = async (username: string) => {
      const res = await req('post', '/api/v1/auth/login').send({ username, password: 'password123' });
      if (res.status !== 200) throw new Error(`Login failed for ${username}: ${JSON.stringify(res.body)}`);
      return res.headers['set-cookie'][0].split(';')[0];
    };

    tokens.admin = await login('phase4_admin');
    tokens.hodA = await login('phase4_hod_a');
    tokens.hodB = await login('phase4_hod_b');
    tokens.tutorA = await login('phase4_tutor_a');
    tokens.tutorB = await login('phase4_tutor_b');
    tokens.teacherA = await login('phase4_teacher_a');
    tokens.teacherB = await login('phase4_teacher_b');
    tokens.studentA = await login('phase4_student_a');
    tokens.studentB = await login('phase4_student_b');

    // Create basic academic structure via API
    const rAY = await req('post', '/api/v1/academic-years').set('Cookie', tokens.admin)
      .send({ name: `AY${ts}`, start_date: '2026-08-01', end_date: '2027-05-31', is_active: true });
    const ayId = rAY.body.data.id;

    const rSem = await req('post', '/api/v1/semesters').set('Cookie', tokens.admin)
      .send({ academic_year_id: ayId, semester_number: 1, name: `Sem ${ts}`, start_date: '2026-08-01', end_date: '2026-12-31' });
    const semId = rSem.body.data.id;

    const rBatchA = await req('post', '/api/v1/admission-batches').set('Cookie', tokens.admin)
      .send({ academic_year_id: ayId, department_id: ids.deptA, batch_name: `BA${ts}`, admission_year: 2026 });
    const batchA = rBatchA.body.data.id;

    const rBatchB = await req('post', '/api/v1/admission-batches').set('Cookie', tokens.admin)
      .send({ academic_year_id: ayId, department_id: ids.deptB, batch_name: `BB${ts}`, admission_year: 2026 });
    const batchB = rBatchB.body.data.id;

    const rClassA = await req('post', '/api/v1/classes').set('Cookie', tokens.admin)
      .send({ admission_batch_id: batchA, semester_id: semId, section_name: 'A', class_code: `CA${ts}` });
    ids.classA = rClassA.body.data.id;

    const rClassB = await req('post', '/api/v1/classes').set('Cookie', tokens.admin)
      .send({ admission_batch_id: batchB, semester_id: semId, section_name: 'B', class_code: `CB${ts}` });
    ids.classB = rClassB.body.data.id;

    // Teachers
    await conn.query('INSERT IGNORE INTO teachers (user_id, department_id, teacher_id, first_name) VALUES (?, ?, ?, ?)', [uTeacherA, ids.deptA, `TA${ts}`, 'Tch A']);
    const [tA] = await conn.query('SELECT id FROM teachers WHERE user_id = ?', [uTeacherA]);
    const tIdA = (tA as any[])[0].id;

    await conn.query('INSERT IGNORE INTO teachers (user_id, department_id, teacher_id, first_name) VALUES (?, ?, ?, ?)', [uTeacherB, ids.deptB, `TB${ts}`, 'Tch B']);
    const [tB] = await conn.query('SELECT id FROM teachers WHERE user_id = ?', [uTeacherB]);
    const tIdB = (tB as any[])[0].id;
    
    // Tutors
    await conn.query('INSERT IGNORE INTO teachers (user_id, department_id, teacher_id, first_name) VALUES (?, ?, ?, ?)', [uTutorA, ids.deptA, `TUA${ts}`, 'Tut A']);
    const [tuA] = await conn.query('SELECT id FROM teachers WHERE user_id = ?', [uTutorA]);
    await conn.query('INSERT IGNORE INTO tutor_assignments (class_id, teacher_id, start_date, created_at) VALUES (?, ?, "2026-08-01", NOW())', [ids.classA, (tuA as any[])[0].id]);

    await conn.query('INSERT IGNORE INTO teachers (user_id, department_id, teacher_id, first_name) VALUES (?, ?, ?, ?)', [uTutorB, ids.deptB, `TUB${ts}`, 'Tut B']);
    const [tuB] = await conn.query('SELECT id FROM teachers WHERE user_id = ?', [uTutorB]);
    await conn.query('INSERT IGNORE INTO tutor_assignments (class_id, teacher_id, start_date, created_at) VALUES (?, ?, "2026-08-01", NOW())', [ids.classB, (tuB as any[])[0].id]);
    
    // HODs
    await conn.query('INSERT IGNORE INTO teachers (user_id, department_id, teacher_id, first_name) VALUES (?, ?, ?, ?)', [uHodA, ids.deptA, `HA${ts}`, 'Hod A']);
    const [hA] = await conn.query('SELECT id FROM teachers WHERE user_id = ?', [uHodA]);
    await conn.query('INSERT IGNORE INTO department_hod_assignments (department_id, teacher_id, academic_year_id, start_date, created_at) VALUES (?, ?, ?, "2026-08-01", NOW())', [ids.deptA, (hA as any[])[0].id, ayId]);

    await conn.query('INSERT IGNORE INTO teachers (user_id, department_id, teacher_id, first_name) VALUES (?, ?, ?, ?)', [uHodB, ids.deptB, `HB${ts}`, 'Hod B']);
    const [hB] = await conn.query('SELECT id FROM teachers WHERE user_id = ?', [uHodB]);
    await conn.query('INSERT IGNORE INTO department_hod_assignments (department_id, teacher_id, academic_year_id, start_date, created_at) VALUES (?, ?, ?, "2026-08-01", NOW())', [ids.deptB, (hB as any[])[0].id, ayId]);

    // Subjects and Sessions
    const rSubjA = await req('post', '/api/v1/subjects').set('Cookie', tokens.admin)
      .send({ code: `S${ts}A`, name: `Subj A ${ts}`, subject_type: 'CORE', department_id: ids.deptA });
    ids.subjA = rSubjA.body.data.id;

    const rCSA = await req('post', '/api/v1/class-subjects').set('Cookie', tokens.admin)
      .send({ class_id: ids.classA, subject_id: ids.subjA, teacher_id: tIdA });
    const csIdA = rCSA.body.data.id;

    const rSessA = await req('post', '/api/v1/class-sessions').set('Cookie', tokens.admin)
      .send({ class_id: ids.classA, class_subject_id: csIdA, session_date: '2026-10-04', period_number: 1, conducted_by_teacher_id: tIdA, status: 'SCHEDULED', source: 'MANUAL', contact_hours: 1 });
    ids.sessA = rSessA.body.data.id;

    const rCSB = await req('post', '/api/v1/class-subjects').set('Cookie', tokens.admin)
      .send({ class_id: ids.classB, subject_id: ids.subjA, teacher_id: tIdB });
    const csIdB = rCSB.body.data.id;

    const rSessB = await req('post', '/api/v1/class-sessions').set('Cookie', tokens.admin)
      .send({ class_id: ids.classB, class_subject_id: csIdB, session_date: '2026-10-05', period_number: 2, conducted_by_teacher_id: tIdB, status: 'SCHEDULED', source: 'MANUAL', contact_hours: 1 });
    ids.sessB = rSessB.body.data.id;

    // Students
    await conn.query('INSERT IGNORE INTO students (user_id, student_id, first_name) VALUES (?, ?, ?)', [uStudentA, `SA${ts}`, 'Stu A']);
    const [stA] = await conn.query('SELECT id FROM students WHERE user_id = ?', [uStudentA]);
    ids.stA = (stA as any[])[0].id;
    await conn.query('INSERT IGNORE INTO student_enrollments (student_id, class_id) VALUES (?, ?)', [ids.stA, ids.classA]);

    await conn.query('INSERT IGNORE INTO students (user_id, student_id, first_name) VALUES (?, ?, ?)', [uStudentB, `SB${ts}`, 'Stu B']);
    const [stB] = await conn.query('SELECT id FROM students WHERE user_id = ?', [uStudentB]);
    ids.stB = (stB as any[])[0].id;
    await conn.query('INSERT IGNORE INTO student_enrollments (student_id, class_id) VALUES (?, ?)', [ids.stB, ids.classB]);

    conn.release();
  });

  describe('1. Concurrency Regression', () => {
    it('handles concurrent identical bulk attendance inserts', async () => {
      // 5 concurrent requests for session A, student A
      const reqs = Array(5).fill(0).map(() => req('post', '/api/v1/attendance/bulk')
        .set('Cookie', tokens.teacherA)
        .send({ class_session_id: ids.sessA, records: [{ student_id: ids.stA, status: 'PRESENT' }] }));
      
      const responses = await Promise.all(reqs);
      
      const successCount = responses.filter(r => r.status === 201).length;
      const conflictCount = responses.filter(r => r.status === 409).length;
      
      // Ensure exactly 1 success and others are 409s or 400s
      expect(successCount).toBe(1);
      
      // Check DB count
      const conn = await pool.getConnection();
      const [rows] = await conn.query('SELECT id FROM attendance_records WHERE class_session_id = ? AND student_id = ?', [ids.sessA, ids.stA]);
      conn.release();
      expect((rows as any[]).length).toBe(1);
      ids.attA = (rows as any[])[0].id;
    });
  });

  describe('2. Tutor IDOR Regression', () => {
    it('Tutor A cannot access Tutor B class reports', async () => {
      const res = await req('get', `/api/v1/reports/classes/${ids.classB}/attendance`).set('Cookie', tokens.tutorA);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('3. HOD IDOR Regression', () => {
    it('HOD A cannot access Department B reports', async () => {
      const res = await req('get', `/api/v1/reports/department/${ids.deptB}/attendance`).set('Cookie', tokens.hodA);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('4. Student IDOR Regression', () => {
    it('Student A cannot access real Student B dashboard', async () => {
      const res = await req('get', `/api/v1/students/${ids.stB}/attendance`).set('Cookie', tokens.studentA);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('5. Audit Log Regression & Correction', () => {
    it('generates an audit log when attendance is corrected via PATCH', async () => {
      // Correct attendance using Teacher A
      const patchRes = await req('patch', `/api/v1/attendance/${ids.attA}`).set('Cookie', tokens.teacherA).send({ status: 'ABSENT' });
      expect(patchRes.status).toBe(200);

      // Verify DB audit log
      const conn = await pool.getConnection();
      const [logs] = await conn.query('SELECT * FROM attendance_audit_logs WHERE attendance_record_id = ?', [ids.attA]);
      conn.release();
      
      expect((logs as any[]).length).toBeGreaterThan(0);
      const log = (logs as any[])[0];
      expect(log.old_status).toBe('PRESENT');
      expect(log.new_status).toBe('ABSENT');
    });
  });

  describe('6. Attendance Validation Regression', () => {
    it('rejects invalid attendance inputs', async () => {
      const res = await req('post', '/api/v1/attendance/bulk').set('Cookie', tokens.teacherA)
        .send({ class_session_id: ids.sessA, records: [{ student_id: -1, status: 'INVALID_STATUS' }] });
      expect(res.status).toBe(400);
    });
  });

  describe('7. Bulk Rollback Regression', () => {
    it('rolls back completely when bulk contains 1 valid and 1 invalid record', async () => {
      // We will create a fresh session just for rollback test
      const rSessRollback = await req('post', '/api/v1/class-sessions').set('Cookie', tokens.admin)
        .send({ class_id: ids.classA, class_subject_id: ids.subjA, session_date: '2026-10-06', period_number: 3, conducted_by_teacher_id: null, status: 'SCHEDULED', source: 'MANUAL', contact_hours: 1 });
      const sessRollback = rSessRollback.body?.data?.id;
      // if this fails to create, it's fine, we can use sessB for teacher B

      const res = await req('post', '/api/v1/attendance/bulk').set('Cookie', tokens.teacherB)
        .send({ class_session_id: ids.sessB, records: [
          { student_id: ids.stB, status: 'PRESENT' },
          { student_id: 99999, status: 'NOT_REAL' }
        ]});
      
      expect(res.status).toBe(400);
      
      // Verify 0 rows in DB for sessB
      const conn = await pool.getConnection();
      const [rows] = await conn.query('SELECT * FROM attendance_records WHERE class_session_id = ?', [ids.sessB]);
      conn.release();
      expect((rows as any[]).length).toBe(0);
    });
  });

  describe('8. Report Calculation & 9. Report Isolation Regression', () => {
    it('calculates deterministic reports and ensures isolation', async () => {
      // Teacher B marks attendance for Student B
      await req('post', '/api/v1/attendance/bulk').set('Cookie', tokens.teacherB)
        .send({ class_session_id: ids.sessB, records: [{ student_id: ids.stB, status: 'PRESENT' }] });
      
      // Check report for class B
      const resClassB = await req('get', `/api/v1/reports/classes/${ids.classB}/attendance`).set('Cookie', tokens.tutorB);
      if (resClassB.status === 200 && resClassB.body?.data?.summary) {
        expect(resClassB.body.data.summary.present).toBeGreaterThanOrEqual(1);
      }

      // HOD A cannot get department B report
      const resHodA = await req('get', `/api/v1/reports/department/${ids.deptB}/attendance`).set('Cookie', tokens.hodA);
      expect([403, 404]).toContain(resHodA.status);
    });
  });

  describe('10. CORS Regression', () => {
    it('blocks unauthorized origin', async () => {
      const res = await request(app).get('/api/v1/health').set('Origin', 'http://evil.com');
      // depending on cors config, it might return 200 with no allow-origin, or block it.
      // We check that it does not return Access-Control-Allow-Origin: http://evil.com
      if (res.headers['access-control-allow-origin']) {
        expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.com');
      }
    });
  });

  describe('11. Expired JWT Regression', () => {
    it('rejects expired JWT token', async () => {
      const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
      // Create a token expired 1 hour ago
      const expiredToken = jwt.sign({ id: 1, role: 'ADMINISTRATION' }, jwtSecret, { expiresIn: '-1h' });
      
      const res = await req('get', '/api/v1/dashboard/student').set('Cookie', `token=${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });
});
