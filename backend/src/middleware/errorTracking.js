import * as Sentry from '@sentry/node';
import logger from '../services/logger.js';

/**
 * Initialize Sentry for error tracking
 * Only enabled if SENTRY_DSN is set in environment
 */
export function initializeSentry(app) {
  const sentryDSN = process.env.SENTRY_DSN;

  if (!sentryDSN) {
    logger.warn('SENTRY', 'Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: sentryDSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection()
    ],
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured'
    ]
  });

  // Sentry request handler (should be first)
  app.use(Sentry.Handlers.requestHandler());

  // Sentry tracing middleware
  app.use(Sentry.Handlers.tracingHandler());

  logger.info('SENTRY', 'Error tracking initialized');
}

/**
 * Sentry error handler (should be after all routes)
 * Captures unhandled errors and sends to Sentry
 */
export function createSentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

/**
 * Manually capture exception
 */
export function captureException(error, context = {}) {
  if (!process.env.SENTRY_DSN) {
    logger.error('ERROR', error.message, { context });
    return;
  }

  Sentry.captureException(error, {
    contexts: { custom: context }
  });
}

/**
 * Manually capture message
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!process.env.SENTRY_DSN) {
    logger.log('INFO', message, { context });
    return;
  }

  Sentry.captureMessage(message, {
    level,
    contexts: { custom: context }
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message, data = {}, category = 'custom') {
  if (!process.env.SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message,
    data,
    category,
    level: 'info'
  });
}

export default {
  initializeSentry,
  createSentryErrorHandler,
  captureException,
  captureMessage,
  addBreadcrumb
};
