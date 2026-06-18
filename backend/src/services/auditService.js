import AuditLog from '../models/AuditLog.js';
import logger from './logger.js';

export const AUDIT_EVENTS = {
  USER_LOGIN: 'LOGIN',
  USER_LOGOUT: 'LOGOUT',
  USER_REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  CAMPAIGN_CREATE: 'CAMPAIGN_CREATE',
  CAMPAIGN_DELETE: 'CAMPAIGN_DELETE',
  CAMPAIGN_SEND: 'CAMPAIGN_SEND',
  CONTACT_CREATE: 'CONTACT_CREATE',
  CONTACT_DELETE: 'CONTACT_DELETE',
  CONTACT_IMPORT: 'CONTACT_IMPORT',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
  SECURITY_EVENT: 'SECURITY_EVENT'
};

/**
 * Core audit logging function
 */
export async function logAuditEvent(eventType, action, userId, resourceId = null, status = 'success', ipAddress = null, metadata = null) {
  try {
    await AuditLog.create({
      eventType,
      action,
      userId,
      resourceId,
      status,
      ipAddress,
      metadata
    });
  } catch (error) {
    logger.error('AUDIT', `Failed to log audit event ${eventType}`, error);
  }
}

/**
 * Login audit logging
 */
export async function logLogin(userId, ipAddress, success = true) {
  await logAuditEvent(
    AUDIT_EVENTS.USER_LOGIN,
    'user_login',
    userId,
    null,
    success ? 'success' : 'failure',
    ipAddress
  );
}

/**
 * Logout audit logging
 */
export async function logLogout(userId, ipAddress) {
  await logAuditEvent(
    AUDIT_EVENTS.USER_LOGOUT,
    'user_logout',
    userId,
    null,
    'success',
    ipAddress
  );
}

/**
 * Password change audit logging
 */
export async function logPasswordChange(userId, ipAddress, success = true) {
  await logAuditEvent(
    AUDIT_EVENTS.PASSWORD_CHANGE,
    'password_changed',
    userId,
    null,
    success ? 'success' : 'failure',
    ipAddress
  );
}

/**
 * Campaign action audit logging
 */
export async function logCampaignAction(action, campaignId, userId, ipAddress, success = true, metadata = null) {
  const eventTypeMap = {
    'create': AUDIT_EVENTS.CAMPAIGN_CREATE,
    'delete': AUDIT_EVENTS.CAMPAIGN_DELETE,
    'send': AUDIT_EVENTS.CAMPAIGN_SEND
  };

  await logAuditEvent(
    eventTypeMap[action] || 'CAMPAIGN_ACTION',
    `campaign_${action}`,
    userId,
    campaignId,
    success ? 'success' : 'failure',
    ipAddress,
    metadata
  );
}

/**
 * Contact action audit logging
 */
export async function logContactAction(action, contactId, userId, ipAddress, success = true, metadata = null) {
  const eventTypeMap = {
    'create': AUDIT_EVENTS.CONTACT_CREATE,
    'delete': AUDIT_EVENTS.CONTACT_DELETE,
    'import': AUDIT_EVENTS.CONTACT_IMPORT
  };

  await logAuditEvent(
    eventTypeMap[action] || 'CONTACT_ACTION',
    `contact_${action}`,
    userId,
    contactId,
    success ? 'success' : 'failure',
    ipAddress,
    metadata
  );
}

/**
 * Settings change audit logging
 */
export async function logSettingsChange(userId, ipAddress, changes = null, success = true) {
  await logAuditEvent(
    AUDIT_EVENTS.SETTINGS_UPDATE,
    'settings_updated',
    userId,
    null,
    success ? 'success' : 'failure',
    ipAddress,
    changes ? { changes } : null
  );
}

/**
 * Account lockout audit logging
 */
export async function logAccountLockout(userId, ipAddress) {
  await logAuditEvent(
    AUDIT_EVENTS.ACCOUNT_LOCKED,
    'account_locked',
    userId,
    null,
    'success',
    ipAddress
  );
}

/**
 * Security event audit logging (CSRF violations, etc.)
 */
export async function logSecurityEvent(action, userId, ipAddress, metadata = null) {
  await logAuditEvent(
    AUDIT_EVENTS.SECURITY_EVENT,
    action,
    userId,
    null,
    'failure',
    ipAddress,
    metadata
  );
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId, limit = 100) {
  try {
    return await AuditLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  } catch (error) {
    logger.error('AUDIT', 'Failed to fetch user audit logs', error);
    return [];
  }
}

/**
 * Get audit logs for a resource
 */
export async function getResourceAuditLogs(resource, resourceId, limit = 50) {
  try {
    return await AuditLog.findAll({
      where: { resource, resourceId },
      order: [['createdAt', 'DESC']],
      limit
    });
  } catch (error) {
    logger.error('AUDIT', 'Failed to fetch resource audit logs', error);
    return [];
  }
}
