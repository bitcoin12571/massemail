import logger from '../services/logger.js';

/**
 * DEPRECATED: Session timeout now handled by JWT expiry (from auth.js)
 *
 * This middleware is kept for backward compatibility but is mostly a no-op.
 * JWT tokens from auth.js include expiresIn which is verified by authMiddleware.
 *
 * Legacy routes that used x-session-id headers will continue to work but
 * session validation is now done at JWT level.
 */
export async function checkSessionTimeout(_req, _res, next) {
  // JWT validation already happened in authMiddleware
  // Just pass through - JWT expiry is now the source of truth
  next();
}

/**
 * DEPRECATED: Sessions no longer need cleanup
 * Sessions are replaced with JWT tokens which are stateless and expire automatically.
 */
export async function cleanupExpiredSessions() {
  logger.debug('SESSION', 'Session cleanup deprecated - using stateless JWT instead');
  // No-op: JWT tokens are stateless and don't require database cleanup
}
