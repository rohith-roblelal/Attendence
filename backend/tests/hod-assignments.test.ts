import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/hod-assignments/hod-assignments.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
      getConnection: vi.fn().mockResolvedValue({
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([{ insertId: 10 }]),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      }),
    },
  };
});

describe('HOD Assignments Module', () => {
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

  it('GET /api/v1/hod-assignments allows any auth user', async () => {
    vi.spyOn(repo, 'getAssignments').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/hod-assignments').set('Cookie', [`token=${teacherToken}`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/hod-assignments prevents non-admins', async () => {
    const res = await request(app).post('/api/v1/hod-assignments').set('Cookie', [`token=${teacherToken}`]).send({});
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/hod-assignments handles referenced entity not found', async () => {
    const conn = {
      beginTransaction: vi.fn(),
      query: vi.fn().mockRejectedValue({ code: 'ER_NO_REFERENCED_ROW_2' }),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (pool.getConnection as any).mockResolvedValue(conn);

    const res = await request(app).post('/api/v1/hod-assignments').set('Cookie', [`token=${adminToken}`]).send({
      department_id: 999, teacher_id: 1, academic_year_id: 1
    });
    expect(res.status).toBe(404);
    expect(conn.rollback).toHaveBeenCalled();
  });
  
  it('POST /api/v1/hod-assignments creates assignment and ends previous', async () => {
    const conn = {
      beginTransaction: vi.fn(),
      query: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (pool.getConnection as any).mockResolvedValue(conn);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, department_id: 1, teacher_id: 2 });
    
    const res = await request(app).post('/api/v1/hod-assignments').set('Cookie', [`token=${adminToken}`]).send({
      department_id: 1, teacher_id: 2, academic_year_id: 1
    });
    expect(res.status).toBe(201);
    expect(conn.query).toHaveBeenCalledTimes(2); // One for UPDATE old, one for INSERT new
    expect(conn.commit).toHaveBeenCalled();
  });

  it('DELETE /api/v1/hod-assignments/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateAssignment').mockResolvedValue();
    const res = await request(app).delete('/api/v1/hod-assignments/1').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(204);
  });
});
