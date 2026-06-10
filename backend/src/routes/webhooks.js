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

export default router;
