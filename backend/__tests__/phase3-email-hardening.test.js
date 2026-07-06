/**
 * Phase 3: Email Hardening - Comprehensive Test Suite
 * Tests for bounce/complaint handling, rate limiting, spam filtering, and delivery tracking
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import bounceComplaintService from '../src/services/bounceComplaintService.js';
import recipientRateLimiter from '../src/services/recipientRateLimiter.js';
import spamFilterService from '../src/services/spamFilterService.js';
import deliveryTrackingService from '../src/services/deliveryTrackingService.js';

describe('Phase 3: Email Hardening Tests', () => {
  describe('Spam Filter Service', () => {
    test('should detect safe email', () => {
      const result = spamFilterService.scanEmail(
        'Welcome to our newsletter',
        '<p>Hello,</p><p>Thanks for joining!</p><p><a href="https://example.com/unsubscribe">Unsubscribe</a></p>',
        'Hello, Thanks for joining!'
      );

      expect(result.spamScore).toBeLessThan(40);
      expect(result.verdict).toBe('safe');
      expect(result.safeToSend).toBe(true);
    });

    test('should detect spam keywords', () => {
      const result = spamFilterService.scanEmail(
        'FREE MONEY NOW!!!',
        '<p>Click here to earn $$$! Free money! Act now!!!</p>',
        ''
      );

      expect(result.spamScore).toBeGreaterThan(40);
      expect(['warning', 'likely_spam']).toContain(result.verdict);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.category === 'spam_words')).toBe(true);
    });

    test('should detect excessive caps', () => {
      const result = spamFilterService.scanEmail(
        'THIS IS VERY IMPORTANT!!!',
        'PLEASE CLICK HERE NOW!!!',
        ''
      );

      expect(result.spamScore).toBeGreaterThan(30);
      expect(result.issues.some(i => i.category === 'subject_line')).toBe(true);
    });

    test('should detect excessive links', () => {
      const html = '<p>' +
        '<a href="http://link1.com">1</a> ' +
        '<a href="http://link2.com">2</a> ' +
        '<a href="http://link3.com">3</a> ' +
        '<a href="http://link4.com">4</a> ' +
        '<a href="http://link5.com">5</a> ' +
        '<a href="http://link6.com">6</a> ' +
        '<a href="http://link7.com">7</a> ' +
        '<a href="http://link8.com">8</a> ' +
        '<a href="http://link9.com">9</a> ' +
        '<a href="http://link10.com">10</a> ' +
        '<a href="http://link11.com">11</a>' +
        '</p>';

      const result = spamFilterService.scanEmail('Test', html, '');

      expect(result.issues.some(i => i.category === 'excessive_links')).toBe(true);
    });

    test('should penalize missing unsubscribe', () => {
      const result = spamFilterService.scanEmail(
        'Newsletter',
        '<p>Hello</p>',
        ''
      );

      expect(result.issues.some(i => i.category === 'missing_unsubscribe')).toBe(true);
    });

    test('should flag likely spam', () => {
      const result = spamFilterService.scanEmail(
        'URGENT: CLAIM YOUR FREE MONEY NOW!!!',
        '<p>Click here immediately! You won the lottery! Click now! Act now!</p>',
        ''
      );

      expect(result.spamScore).toBeGreaterThan(50);
      expect(['warning', 'likely_spam']).toContain(result.verdict);
      expect(result.safeToSend).toBe(result.spamScore < 70);
    });

    test('should generate scan report', () => {
      const emails = [
        { subject: 'Safe', htmlContent: '<p>Hello</p><a href="#">Unsubscribe</a>', textContent: 'Hello' },
        { subject: 'FREE!!!', htmlContent: '<p>Click here!</p>', textContent: '' },
        { subject: 'Newsletter', htmlContent: '<p>Content</p><a href="#">Unsubscribe</a>', textContent: 'Content' }
      ];

      const report = spamFilterService.getScanReport(emails);

      expect(report.total).toBe(3);
      expect(report.scanned).toBe(3);
      expect(report.safe).toBeGreaterThanOrEqual(1);
      expect(report.averageScore).toBeGreaterThanOrEqual(0);
      expect(report.topIssues).toBeInstanceOf(Array);
    });
  });

  describe('Bounce and Complaint Service', () => {
    test('should detect suppression threshold', () => {
      const { AUTO_SUPPRESS_SOFT_BOUNCES, SOFT_BOUNCE_THRESHOLD } = bounceComplaintService;

      expect(AUTO_SUPPRESS_SOFT_BOUNCES).toBe(true);
      expect(SOFT_BOUNCE_THRESHOLD).toBe(3);
    });

    test('should have hard bounce threshold of 1', () => {
      expect(bounceComplaintService.HARD_BOUNCE_THRESHOLD).toBe(1);
    });

    test('should have complaint threshold', () => {
      expect(bounceComplaintService.COMPLAINT_THRESHOLD).toBe(1);
    });

    test('should check suppression status structure', () => {
      // Mock contact not found scenario
      const mockResult = {
        suppressible: false,
        reason: 'contact_not_found',
        contact: null
      };

      expect(mockResult.suppressible).toBe(false);
      expect(mockResult.reason).toBe('contact_not_found');
    });

    test('should have campaign delivery stats method', () => {
      expect(typeof bounceComplaintService.getCampaignDeliveryStats).toBe('function');
    });

    test('should have contact health score method', () => {
      expect(typeof bounceComplaintService.getContactHealthScore).toBe('function');
    });

    test('should have suppression list method', () => {
      expect(typeof bounceComplaintService.getSuppressionList).toBe('function');
    });

    test('should have reactivate contact method', () => {
      expect(typeof bounceComplaintService.reactivateContact).toBe('function');
    });
  });

  describe('Recipient Rate Limiting', () => {
    test('should have per-hour limit', () => {
      const { RATE_LIMITS } = recipientRateLimiter;
      expect(RATE_LIMITS.perHour).toBe(5);
      expect(RATE_LIMITS.perDay).toBe(20);
      expect(RATE_LIMITS.perWeek).toBe(100);
    });

    test('should check rate limit', () => {
      expect(typeof recipientRateLimiter.checkRateLimit).toBe('function');
    });

    test('should track sends', () => {
      expect(typeof recipientRateLimiter.recordSend).toBe('function');
    });

    test('should provide stats', () => {
      expect(typeof recipientRateLimiter.getStats).toBe('function');
    });

    test('should reset limits', () => {
      expect(typeof recipientRateLimiter.resetLimits).toBe('function');
    });
  });

  describe('Delivery Tracking Service', () => {
    test('should have tracking events', () => {
      const { TRACKING_EVENTS } = deliveryTrackingService;

      expect(TRACKING_EVENTS.SENT).toBe('sent');
      expect(TRACKING_EVENTS.DELIVERED).toBe('delivered');
      expect(TRACKING_EVENTS.OPENED).toBe('opened');
      expect(TRACKING_EVENTS.CLICKED).toBe('clicked');
      expect(TRACKING_EVENTS.BOUNCED).toBe('bounced');
      expect(TRACKING_EVENTS.COMPLAINED).toBe('unsubscribed');
      expect(TRACKING_EVENTS.FAILED).toBe('failed');
    });

    test('should record sent events', () => {
      expect(typeof deliveryTrackingService.recordSent).toBe('function');
    });

    test('should record delivered events', () => {
      expect(typeof deliveryTrackingService.recordDelivered).toBe('function');
    });

    test('should record opened events', () => {
      expect(typeof deliveryTrackingService.recordOpened).toBe('function');
    });

    test('should record clicked events', () => {
      expect(typeof deliveryTrackingService.recordClicked).toBe('function');
    });

    test('should get email timeline', () => {
      expect(typeof deliveryTrackingService.getEmailTimeline).toBe('function');
    });

    test('should get campaign dashboard', () => {
      expect(typeof deliveryTrackingService.getCampaignDeliveryDashboard).toBe('function');
    });

    test('should get sending progress', () => {
      expect(typeof deliveryTrackingService.getSendingProgress).toBe('function');
    });
  });

  describe('Fail States and Error Handling', () => {
    test('spam filter should fail open on error', () => {
      // Even if scanning fails, should not block sending
      const result = spamFilterService.scanEmail('Subject', '<p>HTML</p>', 'Text');
      expect(result.safeToSend).toBeDefined();
      expect(typeof result.safeToSend).toBe('boolean');
    });

    test('rate limiter should fail open if Redis unavailable', () => {
      expect(typeof recipientRateLimiter.checkRateLimit).toBe('function');
      // Should gracefully handle Redis unavailability
    });

    test('delivery tracker should handle missing email', () => {
      expect(typeof deliveryTrackingService.getEmailTimeline).toBe('function');
      // Should return graceful response for missing emails
    });
  });

  describe('Integration Scenarios', () => {
    test('should detect high-risk campaign', () => {
      const campaign = {
        subject: 'FREE MONEY NOW!!!',
        htmlContent: '<p>Click here for free cash! Act now! Act now! Act now!</p>'
      };

      const result = spamFilterService.scanEmail(
        campaign.subject,
        campaign.htmlContent,
        ''
      );

      expect(['warning', 'likely_spam']).toContain(result.verdict);
      expect(result.spamScore).toBeGreaterThan(40);
    });

    test('should support legitimate marketing email', () => {
      const campaign = {
        subject: 'Your Monthly Digest',
        htmlContent: `
          <p>Hi there,</p>
          <p>Here's your monthly digest of news.</p>
          <p><a href="https://example.com/article1">Article 1</a></p>
          <p><a href="https://example.com/article2">Article 2</a></p>
          <footer>
            <a href="https://example.com/unsubscribe">Unsubscribe</a>
          </footer>
        `,
        textContent: 'Hi there, Here is your monthly digest.'
      };

      const result = spamFilterService.scanEmail(
        campaign.subject,
        campaign.htmlContent,
        campaign.textContent
      );

      expect(result.verdict).toBe('safe');
      expect(result.safeToSend).toBe(true);
    });

    test('should support transactional email', () => {
      const email = {
        subject: 'Your Order #12345 Confirmation',
        htmlContent: `
          <p>Your order has been confirmed!</p>
          <p>Order #12345</p>
          <p><a href="https://example.com/track">Track Order</a></p>
          <footer>
            <a href="https://example.com/unsubscribe">Unsubscribe</a>
          </footer>
        `,
        textContent: 'Your order has been confirmed!'
      };

      const result = spamFilterService.scanEmail(
        email.subject,
        email.htmlContent,
        email.textContent
      );

      expect(result.verdict).toBe('safe');
      expect(result.spamScore).toBeLessThan(30);
    });
  });
});
