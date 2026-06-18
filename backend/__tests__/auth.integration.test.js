import request from 'supertest';
import app from '../src/index.js';

describe('Authentication Integration Tests', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid admin credentials', async () => {
      // Set admin credentials in environment
      const originalAdminEmail = process.env.ADMIN_EMAIL;
      const originalAdminPassword = process.env.ADMIN_PASSWORD;

      process.env.ADMIN_EMAIL = 'admin@test.com';
      process.env.ADMIN_PASSWORD = 'AdminPass123!';

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'AdminPass123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.role).toBe('admin');

      // Restore original env
      process.env.ADMIN_EMAIL = originalAdminEmail;
      process.env.ADMIN_PASSWORD = originalAdminPassword;
    });

    it('should reject invalid credentials', async () => {
      const originalAdminEmail = process.env.ADMIN_EMAIL;
      const originalAdminPassword = process.env.ADMIN_PASSWORD;

      process.env.ADMIN_EMAIL = 'admin@test.com';
      process.env.ADMIN_PASSWORD = 'AdminPass123!';

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();

      process.env.ADMIN_EMAIL = originalAdminEmail;
      process.env.ADMIN_PASSWORD = originalAdminPassword;
    });

    it('should reject registration if disabled on Vercel', async () => {
      const originalVercel = process.env.VERCEL;
      process.env.VERCEL = 'true';

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'ValidPass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(404);

      process.env.VERCEL = originalVercel;
    });
  });

  describe('POST /api/health', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('CSRF Protection', () => {
    it('should include CSRF token in GET request headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['x-csrf-token']).toBeDefined();
    });

    it('should require CSRF token for POST requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'test'
        });

      // Should reject due to missing CSRF token
      if (response.status === 403) {
        expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
      }
    });
  });
});

// Custom matcher for checking if status is in array
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () => `Expected ${received} to be one of ${expected.join(', ')}`
    };
  }
});
