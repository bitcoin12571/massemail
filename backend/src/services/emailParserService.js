import ParsedEmail from '../models/ParsedEmail.js';
import Contact from '../models/Contact.js';
import { col, fn, Op } from 'sequelize';

// Validate email format
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function splitDelimitedRow(row, delimiter) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"' && quoted && row[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function detectDelimiter(row) {
  const commaColumns = splitDelimitedRow(row, ',').length;
  const semicolonColumns = splitDelimitedRow(row, ';').length;
  return semicolonColumns > commaColumns ? ';' : ',';
}

function normalizeEmail(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim().toLowerCase();
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
    if (typeof csvContent !== 'string' || !csvContent.trim()) {
      return { results: [], errors: [], totalProcessed: 0 };
    }

    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    const results = [];
    const errors = [];
    const delimiter = detectDelimiter(lines[0]);
    const firstRow = splitDelimitedRow(lines[0], delimiter)
      .map(value => value.replace(/^\uFEFF/, '').trim().toLowerCase());
    const hasHeader = firstRow.some(value => ['email', 'email address', 'e-mail'].includes(value));

    const startIdx = hasHeader ? 1 : 0;
    const emailIndex = hasHeader
      ? firstRow.findIndex(value => ['email', 'email address', 'e-mail'].includes(value))
      : 0;
    const nameIndex = hasHeader
      ? firstRow.findIndex(value => ['name', 'full name', 'nume'].includes(value))
      : 1;
    const regionIndex = hasHeader
      ? firstRow.findIndex(value => ['region', 'regiune', 'location'].includes(value))
      : 2;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = splitDelimitedRow(line, delimiter);
      const email = normalizeEmail(parts[emailIndex]);
      const name = nameIndex >= 0 ? parts[nameIndex]?.trim() || '' : '';
      let region = regionIndex >= 0 ? parts[regionIndex]?.trim() || '' : '';

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
    const uniqueEmails = [...new Map(
      emailsData
        .filter(item => item?.email)
        .map(item => [item.email.toLowerCase(), {
          ...item,
          email: item.email.toLowerCase()
        }])
    ).values()];
    const BATCH_SIZE = 1000;
    const saved = [];

    for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
      const batch = uniqueEmails.slice(i, i + BATCH_SIZE);
      const existing = await ParsedEmail.findAll({
        where: { email: { [Op.in]: batch.map(item => item.email) } }
      });
      const existingEmails = new Set(existing.map(item => item.email.toLowerCase()));
      const missing = batch.filter(item => !existingEmails.has(item.email));
      const created = missing.length ? await ParsedEmail.bulkCreate(missing) : [];
      saved.push(...existing, ...created);
    }

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
        [fn('COUNT', col('id')), 'count']
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
      const email = normalizeEmail(lines[i]);
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
        source: 'csv_upload',
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
        email = normalizeEmail(item);
      } else if (typeof item === 'object' && item !== null) {
        email = normalizeEmail(item.email);
        name = String(item.name || '').trim();
        region = String(item.region || '').trim();
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
        source: 'csv_upload',
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
