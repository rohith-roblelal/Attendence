import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

// Mock DB pool to prevent actual connections during tests if desired, 
// though for this basic test we can rely on integration if DB is up.
vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
    },
  };
});

describe('GET /api/v1/health', () => {
  it('should return 200 OK and database health status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.message).toBe('Server and Database are healthy');
  });
});
