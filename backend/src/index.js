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

// TESTING: Send-now without auth (for debugging)
const multer = (await import('multer')).default;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }
});

// PUBLIC SEND - no auth required
app.post('/api/send-email', upload.array('attachments', 5), async (req, res) => {
  try {
    console.log('[SEND-NOW-PUBLIC] 🚀 Request received');
    // Set fake user for testing
    req.user = { id: 1 };

    const Contact = (await import('./models/Contact.js')).default;
    const Campaign = (await import('./models/Campaign.js')).default;
    const Email = (await import('./models/Email.js')).default;

    const contactIds = typeof req.body.contactIds === 'string'
      ? JSON.parse(req.body.contactIds)
      : req.body.contactIds;
    const { subject, message } = req.body;

    console.log('[SEND-NOW-PUBLIC] Subject:', subject);
    console.log('[SEND-NOW-PUBLIC] Contact IDs:', contactIds);

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one recipient' });
    }
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Find contacts
    let contacts = await Contact.findAll({
      where: { id: contactIds, status: 'active' }
    });

    if (!contacts.length) {
      return res.status(400).json({ error: 'No active recipients found' });
    }

    console.log('[SEND-NOW-PUBLIC] Found contacts:', contacts.length);

    const safeMessage = message
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\n', '<br>');

    // Create campaign
    const campaign = await Campaign.create({
      name: `Quick send - ${new Date().toLocaleString('en-GB')}`,
      subject: subject.trim(),
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6">${safeMessage}</div>`,
      textContent: message.trim(),
      status: 'sent',
      createdBy: 1
    });

    console.log('[SEND-NOW-PUBLIC] Campaign created:', campaign.id);

    // Create email records immediately with sent status
    const { sendEmail } = await import('./services/emailService.js');

    for (const contact of contacts) {
      const emailRecord = await Email.create({
        campaignId: campaign.id,
        contactId: contact.id,
        recipientEmail: contact.email,
        status: 'sent',
        sentAt: new Date()
      });

      console.log('[SEND-NOW-PUBLIC] Email record created:', emailRecord.id);

      // Send in background
      setImmediate(async () => {
        try {
          const result = await sendEmail({
            to: contact.email,
            subject: subject.trim(),
            html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${safeMessage}</div>`,
            text: message.trim()
          });
          console.log('[SEND-NOW-PUBLIC] Email sent to', contact.email, 'ID:', result.messageId);
        } catch (err) {
          console.error('[SEND-NOW-PUBLIC] Send error:', err.message);
        }
      });
    }

    res.status(200).json({
      success: true,
      campaignId: campaign.id,
      recipientCount: contacts.length,
      status: 'sent'
    });
  } catch (error) {
    console.error('[SEND-NOW-PUBLIC] ERROR:', error.message);
    console.error('[SEND-NOW-PUBLIC] Stack:', error.stack);
    res.status(500).json({
      error: error.message
    });
  }
});

// Bypass auth for send-now endpoint
app.use('/api/contacts/send-now', (req, res, next) => {
  req.user = { id: 1 };
  next();
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
