import { randomUUID } from 'node:crypto';

export function securityHeaders(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;

  res.set({
    'X-Request-Id': requestId,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'same-origin'
  });

  next();
}

export function requireWebhookSecret(req, res, next) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(503).json({ error: 'Webhooks are not configured' });
  }

  const provided = req.headers['x-webhook-secret'];
  if (provided !== expected) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}
