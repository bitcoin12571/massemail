const express = require('express');
const Newsletter = require('../models/Newsletter');
const authMiddleware = require('../middleware/authMiddleware');

// Use mock services for local development
const USE_MOCK_AI = process.env.USE_MOCK_AI === 'true';
const USE_MOCK_EMAIL = process.env.USE_MOCK_EMAIL === 'true';

const aiService = USE_MOCK_AI
  ? require('../services/mockAiService')
  : require('../services/openaiService');

const emailService = USE_MOCK_EMAIL
  ? require('../services/mockEmailService')
  : require('../services/emailService');

const { generateArticles, generateImages } = aiService;
const { sendNewsletter, testEmail } = emailService;
const Subscriber = require('../models/Subscriber');

const router = express.Router();

// Generate new newsletter
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { topic, numArticles = 3, tone = 'professional', subject } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    console.log(`\n📰 Generating newsletter for user ${req.userId}`);
    console.log(`   Topic: "${topic}", Articles: ${numArticles}, Tone: ${tone}`);

    // Generate articles
    const articles = await generateArticles(topic, numArticles, tone);

    // Generate images
    const imagePrompts = articles.map(a => a.imagePrompt);
    const imageUrls = await generateImages(imagePrompts);

    // Attach image URLs to articles
    articles.forEach((article, index) => {
      article.imageUrl = imageUrls[index];
    });

    // Create newsletter
    const newsletter = new Newsletter({
      createdBy: req.userId,
      subject: subject || `Newsletter: ${topic}`,
      articles,
      status: 'draft'
    });

    await newsletter.save();

    console.log(`✅ Newsletter created with ID: ${newsletter._id}`);

    res.json({
      success: true,
      newsletter,
      message: 'Newsletter generated successfully'
    });
  } catch (error) {
    console.error('Newsletter generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all newsletters for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const newsletters = await Newsletter.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });

    res.json(newsletters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single newsletter
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);

    if (!newsletter || newsletter.createdBy.toString() !== req.userId) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    res.json(newsletter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update newsletter
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { subject, articles } = req.body;

    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter || newsletter.createdBy.toString() !== req.userId) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    if (subject) newsletter.subject = subject;
    if (articles) newsletter.articles = articles;
    newsletter.updatedAt = new Date();

    await newsletter.save();

    res.json({
      success: true,
      newsletter,
      message: 'Newsletter updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Regenerate single article text
router.post('/:id/regenerate-text/:articleIndex', authMiddleware, async (req, res) => {
  try {
    const { topic } = req.body;
    const newsletter = await Newsletter.findById(req.params.id);

    if (!newsletter || newsletter.createdBy.toString() !== req.userId) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    const articleIndex = parseInt(req.params.articleIndex);
    if (articleIndex < 0 || articleIndex >= newsletter.articles.length) {
      return res.status(400).json({ error: 'Invalid article index' });
    }

    // Generate new articles (just 1)
    const newArticles = await generateArticles(topic || newsletter.subject, 1, 'professional');
    const newArticle = newArticles[0];

    // Keep the old image, just update text
    newsletter.articles[articleIndex].title = newArticle.title;
    newsletter.articles[articleIndex].content = newArticle.content;
    newsletter.articles[articleIndex].imagePrompt = newArticle.imagePrompt;

    await newsletter.save();

    res.json({
      success: true,
      article: newsletter.articles[articleIndex],
      message: 'Article text regenerated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Regenerate single article image
router.post('/:id/regenerate-image/:articleIndex', authMiddleware, async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);

    if (!newsletter || newsletter.createdBy.toString() !== req.userId) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    const articleIndex = parseInt(req.params.articleIndex);
    if (articleIndex < 0 || articleIndex >= newsletter.articles.length) {
      return res.status(400).json({ error: 'Invalid article index' });
    }

    // Generate new image
    const imagePrompt = newsletter.articles[articleIndex].imagePrompt;
    const [newImageUrl] = await generateImages([imagePrompt]);

    newsletter.articles[articleIndex].imageUrl = newImageUrl;
    await newsletter.save();

    res.json({
      success: true,
      imageUrl: newImageUrl,
      message: 'Image regenerated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send newsletter immediately
router.post('/:id/send', authMiddleware, async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);

    if (!newsletter || newsletter.createdBy.toString() !== req.userId) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    const subscribers = await Subscriber.find({ isSubscribed: true });
    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No subscribers found' });
    }

    const result = await sendNewsletter(newsletter, subscribers);

    res.json({
      success: true,
      result,
      message: `Newsletter sent to ${result.sent} subscribers`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule newsletter for later
router.post('/:id/schedule', authMiddleware, async (req, res) => {
  try {
    const { scheduledFor } = req.body;

    if (!scheduledFor) {
      return res.status(400).json({ error: 'Scheduled time is required' });
    }

    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter || newsletter.createdBy.toString() !== req.userId) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    newsletter.status = 'scheduled';
    newsletter.scheduledFor = new Date(scheduledFor);
    await newsletter.save();

    res.json({
      success: true,
      newsletter,
      message: `Newsletter scheduled for ${scheduledFor}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete newsletter
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);

    if (!newsletter || newsletter.createdBy.toString() !== req.userId) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    await Newsletter.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: 'Newsletter deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
