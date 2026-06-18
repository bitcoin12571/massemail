import express from 'express';
import jwt from 'jsonwebtoken';
import { createHash, timingSafeEqual } from 'node:crypto';
import User from '../models/User.js';
import { validatePasswordStrength } from '../utils/passwordValidator.js';

const router = express.Router();
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    // Development only
    if (process.env.VERCEL) {
      throw new Error('JWT_SECRET environment variable is required on Vercel');
    }
    // Local development fallback
    return 'dev-secret-change-in-production';
  }
  return secret;
}

function secureEqual(left = '', right = '') {
  // Always compare as strings, handle nullish values
  const leftStr = String(left || '');
  const rightStr = String(right || '');
  const leftHash = createHash('sha256').update(leftStr).digest();
  const rightHash = createHash('sha256').update(rightStr).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function getLoginAttempt(req) {
  const key = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || now - current.startedAt > LOGIN_WINDOW_MS) {
    const next = { count: 0, startedAt: now };
    loginAttempts.set(key, next);
    return { key, attempt: next };
  }

  return { key, attempt: current };
}

function issueToken(user) {
  const secret = getJwtSecret();
  if (!secret) {
    const error = new Error('Authentication is not configured');
    error.status = 503;
    throw error;
  }

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRE || '12h' }
  );
}

// Register
router.post('/register', async (req, res) => {
  if (process.env.VERCEL || process.env.DISABLE_REGISTRATION === 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { email, password, name } = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({ email, password, name });

    const token = issueToken(user);

    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { key, attempt } = getLoginAttempt(req);
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many login attempts. Try again later.',
      retryAfter: Math.ceil((attempt.startedAt + LOGIN_WINDOW_MS - Date.now()) / 1000)
    });
  }

  try {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const normalizedEmail = email?.trim().toLowerCase() || '';
      const valid = secureEqual(normalizedEmail, adminEmail)
        && secureEqual(password || '', adminPassword);

      if (!valid) {
        attempt.count += 1;
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      loginAttempts.delete(key);
      const user = {
        id: '00000000-0000-4000-8000-000000000001',
        email: adminEmail,
        name: 'Administrator',
        role: 'admin'
      };
      return res.json({ token: issueToken(user), user });
    }

    if (process.env.VERCEL) {
      return res.status(503).json({ error: 'Authentication is not configured' });
    }

    let user = await User.findOne({ where: { email: email?.toLowerCase() } });

    // Check if account is locked
    if (user && user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lockedUntil) - new Date()) / 1000);
      return res.status(429).json({
        error: 'Account is temporarily locked due to too many failed login attempts',
        lockedUntil: user.lockedUntil,
        retryAfter: remainingTime
      });
    }

    // Unlock account if lockout period has expired
    if (user && user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      await user.save();
    }

    if (!user) {
      attempt.count += 1;
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      attempt.count += 1;

      // Increment failed login attempts and lock if necessary
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        // Lock account for 15 minutes
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Successful login - reset attempt counters
    loginAttempts.delete(key);
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = issueToken(user);

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
