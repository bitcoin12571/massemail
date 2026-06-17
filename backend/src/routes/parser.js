import express from 'express';
import { parseCSV, parsePlainText, parseJSON, saveParsedEmails, getEmailsByRegion, getAllRegions, getRegionStats, validateAndFixEmails, deleteByRegion, syncParsedEmailsToContacts } from '../services/emailParserService.js';
import { discoverRegionalEmails } from '../services/regionalDiscoveryService.js';
import logger from '../services/logger.js';

const router = express.Router();

router.post('/discover-region', async (req, res) => {
  try {
    const { region, category = 'all', offset = 0 } = req.body ?? {};
    const normalizedRegion = String(region || '').trim();

    if (normalizedRegion.length < 3 || normalizedRegion.length > 120) {
      return res.status(400).json({ error: 'Introdu o regiune validă' });
    }

    const result = await discoverRegionalEmails({
      region: normalizedRegion,
      category: String(category || 'all'),
      offset
    });

    const verifiedContacts = result.contacts.filter(contact =>
      contact.verified && contact.emailDomainValid
    );

    if (verifiedContacts.length > 0) {
      const parsedEmails = verifiedContacts.map(contact => ({
        email: contact.email,
        name: contact.name,
        region: normalizedRegion.toLowerCase(),
        source: 'web_scrape',
        isValid: true,
        notes: JSON.stringify({
          verifiedUrl: contact.verifiedUrl,
          verificationLevel: contact.verificationLevel,
          emailDomainMethod: contact.emailDomainMethod
        })
      }));

      try {
        await saveParsedEmails(parsedEmails);
      } catch (saveError) {
        logger.warn('REGIONAL_DISCOVERY', `Database save skipped: ${saveError.message}`);
      }
    }

    logger.info(
      'REGIONAL_DISCOVERY',
      `${normalizedRegion}: ${result.contacts.length} emails from ${result.businessesScanned} businesses`
    );
    res.json({ success: true, ...result, contacts: verifiedContacts });
  } catch (error) {
    logger.error('REGIONAL_DISCOVERY', 'Discovery failed', error);
    res.status(502).json({ error: error.message || 'Căutarea regională a eșuat' });
  }
});

// Upload and parse (auto-detect format: CSV, Plain Text, or JSON)
// Optimized for large-scale bulk imports
router.post('/upload-csv', async (req, res) => {
  try {
    const { csvContent, format } = req.body ?? {};

    if (!csvContent) {
      return res.status(400).json({ error: 'Content required' });
    }

    // NO SIZE LIMIT - let it handle as much as it can
    // Vercel can handle files up to 4.5MB in request body
    // For larger: user should use API directly or batch requests
    if (typeof csvContent !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    let results, errors, totalProcessed;
    let detectedFormat = String(format || '').toLowerCase() || 'csv'; // default to CSV

    if (!['csv', 'plaintext', 'json'].includes(detectedFormat)) {
      return res.status(400).json({ error: 'Format must be csv, plaintext, or json' });
    }

    // Auto-detect format if not specified
    if (!format) {
      const trimmed = csvContent.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        detectedFormat = 'json';
      } else if (!trimmed.includes(',') && !trimmed.includes(';')) {
        // No delimiters means one email per line.
        const lines = trimmed.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          detectedFormat = 'plaintext';
        }
      }
    }

    // Parse based on format
    try {
      if (detectedFormat === 'json') {
        ({ results, errors, totalProcessed } = await parseJSON(csvContent));
      } else if (detectedFormat === 'plaintext') {
        ({ results, errors, totalProcessed } = await parsePlainText(csvContent));
      } else {
        ({ results, errors, totalProcessed } = await parseCSV(csvContent));
      }
    } catch (parseError) {
      return res.status(400).json({
        error: `${detectedFormat.toUpperCase()} parsing error: ${parseError.message}`,
        format: detectedFormat
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        error: 'No valid emails found',
        errors,
        totalProcessed,
        format: detectedFormat
      });
    }

    // Set a timeout for large imports (60 seconds max)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Import timeout: too many emails')), 60000)
    );

    // Save to database with timeout protection
    let saved;
    try {
      saved = await Promise.race([
        saveParsedEmails(results),
        timeoutPromise
      ]);
    } catch (timeoutError) {
      logger.warn('PARSER', `Import timeout for ${results.length} emails`);
      return res.status(408).json({
        error: 'Import took too long. Try uploading fewer emails at once.',
        totalEmails: results.length,
        format: detectedFormat
      });
    }

    logger.info('PARSER', `Imported ${saved.length} emails (format: ${detectedFormat}, errors: ${errors.length})`);

    // Auto-sync to Contact table so they appear in "Trimite email acum"
    try {
      const userId = req.user?.id;
      if (userId) {
        await syncParsedEmailsToContacts(userId);
        logger.info('PARSER', `Synced emails to contacts for user ${userId}`);
      }
    } catch (syncErr) {
      logger.warn('PARSER', `Sync to contacts failed: ${syncErr.message}`);
    }

    // For large responses, only return summary (not individual emails)
    const shouldReturnDetails = saved.length <= 100;

    res.json({
      success: true,
      totalProcessed,
      validEmails: saved.length,
      format: detectedFormat,
      recipients: results.map(({ email, name, region }) => ({ email, name, region })),
      errors: errors.length > 0 ? errors.slice(0, 20) : [], // Return first 20 errors only
      errorCount: errors.length,
      ...(shouldReturnDetails && {
        saved: saved.map(e => ({
          id: e.id,
          email: e.email,
          region: e.region,
          name: e.name
        }))
      })
    });
  } catch (error) {
    logger.error('PARSER_UPLOAD', 'Upload error', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

// Get all regions
router.get('/regions', async (req, res) => {
  try {
    const regions = await getAllRegions();
    res.json({ regions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get region statistics
router.get('/regions/stats', async (req, res) => {
  try {
    const stats = await getRegionStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get emails by region
router.get('/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const emails = await getEmailsByRegion(region);

    res.json({
      region,
      count: emails.length,
      emails: emails.map(e => ({
        id: e.id,
        email: e.email,
        name: e.name,
        region: e.region
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate all emails
router.post('/validate', async (req, res) => {
  try {
    const { fixedCount, totalEmails } = await validateAndFixEmails();
    res.json({
      success: true,
      totalEmails,
      fixedCount,
      validEmails: totalEmails - fixedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete region
router.delete('/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const deleted = await deleteByRegion(region);
    res.json({ success: true, deleted, region });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
