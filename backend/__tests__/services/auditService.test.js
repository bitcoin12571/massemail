import AuditLog from '../../src/models/AuditLog.js';
import { logAuditEvent, logLogin, logCampaignAction, AUDIT_EVENTS } from '../../src/services/auditService.js';

describe('Audit Service', () => {
  beforeEach(async () => {
    await AuditLog.destroy({ where: {} });
  });

  test('should log audit event with all fields', async () => {
    await logAuditEvent('LOGIN', 'user_login', 'user-1', null, 'success', '127.0.0.1');

    const log = await AuditLog.findOne({ where: { eventType: 'LOGIN' } });

    expect(log).not.toBeNull();
    expect(log.action).toBe('user_login');
    expect(log.userId).toBe('user-1');
    expect(log.status).toBe('success');
    expect(log.ipAddress).toBe('127.0.0.1');
  });

  test('should log login event', async () => {
    await logLogin('user-123', '192.168.1.1', true);

    const log = await AuditLog.findOne({
      where: { eventType: AUDIT_EVENTS.USER_LOGIN }
    });

    expect(log).not.toBeNull();
    expect(log.userId).toBe('user-123');
    expect(log.ipAddress).toBe('192.168.1.1');
  });

  test('should log campaign action', async () => {
    await logCampaignAction('send', 'campaign-1', 'user-1', '127.0.0.1', true);

    const log = await AuditLog.findOne({
      where: { eventType: AUDIT_EVENTS.CAMPAIGN_SEND }
    });

    expect(log).not.toBeNull();
    expect(log.resourceId).toBe('campaign-1');
    expect(log.action).toBe('campaign_send');
  });

  test('should store metadata in audit log', async () => {
    const metadata = { recipientCount: 100, subject: 'Test Campaign' };
    await logAuditEvent(
      'CAMPAIGN_SEND',
      'campaign_send',
      'user-1',
      'camp-1',
      'success',
      '127.0.0.1',
      metadata
    );

    const log = await AuditLog.findOne({
      where: { resourceId: 'camp-1' }
    });

    expect(log.metadata).toEqual(metadata);
  });

  test('should track failed events', async () => {
    await logAuditEvent('LOGIN', 'user_login', 'user-1', null, 'failure', '127.0.0.1');

    const log = await AuditLog.findOne({
      where: { eventType: 'LOGIN' }
    });

    expect(log.status).toBe('failure');
  });

  test('should have createdAt timestamp', async () => {
    await logLogin('user-1', '127.0.0.1');

    const log = await AuditLog.findOne({
      where: { eventType: AUDIT_EVENTS.USER_LOGIN }
    });

    expect(log.createdAt).toBeDefined();
    expect(log.createdAt instanceof Date).toBe(true);
  });
});
