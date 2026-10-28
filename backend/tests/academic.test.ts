import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/academic/academic.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
    },
  };
});

describe('Academic Module', () => {
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

  describe('Academic Years', () => {
    it('GET /api/v1/academic-years should allow any authenticated user', async () => {
      vi.spyOn(repo, 'getAcademicYears').mockResolvedValue([{ id: 1, name: '2026-2027' }]);
      const res = await request(app).get('/api/v1/academic-years').set('Cookie', [`token=${studentToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('POST /api/v1/academic-years should create academic year if ADMINISTRATION', async () => {
      vi.spyOn(repo, 'createAcademicYear').mockResolvedValue(1);
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, name: '2026-2027' });

      const res = await request(app)
        .post('/api/v1/academic-years')
        .set('Cookie', [`token=${adminToken}`])
        .send({ name: '2026-2027', start_date: '2026-06-01', end_date: '2027-05-31' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('2026-2027');
    });

    it('POST /api/v1/academic-years should reject non-ADMINISTRATION', async () => {
      const res = await request(app)
        .post('/api/v1/academic-years')
        .set('Cookie', [`token=${studentToken}`])
        .send({ name: '2026-2027', start_date: '2026-06-01', end_date: '2027-05-31' });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/academic-years should validate date ranges', async () => {
      const res = await request(app)
        .post('/api/v1/academic-years')
        .set('Cookie', [`token=${adminToken}`])
        .send({ name: '2026-2027', start_date: '2027-06-01', end_date: '2026-05-31' }); // start after end

      expect(res.status).toBe(400); // Zod validation failure
    });
  });
  
  describe('Departments', () => {
    it('GET /api/v1/departments should work with filters', async () => {
      vi.spyOn(repo, 'getDepartments').mockResolvedValue([]);
      const res = await request(app).get('/api/v1/departments?is_active=true').set('Cookie', [`token=${adminToken}`]);
      expect(res.status).toBe(200);
    });
  });

  describe('Semesters', () => {
    it('POST /api/v1/semesters handles duplicate errors', async () => {
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      const res = await request(app)
        .post('/api/v1/semesters')
        .set('Cookie', [`token=${adminToken}`])
        .send({ academic_year_id: 1, semester_number: 1, name: 'Fall 2026', start_date: '2026-08-01', end_date: '2026-12-31' });

      expect(res.status).toBe(409);
    });

    it('DELETE /api/v1/semesters/:id handles reference errors', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_ROW_IS_REFERENCED_2' });

      const res = await request(app)
        .delete('/api/v1/semesters/1')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(409);
    });
  });
});
