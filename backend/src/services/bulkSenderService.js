import { sendEmail } from './emailService.js';
import BulkCampaign from '../models/BulkCampaign.js';
import BulkCampaignSend from '../models/BulkCampaignSend.js';
import ParsedEmail from '../models/ParsedEmail.js';
import { v4 as uuidv4 } from 'uuid';

export async function createBulkCampaign(data) {
  try {
    const campaign = await BulkCampaign.create({
      name: data.name,
      subject: data.subject,
      htmlTemplate: data.htmlTemplate,
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

    // Send emails (batch process)
    const batchSize = 50;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

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
            html: personalizedHtml
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
