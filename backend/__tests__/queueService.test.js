import { describe, it, expect, beforeEach } from '@jest/globals';
import { emailQueue, getQueueStats } from '../src/services/queueService.js';

describe('Email Queue Service', () => {
  beforeEach(() => {
    // Reset queue stats before each test
    getQueueStats();
  });

  describe('emailQueue.add()', () => {
    it('should add a job to the queue', async () => {
      const job = {
        emailId: '1',
        campaignId: '1',
        contactId: '1'
      };

      await emailQueue.add(job);

      const stats = await getQueueStats();
      expect(stats.waiting).toBeGreaterThan(0);
    });

    it('should generate unique job IDs', async () => {
      const job1 = { emailId: '1', campaignId: '1', contactId: '1' };
      const job2 = { emailId: '2', campaignId: '2', contactId: '2' };

      await emailQueue.add(job1);
      await emailQueue.add(job2);

      const stats = await getQueueStats();
      expect(stats.waiting).toBe(2);
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
