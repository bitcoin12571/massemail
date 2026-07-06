/**
 * Recipient Rate Limiting Service
 * Prevents sending too many emails to the same recipient in a short period
 * Protects sender reputation and reduces bounces
 */

import { createClient } from 'redis';
import logger from './logger.js';

let redisClient = null;

// Rate limiting configuration
const RATE_LIMITS = {
  perHour: 5, // Max 5 emails per hour per recipient
  perDay: 20, // Max 20 emails per day per recipient
  perWeek: 100, // Max 100 emails per week per recipient
  hourWindow: 60 * 60, // 1 hour in seconds
  dayWindow: 24 * 60 * 60, // 1 day in seconds
  weekWindow: 7 * 24 * 60 * 60 // 1 week in seconds
};

/**
 * Get Redis client for rate limit tracking
 */
async function getRedisClient() {
  if (!redisClient) {
    try {
      let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      if (redisUrl.startsWith('redis://') && redisUrl.includes('upstash.io')) {
        redisUrl = redisUrl.replace('redis://', 'rediss://');
      }
      redisClient = createClient({ url: redisUrl });
      redisClient.on('error', (err) => {
        logger.error('RATE_LIMIT', 'Redis error', err);
        redisClient = null;
      });
      await redisClient.connect();
      logger.info('RATE_LIMIT', 'Redis connected for rate limiting');
    } catch (error) {
      logger.warn('RATE_LIMIT', 'Redis unavailable, rate limiting disabled', error);
      return null;
    }
  }
  return redisClient;
}

/**
 * Check if recipient can be sent to
 * @param {string} email - Recipient email
 * @returns {object} - { allowed: boolean, reason: string, remaining: { hourly, daily, weekly } }
 */
export async function checkRateLimit(email) {
  try {
    const redis = await getRedisClient();

    if (!redis) {
      // Redis unavailable - allow (fail open for availability)
      return {
        allowed: true,
        reason: 'redis_unavailable',
        remaining: { hourly: RATE_LIMITS.perHour, daily: RATE_LIMITS.perDay, weekly: RATE_LIMITS.perWeek }
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = Math.floor(Date.now() / 1000);

    // Get current counts for each window
    const hourlyKey = `rate_limit:hourly:${normalizedEmail}`;
    const dailyKey = `rate_limit:daily:${normalizedEmail}`;
    const weeklyKey = `rate_limit:weekly:${normalizedEmail}`;

    const [hourlyCount, dailyCount, weeklyCount] = await Promise.all([
      redis.get(hourlyKey).then(v => parseInt(v || 0)),
      redis.get(dailyKey).then(v => parseInt(v || 0)),
      redis.get(weeklyKey).then(v => parseInt(v || 0))
    ]);

    // Check against limits
    if (hourlyCount >= RATE_LIMITS.perHour) {
      logger.warn('RATE_LIMIT', `Hourly limit exceeded for ${normalizedEmail} (${hourlyCount}/${RATE_LIMITS.perHour})`);
      return {
        allowed: false,
        reason: 'hourly_limit_exceeded',
        limitType: 'hourly',
        current: hourlyCount,
        limit: RATE_LIMITS.perHour,
        remaining: { hourly: 0, daily: RATE_LIMITS.perDay - dailyCount, weekly: RATE_LIMITS.perWeek - weeklyCount }
      };
    }

    if (dailyCount >= RATE_LIMITS.perDay) {
      logger.warn('RATE_LIMIT', `Daily limit exceeded for ${normalizedEmail} (${dailyCount}/${RATE_LIMITS.perDay})`);
      return {
        allowed: false,
        reason: 'daily_limit_exceeded',
        limitType: 'daily',
        current: dailyCount,
        limit: RATE_LIMITS.perDay,
        remaining: { hourly: RATE_LIMITS.perHour - hourlyCount, daily: 0, weekly: RATE_LIMITS.perWeek - weeklyCount }
      };
    }

    if (weeklyCount >= RATE_LIMITS.perWeek) {
      logger.warn('RATE_LIMIT', `Weekly limit exceeded for ${normalizedEmail} (${weeklyCount}/${RATE_LIMITS.perWeek})`);
      return {
        allowed: false,
        reason: 'weekly_limit_exceeded',
        limitType: 'weekly',
        current: weeklyCount,
        limit: RATE_LIMITS.perWeek,
        remaining: { hourly: RATE_LIMITS.perHour - hourlyCount, daily: RATE_LIMITS.perDay - dailyCount, weekly: 0 }
      };
    }

    // All limits OK
    return {
      allowed: true,
      reason: 'within_limits',
      remaining: {
        hourly: RATE_LIMITS.perHour - hourlyCount,
        daily: RATE_LIMITS.perDay - dailyCount,
        weekly: RATE_LIMITS.perWeek - weeklyCount
      }
    };
  } catch (error) {
    logger.error('RATE_LIMIT', `Error checking rate limit for ${email}`, error);
    // Fail open for availability
    return {
      allowed: true,
      reason: 'error_checking_limit',
      error: error.message
    };
  }
}

/**
 * Increment rate limit counters after sending
 * @param {string} email - Recipient email
 */
export async function recordSend(email) {
  try {
    const redis = await getRedisClient();

    if (!redis) {
      return; // Redis unavailable, skip
    }

    const normalizedEmail = email.toLowerCase().trim();

    const hourlyKey = `rate_limit:hourly:${normalizedEmail}`;
    const dailyKey = `rate_limit:daily:${normalizedEmail}`;
    const weeklyKey = `rate_limit:weekly:${normalizedEmail}`;

    // Increment all counters with proper TTL
    await Promise.all([
      redis.incr(hourlyKey).then(() => redis.expire(hourlyKey, RATE_LIMITS.hourWindow)),
      redis.incr(dailyKey).then(() => redis.expire(dailyKey, RATE_LIMITS.dayWindow)),
      redis.incr(weeklyKey).then(() => redis.expire(weeklyKey, RATE_LIMITS.weekWindow))
    ]);

    logger.debug('RATE_LIMIT', `Recorded send to ${normalizedEmail}`);
  } catch (error) {
    logger.error('RATE_LIMIT', `Error recording send for ${email}`, error);
    // Continue even if Redis fails
  }
}

/**
 * Get current rate limit stats for a recipient
 * @param {string} email - Recipient email
 */
export async function getStats(email) {
  try {
    const redis = await getRedisClient();

    if (!redis) {
      return {
        email,
        available: false,
        reason: 'redis_unavailable'
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const hourlyKey = `rate_limit:hourly:${normalizedEmail}`;
    const dailyKey = `rate_limit:daily:${normalizedEmail}`;
    const weeklyKey = `rate_limit:weekly:${normalizedEmail}`;

    const [hourlyCount, dailyCount, weeklyCount, hourlyTTL, dailyTTL, weeklyTTL] = await Promise.all([
      redis.get(hourlyKey).then(v => parseInt(v || 0)),
      redis.get(dailyKey).then(v => parseInt(v || 0)),
      redis.get(weeklyKey).then(v => parseInt(v || 0)),
      redis.ttl(hourlyKey),
      redis.ttl(dailyKey),
      redis.ttl(weeklyKey)
    ]);

    return {
      email,
      hourly: { current: hourlyCount, limit: RATE_LIMITS.perHour, remaining: hourlyTTL },
      daily: { current: dailyCount, limit: RATE_LIMITS.perDay, remaining: dailyTTL },
      weekly: { current: weeklyCount, limit: RATE_LIMITS.perWeek, remaining: weeklyTTL },
      healthy: hourlyCount < RATE_LIMITS.perHour && dailyCount < RATE_LIMITS.perDay && weeklyCount < RATE_LIMITS.perWeek
    };
  } catch (error) {
    logger.error('RATE_LIMIT', `Error getting stats for ${email}`, error);
    throw error;
  }
}

/**
 * Reset rate limits for a recipient (e.g., after complaint resolution)
 * @param {string} email - Recipient email
 */
export async function resetLimits(email) {
  try {
    const redis = await getRedisClient();

    if (!redis) {
      return { success: false, reason: 'redis_unavailable' };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const hourlyKey = `rate_limit:hourly:${normalizedEmail}`;
    const dailyKey = `rate_limit:daily:${normalizedEmail}`;
    const weeklyKey = `rate_limit:weekly:${normalizedEmail}`;

    await Promise.all([
      redis.del(hourlyKey),
      redis.del(dailyKey),
      redis.del(weeklyKey)
    ]);

    logger.info('RATE_LIMIT', `Reset rate limits for ${normalizedEmail}`);

    return { success: true, email: normalizedEmail };
  } catch (error) {
    logger.error('RATE_LIMIT', `Error resetting limits for ${email}`, error);
    throw error;
  }
}

/**
 * Set custom rate limits
 * @param {object} config - { perHour, perDay, perWeek }
 */
export function setLimits(config) {
  if (config.perHour) RATE_LIMITS.perHour = config.perHour;
  if (config.perDay) RATE_LIMITS.perDay = config.perDay;
  if (config.perWeek) RATE_LIMITS.perWeek = config.perWeek;

  logger.info('RATE_LIMIT', `Updated rate limits: ${RATE_LIMITS.perHour}/hr, ${RATE_LIMITS.perDay}/day, ${RATE_LIMITS.perWeek}/week`);
}

export default {
  checkRateLimit,
  recordSend,
  getStats,
  resetLimits,
  setLimits,
  RATE_LIMITS
};
