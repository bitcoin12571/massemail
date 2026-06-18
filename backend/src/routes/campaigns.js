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
import { validateRequest } from '../middleware/validation.js';
import { campaignSchema, campaignSendSchema, previewEmailSchema } from '../schemas/email.schema.js';
import { emailSendLimiter, campaignSendLimiter } from '../middleware/rateLimiter.js';
import logger from '../services/logger.js';

const router = express.Router();

function getDateFilter(value) {
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) return null;
  const from = new Date();
  from.setDate(from.getDate() - Math.min(days, 3650));
  return from;
}

function buildCampaignSummaries(statusRows = []) {
  const summaries = new Map();
  const sentStatuses = new Set(['sent', 'delivered', 'opened', 'clicked']);

  statusRows.forEach((row) => {
    const campaignId = row.campaignId;
    const count = Number(row.count) || 0;
    const summary = summaries.get(campaignId) || {
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      pendingCount: 0,
      openedCount: 0,
      clickedCount: 0
    };

    summary.totalRecipients += count;
    if (sentStatuses.has(row.status)) summary.sentCount += count;
    if (row.status === 'failed' || row.status === 'bounced') summary.failedCount += count;
    if (row.status === 'pending') summary.pendingCount += count;
    if (row.status === 'opened') summary.openedCount += count;
    if (row.status === 'clicked') summary.clickedCount += count;

    summaries.set(campaignId, summary);
  });

  return summaries;
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
    const failed = await Email.count({ where: { ...emailScope, status: { [Op.in]: ['failed', 'bounced'] } } });
    const opened = await Email.count({ where: { ...emailScope, status: { [Op.in]: ['opened', 'clicked'] } } });
    const clicked = await Email.count({ where: { ...emailScope, status: 'clicked' } });
    res.json({
      campaigns,
      contacts,
      sent,
      failed,
      successRate: sent + failed ? Math.round((sent / (sent + failed)) * 100) : 0,
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

    const campaignIds = campaigns.map((campaign) => campaign.id);
    const statusRows = campaignIds.length
      ? await Email.findAll({
        where: { campaignId: { [Op.in]: campaignIds } },
        attributes: ['campaignId', 'status', [fn('COUNT', col('*')), 'count']],
        group: ['campaignId', 'status'],
        raw: true
      })
      : [];
    const summaries = buildCampaignSummaries(statusRows);
    const emailRows = campaignIds.length
      ? await Email.findAll({
        where: { campaignId: { [Op.in]: campaignIds } },
        attributes: ['campaignId', 'recipientEmail', 'status', 'sentAt', 'createdAt'],
        order: [['createdAt', 'DESC']],
        raw: true
      })
      : [];
    const recipientsByCampaign = emailRows.reduce((groups, email) => {
      const current = groups.get(email.campaignId) || [];
      if (current.length < 25) {
        current.push({
          email: email.recipientEmail,
          status: ['sent', 'delivered', 'opened', 'clicked'].includes(email.status) ? 'sent' : email.status,
          sentAt: email.sentAt || email.createdAt
        });
      }
      groups.set(email.campaignId, current);
      return groups;
    }, new Map());

    res.json(campaigns.map((campaign) => {
      const summary = summaries.get(campaign.id) || {};
      return {
        ...campaign.toJSON(),
        totalRecipients: summary.totalRecipients || 0,
        sentCount: summary.sentCount || 0,
        failedCount: summary.failedCount || 0,
        pendingCount: summary.pendingCount || 0,
        openedCount: summary.openedCount || 0,
        clickedCount: summary.clickedCount || 0,
        recipients: recipientsByCampaign.get(campaign.id) || []
      };
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', validateRequest(campaignSchema), async (req, res) => {
  try {
    const { name, subject, htmlContent, textContent } = req.body;
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

router.post('/:id/send', emailSendLimiter, campaignSendLimiter, async (req, res) => {
  try {
    logger.info('CAMPAIGN', `Sending campaign ${req.params.id}`);
    const campaign = await Campaign.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const where = { createdBy: req.user.id, status: 'active' };
    // Send to specified contacts or all active if none specified
    const contactIds = req.body?.contactIds || req.body?.emailIds;
    if (Array.isArray(contactIds) && contactIds.length > 0) {
      where.id = { [Op.in]: contactIds };
    }

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

    const failedCount = await Email.count({ where: { campaignId: campaign.id, status: 'failed' } });
    await campaign.update({
      status: failedCount ? 'paused' : 'sent',
      sentAt: failedCount ? null : new Date()
    });

    console.log(`[CAMPAIGN SEND] ✅ Campaign send initiated for ${contacts.length} contacts\n`);
    res.json({ success: failedCount === 0, emailCount: contacts.length, failedCount });
  } catch (error) {
    console.error(`[CAMPAIGN SEND] ❌ Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/preview', validateRequest(previewEmailSchema), async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const contact = await Contact.findOne({ where: { id: req.body.contactId, createdBy: req.user.id } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    // Personalize the email content with contact data
    // SECURITY: Escape regex special characters to prevent ReDoS attacks
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const personalize = (template, contact) => {
      let content = template;
      content = content.replace(/{{firstName}}/g, contact.firstName || '');
      content = content.replace(/{{lastName}}/g, contact.lastName || '');
      content = content.replace(/{{email}}/g, contact.email || '');
      // Support any custom fields in the contact (with escaped regex to prevent ReDoS)
      if (contact.customData) {
        Object.entries(contact.customData).forEach(([key, value]) => {
          const escapedKey = escapeRegex(key);
          content = content.replace(new RegExp(`{{${escapedKey}}}`, 'g'), value || '');
        });
      }
      return content;
    };

    const previewHtml = personalize(campaign.htmlContent, contact);
    const previewSubject = personalize(campaign.subject, contact);

    res.json({
      subject: previewSubject,
      htmlContent: previewHtml,
      textContent: campaign.textContent ? personalize(campaign.textContent, contact) : undefined,
      contact: {
        id: contact.id,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName
      }
    });
  } catch (error) {
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

// Get paginated email list for a campaign
router.get('/:id/emails', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const offset = (page - 1) * limit;

    const where = { campaignId: campaign.id };
    if (status) where.status = status;

    const { count, rows: emails } = await Email.findAndCountAll({
      where,
      attributes: ['id', 'recipientEmail', 'status', 'sentAt', 'openedAt', 'clickedAt', 'failureReason', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      emails,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics for a campaign
router.get('/:id/analytics', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Get all email statuses
    const emails = await Email.findAll({
      where: { campaignId: campaign.id },
      attributes: ['status', 'sentAt', 'openedAt', 'clickedAt', [fn('COUNT', col('*')), 'count']],
      group: ['status'],
      raw: true
    });

    // Count by status
    const statusCounts = {};
    emails.forEach(e => {
      statusCounts[e.status] = parseInt(e.count) || 0;
    });

    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const sent = statusCounts['sent'] || statusCounts['delivered'] || 0;
    const opened = statusCounts['opened'] || 0;
    const clicked = statusCounts['clicked'] || 0;
    const failed = statusCounts['failed'] || 0;
    const bounced = statusCounts['bounced'] || 0;

    res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        createdAt: campaign.createdAt,
        sentAt: campaign.sentAt
      },
      summary: {
        total,
        sent,
        pending: statusCounts['pending'] || 0,
        opened,
        openRate: sent ? Math.round((opened / sent) * 100) : 0,
        clicked,
        clickRate: sent ? Math.round((clicked / sent) * 100) : 0,
        failed,
        bounced,
        failureRate: total ? Math.round((failed / total) * 100) : 0,
        bounceRate: total ? Math.round((bounced / total) * 100) : 0
      },
      statusBreakdown: statusCounts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
