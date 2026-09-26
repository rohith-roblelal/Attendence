import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/classes/classes.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
    },
  };
});

describe('Classes Module', () => {
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

  describe('Classes endpoints', () => {
    it('GET /api/v1/classes should allow any authenticated user and support filtering', async () => {
      vi.spyOn(repo, 'getClasses').mockResolvedValue([{ id: 1, section_name: 'A' }]);
      const res = await request(app).get('/api/v1/classes?is_active=true&department_id=1').set('Cookie', [`token=${studentToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('POST /api/v1/classes should create class if ADMINISTRATION', async () => {
      vi.spyOn(repo, 'createClass').mockResolvedValue(1);
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, section_name: 'A' });

      const res = await request(app)
        .post('/api/v1/classes')
        .set('Cookie', [`token=${adminToken}`])
        .send({ admission_batch_id: 1, semester_id: 1, section_name: 'A' });

      expect(res.status).toBe(201);
      expect(res.body.data.section_name).toBe('A');
    });

    it('POST /api/v1/classes should reject non-ADMINISTRATION', async () => {
      const res = await request(app)
        .post('/api/v1/classes')
        .set('Cookie', [`token=${studentToken}`])
        .send({ admission_batch_id: 1, semester_id: 1, section_name: 'A' });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/classes handles duplicate section errors', async () => {
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      const res = await request(app)
        .post('/api/v1/classes')
        .set('Cookie', [`token=${adminToken}`])
        .send({ admission_batch_id: 1, semester_id: 1, section_name: 'A' });

      expect(res.status).toBe(409);
    });

    it('POST /api/v1/classes handles referenced entity not found', async () => {
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_NO_REFERENCED_ROW_2' });

      const res = await request(app)
        .post('/api/v1/classes')
        .set('Cookie', [`token=${adminToken}`])
        .send({ admission_batch_id: 999, semester_id: 1, section_name: 'A' });

      expect(res.status).toBe(404);
    });

    it('PATCH /api/v1/classes/:id should update class', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, section_name: 'A' });
      vi.spyOn(repo, 'updateClass').mockResolvedValue();

      const res = await request(app)
        .patch('/api/v1/classes/1')
        .set('Cookie', [`token=${adminToken}`])
        .send({ section_name: 'B' });

      expect(res.status).toBe(200);
    });

    it('DELETE /api/v1/classes/:id handles reference errors for deletion', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_ROW_IS_REFERENCED_2' });

      const res = await request(app)
        .delete('/api/v1/classes/1')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(409);
    });
    
    it('DELETE /api/v1/classes/:id deactivates successfully', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
      vi.spyOn(repo, 'deleteClass').mockResolvedValue();

      const res = await request(app)
        .delete('/api/v1/classes/1')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(204);
    });
  });
});