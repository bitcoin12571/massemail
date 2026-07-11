import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

async function migrate() {
  try {
    console.log('🔧 Sincronizez tabele pe Neon PostgreSQL...\n');

    await sequelize.authenticate();
    console.log('✓ Conectat la Neon\n');

    // Sync all models with force:true pentru a crea tabelele fresh
    await sequelize.sync({ force: false, alter: true });
    console.log('✓ Tabele sincronizate cu succes!\n');

    // Verific dacă tabela Contact a fost creată
    const count = await Contact.count();
    console.log(`📊 Tabel Contact: ${count} rânduri\n`);

    console.log('✅ Migrație completă! Acum poți importa emailuri.');

  } catch (error) {
    console.error('❌ Eroare la migrație:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
