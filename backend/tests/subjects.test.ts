import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/subjects/subjects.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return { pool: { query: vi.fn().mockResolvedValue([[{ '1': 1 }]]) } };
});

describe('Subjects Module - Role & Authorization Tests', () => {
  let hodToken: string;
  let adminToken: string;
  let teacherToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'hod-token') return { id: 1, role: 'HOD', username: 'hod_user' };
      if (token === 'admin-token') return { id: 2, role: 'ADMINISTRATION', username: 'admin_user' };
      if (token === 'teacher-token') return { id: 3, role: 'TEACHER', username: 'teacher_user' };
      throw new Error('Invalid token');
    });
    hodToken = 'hod-token';
    adminToken = 'admin-token';
    teacherToken = 'teacher-token';
  });

  describe('Read Access', () => {
    it('HOD can list subjects', async () => {
      vi.spyOn(repo, 'getSubjects').mockResolvedValue([{ id: 1, code: 'SUB101', name: 'Mathematics' }]);
      const res = await request(app).get('/api/v1/subjects').set('Cookie', [`token=${hodToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('Admin can list subjects (read-only access)', async () => {
      vi.spyOn(repo, 'getSubjects').mockResolvedValue([{ id: 1, code: 'SUB101', name: 'Mathematics' }]);
      const res = await request(app).get('/api/v1/subjects').set('Cookie', [`token=${adminToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('HOD can get subject by id', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, code: 'SUB101', name: 'Mathematics' });
      const res = await request(app).get('/api/v1/subjects/1').set('Cookie', [`token=${hodToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe('SUB101');
    });

    it('Admin can get subject by id', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, code: 'SUB101', name: 'Mathematics' });
      const res = await request(app).get('/api/v1/subjects/1').set('Cookie', [`token=${adminToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe('SUB101');
    });
  });

  describe('Write Access - HOD Role Permitted', () => {
    it('HOD can create a subject', async () => {
      vi.spyOn(repo, 'createSubject').mockResolvedValue(1);
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, code: 'CS101', name: 'Computer Science', subject_type: 'THEORY' });
      const res = await request(app).post('/api/v1/subjects').set('Cookie', [`token=${hodToken}`]).send({
        code: 'CS101',
        name: 'Computer Science',
        subject_type: 'THEORY'
      });
      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('CS101');
    });

    it('HOD can update a subject', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, code: 'CS101', name: 'Computer Science', subject_type: 'THEORY' });
      vi.spyOn(repo, 'updateSubject').mockResolvedValue();
      const res = await request(app).patch('/api/v1/subjects/1').set('Cookie', [`token=${hodToken}`]).send({
        name: 'Computer Science & Eng'
      });
      expect(res.status).toBe(200);
    });

    it('HOD can delete (deactivate) a subject', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, code: 'CS101' });
      vi.spyOn(repo, 'deleteSubject').mockResolvedValue();
      const res = await request(app).delete('/api/v1/subjects/1').set('Cookie', [`token=${hodToken}`]);
      expect(res.status).toBe(204);
    });
  });

  describe('Write Access - Admin and Others Rejected with 403 Forbidden', () => {
    it('Admin cannot create records through the API (HTTP 403)', async () => {
      const res = await request(app).post('/api/v1/subjects').set('Cookie', [`token=${adminToken}`]).send({
        code: 'CS102',
        name: 'Data Structures',
        subject_type: 'THEORY'
      });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Admin cannot update records through the API (HTTP 403)', async () => {
      const res = await request(app).patch('/api/v1/subjects/1').set('Cookie', [`token=${adminToken}`]).send({
        name: 'Updated Name'
      });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Admin cannot delete records through the API (HTTP 403)', async () => {
      const res = await request(app).delete('/api/v1/subjects/1').set('Cookie', [`token=${adminToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Teacher or other unauthorized users cannot create subjects (HTTP 403)', async () => {
      const res = await request(app).post('/api/v1/subjects').set('Cookie', [`token=${teacherToken}`]).send({
        code: 'CS103',
        name: 'Algorithms',
        subject_type: 'THEORY'
      });
      expect(res.status).toBe(403);
    });

    it('Unauthenticated requests are rejected with 401', async () => {
      const res = await request(app).post('/api/v1/subjects').send({
        code: 'CS104',
        name: 'Networking',
        subject_type: 'THEORY'
      });
      expect(res.status).toBe(401);
    });
  });
});
