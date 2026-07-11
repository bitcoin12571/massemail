import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const CSV_FILE = '/c/email-dashboard/bulk-emails.csv';
const API_URL = 'http://localhost:3000/api/contacts/import';

async function importEmails() {
  try {
    // Read CSV file
    const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');

    console.log('📖 Reading CSV file...');
    console.log(`Total lines: ${csvContent.split('\n').length - 1}`); // -1 for header

    // Send to API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ csvData: csvContent })
    });

    const result = await response.json();
    console.log('✅ Import result:', result);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

importEmails();
