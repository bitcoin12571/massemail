import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, 'bulk-emails.csv');

async function importEmails() {
  try {
    // Ensure database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Read CSV
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const rows = csvData.trim().split('\n').filter(Boolean);
    rows.shift(); // Skip header

    const contacts = rows
      .filter(row => row.includes('@'))
      .map((email, idx) => ({
        email: email.trim().toLowerCase(),
        name: '',
        status: 'active',
        verified: false,
        createdBy: '550e8400-e29b-41d4-a716-446655440000' // Bulk import user
      }));

    console.log(`📧 Importing ${contacts.length} emails...`);

    // Bulk create with chunks to avoid memory issues
    const chunkSize = 500;
    let totalCreated = 0;

    for (let i = 0; i < contacts.length; i += chunkSize) {
      const chunk = contacts.slice(i, i + chunkSize);
      const result = await Contact.bulkCreate(chunk, { ignoreDuplicates: true });
      totalCreated += result.length;
      console.log(`   ✓ Created ${result.length}/${chunk.length} (Total: ${totalCreated}/${contacts.length})`);
    }

    // Verify final count
    const finalCount = await Contact.count({
      where: { createdBy: '550e8400-e29b-41d4-a716-446655440000' }
    });

    console.log(`\n✨ Import complete!`);
    console.log(`   Total in database: ${finalCount}`);
    console.log(`   Imported this run: ${totalCreated}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importEmails();
