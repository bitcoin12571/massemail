import rateLimit from 'express-rate-limit';

/**
 * Rate limiters for email sending
 * Prevents spam and DOS attacks
 */

// Per-user rate limiter (extracted from JWT token)
export const emailSendLimiter = rateLimit({
  // Use the user ID from the JWT token as the key
  keyGenerator: (req) => req.user?.id || req.ip,

  // 100 requests per hour
  windowMs: 60 * 60 * 1000,
  max: 100,

  // Custom message
  message: {
    error: 'Too many emails sent. You have sent 100 emails in the last hour. Please try again later.',
    retryAfter: 'Please try again after 1 hour'
  },

  // Don't store in default in-memory store
  store: undefined,

  // Skip unsuccessful requests
  skip: (req, res) => res.statusCode < 400,

  // Custom handler
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many emails sent',
      message: 'You have exceeded the rate limit. Max 100 emails per hour.',
      retryAfter: '1 hour'
    });
  }
});

// Campaign send rate limiter (separate limit per campaign)
export const campaignSendLimiter = rateLimit({
  keyGenerator: (req) => `${req.user?.id}-${req.params.id}`,
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 send attempts per minute per campaign
  message: {
    error: 'Too many send attempts for this campaign'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many send attempts',
      message: 'Please wait before sending this campaign again',
      retryAfter: '1 minute'
    });
  }
});

// Bulk operation rate limiter
export const bulkOperationLimiter = rateLimit({
  keyGenerator: (req) => req.user?.id || req.ip,
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 bulk operations per minute
  message: {
    error: 'Too many bulk operations'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many operations',
      message: 'Please slow down with bulk operations'
    });
  }
});

// Contact import rate limiter
export const contactImportLimiter = rateLimit({
  keyGenerator: (req) => req.user?.id || req.ip,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Max 50 imports per hour
  message: {
    error: 'Too many contact imports'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many imports',
      message: 'You have exceeded the import limit. Try again later.'
    });
  }
});
