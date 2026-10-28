import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as repo from '../src/modules/reports/reports.repository';
import * as rbacService from '../src/modules/rbac/rbac.service';
import * as rbacRepo from '../src/modules/rbac/rbac.repository';
import * as authUtils from '../src/modules/auth/auth.utils';
import { pool } from '../src/db/pool';

vi.mock('../src/modules/reports/reports.repository');
vi.mock('../src/modules/rbac/rbac.service', () => ({
  canManageDepartment: vi.fn().mockResolvedValue(true),
  canManageClass: vi.fn().mockResolvedValue(true),
  canManageSubject: vi.fn().mockResolvedValue(true),
  canManageSession: vi.fn().mockResolvedValue(true),
  getClassByRegularTimetableId: vi.fn().mockResolvedValue(1),
  getClassByDailyChangeId: vi.fn().mockResolvedValue(1)
}));
vi.mock('../src/modules/rbac/rbac.repository', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, pool: { query: vi.fn() } };
});

describe('Reports Module', () => {
  let adminToken: string, studentToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'student-token') return { id: 5, role: 'STUDENT', username: 'student' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
    studentToken = 'student-token';
  });

  it('GET /students/:id/attendance allows student to view their own', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue([[{ id: 10 }]] as any);
    vi.spyOn(repo, 'getStudentAttendanceReport').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/reports/students/10/attendance').set('Cookie', [`token=${studentToken}`]);
    expect(res.status).toBe(200);
  });

  it('GET /classes/:id/attendance allows admin', async () => {
    vi.spyOn(repo, 'getClassAttendanceReport').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/reports/classes/1/attendance').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
  });

  it('GET /subjects/:id/attendance allows admin', async () => {
    vi.spyOn(repo, 'getSubjectAttendanceReport').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/reports/subjects/1/attendance').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
  });

  it('GET /department/:id/attendance allows admin', async () => {
    vi.spyOn(repo, 'getDepartmentAttendanceReport').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/reports/department/1/attendance').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
  });
});
