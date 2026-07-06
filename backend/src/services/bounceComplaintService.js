/**
 * Bounce and Complaint Handling Service
 * Manages recipient health, automatic suppression, and bounce tracking
 *
 * Implements:
 * - Hard bounce detection (permanent failures)
 * - Soft bounce tracking (temporary failures)
 * - Complaint tracking (spam reports)
 * - Automatic contact suppression
 * - Recipient health scoring
 */

import Email from '../models/Email.js';
import Contact from '../models/Contact.js';
import logger from './logger.js';
import { Op } from 'sequelize';

// Suppression thresholds
const HARD_BOUNCE_THRESHOLD = 1; // Hard bounce = instant suppression
const SOFT_BOUNCE_THRESHOLD = 3; // 3 soft bounces = suppress
const COMPLAINT_THRESHOLD = 1; // 1 complaint = suppress
const AUTO_SUPPRESS_SOFT_BOUNCES = true;
const AUTO_SUPPRESS_COMPLAINTS = true;

/**
 * Record a bounce event
 * @param {string} email - Email address that bounced
 * @param {string} bounceType - 'hard', 'soft', or 'unknown'
 * @param {string} reason - Bounce reason (e.g., "550 Mailbox not found")
 * @param {string} provider - Email provider (e.g., 'sendgrid', 'gmail')
 */
export async function recordBounce(email, bounceType = 'unknown', reason = '', provider = 'unknown') {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Update all emails from this recipient
    const updatedEmails = await Email.update(
      {
        status: 'bounced',
        bounceType: bounceType,
        bouncedAt: new Date(),
        failureReason: reason.substring(0, 500)
      },
      {
        where: {
          recipientEmail: normalizedEmail,
          status: { [Op.notIn]: ['bounced', 'unsubscribed'] }
        }
      }
    );

    logger.info('BOUNCE', `${bounceType} bounce for ${normalizedEmail}: ${updatedEmails[0]} emails updated`);

    // Update contact tracking
    const contact = await Contact.findOne({ where: { email: normalizedEmail } });
    if (contact) {
      const updates = {
        bounceCount: (contact.bounceCount || 0) + 1,
        lastBounceAt: new Date()
      };

      // Auto-suppress contact based on bounce type
      if (bounceType === 'hard' || (AUTO_SUPPRESS_SOFT_BOUNCES && contact.bounceCount >= SOFT_BOUNCE_THRESHOLD)) {
        updates.status = 'bounced';
        logger.warn('BOUNCE', `Auto-suppressed contact ${normalizedEmail} after ${bounceType} bounce`);
      }

      await contact.update(updates);
    }

    return {
      success: true,
      emailsUpdated: updatedEmails[0],
      contactSuppressed: contact?.status === 'bounced'
    };
  } catch (error) {
    logger.error('BOUNCE', `Error recording bounce for ${email}`, error);
    throw error;
  }
}

/**
 * Record a complaint event (spam report, unsubscribe, etc.)
 * @param {string} email - Email address that complained
 * @param {string} complaintType - 'spam', 'unsolicited', 'other'
 * @param {string} reason - Additional reason text
 */
export async function recordComplaint(email, complaintType = 'spam', reason = '') {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Mark all emails from this recipient as unsubscribed
    const updatedEmails = await Email.update(
      {
        status: 'unsubscribed',
        complaintType: complaintType,
        complainedAt: new Date(),
        failureReason: `${complaintType} complaint${reason ? ': ' + reason : ''}`.substring(0, 500)
      },
      {
        where: { recipientEmail: normalizedEmail }
      }
    );

    logger.warn('COMPLAINT', `${complaintType} complaint from ${normalizedEmail}: ${updatedEmails[0]} emails marked unsubscribed`);

    // Update contact
    const contact = await Contact.findOne({ where: { email: normalizedEmail } });
    if (contact) {
      const updates = {
        complaintCount: (contact.complaintCount || 0) + 1,
        lastComplaintAt: new Date()
      };

      // Auto-suppress contact based on complaints
      if (AUTO_SUPPRESS_COMPLAINTS && contact.complaintCount >= COMPLAINT_THRESHOLD) {
        updates.status = 'unsubscribed';
        logger.warn('COMPLAINT', `Auto-suppressed contact ${normalizedEmail} after complaint`);
      }

      await contact.update(updates);
    }

    return {
      success: true,
      emailsUpdated: updatedEmails[0],
      contactSuppressed: contact?.status === 'unsubscribed'
    };
  } catch (error) {
    logger.error('COMPLAINT', `Error recording complaint for ${email}`, error);
    throw error;
  }
}

/**
 * Check if a contact is suppressible (should not be sent to)
 * @param {string} email - Email address to check
 * @returns {object} - { suppressible: boolean, reason: string, contact: object }
 */
export async function checkSuppressionStatus(email) {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const contact = await Contact.findOne({ where: { email: normalizedEmail } });

    if (!contact) {
      return { suppressible: false, reason: 'contact_not_found', contact: null };
    }

    // Check if contact is in suppression list
    if (contact.status === 'bounced') {
      return {
        suppressible: true,
        reason: 'hard_bounce_suppressed',
        lastEvent: contact.lastBounceAt,
        contact
      };
    }

    if (contact.status === 'unsubscribed') {
      return {
        suppressible: true,
        reason: 'unsubscribed_or_complained',
        lastEvent: contact.lastComplaintAt || contact.unsubscribedAt,
        contact
      };
    }

    // Check soft bounce threshold (warning threshold)
    if (contact.bounceCount >= SOFT_BOUNCE_THRESHOLD) {
      return {
        suppressible: true,
        reason: 'soft_bounce_threshold_exceeded',
        bounceCount: contact.bounceCount,
        contact
      };
    }

    return {
      suppressible: false,
      reason: 'active',
      contact
    };
  } catch (error) {
    logger.error('SUPPRESS', `Error checking suppression status for ${email}`, error);
    throw error;
  }
}

/**
 * Get bounce/complaint statistics for a campaign
 * @param {string} campaignId - Campaign UUID
 * @returns {object} - Statistics object with counts and rates
 */
export async function getCampaignDeliveryStats(campaignId) {
  try {
    const emails = await Email.findAll({
      where: { campaignId },
      attributes: ['status', 'bounceType', 'complaintType'],
      raw: true
    });

    if (emails.length === 0) {
      return {
        total: 0,
        sent: 0,
        delivered: 0,
        bounced: 0,
        hardBounces: 0,
        softBounces: 0,
        complained: 0,
        unsubscribed: 0,
        opened: 0,
        clicked: 0,
        bounceRate: '0%',
        complaintRate: '0%',
        deliveryRate: '0%',
        engagementRate: '0%'
      };
    }

    const stats = {
      total: emails.length,
      sent: emails.filter(e => ['sent', 'delivered', 'opened', 'clicked'].includes(e.status)).length,
      delivered: emails.filter(e => ['delivered', 'opened', 'clicked'].includes(e.status)).length,
      bounced: emails.filter(e => e.status === 'bounced').length,
      hardBounces: emails.filter(e => e.bounceType === 'hard').length,
      softBounces: emails.filter(e => e.bounceType === 'soft').length,
      complained: emails.filter(e => e.status === 'unsubscribed' && e.complaintType).length,
      unsubscribed: emails.filter(e => e.status === 'unsubscribed').length,
      opened: emails.filter(e => e.status === 'opened' || e.status === 'clicked').length,
      clicked: emails.filter(e => e.status === 'clicked').length
    };

    // Calculate rates
    stats.bounceRate = ((stats.bounced / stats.total) * 100).toFixed(2) + '%';
    stats.complaintRate = ((stats.complained / stats.total) * 100).toFixed(2) + '%';
    stats.deliveryRate = ((stats.delivered / stats.total) * 100).toFixed(2) + '%';
    stats.engagementRate = (((stats.opened + stats.clicked) / stats.delivered) * 100 || 0).toFixed(2) + '%';

    logger.debug('DELIVERY_STATS', `Campaign ${campaignId}: ${stats.sent}/${stats.total} sent, ${stats.bounceRate} bounce rate`);

    return stats;
  } catch (error) {
    logger.error('DELIVERY_STATS', `Error getting stats for campaign ${campaignId}`, error);
    throw error;
  }
}

/**
 * Get contact health score (0-100)
 * Higher score = healthier contact
 * @param {string} email - Email address
 * @returns {object} - { score: 0-100, health: 'excellent'|'good'|'fair'|'poor'|'suppressed', breakdown: {...} }
 */
export async function getContactHealthScore(email) {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const contact = await Contact.findOne({
      where: { email: normalizedEmail },
      include: {
        model: Email,
        attributes: ['status', 'bounceType', 'complaintType', 'sentAt'],
        required: false
      }
    });

    if (!contact) {
      return { score: 0, health: 'unknown', email };
    }

    if (contact.status === 'bounced' || contact.status === 'unsubscribed') {
      return {
        score: 0,
        health: 'suppressed',
        reason: contact.status,
        email
      };
    }

    // Calculate score based on bounce/complaint history
    let score = 100;

    // Deduct for bounces
    score -= Math.min(contact.bounceCount * 20, 50); // Max -50

    // Deduct for complaints
    score -= Math.min(contact.complaintCount * 50, 30); // Max -30

    // Deduct for engagement (emails with opens/clicks are better)
    const emails = contact.Emails || [];
    const opened = emails.filter(e => e.status === 'opened' || e.status === 'clicked').length;
    const engagementRate = emails.length > 0 ? (opened / emails.length) : 0;
    if (engagementRate === 0 && emails.length > 3) {
      score -= 10; // No engagement after multiple sends
    }

    score = Math.max(0, Math.min(100, score));

    let health = 'excellent';
    if (score < 30) health = 'poor';
    else if (score < 60) health = 'fair';
    else if (score < 80) health = 'good';

    return {
      score: Math.round(score),
      health,
      breakdown: {
        bounces: contact.bounceCount,
        complaints: contact.complaintCount,
        totalSent: contact.sendCount,
        engagementRate: (engagementRate * 100).toFixed(1) + '%'
      },
      email
    };
  } catch (error) {
    logger.error('HEALTH', `Error calculating health score for ${email}`, error);
    throw error;
  }
}

/**
 * Get suppression list (all bounced/complained/unsubscribed contacts)
 * @param {string} userId - User UUID (optional, for user-specific list)
 * @returns {array} - Array of suppressed contacts
 */
export async function getSuppressionList(userId = null) {
  try {
    const where = {
      status: { [Op.in]: ['bounced', 'unsubscribed'] }
    };

    if (userId) {
      where.createdBy = userId;
    }

    const contacts = await Contact.findAll({
      where,
      attributes: ['id', 'email', 'status', 'bounceCount', 'complaintCount', 'lastBounceAt', 'lastComplaintAt'],
      limit: 1000
    });

    logger.debug('SUPPRESSION', `Retrieved ${contacts.length} suppressed contacts${userId ? ' for user ' + userId : ''}`);

    return contacts;
  } catch (error) {
    logger.error('SUPPRESSION', `Error getting suppression list`, error);
    throw error;
  }
}

/**
 * Remove contact from suppression list (reactivate)
 * @param {string} email - Email address
 * @param {string} reason - Reason for reactivation
 */
export async function reactivateContact(email, reason = 'manual_reactivation') {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const contact = await Contact.findOne({ where: { email: normalizedEmail } });

    if (!contact) {
      throw new Error('Contact not found');
    }

    await contact.update({
      status: 'active',
      bounceCount: 0,
      complaintCount: 0,
      lastBounceAt: null,
      lastComplaintAt: null
    });

    logger.info('REACTIVATE', `Reactivated contact ${normalizedEmail}: ${reason}`);

    return { success: true, email: normalizedEmail };
  } catch (error) {
    logger.error('REACTIVATE', `Error reactivating contact ${email}`, error);
    throw error;
  }
}

export default {
  recordBounce,
  recordComplaint,
  checkSuppressionStatus,
  getCampaignDeliveryStats,
  getContactHealthScore,
  getSuppressionList,
  reactivateContact,
  HARD_BOUNCE_THRESHOLD,
  SOFT_BOUNCE_THRESHOLD,
  COMPLAINT_THRESHOLD,
  AUTO_SUPPRESS_SOFT_BOUNCES,
  AUTO_SUPPRESS_COMPLAINTS
};
