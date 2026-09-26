import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/students/students.repository';
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

describe('Students Module', () => {
  let adminToken: string;
  let studentToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'student-token') return { id: 2, role: 'STUDENT', username: 'student' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
    studentToken = 'student-token';
  });

  it('GET /api/v1/students allows any auth user', async () => {
    vi.spyOn(repo, 'getStudents').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/students').set('Cookie', [`token=${studentToken}`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/students prevents non-admins', async () => {
    const res = await request(app).post('/api/v1/students').set('Cookie', [`token=${studentToken}`]).send({});
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/students handles duplicates', async () => {
    vi.spyOn(repo, 'createStudent').mockRejectedValue({ code: 'ER_DUP_ENTRY' });
    const res = await request(app).post('/api/v1/students').set('Cookie', [`token=${adminToken}`]).send({
      user_id: 1, student_id: 'S1', first_name: 'John'
    });
    expect(res.status).toBe(409);
  });
  
  it('PATCH /api/v1/students/:id updates student', async () => {
    vi.spyOn(repo, 'getStudentById').mockResolvedValue({ id: 1, status: 'ACTIVE' });
    vi.spyOn(repo, 'updateStudent').mockResolvedValue();
    const res = await request(app).patch('/api/v1/students/1').set('Cookie', [`token=${adminToken}`]).send({ first_name: 'Jane' });
    expect(res.status).toBe(200);
  });

  it('DELETE /api/v1/students/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getStudentById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateStudent').mockResolvedValue();
    const res = await request(app).delete('/api/v1/students/1').set('Cookie', [`token=${adminToken}`]);
    expect(res.status).toBe(204);
  });
});
