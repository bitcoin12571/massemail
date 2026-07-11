function splitRow(row) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function parseCSV(csvData) {
  if (typeof csvData !== 'string' || !csvData.trim()) return [];

  const rows = csvData.trim().split(/\r?\n/).filter(Boolean);
  console.log(`Total rows: ${rows.length}`);
  console.log(`First row: "${rows[0]}"`);
  console.log(`Second row: "${rows[1]}"`);

  const headers = splitRow(rows.shift()).map((header) => header.toLowerCase());
  console.log(`Headers after splitRow: [${headers.join(', ')}]`);

  const indexOf = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const emailIndex = indexOf('email', 'email address');
  console.log(`Email column index: ${emailIndex}`);

  if (emailIndex === -1) throw new Error('CSV must contain an email column');

  const result = rows.map(splitRow).filter((values) => values[emailIndex]).map((values) => ({
    email: values[emailIndex].toLowerCase(),
    name: '',
    tags: [],
    customData: { company: '' }
  }));

  console.log(`Parsed ${result.length} contacts`);
  console.log(`First parsed: ${result[0]?.email}`);
  console.log(`Last parsed: ${result[result.length - 1]?.email}`);

  return result;
}

// Test with actual data
import fs from 'fs';
const csvData = fs.readFileSync('C:\\email-dashboard\\bulk-emails.csv', 'utf-8');
console.log(`File size: ${csvData.length} bytes\n`);

try {
  const parsed = parseCSV(csvData);
  console.log(`\n✅ SUCCESS: Parsed ${parsed.length} emails`);
} catch (error) {
  console.error(`\n❌ ERROR: ${error.message}`);
}
