import ParsedEmail from '../models/ParsedEmail.js';

// Validate email format
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Guess region from email domain or name
function guessRegion(email, name = '') {
  const regionMappings = {
    'cluj': ['cluj', 'napoca'],
    'bucuresti': ['bucharest', 'bucuresti', 'buc', 'bv'],
    'iasi': ['iasi', 'moldova'],
    'timisoara': ['timis', 'timisoara'],
    'constanta': ['constanta', 'dobrogea'],
    'brasov': ['brasov', 'transylvania'],
    'galati': ['galati', 'danube'],
    'oradea': ['oradea', 'bihor'],
    'craiova': ['craiova', 'dolj'],
    'ploiesti': ['ploiesti', 'prahova']
  };

  const searchText = (email + ' ' + name).toLowerCase();

  for (const [region, keywords] of Object.entries(regionMappings)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return region;
      }
    }
  }

  return 'unknown';
}

export async function parseCSV(csvContent) {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const results = [];
    const errors = [];

    // Skip header if present
    let startIdx = 0;
    if (lines[0]?.toLowerCase().includes('email')) {
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (email, name, region)
      const parts = line.split(',').map(p => p.trim());
      const email = parts[0];
      const name = parts[1] || '';
      let region = parts[2] || '';

      // Validate email
      if (!isValidEmail(email)) {
        errors.push({ line: i + 1, email, reason: 'Invalid email format' });
        continue;
      }

      // Auto-detect region if not provided
      if (!region) {
        region = guessRegion(email, name);
      }

      results.push({
        email,
        name,
        region: region.toLowerCase(),
        source: 'csv_upload',
        isValid: true
      });
    }

    return { results, errors, totalProcessed: lines.length - startIdx };
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
}

export async function saveParsedEmails(emailsData) {
  try {
    // Optimize for large batches: process in chunks
    const BATCH_SIZE = 1000; // Insert 1000 at a time
    const batches = [];

    for (let i = 0; i < emailsData.length; i += BATCH_SIZE) {
      const batch = emailsData.slice(i, i + BATCH_SIZE);
      batches.push(
        ParsedEmail.bulkCreate(batch, {
          ignoreDuplicates: true, // Skip duplicates instead of failing
          updateOnDuplicate: ['name', 'region'] // Update region/name if email exists
        })
      );
    }

    // Execute all batches in parallel
    const results = await Promise.all(batches);

    // Flatten results
    const saved = results.flat();
    return saved;
  } catch (error) {
    throw new Error(`Failed to save parsed emails: ${error.message}`);
  }
}

export async function getEmailsByRegion(region) {
  try {
    const emails = await ParsedEmail.findAll({
      where: {
        region: region.toLowerCase(),
        isValid: true
      }
    });
    return emails;
  } catch (error) {
    throw new Error(`Failed to get emails by region: ${error.message}`);
  }
}

export async function getAllRegions() {
  try {
    const regions = await ParsedEmail.findAll({
      attributes: [['region', 'region']],
      group: ['region'],
      raw: true
    });
    return regions.map(r => r.region);
  } catch (error) {
    throw new Error(`Failed to get regions: ${error.message}`);
  }
}

export async function getRegionStats() {
  try {
    const stats = await ParsedEmail.findAll({
      attributes: [
        'region',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['region'],
      raw: true
    });
    return stats;
  } catch (error) {
    throw new Error(`Failed to get region stats: ${error.message}`);
  }
}

export async function validateAndFixEmails() {
  try {
    const allEmails = await ParsedEmail.findAll();
    let fixedCount = 0;

    for (const email of allEmails) {
      if (!isValidEmail(email.email)) {
        await email.update({ isValid: false });
        fixedCount++;
      }
    }

    return { fixedCount, totalEmails: allEmails.length };
  } catch (error) {
    throw new Error(`Email validation failed: ${error.message}`);
  }
}

export async function deleteByRegion(region) {
  try {
    const deleted = await ParsedEmail.destroy({
      where: { region: region.toLowerCase() }
    });
    return deleted;
  } catch (error) {
    throw new Error(`Failed to delete region: ${error.message}`);
  }
}

// Parse Plain Text format (one email per line)
export async function parsePlainText(textContent) {
  try {
    const lines = textContent.split('\n').filter(line => line.trim());
    const results = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const email = lines[i].trim().toLowerCase();
      if (!email) continue;

      // Validate email
      if (!isValidEmail(email)) {
        errors.push({ line: i + 1, email, reason: 'Invalid email format' });
        continue;
      }

      // Auto-detect region
      const region = guessRegion(email);

      results.push({
        email,
        name: '',
        region,
        source: 'plaintext_upload',
        isValid: true
      });
    }

    return { results, errors, totalProcessed: lines.length };
  } catch (error) {
    throw new Error(`Plain text parsing failed: ${error.message}`);
  }
}

// Parse JSON format: { "emails": [{ "email": "...", "name": "...", "region": "..." }] }
export async function parseJSON(jsonContent) {
  try {
    let data;

    // Parse JSON string
    try {
      data = JSON.parse(jsonContent);
    } catch (parseErr) {
      throw new Error(`Invalid JSON format: ${parseErr.message}`);
    }

    // Support both { emails: [...] } and just [...]
    const emailsList = Array.isArray(data) ? data : data.emails || data.data || [];

    if (!Array.isArray(emailsList)) {
      throw new Error('JSON must contain an array of emails or { emails: [...] }');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < emailsList.length; i++) {
      const item = emailsList[i];

      // Handle both object and string format
      let email = '';
      let name = '';
      let region = '';

      if (typeof item === 'string') {
        email = item.toLowerCase().trim();
      } else if (typeof item === 'object' && item !== null) {
        email = (item.email || '').toLowerCase().trim();
        name = item.name || '';
        region = item.region || '';
      } else {
        errors.push({ line: i + 1, reason: 'Invalid format - must be string or object' });
        continue;
      }

      if (!email) {
        errors.push({ line: i + 1, reason: 'Email is required' });
        continue;
      }

      // Validate email
      if (!isValidEmail(email)) {
        errors.push({ line: i + 1, email, reason: 'Invalid email format' });
        continue;
      }

      // Auto-detect region if not provided
      if (!region) {
        region = guessRegion(email, name);
      }

      results.push({
        email,
        name,
        region: region.toLowerCase(),
        source: 'json_upload',
        isValid: true
      });
    }

    return { results, errors, totalProcessed: emailsList.length };
  } catch (error) {
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}

// Auto-convert ParsedEmail to Contact for easier access
export async function syncParsedEmailsToContacts(userId) {
  try {
    const Contact = (await import('../models/Contact.js')).default;
    const parsed = await ParsedEmail.findAll({ where: { isValid: true }, raw: true });

    for (const p of parsed) {
      await Contact.findOrCreate({
        where: { email: p.email },
        defaults: { email: p.email, name: p.name || '', createdBy: userId, status: 'active', verified: false }
      });
    }
    return parsed.length;
  } catch (err) {
    console.error('Sync failed:', err.message);
    return 0;
  }
}
