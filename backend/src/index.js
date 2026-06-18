import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sequelize } from './config/database.js';
import { initializeQueue } from './services/queueService.js';
import { initializeEmailService } from './services/emailService.js';
import { startScheduler } from './services/schedulerService.js';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import campaignRoutes from './routes/campaigns.js';
import webhookRoutes from './routes/webhooks.js';
import settingsRoutes from './routes/settings.js';
import aiRoutes from './routes/ai.js';
import queueRoutes from './routes/queue.js';
import parserRoutes from './routes/parser.js';
import bulkSenderRoutes from './routes/bulkSender.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { securityHeaders } from './middleware/security.js';
import {
  generalLimiter,
  authLimiter,
  emailLimiter,
  bulkEmailLimiter,
  webhookLimiter,
  uploadLimiter
} from './middleware/rateLimit.js';
import { initializeSentry, createSentryErrorHandler } from './middleware/errorTracking.js';
import { isRealEmailDeliveryConfigured } from './services/emailService.js';
import logger from './services/logger.js';
// Import models for sequelize.sync() to recognize them
import './models/User.js';
import './models/Campaign.js';
import './models/Contact.js';
import './models/Email.js';
import './models/SystemSetting.js';
import './models/JobQueue.js';
import './models/ParsedEmail.js';
import './models/BulkCampaign.js';
import './models/BulkCampaignSend.js';

// Load .env only in development (Vercel uses environment variables)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
let initializationPromise;

// Initialize error tracking (Sentry)
initializeSentry(app);

export function initializeApp() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await initializeQueue();
      await sequelize.authenticate();
      logger.info('DB', 'Database connected');

      await sequelize.sync({ force: false, alter: false });
      logger.info('DB', 'Models synced');

      await initializeEmailService();

      // Start the email scheduler
      startScheduler();
    })().catch((error) => {
      logger.error('INIT', 'Startup error', error);
      initializationPromise = undefined;
      throw error;
    });
  }

  return initializationPromise;
}

// Middleware
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cors(process.env.VERCEL
  ? { origin: false }
  : {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: false
    }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(async (req, res, next) => {
  try {
    await initializeApp();
    next();
  } catch (error) {
    next(error);
  }
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Routes (no auth)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/webhooks', webhookLimiter, webhookRoutes);

// Protected routes
app.use('/api/contacts', authMiddleware, contactRoutes);
app.use('/api/campaigns', authMiddleware, campaignRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/queue', authMiddleware, queueRoutes);
app.use('/api/parser', authMiddleware, uploadLimiter, parserRoutes);
app.use('/api/bulk-sender', authMiddleware, bulkEmailLimiter, bulkSenderRoutes);

// Email sending route needs special rate limiting
app.post('/api/contacts/send-now', authMiddleware, emailLimiter, async (req, res, next) => {
  // This will be handled by the contacts route
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  const persistentDatabase = sequelize.getDialect() === 'postgres';
  res.status(persistentDatabase || !process.env.VERCEL ? 200 : 503).json({
    status: persistentDatabase || !process.env.VERCEL ? 'OK' : 'DEGRADED',
    database: sequelize.getDialect(),
    persistentDatabase,
    emailDeliveryConfigured: isRealEmailDeliveryConfigured(),
    timestamp: new Date().toISOString()
  });
});

// Scheduler management endpoints (debug/testing)
app.post('/api/scheduler/trigger', authMiddleware, async (req, res) => {
  try {
    const { manualTriggerScheduler } = await import('./services/schedulerService.js');
    await manualTriggerScheduler();
    res.json({ success: true, message: 'Scheduler triggered manually' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scheduler/status', authMiddleware, async (req, res) => {
  try {
    const { getSchedulerStatus } = await import('./services/schedulerService.js');
    const status = getSchedulerStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sentry error handler (before general error handler)
app.use(createSentryErrorHandler());

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.BACKEND_PORT || 5000;

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirectRun = fileURLToPath(import.meta.url) === entryPath;

if (isDirectRun) {
  try {
    await initializeApp();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('SERVER', `running on http://localhost:${PORT}`);
      logger.info('CORS', 'enabled for all origins');
    });
  } catch (error) {
    logger.error('STARTUP', 'Fatal error', error);
    process.exit(1);
  }
}

export default app;
