import { securityHeaders, generateCsrfToken, verifyCsrfToken } from '../src/middleware/security.js';

describe('Security Middleware', () => {
  describe('securityHeaders', () => {
    it('should add security headers to response', () => {
      const req = {};
      const res = {
        set: jest.fn()
      };
      const next = jest.fn();

      securityHeaders(req, res, next);

      expect(res.set).toHaveBeenCalled();
      const headers = res.set.mock.calls[0][0];
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
      expect(next).toHaveBeenCalled();
    });

    it('should generate and set X-Request-Id header', () => {
      const req = {};
      const res = {
        set: jest.fn()
      };
      const next = jest.fn();

      securityHeaders(req, res, next);

      const headers = res.set.mock.calls[0][0];
      expect(headers['X-Request-Id']).toBeDefined();
      expect(req.requestId).toBeDefined();
    });
  });

  describe('generateCsrfToken', () => {
    it('should generate token for GET requests', () => {
      const req = { method: 'GET' };
      const res = {
        set: jest.fn()
      };
      const next = jest.fn();

      generateCsrfToken(req, res, next);

      expect(res.set).toHaveBeenCalled();
      const headers = res.set.mock.calls[0][0];
      expect(headers['X-CSRF-Token']).toBeDefined();
      expect(req.csrfToken).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should skip token generation for non-GET requests', () => {
      const req = { method: 'POST' };
      const res = { set: jest.fn() };
      const next = jest.fn();

      generateCsrfToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('verifyCsrfToken', () => {
    it('should skip CSRF check for GET requests', () => {
      const req = { method: 'GET', path: '/api/contacts' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      verifyCsrfToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip CSRF check for webhook routes', () => {
      const req = { method: 'POST', path: '/api/webhooks/test' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      verifyCsrfToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip CSRF check for login routes', () => {
      const req = { method: 'POST', path: '/api/auth/login' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      verifyCsrfToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject POST request without CSRF token', () => {
      const req = {
        method: 'POST',
        path: '/api/contacts',
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      verifyCsrfToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_MISSING' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject POST request with invalid CSRF token', () => {
      const req = {
        method: 'POST',
        path: '/api/contacts',
        headers: { 'x-csrf-token': 'invalid-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      verifyCsrfToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_INVALID' })
      );
    });
  });
});
