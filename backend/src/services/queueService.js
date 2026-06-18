import { sendEmail } from './emailService.js';
import Email from '../models/Email.js';
import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import JobQueue from '../models/JobQueue.js';
import { fn, col, Op } from 'sequelize';

const jobs = [];
const stats = { waiting: 0, active: 0, completed: 0, failed: 0 };
let processing = false;
let nextId = 1;

function personalize(content = '', contact) {
  const [firstName = '', ...lastParts] = (contact.name || '').split(' ');
  const values = {
    firstName,
    lastName: lastParts.join(' '),
    email: contact.email,
    company: contact.customData?.company || ''
  };

  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    content
  );
}

async function processJobs() {
  if (processing) return;
  processing = true;

  while (jobs.length > 0) {
    // Process emails in parallel for faster sending.
    const batchSize = 100;
    const batch = [];
    for (let i = 0; i < batchSize && jobs.length > 0; i++) {
      batch.push(jobs.shift());
      stats.waiting -= 1;
      stats.active += 1;
    }

    await Promise.allSettled(batch.map(async (job) => {
      let emailRecord;
      let jobQueueRecord;
      try {
        // Fetch all data in parallel for speed
        const [emailRec, camp, cont] = await Promise.all([
          Email.findByPk(job.emailId),
          Campaign.findByPk(job.campaignId),
          Contact.findByPk(job.contactId)
        ]);

        emailRecord = emailRec;
        const campaign = camp;
        const contact = cont;

        if (!emailRecord) {
          throw new Error(`Email record ${job.emailId} not found`);
        }
        if (!campaign) {
          throw new Error(`Campaign ${job.campaignId} not found`);
        }
        if (!contact) {
          throw new Error(`Contact ${job.contactId} not found`);
        }

        // Create job queue record if it doesn't exist
        if (!job.queueId) {
          jobQueueRecord = await JobQueue.create({
            emailId: job.emailId,
            campaignId: job.campaignId,
            contactId: job.contactId,
            status: 'active'
          });
          job.queueId = jobQueueRecord.id;
        } else {
          jobQueueRecord = await JobQueue.findByPk(job.queueId);
          if (jobQueueRecord) {
            await jobQueueRecord.update({ status: 'active' });
          }
        }

        console.log(`[EMAIL QUEUE] ✅ Processing email ${job.emailId} to ${contact.email}`);

        const result = await sendEmail({
          to: contact.email,
          subject: campaign.subject,
          html: personalize(campaign.htmlContent, contact),
          text: personalize(campaign.textContent, contact),
          attachments: (campaign.attachments || []).map((attachment) => ({
            filename: attachment.filename,
            content: Buffer.from(attachment.content, 'base64'),
            contentType: attachment.contentType
          }))
        });

        console.log(`[EMAIL QUEUE] ✅ Email ${job.emailId} sent successfully. Message ID: ${result.messageId}`);

        await emailRecord.update({
          status: 'sent',
          sentAt: new Date(),
          sendgridMessageId: result.messageId
        });

        // Update job queue record to completed
        if (jobQueueRecord) {
          await jobQueueRecord.update({ status: 'completed' });
        }

        stats.completed += 1;
        console.log(`[EMAIL QUEUE] Stats: ${stats.completed} sent, ${stats.failed} failed, ${stats.waiting} waiting`);
      } catch (error) {
        console.error(`[EMAIL QUEUE] ❌ Error processing email ${job.emailId}:`, error.message || error);
        console.error(error.stack);

        if (emailRecord) {
          const failReason = error.message || String(error);
          await emailRecord.update({
            status: 'failed',
            failureReason: failReason.substring(0, 500)
          });
        }

        // Update job queue record to failed
        if (jobQueueRecord) {
          await jobQueueRecord.update({
            status: 'failed',
            failureReason: error.message || String(error)
          });
        }

        stats.failed += 1;
      } finally {
        stats.active -= 1;
      }
    }));
  }

  processing = false;
}

export const emailQueue = {
  async add(data) {
    const jobId = nextId++;

    let jobQueueRecord = null;
    try {
      jobQueueRecord = await JobQueue.create({
        emailId: data.emailId,
        campaignId: data.campaignId,
        contactId: data.contactId,
        status: 'waiting'
      });
    } catch (error) {
      console.error(`[EMAIL QUEUE] Could not persist waiting job ${jobId}:`, error.message);
    }

    jobs.push({ id: jobId, queueId: jobQueueRecord?.id, ...data });
    stats.waiting += 1;
    console.log(`\n[EMAIL QUEUE] ✅ ✅ ✅ Job ${jobId} added!`);
    console.log(`[EMAIL QUEUE] Queue size: ${jobs.length}, Waiting: ${stats.waiting}\n`);

    // Process IMMEDIATELY, not deferred
    console.log(`[EMAIL QUEUE] 🔄 Starting processJobs NOW...`);
    await processJobs();
    console.log(`[EMAIL QUEUE] 🔄 Done processing\n`);
    return jobId;
  }
};

export function resetQueueForTests() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Queue reset is only available in tests');
  }
  jobs.length = 0;
  stats.waiting = 0;
  stats.active = 0;
  stats.completed = 0;
  stats.failed = 0;
  processing = false;
  nextId = 1;
}

export async function initializeQueue() {
  console.log('Email queue initialized (local mode)');
}

export async function getQueueStats() {
  try {
    // Get real-time in-memory stats
    const inMemoryStats = {
      waiting: stats.waiting,
      active: stats.active,
      completed: stats.completed,
      failed: stats.failed,
      total: stats.waiting + stats.active + stats.completed + stats.failed
    };

    // Get persisted stats from database
    const dbStats = await JobQueue.findAll({
      attributes: [
        ['status', 'status'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Merge stats
    const persistedStats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0
    };

    dbStats.forEach(stat => {
      persistedStats[stat.status] = parseInt(stat.count, 10);
    });

    // Return combined stats (in-memory + persisted)
    const total = inMemoryStats.total + Object.values(persistedStats).reduce((a, b) => a + b, 0);
    return {
      waiting: inMemoryStats.waiting,
      active: inMemoryStats.active,
      completed: inMemoryStats.completed,
      failed: inMemoryStats.failed,
      inMemory: inMemoryStats,
      persisted: persistedStats,
      total
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return {
      ...stats,
      total: stats.waiting + stats.active + stats.completed + stats.failed,
      error: 'Failed to fetch persisted stats'
    };
  }
}

export async function clearFailedJobs({ campaignIds } = {}) {
  const where = { status: 'failed' };
  const emailWhere = { status: 'failed' };
  if (Array.isArray(campaignIds)) {
    where.campaignId = { [Op.in]: campaignIds };
    emailWhere.campaignId = { [Op.in]: campaignIds };
  }

  const [jobCount, emailResult] = await Promise.all([
    JobQueue.destroy({ where }),
    Email.update({ status: 'bounced', failureReason: null }, { where: emailWhere })
  ]);

  const emailCount = Array.isArray(emailResult) ? Number(emailResult[0]) || 0 : Number(emailResult) || 0;
  stats.failed = Math.max(0, stats.failed - Math.max(jobCount, emailCount));
  return Math.max(jobCount, emailCount);
}

export async function retryFailedJobs({ campaignIds } = {}) {
  const where = { status: 'failed' };
  if (Array.isArray(campaignIds)) where.campaignId = { [Op.in]: campaignIds };

  const failedEmails = await Email.findAll({ where });
  stats.failed = Math.max(0, stats.failed - failedEmails.length);
  for (const email of failedEmails) {
    await email.update({ status: 'pending', failureReason: null });
    await emailQueue.add({
      emailId: email.id,
      campaignId: email.campaignId,
      contactId: email.contactId
    });
  }
  return failedEmails.length;
}
