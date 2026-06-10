import express from 'express';
import { fn, col, Op } from 'sequelize';
import Campaign from '../models/Campaign.js';
import Email from '../models/Email.js';
import Contact from '../models/Contact.js';
import {
  clearFailedJobs,
  emailQueue,
  getQueueStats,
  retryFailedJobs
} from '../services/queueService.js';

const router = express.Router();

function getDateFilter(value) {
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) return null;
  const from = new Date();
  from.setDate(from.getDate() - Math.min(days, 3650));
  return from;
}

router.get('/overview', async (req, res) => {
  try {
    const from = getDateFilter(req.query.days);
    const campaignWhere = { createdBy: req.user.id };
    const contactWhere = { createdBy: req.user.id, status: 'active' };
    if (from) {
      campaignWhere.createdAt = { [Op.gte]: from };
      contactWhere.createdAt = { [Op.gte]: from };
    }

    const campaignRows = await Campaign.findAll({ where: campaignWhere, attributes: ['id'], raw: true });
    const campaignIds = campaignRows.map((campaign) => campaign.id);
    const emailScope = campaignIds.length ? { campaignId: { [Op.in]: campaignIds } } : { campaignId: null };
    const campaigns = campaignIds.length;
    const contacts = await Contact.count({ where: contactWhere });
    const sent = await Email.count({ where: { ...emailScope, status: { [Op.in]: ['sent', 'delivered', 'opened', 'clicked'] } } });
    const opened = await Email.count({ where: { ...emailScope, status: { [Op.in]: ['opened', 'clicked'] } } });
    const clicked = await Email.count({ where: { ...emailScope, status: 'clicked' } });
    res.json({
      campaigns,
      contacts,
      sent,
      openRate: sent ? Math.round((opened / sent) * 100) : 0,
      clickRate: sent ? Math.round((clicked / sent) * 100) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/queue', async (req, res) => {
  res.json(await getQueueStats());
});

router.post('/stats/queue/clear', async (req, res) => {
  res.json({ cleared: await clearFailedJobs() });
});

router.post('/stats/queue/retry', async (req, res) => {
  res.json({ retried: await retryFailedJobs() });
});

router.get('/', async (req, res) => {
  try {
    const from = getDateFilter(req.query.days);
    const where = { createdBy: req.user.id };
    if (from) where.createdAt = { [Op.gte]: from };
    const campaigns = await Campaign.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, subject, htmlContent, textContent } = req.body;
    if (!name || !subject || !htmlContent) {
      return res.status(400).json({ error: 'Name, subject and email content are required' });
    }
    const campaign = await Campaign.create({
      name,
      subject,
      htmlContent,
      textContent,
      createdBy: req.user.id
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    console.log(`\n[CAMPAIGN SEND] 📧 Sending campaign ${req.params.id}`);
    const campaign = await Campaign.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const where = { createdBy: req.user.id, status: 'active' };
    // TESTING: Skip verification check for dev mode
    if (req.body.contactIds?.length) where.id = req.body.contactIds;
    const contacts = await Contact.findAll({ where });
    if (!contacts.length) return res.status(400).json({ error: 'Add at least one active contact before sending' });

    console.log(`[CAMPAIGN SEND] Found ${contacts.length} contacts to send to`);
    await campaign.update({ status: 'sending' });

    for (const contact of contacts) {
      console.log(`[CAMPAIGN SEND] Creating email for ${contact.email}`);
      const email = await Email.create({
        campaignId: campaign.id,
        contactId: contact.id,
        recipientEmail: contact.email
      });
      console.log(`[CAMPAIGN SEND] Adding to queue: ${email.id}`);
      await emailQueue.add({ emailId: email.id, campaignId: campaign.id, contactId: contact.id });
    }

    console.log(`[CAMPAIGN SEND] ✅ Campaign send initiated for ${contacts.length} contacts\n`);
    res.json({ success: true, emailCount: contacts.length });
  } catch (error) {
    console.error(`[CAMPAIGN SEND] ❌ Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  const campaign = await Campaign.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  await campaign.update({ status: 'paused' });
  res.json(campaign);
});

router.delete('/:id', async (req, res) => {
  const deleted = await Campaign.destroy({ where: { id: req.params.id, createdBy: req.user.id } });
  if (!deleted) return res.status(404).json({ error: 'Campaign not found' });
  res.json({ success: true });
});

router.get('/:id', async (req, res) => {
  const campaign = await Campaign.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const stats = await Email.findAll({
    where: { campaignId: campaign.id },
    attributes: ['status', [fn('COUNT', col('*')), 'count']],
    group: ['status'],
    raw: true
  });
  res.json({ campaign, stats });
});

// DEBUG: Check failed emails with error reasons
router.get('/:id/debug/errors', async (req, res) => {
  const campaign = await Campaign.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const failedEmails = await Email.findAll({
    where: { campaignId: campaign.id, status: 'failed' },
    attributes: ['id', 'recipientEmail', 'status', 'failureReason', 'createdAt'],
    limit: 10
  });
  res.json({ failedEmails, count: failedEmails.length });
});

export default router;
