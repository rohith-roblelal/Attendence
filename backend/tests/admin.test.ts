import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as adminRepo from '../src/modules/admin/admin.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password')
}));

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

describe('Administration Module', () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'user-token') return { id: 2, role: 'STUDENT', username: 'student' };
      throw new Error('Invalid token');
    });

    adminToken = 'admin-token';
    userToken = 'user-token';
  });

  describe('POST /api/v1/admin/users', () => {
    it('should create a user when authenticated as ADMINISTRATION', async () => {
      vi.spyOn(adminRepo, 'getRoleByName').mockResolvedValue({ id: 2, name: 'TEACHER' });
      vi.spyOn(adminRepo, 'getUserByUsername').mockResolvedValue(null);
      vi.spyOn(adminRepo, 'createUser').mockResolvedValue(10);
      vi.spyOn(adminRepo, 'getUserById').mockResolvedValue({
        id: 10,
        username: 'teacher1',
        role: 'TEACHER',
        email: null,
        phone: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Cookie', [`token=${adminToken}`])
        .send({
          username: 'teacher1',
          password: 'securepassword',
          role: 'TEACHER'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.role).toBe('TEACHER');
      expect(res.body.data.user.password).toBeUndefined(); // Should not return password
    });

    it('should return 403 when authenticated as non-ADMINISTRATION', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Cookie', [`token=${userToken}`])
        .send({
          username: 'teacher1',
          password: 'securepassword',
          role: 'TEACHER'
        });

      expect(res.status).toBe(403);
    });

    it('should return 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .send({
          username: 'teacher1',
          password: 'securepassword',
          role: 'TEACHER'
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid role', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Cookie', [`token=${adminToken}`])
        .send({
          username: 'teacher1',
          password: 'securepassword',
          role: 'SUPERADMIN' // Invalid
        });

      expect(res.status).toBe(400); // Zod validation fails
    });

    it('should return 409 for duplicate username', async () => {
      vi.spyOn(adminRepo, 'getRoleByName').mockResolvedValue({ id: 2, name: 'TEACHER' });
      vi.spyOn(adminRepo, 'getUserByUsername').mockResolvedValue({ id: 5 }); // User exists

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Cookie', [`token=${adminToken}`])
        .send({
          username: 'duplicate',
          password: 'securepassword',
          role: 'TEACHER'
        });

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/v1/admin/users/:id', () => {
    it('should deactivate user', async () => {
      vi.spyOn(adminRepo, 'getUserById').mockResolvedValue({
        id: 10,
        username: 'teacher1',
        role: 'TEACHER',
        email: null,
        phone: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      vi.spyOn(adminRepo, 'deactivateUser').mockResolvedValue();

      const res = await request(app)
        .delete('/api/v1/admin/users/10')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(204);
    });
  });
});
