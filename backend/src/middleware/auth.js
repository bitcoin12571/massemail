import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
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
    const secret = process.env.JWT_SECRET
      || (!process.env.VERCEL ? 'mailora-local-development-secret' : null);
    if (!secret) {
      return res.status(503).json({ error: 'Authentication is not configured' });
    }

    const decoded = jwt.verify(token, secret);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
