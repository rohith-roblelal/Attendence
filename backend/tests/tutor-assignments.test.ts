import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/tutor-assignments/tutor-assignments.repository';
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

describe('Tutor Assignments Module', () => {
  let adminToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
  });

  it('GET /api/v1/tutor-assignments works', async () => {
    vi.spyOn(repo, 'getAssignments').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/tutor-assignments').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/tutor-assignments creates and ends previous assignment transactionally', async () => {
    const conn = {
      beginTransaction: vi.fn(),
      query: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (pool.getConnection as any).mockResolvedValue(conn);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, class_id: 1, teacher_id: 1 });
    
    const res = await request(app).post('/api/v1/tutor-assignments').set('Cookie', [`token=${adminToken}`]).send({
      class_id: 1, teacher_id: 1
    });
    expect(res.status).toBe(201);
    expect(conn.query).toHaveBeenCalledTimes(2);
    expect(conn.commit).toHaveBeenCalled();
  });
  
  it('DELETE /api/v1/tutor-assignments/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateAssignment').mockResolvedValue();
    const res = await request(app).delete('/api/v1/tutor-assignments/1').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(204);
  });
});
