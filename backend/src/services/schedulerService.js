import cron from 'node-cron';
import Campaign from '../models/Campaign.js';
import Email from '../models/Email.js';
import Contact from '../models/Contact.js';
import { emailQueue } from './queueService.js';
import { Op } from 'sequelize';

/**
 * Email scheduler service
 * Runs cron jobs to check for scheduled campaigns and trigger them at the right time
 */

let schedulerTask = null;

/**
 * Start the email scheduler
 * Runs every minute to check for campaigns that should be sent
 */
export function startScheduler() {
  if (schedulerTask) {
    console.log('[SCHEDULER] ⚠️ Scheduler already running, skipping restart');
    return;
  }

  // Run every minute
  schedulerTask = cron.schedule('* * * * *', async () => {
    try {
      await processScheduledCampaigns();
    } catch (error) {
      console.error('[SCHEDULER] ❌ Error processing scheduled campaigns:', error);
    }
  });

  console.log('[SCHEDULER] ✅ Email scheduler started (runs every minute)');
}

/**
 * Stop the email scheduler
 */
export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('[SCHEDULER] ⏹️  Email scheduler stopped');
  }
}

/**
 * Process campaigns that are scheduled to send now
 */
export async function processScheduledCampaigns() {
  try {
    // Find campaigns that are scheduled and their scheduledAt time is now or in the past
    const now = new Date();

    const scheduledCampaigns = await Campaign.findAll({
      where: {
        status: 'scheduled',
        scheduledAt: {
          [Op.lte]: now
        }
      }
    });

    if (scheduledCampaigns.length === 0) {
      return; // No campaigns to process
    }

    console.log(`[SCHEDULER] 📅 Found ${scheduledCampaigns.length} campaign(s) to send`);

    for (const campaign of scheduledCampaigns) {
      await triggerCampaignSend(campaign);
    }
  } catch (error) {
    console.error('[SCHEDULER] ❌ Error in processScheduledCampaigns:', error);
  }
}

/**
 * Trigger sending of a campaign
 * Creates Email records and queues them for sending
 */
async function triggerCampaignSend(campaign) {
  try {
    console.log(`[SCHEDULER] 🚀 Triggering send for campaign ${campaign.id}: "${campaign.name}"`);

    // Update campaign status to 'sending'
    await campaign.update({ status: 'sending' });

    // Get all active contacts for this user
    const contacts = await Contact.findAll({
      where: {
        createdBy: campaign.createdBy,
        status: 'active'
      }
    });

    if (contacts.length === 0) {
      console.log(`[SCHEDULER] ⚠️ No active contacts found for campaign ${campaign.id}`);
      await campaign.update({ status: 'sent' });
      return;
    }

    console.log(`[SCHEDULER] 📧 Queuing emails for ${contacts.length} contact(s)`);

    // Create Email records and add to queue
    for (const contact of contacts) {
      try {
        const email = await Email.create({
          campaignId: campaign.id,
          contactId: contact.id,
          recipientEmail: contact.email,
          status: 'pending'
        });

        // Add to queue for processing
        await emailQueue.add({
          emailId: email.id,
          campaignId: campaign.id,
          contactId: contact.id
        });
      } catch (emailError) {
        console.error(`[SCHEDULER] ❌ Error creating email for contact ${contact.id}:`, emailError);
      }
    }

    console.log(`[SCHEDULER] ✅ Campaign ${campaign.id} send triggered successfully`);
  } catch (error) {
    console.error(`[SCHEDULER] ❌ Error triggering campaign ${campaign.id}:`, error);
    // Don't update campaign status, let it retry next time
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    running: schedulerTask !== null,
    nextRun: schedulerTask ? 'every minute' : 'not running'
  };
}

/**
 * Manually trigger processing of scheduled campaigns (for testing)
 */
export async function manualTriggerScheduler() {
  console.log('[SCHEDULER] 🔄 Manual trigger initiated');
  await processScheduledCampaigns();
  console.log('[SCHEDULER] ✅ Manual trigger completed');
}
