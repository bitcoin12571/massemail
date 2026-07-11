import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read CSV file
const csvPath = path.join(__dirname, 'bulk-emails.csv');
const csvData = fs.readFileSync(csvPath, 'utf-8');

console.log(`📊 CSV File loaded`);
console.log(`   Size: ${csvData.length} bytes`);
console.log(`   Lines: ${csvData.split('\n').length}`);
console.log(`   Valid emails: ${(csvData.match(/@/g) || []).length}`);

// Test parsing locally
function parseCSV(csvDataStr) {
  if (typeof csvDataStr !== 'string' || !csvDataStr.trim()) return [];

  const rows = csvDataStr.trim().split(/\r?\n/).filter(Boolean);
  const firstRow = rows[0];

  console.log(`   First row: "${firstRow}"`);

  // Check if it looks like a header
  if (firstRow.toLowerCase().includes('email')) {
    console.log(`   ✓ Header row detected`);
    const headers = rows.shift().split(',').map(h => h.toLowerCase().trim());
    const emailIdx = headers.indexOf('email');

    return rows
      .filter(row => row.trim())
      .map(row => {
        const values = row.split(',');
        return {
          email: values[emailIdx]?.toLowerCase().trim(),
          name: ''
        };
      })
      .filter(c => c.email);
  } else {
    console.log(`   ℹ Plain email list format`);
    return rows
      .filter(row => row.includes('@'))
      .map(row => ({
        email: row.trim().toLowerCase(),
        name: ''
      }));
  }
}

const parsed = parseCSV(csvData);
console.log(`\n✅ Parsing complete`);
console.log(`   Total contacts parsed: ${parsed.length}`);
console.log(`   First contact: ${parsed[0]?.email}`);
console.log(`   Last contact: ${parsed[parsed.length - 1]?.email}`);

// Validate emails
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const valid = parsed.filter(c => EMAIL_REGEX.test(c.email));
const invalid = parsed.filter(c => !EMAIL_REGEX.test(c.email));

console.log(`\n📧 Email Validation`);
console.log(`   Valid: ${valid.length}`);
console.log(`   Invalid: ${invalid.length}`);

if (invalid.length > 0) {
  console.log(`   Sample invalid:`, invalid.slice(0, 3).map(c => c.email));
}

console.log(`\n✨ Ready to import ${valid.length} contacts`);
