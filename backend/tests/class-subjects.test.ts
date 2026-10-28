import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/class-subjects/class-subjects.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
      getConnection: vi.fn().mockResolvedValue({
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([[{ id: 1 }]]), // mock existing active assignment
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      }),
    },
  };
});

describe('Class Subjects Module', () => {
  let adminToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
  });

  it('GET /api/v1/class-subjects works', async () => {
    vi.spyOn(repo, 'getAssignments').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/class-subjects').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/class-subjects creates and ends previous assignment transactionally', async () => {
    const conn = {
      beginTransaction: vi.fn(),
      query: vi.fn()
        .mockResolvedValueOnce([[{ id: 1 }]]) // find existing
        .mockResolvedValueOnce([]) // update old
        .mockResolvedValueOnce([{ insertId: 2 }]), // insert new
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (pool.getConnection as any).mockResolvedValue(conn);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 2, class_id: 1, subject_id: 1, teacher_id: 2 });
    
    const res = await request(app).post('/api/v1/class-subjects').set('Cookie', [`token=${adminToken}`]).send({
      class_id: 1, subject_id: 1, teacher_id: 2
    });
    expect(res.status).toBe(201);
    expect(conn.query).toHaveBeenCalledTimes(3); // SELECT, UPDATE, INSERT
    expect(conn.commit).toHaveBeenCalled();
  });
  
  it('DELETE /api/v1/class-subjects/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateAssignment').mockResolvedValue();
    const res = await request(app).delete('/api/v1/class-subjects/1').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(204);
  });
});
