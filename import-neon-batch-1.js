import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

const batch1 = [
  'agroinform@agroinform.md','aamv@aamv.gov.md','haiduc2000@mail.ru','libitum@mail.ru','info@panonia.md','nova105.9@radio.fm','adis.tur@gmail.com','ajur-print@mail.md','office@acasamedica.md','iuriisold@mcc.md','acvaproiect@acva.md','office@acordgrup.md','info@acorex.net','plotter2000@rambler.ru','office@axamc.com','wilo_pump@yahoo.com','dtintiuc@usmf.md','dica2000@gmail.com','accept_96@mail.ru','office@accept.md','office@kia.md','aladana@mail.ru','aldemir@mtc.md','aldimax_design@mail.ru','aleco@starnet.md','achelaru@mail.md','alexa-service62@mail.ru','info@alexgrup.md','alexiafitness@yahoo.com','familydent@list.ru','alesprim@gmail.com','alinax@mail.md','alir_comert@mcc.md','alitex@mail.ru','alconsist1@mail.ru','info@sec.md','allertco@hotmail.ru','info@luckylife.md','almaval-exim@list.ru','val_tk@yahoo.com','ligorica@yahoo.com','almor-plus@meganet.md','almos-com@mail.ru','alpimarin@gmail.com','sakurapromo@gmail.com','itis.moldova@gmail.com','svetlana@shmigaliova.com','office@egc.md','birlic95@yandex.ru','bierplatz@mail.ru','beruf-auto@rambler.ru','beruf-auto@yandex.ru','bertontrans@bertontrans.com','berlizzo@molddata.md','berlin_chemie@mdl.net','berhord-oleg@mail.ru','benefis@mail.ru','bem@bem.md','bastermedia@rambler.ru','balto-com@hotbox.ru','balcantir@mtc.md','babochka@mtc.md','ba@mtc-bl.md','b_farm@mail.ru','avtoscan@gmail.com','avinova.co@gmail.com','avia@corina-travel.com','avantajav@mail.ru','avalux-grup@mail.ru','autosella@mail.ru','autoplus@mtc.md','automecanica@arax.md','autoglass@mail.md','autobatprim@mtc.md','aurora.furtuna@daac-system.md','aura-show@mail.md','audit_exact@yahoo.com','audioline@mcc.md','atola.md@mail.ru','atola@kkm.md','atico-plus@mail.ru','atcsindtur@yandex.ru','astrovaz@mail.ru','astada@uni.md','assa@molddata.md','aspinv@mdl.net','asito@asito.md','asigurari@artas.md','asidec@mail.ru','ashagin@mail.ru','artvega@mtc.md','artmobila@artmobila.md','art_vest@mdl.net','armprof@company.md','aridon@aridon.mldnet.com','aridon@aridon.md','arhistrat_deco@yahoo.com','arhimax@yandex.ru','arhdecon-prim@mail.ru','aremax@mail.ru','aregard@inbox.ru','arboris@meganet.md'
];

const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function importBatch() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conectat la Neon\n');

    let success = 0, skip = 0;

    for (const email of batch1) {
      try {
        const existing = await Contact.findOne({ where: { email: email.toLowerCase() } });
        if (existing) {
          skip++;
          continue;
        }

        await Contact.create({
          email: email.toLowerCase(),
          status: 'active',
          verified: false,
          createdBy: DEFAULT_USER_ID,
          tags: ['imported', 'batch1']
        });
        success++;
        console.log(`✓ ${email}`);
      } catch (e) {
        console.error(`✗ ${email}: ${e.message}`);
      }
    }

    console.log(`\n✅ Batch 1: ${success} adăugate, ${skip} deja existente`);
  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await sequelize.close();
  }
}

importBatch();
