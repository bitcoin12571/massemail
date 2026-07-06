import { randomUUID, timingSafeEqual, randomBytes } from 'node:crypto';
import crypto from 'node:crypto';
import { createClient } from 'redis';

// CSRF token expiry: 1 year (31536000 seconds) - effectively infinite/never expires
// Users never need to refresh tokens, perfect for long-term stability
const CSRF_TOKEN_EXPIRY = 365 * 24 * 60 * 60; // 365 days in seconds (1 year)
let redisClient = null;

// Initialize Redis client for CSRF tokens
async function getRedisClient() {
  if (!redisClient) {
    try {
      // Support both redis:// and rediss:// protocols
      // Upstash uses rediss:// for TLS, but accepts redis:// and auto-upgrades
      let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // If it's a Upstash URL with redis://, convert to rediss://
      if (redisUrl.startsWith('redis://') && redisUrl.includes('upstash.io')) {
        redisUrl = redisUrl.replace('redis://', 'rediss://');
      }

      redisClient = createClient({
        url: redisUrl
      });

      redisClient.on('error', (err) => {
        console.error('Redis Client Error', err);
        redisClient = null; // Reset on error
      });

      await redisClient.connect();
      console.log('✅ Redis CSRF token storage connected');
    } catch (error) {
      console.warn('Redis connection failed, falling back to in-memory CSRF storage', error.message);
      // Fallback for local development
      return null;
    }
  }
  return redisClient;
}

// Fallback in-memory store for development
const csrfTokensMemory = new Map();

export function securityHeaders(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;

  res.set({
    'X-Request-Id': requestId,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
  });

  next();
}

/**
 * Generate a CSRF token for the client
 * Token is stored server-side (Redis in production, in-memory fallback) with expiry
 */
export async function generateCsrfToken(req, res, next) {
  if (req.method === 'GET') {
    const token = randomBytes(32).toString('hex');
    const sessionId = req.headers['x-session-id'] || randomUUID();

    const tokenData = {
      sessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (CSRF_TOKEN_EXPIRY * 1000)
    };

    try {
      const redis = await getRedisClient();
      if (redis) {
        // Store in Redis with TTL
        await redis.setEx(`csrf:${token}`, CSRF_TOKEN_EXPIRY, JSON.stringify(tokenData));
      } else {
        // Fallback: store in memory
        csrfTokensMemory.set(token, tokenData);

        // Clean up expired tokens in memory
        for (const [key, value] of csrfTokensMemory.entries()) {
          if (value.expiresAt < Date.now()) {
            csrfTokensMemory.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Error storing CSRF token:', error);
      // Fallback to memory if Redis fails
      csrfTokensMemory.set(token, tokenData);
    }

    res.set('X-CSRF-Token', token);
    req.csrfToken = token;
  }
  next();
}

/**
 * Verify CSRF token on state-changing requests (POST, PUT, DELETE, PATCH)
 */
export async function verifyCsrfToken(req, res, next) {
  // Skip CSRF check for GET requests, webhooks, and public endpoints
  if (req.method === 'GET' || req.path.includes('/webhooks') || req.path.includes('/auth/login')) {
    return next();
  }

  const token = req.headers['x-csrf-token'];

  if (!token) {
    return res.status(403).json({
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  let tokenData = null;

  try {
    const redis = await getRedisClient();
    if (redis) {
      // Try to get from Redis
      const stored = await redis.get(`csrf:${token}`);
      if (stored) {
        tokenData = JSON.parse(stored);
        // Delete after verification (one-time use)
        await redis.del(`csrf:${token}`);
      }
    } else {
      // Fallback to memory
      tokenData = csrfTokensMemory.get(token);
      if (tokenData) {
        csrfTokensMemory.delete(token);
      }
    }
  } catch (error) {
    console.error('Error verifying CSRF token:', error);
    // Try memory as fallback
    tokenData = csrfTokensMemory.get(token);
    if (tokenData) {
      csrfTokensMemory.delete(token);
    }
  }

  if (!tokenData) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  if (tokenData.expiresAt < Date.now()) {
    return res.status(403).json({
      error: 'CSRF token expired',
      code: 'CSRF_TOKEN_EXPIRED'
    });
  }

  // Optional: Verify session match
  const sessionId = req.headers['x-session-id'];
  if (sessionId && tokenData.sessionId !== sessionId) {
    return res.status(403).json({
      error: 'CSRF token session mismatch',
      code: 'CSRF_SESSION_MISMATCH'
    });
  }

  req.csrfToken = token;
  next();
}

export function requireWebhookSecret(req, res, next) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(503).json({ error: 'Webhooks are not configured' });
  }

  const provided = req.headers['x-webhook-secret'];
  if (!provided) {
    return res.status(401).json({ error: 'Webhook secret required' });
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  try {
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);

    // Check length first to prevent info leakage
    if (expectedBuffer.length !== providedBuffer.length) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}
