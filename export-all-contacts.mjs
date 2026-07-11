import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

async function exportContacts() {
  try {
    await sequelize.authenticate();
    console.log('✓ Connected to Neon\n');

    // Get ALL contacts
    const contacts = await Contact.findAll({
      where: { createdBy: '550e8400-e29b-41d4-a716-446655440000' },
      raw: true,
      order: [['email', 'ASC']]
    });

    console.log(`Found ${contacts.length} contacts\n`);
    console.log('email');
    
    contacts.forEach(c => {
      console.log(c.email);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

exportContacts();
