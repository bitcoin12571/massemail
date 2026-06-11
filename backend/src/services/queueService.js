import { sendEmail } from './emailService.js';
import Email from '../models/Email.js';
import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';

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
    // Process 5 emails in parallel
    const batchSize = 5;
    const batch = [];
    for (let i = 0; i < batchSize && jobs.length > 0; i++) {
      batch.push(jobs.shift());
      stats.waiting -= 1;
      stats.active += 1;
    }

    await Promise.all(batch.map(async (job) => {
      let emailRecord;
      try {
        emailRecord = await Email.findByPk(job.emailId);
        const campaign = await Campaign.findByPk(job.campaignId);
        const contact = await Contact.findByPk(job.contactId);

        if (!emailRecord) {
          throw new Error(`Email record ${job.emailId} not found`);
        }
        if (!campaign) {
          throw new Error(`Campaign ${job.campaignId} not found`);
        }
        if (!contact) {
          throw new Error(`Contact ${job.contactId} not found`);
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
    jobs.push({ id: jobId, ...data });
    stats.waiting += 1;
    console.log(`\n[EMAIL QUEUE] ✅ ✅ ✅ Job ${jobId} added!`);
    console.log(`[EMAIL QUEUE] Queue size: ${jobs.length}, Waiting: ${stats.waiting}\n`);

    // Process IMMEDIATELY, not deferred
    console.log(`[EMAIL QUEUE] 🔄 Starting processJobs NOW...`);
    await processJobs();
    console.log(`[EMAIL QUEUE] 🔄 Done processing\n`);
  }
};

export async function initializeQueue() {
  console.log('Email queue initialized (local mode)');
}

export async function getQueueStats() {
  return { ...stats, total: stats.waiting + stats.active + stats.completed + stats.failed };
}

export async function clearFailedJobs() {
  const count = stats.failed;
  stats.failed = 0;
  return count;
}

export async function retryFailedJobs() {
  const failedEmails = await Email.findAll({ where: { status: 'failed' } });
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
