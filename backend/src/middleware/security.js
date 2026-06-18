import { randomUUID, timingSafeEqual, randomBytes } from 'node:crypto';
import crypto from 'node:crypto';

const csrfTokens = new Map(); // In-memory store (use Redis in production)
const CSRF_TOKEN_EXPIRY = 1 * 60 * 60 * 1000; // 1 hour

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
 * Token is stored server-side with expiry
 */
export function generateCsrfToken(req, res, next) {
  if (req.method === 'GET') {
    const token = randomBytes(32).toString('hex');
    const sessionId = req.headers['x-session-id'] || randomUUID();

    csrfTokens.set(token, {
      sessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + CSRF_TOKEN_EXPIRY
    });

    // Clean up expired tokens
    for (const [key, value] of csrfTokens.entries()) {
      if (value.expiresAt < Date.now()) {
        csrfTokens.delete(key);
      }
    }

    res.set('X-CSRF-Token', token);
    req.csrfToken = token;
  }
  next();
}

/**
 * Verify CSRF token on state-changing requests (POST, PUT, DELETE, PATCH)
 */
export function verifyCsrfToken(req, res, next) {
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

  const tokenData = csrfTokens.get(token);

  if (!tokenData) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  if (tokenData.expiresAt < Date.now()) {
    csrfTokens.delete(token);
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

  // Token is valid - consume it
  csrfTokens.delete(token);
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
