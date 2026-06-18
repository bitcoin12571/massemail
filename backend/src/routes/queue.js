import express from 'express';
import { Op } from 'sequelize';
import { clearFailedJobs, getQueueStats, retryFailedJobs } from '../services/queueService.js';
import JobQueue from '../models/JobQueue.js';
import Campaign from '../models/Campaign.js';

const router = express.Router();

// GET queue stats (real-time and persisted)
router.get('/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET job history with pagination
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status = null } = req.query;

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const { count, rows } = await JobQueue.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      total: count,
      jobs: rows,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching job history:', error);
    res.status(500).json({ error: error.message });
  }
});

async function getUserCampaignIds(userId) {
  const campaigns = await Campaign.findAll({
    where: { createdBy: userId },
    attributes: ['id'],
    raw: true
  });
  return campaigns.map((campaign) => campaign.id);
}

router.post('/failed/clear', async (req, res) => {
  try {
    const campaignIds = await getUserCampaignIds(req.user.id);
    const cleared = campaignIds.length
      ? await clearFailedJobs({ campaignIds })
      : 0;
    res.json({ success: true, cleared });
  } catch (error) {
    console.error('Error clearing failed jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/failed/retry', async (req, res) => {
  try {
    const campaignIds = await getUserCampaignIds(req.user.id);
    const retried = campaignIds.length
      ? await retryFailedJobs({ campaignIds })
      : 0;
    res.json({ success: true, retried });
  } catch (error) {
    console.error('Error retrying failed jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single job details
router.get('/:jobId', async (req, res) => {
  try {
    const job = await JobQueue.findByPk(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE old completed jobs (cleanup)
router.delete('/cleanup', async (req, res) => {
  try {
    const { daysOld = 7 } = req.query;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const deleted = await JobQueue.destroy({
      where: {
        status: ['completed', 'failed'],
        createdAt: {
          [Op.lt]: cutoffDate
        }
      }
    });

    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
