import { sendEmail } from './emailService.js';
import BulkCampaign from '../models/BulkCampaign.js';
import BulkCampaignSend from '../models/BulkCampaignSend.js';
import ParsedEmail from '../models/ParsedEmail.js';
import { v4 as uuidv4 } from 'uuid';
import { isReservedTestEmail } from './chisinauTestDataService.js';

/**
 * Delay between batches to prevent Gmail rate limiting
 * 5 seconds between each batch of 100 emails
 */
const BATCH_DELAY_MS = 5000;

/**
 * Sleep helper function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function createBulkCampaign(data) {
  try {
    const campaign = await BulkCampaign.create({
      name: data.name,
      subject: data.subject,
      htmlTemplate: data.htmlTemplate,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      region: data.region || null,
      status: 'draft',
      totalRecipients: data.totalRecipients || 0
    });
    return campaign;
  } catch (error) {
    throw new Error(`Failed to create campaign: ${error.message}`);
  }
}

export async function sendBulkCampaign(campaignId, emailIds = null) {
  try {
    const campaign = await BulkCampaign.findByPk(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    // Get emails for this campaign
    let emails;
    if (emailIds && emailIds.length > 0) {
      emails = await ParsedEmail.findAll({
        where: { id: emailIds, isValid: true }
      });
    } else if (campaign.region) {
      emails = await ParsedEmail.findAll({
        where: { region: campaign.region, isValid: true }
      });
    } else {
      emails = await ParsedEmail.findAll({
        where: { isValid: true }
      });
    }

    if (emails.length === 0) {
      throw new Error('No valid emails found for this campaign');
    }

    // Parse attachments - handle both JSON string and array formats
    let attachments = [];
    if (campaign.attachments) {
      if (typeof campaign.attachments === 'string') {
        try {
          attachments = JSON.parse(campaign.attachments);
        } catch (e) {
          console.error('Failed to parse attachments JSON:', e.message);
          attachments = [];
        }
      } else if (Array.isArray(campaign.attachments)) {
        attachments = campaign.attachments;
      }
    }

    // Update campaign status
    await campaign.update({
      status: 'sending',
      totalRecipients: emails.length,
      startedAt: new Date()
    });

    // Create send records
    const sendRecords = emails.map(email => ({
      campaignId,
      emailId: email.id,
      recipientEmail: email.email,
      trackingToken: uuidv4(),
      status: 'pending'
    }));

    await BulkCampaignSend.bulkCreate(sendRecords);

    // Send emails (batch process with delay between batches)
    const batchSize = 100;
    let sentCount = 0;
    let failedCount = 0;
    const totalBatches = Math.ceil(emails.length / batchSize);

    for (let i = 0; i < emails.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batch = emails.slice(i, i + batchSize);

      console.log(`[BULK SENDER] Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);

      await Promise.allSettled(batch.map(async (email) => {
        try {
          // Personalize template
          const personalizedHtml = campaign.htmlTemplate
            .replace(/{{name}}/g, email.name || email.email)
            .replace(/{{email}}/g, email.email)
            .replace(/{{region}}/g, email.region);

          await sendEmail({
            to: email.email,
            subject: campaign.subject,
            html: personalizedHtml,
            attachments: attachments && attachments.length > 0 ? attachments : undefined
          });

          const sendRecord = await BulkCampaignSend.findOne({
            where: { campaignId, emailId: email.id }
          });

          if (sendRecord) {
            await sendRecord.update({
              status: 'sent',
              sentAt: new Date()
            });
          }

          sentCount++;
        } catch (error) {
          failedCount++;
          const sendRecord = await BulkCampaignSend.findOne({
            where: { campaignId, emailId: email.id }
          });

          if (sendRecord) {
            await sendRecord.update({
              status: 'failed',
              failureReason: error.message
            });
          }
        }
      }));

      // Add delay between batches (except after last batch)
      if (batchNumber < totalBatches) {
        console.log(`[BULK SENDER] Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Update campaign with results
    await campaign.update({
      status: 'completed',
      sentCount,
      failedCount,
      completedAt: new Date()
    });

    return {
      campaignId,
      totalRecipients: emails.length,
      sentCount,
      failedCount,
      successRate: ((sentCount / emails.length) * 100).toFixed(2) + '%'
    };
  } catch (error) {
    throw new Error(`Failed to send bulk campaign: ${error.message}`);
  }
}

export async function sendBulkCampaignDirect(campaign, recipients) {
  const testRecipientCount = recipients.filter(recipient => isReservedTestEmail(recipient?.email)).length;
  if (testRecipientCount > 0) {
    throw new Error(
      `${testRecipientCount} adrese sunt date de test și nu pot fi folosite pentru trimitere reală.`
    );
  }

  const uniqueRecipients = [...new Map(
    recipients
      .filter(recipient => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient?.email || ''))
      .map(recipient => [recipient.email.toLowerCase(), {
        email: recipient.email.toLowerCase(),
        name: recipient.name || '',
        region: recipient.region || 'unknown'
      }])
  ).values()];

  if (!campaign?.subject || !campaign?.htmlTemplate) {
    throw new Error('Campaign subject and template are required');
  }

  if (uniqueRecipients.length === 0) {
    throw new Error('No valid emails found for this campaign');
  }

  // Parse attachments - handle both JSON string and array formats
  let attachments = [];
  if (campaign.attachments) {
    if (typeof campaign.attachments === 'string') {
      try {
        attachments = JSON.parse(campaign.attachments);
      } catch (e) {
        console.error('Failed to parse attachments JSON:', e.message);
        attachments = [];
      }
    } else if (Array.isArray(campaign.attachments)) {
      attachments = campaign.attachments;
    }
  }

  let sentCount = 0;
  let failedCount = 0;

  const batchSize = 100;
  const totalBatches = Math.ceil(uniqueRecipients.length / batchSize);

  for (let index = 0; index < uniqueRecipients.length; index += batchSize) {
    const batchNumber = Math.floor(index / batchSize) + 1;
    const batch = uniqueRecipients.slice(index, index + batchSize);

    console.log(`[BULK SENDER] Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);

    const results = await Promise.allSettled(batch.map(recipient => {
      const personalizedHtml = campaign.htmlTemplate
        .replace(/{{name}}/g, recipient.name || recipient.email)
        .replace(/{{email}}/g, recipient.email)
        .replace(/{{region}}/g, recipient.region);

      return sendEmail({
        to: recipient.email,
        subject: campaign.subject,
        html: personalizedHtml,
        attachments: attachments && attachments.length > 0 ? attachments : undefined
      });
    }));

    sentCount += results.filter(result => result.status === 'fulfilled').length;
    failedCount += results.filter(result => result.status === 'rejected').length;

    // Add delay between batches (except after last batch)
    if (batchNumber < totalBatches) {
      console.log(`[BULK SENDER] Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  return {
    totalRecipients: uniqueRecipients.length,
    sentCount,
    failedCount,
    successRate: `${((sentCount / uniqueRecipients.length) * 100).toFixed(2)}%`
  };
}

export async function getCampaignStats(campaignId) {
  try {
    const campaign = await BulkCampaign.findByPk(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const sends = await BulkCampaignSend.findAll({
      where: { campaignId }
    });

    const stats = {
      campaign: campaign.toJSON(),
      totalSends: sends.length,
      statusBreakdown: {
        pending: sends.filter(s => s.status === 'pending').length,
        sent: sends.filter(s => s.status === 'sent').length,
        failed: sends.filter(s => s.status === 'failed').length,
        opened: sends.filter(s => s.status === 'opened').length,
        clicked: sends.filter(s => s.status === 'clicked').length
      },
      openRate: campaign.totalRecipients > 0 ? ((campaign.openedCount / campaign.totalRecipients) * 100).toFixed(2) : 0,
      clickRate: campaign.totalRecipients > 0 ? ((campaign.clickedCount / campaign.totalRecipients) * 100).toFixed(2) : 0,
      bounceRate: campaign.totalRecipients > 0 ? ((campaign.bounceCount / campaign.totalRecipients) * 100).toFixed(2) : 0
    };

    return stats;
  } catch (error) {
    throw new Error(`Failed to get campaign stats: ${error.message}`);
  }
}

export async function getAllCampaigns() {
  try {
    const campaigns = await BulkCampaign.findAll({
      order: [['createdAt', 'DESC']]
    });
    return campaigns;
  } catch (error) {
    throw new Error(`Failed to get campaigns: ${error.message}`);
  }
}

export async function deleteCampaign(campaignId) {
  try {
    await BulkCampaignSend.destroy({ where: { campaignId } });
    await BulkCampaign.destroy({ where: { id: campaignId } });
    return { success: true, campaignId };
  } catch (error) {
    throw new Error(`Failed to delete campaign: ${error.message}`);
  }
}
