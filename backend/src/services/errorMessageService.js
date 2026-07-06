/**
 * Error Message Service
 * Provides user-friendly error messages with helpful suggestions
 * Prevents exposing technical details while maintaining debugging info
 */

import logger from './logger.js';

/**
 * User-friendly error codes and messages
 */
const ERROR_MESSAGES = {
  // Auth errors
  'AUTH_001': {
    message: 'Invalid email or password',
    suggestion: 'Check your credentials and try again. Make sure Caps Lock is off.'
  },
  'AUTH_002': {
    message: 'Too many login attempts',
    suggestion: 'Your account is temporarily locked. Please try again in 15 minutes.'
  },
  'AUTH_003': {
    message: 'Password is too weak',
    suggestion: 'Use at least 8 characters with uppercase, lowercase, numbers, and symbols.'
  },
  'AUTH_004': {
    message: 'Email already registered',
    suggestion: 'Use a different email or try logging in instead.'
  },
  'AUTH_005': {
    message: 'Session expired',
    suggestion: 'Please log in again to continue.'
  },

  // Email errors
  'EMAIL_001': {
    message: 'Email configuration is incomplete',
    suggestion: 'Contact your administrator to configure email settings.'
  },
  'EMAIL_002': {
    message: 'Failed to send email',
    suggestion: 'The recipient address may be invalid. Please check and try again.'
  },
  'EMAIL_003': {
    message: 'Email content is too large',
    suggestion: 'Reduce the number of attachments or simplify the email content.'
  },
  'EMAIL_004': {
    message: 'This email address is suppressed',
    suggestion: 'The recipient has reported this email as spam. Cannot send.'
  },
  'EMAIL_005': {
    message: 'Rate limit exceeded for this recipient',
    suggestion: 'You\'ve sent too many emails to this address. Try again later.'
  },

  // Campaign errors
  'CAMPAIGN_001': {
    message: 'Campaign not found',
    suggestion: 'The campaign may have been deleted. Refresh and try again.'
  },
  'CAMPAIGN_002': {
    message: 'No recipients selected',
    suggestion: 'Add at least one contact before sending.'
  },
  'CAMPAIGN_003': {
    message: 'Invalid campaign content',
    suggestion: 'Make sure subject and content are not empty.'
  },

  // Contact errors
  'CONTACT_001': {
    message: 'Invalid email address',
    suggestion: 'Please enter a valid email address.'
  },
  'CONTACT_002': {
    message: 'Contact already exists',
    suggestion: 'This email is already in your contact list.'
  },

  // System errors
  'SYSTEM_001': {
    message: 'Database connection error',
    suggestion: 'The system is temporarily unavailable. Please try again shortly.'
  },
  'SYSTEM_002': {
    message: 'Validation failed',
    suggestion: 'Check your input and make sure all required fields are filled.'
  },
  'SYSTEM_003': {
    message: 'Unauthorized access',
    suggestion: 'You don\'t have permission to access this resource.'
  },

  // Generic
  'ERROR_UNKNOWN': {
    message: 'An unexpected error occurred',
    suggestion: 'Please try again. If the problem persists, contact support.'
  }
};

/**
 * Format error response for API
 * @param {Error|string} error - Error object or code
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {object} context - Additional context for logging
 * @returns {object} - Formatted error response
 */
export function formatErrorResponse(error, statusCode = 500, context = {}) {
  let code = 'ERROR_UNKNOWN';
  let originalMessage = '';
  let stack = '';

  if (error instanceof Error) {
    originalMessage = error.message;
    stack = error.stack;
    // Try to extract error code if it exists
    code = error.code || error.name || 'ERROR_UNKNOWN';
  } else if (typeof error === 'string') {
    code = error;
  }

  // Get user-friendly message
  const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES.ERROR_UNKNOWN;

  // Log technical details
  logger.error('API_ERROR', `${code}: ${originalMessage}`, {
    statusCode,
    stack,
    context
  });

  // Return user-friendly response
  return {
    error: errorInfo.message,
    suggestion: errorInfo.suggestion,
    code: code,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create HTTP response with error
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {Error|string} error - Error object or code
 * @param {object} context - Additional context
 */
export function sendErrorResponse(res, statusCode, error, context = {}) {
  const formatted = formatErrorResponse(error, statusCode, context);
  res.status(statusCode).json(formatted);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return {
      valid: false,
      error: 'EMAIL_EMPTY',
      message: 'Email address is required'
    };
  }

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: 'CONTACT_001',
      message: ERROR_MESSAGES.CONTACT_001.message
    };
  }

  return { valid: true };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors?: string[] }
 */
export function validatePassword(password) {
  const errors = [];

  if (!password) {
    return {
      valid: false,
      errors: ['Password is required']
    };
  }

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('At least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('At least one special character (!@#$%^&*)');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      error: 'AUTH_003',
      message: ERROR_MESSAGES.AUTH_003.message
    };
  }

  return { valid: true };
}

/**
 * Map HTTP status code to error code
 * @param {number} statusCode - HTTP status code
 * @returns {string} - Error code
 */
export function getErrorCodeFromStatus(statusCode) {
  const statusMap = {
    400: 'SYSTEM_002', // Bad request
    401: 'AUTH_005', // Unauthorized
    403: 'SYSTEM_003', // Forbidden
    404: 'CAMPAIGN_001', // Not found
    429: 'AUTH_002', // Too many requests
    500: 'SYSTEM_001', // Server error
    503: 'EMAIL_001' // Service unavailable
  };

  return statusMap[statusCode] || 'ERROR_UNKNOWN';
}

export default {
  formatErrorResponse,
  sendErrorResponse,
  validateEmail,
  validatePassword,
  getErrorCodeFromStatus,
  ERROR_MESSAGES
};
