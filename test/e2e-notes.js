// Aşama 8: Not Defteri uçtan uca (gerçek Chromium).
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const Core = require('../www/core.js');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }
const KEY = 'pasif_gelirim_state_v1';

(async () => {
  const T = Date.now();
  const st = Core.defaultState(); st.user.name = 'Ali'; st.user.onboarded = true; Core.setPackage(st, 'semi', T);
  const A = Core.startProject(st, 'freelance', T - 5000); Core.updateProject(st, A.id, { title: 'Alfa Proje' }, T - 4000);
  const B = Core.startProject(st, 'sosyal-medya', T - 3000); Core.updateProject(st, B.id, { title: 'Beta Proje' }, T - 2000);
  Core.addMemory(st, A.id, 'goal', 'ALFA-hedef', T - 1000, 'user');
  const C = Core.startProject(st, 'blog-affiliate', T - 2500); Core.updateProject(st, C.id, { title: 'Gama Proje' }, T - 2400);
  Core.addNote(st, { title: 'Gama notu', body: 'GAMA-ozel', cat: 'proje', projectId: C.id }, T - 2300);
  st.activeProjectId = A.id;
  const raw = JSON.stringify(st);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'tr-TR', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], reqs = [], dialogs = []; let dlg = true;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url())) reqs.push(r.url()); });
  page.on('dialog', d => { dialogs.push(d.message()); dlg ? d.accept() : d.dismiss(); });
  await page.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await page.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, raw);
  await page.goto(URL); await page.waitForSelector('.tab');
  const settle = () => page.waitForTimeout(400);
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const text = () => page.innerText('#main');
  const click = async sel => { await page.click(sel); await settle(); };
  const overflow = async l => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok: ' + l);
  const say = async t => { await page.fill('#chatInput', t); await page.click('[data-act=send]'); await page.waitForTimeout(1200); };
  const newNote = async (title, body, cat, proj) => {
    await click('[data-act=nbNew]'); await page.fill('#ntTitle', title); await page.fill('#ntBody', body);
    if (cat) await page.selectOption('#ntCat', cat); if (proj !== undefined) await page.selectOption('#ntProj', proj);
    await click('[data-act=nbSave]');
  };

  // --- giriş noktaları
  ok((await page.$$('.tab')).length === 5, 'beş sekmeli menü korunuyor (yeni sekme yok)');
  await click('.tab[data-route=tools]'); let t = await text();
  ok(/Not Defteri/.test(t) && !!(await page.$('.notetile')), 'Araçlar içinde Not Defteri kartı var');
  await click('.notetile'); t = await text();
  ok(/Not Defteri/.test(t) && /Gama notu/.test(t) && /1 not/.test(t), 'Not Defteri açılıyor ve mevcut notu gösteriyor');
  ok(/sunucuya gönderilmez/.test(t), 'gizlilik notu görünüyor');
  await overflow('Not Defteri (boş)');

  // --- oluştur / görüntüle / düzenle
  await newNote('İlk fikir', 'Reels serisi başlat', 'fikir', '');
  t = await text(); ok(/İlk fikir/.test(t) && /Fikirler/.test(t) && /Güncellendi:/.test(t), 'not oluşturuldu ve listede görünüyor (kategori, tarih)');
  await newNote('Alfa notu', 'ALFA-ozel-icerik freelance müşteri', 'is', A.id);
  await newNote('Beta notu', 'BETA-ozel-icerik', 'arastirma', B.id);
  await newNote('Şifre notu', 'IBAN TR12 3456 7890 1234 5678 9012 34', 'kisisel', '');
  t = await text(); ok(/Alfa notu/.test(t) && /Beta notu/.test(t) && /Alfa Proje/.test(t), 'proje notları proje etiketiyle listeleniyor');
  ok(/Hassas olabilir/.test(t), 'IBAN içeren not "Hassas olabilir" olarak işaretlendi');
  await click('.notecard >> text=İlk fikir'); await page.fill('#ntBody', 'Reels serisi — düzenlendi'); await page.selectOption('#ntCat', 'is'); await click('[data-act=nbSave]');
  let s = await stored(); const n1 = s.notebook.notes.find(n => n.title === 'İlk fikir');
  ok(n1 && /düzenlendi/.test(n1.body) && n1.cat === 'is' && n1.updatedAt >= n1.createdAt, 'not düzenlendi; kategori değişti; güncellenme tarihi var');
  // vazgeç
  await click('.notecard >> text=İlk fikir'); await page.fill('#ntBody', 'KAYDEDILMEMELI'); await click('[data-act=back]'); s = await stored();
  ok(!/KAYDEDILMEMELI/.test(JSON.stringify(s.notebook)), 'vazgeç: değişiklik kaydedilmedi');

  // --- arama / filtre / sıralama
  await page.fill('#nbQ', 'reels'); await settle(); t = await page.innerText('#nbList'); ok(/İlk fikir/.test(t) && !/Alfa notu/.test(t), 'arama başlık/içerikte çalışıyor');
  await page.fill('#nbQ', 'ALFA-ozel'); await settle(); t = await page.innerText('#nbList'); ok(/Alfa notu/.test(t) && !/İlk fikir/.test(t), 'arama içerikte çalışıyor');
  await page.fill('#nbQ', 'yokyokyok'); await settle(); ok(/eşleşen not yok/.test(await page.innerText('#nbList')), 'eşleşme yoksa boş durum');
  await page.fill('#nbQ', ''); await settle();
  await page.selectOption('#nbCat', 'arastirma'); await settle(); t = await page.innerText('#nbList'); ok(/Beta notu/.test(t) && !/Alfa notu/.test(t) && !/İlk fikir/.test(t), 'kategori filtresi');
  await page.selectOption('#nbCat', ''); await page.selectOption('#nbProj', 'general'); await settle(); t = await page.innerText('#nbList'); ok(/İlk fikir/.test(t) && !/Alfa notu/.test(t) && !/Beta notu/.test(t), 'genel notlar filtresi proje notlarını göstermiyor');
  await page.selectOption('#nbProj', A.id); await settle(); t = await page.innerText('#nbList'); ok(/Alfa notu/.test(t) && !/Beta notu/.test(t) && !/İlk fikir/.test(t), 'proje filtresi yalnızca o projenin notları (izolasyon)');
  await page.selectOption('#nbProj', ''); await page.selectOption('#nbSort', 'title'); await settle();
  const titles = await page.$$eval('#nbList .nt-t', els => els.map(e => e.textContent)); ok(titles.join('|') === [...titles].sort((a, b) => a.localeCompare(b, 'tr')).join('|'), 'başlığa göre sıralama: ' + titles.join(', '));
  ok(/Son düzenlenenler/.test(await text()) , 'son düzenlenenler bölümü var');
  await overflow('Not Defteri (liste)');

  // --- silme onayı
  await page.selectOption('#nbSort', 'updated'); await click('.notecard >> text=İlk fikir'); dlg = false; dialogs.length = 0;
  await click('[data-act=nbDelete]'); s = await stored();
  ok(dialogs.length === 1 && /kalıcı olarak silinsin/.test(dialogs[0]) && s.notebook.notes.some(n => n.title === 'İlk fikir'), 'silme onay ister; İptal edilince not silinmez');
  dlg = true; await click('[data-act=nbDelete]'); s = await stored();
  ok(!s.notebook.notes.some(n => n.title === 'İlk fikir') && s.notebook.notes.length === 4, 'onaylanınca not silindi');

  // --- yeniden açılınca kalıcılık
  await page.reload(); await page.waitForSelector('.tab'); await page.click('.tab[data-route=tools]'); await settle(); await click('.notetile'); t = await text();
  ok(/Alfa notu/.test(t) && /Beta notu/.test(t) && /Şifre notu/.test(t) && !/İlk fikir/.test(t), 'uygulama yeniden açılınca notlar duruyor');

  await newNote('Genel liste notu', 'genel içerik', 'genel', '');
  // --- NORA: izin kapalı
  await click('.tab[data-route=chat]'); await click('.nora-links [data-act=go][data-route=notes]'); t = await text();
  ok(/Not Defteri/.test(t) && /NORA erişimi/.test(t), 'NORA ekranındaki kısayol aynı Not Defteri\'ni açıyor');
  s = await stored(); ok(s.notebook.nora === false, 'NORA erişimi varsayılan KAPALI');
  await click('.tab[data-route=chat]'); await say('Notlarımı göster'); t = await text();
  ok(/erişimin kapalı/.test(t) && !/ALFA-ozel|Alfa notu/.test(t), 'izin kapalıyken NORA notları okumuyor/göstermiyor');
  // izin aç
  await click('.nora-links [data-act=go][data-route=notes]'); await click('[data-act=nbNora][data-v=on]'); s = await stored(); ok(s.notebook.nora === true, 'NORA erişimi açıldı');
  await click('.tab[data-route=chat]'); await say('Notlarımı göster'); t = await text();
  ok(/Alfa notu/.test(t) && !/Beta notu/.test(t) && !/İlk fikir/.test(t), 'proje sohbetinde NORA yalnızca aktif projenin (Alfa) notlarını gösteriyor');
  ok(/Demo yanıt/.test(t), 'yanıt demo diye etiketli');
  await click('[data-act=chatScope][data-v=general]'); await say('Notlarımı göster'); t = await page.innerText('#chatBox');
  ok(/Genel notların/.test(t) && !/Alfa notu/.test(t) && !/Beta notu/.test(t), 'genel sohbette yalnızca genel notlar');
  ok(!/Şifre notu/.test(t) && /gizlendi/.test(t), 'hassas not NORA\'ya gösterilmedi (gizlendi uyarısı var)');
  // özetle: kullanılamıyor
  await say('Bu notu özetle'); t = await page.innerText('#chatBox'); ok(/kullanılamıyor/.test(t), 'özetleme gerçek AI olmadan "kullanılamıyor" diyor');
  // kaydet önerisi: onay kartı
  await say('Bu fikrimi not defterime kaydet: Haftada üç video çek'); t = await text(); s = await stored();
  ok(!!(await page.$('.npend')) && !s.notebook.notes.some(n => /üç video/.test(n.body)), 'NORA kaydetmeden önce onay kartı gösteriyor, not henüz yok');
  await click('.npend [data-act=nbPend][data-v=yes]'); s = await stored();
  ok(s.notebook.notes.some(n => /üç video/.test(n.body) && n.projectId === ''), 'Kaydet\'e basınca genel not olarak eklendi');
  // düzenleme önerisi
  await page.evaluate(() => { }); // no-op
  await click('.nora-links [data-act=go][data-route=notes]'); await newNote('Dağınık', '  ilk   satır  \n\n\n  ikinci satır ', 'genel', ''); await click('.tab[data-route=chat]');
  await say('Bu notu daha düzenli hale getir'); t = await text(); s = await stored();
  const dag = s.notebook.notes.find(n => n.title === 'Dağınık');
  ok(!!(await page.$('.npend')) && /Önerilen yeni metin/.test(t) && dag.body === '  ilk   satır  \n\n\n  ikinci satır ', 'düzenleme önerisi gösterildi; not onaysız değişmedi');
  await click('.npend [data-act=nbPend][data-v=no]'); s = await stored(); ok(s.notebook.notes.find(n => n.title === 'Dağınık').body === '  ilk   satır  \n\n\n  ikinci satır ', 'Vazgeç: not aynı kaldı');
  await say('Bu notu daha düzenli hale getir'); await click('.npend [data-act=nbPend][data-v=yes]'); s = await stored();
  ok(s.notebook.notes.find(n => n.title === 'Dağınık').body === 'İlk satır\n\nİkinci satır', 'Uygula: onayla not düzenlendi');
  // silme isteği
  await say('Dağınık notumu sil'); s = await stored(); t = await page.innerText('#chatBox');
  ok(/Not silmeyi ben yapmam/.test(t) && s.notebook.notes.some(n => n.title === 'Dağınık'), 'NORA not silmiyor');

  // --- proje notundan görev önerisi (mevcut onay sistemi)
  await click('[data-act=chatScope][data-v=project]'); await say('Bu nottan görev oluştur'); t = await text(); s = await stored();
  const wk = s.projects.find(p => p.id === A.id).work;
  ok(!!(await page.$('.npend')) && wk.plans.length === 0, 'görev önerisi onay kartı; plan henüz yok');
  await click('.npend [data-act=nbPend][data-v=yes]'); s = await stored(); const w2 = s.projects.find(p => p.id === A.id).work;
  ok(w2.plans.length === 1 && w2.plans[0].state === 'proposed' && w2.tasks.every(x => x.status === 'planned'), 'plan TASLAK olarak Görev Merkezi\'ne düştü; onaysız hiçbir görev çalışmadı');
  // hafıza aktarımı
  await say('Bu notu proje hafızasına aktar'); await click('.npend [data-act=nbPend][data-v=yes]'); s = await stored();
  ok(s.projects.find(p => p.id === A.id).memory.items.length === 2 && s.projects.find(p => p.id === B.id).memory.items.length === 0, 'hafızaya aktarım onayla yapıldı; yalnızca Alfa\'ya, Beta\'ya değil');

  // --- sunucu / dış istek yok
  ok(!(reqs.filter(u => !/^file:/.test(u) && !/frankfurter|binance/.test(u)).length), 'not işlemleri sırasında dış/ücretli istek gitmedi');

  // --- arşiv / proje silme seçenekleri
  const openProj = async id => { await click('.tab[data-route=projects]'); await click('[data-act=viewProject][data-id="' + id + '"]'); };
  // Beta: bağlı not var -> karar verilmeden hiçbir şey silinmez
  await openProj(B.id); t = await text(); ok(/Not Defteri notları/.test(t) && /bağlı 1 not var/.test(t), 'projede bağlı not sayısı ve uyarı görünüyor');
  dialogs.length = 0; await click('[data-act=deleteProject]'); s = await stored();
  ok(dialogs.length === 0 && s.projects.some(p => p.id === B.id) && s.notebook.notes.some(n => n.title === 'Beta notu'), 'Projeyi sil: önce seçenek sunuluyor, hiçbir şey silinmedi');
  ok(/genel notlara taşı/.test(await text()) && /Notlarla birlikte projeyi sil/.test(await text()), 'iki seçenek: genel notlara taşı / notlarla sil');
  await click('[data-act=deleteProjectCancel]'); s = await stored(); ok(s.projects.some(p => p.id === B.id), 'Vazgeç: proje ve notlar duruyor');
  await click('[data-act=deleteProject]'); dlg = false; await click('[data-act=deleteProjectGo][data-v=move]'); s = await stored();
  ok(s.projects.some(p => p.id === B.id) && s.notebook.notes.some(n => n.title === 'Beta notu' && n.projectId === B.id), 'seçenek onayı İptal edilince hiçbir şey silinmedi');
  dlg = true; await click('[data-act=deleteProjectGo][data-v=move]'); s = await stored();
  const bn = s.notebook.notes.find(n => n.title === 'Beta notu');
  ok(!s.projects.some(p => p.id === B.id) && bn && bn.projectId === '' && /BETA-ozel/.test(bn.body), '"Genel notlara taşı": proje silindi, not genel olarak korundu');
  // Gama: notlarla birlikte sil, yalnızca onun notu gider
  await openProj(C.id); await click('[data-act=deleteProject]'); await click('[data-act=deleteProjectGo][data-v=delete]'); s = await stored();
  ok(!s.projects.some(p => p.id === C.id) && !s.notebook.notes.some(n => n.title === 'Gama notu') && s.notebook.notes.some(n => n.title === 'Alfa notu') && s.notebook.notes.some(n => n.title === 'Beta notu'), '"Notlarla birlikte sil": yalnızca Gama\'nın notu silindi, diğerleri duruyor');
  // Alfa: arşivle -> notlar korunur
  await openProj(A.id); await click('[data-act=archiveProject]'); s = await stored();
  ok(s.projects.find(p => p.id === A.id).status === 'archived' && s.notebook.notes.filter(n => n.projectId === A.id).length >= 1, 'arşivlenen projenin notları korundu');
  await click('.tab[data-route=tools]'); await click('.notetile'); await page.selectOption('#nbProj', A.id); await settle(); t = await page.innerText('#nbList'); ok(/Alfa notu/.test(t), 'arşivdeki projenin notu hâlâ görülebiliyor');
  await page.selectOption('#nbProj', ''); await overflow('Not Defteri (son)');

  // --- yedekleme ve geri yükleme
  s = await stored(); const backup = JSON.stringify(s); const nCount = s.notebook.notes.length;
  await click('.notecard >> text=Şifre notu'); await click('[data-act=nbDelete]'); s = await stored(); ok(s.notebook.notes.length === nCount - 1, 'yedek öncesi bir not silindi');
  await click('.tab[data-route=account]'); await click('[data-act=go][data-route=settings]'); dialogs.length = 0;
  await page.setInputFiles('#importFile', { name: 'yedek.json', mimeType: 'application/json', buffer: Buffer.from(backup) }); await page.waitForTimeout(700); s = await stored();
  ok(dialogs.length === 1 && /not yüklenecek/.test(dialogs[0]) && s.notebook.notes.length === nCount && s.notebook.notes.some(n => n.title === 'Şifre notu'), 'yedekten geri yükleme notları geri getirdi (onay metninde not sayısı var)');
  ok(s.notebook.nora === true, 'NORA erişim ayarı yedekle birlikte döndü (kullanıcının seçimi)');
  // eski yedek (notebook alanı yok)
  const old = JSON.parse(backup); delete old.notebook; dialogs.length = 0;
  await page.setInputFiles('#importFile', { name: 'eski.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old)) }); await page.waitForTimeout(700); s = await stored();
  ok(Array.isArray(s.notebook.notes) && s.notebook.notes.length === 0 && s.notebook.nora === false && s.projects.length === old.projects.length, 'eski yedek (not alanı yok) hatasız yüklendi; notlar boş, NORA erişimi kapalı');
  await click('.tab[data-route=tools]'); await click('.notetile'); ok(/Henüz notun yok/.test(await text()), 'eski yedekten sonra Not Defteri açılıyor');

  // --- ekran boyutları
  for (const [w3, h3] of [[320, 640], [360, 720], [412, 915], [768, 1024]]) { await page.setViewportSize({ width: w3, height: h3 }); await settle(); await overflow('Not Defteri ' + w3 + 'px'); }
  await page.setViewportSize({ width: 360, height: 720 });
  ok(errors.length === 0, 'konsol/sayfa hatası yok ' + errors.join(' | '));
  await browser.close();
  console.log(fails ? '\n' + fails + ' BAŞARISIZ' : '\nhepsi geçti'); process.exitCode = fails ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
