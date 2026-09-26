import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as authRepo from '../src/modules/auth/auth.repository';
import * as argon2 from 'argon2';

vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
    },
  };
});

describe('POST /api/v1/auth/login', () => {
  it('should return token and set cookie on successful login', async () => {
    const password = 'password123';
    const passwordHash = await argon2.hash(password);

    vi.spyOn(authRepo, 'findUserWithRole').mockResolvedValue({
      id: 1,
      username: 'admin',
      role: 'ADMINISTRATION',
      password_hash: passwordHash,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.role).toBe('ADMINISTRATION');
    
    // Check if cookie is set
    const cookies = res.header['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=.+; Max-Age=3600; Path=\//);
  });

  it('should return 401 on invalid credentials', async () => {
    vi.spyOn(authRepo, 'findUserWithRole').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'unknown', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});
