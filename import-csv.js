import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';
import logger from './backend/src/services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function importCSV(csvFilePath) {
  const results = [];
  const errors = [];

  return new Promise((resolve, reject) => {
    // Verifică dacă fișierul există
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ Fișierul ${csvFilePath} nu a fost găsit!`);
      reject(new Error(`Fișier nu găsit: ${csvFilePath}`));
      return;
    }

    console.log(`📂 Se citește fișierul: ${csvFilePath}`);

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Normalizează datele din CSV
        if (row.email) {
          results.push({
            email: row.email.trim().toLowerCase(),
            name: row.name ? row.name.trim() : null,
            region: row.region ? row.region.trim() : null,
            tags: row.tags ? row.tags.split(',').map(t => t.trim()) : ['imported', 'csv']
          });
        }
      })
      .on('end', async () => {
        console.log(`\n✓ CSV citit: ${results.length} emailuri găsite\n`);

        try {
          // Conectează la baza de date
          await sequelize.authenticate();
          console.log('✓ Conectat cu succes la baza de date');

          // Sincronizează modelele
          await sequelize.sync({ alter: false });
          console.log('✓ Modelele sunt sincronizate\n');

          // Importă emailurile
          let successCount = 0;
          let skipCount = 0;

          for (let i = 0; i < results.length; i++) {
            const emailData = results[i];
            try {
              // Verifică dacă emailul deja există
              const existing = await Contact.findOne({
                where: { email: emailData.email }
              });

              if (existing) {
                skipCount++;
                console.log(`  ⊘ ${emailData.email} - deja există`);
                continue;
              }

              // Creează contactul nou
              await Contact.create({
                email: emailData.email,
                name: emailData.name,
                status: 'active',
                verified: false,
                createdBy: DEFAULT_USER_ID,
                tags: emailData.tags || ['imported', 'csv'],
                customData: {
                  region: emailData.region,
                  importedAt: new Date().toISOString(),
                  source: 'csv-import',
                  csvRow: i + 2 // +2 pentru header + indexare de la 1
                }
              });

              successCount++;
              console.log(`  ✓ ${emailData.email} - importat cu succes`);

              if ((successCount + skipCount) % 50 === 0) {
                console.log(`\n  ⧖ ${successCount + skipCount}/${results.length} procesate...\n`);
              }
            } catch (error) {
              errors.push({ email: emailData.email, error: error.message });
              console.error(`  ✗ Eroare la ${emailData.email}: ${error.message}`);
            }
          }

          // Raport final
          console.log('\n' + '='.repeat(60));
          console.log('📊 RAPORT DE IMPORT CSV:');
          console.log('='.repeat(60));
          console.log(`  ✓ Contacte adăugate cu succes: ${successCount}`);
          console.log(`  ⊘ Contacte deja existente: ${skipCount}`);
          console.log(`  ✗ Erori: ${errors.length}`);
          console.log(`  📈 Total procesat: ${successCount + skipCount}/${results.length}`);
          console.log('='.repeat(60));

          if (errors.length > 0 && errors.length <= 20) {
            console.log('\n❌ Emailurile cu erori:');
            errors.forEach(({ email, error }) => {
              console.log(`  - ${email}: ${error}`);
            });
          } else if (errors.length > 20) {
            console.log(`\n❌ ${errors.length} emailuri au avut erori (primele 20 listate mai sus)`);
          }

          console.log('\n✅ Import finalizat cu succes!\n');
          resolve({ successCount, skipCount, errors });
        } catch (error) {
          console.error('❌ Eroare critică:', error);
          errors.push({ email: 'CRITICAL', error: error.message });
          reject(error);
        } finally {
          await sequelize.close();
        }
      })
      .on('error', (error) => {
        console.error('❌ Eroare la citirea CSV:', error);
        reject(error);
      });
  });
}

// Detectează calea CSV din argumente sau folosește default
const csvPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'test-emails.csv');

console.log('🚀 Inițiază import CSV pentru email-dashboard\n');
console.log(`📁 Cale CSV: ${csvPath}\n`);

importCSV(csvPath)
  .then((result) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import eșuat:', error);
    process.exit(1);
  });
