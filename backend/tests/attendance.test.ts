import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/attendance/attendance.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/modules/rbac/rbac.service', () => ({
  canManageSession: vi.fn().mockResolvedValue(true),
  getSessionByAttendanceId: vi.fn().mockResolvedValue({ id: 1, class_id: 1, class_subject_id: 1, conducted_by_teacher_id: 1 })
}));

vi.mock('../src/db/pool', () => {
  return { 
    pool: { 
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
      getConnection: vi.fn().mockResolvedValue({
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        query: vi.fn().mockResolvedValue([[{ '1': 1 }]])
      })
    } 
  };
});

describe('Attendance Module', () => {
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'teacher-token') return { id: 2, role: 'TEACHER', username: 'teacher' };
      if (token === 'student-token') return { id: 3, role: 'STUDENT', username: 'student' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
    teacherToken = 'teacher-token';
    studentToken = 'student-token';
  });

  it('GET allows authenticated read', async () => {
    vi.spyOn(repo, 'getAttendance').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/attendance').set('Cookie', [`token=${teacherToken}`]);
    expect(res.status).toBe(200);
  });

  it('POST prevents student', async () => {
    const res = await request(app).post('/api/v1/attendance').set('Cookie', [`token=${studentToken}`]).send({
      class_session_id: 1, student_id: 1, status: 'PRESENT'
    });
    expect(res.status).toBe(403);
  });

  it('POST creates attendance safely inside transaction', async () => {
    vi.spyOn(repo, 'getSessionInfo').mockResolvedValue({ id: 1, class_id: 1, session_date: '2026-09-24', status: 'CONDUCTED' } as any);
    vi.spyOn(repo, 'getActiveStudentEnrollment').mockResolvedValue({ id: 1 } as any);
    vi.spyOn(repo, 'createAttendance').mockResolvedValue(1);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 } as any);
    
    const res = await request(app).post('/api/v1/attendance').set('Cookie', [`token=${teacherToken}`]).send({
      class_session_id: 1, student_id: 1, status: 'PRESENT'
    });
    expect(res.status).toBe(201);
  });

  it('POST prevents attendance for cancelled session', async () => {
    vi.spyOn(repo, 'getSessionInfo').mockResolvedValue({ id: 1, class_id: 1, session_date: '2026-09-24', status: 'CANCELLED' } as any);
    
    const res = await request(app).post('/api/v1/attendance').set('Cookie', [`token=${teacherToken}`]).send({
      class_session_id: 1, student_id: 1, status: 'PRESENT'
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('cancelled session');
  });

  it('POST prevents attendance for student not enrolled', async () => {
    vi.spyOn(repo, 'getSessionInfo').mockResolvedValue({ id: 1, class_id: 1, session_date: '2026-09-24', status: 'CONDUCTED' } as any);
    vi.spyOn(repo, 'getActiveStudentEnrollment').mockResolvedValue(null);
    
    const res = await request(app).post('/api/v1/attendance').set('Cookie', [`token=${teacherToken}`]).send({
      class_session_id: 1, student_id: 1, status: 'PRESENT'
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('not enrolled');
  });

  it('POST /bulk handles duplicates internally', async () => {
    vi.spyOn(repo, 'getSessionInfo').mockResolvedValue({ id: 1, class_id: 1, session_date: '2026-09-24', status: 'CONDUCTED' } as any);
    
    const res = await request(app).post('/api/v1/attendance/bulk').set('Cookie', [`token=${teacherToken}`]).send({
      class_session_id: 1, 
      records: [
        { student_id: 1, status: 'PRESENT' },
        { student_id: 1, status: 'ABSENT' }
      ]
    });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain('Duplicate student IDs');
  });

  it('PATCH updates and creates audit log', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, status: 'PRESENT', student_id: 1, class_session_id: 1 } as any);
    const updateSpy = vi.spyOn(repo, 'updateAttendance').mockResolvedValue();
    const auditSpy = vi.spyOn(repo, 'createAuditLog').mockResolvedValue();
    
    const res = await request(app).patch('/api/v1/attendance/1').set('Cookie', [`token=${adminToken}`]).send({
      status: 'ABSENT', reason: 'mistake'
    });
    
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalled();
    expect(auditSpy).toHaveBeenCalled();
  });
  
  it('GET /student-summary returns correct calculation', async () => {
    vi.spyOn(repo, 'getStudentAttendanceSummary').mockResolvedValue([
      { subject_name: 'Data Structures', present_contact_hours: 18, total_conducted_contact_hours: 21, attendance_percentage: 85.71 }
    ]);
    const res = await request(app).get('/api/v1/students/1/attendance').set('Cookie', [`token=${studentToken}`]);
    expect(res.status).toBe(200);
    expect(res.body.data[0].attendance_percentage).toBe(85.71);
  });
});
