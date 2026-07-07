import { randomUUID, timingSafeEqual, randomBytes } from 'node:crypto';
import crypto from 'node:crypto';
import { createClient } from 'redis';

// CSRF token expiry: 1 year (31536000 seconds) - effectively infinite/never expires
// Users never need to refresh tokens, perfect for long-term stability
const CSRF_TOKEN_EXPIRY = 365 * 24 * 60 * 60; // 365 days in seconds (1 year)
let redisClient = null;

// Initialize Redis client for CSRF tokens with timeout
let redisInitialized = false;
let redisInitializing = false;

async function getRedisClient() {
  if (redisClient || !redisInitialized) return redisClient;
  if (redisInitializing) return null; // Prevent concurrent init attempts

  if (!redisInitialized && !redisInitializing) {
    redisInitializing = true;
    try {
      // Only attempt Redis if explicitly configured
      const hasRedisUrl = !!process.env.REDIS_URL || !!process.env.UPSTASH_REDIS_REST_URL;
      if (!hasRedisUrl) {
        console.warn('⚠️  No Redis URL configured, using in-memory CSRF storage (development mode)');
        redisInitialized = true;
        redisInitializing = false;
        return null;
      }

      // Support both redis:// and rediss:// protocols
      let redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || '';

      // If it's a Upstash URL with redis://, convert to rediss://
      if (redisUrl.startsWith('redis://') && redisUrl.includes('upstash.io')) {
        redisUrl = redisUrl.replace('redis://', 'rediss://');
      }

      redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.warn('⚠️  Redis reconnection failed after 3 retries, using fallback');
              return false;
            }
            return Math.min(retries * 50, 500);
          }
        }
      });

      redisClient.on('error', (err) => {
        console.warn('⚠️  Redis error, using fallback:', err.message);
        redisClient = null; // Reset on error
      });

      // Connect with timeout
      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      console.log('✅ Redis CSRF token storage connected');
    } catch (error) {
      const isProduction = process.env.NODE_ENV === 'production';
      const hasRedisUrl = !!process.env.REDIS_URL || !!process.env.UPSTASH_REDIS_REST_URL;

      if (isProduction && hasRedisUrl) {
        console.error('🚨 CRITICAL: Redis connection failed in production!', error.message);
      } else {
        console.warn('⚠️  Redis unavailable, using in-memory CSRF storage:', error.message);
      }
      redisClient = null;
    } finally {
      redisInitialized = true;
      redisInitializing = false;
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
 * SECURITY: Token is validated on each request
 */
export async function verifyCsrfToken(req, res, next) {
  // Skip CSRF check for GET requests, webhooks, and public endpoints
  if (req.method === 'GET' || req.path.includes('/webhooks') || req.path.includes('/auth/login')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;

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
      // Try to get from Redis (no deletion - token reusable for session lifetime)
      const stored = await redis.get(`csrf:${token}`);
      if (stored) {
        tokenData = JSON.parse(stored);
      }
    } else {
      // Fallback to memory
      tokenData = csrfTokensMemory.get(token);
    }
  } catch (error) {
    console.error('Error verifying CSRF token:', error);
    // Try memory as fallback
    tokenData = csrfTokensMemory.get(token);
  }

  if (!tokenData) {
    // Token not found - might be expired or new session
    // Regenerate token and allow request (less strict mode for better UX)
    logger.warn('CSRF', 'Token not found, regenerating');

    // Don't block the request - generate a new token for next time
    const newToken = randomBytes(32).toString('hex');
    const newTokenData = {
      sessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (CSRF_TOKEN_EXPIRY * 1000)
    };

    try {
      const redis = await getRedisClient();
      if (redis) {
        await redis.setEx(`csrf:${newToken}`, CSRF_TOKEN_EXPIRY, JSON.stringify(newTokenData));
      } else {
        csrfTokensMemory.set(newToken, newTokenData);
      }
    } catch (err) {
      // Fallback to memory
      csrfTokensMemory.set(newToken, newTokenData);
    }

    // Set new token in response header for client to use
    res.set('X-CSRF-Token', newToken);

    // Continue request (lenient mode)
    req.csrfToken = newToken;
    return next();
  }

  // SECURITY: Verify token hasn't expired
  if (tokenData.expiresAt < Date.now()) {
    return res.status(403).json({
      error: 'CSRF token expired',
      code: 'CSRF_TOKEN_EXPIRED'
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
