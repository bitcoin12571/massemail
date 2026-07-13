const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Newsletter = require('../models/Newsletter');
const Subscriber = require('../models/Subscriber');

const router = express.Router();

// Dashboard stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const newsletters = await Newsletter.find({ createdBy: req.userId });
    const subscribers = await Subscriber.find({ isSubscribed: true });

    const stats = {
      totalNewsletters: newsletters.length,
      sentNewsletters: newsletters.filter(n => n.status === 'sent').length,
      totalSubscribers: subscribers.length,
      totalEmailsSent: newsletters.reduce((sum, n) => sum + (n.recipientCount || 0), 0),
      totalOpens: newsletters.reduce((sum, n) => sum + (n.openCount || 0), 0),
      totalClicks: newsletters.reduce((sum, n) => sum + (n.clickCount || 0), 0)
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scheduler status
router.get('/scheduler-status', authMiddleware, async (req, res) => {
  try {
    const schedulerService = require('../services/schedulerService');
    const status = schedulerService.getScheduleStatus();

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
