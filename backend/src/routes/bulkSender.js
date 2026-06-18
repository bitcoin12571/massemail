import logger from '../services/logger.js';
import express from 'express';
import { createBulkCampaign, sendBulkCampaign, sendBulkCampaignDirect, getCampaignStats, getAllCampaigns, deleteCampaign } from '../services/bulkSenderService.js';
import BulkCampaign from '../models/BulkCampaign.js';
import { bulkAttachmentUpload, serializeUploadedFiles } from '../middleware/upload.js';

const router = express.Router();

// Create new campaign
router.post('/campaign', bulkAttachmentUpload.array('attachments'), async (req, res) => {
  try {
    const { name, subject, htmlTemplate, totalRecipients } = req.body ?? {};
    const attachments = serializeUploadedFiles(req.files);

    if (!name || !subject || !htmlTemplate) {
      return res.status(400).json({ error: 'Missing required fields: name, subject, htmlTemplate' });
    }

    const campaign = await createBulkCampaign({
      name,
      subject,
      htmlTemplate,
      totalRecipients
    });

    res.status(201).json({
      success: true,
      campaignId: campaign.id,
      campaign: {
        ...campaign.toJSON(),
        attachments
      }
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send campaign to selected recipients.
router.post('/campaign/:campaignId/send', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { emailIds, recipients, campaign } = req.body ?? {};

    if (!Number.isInteger(Number(campaignId))) {
      return res.status(400).json({ error: 'Invalid campaign ID' });
    }

    if (emailIds !== undefined && !Array.isArray(emailIds)) {
      return res.status(400).json({ error: 'emailIds must be an array' });
    }

    const isDirectSend = Array.isArray(recipients) && campaign;
    const result = isDirectSend
      ? await sendBulkCampaignDirect(campaign, recipients)
      : await sendBulkCampaign(parseInt(campaignId), emailIds);

    if (isDirectSend) {
      const storedCampaign = await BulkCampaign.findByPk(parseInt(campaignId));
      if (storedCampaign) {
        await storedCampaign.update({
          status: 'completed',
          totalRecipients: result.totalRecipients,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          completedAt: new Date()
        });
      }
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Campaign send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get campaign stats
router.get('/campaign/:campaignId/stats', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const stats = await getCampaignStats(parseInt(campaignId));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await getAllCampaigns();

    res.json({
      total: campaigns.length,
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        htmlTemplate: c.htmlTemplate,
        status: c.status,
        totalRecipients: c.totalRecipients,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        openedCount: c.openedCount,
        clickedCount: c.clickedCount,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        completedAt: c.completedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete campaign
router.delete('/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = await deleteCampaign(parseInt(campaignId));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
