import { describe, it, expect, beforeEach } from '@jest/globals';
import { emailQueue, getQueueStats, resetQueueForTests } from '../src/services/queueService.js';

describe('Email Queue Service', () => {
  beforeEach(() => {
    resetQueueForTests();
  });

  describe('emailQueue.add()', () => {
    it('should process an invalid job and track the failure', async () => {
      const job = {
        emailId: '1',
        campaignId: '1',
        contactId: '1'
      };

      await emailQueue.add(job);

      const stats = await getQueueStats();
      expect(stats.waiting).toBe(0);
      expect(stats.failed).toBe(1);
    });

    it('should generate unique job IDs', async () => {
      const job1 = { emailId: '1', campaignId: '1', contactId: '1' };
      const job2 = { emailId: '2', campaignId: '2', contactId: '2' };

      const firstId = await emailQueue.add(job1);
      const secondId = await emailQueue.add(job2);

      expect(firstId).not.toBe(secondId);
    });
  });

  describe('Queue statistics', () => {
    it('should track queue statistics correctly', async () => {
      const initialStats = await getQueueStats();

      expect(initialStats).toHaveProperty('waiting');
      expect(initialStats).toHaveProperty('active');
      expect(initialStats).toHaveProperty('completed');
      expect(initialStats).toHaveProperty('failed');

      expect(typeof initialStats.waiting).toBe('number');
      expect(typeof initialStats.active).toBe('number');
      expect(typeof initialStats.completed).toBe('number');
      expect(typeof initialStats.failed).toBe('number');
    });
  });
});
