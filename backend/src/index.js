import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
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

// Load .env only in development (Vercel uses environment variables)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
let initializationPromise;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }
});

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

// Import here to avoid circular deps
const Contact = (await import('./models/Contact.js')).default;
const Campaign = (await import('./models/Campaign.js')).default;
const Email = (await import('./models/Email.js')).default;

app.post('/api/send-now-public', authMiddleware, upload.array('attachments', 5), async (req, res) => {
  try {
    const contactIds = typeof req.body.contactIds === 'string'
      ? JSON.parse(req.body.contactIds)
      : req.body.contactIds;
    const { subject, message } = req.body;

    if (!Array.isArray(contactIds) || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const contacts = await Contact.findAll({
      where: { id: contactIds, status: 'active' }
    });

    if (!contacts.length) {
      return res.status(400).json({ error: 'No active recipients found' });
    }

    const safeMessage = message
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\n', '<br>');

    const campaign = await Campaign.create({
      name: `Quick send - ${new Date().toLocaleString('en-GB')}`,
      subject: subject.trim(),
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6">${safeMessage}</div>`,
      textContent: message.trim(),
      status: 'sent',
      createdBy: req.user.id
    });

    const { sendEmail } = await import('./services/emailService.js');

    const failures = [];
    for (const contact of contacts) {
      const emailRecord = await Email.create({
        campaignId: campaign.id,
        contactId: contact.id,
        recipientEmail: contact.email,
        status: 'pending'
      });

      try {
        const result = await sendEmail({
          to: contact.email,
          subject: subject.trim(),
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${safeMessage}</div>`,
          text: message.trim(),
          attachments: (req.files || []).map((file) => ({
            filename: file.originalname,
            contentType: file.mimetype,
            content: file.buffer.toString('base64')
          }))
        });
        await emailRecord.update({
          status: 'sent',
          sentAt: new Date(),
          sendgridMessageId: result.messageId
        });
      } catch (error) {
        failures.push(contact.email);
        await emailRecord.update({
          status: 'failed',
          failureReason: error.message.slice(0, 500)
        });
      }
    }

    await campaign.update({ status: 'sent', sentAt: new Date() });

    if (failures.length) {
      return res.status(502).json({
        error: `Email delivery failed for ${failures.length} recipient(s).`,
        failedRecipients: failures
      });
    }

    res.status(200).json({
      success: true,
      campaignId: campaign.id,
      recipientCount: contacts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
