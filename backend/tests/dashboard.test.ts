import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as repo from '../src/modules/dashboard/dashboard.repository';
import * as rbacRepo from '../src/modules/rbac/rbac.repository';
import * as authUtils from '../src/modules/auth/auth.utils';
import { pool } from '../src/db/pool';

vi.mock('../src/modules/dashboard/dashboard.repository');
vi.mock('../src/modules/rbac/rbac.repository', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getTeacherIdByUserId: vi.fn(), isHodOfDepartment: vi.fn() };
});
vi.mock('../src/db/pool', () => ({
  pool: { query: vi.fn() }
}));

describe('Dashboard Module', () => {
  let adminToken: string, hodToken: string, tutorToken: string, teacherToken: string, studentToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'hod-token') return { id: 2, role: 'HOD', username: 'hod' };
      if (token === 'tutor-token') return { id: 3, role: 'TUTOR', username: 'tutor' };
      if (token === 'teacher-token') return { id: 4, role: 'TEACHER', username: 'teacher' };
      if (token === 'student-token') return { id: 5, role: 'STUDENT', username: 'student' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
    hodToken = 'hod-token';
    tutorToken = 'tutor-token';
    teacherToken = 'teacher-token';
    studentToken = 'student-token';
  });

  it('GET /administration returns stats', async () => {
    vi.spyOn(repo, 'getAdministrationStats').mockResolvedValue({ counts: {}, attendanceOverview: {} });
    const res = await request(app).get('/api/v1/dashboard/administration').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
  });

  it('GET /hod returns stats for assigned HOD', async () => {
    vi.spyOn(rbacRepo, 'getTeacherIdByUserId').mockResolvedValue(10);
    vi.spyOn(pool, 'query').mockResolvedValue([[{ department_id: 1 }]] as any);
    vi.spyOn(rbacRepo, 'isHodOfDepartment').mockResolvedValue(true);
    vi.spyOn(repo, 'getHodStats').mockResolvedValue({ counts: {}, attendanceOverview: {} });
    const res = await request(app).get('/api/v1/dashboard/hod').set('Cookie', [`token=${hodToken}`]);
    expect(res.status).toBe(200);
  });

  it('GET /tutor returns stats for assigned tutor', async () => {
    vi.spyOn(rbacRepo, 'getTeacherIdByUserId').mockResolvedValue(10);
    vi.spyOn(pool, 'query').mockResolvedValue([[{ class_id: 1 }]] as any);
    vi.spyOn(repo, 'getTutorStats').mockResolvedValue({ counts: {}, attendanceOverview: {}, recentSessions: [] });
    const res = await request(app).get('/api/v1/dashboard/tutor').set('Cookie', [`token=${tutorToken}`]);
    expect(res.status).toBe(200);
  });

  it('GET /teacher returns stats for teacher', async () => {
    vi.spyOn(rbacRepo, 'getTeacherIdByUserId').mockResolvedValue(10);
    vi.spyOn(repo, 'getTeacherStats').mockResolvedValue({ counts: {}, attendanceOverview: {} });
    const res = await request(app).get('/api/v1/dashboard/teacher').set('Cookie', [`token=${teacherToken}`]);
    expect(res.status).toBe(200);
  });

  it('GET /student returns stats for student', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue([[{ id: 100 }]] as any);
    vi.spyOn(repo, 'getStudentStats').mockResolvedValue({ attendance: {} as any, recentAttendance: [] });
    const res = await request(app).get('/api/v1/dashboard/student').set('Cookie', [`token=${studentToken}`]);
    expect(res.status).toBe(200);
  });
});
