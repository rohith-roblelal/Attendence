import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/class-sessions/class-sessions.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/modules/rbac/rbac.service', () => ({
  canManageSession: vi.fn().mockResolvedValue(true)
}));

vi.mock('../src/db/pool', () => {
  return { pool: { query: vi.fn().mockResolvedValue([[{ '1': 1 }]]) } };
});

describe('Class Sessions Module', () => {
  let adminToken: string;
  let teacherToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'teacher-token') return { id: 2, role: 'TEACHER', username: 'teacher' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
    teacherToken = 'teacher-token';
  });

  it('GET allows authenticated read', async () => {
    vi.spyOn(repo, 'getSessions').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/class-sessions').set('Cookie', [`token=${teacherToken}`]);
    expect(res.status).toBe(200);
  });

  it('POST prevents students from creating sessions', async () => {
    // Add student token mock
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'student-token') return { id: 3, role: 'STUDENT', username: 'student' };
      throw new Error('Invalid token');
    });
    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [`token=student-token`]).send({
      class_id: 1, class_subject_id: 1, session_date: '2026-09-24', period_number: 1, status: 'CONDUCTED', source: 'REGULAR'
    });
    expect(res.status).toBe(403);
  });

  it('POST prevents out of scope teachers', async () => {
    const rbac = await import('../src/modules/rbac/rbac.service');
    vi.spyOn(rbac, 'canManageSession').mockResolvedValueOnce(false);
    
    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [`token=${teacherToken}`]).send({
      class_id: 1, class_subject_id: 1, session_date: '2026-09-24', period_number: 1, status: 'CONDUCTED', source: 'REGULAR'
    });
    expect(res.status).toBe(403);
  });

  it('POST prevents duplicate class/date/period', async () => {
    vi.spyOn(repo, 'checkDuplicateSession').mockResolvedValue(true);
    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [`token=${adminToken}`]).send({
      class_id: 1, class_subject_id: 1, session_date: '2026-09-24', period_number: 1, status: 'CONDUCTED', source: 'REGULAR'
    });
    expect(res.status).toBe(409);
  });

  it('POST handles missing permanent teacher', async () => {
    vi.spyOn(repo, 'checkDuplicateSession').mockResolvedValue(false);
    vi.spyOn(repo, 'getAssignedTeacherId').mockResolvedValue(null);
    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [`token=${adminToken}`]).send({
      class_id: 1, class_subject_id: 1, session_date: '2026-09-24', period_number: 1, status: 'CONDUCTED', source: 'REGULAR'
    });
    expect(res.status).toBe(404);
  });
  
  it('POST creates session successfully, resolving assigned teacher natively', async () => {
    vi.spyOn(repo, 'checkDuplicateSession').mockResolvedValue(false);
    vi.spyOn(repo, 'getAssignedTeacherId').mockResolvedValue(5);
    vi.spyOn(repo, 'createSession').mockResolvedValue(1);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, assigned_teacher_id: 5, conducted_by_teacher_id: 8 });
    
    // We send conducted_by_teacher_id = 8, permanent teacher is 5
    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [`token=${adminToken}`]).send({
      class_id: 1, class_subject_id: 1, session_date: '2026-09-24', period_number: 1, 
      conducted_by_teacher_id: 8, status: 'CONDUCTED', source: 'DAILY_CHANGE', contact_hours: 1
    });
    
    expect(res.status).toBe(201);
    // Verifying it correctly respects distinction
    expect(res.body.data.assigned_teacher_id).toBe(5);
    expect(res.body.data.conducted_by_teacher_id).toBe(8);
  });

  it('DELETE cancels session rather than physical delete', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    const cancelSpy = vi.spyOn(repo, 'deleteSession').mockResolvedValue();
    const res = await request(app).delete('/api/v1/class-sessions/1').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(204);
    expect(cancelSpy).toHaveBeenCalledWith(1);
  });
});
