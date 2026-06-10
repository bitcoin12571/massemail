import express from 'express';
import { improveEmail } from '../services/aiService.js';

const router = express.Router();

router.post('/rewrite', async (req, res) => {
  try {
    const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const language = typeof req.body.language === 'string' ? req.body.language.slice(0, 10) : 'en';

    if (!message) {
      return res.status(400).json({ error: 'Write a message before using AI' });
    }
    if (subject.length > 300 || message.length > 20000) {
      return res.status(400).json({ error: 'The draft is too long to rewrite' });
    }

    res.json(await improveEmail({ subject, message, language }));
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'AI rewriting failed' });
  }
});

export default router;
