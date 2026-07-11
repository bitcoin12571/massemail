import logger from './logger.js';
import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import Email from '../models/Email.js';
import { sendEmail } from './emailService.js';
import { Op } from 'sequelize';

/**
 * Background job to send scheduled campaigns
 * Runs every hour to check for campaigns that need sending
 */
export async function processPendingScheduledCampaigns() {
  try {
    logger.info('SCHEDULED-SEND', 'Starting scheduled campaign processor...');

    const now = new Date();

    // Find campaigns that need sending
    // nextSendAt is in the past or now
    const campaignsToProcess = await Campaign.findAll({
      where: {
        status: 'scheduled',
        nextSendAt: { [Op.lte]: now },
        [Op.or]: [
          { sentCount: { [Op.lt]: { [Op.col]: 'totalToSend' } } }
        ]
      }
    });

    logger.info('SCHEDULED-SEND', `Found ${campaignsToProcess.length} campaigns to process`);

    for (const campaign of campaignsToProcess) {
      try {
        await processCampaign(campaign, now);
      } catch (err) {
        logger.error('SCHEDULED-SEND', `Error processing campaign ${campaign.id}`, err);
      }
    }

    logger.info('SCHEDULED-SEND', 'Scheduled campaign processor completed');
  } catch (error) {
    logger.error('SCHEDULED-SEND', 'Fatal error in processor', error);
  }
}

async function processCampaign(campaign, now) {
  logger.info('SCHEDULED-SEND', `Processing campaign ${campaign.id}...`);

  const dailyLimit = campaign.dailyLimit || 200;
  const totalToSend = campaign.totalToSend || 0;
  const alreadySent = campaign.sentCount || 0;
  const remaining = totalToSend - alreadySent;
  const toSendNow = Math.min(dailyLimit, remaining);

  if (toSendNow <= 0) {
    logger.info('SCHEDULED-SEND', `Campaign ${campaign.id} complete!`);
    await campaign.update({ status: 'sent' });
    return;
  }

  // Get unsent contacts
  const unsentContacts = await Contact.findAll({
    where: {
      createdBy: campaign.createdBy,
      status: 'active'
    },
    order: [['createdAt', 'ASC']],
    limit: toSendNow
  });

  if (unsentContacts.length === 0) {
    logger.warn('SCHEDULED-SEND', `No contacts found for campaign ${campaign.id}`);
    return;
  }

  logger.info('SCHEDULED-SEND', `Sending ${unsentContacts.length} emails for campaign ${campaign.id}`);

  let sentCount = 0;
  let failedCount = 0;

  for (const contact of unsentContacts) {
    try {
      // Check if already sent to this contact
      const existing = await Email.findOne({
        where: {
          campaignId: campaign.id,
          contactId: contact.id
        }
      });

      if (existing) {
        logger.debug('SCHEDULED-SEND', `Skipping ${contact.email} - already sent`);
        continue;
      }

      // Send email
      const result = await sendEmail({
        to: contact.email,
        subject: campaign.subject,
        html: campaign.htmlContent,
        text: campaign.textContent,
        attachments: campaign.attachments || []
      });

      // Record sent
      await Email.create({
        campaignId: campaign.id,
        contactId: contact.id,
        recipientEmail: contact.email,
        status: 'sent',
        sentAt: new Date(),
        sendgridMessageId: result.messageId
      });

      sentCount++;
    } catch (err) {
      logger.error('SCHEDULED-SEND', `Failed to send to ${contact.email}`, err);
      failedCount++;

      // Record failure
      await Email.create({
        campaignId: campaign.id,
        contactId: contact.id,
        recipientEmail: contact.email,
        status: 'failed',
        failureReason: err.message
      }).catch(e => logger.error('SCHEDULED-SEND', 'Failed to record error', e));
    }
  }

  const newSentCount = alreadySent + sentCount;
  const isComplete = newSentCount >= totalToSend;
  const nextSendTime = isComplete ? null : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Update campaign
  await campaign.update({
    sentCount: newSentCount,
    lastSentAt: now,
    nextSendAt: nextSendTime,
    status: isComplete ? 'sent' : 'scheduled'
  });

  logger.info('SCHEDULED-SEND',
    `Campaign ${campaign.id} batch complete: +${sentCount} sent, ${failedCount} failed. Total: ${newSentCount}/${totalToSend}`
  );
}

// Export for scheduling
export default processPendingScheduledCampaigns;
