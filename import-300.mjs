import fs from 'fs';

const csvData = fs.readFileSync('bulk-emails.csv', 'utf-8');
const payload = JSON.stringify({ csvData });

console.log('📧 Importing 300 emails...');
console.log(`Payload size: ${payload.length} bytes`);

fetch('https://email-dashboard-nine-brown.vercel.app/api/contacts/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: payload
})
.then(res => {
  console.log(`Status: ${res.status}`);
  return res.json();
})
.then(data => {
  console.log('✅ Response:', JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('❌ Error:', err.message);
});
