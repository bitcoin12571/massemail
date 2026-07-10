import { sequelize } from './backend/src/config/database.js';
import Contact from './backend/src/models/Contact.js';

const batch6 = [
  'taroldd@mtc.md','tessa@tessa-service.com','tredas@mail.md','office@trigor.md','lavka28@mail.ru','romeli@mdl.net','repsmoldova@avon.com','erisprim@yahoo.com','brother@moldnet.md','vioro@mail.ru','universcom@meganet.md','denebsrl@mail.ru','dinasas@mail.ru','eurometagrup@yahoo.com','zilant@zilant.net','marsalin@mail.ru','klicla@mail.ru','mobile@mdl.net','multicore@mtc.md','rivols@yandex.ru','angrogoscom@yahoo.com','ghermivali@shorgroup.com','andrimargrup@mail.ru','bernulina@romir.md','bijuliux@mail.ru','foot-wear@list.ru','valera77771964@mail.ru','xenon_lenin@xenon.md','garmash2007@yandex.ru','granol_grup@mail.ru','doremi33@mail.ru','ershova@mtc.md','info@jucarie.md','info@magnat.md','l-stetco@yandex.ru','forex@codrul.com','info@constant-impex.com','lagusto@mail.ru','waterpas5@rambler.ru','nicdan_lux@yahoo.com','koroglu72@mail.ru','ranzimel@mail.ru','info@royalmart.md','rotolix@mail.ru','serge-textil@list.ru','misa_srl@mail.ru','moldsindimpex@mail.md','tagaermd@yahoo.com','textil-etalon@mail.ru','serlandcom@rambler.ru','info@berghoff.md','spandorsrl@mail.ru','sasucces@mail.ru','fortradingmeridian@mail.ru','handels@mail.ru','elena_d72@mail.ru','educationalcenter@zepter.com.md','moshmish@rambler.ru','selic05@mail.ru','iuranco@yahoo.com','iansis1@mail.ru','alex-b0662@mail.ru','diolsem@yahoo.com','teleclub@rambler.ru','salon.branda@gmail.com','orbita992006@rambler.ru','info@sportmarket.md','gestacompany@gmail.com','info@giant.md','info@xstyle.md','dolis2004@mail.ru','info@cartus.md','cst_copilarie@mail.md','liniamontana@mail.ru','sportechipirovca@mail.ru','paralax@velo.md','pulbere@mail.ru','mag1963@bk.ru','tennis-house@mail.ru','info@thule.md','info@powerteam.md','site@energofish.com.md','umbrosportmoldova@rambler.ru','office@fastfashion.md','gliuck@rambler.ru','slavaferm@mail.ru','roma@mexx.md','kalif71@mail.ru','info@simpatie.md','medea_md@yahoo.com','mondoro@mail.com','alamac-plus@mail.ru','algetina@mail.ru','obada@mail.ru','aureola@mail.ru','sales@watch.md','info@godina.md','smehoshop@gmail.com','ingvar_ip@rambler.ru','interres2006@googlemail.com','info@vitrinamd.com','aer@telecom.md','office@om-center.md','info@moldeco.md','franco.gold@yahoo.com','diamant-ceasuri@yandex.ru','th_seps@yandex.ru','gvgtagor@list.ru','catrin94@mail.ru','foaieverde@gmail.com','sua.7@mail.ru','agroexim_md@yahoo.com','agrolib@mail.ru','info@vladcorgrup.com','ghermesagro@mail.ru','sergano@sergano.moldline.net','eman_eii@mail.ru','carthago@mail.ru','chiaola-grup@mail.ru','info@walnut.md','moldiberica@yahoo.es','vanorav_srl@yahoo.com','premier92fin@mail.ru','cenar@mail.ru','office@acvilin.com.md','achira-grup@mail.ru','planet-home@mail.ru','veteran@arax.md','info@aco-service.md','acona@mail.md','office@artizana.md','referent@acorex.net','axar@mdl.net','acseal_gaz@moldnet.md','axelavit@mail.md','manola2004@mail.ru','babeia@rambler.ru','alviciteh@mail.ru','alged@mail.ru','info@alina.md','aldoni@mail.md','alegria@mail.ru','aledas@inbox.ru','apl2006@mail.ru','office@alex-se.com','alexsikoffice@gmail.com','office@alg.md','alexispac@yahoo.com','alexovit@gmail.com','alextrans@mtc.md','aleon@moldnet.md','alesandro-imobil@mail.ru','support@aliaj-mp.com','egarprim@mail.ru','casa_pescarului@fishing.md','mobdesignservice@rambler.ru','victoria@ways.md','office@sits.md','acasa@acasa.mldnet.com','amazonka-club@mail.ru','info@amcham.md','info@amnesty.md','apollo@meganet.md','eyemoldova@youth.md','europcar@mail.md','eiacub@gmail.com','catering@mtc.md','cargo@airtranstur.md','av_profi@mail.ru','artmaster@telemedia.md','arhiconi@arhiconi.com','aquarelle@aquarelle.md','alianta1994@mail.ru','agrimatco@moldnet.md','adminassist@americancouncils.md','a-c@mail.ru','tig1@mail.ru','uf@ufmoldova.com','salon@ford.md','sale7rabi@yahoo.com','rtf@rtf.md','rgcargo@list.ru','regal_sist@mail.ru','rednord@rednord.md','rebu@mail.md','rdm@rdm.md','ratum@mail.md','rasna@baby-shop.md','mopisan@vitalik.moldline.net','devu@mail.ru','company@rdv-soft.md','chisinau@reginapacis.org','zmc-grup@mail.ru','zingan@zingan.com','zidaru_ala@ymail.com','zeiss@company.md','zaporojan@mail.ru','wirtgenmd@mail.ru','welcome@unibank.md','vsurdu@list.ru','voiaj@voiaj.md','viorica_artizana@yahoo.com','viorel.verbinski@continent.toyota.md','vint-v@list.ru','vik-burlak@yandex.ru','hubo@dnt.md','sales@xenon.md','cityoffice@amg-holding.md','info@macon-cmc.md','colegiul2028@yahoo.com','estetic-sana@mail.ru','amazonka@moldovajob.com','gozun@dnt.md','megagym@mail.ru','bonton@mtc.md','vadim@hottour.md','1hustlir1@gmail.com','a.finciuc@gmail.com','academy@police.md','adat.98@inbox.ru','adenosar@mtc.md','afrm@mail.md','agentrans@mail.ru','agropetrol.md@mail.ru','alexgros@mail.ru','alextir@rambler.ru','allynnutza91@yahoo.com','altircom@moldova.cc','alvalgen@rambler.ru','ambgroup@company.md','amsicons@mail333.com','analad@inbox.ru','andrcity@mail.ru'
];

const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function importBatch() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conectat la BD');

    let success = 0, skip = 0;

    for (const email of batch6) {
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
          tags: ['imported', 'batch6']
        });
        success++;
        console.log(`✓ ${email}`);
      } catch (e) {
        console.error(`✗ ${email}: ${e.message}`);
      }
    }

    console.log(`\n✅ Batch 6: ${success} adăugate, ${skip} deja existente`);
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await sequelize.close();
  }
}

importBatch();
