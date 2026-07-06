/**
 * GDPR & CAN-SPAM compliant unsubscribe service
 * Adds unsubscribe links to all emails
 */
import crypto from 'node:crypto';
import Contact from '../models/Contact.js';
import logger from './logger.js';

/**
 * Generate unsubscribe token for a contact
 */
export function generateUnsubscribeToken(contactId) {
  return crypto
    .createHash('sha256')
    .update(`${contactId}-${Date.now()}-unsubscribe`)
    .digest('hex');
}

/**
 * Add unsubscribe link to email HTML
 */
export function addUnsubscribeLink(html, unsubscribeUrl) {
  if (!html) return html;

  const unsubscribeLink = `
    <hr style="border:none;border-top:1px solid #eee;margin:40px 0;color:#666;">
    <div style="font-size:12px;color:#999;text-align:center;">
      <p>You received this email because you're subscribed to our mailing list.</p>
      <p><a href="${unsubscribeUrl}" style="color:#666;text-decoration:underline;">Unsubscribe from this mailing list</a></p>
      <p style="margin-top:20px;font-size:11px;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;

  // Insert before closing body tag, or at end if no body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', unsubscribeLink + '</body>');
  }
  return html + unsubscribeLink;
}

/**
 * Create unsubscribe URL
 */
export function createUnsubscribeUrl(contactId, token, baseUrl = process.env.FRONTEND_URL) {
  return `${baseUrl}/unsubscribe?contactId=${contactId}&token=${token}`;
}

/**
 * Handle unsubscribe request
 */
export async function handleUnsubscribe(contactId, token) {
  try {
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      logger.warn('UNSUBSCRIBE', `Contact not found: ${contactId}`);
      return { success: false, error: 'Contact not found' };
    }

    // Verify token (in real implementation, store token with expiry)
    // For now, just mark as unsubscribed
    await contact.update({
      status: 'unsubscribed',
      unsubscribedAt: new Date()
    });

    logger.info('UNSUBSCRIBE', `Contact ${contactId} unsubscribed`);
    return { success: true, message: 'Successfully unsubscribed' };
  } catch (error) {
    logger.error('UNSUBSCRIBE', `Error handling unsubscribe: ${contactId}`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Get unsubscribe stats
 */
export async function getUnsubscribeStats() {
  try {
    const total = await Contact.count();
    const unsubscribed = await Contact.count({
      where: { status: 'unsubscribed' }
    });
    const rate = total > 0 ? ((unsubscribed / total) * 100).toFixed(2) : 0;

    return {
      total,
      unsubscribed,
      rate: `${rate}%`
    };
  } catch (error) {
    logger.error('UNSUBSCRIBE', 'Error getting unsubscribe stats', error);
    return { total: 0, unsubscribed: 0, rate: '0%' };
  }
}
