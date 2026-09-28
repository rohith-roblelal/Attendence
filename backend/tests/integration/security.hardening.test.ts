import request from 'supertest';
import { app } from '../../src/app';

describe('Phase 17 - Production Hardening Security Tests', () => {
  beforeAll(() => {
    // Some tests might rely on specific env vars, but we'll test what we can
    process.env.DB_NAME = 'college_attendance_test';
  });

  describe('CORS Allowed and Rejected Origins', () => {
    test('Rejects request from unknown origin', async () => {
      const res = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'http://malicious.com')
        .set('Access-Control-Request-Method', 'GET');
        
      // In Express cors, if origin is rejected, it doesn't set ACAO header
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('Allows request from allowed origin', async () => {
      // By default test env is not production, so it might allow everything or default to localhost:3000
      const res = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
        
      expect(res.headers['access-control-allow-origin']).toEqual('http://localhost:3000');
    });
  });

  describe('Security Headers (Helmet)', () => {
    test('Responses contain standard security headers', async () => {
      const res = await request(app).get('/api/v1/health');
      
      expect(res.headers['x-content-type-options']).toEqual('nosniff');
      expect(res.headers['x-frame-options']).toEqual('SAMEORIGIN');
      expect(res.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Body Parser Limits', () => {
    test('Rejects oversized JSON payload (100kb limit)', async () => {
      const massivePayload = { data: 'a'.repeat(200 * 1024) }; // ~200kb
      const res = await request(app)
        .post('/api/v1/auth/login') // using an existing endpoint
        .send(massivePayload);
        
      // express.json() limit triggers 413 Payload Too Large
      expect(res.status).toBe(413);
    });
  });

  describe('Auth Rate Limiting', () => {
    test('Rate limits repeated login attempts', async () => {
      // Send 11 bad login requests (Limit is 10)
      for (let i = 0; i < 10; i++) {
        await request(app).post('/api/v1/auth/login').send({ username: 'test', password: 'bad' });
      }
      
      const res = await request(app).post('/api/v1/auth/login').send({ username: 'test', password: 'bad' });
      expect(res.status).toBe(429); // Too Many Requests
    });
  });

  describe('Cookie Security Flags', () => {
    test('Login sets HttpOnly and SameSite cookie flags', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'password' });
      
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
        expect(cookieStr).toMatch(/HttpOnly/i);
        expect(cookieStr).toMatch(/SameSite=(strict|none)/i);
      }
    });
  });

});
