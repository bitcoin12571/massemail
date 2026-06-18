import Session from '../models/Session.js';
import logger from '../services/logger.js';

const SESSION_TIMEOUT_MS = (parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30) * 60 * 1000;

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
        expiresAt: { [require('sequelize').Op.lt]: new Date() }
      }
    });
    if (deleted > 0) {
      logger.info('SESSION', `Cleaned up ${deleted} expired sessions`);
    }
  } catch (error) {
    logger.error('SESSION', 'Error cleaning up expired sessions', error);
  }
}
