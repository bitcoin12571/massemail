import logger from '../services/logger.js';
import express from 'express';
import { createBulkCampaign, sendBulkCampaign, getCampaignStats, getAllCampaigns, deleteCampaign } from '../services/bulkSenderService.js';

const router = express.Router();

// Create new campaign
router.post('/campaign', async (req, res) => {
  try {
    const { name, subject, htmlTemplate, region, totalRecipients } = req.body;

    if (!name || !subject || !htmlTemplate) {
      return res.status(400).json({ error: 'Missing required fields: name, subject, htmlTemplate' });
    }

    const campaign = await createBulkCampaign({
      name,
      subject,
      htmlTemplate,
      region,
      totalRecipients
    });

    res.status(201).json({
      success: true,
      campaignId: campaign.id,
      campaign: campaign.toJSON()
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send campaign to specific emails or region
router.post('/campaign/:campaignId/send', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { emailIds } = req.body; // Optional: specific email IDs

    const result = await sendBulkCampaign(parseInt(campaignId), emailIds);

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
        region: c.region,
        status: c.status,
        totalRecipients: c.totalRecipients,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        openedCount: c.openedCount,
        clickedCount: c.clickedCount,
        createdAt: c.createdAt
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
