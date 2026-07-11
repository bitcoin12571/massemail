import fs from 'fs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return EMAIL_REGEX.test(trimmed) && trimmed.length <= 254;
}

const csvData = fs.readFileSync('C:\\email-dashboard\\bulk-emails.csv', 'utf-8');
const lines = csvData.trim().split(/\r?\n/).filter(Boolean);

// Skip header
lines.shift();

console.log(`Total lines: ${lines.length}`);

let validCount = 0;
let invalidCount = 0;
const invalidEmails = [];

for (const line of lines) {
  const email = line.trim().toLowerCase();
  if (isValidEmail(email)) {
    validCount++;
  } else {
    invalidCount++;
    if (invalidEmails.length < 10) {
      invalidEmails.push(email);
    }
  }
}

console.log(`Valid: ${validCount}`);
console.log(`Invalid: ${invalidCount}`);

if (invalidEmails.length > 0) {
  console.log(`\nSample invalid emails:`);
  invalidEmails.forEach(e => console.log(`  - "${e}"`));
}
