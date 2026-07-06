/**
 * Email Delivery Tracking Service
 * Tracks email journey: sent → delivered → opened → clicked
 * Provides detailed delivery metrics and diagnostics
 */

import Email from '../models/Email.js';
import Campaign from '../models/Campaign.js';
import logger from './logger.js';
import { Op } from 'sequelize';

const TRACKING_EVENTS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  BOUNCED: 'bounced',
  OPENED: 'opened',
  CLICKED: 'clicked',
  COMPLAINED: 'unsubscribed',
  FAILED: 'failed'
};

/**
 * Record that an email was successfully sent
 * @param {string} emailId - Email UUID
 * @param {string} messageId - Provider message ID (SendGrid, etc.)
 */
export async function recordSent(emailId, messageId = null) {
  try {
    const email = await Email.findByPk(emailId);
    if (!email) {
      logger.warn('DELIVERY', `Email ${emailId} not found for sent tracking`);
      return null;
    }

    await email.update({
      status: TRACKING_EVENTS.SENT,
      sentAt: new Date(),
      sendgridMessageId: messageId || email.sendgridMessageId
    });

    logger.debug('DELIVERY', `Email ${emailId} marked as sent`);
    return email;
  } catch (error) {
    logger.error('DELIVERY', `Error recording sent for ${emailId}`, error);
    throw error;
  }
}

/**
 * Record that an email was delivered to recipient
 * @param {string} emailId - Email UUID
 */
export async function recordDelivered(emailId) {
  try {
    const email = await Email.findByPk(emailId);
    if (!email) {
      logger.warn('DELIVERY', `Email ${emailId} not found for delivery tracking`);
      return null;
    }

    await email.update({
      status: TRACKING_EVENTS.DELIVERED,
      deliveredAt: new Date()
    });

    logger.debug('DELIVERY', `Email ${emailId} marked as delivered`);
    return email;
  } catch (error) {
    logger.error('DELIVERY', `Error recording delivered for ${emailId}`, error);
    throw error;
  }
}

/**
 * Record that an email was opened by recipient
 * @param {string} emailId - Email UUID
 * @param {object} metadata - Optional metadata (IP, user agent, timestamp)
 */
export async function recordOpened(emailId, metadata = {}) {
  try {
    const email = await Email.findByPk(emailId);
    if (!email) {
      logger.warn('DELIVERY', `Email ${emailId} not found for open tracking`);
      return null;
    }

    // Only update if not already in a final state
    if (![TRACKING_EVENTS.BOUNCED, TRACKING_EVENTS.COMPLAINED, TRACKING_EVENTS.FAILED].includes(email.status)) {
      await email.update({
        status: TRACKING_EVENTS.OPENED,
        openedAt: new Date()
      });

      logger.debug('DELIVERY', `Email ${emailId} marked as opened`);
    }

    return email;
  } catch (error) {
    logger.error('DELIVERY', `Error recording opened for ${emailId}`, error);
    throw error;
  }
}

/**
 * Record that an email link was clicked
 * @param {string} emailId - Email UUID
 * @param {object} metadata - Optional metadata (link, IP, timestamp)
 */
export async function recordClicked(emailId, metadata = {}) {
  try {
    const email = await Email.findByPk(emailId);
    if (!email) {
      logger.warn('DELIVERY', `Email ${emailId} not found for click tracking`);
      return null;
    }

    // Only update if not already in a final state
    if (![TRACKING_EVENTS.BOUNCED, TRACKING_EVENTS.COMPLAINED, TRACKING_EVENTS.FAILED].includes(email.status)) {
      await email.update({
        status: TRACKING_EVENTS.CLICKED,
        clickedAt: new Date()
      });

      logger.debug('DELIVERY', `Email ${emailId} marked as clicked`);
    }

    return email;
  } catch (error) {
    logger.error('DELIVERY', `Error recording clicked for ${emailId}`, error);
    throw error;
  }
}

/**
 * Get detailed delivery timeline for an email
 * @param {string} emailId - Email UUID
 * @returns {object} - Timeline with all tracking events
 */
export async function getEmailTimeline(emailId) {
  try {
    const email = await Email.findByPk(emailId);
    if (!email) {
      return { found: false, emailId };
    }

    const timeline = {
      emailId,
      recipientEmail: email.recipientEmail,
      status: email.status,
      events: []
    };

    // Add events in chronological order
    if (email.sentAt) {
      timeline.events.push({
        event: 'sent',
        timestamp: email.sentAt,
        messageId: email.sendgridMessageId
      });
    }

    if (email.deliveredAt) {
      timeline.events.push({
        event: 'delivered',
        timestamp: email.deliveredAt
      });
    }

    if (email.openedAt) {
      timeline.events.push({
        event: 'opened',
        timestamp: email.openedAt
      });
    }

    if (email.clickedAt) {
      timeline.events.push({
        event: 'clicked',
        timestamp: email.clickedAt
      });
    }

    if (email.bouncedAt) {
      timeline.events.push({
        event: 'bounced',
        timestamp: email.bouncedAt,
        bounceType: email.bounceType,
        reason: email.failureReason
      });
    }

    if (email.complainedAt) {
      timeline.events.push({
        event: 'complained',
        timestamp: email.complainedAt,
        complaintType: email.complaintType
      });
    }

    // Sort by timestamp
    timeline.events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return timeline;
  } catch (error) {
    logger.error('DELIVERY', `Error getting timeline for ${emailId}`, error);
    throw error;
  }
}

/**
 * Get campaign delivery dashboard
 * @param {string} campaignId - Campaign UUID
 * @returns {object} - Comprehensive delivery metrics
 */
export async function getCampaignDeliveryDashboard(campaignId) {
  try {
    const campaign = await Campaign.findByPk(campaignId, {
      include: [{
        model: Email,
        attributes: ['id', 'status', 'sentAt', 'deliveredAt', 'openedAt', 'clickedAt', 'bouncedAt', 'bounceType'],
        required: false
      }]
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const emails = campaign.Emails || [];
    const now = new Date();

    // Calculate metrics
    const metrics = {
      total: emails.length,
      sent: emails.filter(e => e.sentAt && ['sent', 'delivered', 'opened', 'clicked', 'bounced'].includes(e.status)).length,
      delivered: emails.filter(e => e.deliveredAt).length,
      opened: emails.filter(e => e.openedAt).length,
      clicked: emails.filter(e => e.clickedAt).length,
      bounced: emails.filter(e => e.status === 'bounced').length,
      failed: emails.filter(e => e.status === 'failed').length,
      pending: emails.filter(e => e.status === 'pending').length
    };

    // Calculate rates
    metrics.deliveryRate = metrics.sent > 0 ? ((metrics.delivered / metrics.sent) * 100).toFixed(2) : 0;
    metrics.openRate = metrics.sent > 0 ? ((metrics.opened / metrics.sent) * 100).toFixed(2) : 0;
    metrics.clickRate = metrics.sent > 0 ? ((metrics.clicked / metrics.sent) * 100).toFixed(2) : 0;
    metrics.bounceRate = metrics.sent > 0 ? ((metrics.bounced / metrics.sent) * 100).toFixed(2) : 0;

    // Time-based metrics
    const sentByDay = {};
    const openedByDay = {};

    emails.forEach(email => {
      if (email.sentAt) {
        const day = email.sentAt.toISOString().split('T')[0];
        sentByDay[day] = (sentByDay[day] || 0) + 1;
      }
      if (email.openedAt) {
        const day = email.openedAt.toISOString().split('T')[0];
        openedByDay[day] = (openedByDay[day] || 0) + 1;
      }
    });

    // Campaign status estimate
    let estimatedCompletion = null;
    if (campaign.sentAt && metrics.sent > 0 && metrics.pending > 0) {
      const sendDuration = now - new Date(campaign.sentAt);
      const avgTimePerEmail = sendDuration / metrics.sent;
      estimatedCompletion = new Date(now.getTime() + (avgTimePerEmail * metrics.pending));
    }

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        sentAt: campaign.sentAt,
        createdAt: campaign.createdAt
      },
      metrics,
      timeSeries: {
        sentByDay,
        openedByDay
      },
      estimatedCompletion,
      lastUpdated: now
    };
  } catch (error) {
    logger.error('DELIVERY', `Error getting campaign dashboard for ${campaignId}`, error);
    throw error;
  }
}

/**
 * Get real-time sending progress
 * @param {string} campaignId - Campaign UUID
 */
export async function getSendingProgress(campaignId) {
  try {
    const emails = await Email.findAll({
      where: { campaignId },
      attributes: ['status'],
      raw: true
    });

    const statusCounts = {};
    emails.forEach(email => {
      statusCounts[email.status] = (statusCounts[email.status] || 0) + 1;
    });

    const total = emails.length;
    const pending = statusCounts.pending || 0;
    const sent = total - pending;
    const percentage = total > 0 ? ((sent / total) * 100).toFixed(1) : 0;

    return {
      campaignId,
      total,
      sent,
      pending,
      percentage,
      statusCounts,
      isComplete: pending === 0
    };
  } catch (error) {
    logger.error('DELIVERY', `Error getting send progress for ${campaignId}`, error);
    throw error;
  }
}

export default {
  recordSent,
  recordDelivered,
  recordOpened,
  recordClicked,
  getEmailTimeline,
  getCampaignDeliveryDashboard,
  getSendingProgress,
  TRACKING_EVENTS
};
