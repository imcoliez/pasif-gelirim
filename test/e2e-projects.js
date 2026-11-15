// Aşama 3: proje yönetimi uçtan uca testleri (gerçek Chromium, kullanıcı gibi).
const path = require('path'), fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const Core = require('../www/core.js');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }
const KEY = 'pasif_gelirim_state_v1';

(async () => {
  const T = Date.now(), today = new Date().toISOString().slice(0, 10);
  const st = Core.defaultState(); st.user.name = 'Ali'; st.user.onboarded = true;
  Core.setPackage(st, 'semi', T);
  const A = Core.startProject(st, 'freelance', T - 5000); Core.updateProject(st, A.id, { title: 'Eski Proje' }, T - 4000);
  Core.addFinance(st, { type: 'in', amount: 40, cat: 'satis', date: today, note: 'eski-baglanti-yok-1' }, T);
  Core.addFinance(st, { type: 'out', amount: 15, cat: 'diger', date: today, note: 'eski-baglanti-yok-2' }, T);
  Core.addFinance(st, { type: 'in', amount: 50, cat: 'satis', date: today, note: 'A-kaydi', src: A.id }, T);
  const raw = JSON.stringify(st);
  fs.mkdirSync(path.resolve(__dirname, '../shots'), { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'tr-TR', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], dialogs = []; let accept = true;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss(); });
  await page.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await page.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, raw);
  await page.goto(URL); await page.waitForSelector('.tab');
  const settle = () => page.waitForTimeout(450);
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const text = sel => page.innerText(sel || '#main');
  const tab = async r => { await page.click('.tab[data-route="' + r + '"]'); await settle(); };
  const overflow = async l => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok: ' + l);
  const titles = async () => page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('#main .card.proj .ptitle'), e => e.textContent));
  const openCard = async title => { await tab('projects'); const c = page.locator('#main .card.proj', { hasText: title }).first(); await c.locator('[data-act=viewProject]').click(); await settle(); };
  const startOne = async () => {
    await tab('projects'); await page.click('#main [data-act=quizStart]');
    for (const [q, v] of [['time', 'mid'], ['money', 'none'], ['skill', 'talk'], ['speed', 'fast']]) await page.click('[data-act=answer][data-q=' + q + '][data-v=' + v + ']');
    await page.click('[data-act=pickModel] >> nth=0'); await settle();
  };

  // ---- 1. mevcut proje ve eski veriler ----
  await tab('projects');
  ok((await text()).includes('1 / 4'), 'Projeler: 1 / 4 aktif proje');
  ok((await titles()).join() === 'Eski Proje', 'mevcut proje kartı korunmuş');
  ok((await text('#main .card.proj')).includes('Aktif proje') && (await text('#main .card.proj')).includes('Paket atanmadı') && (await text('#main .card.proj')).includes('+50,00'), 'kart: aktif rozeti, paket durumu, proje neti (yalnızca kendi kaydı)');
  ok(await page.isVisible('#main [data-act=quizStart]'), 'yeni proje oluştur düğmesi var');
  await page.screenshot({ path: path.resolve(__dirname, '../shots/proj-list-1.png') });

  // ---- 2. dört proje sınırı ----
  for (let i = 0; i < 3; i++) await startOne();
  await tab('projects');
  ok((await titles()).length === 4 && (await text()).includes('4 / 4'), 'dört aktif proje oluştu (4 / 4)');
  ok(!(await page.isVisible('#main [data-act=quizStart]')) && (await text()).includes('Proje sınırına ulaştın.') && (await text()).includes('arşivle'), 'sınırda yeni proje düğmesi yok, açıklayıcı mesaj var');
  const s4 = await stored(); ok(s4.projects.length === 4, 'kayıtlı proje sayısı 4');
  await page.evaluate(() => { const b = document.createElement('button'); b.setAttribute('data-act', 'pickModel'); b.setAttribute('data-id', 'freelance'); b.id = 'fakePick'; document.body.appendChild(b); });
  await page.click('#fakePick'); await settle();
  ok((await stored()).projects.length === 4, 'sınır aşılmaya çalışılınca 5. proje oluşmuyor');
  ok((await page.innerText('body')).includes('En fazla 4 proje oluşturabilirsin.'), 'sınır uyarısı gösterildi');
  await page.evaluate(() => document.getElementById('fakePick').remove());

  // aynı modelden açılan projeleri ayırt etmek için arayüzden adlandır
  for (const n of ['Beta Proje', 'Gama Proje', 'Delta Proje']) {
    await tab('projects');
    await page.locator('#main .card.proj', { hasText: 'Freelance Hizmet' }).first().locator('[data-act=viewProject]').click(); await settle();
    await page.fill('#pjTitle', n); await page.click('[data-act=saveProject]'); await settle();
  }
  ok((await stored()).projects.map(p => p.title).slice().sort().join() === 'Beta Proje,Delta Proje,Eski Proje,Gama Proje', 'projeler adlandırıldı');

  // ---- 3. detay, düzenleme ----
  await openCard('Eski Proje');
  ok((await text()).includes('Proje bilgileri') && (await text('.top')).includes('Proje'), 'proje detayı açıldı');
  await page.fill('#pjTitle', 'Alfa Dükkân'); await page.fill('#pjDesc', 'Ürün satış denemesi'); await page.fill('#pjGoal', '1.000');
  await page.click('[data-act=saveProject]'); await settle();
  let s = await stored(); const pa = s.projects.find(p => p.id === A.id);
  ok(pa.title === 'Alfa Dükkân' && pa.desc === 'Ürün satış denemesi' && pa.goal === 1000, 'ad, açıklama ve hedef kaydedildi');
  ok((await text()).includes('%5') && (await text()).includes('950,00'), 'hedef ilerlemesi gelire göre (%5, 950 TL kaldı)');
  await page.fill('#pjTitle', '   '); await page.click('[data-act=saveProject]'); await settle();
  ok((await stored()).projects.find(p => p.id === A.id).title === 'Alfa Dükkân', 'boş ad reddedilir, eski ad korunur');
  await page.fill('#pjTitle', 'Alfa Dükkân'); await page.fill('#pjGoal', 'abc'); await page.click('[data-act=saveProject]'); await settle();
  ok((await stored()).projects.find(p => p.id === A.id).goal === 1000, 'geçersiz hedef reddedilir');
  await page.fill('#pjGoal', '1000'); await page.click('[data-act=saveProject]'); await settle();

  // ---- 4. veri ayrımı: kayıt, not, görev ----
  const B = (await stored()).projects.find(p => p.title === 'Beta Proje');
  const bTitle = 'Beta Proje';
  await page.goto(URL); await page.waitForSelector('.tab');   // yeniden açılış
  ok((await stored()).projects.find(p => p.id === A.id).title === 'Alfa Dükkân', 'yeniden açınca düzenleme kalıcı');
  const addRec = async (type, amount, projId, note) => {
    await tab('tools'); await page.click('#main [data-route=money]'); await settle();
    if (type === 'out') await page.click('[data-act=finType][data-v=out]');
    await page.fill('#finAmount', String(amount)); await page.fill('#finNote', note); await page.selectOption('#finSrc', projId);
    await page.click('[data-act=addFin]'); await settle();
  };
  await tab('projects'); await page.locator('#main .card.proj', { hasText: bTitle }).first().locator('[data-act=switchProject]').click().catch(() => { }); await settle();
  await tab('tools'); await page.click('#main [data-route=money]'); await settle();
  ok((await page.inputValue('#finSrc')) === (await stored()).activeProjectId, 'yeni kayıt formunda varsayılan iş = aktif proje');
  await addRec('in', 100, B.id, 'B-geliri'); await addRec('out', 30, B.id, 'B-gideri');
  s = await stored();
  ok(s.finance.filter(f => f.src === B.id).length === 2 && s.finance.filter(f => f.src === A.id).length === 1, 'kayıtlar seçilen projeye bağlandı');
  await openCard(bTitle);
  let t = await text();
  ok(t.includes('B-geliri') && t.includes('B-gideri') && !t.includes('A-kaydi'), 'B detayında yalnızca B kayıtları görünür');
  await page.fill('#pjNote', 'B projesinin özel notu'); await page.locator('#pjNote').blur(); await settle();
  await openCard('Alfa Dükkân'); t = await text();
  ok(t.includes('A-kaydi') && !t.includes('B-geliri') && !t.includes('B projesinin özel notu'), 'A detayında B’nin kayıt ve notu görünmez');
  ok((await page.inputValue('#pjNote')) === '', 'A’nın notu boş, B’ninkine karışmadı');
  await openCard(bTitle);
  ok((await page.inputValue('#pjNote')) === 'B projesinin özel notu', 'B notu kalıcı');
  // görevler
  await page.click('#main [data-act=go][data-route=tasks]'); await settle();
  await page.click('#main [data-act=openTask] >> nth=0').catch(() => { });
  await settle();
  if (await page.locator('[data-act=toggleTask]').count()) { await page.click('[data-act=toggleTask]'); await settle(); }
  s = await stored();
  const bDone = Object.values(s.projects.find(p => p.id === B.id).tasks).filter(x => x.done).length;
  const aDone = Object.values(s.projects.find(p => p.id === A.id).tasks).filter(x => x.done).length;
  ok(bDone === 1 && aDone === 0, 'tamamlanan görev yalnızca aktif projeye yazıldı (B=' + bDone + ', A=' + aDone + ')');
  ok(await page.locator('.pchip').count() === 1 && (await text('.pchip')).includes(bTitle), 'görev ekranında aktif proje göstergesi var');

  // ---- 5. proje göstergesi ----
  for (const r of ['home', 'tools']) { await tab(r); ok((await page.locator('.pchip').count()) === 1 && (await text('.pchip')).includes(bTitle), r + ': aktif proje göstergesi'); }
  await tab('projects'); ok((await page.locator('.pchip').count()) === 0, 'Projeler ekranında yinelenen gösterge yok');
  await tab('home'); await page.click('.pchip'); await settle(); ok(await page.locator('#main h2.ptitle').count() === 1, 'gösterge dokununca proje detayına gider');

  // ---- 6. paket atama / taşıma ----
  await openCard('Alfa Dükkân');
  ok((await text()).includes('Paketimi bu projeye ata'), 'otomasyon paketi var: atama düğmesi görünür');
  await page.click('[data-act=assignPkg]'); await settle();
  s = await stored(); ok(s.projects.find(p => p.id === A.id).pkg === 'semi' && s.projects.filter(p => p.pkg).length === 1, 'paket A projesine atandı');
  ok((await text()).includes('(TEST MODU: gerçek ödeme yok.)'), 'atama metninde test modu belirtilmiş');
  await openCard(bTitle); ok((await text()).includes('Paketi buraya taşı') && (await text()).includes('Alfa Dükkân'), 'B: paket A’da, taşıma düğmesi var');
  await page.click('[data-act=assignPkg]'); await settle();
  s = await stored(); ok(s.projects.find(p => p.id === B.id).pkg === 'semi' && s.projects.find(p => p.id === A.id).pkg === '' && s.projects.filter(p => p.pkg).length === 1, 'paket B projesine taşındı, A’dan alındı');
  // paket değişikliği veri silmez
  await tab('account'); await page.click('#main [data-route=packages]'); await settle();
  const fb = s.finance.length, pb = s.projects.length;
  await page.click('[data-act=setPkg][data-id=free]'); await settle();
  s = await stored();
  ok(s.pkg === 'free' && s.projects.length === pb && s.finance.length === fb, 'paket ücretsize düşünce projeler ve kayıtlar silinmedi');
  await openCard(bTitle); ok((await text()).includes('Paket şu an aktif değil') || (await text()).includes('şu an hesabında aktif değil'), 'pasif paket açıkça belirtiliyor');
  await tab('account'); await page.click('#main [data-route=packages]'); await settle(); await page.click('[data-act=setPkg][data-id=semi]'); await settle();
  await openCard(bTitle); ok((await text()).includes('Hesabındaki otomasyon paketi bu projeye atanmış'), 'paket geri gelince atama yeniden aktif');

  // ---- 7. eski kayıtları bağlama ----
  await openCard('Alfa Dükkân');
  ok((await text()).includes('2 kaydı bu projeye bağla'), 'bağlı olmayan eski 2 kayıt için seçenek var');
  accept = false; await page.click('[data-act=linkLegacy]'); await settle();
  ok((await stored()).finance.filter(f => !f.src).length === 2, 'onay verilmezse hiçbir şey değişmez');
  accept = true; await page.click('[data-act=linkLegacy]'); await settle();
  s = await stored(); ok(s.finance.filter(f => !f.src).length === 0 && s.finance.length === fb && s.finance.filter(f => f.src === A.id).length === 3, 'onayla: eski kayıtlar A’ya bağlandı, hiçbiri silinmedi');

  // ---- 8. arşiv ----
  await openCard(bTitle);
  accept = false; await page.click('[data-act=archiveProject]'); await settle();
  ok((await stored()).projects.find(p => p.id === B.id).status === 'active', 'arşiv iptal edilince değişmez');
  accept = true; await page.click('[data-act=archiveProject]'); await settle();
  s = await stored(); const pbArch = s.projects.find(p => p.id === B.id);
  ok(pbArch.status === 'archived' && pbArch.pkg === '' && Object.keys(pbArch.tasks).length >= 1 && pbArch.note === 'B projesinin özel notu' && s.finance.filter(f => f.src === B.id).length === 2, 'arşivlendi: görev, not ve kayıtlar yerinde, paket serbest');
  ok(s.activeProjectId !== B.id && !!s.activeProjectId, 'aktif proje başka projeye geçti');
  t = await text(); ok(t.includes('3 / 4') && t.includes('Arşiv (1)') && await page.isVisible('#main [data-act=quizStart]'), 'arşiv yer açtı: 3 / 4, yeni proje oluşturulabilir');
  await page.click('#main .archbox summary'); await settle();
  ok(await page.isVisible('#main .archbox [data-act=restoreProject]'), 'arşivde “Arşivden çıkar” görünüyor');
  await startOne(); await tab('projects');
  ok((await text()).includes('4 / 4'), 'arşivdeyken 4. aktif proje açıldı (4 / 4)');
  await page.click('#main .archbox summary').catch(() => { });
  await page.evaluate(() => { const d = document.querySelector('.archbox'); if (d) d.open = true; });
  await page.click('#main .archbox [data-act=restoreProject]'); await settle();
  ok((await stored()).projects.find(p => p.id === B.id).status === 'archived' && (await page.innerText('body')).includes('En fazla 4 aktif proje olabilir.'), 'dolu iken arşivden geri alma sınırı aşamaz');
  // bir yer aç: yeni oluşturulan projeyi sil (onaylı)
  const newest = (await stored()).projects.filter(p => p.status !== 'archived').sort((a, b) => b.createdAt - a.createdAt)[0];

  // ---- 9. silme ----
  await openCard(newest.title);
  const finBefore = (await stored()).finance.length;
  accept = false; await page.click('[data-act=deleteProject]'); await settle();
  ok((await stored()).projects.some(p => p.id === newest.id), 'silme iptal edilince proje durur');
  ok(dialogs.some(d => d.includes('geri alınamaz') && d.includes('gelir-gider kayıtların')), 'silme onayı kalıcı olduğunu ve neyin silineceğini açıkça söylüyor');
  accept = true; await page.click('[data-act=deleteProject]'); await settle();
  s = await stored();
  ok(!s.projects.some(p => p.id === newest.id) && s.finance.length === finBefore, 'onaylanınca proje silindi, gelir-gider kayıtları kaldı');
  ok(s.activeProjectId && s.projects.some(p => p.id === s.activeProjectId && p.status !== 'archived'), 'silinince aktif proje geçerli bir projeye döndü');
  // arşivdekini geri al
  await tab('projects'); await page.evaluate(() => { const d = document.querySelector('.archbox'); if (d) d.open = true; });
  await page.click('#main .archbox [data-act=restoreProject]'); await settle();
  ok((await stored()).projects.find(p => p.id === B.id).status === 'active', 'yer açılınca arşivden geri alındı');

  // ---- 10. kapat-aç: seçili proje ve veriler ----
  const before = await stored();
  await page.reload(); await page.waitForSelector('.tab'); await settle();
  const after = await stored();
  ok(after.activeProjectId === before.activeProjectId && JSON.stringify(after.projects.map(p => [p.id, p.title, p.status, p.pkg, p.note])) === JSON.stringify(before.projects.map(p => [p.id, p.title, p.status, p.pkg, p.note])), 'yeniden açınca seçili proje, adlar, durumlar, paket ve notlar aynı');
  ok(after.finance.length === before.finance.length, 'kayıt sayısı aynı');
  ok(await page.locator('.tab.on[data-route=home]').count() === 1, 'navigasyon Ana Sayfa ile başlıyor');

  // ---- 11. yedek / geri yükleme / CSV ----
  await tab('account'); await page.click('#main [data-route=settings]'); await settle();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=export]')]);
  const bk = fs.readFileSync(await dl.path(), 'utf8');
  const bj = JSON.parse(bk);
  ok(bj.projects && bj.projects.length === after.projects.length && bj.projects.every(p => 'status' in p && 'desc' in p) && bj.finance.length === after.finance.length, 'JSON yedeği proje alanlarını ve tüm kayıtları içeriyor');
  const imp = Core.importData(bk);
  ok(imp.ok && imp.state.projects.length === after.projects.length && imp.state.finance.every((f, i) => f.src === after.finance.find(x => x.id === f.id).src), 'yedek geri yüklenebilir, proje bağlantıları aynı');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=exportCsv]')]);
  const csv = fs.readFileSync(await dl2.path(), 'utf8');
  ok(csv.split('\n').filter(x => x.trim()).length === after.finance.length + 1, 'CSV tüm kayıtları içeriyor');
  ok(errors.length === 0, 'konsolda hata yok (390) ' + errors.join(' | '));
  await ctx.close();

  // ---- 12. küçük ekran ve diller ----
  for (const lang of ['tr', 'en', 'de', 'ru', 'ar']) {
    const c2 = await browser.newContext({ viewport: { width: 320, height: 568 }, locale: lang === 'tr' ? 'tr-TR' : lang });
    const p2 = await c2.newPage(); const errs = [];
    p2.on('pageerror', e => errs.push(e.message)); p2.on('dialog', d => d.accept());
    await p2.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
    const s2 = JSON.parse(JSON.stringify(after)); s2.settings.lang = lang;
    await p2.addInitScript(([k, r]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, r); } catch (e) { } }, [KEY, JSON.stringify(s2)]);
    await p2.goto(URL); await p2.waitForSelector('.tab'); await p2.waitForTimeout(400);
    await p2.click('.tab[data-route=projects]'); await p2.waitForTimeout(500);
    const ov = async l => ok(await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), lang + ' 320: yatay taşma yok (' + l + ')');
    await ov('projeler'); await p2.screenshot({ path: path.resolve(__dirname, '../shots/proj-list-' + lang + '.png') });
    await p2.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p2.waitForTimeout(150);
    ok(await p2.evaluate(() => { const k = document.getElementById('main').lastElementChild.getBoundingClientRect().bottom; return k <= document.getElementById('tabs').getBoundingClientRect().top + 1; }), lang + ' 320: projeler listesinin sonu menünün altında kalmıyor');
    await p2.locator('#main [data-act=viewProject]').first().click(); await p2.waitForTimeout(500);
    await ov('detay'); await p2.screenshot({ path: path.resolve(__dirname, '../shots/proj-detail-' + lang + '.png') });
    await p2.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p2.waitForTimeout(150);
    ok(await p2.evaluate(() => { const k = document.getElementById('main').lastElementChild.getBoundingClientRect().bottom; return k <= document.getElementById('tabs').getBoundingClientRect().top + 1; }), lang + ' 320: detayın sonu menünün altında kalmıyor');
    if (lang === 'en') { const body = await p2.innerText('#main'); ok(!/[ğüşıöçĞÜŞİÖÇ]/.test(body.replace(/Alfa Dükkân|Ürün satış denemesi|Eski Proje|B projesinin özel notu|[^\n]*(eski-baglanti|A-kaydi|B-gel|B-gid)[^\n]*/g, '')) , 'en: detay ekranında çevrilmemiş Türkçe metin yok'); }
    ok(errs.length === 0, lang + ': konsolda hata yok ' + errs.join('|'));
    await c2.close();
  }
  await browser.close();
  if (fails) { console.error('\n' + fails + ' kontrol başarısız'); process.exit(1); }
  console.log('\nProje yönetimi testleri geçti');
})().catch(e => { console.error(e); process.exit(1); });
