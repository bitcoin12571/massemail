import express from 'express';
import { Op } from 'sequelize';
import Email from '../models/Email.js';
import Contact from '../models/Contact.js';
import { requireWebhookSecret } from '../middleware/security.js';
import logger from '../services/logger.js';
import bounceComplaintService from '../services/bounceComplaintService.js';

const router = express.Router();
router.use(requireWebhookSecret);

router.post('/sendgrid', async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [];

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // SECURITY: Only update emails that exist and validate event type
    const validEventTypes = ['bounce', 'click', 'deferred', 'delivered', 'dropped', 'open', 'processed', 'reject', 'spam', 'unsubscribe'];

    await Promise.all(events.map(async (event) => {
      if (!event.email || !event.event) return;

      // Only allow valid event types
      if (!validEventTypes.includes(event.event.toLowerCase())) return;

      await Email.update(
        { status: event.event.toLowerCase() },
        { where: { recipientEmail: event.email } }
      );
    }));

    res.sendStatus(204);
  } catch (error) {
    logger.error('WEBHOOK_SENDGRID', 'Error processing webhook', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * Generic bounce webhook handler
 * Accepts bounce notifications from email providers
 * Expected body: { email: string, bounceType: 'soft'|'hard', reason: string }
 */
router.post('/bounce', async (req, res) => {
  try {
    const { email, bounceType, reason, provider } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    logger.info('WEBHOOK_BOUNCE', `Bounce notification for ${email}: ${bounceType}`);

    // Use bounce complaint service to handle bounce
    const result = await bounceComplaintService.recordBounce(
      email,
      bounceType || 'unknown',
      reason || '',
      provider || 'unknown'
    );

    res.json(result);
  } catch (error) {
    logger.error('WEBHOOK_BOUNCE', `Error processing bounce for ${email}`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Complaint webhook handler
 * Handles spam complaints and unsubscribe notifications
 */
router.post('/complaint', async (req, res) => {
  try {
    const { email, complaintType, reason } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    logger.info('WEBHOOK_COMPLAINT', `Complaint for ${email}: ${complaintType || 'spam'}`);

    // Use bounce complaint service to handle complaint
    const result = await bounceComplaintService.recordComplaint(
      email,
      complaintType || 'spam',
      reason || ''
    );

    res.json(result);
  } catch (error) {
    logger.error('WEBHOOK_COMPLAINT', `Error processing complaint for ${email}`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
