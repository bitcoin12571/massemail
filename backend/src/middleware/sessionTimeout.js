import Session from '../models/Session.js';
import logger from '../services/logger.js';
import { Op } from 'sequelize';

// Session timeout: 1 year (effectively infinite/never expires)
// Users can stay logged in indefinitely - perfect for long-term use!
// Can be overridden with SESSION_TIMEOUT_MINUTES env var if needed
const SESSION_TIMEOUT_MS = (parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 525600) * 60 * 1000; // 525600 minutes = 365 days

/**
 * Middleware to check session expiry and update lastActivity
 * Should be applied to protected routes only
 */
export async function checkSessionTimeout(req, res, next) {
  if (!req.user) {
    return next();
  }

  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return next();
    }

    const isEnvironmentAdmin = process.env.ADMIN_EMAIL
      && req.user.id === '00000000-0000-4000-8000-000000000001';

    if (isEnvironmentAdmin && req.user.sessionId) {
      if (req.user.sessionId !== sessionId) {
        return res.status(401).json({
          error: 'Session not found or expired',
          code: 'SESSION_EXPIRED'
        });
      }

      return next();
    }

    const session = await Session.findOne({
      where: { sessionId, userId: req.user.id, active: true }
    });

    if (!session) {
      return res.status(401).json({
        error: 'Session not found or expired',
        code: 'SESSION_EXPIRED'
      });
    }

    // Check if session has expired
    const now = new Date();
    if (session.expiresAt < now) {
      await session.update({ active: false });
      return res.status(401).json({
        error: 'Session has expired. Please log in again.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Check for inactivity timeout
    const lastActivityTime = new Date(session.lastActivity).getTime();
    const nowTime = now.getTime();
    if (nowTime - lastActivityTime > SESSION_TIMEOUT_MS) {
      await session.update({ active: false });
      return res.status(401).json({
        error: 'Session inactive. Please log in again.',
        code: 'SESSION_INACTIVE_TIMEOUT'
      });
    }

    // Update lastActivity
    await session.update({ lastActivity: now });

    // Attach session to request for audit logging
    req.session = session;

  } catch (error) {
    logger.error('SESSION', 'Error checking session timeout', error);
    // Don't block request on session error, log and continue
  }

  next();
}

/**
 * Cleanup expired sessions (run periodically)
 */
export async function cleanupExpiredSessions() {
  try {
    const deleted = await Session.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() }
      }
    });
    if (deleted > 0) {
      logger.info('SESSION', `Cleaned up ${deleted} expired sessions`);
    }
  } catch (error) {
    logger.error('SESSION', 'Error cleaning up expired sessions', error);
  }
}
