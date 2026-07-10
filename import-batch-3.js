import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

const batch3 = [
  'es@es.mldnet.com','electrotehnocom@mtc.md','elimport@mcc.md','elefect@mail.ru','energutilaj@mail.md','epidavr@mail.ru','esson@esson.md','iluminat@mtc.md','indtehelectro@mail.md','info@italtrade.md','lachiaparat@yahoo.com','leia_srl@mail.ru','office@licuri.md','locus@mdl.net','electric@mdl.net','ion_gangan@mail.ru','lumgrupmas@rambler.ru','lumilux@mtc.md','lustralis@xan.md','casapractica@gmail.com','moldcab@mail.ru','elina-md@mail.ru','radion@mcc.md','sibix1@mail.ru','snehamold@land.ru','pendus_com@mcc.md','vinhils@mail.ru','tecapro@mcc.md','tehel@mail.md','office@tehelectro-sv.com','jumbo@toc.starnet.md','vagifcom@mail.ru','valchiria@mail.ru','aerotehnic@tmg.md','info@termoteh.md','alpex@seminee.md','antoval@list.ru','info@anturaj.md','atimgaz@gmail.com','xenon@mail.md','r.banaru@agd.md','belvilcom@list.ru','climatsistem@yahoo.com','teploimport@starnet.md','conductgaz-apa@mail.md','contatori@mail.ru','dakon@mtc.md','darenergo@mail.ru','peikis@mail.ru','info@diferens.md','cap-cap@mail.ru','office@ecosanteh.md','elisio@mdl.net','info@elpo.md','horus@euroterm.md','expoterm@mail.ru','lzlotea@fontegrup.md','ghelas@mail.ru','scicati@mail.ru','harius.com@rambler.ru','heliostal@mail.md','info@hydrosystems.md','info@sahara.md','ofice@praga.md','office@breeze.md','ioncomanac@yahoo.it','oclipa@mtc.md','oiltech@starnet.md','orion-gs@starnet.md','info@ormotex.md','paletcom@mail.ru','piroterm@mail.md','politermogroup@yahoo.com','posterus@list.ru','lidercom@mail.md','logimax@list.ru','info@liniah2o.md','servindcon@yahoo.com','sicopas@arax.md','leraigrup@yandex.ru','info@rgg.md','office@romstal.md','sistemebasa@mail.md','info@santarm.md','info@technotest.md','militant@mail.md','info@tehnotitan.md','terentievigor@yandex.ru','termoclima@mtc.md','termoechipament@yahoo.com','termogazservice@yahoo.com','olga_krystya@mail.ru','termostal@termostal.md','ventsistem@company.md','zadesenetsg@yahoo.com','tresmusgrup@yahoo.com','trioterm@mail.md'
];

const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function importBatch() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conectat la BD');

    let success = 0, skip = 0;

    for (const email of batch3) {
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
          tags: ['imported', 'batch3']
        });
        success++;
        console.log(`✓ ${email}`);
      } catch (e) {
        console.error(`✗ ${email}: ${e.message}`);
      }
    }

    console.log(`\n✅ Batch 3: ${success} adăugate, ${skip} deja existente`);
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await sequelize.close();
  }
}

importBatch();
