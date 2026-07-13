const express = require('express');
const Subscriber = require('../models/Subscriber');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Get all subscribers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const subscribers = await Subscriber.find({ isSubscribed: true })
      .sort({ subscriptionDate: -1 });

    res.json({
      subscribers,
      total: subscribers.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new subscriber
router.post('/', async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existingSubscriber) {
      if (existingSubscriber.isSubscribed) {
        return res.status(400).json({ error: 'Email already subscribed' });
      } else {
        // Resubscribe
        existingSubscriber.isSubscribed = true;
        existingSubscriber.unsubscribeDate = null;
        await existingSubscriber.save();
        return res.json({ success: true, message: 'Resubscribed successfully' });
      }
    }

    const subscriber = new Subscriber({
      email: email.toLowerCase(),
      firstName: firstName || '',
      lastName: lastName || ''
    });

    await subscriber.save();

    res.json({
      success: true,
      message: 'Subscribed successfully',
      subscriber
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe
router.post('/:id/unsubscribe', async (req, res) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    subscriber.isSubscribed = false;
    subscriber.unsubscribeDate = new Date();
    await subscriber.save();

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test email to subscriber
router.post('/:id/test-email', authMiddleware, async (req, res) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const { testEmail } = require('../services/emailService');
    await testEmail(subscriber.email);

    res.json({ success: true, message: `Test email sent to ${subscriber.email}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
