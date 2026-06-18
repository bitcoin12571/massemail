import Session from '../../src/models/Session.js';

describe('Session Service', () => {
  beforeEach(async () => {
    await Session.destroy({ where: {} });
  });

  test('should create session with userId and sessionId', async () => {
    const session = await Session.create({
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      ipAddress: '127.0.0.1'
    });

    expect(session.userId).toBe('test-user-id');
    expect(session.sessionId).toBe('test-session-id');
    expect(session.active).toBe(true);
  });

  test('should find session by sessionId', async () => {
    await Session.create({
      userId: 'user-1',
      sessionId: 'session-1',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      active: true
    });

    const found = await Session.findOne({
      where: { sessionId: 'session-1', active: true }
    });

    expect(found).not.toBeNull();
    expect(found.userId).toBe('user-1');
  });

  test('should update session lastActivity', async () => {
    const session = await Session.create({
      userId: 'user-1',
      sessionId: 'session-1',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    const original = session.lastActivity.getTime();
    await new Promise(r => setTimeout(r, 10));

    await session.update({ lastActivity: new Date() });
    const updated = session.lastActivity.getTime();

    expect(updated).toBeGreaterThan(original);
  });

  test('should mark session as inactive on logout', async () => {
    const session = await Session.create({
      userId: 'user-1',
      sessionId: 'session-1',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      active: true
    });

    await session.update({ active: false });

    const found = await Session.findOne({
      where: { sessionId: 'session-1', active: true }
    });

    expect(found).toBeNull();
  });

  test('should check session expiry', async () => {
    const expired = await Session.create({
      userId: 'user-1',
      sessionId: 'expired-1',
      expiresAt: new Date(Date.now() - 1000), // Already expired
      active: true
    });

    const now = new Date();
    expect(expired.expiresAt < now).toBe(true);
  });
});
