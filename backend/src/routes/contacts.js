import logger from '../services/logger.js';
import express from 'express';
import { Op } from 'sequelize';
import Contact from '../models/Contact.js';
import Campaign from '../models/Campaign.js';
import Email from '../models/Email.js';
import ParsedEmail from '../models/ParsedEmail.js';
import { emailQueue } from '../services/queueService.js';
import { isRealEmailDeliveryConfigured } from '../services/emailService.js';
import { parseCSV } from '../utils/csvParser.js';
import { validateRequest, validateQuery } from '../middleware/validation.js';
import { contactSchema, bulkContactSchema, quickEmailSchema } from '../schemas/email.schema.js';
import { contactImportLimiter, emailSendLimiter } from '../middleware/rateLimiter.js';
import { attachmentUpload, serializeUploadedFiles } from '../middleware/upload.js';
import {
  generateVerificationToken,
  isTokenExpired,
  sendVerificationEmail,
  sendConfirmationEmail
} from '../services/verificationService.js';

const router = express.Router();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return EMAIL_REGEX.test(trimmed) && trimmed.length <= 254;
}

// Get all contacts (including ParsedEmail from Email Parser)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 500, search } = req.query;
    const offset = (page - 1) * limit;
    const searchLimit = parseInt(limit);

    const where = { createdBy: req.user.id };
    let contacts = [];

    // Get from Contact table
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Contact.findAndCountAll({
      where,
      limit: searchLimit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    contacts = rows;

    // ALSO get from ParsedEmail table if user imported them
    try {
      let parsedWhere = { isValid: true };
      if (search) {
        parsedWhere[Op.or] = [
          { email: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } }
        ];
      }

      const parsedEmails = await ParsedEmail.findAll({
        where: parsedWhere,
        limit: searchLimit,
        offset: 0,
        raw: true
      });

      // Convert ParsedEmail to Contact format
      const converted = parsedEmails.map(pe => ({
        id: `parsed_${pe.id}`,
        email: pe.email,
        name: pe.name || '',
        region: pe.region,
        status: 'active',
        verified: false,
        createdAt: pe.createdAt,
        source: 'email_parser'
      }));

      // Merge and dedupe by email
      const mergedContacts = [...contacts, ...converted];
      const deduped = Array.from(
        new Map(mergedContacts.map(c => [c.email, c])).values()
      );

      res.json({
        contacts: deduped.slice(0, searchLimit),
        total: deduped.length,
        page: parseInt(page),
        pages: Math.ceil(deduped.length / searchLimit),
        note: 'Includes imported emails from Email Parser'
      });
    } catch (parseError) {
      logger.warn('CONTACTS', `ParsedEmail lookup failed: ${parseError.message}`);
      res.json({
        contacts,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / searchLimit)
      });
    }
  } catch (error) {
    logger.error('CONTACTS_GET', 'Get contacts error', error);
    res.status(500).json({ error: error.message });
  }
});

// Create contact
router.post('/', validateRequest(contactSchema), async (req, res) => {
  try {
    const { email, name, customData, tags } = req.body;

    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const contact = await Contact.create({
      email: email.toLowerCase().trim(),
      name,
      tags: tags || [],
      verified: true,  // Auto-verified for immediate sending
      verificationToken: null,
      verificationTokenExpiry: null,
      customData: customData || {},
      createdBy: req.user.id
    });

    // Skip verification email - contacts are auto-verified for immediate sending
    // try {
    //   const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(contact.email)}`;
    //   await sendVerificationEmail(contact, verificationUrl);
    // } catch (emailError) {
    //   console.error('Verification email send failed:', emailError);
    // }

    res.status(201).json({
      ...contact.toJSON(),
      message: 'Contact created. Verification email sent.'
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'This email is already in your contacts' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Import CSV
router.post('/import', contactImportLimiter, async (req, res) => {
  try {
    const { csvData } = req.body;

    // Validate CSV data size to prevent memory exhaustion
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ error: 'CSV data must be a string' });
    }
    if (csvData.length > 5 * 1024 * 1024) { // 5MB limit
      return res.status(413).json({ error: 'CSV file is too large (max 5MB)' });
    }

    let parsed;
    try {
      parsed = parseCSV(csvData);
    } catch (parseError) {
      // Catch CSV parsing errors specifically
      return res.status(400).json({
        error: `CSV parsing error: ${parseError.message}`,
        help: 'Make sure CSV has an email column and is properly formatted'
      });
    }

    // Validate emails before bulk create
    const invalid = parsed.filter(c => !isValidEmail(c.email));
    if (invalid.length > 0) {
      return res.status(400).json({
        error: `Found ${invalid.length} invalid email(s). Please fix them and try again.`,
        invalidEmails: invalid.slice(0, 5).map(c => c.email)
      });
    }

    const contacts = parsed.map((contact) => ({
      ...contact,
      email: contact.email.toLowerCase().trim(),
      createdBy: req.user.id
    }));

    const created = await Contact.bulkCreate(contacts, { ignoreDuplicates: true });

    res.json({ imported: created.length, total: contacts.length });
  } catch (error) {
    logger.error('CONTACT_IMPORT', 'Unexpected error', error);
    res.status(500).json({ error: 'Failed to import contacts. Please try again.' });
  }
});

router.post('/send-now', emailSendLimiter, attachmentUpload.array('attachments', 5), async (req, res) => {
  try {
    console.log('[SEND-NOW] Request received');
    console.log('[SEND-NOW] User ID:', req.user?.id);
    console.log('[SEND-NOW] Body keys:', Object.keys(req.body));

    // Minimal logging for speed
    const contactIds = typeof req.body.contactIds === 'string'
      ? JSON.parse(req.body.contactIds)
      : req.body.contactIds;
    const recipientSnapshots = typeof req.body.recipients === 'string'
      ? JSON.parse(req.body.recipients)
      : req.body.recipients;
    const { subject, message } = req.body;

    console.log('[SEND-NOW] Contact IDs:', contactIds);
    console.log('[SEND-NOW] Subject:', subject);

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      console.log('[SEND-NOW] Error: No contact IDs');
      return res.status(400).json({ error: 'Select at least one recipient' });
    }
    if (!subject?.trim() || !message?.trim()) {
      console.log('[SEND-NOW] Error: Missing subject or message');
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    console.log('[SEND-NOW] Finding contacts...');
    let contacts = await Contact.findAll({
      where: {
        id: contactIds,
        createdBy: req.user.id,
        status: 'active'
      }
    });

    console.log('[SEND-NOW] Found contacts:', contacts.length);

    const hasPersistentDatabase = process.env.DATABASE_URL?.startsWith('postgres');
    if (process.env.VERCEL && !hasPersistentDatabase && contacts.length < contactIds.length) {
      const existingIds = new Set(contacts.map((contact) => contact.id));
      const snapshotsById = new Map(
        (Array.isArray(recipientSnapshots) ? recipientSnapshots : [])
          .filter((recipient) => contactIds.includes(recipient.id))
          .map((recipient) => [recipient.id, recipient])
      );

      for (const contactId of contactIds) {
        if (existingIds.has(contactId)) continue;

        const snapshot = snapshotsById.get(contactId);
        if (!snapshot || snapshot.status !== 'active' || !isValidEmail(snapshot.email)) continue;

        const normalizedEmail = snapshot.email.toLowerCase().trim();
        const [contact] = await Contact.findOrCreate({
          where: { email: normalizedEmail },
          defaults: {
            id: contactId,
            email: normalizedEmail,
            name: snapshot.name?.trim() || null,
            status: 'active',
            verified: true,
            createdBy: req.user.id
          }
        });

        if (contact.createdBy === req.user.id && contact.status === 'active') {
          contacts.push(contact);
          existingIds.add(contact.id);
        }
      }
    }

    if (!contacts.length) {
      return res.status(400).json({ error: 'No active recipients were found.' });
    }

    // Validate all recipient emails before sending
    const invalidEmails = contacts.filter(c => !isValidEmail(c.email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        error: `Cannot send: ${invalidEmails.length} recipient(s) have invalid email addresses`,
        invalidEmails: invalidEmails.map(c => ({ name: c.name, email: c.email }))
      });
    }

    const safeMessage = message
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\n', '<br>');

    const attachments = serializeUploadedFiles(req.files);
    const campaign = await Campaign.create({
      name: `Quick send - ${new Date().toLocaleString('en-GB')}`,
      subject: subject.trim(),
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6">${safeMessage}</div>`,
      textContent: message.trim(),
      attachments,
      status: 'sending',
      createdBy: req.user.id
    });

    const { sendEmail } = await import('../services/emailService.js');

    const emailRecords = [];
    for (const contact of contacts) {
      const email = await Email.create({
        campaignId: campaign.id,
        contactId: contact.id,
        recipientEmail: contact.email,
        status: 'pending'
      });
      emailRecords.push({ email, contact });
    }

    const results = await Promise.allSettled(
      emailRecords.map(async ({ email, contact }) => {
        try {
          console.log(`[SEND-NOW] Sending to ${contact.email} with ${attachments.length} attachments`);

          const result = await sendEmail({
            to: contact.email,
            subject: subject.trim(),
            html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${safeMessage}</div>`,
            text: message.trim(),
            attachments: attachments
          });

          await email.update({
            status: 'sent',
            sentAt: new Date(),
            sendgridMessageId: result.messageId
          });
          return contact.email;
        } catch (err) {
          await email.update({
            status: 'failed',
            failureReason: (err.message || String(err)).slice(0, 500)
          });
          console.error(`Email send error to ${contact.email}:`, err.message);
          throw err;
        }
      })
    );

    const failedCount = results.filter((result) => result.status === 'rejected').length;
    if (failedCount > 0) {
      await campaign.update({ status: 'paused' });
      return res.status(502).json({
        error: `${failedCount} of ${contacts.length} email(s) could not be sent.`,
        recipientCount: contacts.length,
        failedCount
      });
    }

    await campaign.update({ status: 'sent', sentAt: new Date() });

    res.status(200).json({
      success: true,
      campaignId: campaign.id,
      recipientCount: contacts.length,
      sentCount: contacts.length,
      status: 'sent'
    });
  } catch (error) {
    console.error('[SEND-NOW] ERROR:', error.message);
    console.error('[SEND-NOW] Stack:', error.stack);
    res.status(500).json({
      error: error.message,
      code: error.code
    });
  }
});


// TEST EMAIL - send to first client in database
router.post('/test-send', async (req, res) => {
  try {
    // Get first client from database
    const client = await Contact.findOne({
      where: { createdBy: req.user.id, status: 'active' },
      order: [['createdAt', 'ASC']]
    });

    if (!client) {
      return res.status(400).json({ error: 'No clients found in database' });
    }

    console.log(`[TEST-SEND] Testing with client: ${client.email}`);

    const { sendEmail } = await import('../services/emailService.js');
    const result = await sendEmail({
      to: client.email,
      subject: 'TEST EMAIL - Verify Setup',
      html: '<p>This is a test email to verify your email sending is working correctly.</p><p>If you received this, your setup is successful!</p>',
      text: 'This is a test email to verify your email sending is working correctly. If you received this, your setup is successful!'
    });

    console.log(`[TEST-SEND] ✅ Success! Message ID: ${result.messageId}`);
    res.json({
      success: true,
      messageId: result.messageId,
      sentTo: client.email,
      clientName: client.name
    });
  } catch (error) {
    console.error('[TEST-SEND] ❌ ERROR:', error.message);
    console.error('[TEST-SEND] Full error:', error);
    res.status(500).json({
      error: error.message,
      type: error.name,
      code: error.code
    });
  }
});

// Verify email endpoint (public - no auth required)
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;
    if (!token || !email) {
      return res.status(400).json({ error: 'Token and email are required' });
    }

    const contact = await Contact.findOne({
      where: { email: email.toLowerCase().trim(), verificationToken: token }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Invalid verification token or email' });
    }

    if (isTokenExpired(contact.verificationTokenExpiry)) {
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
    }

    if (contact.verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Mark as verified
    await contact.update({
      verified: true,
      verificationToken: null,
      verificationTokenExpiry: null
    });

    // Send confirmation email
    try {
      await sendConfirmationEmail(contact);
    } catch (emailError) {
      console.error('Confirmation email send failed:', emailError);
      // Don't fail the verification
    }

    res.json({
      success: true,
      message: 'Email verified successfully!',
      contact
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resend verification email
router.post('/:id/resend-verification', async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (contact.verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await contact.update({
      verificationToken,
      verificationTokenExpiry
    });

    // Send verification email
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(contact.email)}`;
      await sendVerificationEmail(contact, verificationUrl);
    } catch (emailError) {
      console.error('Verification email send failed:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({
      success: true,
      message: 'Verification email sent again'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    await Contact.destroy({ where: { id: req.params.id, createdBy: req.user.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
