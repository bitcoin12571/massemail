import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';
import logger from './backend/src/services/logger.js';

// Lista de emailuri de importat
const emails = [
  'agroinform@agroinform.md',
  'aamv@aamv.gov.md',
  'haiduc2000@mail.ru',
  'libitum@mail.ru',
  'info@panonia.md',
  'nova105.9@radio.fm',
  'adis.tur@gmail.com',
  'ajur-print@mail.md',
  'office@acasamedica.md',
  'iuriisold@mcc.md',
  'acvaproiect@acva.md',
  'office@acordgrup.md',
  'info@acorex.net',
  'plotter2000@rambler.ru',
  'office@axamc.com',
  'wilo_pump@yahoo.com',
  'dtintiuc@usmf.md',
  'dica2000@gmail.com',
  'accept_96@mail.ru',
  'office@accept.md',
  'office@kia.md',
  'aladana@mail.ru',
  'aldemir@mtc.md',
  'aldimax_design@mail.ru',
  'aleco@starnet.md',
  'achelaru@mail.md',
  'alexa-service62@mail.ru',
  'info@alexgrup.md',
  'alexiafitness@yahoo.com',
  'familydent@list.ru',
  'alesprim@gmail.com',
  'alinax@mail.md',
  'alir_comert@mcc.md',
  'alitex@mail.ru',
  'alconsist1@mail.ru',
  'info@sec.md',
  'allertco@hotmail.ru',
  'info@luckylife.md',
  'almaval-exim@list.ru',
  'val_tk@yahoo.com',
  'ligorica@yahoo.com',
  'almor-plus@meganet.md',
  'almos-com@mail.ru',
  'alpimarin@gmail.com',
  'sakurapromo@gmail.com',
  'itis.moldova@gmail.com',
  'svetlana@shmigaliova.com',
  'office@egc.md',
  'birlic95@yandex.ru',
  'bierplatz@mail.ru',
  'beruf-auto@rambler.ru',
  'beruf-auto@yandex.ru',
  'bertontrans@bertontrans.com',
  'berlizzo@molddata.md',
  'berlin_chemie@mdl.net',
  'berhord-oleg@mail.ru',
  'benefis@mail.ru',
  'bem@bem.md',
  'bastermedia@rambler.ru',
  'balto-com@hotbox.ru',
  'balcantir@mtc.md',
  'babochka@mtc.md',
  'ba@mtc-bl.md',
  'b_farm@mail.ru',
  'avtoscan@gmail.com',
  'avinova.co@gmail.com',
  'avia@corina-travel.com',
  'avantajav@mail.ru',
  'avalux-grup@mail.ru',
  'autosella@mail.ru',
  'autoplus@mtc.md',
  'automecanica@arax.md',
  'autoglass@mail.md',
  'autobatprim@mtc.md',
  'aurora.furtuna@daac-system.md',
  'aura-show@mail.md',
  'audit_exact@yahoo.com',
  'audioline@mcc.md',
  'atola.md@mail.ru',
  'atola@kkm.md',
  'atico-plus@mail.ru',
  'atcsindtur@yandex.ru',
  'astrovaz@mail.ru',
  'astada@uni.md',
  'assa@molddata.md',
  'aspinv@mdl.net',
  'asito@asito.md',
  'asigurari@artas.md',
  'asidec@mail.ru',
  'ashagin@mail.ru',
  'artvega@mtc.md',
  'artmobila@artmobila.md',
  'art_vest@mdl.net',
  'armprof@company.md',
  'aridon@aridon.mldnet.com',
  'aridon@aridon.md',
  'arhistrat_deco@yahoo.com',
  'arhimax@yandex.ru',
  'arhdecon-prim@mail.ru',
  'aremax@mail.ru',
  'aregard@inbox.ru',
  'arboris@meganet.md',
  'arbitraj@newmail.ru',
  'aramai@mail.ru',
  'ar.electro@mail.ru',
  'aqua-life@mail.ru',
  'apsservice@araxinfo.com',
  'apsa@list.ru',
  'apion_td@mail.md',
  'apartments-lux@bk.ru',
  'apalade@proconsulting.biz',
  'anticamera@posta.md',
  'antenna@antenna.md',
  'antel2002@mail.ru',
  'anpas@mail.md',
  'anovix_gr@mail.ru',
  'anna@myasiaclub.com',
  'angemar@aruba.it',
  'angelacreanga@inverland.info',
  'angela.brasoveanu@gmail.com',
  'ang_dum@mtc.md',
  'anfilada@list.ru',
  'anesto@mtc.md',
  'andrey@zernoff.md',
  'ancomtur@mcc.md',
  'anatolie.pentelei@ipb.md',
  'anamaxer@meganet.md',
  'ampbroker@mail.md',
  'ammo@ammo.md',
  'amber-term@mail.ru',
  'amadeus@svadiba.md',
  // ... (continuă cu restul emailurilor din listă)
];

const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000'; // UUID placeholder pentru import în masă

async function importEmails() {
  try {
    // Conectează la baza de date
    await sequelize.authenticate();
    console.log('✓ Conectat cu succes la baza de date');

    // Sincronizează modelele
    await sequelize.sync({ alter: false });
    console.log('✓ Modelele sunt sincronizate');

    // Importă emailurile
    let successCount = 0;
    let skipCount = 0;
    const errors = [];

    for (const email of emails) {
      try {
        // Verifică dacă emailul deja există
        const existing = await Contact.findOne({ where: { email } });
        if (existing) {
          skipCount++;
          continue;
        }

        // Creează contactul nou
        await Contact.create({
          email,
          status: 'active',
          verified: false,
          createdBy: DEFAULT_USER_ID,
          tags: ['imported', 'bulk'],
          customData: {
            importedAt: new Date().toISOString(),
            source: 'bulk-import'
          }
        });

        successCount++;
        if (successCount % 100 === 0) {
          console.log(`  ⧖ ${successCount} emailuri importate...`);
        }
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          skipCount++;
        } else {
          errors.push({ email, error: error.message });
          console.error(`  ✗ Eroare la importul ${email}: ${error.message}`);
        }
      }
    }

    console.log('\n📊 RAPORT DE IMPORT:');
    console.log(`  ✓ Contacte adăugate cu succes: ${successCount}`);
    console.log(`  ⊘ Contacte deja existente: ${skipCount}`);
    console.log(`  ✗ Erori: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Emailurile cu erori:');
      errors.forEach(({ email, error }) => {
        console.log(`  - ${email}: ${error}`);
      });
    }

    console.log('\n✓ Import finalizat!');
  } catch (error) {
    console.error('❌ Eroare critică:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Rulează importul
importEmails();
