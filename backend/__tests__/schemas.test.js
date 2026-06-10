import { describe, it, expect } from '@jest/globals';
import {
  contactSchema,
  campaignSchema,
  campaignSendSchema,
  quickEmailSchema,
  previewEmailSchema,
  emailSettingsSchema,
  validateData
} from '../src/schemas/email.schema.js';

describe('Email Validation Schemas', () => {
  describe('contactSchema', () => {
    it('should validate a valid contact', () => {
      const validContact = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      const result = contactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
      expect(result.data.email).toBe('john@example.com');
    });

    it('should reject invalid email', () => {
      const invalidContact = {
        name: 'John Doe',
        email: 'not-an-email'
      };
      const result = contactSchema.safeParse(invalidContact);
      expect(result.success).toBe(false);
    });

    it('should require name', () => {
      const noNameContact = {
        email: 'john@example.com'
      };
      const result = contactSchema.safeParse(noNameContact);
      expect(result.success).toBe(false);
    });

    it('should lowercase email addresses', () => {
      const contact = {
        name: 'John Doe',
        email: 'JOHN@EXAMPLE.COM'
      };
      const result = contactSchema.safeParse(contact);
      expect(result.success).toBe(true);
      expect(result.data.email).toBe('john@example.com');
    });

    it('should set default status to active', () => {
      const contact = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      const result = contactSchema.safeParse(contact);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('active');
    });

    it('should reject name longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      const contact = {
        name: longName,
        email: 'john@example.com'
      };
      const result = contactSchema.safeParse(contact);
      expect(result.success).toBe(false);
    });
  });

  describe('campaignSchema', () => {
    it('should validate a valid campaign', () => {
      const validCampaign = {
        name: 'Summer Sale',
        subject: 'Get 50% Off!',
        htmlContent: '<h1>Sale</h1><p>Check our deals</p>'
      };
      const result = campaignSchema.safeParse(validCampaign);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('draft');
    });

    it('should require name, subject, and htmlContent', () => {
      const incompleteCampaign = {
        name: 'Summer Sale'
      };
      const result = campaignSchema.safeParse(incompleteCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject subject longer than 200 characters', () => {
      const campaign = {
        name: 'Campaign',
        subject: 'a'.repeat(201),
        htmlContent: '<p>Content</p>'
      };
      const result = campaignSchema.safeParse(campaign);
      expect(result.success).toBe(false);
    });

    it('should set default status to draft', () => {
      const campaign = {
        name: 'Campaign',
        subject: 'Subject',
        htmlContent: '<p>Content</p>'
      };
      const result = campaignSchema.safeParse(campaign);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('draft');
    });

    it('should accept valid status values', () => {
      const campaign = {
        name: 'Campaign',
        subject: 'Subject',
        htmlContent: '<p>Content</p>',
        status: 'scheduled'
      };
      const result = campaignSchema.safeParse(campaign);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('scheduled');
    });

    it('should reject invalid status', () => {
      const campaign = {
        name: 'Campaign',
        subject: 'Subject',
        htmlContent: '<p>Content</p>',
        status: 'invalid'
      };
      const result = campaignSchema.safeParse(campaign);
      expect(result.success).toBe(false);
    });
  });

  describe('campaignSendSchema', () => {
    it('should validate empty send request', () => {
      const sendRequest = {};
      const result = campaignSendSchema.safeParse(sendRequest);
      expect(result.success).toBe(true);
    });

    it('should accept contactIds array', () => {
      const sendRequest = {
        contactIds: ['550e8400-e29b-41d4-a716-446655440000']
      };
      const result = campaignSendSchema.safeParse(sendRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const sendRequest = {
        contactIds: ['not-a-uuid']
      };
      const result = campaignSendSchema.safeParse(sendRequest);
      expect(result.success).toBe(false);
    });

    it('should accept scheduledAt date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const sendRequest = {
        scheduledAt: tomorrow.toISOString()
      };
      const result = campaignSendSchema.safeParse(sendRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('quickEmailSchema', () => {
    it('should validate a quick email', () => {
      const email = {
        to: 'recipient@example.com',
        subject: 'Quick Email',
        message: 'This is a quick email'
      };
      const result = quickEmailSchema.safeParse(email);
      expect(result.success).toBe(true);
    });

    it('should require valid recipient email', () => {
      const email = {
        to: 'not-an-email',
        subject: 'Quick Email',
        message: 'This is a quick email'
      };
      const result = quickEmailSchema.safeParse(email);
      expect(result.success).toBe(false);
    });

    it('should require subject', () => {
      const email = {
        to: 'recipient@example.com',
        message: 'This is a quick email'
      };
      const result = quickEmailSchema.safeParse(email);
      expect(result.success).toBe(false);
    });

    it('should require message', () => {
      const email = {
        to: 'recipient@example.com',
        subject: 'Quick Email'
      };
      const result = quickEmailSchema.safeParse(email);
      expect(result.success).toBe(false);
    });
  });

  describe('previewEmailSchema', () => {
    it('should validate with valid UUID', () => {
      const preview = {
        contactId: '550e8400-e29b-41d4-a716-446655440000'
      };
      const result = previewEmailSchema.safeParse(preview);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const preview = {
        contactId: 'not-a-uuid'
      };
      const result = previewEmailSchema.safeParse(preview);
      expect(result.success).toBe(false);
    });

    it('should require contactId', () => {
      const preview = {};
      const result = previewEmailSchema.safeParse(preview);
      expect(result.success).toBe(false);
    });
  });

  describe('validateData helper', () => {
    it('should throw on invalid data', () => {
      const invalidContact = {
        email: 'not-an-email'
      };
      expect(() => validateData(contactSchema, invalidContact)).toThrow();
    });

    it('should return validated data on success', () => {
      const validContact = {
        name: 'John',
        email: 'john@example.com'
      };
      const result = validateData(contactSchema, validContact);
      expect(result.email).toBe('john@example.com');
    });
  });
});
