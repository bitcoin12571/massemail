import express from 'express';
import {
  getEmailSettings,
  sendEmail,
  updateEmailSettings,
  verifyEmailConnection
} from '../services/emailService.js';

const router = express.Router();

router.get('/email', async (req, res) => {
  res.json(await getEmailSettings());
});

router.put('/email', async (req, res) => {
  try {
    res.json(await updateEmailSettings(req.body));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/email/test', async (req, res) => {
  try {
    res.json(await verifyEmailConnection());
  } catch (error) {
    res.status(400).json({ error: `Connection failed: ${error.message}` });
  }
});

router.post('/email/send-test', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Recipient, subject and message are required' });
    }
    await sendEmail({
      to,
      subject,
      text: message,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${message
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('\n', '<br>')}</div>`
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: `Test email failed: ${error.message}` });
  }
});

export default router;
