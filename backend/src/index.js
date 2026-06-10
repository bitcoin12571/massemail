import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sequelize } from './config/database.js';
import { initializeQueue } from './services/queueService.js';
import { initializeEmailService } from './services/emailService.js';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import campaignRoutes from './routes/campaigns.js';
import webhookRoutes from './routes/webhooks.js';
import settingsRoutes from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

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
    })().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }

  return initializationPromise;
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: false
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: sequelize.getDialect(), timestamp: new Date().toISOString() });
});

// QUICK TEST: Send email without auth
app.post('/api/quick-send', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    console.log('\n[QUICK SEND] 🚀 Sending email...');
    const { sendEmail } = await import('./services/emailService.js');
    const result = await sendEmail({
      to: to || 'test@test.com',
      subject: subject || 'Test',
      html: message || 'Test',
      text: 'Test'
    });
    console.log('[QUICK SEND] ✅ Sent! ID:', result.messageId);
    res.json({ ok: true, id: result.messageId });
  } catch (error) {
    console.error('[QUICK SEND] ❌', error.message);
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
