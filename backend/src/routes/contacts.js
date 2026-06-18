import logger from '../services/logger.js';
import express from 'express';
import { Op } from 'sequelize';
import Contact from '../models/Contact.js';
import Campaign from '../models/Campaign.js';
import Email from '../models/Email.js';
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
import {
  generateChisinauTestContacts,
  isReservedTestEmail
} from '../services/chisinauTestDataService.js';

const router = express.Router();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return EMAIL_REGEX.test(trimmed) && trimmed.length <= 254;
}

function getRecipientDisplayName(contact) {
  return String(contact?.company || contact?.name || contact?.email || '').trim();
}

function buildRecipientCampaignName(contacts = []) {
  const names = contacts
    .map(getRecipientDisplayName)
    .filter(Boolean);

  if (names.length === 0) return 'Email campaign';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} + încă ${names.length - 2}`;
}

async function createContactFromSnapshot(snapshot, userId) {
  if (!snapshot || (snapshot.status && snapshot.status !== 'active') || !isValidEmail(snapshot.email)) return null;

  const normalizedEmail = snapshot.email.toLowerCase().trim();
  const existingContact = await Contact.findOne({
    where: { email: normalizedEmail, createdBy: userId }
  });

  if (existingContact) {
    if (existingContact.status !== 'active') return null;
    return existingContact;
  }

  try {
    return await Contact.create({
      id: snapshot.id,
      email: normalizedEmail,
      name: snapshot.name?.trim() || null,
      status: 'active',
      verified: true,
      createdBy: userId
    });
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;

    const contact = await Contact.findOne({
      where: { email: normalizedEmail, createdBy: userId, status: 'active' }
    });
    return contact || null;
  }
}

// Get all contacts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 500);
    const offset = (safePage - 1) * safeLimit;

    const where = { createdBy: req.user.id };
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Contact.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      contacts: rows,
      total: count,
      page: safePage,
      pages: Math.ceil(count / safeLimit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate non-deliverable contacts for high-volume UI and database testing.
router.post('/generate-chisinau-test', contactImportLimiter, async (req, res) => {
  try {
    const contacts = generateChisinauTestContacts(req.body?.count, req.user.id);
    const chunkSize = 500;

    for (let index = 0; index < contacts.length; index += chunkSize) {
      await Contact.bulkCreate(contacts.slice(index, index + chunkSize), {
        ignoreDuplicates: true
      });
    }

    const total = await Contact.count({
      where: {
        createdBy: req.user.id,
        email: { [Op.like]: '%@mailora.invalid' }
      }
    });

    res.json({
      success: true,
      requested: contacts.length,
      total,
      sectors: ['Botanica', 'Buiucani', 'Centru', 'Ciocana', 'Rîșcani'],
      deliverable: false
    });
  } catch (error) {
    logger.error('CHISINAU_TEST_DATA', 'Generation failed', error);
    res.status(500).json({ error: 'Baza de test nu a putut fi generată' });
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
      verified: false,
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
      message: 'Contact created as unverified.'
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
      verified: false,
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

    const requestedContactIds = [...new Set(contactIds.filter(Boolean))];

    console.log('[SEND-NOW] Finding contacts...');
    let contacts = await Contact.findAll({
      where: {
        id: requestedContactIds,
        createdBy: req.user.id,
        status: 'active'
      }
    });

    console.log('[SEND-NOW] Found contacts:', contacts.length);

    const resolvedRequestedIds = new Set(contacts.map((contact) => contact.id));
    const contactEmails = new Set(contacts.map((contact) => contact.email.toLowerCase()));

    if (contacts.length < requestedContactIds.length) {
      const snapshotsById = new Map(
        (Array.isArray(recipientSnapshots) ? recipientSnapshots : [])
          .filter((recipient) => requestedContactIds.includes(recipient.id))
          .map((recipient) => [recipient.id, recipient])
      );

      for (const contactId of requestedContactIds) {
        if (resolvedRequestedIds.has(contactId)) continue;

        const snapshot = snapshotsById.get(contactId);
        const contact = await createContactFromSnapshot(snapshot, req.user.id);

        if (contact) {
          const normalizedEmail = contact.email.toLowerCase();
          if (!contactEmails.has(normalizedEmail)) {
            contacts.push(contact);
            contactEmails.add(normalizedEmail);
          }
          resolvedRequestedIds.add(contactId);
        }
      }
    }

    if (!contacts.length) {
      return res.status(400).json({ error: 'No active recipients were found.' });
    }

    if (resolvedRequestedIds.size < requestedContactIds.length) {
      return res.status(400).json({
        error: `Nu am putut pregăti ${requestedContactIds.length - resolvedRequestedIds.size} destinatar(i) selectați. Reîncarcă lista și încearcă din nou.`,
        requestedCount: requestedContactIds.length,
        resolvedCount: resolvedRequestedIds.size
      });
    }

    // Validate all recipient emails before sending
    const invalidEmails = contacts.filter(c => !isValidEmail(c.email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        error: `Cannot send: ${invalidEmails.length} recipient(s) have invalid email addresses`,
        invalidEmails: invalidEmails.map(c => ({ name: c.name, email: c.email }))
      });
    }

    const testEmails = contacts.filter(contact => isReservedTestEmail(contact.email));
    if (testEmails.length > 0) {
      return res.status(400).json({
        error: `Ai selectat ${testEmails.length} adrese de test. Acestea verifică volumul și nu pot primi emailuri reale.`
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
      name: buildRecipientCampaignName(contacts),
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
    const sentCount = contacts.length - failedCount;
    await campaign.update({
      status: failedCount ? 'paused' : 'sent',
      sentAt: sentCount > 0 ? new Date() : null
    });

    res.status(200).json({
      success: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
      recipientCount: contacts.length,
      sentCount,
      failedCount,
      status: failedCount ? 'completed_with_errors' : 'sent'
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

// Delete all contacts owned by the authenticated user.
router.delete('/', async (req, res) => {
  try {
    const deleted = await Contact.destroy({
      where: { createdBy: req.user.id }
    });
    res.json({ success: true, deleted });
  } catch (error) {
    logger.error('CONTACT_DELETE_ALL', 'Delete all failed', error);
    res.status(500).json({ error: 'Nu au putut fi șterse toate contactele' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const nextName = typeof req.body?.name === 'string' ? req.body.name.trim() : contact.name;
    await contact.update({ name: nextName || null });
    res.json(contact);
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
