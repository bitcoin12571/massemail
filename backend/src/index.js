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
app.use(cors(process.env.VERCEL
  ? { origin: false }
  : {
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

// DEBUG TEST EMAIL - send directly to hardcoded email without requiring database
app.post('/api/debug/test-email', async (req, res) => {
  try {
    console.log('[DEBUG-TEST] 🚀 SENDING DIRECT TEST EMAIL...');
    console.log('[DEBUG-TEST] Provider:', process.env.EMAIL_PROVIDER);
    console.log('[DEBUG-TEST] SMTP User:', process.env.SMTP_USER);
    console.log('[DEBUG-TEST] Has password:', !!process.env.SMTP_PASS);

    const { sendEmail } = await import('./services/emailService.js');

    const result = await sendEmail({
      to: 'maximplacinta589@gmail.com',
      subject: '✅ TEST EMAIL FROM VERCEL - ' + new Date().toISOString(),
      html: '<p><strong>🎉 THIS EMAIL IS FROM VERCEL!</strong></p><p>If you see this, the Gmail SMTP connection WORKS!</p><p>Time: ' + new Date().toISOString() + '</p>',
      text: 'TEST EMAIL FROM VERCEL - If you see this, Gmail SMTP works!'
    });

    console.log('[DEBUG-TEST] ✅ EMAIL SENT! Message ID:', result.messageId);
    res.json({
      success: true,
      messageId: result.messageId,
      sentTo: 'maximplacinta589@gmail.com',
      message: '✅ Test email sent successfully to maximplacinta589@gmail.com! Check your inbox!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DEBUG-TEST] ❌ FAILED:', error.message);
    console.error('[DEBUG-TEST] ERROR CODE:', error.code);
    console.error('[DEBUG-TEST] FULL ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      type: error.name,
      timestamp: new Date().toISOString()
    });
  }
});

// PUBLIC SEND - test endpoint without auth requirement
app.post('/api/public/send', upload.array('attachments', 5), async (req, res) => {
  try {
    console.log('[PUBLIC-SEND] 🚀 PUBLIC SEND TEST');
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Missing to, subject, or message' });
    }

    const { sendEmail } = await import('./services/emailService.js');

    const result = await sendEmail({
      to,
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${message}</div>`,
      text: message,
      attachments: (req.files || []).map((file) => ({
        filename: file.originalname,
        contentType: file.mimetype,
        content: file.buffer.toString('base64')
      }))
    });

    console.log('[PUBLIC-SEND] ✅ SUCCESS! Message ID:', result.messageId);
    res.json({
      success: true,
      messageId: result.messageId,
      sentTo: to
    });
  } catch (error) {
    console.error('[PUBLIC-SEND] ❌ FAILED:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Protected routes
app.use('/api/contacts', authMiddleware, contactRoutes);
app.use('/api/campaigns', authMiddleware, campaignRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: sequelize.getDialect(), timestamp: new Date().toISOString() });
});

app.post('/api/quick-send', authMiddleware, async (req, res) => {
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

app.get('/api/scheduler/status', async (req, res) => {
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
