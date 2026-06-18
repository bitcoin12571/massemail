import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => req.ip,
  skip: (req) => process.env.NODE_ENV === 'development'
});

/**
 * Auth rate limiter - Stricter for login attempts
 * 5 attempts per 15 minutes per IP (prevent brute force)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || req.ip,
  skip: (req) => process.env.NODE_ENV === 'development'
});

/**
 * Email sending rate limiter
 * 50 emails per hour per user
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many emails sent, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => process.env.NODE_ENV === 'development'
});

/**
 * Bulk email rate limiter
 * 5 bulk campaigns per hour per user
 */
export const bulkEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many bulk campaigns sent, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => process.env.NODE_ENV === 'development'
});

/**
 * Webhook rate limiter
 * 1000 requests per hour per IP (very permissive for webhooks)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: 'Webhook rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: (req) => process.env.NODE_ENV === 'development'
});

/**
 * Parser/upload rate limiter
 * 20 uploads per hour per user
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => process.env.NODE_ENV === 'development'
});

export default {
  generalLimiter,
  authLimiter,
  emailLimiter,
  bulkEmailLimiter,
  webhookLimiter,
  uploadLimiter
};
