import fs from 'fs';

const csvData = fs.readFileSync('C:\\email-dashboard\\bulk-emails.csv', 'utf-8');

console.log(`File size: ${csvData.length} bytes`);
console.log(`File content type: ${typeof csvData}`);

// Frontend logic from ContactsManager.jsx
const lines = csvData.split(/\r?\n/).filter(line => line.trim());

console.log(`\nAfter split and trim: ${lines.length} lines`);
console.log(`First line: "${lines[0]}"`);
console.log(`Second line: "${lines[1]}"`);

const firstLine = lines[0];
console.log(`\nFirst line includes 'email': ${firstLine.toLowerCase().includes('email')}`);

if (firstLine.toLowerCase().includes('email') || firstLine.toLowerCase().includes('mail')) {
  console.log(`\n📝 Path: CSV with headers`);
  const headers = lines.shift()?.split(',').map(value => value.trim().toLowerCase()) || [];
  console.log(`Headers: [${headers.join(', ')}]`);
  const emailIndex = headers.indexOf('email');
  console.log(`Email column index: ${emailIndex}`);

  const importedContacts = lines.map(line => {
    const values = line.split(',').map(value => value.trim());
    return {
      email: values[emailIndex],
      name: ''
    };
  }).filter(contact => contact.email);

  console.log(`\nImported contacts: ${importedContacts.length}`);
  if (importedContacts.length > 0) {
    console.log(`First: ${importedContacts[0].email}`);
    console.log(`Last: ${importedContacts[importedContacts.length - 1].email}`);
    console.log(`\n✅ Frontend parsing would SUCCEED`);
  }
} else {
  console.log(`❌ Would go to plain email list path`);
}
