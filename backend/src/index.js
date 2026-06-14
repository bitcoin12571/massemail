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
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { securityHeaders } from './middleware/security.js';
import { isRealEmailDeliveryConfigured } from './services/emailService.js';

// Load .env only in development (Vercel uses environment variables)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
let initializationPromise;

export function initializeApp() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await initializeQueue();
      await sequelize.authenticate();
      console.log('Database connected');

      await sequelize.sync({ force: false, alter: false });
      console.log('Models synced');

      await initializeEmailService();

      // Start the email scheduler
      startScheduler();
    })().catch((error) => {
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

// Routes (no auth)
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);

// Protected routes
app.use('/api/contacts', authMiddleware, contactRoutes);
app.use('/api/campaigns', authMiddleware, campaignRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/queue', authMiddleware, queueRoutes);

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
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('CORS enabled for all origins');
    });
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

export default app;
