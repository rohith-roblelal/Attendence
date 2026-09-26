import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/subjects/subjects.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return { pool: { query: vi.fn().mockResolvedValue([[{ '1': 1 }]]) } };
});

describe('Subjects Module', () => {
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

  it('GET /api/v1/subjects allows any auth user', async () => {
    vi.spyOn(repo, 'getSubjects').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/subjects').set('Cookie', [`token=${teacherToken}`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/subjects prevents non-admins', async () => {
    const res = await request(app).post('/api/v1/subjects').set('Cookie', [`token=${teacherToken}`]).send({});
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/subjects handles duplicates', async () => {
    (pool.query as any).mockRejectedValue({ code: 'ER_DUP_ENTRY' });
    const res = await request(app).post('/api/v1/subjects').set('Cookie', [`token=${adminToken}`]).send({
      code: 'CS101', name: 'Intro', subject_type: 'Core'
    });
    expect(res.status).toBe(409);
  });
  
  it('POST /api/v1/subjects creates subject', async () => {
    vi.spyOn(repo, 'createSubject').mockResolvedValue(1);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, code: 'CS101' });
    const res = await request(app).post('/api/v1/subjects').set('Cookie', [`token=${adminToken}`]).send({
      code: 'CS101', name: 'Intro', subject_type: 'Core'
    });
    expect(res.status).toBe(201);
  });

  it('DELETE /api/v1/subjects/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateSubject').mockResolvedValue();
    const res = await request(app).delete('/api/v1/subjects/1').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(204);
  });
});
