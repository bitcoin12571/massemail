import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

const batch5 = [
  'office@nippon-teh.com','nix-pro@gmail.com','info@pacnet.md','pvp@nor.md','sales@omnicom.md','oxiprint@mail.ru','ppinform@gmail.com','palexf@mail.md','pavel_lupu@hotmail.com','nexus.md@gmail.com','office@printec.md','info@printer.md','prodic_grup@mcc.md','sales@pro-megacom.com','radu@molddata.md','rasmat@mtc.md','refit@mail.md','sales@remarketing.md','renmaxcom@rambler.ru','neon-key@yandex.ru','sales@riscom.com','sancros_service@mail.ru','scortel@list.ru','office@selen.md','sigma@sigma.srl.md','office@solproacces.com','info@redpoint.md','sonet-srl@mail.ru','valera_bogaci@stronghold.md','sales@hardware.md','tameldin@mail.ru','tdn@company.md','tehnoart@list.ru','tehnosfera@inbox.ru','sales@dmi.md','tonatis@mail.ru','office@totalsystem.md','info@triatis.md','venetasystem@mail.md','venomnet@rossoft.md','alex@valex.md','vota@vota.md','office@xan.md','info@xeroton.com','valex@valex.md','dontehp@rambler.ru','info@bomba.md','emit@mtc.md','office@camelia.md','tebas_v@mail.ru','office@tina.md','uei_md@moldnet.md','cararus@gmail.com','info@bosch-moldova.md','contact@classicsound.com.md','decostar@dnt.md','office@pioneer.md','magnat64@mail.ru','sale@top-copy.com','iurgateh@mtc.md','a.vrabii@yahoo.com','info@nexotehnic.com','pro_arta@moldovacc.md','jplus@mail.ru','belar@idknet.com','alchimia-cosmetic@rambler.ru','malaian@mail.ru','sales@bioglobal.md','brionia@mdl.net','igori@mtc.md','info@lilcora.md','visaje-nica@mail.ru','office@azmol.org','office@glavirux.com','office@diva.md','deamarim@moldovacc.md','gigimoldova@gigicosmetic.md','polin-st@hotmail.com','lambre@mail.md','gefandor@mail.ru','zolusca@yandex.ru','oficiu@le-bridge.com','leorex@mail.md','loial@starnet.md','mag@mdl.net','sahakyan@company.md','sanflorin1950@mail.ru','info@moldova-nsp.com','info@neptun-extra.com','caprizparfum@company.md','ovico@ovico.md','palinur@mtc.md','office@selective.md','proartsite@starnet.md','office@reputatia.md','rodica.contu@gmail.ru','rofilena@mail.ru','sanaveles@list.ru','oltkac@mail.ru','solara_sv@mail.ru','taragotsrl@gmail.com'
];

const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function importBatch() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conectat la BD');

    let success = 0, skip = 0;

    for (const email of batch5) {
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
          tags: ['imported', 'batch5']
        });
        success++;
        console.log(`✓ ${email}`);
      } catch (e) {
        console.error(`✗ ${email}: ${e.message}`);
      }
    }

    console.log(`\n✅ Batch 5: ${success} adăugate, ${skip} deja existente`);
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await sequelize.close();
  }
}

importBatch();
