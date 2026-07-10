import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

const batch2 = [
  'arbitraj@newmail.ru','aramai@mail.ru','ar.electro@mail.ru','aqua-life@mail.ru','apsservice@araxinfo.com','apsa@list.ru','apion_td@mail.md','apartments-lux@bk.ru','apalade@proconsulting.biz','anticamera@posta.md','antenna@antenna.md','antel2002@mail.ru','anpas@mail.md','anovix_gr@mail.ru','anna@myasiaclub.com','angemar@aruba.it','angelacreanga@inverland.info','angela.brasoveanu@gmail.com','ang_dum@mtc.md','anfilada@list.ru','anesto@mtc.md','andrey@zernoff.md','ancomtur@mcc.md','anatolie.pentelei@ipb.md','anamaxer@meganet.md','ampbroker@mail.md','ammo@ammo.md','amber-term@mail.ru','amadeus@svadiba.md','alpaca@moldova.md','almos-com@mail.md','allesanro@gmail.com','all@snt.md','alina_jurnal@yahoo.com','alianta_vin@rambler.ru','ali-mat@yandex.ru','alhazov@mail.md','alfa-spirit@mail.ru','alexstenata@mail.ru','alexpx5@mail.ru','alexcoscodan@yahoo.com','alexandru.buga@b-m.ro','alexandraum@mail.ru','alex@doxyterra.com','alex@powerteam.md','albiprim@gmail.com','akm-m@bk.ru','airport@logistics.md','aib@maib.md','agroteh@moldagrotehnica.md','agrofermotech@mdl.net','agregat@mail.ru','aghis-nistru@yandex.ru','ageoptic@moldovacc.md','agency@airservice.md','aerotour@transaero.md','aeroport@transaero.md','aegisgrupsrl@gmail.com','adrian.hancu@mobiasbanca.md','administrator@voiaj.md','administration@cca.globnet.md','admin_inteh@mail.ru','admin@ravenol.md','admin@artdecorgr.com','admin@sec.md','adidasmd@mail.ru','activis2002@mail.ru','actavis@mtc.md','accesoriitexim@gmail.com','accept-insurance@mail.ru','accenttehno@accent.md','ac@geotermal-av.com','a.melehova@patria.md','a.korsak@mitsubishi-motors.md','a.g.p.dancegroupnewera@gmail.com','a_tripac@yahoo.com','a_p_arhigraf@yahoo.com','555333@mail.ru','1c@meta.md','info@sellall.md','arcada_lv@mail.md','angela_danilescu@yahoo.com','andrey@profile.md','andreimaraculin@rambler.ru','andreimadan@yahoo.com','andrei.caciurenco@aci.md','anatas22@mail.ru','alviagrup@suvenir.md','altamira.com@mail.ru','alpinasud@gmail.com','aliona25zap@yahoo.com','alexandru81n@yahoo.com','chisinau@casaeficienta.ro','office@autojurnal.md','office@agat-d.md','logistic@aqa.md','salon@cabinet.md','info@axor.md','info@felicia.md','office@sebastian.md','logigrup@mdl.net','info@solaraterm.com','office@amta-tis.company.md','info@andiol.md','office@fitofilter.com'
];

const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function importBatch() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conectat la BD');

    let success = 0, skip = 0;

    for (const email of batch2) {
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
          tags: ['imported', 'batch2']
        });
        success++;
        console.log(`✓ ${email}`);
      } catch (e) {
        console.error(`✗ ${email}: ${e.message}`);
      }
    }

    console.log(`\n✅ Batch 2: ${success} adăugate, ${skip} deja existente`);
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await sequelize.close();
  }
}

importBatch();
