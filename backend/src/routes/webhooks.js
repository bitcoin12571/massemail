import express from 'express';
import { Op } from 'sequelize';
import Email from '../models/Email.js';
import { requireWebhookSecret } from '../middleware/security.js';
import logger from '../services/logger.js';

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

    logger.info('WEBHOOK', `Bounce notification for ${email}: ${bounceType}`);

    // Update email records for this recipient
    const failureReason = `${bounceType || 'hard'} bounce${reason ? ': ' + reason : ''}`;

    const updated = await Email.update(
      {
        status: 'bounced',
        failureReason: failureReason.substring(0, 500)
      },
      {
        where: { recipientEmail: email, status: { [Op.notIn]: ['bounced', 'sent', 'opened', 'clicked'] } }
      }
    );

    logger.info('WEBHOOK', `Updated ${updated[0]} email record(s) to bounced status`);

    res.json({ success: true, updated: updated[0] });
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error processing bounce:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Complaint webhook handler
 * Handles spam complaints and unsubscribe notifications
 */
router.post('/complaint', async (req, res) => {
  try {
    const { email, complaintType } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    logger.info('WEBHOOK', `Complaint for ${email}: ${complaintType || 'spam'}`);

    // Mark as unsubscribed or complained
    const updated = await Email.update(
      {
        status: 'unsubscribed',
        failureReason: `${complaintType || 'spam'} complaint`
      },
      {
        where: { recipientEmail: email }
      }
    );

    logger.info('WEBHOOK', `Marked ${updated[0]} email(s) as unsubscribed`);

    res.json({ success: true, updated: updated[0] });
  } catch (error) {
    logger.error('WEBHOOK_COMPLAINT', 'Error processing complaint', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
