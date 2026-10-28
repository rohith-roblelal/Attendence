import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/teachers/teachers.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: { query: vi.fn().mockResolvedValue([[{ '1': 1 }]]) },
  };
});

describe('Teachers Module', () => {
  let adminToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
  });

  it('GET /api/v1/teachers works', async () => {
    vi.spyOn(repo, 'getTeachers').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/teachers').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/teachers creates teacher', async () => {
    vi.spyOn(repo, 'createTeacher').mockResolvedValue(1);
    vi.spyOn(repo, 'getTeacherById').mockResolvedValue({ id: 1, first_name: 'John' });
    const res = await request(app).post('/api/v1/teachers').set('Cookie', [`token=${adminToken}`]).send({
      user_id: 1, teacher_id: 'T1', first_name: 'John'
    });
    expect(res.status).toBe(201);
  });
  
  it('DELETE /api/v1/teachers/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getTeacherById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateTeacher').mockResolvedValue();
    const res = await request(app).delete('/api/v1/teachers/1').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(204);
  });
});
