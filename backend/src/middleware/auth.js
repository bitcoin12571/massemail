import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    if (!process.env.DATABASE_URL) {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mailora-local-development-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
