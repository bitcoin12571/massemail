import jwt from 'jsonwebtoken';
import logger from '../services/logger.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    if (process.env.VERCEL) {
      throw new Error('JWT_SECRET environment variable is required on Vercel');
    }
    return 'dev-secret-change-in-production';
  }
  return secret;
}

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    // Demo mode: allow without token if no auth is configured
    if (!process.env.VERCEL && !process.env.ADMIN_PASSWORD && !process.env.DATABASE_URL) {
      req.user = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'demo@mailora.local',
        role: 'admin'
      };
      return next();
    }
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    // JWT payload contains: id, email, role from issueToken in auth.js
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('AUTH', 'Token expired');
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn('AUTH', 'Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('AUTH', 'Token verification error', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
