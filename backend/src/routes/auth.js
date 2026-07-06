import express from 'express';
import jwt from 'jsonwebtoken';
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { createClient } from 'redis';
import User from '../models/User.js';
import { validatePasswordStrength } from '../utils/passwordValidator.js';
import { logLogin, logLogout } from '../services/auditService.js';
import logger from '../services/logger.js';

const router = express.Router();
let redisClient = null;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

// Get Redis client for persistent login attempt tracking
async function getRedisClient() {
  if (!redisClient) {
    try {
      let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      if (redisUrl.startsWith('redis://') && redisUrl.includes('upstash.io')) {
        redisUrl = redisUrl.replace('redis://', 'rediss://');
      }
      redisClient = createClient({ url: redisUrl });
      redisClient.on('error', (err) => {
        logger.error('AUTH', 'Redis error', err);
        redisClient = null;
      });
      await redisClient.connect();
    } catch (error) {
      logger.warn('AUTH', 'Redis unavailable, using in-memory fallback for login attempts');
      return null;
    }
  }
  return redisClient;
}

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

async function getLoginAttempt(req) {
  const ipKey = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  const redisKey = `login_attempts:${ipKey}`;
  const redis = await getRedisClient();

  if (!redis) {
    // Fallback: in-memory Map (single server only)
    const key = ipKey;
    const now = Date.now();
    if (!req.app.loginAttempts) req.app.loginAttempts = new Map();
    const current = req.app.loginAttempts.get(key);

    if (!current || now - current.startedAt > LOGIN_WINDOW_MS) {
      const next = { count: 0, startedAt: now };
      req.app.loginAttempts.set(key, next);
      return { key: redisKey, attempt: next };
    }
    return { key: redisKey, attempt: current };
  }

  try {
    const existing = await redis.get(redisKey);
    const current = existing ? JSON.parse(existing) : null;

    if (!current) {
      const next = { count: 0, startedAt: Date.now() };
      await redis.setEx(redisKey, Math.ceil(LOGIN_WINDOW_MS / 1000), JSON.stringify(next));
      return { key: redisKey, attempt: next };
    }

    return { key: redisKey, attempt: current };
  } catch (error) {
    logger.error('AUTH', 'Error getting login attempts from Redis', error);
    // Graceful fallback
    return { key: redisKey, attempt: { count: 0 } };
  }
}

function issueToken(user) {
  const secret = getJwtSecret();
  if (!secret) {
    const error = new Error('Authentication is not configured');
    error.status = 503;
    throw error;
  }

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, sessionId: user.sessionId },
    secret,
    { expiresIn: process.env.JWT_EXPIRE || '12h' }
  );
}

async function ensureEnvironmentAdminUser(adminEmail) {
  const adminUserId = '00000000-0000-4000-8000-000000000001';
  let user = await User.findOne({ where: { email: adminEmail } });

  if (!user) {
    user = await User.findByPk(adminUserId);
  }

  if (!user) {
    return User.create({
      id: adminUserId,
      email: adminEmail,
      password: randomBytes(32).toString('hex') + 'Aa1!',
      name: 'Administrator',
      role: 'admin',
      active: true
    });
  }

  const updates = {};
  if (user.email !== adminEmail) updates.email = adminEmail;
  if (user.role !== 'admin') updates.role = 'admin';
  if (user.name !== 'Administrator') updates.name = 'Administrator';
  if (!user.active) updates.active = true;

  if (Object.keys(updates).length > 0) {
    await user.update(updates);
  }

  return user;
}


/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: Password123!
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Invalid input or user already exists
 */
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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user and receive JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts. Account temporarily locked.
 */
// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Admin login via environment variables
    if (adminEmail && adminPassword) {
      const normalizedEmail = email?.trim().toLowerCase() || '';
      const valid = secureEqual(normalizedEmail, adminEmail)
        && secureEqual(password || '', adminPassword);

      if (!valid) {
        attempt.count += 1;
        const redis = await getRedisClient();
        if (redis) {
          try {
            await redis.setEx(key, Math.ceil(LOGIN_WINDOW_MS / 1000), JSON.stringify({ count: attempt.count + 1, startedAt: attempt.startedAt }));
          } catch (err) {
            logger.warn('AUTH', 'Failed to update Redis attempt counter');
          }
        }
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      logger.info('AUTH', 'Admin login successful');
      const user = {
        id: '00000000-0000-4000-8000-000000000001',
        email: adminEmail,
        name: 'Administrator',
        role: 'admin'
      };

      return res.json({
        token: issueToken(user),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
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
      const redis = await getRedisClient();
      if (redis) {
        try {
          await redis.setEx(key, Math.ceil(LOGIN_WINDOW_MS / 1000), JSON.stringify({ count: attempt.count + 1, startedAt: attempt.startedAt }));
        } catch (err) {
          logger.warn('AUTH', 'Failed to update Redis attempt counter');
        }
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      attempt.count += 1;
      const redis = await getRedisClient();
      if (redis) {
        try {
          await redis.setEx(key, Math.ceil(LOGIN_WINDOW_MS / 1000), JSON.stringify({ count: attempt.count + 1, startedAt: attempt.startedAt }));
        } catch (err) {
          logger.warn('AUTH', 'Failed to update Redis attempt counter');
        }
      }

      // Increment failed login attempts and lock if necessary
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Successful login - reset attempt counters
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = issueToken(user);

    try {
      await logLogin(user.id, req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(), true);
    } catch (auditError) {
      logger.warn('AUTH', 'Failed to log login event', auditError);
      // Don't fail login if audit logging fails
    }

    logger.info('AUTH', `User ${user.id} logged in successfully`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    logger.error('AUTH', 'Login error', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      try {
        await logLogout(userId, req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim());
      } catch (auditError) {
        logger.warn('AUTH', 'Failed to log logout event', auditError);
      }
      logger.info('AUTH', `User ${userId} logged out`);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('AUTH', 'Logout error', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
