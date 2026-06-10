import express from 'express';
import Email from '../models/Email.js';

const router = express.Router();

router.post('/sendgrid', async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [];

  await Promise.all(events.map(async (event) => {
    if (!event.email || !event.event) return;

    await Email.update(
      { status: event.event },
      { where: { recipientEmail: event.email } }
    );
  }));

  res.sendStatus(204);
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

    console.log(`[WEBHOOK] 📧 Bounce notification for ${email}: ${bounceType} (${provider || 'unknown'})`);

    // Update email records for this recipient
    const failureReason = `${bounceType || 'hard'} bounce${reason ? ': ' + reason : ''}`;

    const updated = await Email.update(
      {
        status: 'bounced',
        failureReason: failureReason.substring(0, 500)
      },
      {
        where: { recipientEmail: email, status: { [require('sequelize').Op.notIn]: ['bounced', 'sent', 'opened', 'clicked'] } }
      }
    );

    console.log(`[WEBHOOK] ✅ Updated ${updated[0]} email record(s) to bounced status`);

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

    console.log(`[WEBHOOK] 😞 Complaint for ${email}: ${complaintType || 'spam'}`);

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

    console.log(`[WEBHOOK] ✅ Marked ${updated[0]} email(s) as unsubscribed`);

    res.json({ success: true, updated: updated[0] });
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error processing complaint:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
