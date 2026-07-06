/**
 * Email retry logic with exponential backoff
 */
import Email from '../models/Email.js';
import logger from './logger.js';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate exponential backoff delay
 * Retry 1: 5 min
 * Retry 2: 15 min (3x)
 * Retry 3: 45 min (9x)
 */
export function calculateNextRetryDelay(retryCount) {
  const exponent = Math.pow(3, retryCount);
  return INITIAL_DELAY_MS * exponent;
}

/**
 * Mark email for retry with exponential backoff
 */
export async function markForRetry(emailId, reason) {
  try {
    const email = await Email.findByPk(emailId);
    if (!email) {
      logger.warn('EMAIL_RETRY', `Email not found: ${emailId}`);
      return null;
    }

    const newRetryCount = (email.retryCount || 0) + 1;

    if (newRetryCount > MAX_RETRIES) {
      // Max retries exceeded, mark as failed
      await email.update({
        status: 'failed',
        failureReason: `${reason} (failed after ${MAX_RETRIES} retries)`
      });
      logger.warn('EMAIL_RETRY', `Max retries exceeded for email ${emailId}`);
      return null;
    }

    // Calculate next retry time
    const nextRetryDelay = calculateNextRetryDelay(newRetryCount - 1);
    const nextRetryAt = new Date(Date.now() + nextRetryDelay);

    await email.update({
      retryCount: newRetryCount,
      lastRetryAt: new Date(),
      nextRetryAt,
      failureReason: reason
    });

    logger.info('EMAIL_RETRY', `Email ${emailId} marked for retry ${newRetryCount}/${MAX_RETRIES} at ${nextRetryAt.toISOString()}`);
    return email;
  } catch (error) {
    logger.error('EMAIL_RETRY', `Failed to mark email for retry: ${emailId}`, error);
    return null;
  }
}

/**
 * Get emails ready for retry
 */
export async function getEmailsReadyForRetry() {
  try {
    const now = new Date();
    const emails = await Email.findAll({
      where: {
        status: 'pending',
        nextRetryAt: {
          [require('sequelize').Op.lte]: now
        }
      },
      limit: 100
    });

    logger.debug('EMAIL_RETRY', `Found ${emails.length} email(s) ready for retry`);
    return emails;
  } catch (error) {
    logger.error('EMAIL_RETRY', 'Failed to fetch emails ready for retry', error);
    return [];
  }
}

/**
 * Retry a failed email
 */
export async function retryEmail(email, sendEmailFn) {
  try {
    logger.debug('EMAIL_RETRY', `Retrying email ${email.id} (attempt ${email.retryCount})`);

    // Send email
    const result = await sendEmailFn(email);

    if (result.success) {
      await email.update({
        status: 'sent',
        sentAt: new Date(),
        sendgridMessageId: result.messageId
      });
      logger.info('EMAIL_RETRY', `Email ${email.id} sent successfully on retry`);
      return true;
    } else {
      // Retry again
      await markForRetry(email.id, result.error || 'Send failed');
      return false;
    }
  } catch (error) {
    logger.error('EMAIL_RETRY', `Error retrying email ${email.id}`, error);
    await markForRetry(email.id, error.message);
    return false;
  }
}

/**
 * Process all emails ready for retry
 */
export async function processRetryQueue(sendEmailFn) {
  try {
    const emailsToRetry = await getEmailsReadyForRetry();

    if (emailsToRetry.length === 0) {
      logger.debug('EMAIL_RETRY', 'No emails ready for retry');
      return { total: 0, successful: 0, failed: 0 };
    }

    let successful = 0;
    let failed = 0;

    for (const email of emailsToRetry) {
      const result = await retryEmail(email, sendEmailFn);
      if (result) {
        successful++;
      } else {
        failed++;
      }
    }

    logger.info('EMAIL_RETRY', `Retry queue processed: ${successful} successful, ${failed} failed out of ${emailsToRetry.length}`);
    return { total: emailsToRetry.length, successful, failed };
  } catch (error) {
    logger.error('EMAIL_RETRY', 'Error processing retry queue', error);
    return { total: 0, successful: 0, failed: 0 };
  }
}
