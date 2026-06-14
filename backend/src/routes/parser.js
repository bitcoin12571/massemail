import express from 'express';
import { parseCSV, saveParsedEmails, getEmailsByRegion, getAllRegions, getRegionStats, validateAndFixEmails, deleteByRegion } from '../services/emailParserService.js';

const router = express.Router();

// Upload and parse CSV
router.post('/upload-csv', async (req, res) => {
  try {
    const { csvContent } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content required' });
    }

    const { results, errors, totalProcessed } = await parseCSV(csvContent);

    if (results.length === 0) {
      return res.status(400).json({
        error: 'No valid emails found in CSV',
        errors,
        totalProcessed
      });
    }

    // Save to database
    const saved = await saveParsedEmails(results);

    res.json({
      success: true,
      totalProcessed,
      validEmails: saved.length,
      errors,
      saved: saved.map(e => ({
        id: e.id,
        email: e.email,
        region: e.region,
        name: e.name
      }))
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: error.message });
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
