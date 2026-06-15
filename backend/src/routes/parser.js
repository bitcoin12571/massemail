import express from 'express';
import { parseCSV, parsePlainText, parseJSON, saveParsedEmails, getEmailsByRegion, getAllRegions, getRegionStats, validateAndFixEmails, deleteByRegion } from '../services/emailParserService.js';
import logger from '../services/logger.js';

const router = express.Router();

// Upload and parse (auto-detect format: CSV, Plain Text, or JSON)
router.post('/upload-csv', async (req, res) => {
  try {
    const { csvContent, format } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'Content required' });
    }

    if (typeof csvContent !== 'string' || csvContent.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Content too large (max 5MB)' });
    }

    let results, errors, totalProcessed;
    let detectedFormat = format || 'csv'; // default to CSV

    // Auto-detect format if not specified
    if (!format) {
      const trimmed = csvContent.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        detectedFormat = 'json';
      } else if (!trimmed.includes(',') || trimmed.split('\n").length <= 2) {
        // Heuristic: if no commas or very few lines, likely plain text
        const lines = trimmed.split('\n').filter(l => l.trim());
        const hasCommas = lines.some(l => l.includes(','));
        if (!hasCommas && lines.length > 0) {
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

    // Save to database
    const saved = await saveParsedEmails(results);

    logger.info('PARSER', `Imported ${saved.length} emails (format: ${detectedFormat})`);

    res.json({
      success: true,
      totalProcessed,
      validEmails: saved.length,
      format: detectedFormat,
      errors,
      saved: saved.map(e => ({
        id: e.id,
        email: e.email,
        region: e.region,
        name: e.name
      }))
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
