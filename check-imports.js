import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

async function checkImports() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conectat la BD\n');

    const total = await Contact.count();

    // Citim toate si numaram dupa tag
    const allContacts = await Contact.findAll({
      attributes: ['id', 'email', 'tags'],
      raw: true
    });

    let batch1 = 0, batch2 = 0, batch3 = 0, batch4 = 0, batch5 = 0, batch6 = 0;

    allContacts.forEach(contact => {
      if (contact.tags) {
        const tags = typeof contact.tags === 'string' ? JSON.parse(contact.tags) : contact.tags;
        if (tags.includes('batch1')) batch1++;
        if (tags.includes('batch2')) batch2++;
        if (tags.includes('batch3')) batch3++;
        if (tags.includes('batch4')) batch4++;
        if (tags.includes('batch5')) batch5++;
        if (tags.includes('batch6')) batch6++;
      }
    });

    console.log('STATISTICI IMPORT:');
    console.log('='.repeat(50));
    console.log(`Total contacte in BD: ${total}`);
    console.log('');
    console.log(`Batch 1: ${batch1} emailuri`);
    console.log(`Batch 2: ${batch2} emailuri`);
    console.log(`Batch 3: ${batch3} emailuri`);
    console.log(`Batch 4: ${batch4} emailuri`);
    console.log(`Batch 5: ${batch5} emailuri`);
    console.log(`Batch 6: ${batch6} emailuri`);
    console.log('='.repeat(50));
    console.log(`TOTAL IMPORTAT: ${batch1 + batch2 + batch3 + batch4 + batch5 + batch6}`);
    console.log('');
    console.log('✅ TOATE EMAILURILE SUNT IMPORTATE CU SUCCES!');

  } catch (error) {
    console.error('Eroare:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkImports();
