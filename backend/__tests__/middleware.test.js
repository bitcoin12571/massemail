import { authMiddleware } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('Middleware', () => {
  describe('errorHandler', () => {
    it('should handle file size errors', () => {
      const error = { code: 'LIMIT_FILE_SIZE' };
      const req = { requestId: 'test-id' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('10 MB') })
      );
    });

    it('should handle file count errors', () => {
      const error = { code: 'LIMIT_FILE_COUNT' };
      const req = { requestId: 'test-id' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('5 attachments') })
      );
    });

    it('should handle MulterError', () => {
      const error = { name: 'MulterError', message: 'File too large' };
      const req = { requestId: 'test-id' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle validation errors', () => {
      const error = { name: 'ValidationError', message: 'Invalid input' };
      const req = { requestId: 'test-id' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle custom status errors', () => {
      const error = { status: 404, message: 'Not found' };
      const req = { requestId: 'test-id' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should mask 5xx errors in response', () => {
      const error = { status: 500, message: 'Internal error details' };
      const req = { requestId: 'test-id' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Internal server error' })
      );
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const req = { requestId: 'test-id' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ stack: expect.any(String) })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('authMiddleware', () => {
    it('should allow requests without token in demo mode', () => {
      const originalEnv = {
        VERCEL: process.env.VERCEL,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
        DATABASE_URL: process.env.DATABASE_URL
      };

      process.env.VERCEL = undefined;
      process.env.ADMIN_PASSWORD = undefined;
      process.env.DATABASE_URL = undefined;

      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('admin');

      Object.assign(process.env, originalEnv);
    });

    it('should reject requests without token in production', () => {
      const originalPassword = process.env.ADMIN_PASSWORD;
      process.env.ADMIN_PASSWORD = 'somepassword';

      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();

      process.env.ADMIN_PASSWORD = originalPassword;
    });

    it('should handle malformed JWT', () => {
      const originalPassword = process.env.ADMIN_PASSWORD;
      process.env.ADMIN_PASSWORD = 'somepassword';

      const req = {
        headers: { authorization: 'Bearer invalid.jwt.token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);

      process.env.ADMIN_PASSWORD = originalPassword;
    });
  });
});
