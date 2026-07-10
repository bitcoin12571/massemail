import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

const batch4 = [
  'aldea@mtc.md','aprochimie411@hotmail.com','office@aquasystems.md','office@ataigroup.com','office@boncom.md','policontract@mail.ru','polivalent95@starnet.md','redox_group@yahoo.com','office@dacspectromed.com','info@ecochimie.md','esc-pur@yahoo.com','fanig-chim12@yandex.ru','hmy_2004@mail.ru','italteh@gmail.com','ivafarm1@rambler.ru','lizarin@narod.ru','office@lokmera.com.md','mastecogrup@hotbox.ru','mic-tan@rambler.ru','office@nitech.md','oxana_m@company.md','office@redox.md','croitor@yahoo.com','antaris@mtc.md','daxencom@gmail.com','jaguinamd@yahoo.com','igienagrup@igiena.md','mavmol@list.ru','pojtehnika@mail.ru','salopeta@mail.ru','sloimpex@prevent.md','stincom@hotbox.ru','tingrimar@inbox.ru','transenergogrup@mail.md','ursu@mtc.md','firetecht@mail.ru','celeritas@mail.ru','echiprot@mail.ru','main@accent.md','electromic@electromic.md','alha_master@mail.ru','kml@meganet.md','alexfidonet@mail.ru','office@andomax.md','info@xerox.md','office@belmond.md','office@cub.md','office@alta-vista.md','info@axio-teh.com','ciberex@ciberex.com.md','info@mymedia.md','bolotnovgroup@mail.ru','cactuscom.srl@gmail.com','ibogaci@mail.md','info@digicom.md','enispar@inbox.ru','mail@filipp.md','disicom@mail.ru','inform@compac-info.com','kompas@kompas.md','computermarket@mdl.net','sales@status.md','sales@conectic.md','mail@cosmo.md','info@creit.md','info@ddcomputer.md','info@daac-system.md','fulgusor@mcc.md','sales@neuron.md','info@gheosoft.com','info@comptehno.com','globals@mdl.net','gordasservice@yahoo.com','admin@speedhelp.net','office@ics.md','infosofteh@infosofteh.md','inprint@list.ru','admin@eshop.md','garant@mcc.md','info@general-tehno.md','ippon@ippon.md','it@mcc.md','moldova@microsoft.com','hard@lantaur.com','sales@linesistem.com','liurandd@mail.ru','info@logitera.md','info@lovacom.md','maxada@mail.ru','price@maxcom.md','mcs@mcs.md','mgbs_computers@yahoo.com','info@toner.md','gimnic@mail.ru','info@kyoceramita.md','sales@neocomputer.md','matrix@matrix.md','sales@logic.md','info@dragonpc.org','kmm@kvazar-micro.md'
];

const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function importBatch() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conectat la BD');

    let success = 0, skip = 0;

    for (const email of batch4) {
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
          tags: ['imported', 'batch4']
        });
        success++;
        console.log(`✓ ${email}`);
      } catch (e) {
        console.error(`✗ ${email}: ${e.message}`);
      }
    }

    console.log(`\n✅ Batch 4: ${success} adăugate, ${skip} deja existente`);
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await sequelize.close();
  }
}

importBatch();
