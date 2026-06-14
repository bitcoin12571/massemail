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
    const saved = await ParsedEmail.bulkCreate(emailsData);
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
