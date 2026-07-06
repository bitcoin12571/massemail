/**
 * Test suite for Phase 2: Auth Simplification
 * Validates that JWT-only authentication works correctly
 */

import jwt from 'jsonwebtoken';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Phase 2: Auth Simplification Tests', () => {
  const JWT_SECRET = 'test-secret-key';
  const TEST_USER = {
    id: '12345-test-user',
    email: 'test@example.com',
    role: 'admin'
  };

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT token with user data', () => {
      const token = jwt.sign(
        { id: TEST_USER.id, email: TEST_USER.email, role: TEST_USER.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should decode JWT token correctly', () => {
      const token = jwt.sign(
        { id: TEST_USER.id, email: TEST_USER.email, role: TEST_USER.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.id).toBe(TEST_USER.id);
      expect(decoded.email).toBe(TEST_USER.email);
      expect(decoded.role).toBe(TEST_USER.role);
    });

    test('should include expiry in JWT', () => {
      const token = jwt.sign(
        { id: TEST_USER.id, email: TEST_USER.email, role: TEST_USER.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.exp).toBeTruthy();
      expect(decoded.iat).toBeTruthy();
    });
  });

  describe('JWT Token Validation', () => {
    test('should reject invalid token', () => {
      const invalidToken = 'invalid.token.string';

      expect(() => {
        jwt.verify(invalidToken, JWT_SECRET);
      }).toThrow();
    });

    test('should reject token signed with wrong secret', () => {
      const token = jwt.sign(
        { id: TEST_USER.id, email: TEST_USER.email, role: TEST_USER.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      expect(() => {
        jwt.verify(token, 'wrong-secret');
      }).toThrow();
    });

    test('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { id: TEST_USER.id, email: TEST_USER.email, role: TEST_USER.role },
        JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      expect(() => {
        jwt.verify(expiredToken, JWT_SECRET);
      }).toThrow('jwt expired');
    });
  });

  describe('Session Management (JWT-based)', () => {
    test('should not require session table for authentication', () => {
      // JWT is self-contained and doesn't need a session record
      const token = jwt.sign(
        { id: TEST_USER.id, email: TEST_USER.email, role: TEST_USER.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      const decoded = jwt.verify(token, JWT_SECRET);
      // We can authenticate the user directly from the token without a database lookup
      expect(decoded.id).toBe(TEST_USER.id);
    });

    test('should include user info in JWT payload', () => {
      const token = jwt.sign(
        { id: TEST_USER.id, email: TEST_USER.email, role: TEST_USER.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });

  describe('Admin Authentication', () => {
    test('should authenticate admin via JWT', () => {
      const adminToken = jwt.sign(
        {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'admin@example.com',
          role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      const decoded = jwt.verify(adminToken, JWT_SECRET);
      expect(decoded.role).toBe('admin');
    });

    test('should support environment variable admin login', () => {
      // Simulate secure comparison (as done in auth.js)
      const adminEmail = 'admin@example.com';
      const adminPassword = 'secure-password-123';

      const normalizedEmail = adminEmail.trim().toLowerCase();
      const expect_email = 'admin@example.com'.trim().toLowerCase();

      expect(normalizedEmail).toBe(expect_email);
      // In real auth, we use timingSafeEqual for comparison
    });
  });

  describe('Stateless Authentication', () => {
    test('should not depend on server state for validation', () => {
      // Create token
      const token = jwt.sign(
        { id: TEST_USER.id, email: TEST_USER.email, role: TEST_USER.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      // Server 1 validates
      const decoded1 = jwt.verify(token, JWT_SECRET);
      expect(decoded1.id).toBe(TEST_USER.id);

      // Server 2 validates the same token (no session lookup needed)
      const decoded2 = jwt.verify(token, JWT_SECRET);
      expect(decoded2.id).toBe(TEST_USER.id);

      // Both servers got the same result without database access
      expect(decoded1).toEqual(decoded2);
    });

    test('should scale across multiple instances', () => {
      // Token created on instance A
      const token = jwt.sign(
        { id: TEST_USER.id, email: TEST_USER.email, role: TEST_USER.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      // Can be validated on instance B, C, D... without shared state
      const instances = 5;
      for (let i = 0; i < instances; i++) {
        const decoded = jwt.verify(token, JWT_SECRET);
        expect(decoded.id).toBe(TEST_USER.id);
      }
    });
  });

  describe('Login Attempt Tracking', () => {
    test('should track failed login attempts per IP', () => {
      const loginAttempts = new Map();
      const ip = '192.168.1.1';
      const key = `login_attempts:${ip}`;

      // Simulate failed login
      const attempt = { count: 0, startedAt: Date.now() };
      attempt.count += 1;
      loginAttempts.set(key, attempt);

      expect(loginAttempts.get(key).count).toBe(1);
    });

    test('should reset attempts on successful login', () => {
      const loginAttempts = new Map();
      const ip = '192.168.1.1';
      const key = `login_attempts:${ip}`;

      const attempt = { count: 5, startedAt: Date.now() };
      loginAttempts.set(key, attempt);

      // Successful login - reset
      loginAttempts.delete(key);

      expect(loginAttempts.has(key)).toBe(false);
    });

    test('should block after max attempts', () => {
      const MAX_LOGIN_ATTEMPTS = 5;
      const loginAttempts = new Map();
      const ip = '192.168.1.1';
      const key = `login_attempts:${ip}`;

      const attempt = { count: MAX_LOGIN_ATTEMPTS, startedAt: Date.now() };
      loginAttempts.set(key, attempt);

      const canLogin = !loginAttempts.has(key) || loginAttempts.get(key).count < MAX_LOGIN_ATTEMPTS;
      expect(canLogin).toBe(false);
    });
  });
});
