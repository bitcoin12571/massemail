import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Auth Routes', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Import app after DB is initialized
    const module = await import('../src/index.js');
    app = module.default || app;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(res.status).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notanemail',
          password: 'password123'
        });

      expect(res.status).toBe(400);
    });

    it('should be rate limited after 5 attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong'
          });
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong'
        });

      expect(res.status).toBe(429); // Rate limited
    });
  });

  describe('POST /api/auth/register', () => {
    it('should require email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123'
        });

      expect(res.status).toBe(400);
    });

    it('should require valid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid',
          password: 'password123'
        });

      expect(res.status).toBe(400);
    });

    it('should reject weak passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: '123' // Too short/weak
        });

      expect(res.status).toBe(400);
    });
  });
});
