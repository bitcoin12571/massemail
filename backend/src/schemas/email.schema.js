import { z } from 'zod';

/**
 * Email validation schemas using Zod
 * All email inputs validated against these schemas before processing
 */

// Contact schema
export const contactSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),
  status: z.enum(['active', 'inactive', 'unsubscribed']).optional().default('active'),
  customData: z.record(z.any()).optional()
});

// Campaign schema
export const campaignSchema = z.object({
  name: z.string()
    .min(1, 'Campaign name is required')
    .max(200, 'Campaign name must be less than 200 characters'),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters'),
  htmlContent: z.string()
    .min(1, 'Email content is required')
    .max(100000, 'Email content is too large'),
  textContent: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused']).optional().default('draft'),
  scheduledAt: z.coerce.date().optional()
});

// Campaign send schema (when sending a campaign)
export const campaignSendSchema = z.object({
  contactIds: z.array(z.string().uuid()).optional(),
  scheduledAt: z.coerce.date().optional()
});

// Email send schema (for quick send endpoint)
export const quickEmailSchema = z.object({
  to: z.string()
    .email('Invalid recipient email'),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long'),
  message: z.string()
    .min(1, 'Message is required')
    .max(100000, 'Message is too large'),
  html: z.string().optional()
});

// Email preview schema
export const previewEmailSchema = z.object({
  contactId: z.string().uuid('Invalid contact ID')
});

// Bulk contact import schema
export const bulkContactSchema = z.object({
  contacts: z.array(contactSchema).min(1, 'At least one contact is required')
});

// Settings update schema
export const emailSettingsSchema = z.object({
  provider: z.enum(['preview', 'smtp', 'gmail', 'outlook', 'sendgrid', 'resend']),
  senderName: z.string().max(100).optional(),
  senderEmail: z.string().email().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  sendgridApiKey: z.string().optional(),
  resendApiKey: z.string().optional()
});

/**
 * Parse and validate data against a schema
 * Throws ZodError if validation fails (caught by error handler)
 */
export function validateData(schema, data) {
  return schema.parse(data);
}

/**
 * Safe parse - returns object with success flag instead of throwing
 * Useful for conditional validation
 */
export function validateDataSafe(schema, data) {
  return schema.safeParse(data);
}
