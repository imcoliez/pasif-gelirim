// Aşama 9: seçilen metni "NORA'ya Not Al" ile Not Defteri'ne kaydetme (gerçek Chromium, gerçek metin seçimi).
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
  const A = Core.startProject(st, 'freelance', T - 5000); Core.updateProject(st, A.id, { title: 'Alfa Kanalı' }, T - 4000);
  const B = Core.startProject(st, 'sosyal-medya', T - 3000); Core.updateProject(st, B.id, { title: 'Beta Hizmeti' }, T - 2000);
  Core.addNote(st, { title: 'Eski not', body: 'Eski içerik', cat: 'is', projectId: B.id }, T - 1000);
  st.activeProjectId = A.id;
  const raw = JSON.stringify(st);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'tr-TR', acceptDownloads: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => { });
  const page = await ctx.newPage();
  const errors = [], reqs = [], dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url())) reqs.push(r.url()); });
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await page.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await page.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, raw);
  await page.goto(URL); await page.waitForSelector('.tab');
  const settle = () => page.waitForTimeout(450);
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const text = () => page.innerText('#main');
  const click = async sel => { await page.click(sel); await settle(); };
  const overflow = async l => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok: ' + l);
  const barVisible = () => page.evaluate(() => { const b = document.getElementById('selbar'); return !!b && !b.hidden && b.offsetWidth > 0; });
  const selectPara = async sel => { await page.click(sel, { clickCount: 3 }); await page.waitForTimeout(450); };
  const selected = () => page.evaluate(() => String(window.getSelection()));
  const clearSel = async () => { await page.evaluate(() => window.getSelection().removeAllRanges()); await page.waitForTimeout(900); };
  const selectSrc = async () => { await page.evaluate(src => { if (!document.getElementById('testsrc')) { const p = document.createElement('p'); p.id = 'testsrc'; p.className = 'muted'; p.textContent = src; document.getElementById('main').appendChild(p); } }, SRC); await selectPara('#testsrc'); };
  const openNotes = async () => { await click('.tab[data-route=tools]'); await click('.notetile'); };
  const SRC = 'Ürünü önce küçük bir kitleye sat. Alfa Kanalı için haftalık plan yaz ve müşteri teklifi hazırla.';

  // sayfada seçilecek kendi metnimiz: Not Defteri'ndeki ipucu paragrafı + aktif projenin sohbet mesajı
  await openNotes();
  ok(!(await barVisible()), 'seçim yokken araç çubuğu görünmüyor');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('#main .fine')).userSelect !== 'none'), 'uygulama metni seçilebilir (user-select kapalı değil)');

  // --- seçim → çubuk
  await selectPara('#main p.fine');
  const picked = await selected();
  ok(picked.length > 20 && await barVisible(), 'metin seçilince araç çubuğu çıkıyor');
  const labels = await page.$$eval('#selbar .sb-btn', bs => bs.map(b => b.textContent.trim()));
  ok(labels.length === 3 && /NORA'ya Not Al/.test(labels[0]) && /Not Defterine Kaydet/.test(labels[1]) && /Kopyala/.test(labels[2]), 'üç seçenek var: NORA\'ya Not Al, Not Defterine Kaydet, Kopyala');
  const geo = await page.evaluate(() => { const r = document.getElementById('selbar').getBoundingClientRect(), n = document.querySelector('.tabs').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, navTop: n.top }; });
  ok(geo.l >= 0 && geo.r <= geo.vw && geo.t >= 0 && geo.b <= geo.navTop + 1, 'çubuk ekran içinde ve alt menüyü örtmüyor');
  await overflow('seçim çubuğu açık');
  // Kopyala
  await click('#selbar [data-act=selCopy]');
  ok(/Kopyalandı|elle seçip kopyala/.test(await page.innerText('#layer')), 'Kopyala bildirim gösteriyor');
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  ok(clip === null || clip.trim() === picked.trim(), 'Kopyala seçili metni panoya yazdı' + (clip === null ? ' (pano okunamadı, atlandı)' : ''));
  ok(!(await barVisible()), 'Kopyala sonrası çubuk kapandı');
  ok((await stored()).notebook.notes.length === 1, 'Kopyala not oluşturmadı');

  // --- seçim iptal → çubuk kapanır; not oluşmaz
  await selectPara('#main p.fine'); ok(await barVisible(), 'çubuk yeniden çıktı'); await clearSel();
  ok(!(await barVisible()), 'seçim kalkınca çubuk kapandı');

  // --- giriş alanındaki seçimde çıkmaz (kullanıcı kendi yazdığını arıyor/yazıyor)
  await page.fill('#nbQ', 'Deneme arama metni uzun'); await page.click('#nbQ', { clickCount: 3 }); await page.waitForTimeout(500);
  ok(!(await barVisible()), 'arama/giriş kutusundaki seçimde çubuk çıkmıyor'); await page.fill('#nbQ', ''); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.waitForTimeout(300); await clearSel();
  // alt menü ve üst çubuk seçimi
  await page.click('.tab[data-route=tools]', { clickCount: 3 }).catch(() => { }); await page.waitForTimeout(500);
  ok(!(await barVisible()), 'alt menüdeki seçimde çubuk çıkmıyor'); await clearSel(); await openNotes();

  // --- NORA'ya Not Al: kaydetme ekranı
  // Seçilebilir, bilinen bir metin: sohbet mesajıyla değil, doğrudan sayfaya kendi paragrafımızı ekleriz (yalnızca test için)
  await page.evaluate(src => { const p = document.createElement('p'); p.id = 'testsrc'; p.className = 'muted'; p.textContent = src; document.getElementById('main').appendChild(p); }, SRC);
  await selectSrc(); ok((await selected()).trim() === SRC, 'test metni tam seçildi');
  await click('#selbar [data-act=selNora]');
  let t = await page.innerText('#layer');
  ok(/NORA'ya Not Al/.test(t) && t.indexOf(SRC) !== -1, 'kaydetme ekranı açıldı ve seçilen metnin TAMAMINI gösteriyor');
  ok(/kural tabanlı bir demodur/.test(t) && /gerçek yapay zekâ analizi değildir/.test(t) && /Demo/.test(t), 'NORA önerisi açıkça "kural tabanlı demo" olarak etiketli, AI analizi gibi sunulmuyor');
  ok((await page.inputValue('#selTitle')) === 'Ürünü önce küçük bir kitleye sat', 'başlık otomatik önerildi');
  ok((await page.inputValue('#selProj')) === A.id && /Alfa Kanalı/.test(t), 'metinde adı geçen tek proje (Alfa) önerildi');
  ok((await page.inputValue('#selCat')) !== '', 'kategori önerisi dolu');
  ok(/NORA erişimi kapalı/.test(t), 'NORA erişimi kapalı olduğu açıkça yazıyor');
  await overflow('kaydetme ekranı');
  ok(!(await barVisible()) && (await page.evaluate(() => String(getSelection()))) === '', 'ekran açılınca seçim ve çubuk temizlendi');
  // iptal
  await click('[data-act=selCancel]'); ok(!(await page.$('.selsheet')), 'Vazgeç ekranı kapattı'); ok((await stored()).notebook.notes.length === 1, 'iptal edilince not oluşmadı');

  // --- kaydet (başlık, kategori, proje değiştirilerek)
  await selectSrc(); await click('#selbar [data-act=selNora]');
  await page.fill('#selTitle', 'Benim başlığım'); await page.selectOption('#selCat', 'arastirma'); await page.selectOption('#selProj', B.id);
  await click('[data-act=selConfirm]');
  t = await page.innerText('#layer'); ok(/Not Defteri'ne kaydedildi/.test(t), 'başarılı kayıt bildirimi gösterildi');
  let s = await stored(); const nn = s.notebook.notes.find(n => n.title === 'Benim başlığım');
  ok(!!nn && nn.body === SRC && nn.cat === 'arastirma' && nn.projectId === B.id && nn.createdAt > 0 && nn.updatedAt === nn.createdAt, 'not kaydedildi: kullanıcının başlığı, kategorisi ve projesi; tarihler dolu');
  ok(s.notebook.notes.length === 2 && s.notebook.pending.length === 0, 'tam bir not eklendi, bekleyen öneri yok');
  t = await text(); ok(/Benim başlığım/.test(t), 'kaydedilen not Not Defteri listesinde görünüyor');
  await page.selectOption('#nbProj', B.id); await settle(); t = await page.innerText('#nbList'); ok(/Benim başlığım/.test(t), 'proje filtresinde (Beta) görünüyor');
  await page.selectOption('#nbProj', A.id); await settle(); t = await page.innerText('#nbList'); ok(!/Benim başlığım/.test(t), 'Alfa projesinde görünmüyor (proje izolasyonu)');
  await page.selectOption('#nbProj', ''); await settle();

  // --- tekrar kontrolü
  await page.evaluate(src => { if (!document.getElementById('testsrc')) { const p = document.createElement('p'); p.id = 'testsrc'; p.className = 'muted'; p.textContent = src; document.getElementById('main').appendChild(p); } }, SRC);
  await selectSrc(); await click('#selbar [data-act=selNora]'); t = await page.innerText('#layer');
  ok(/zaten bir notta kayıtlı/.test(t) && /Yine de kaydet/.test(t) && /Mevcut notu aç/.test(t), 'aynı metin tekrar kaydedilmek istenince uyarı çıkıyor');
  ok((await stored()).notebook.notes.length === 2 && !!(await page.$('.selsheet')), 'tekrar uyarısı çıkarken ikinci not kendiliğinden oluşmadı');
  await click('[data-act=selOpenDup]'); ok(/Benim başlığım/.test(await page.inputValue('#ntTitle')), '"Mevcut notu aç" doğru notu açtı'); await openNotes();
  await page.evaluate(src => { if (!document.getElementById('testsrc')) { const p = document.createElement('p'); p.id = 'testsrc'; p.className = 'muted'; p.textContent = src; document.getElementById('main').appendChild(p); } }, SRC);
  await selectSrc(); await click('#selbar [data-act=selNora]'); await click('[data-act=selConfirm]');   // "Yine de kaydet"
  ok((await stored()).notebook.notes.length === 3, '"Yine de kaydet" bilerek ikinci not oluşturdu');

  // --- düz kayıt (NORA önerisi yok)
  await selectSrc(); await click('#selbar [data-act=selSave]'); t = await page.innerText('#layer');
  ok(/Not Defterine Kaydet/.test(t) && !/kural tabanlı bir demodur/.test(t) && (await page.inputValue('#selProj')) === '' && (await page.inputValue('#selCat')) === 'genel', '"Not Defterine Kaydet" önerisiz açılıyor (genel not, proje yok)');
  await click('[data-act=selCancel]');

  // --- hassas metin uyarısı
  await page.evaluate(() => { const p = document.createElement('p'); p.id = 'testiban'; p.className = 'muted'; p.textContent = 'IBAN TR12 3456 7890 1234 5678 9012 34 hesabım'; document.getElementById('main').appendChild(p); });
  await selectPara('#testiban'); await click('#selbar [data-act=selNora]'); t = await page.innerText('#layer');
  ok(/Hassas olabilir/.test(t), 'IBAN içeren seçimde "Hassas olabilir" uyarısı var'); await click('[data-act=selCancel]');

  // --- NORA izinleri: erişim kapalıyken NORA bu notu okumaz, açılınca (kapsam içinde) okur
  await click('.tab[data-route=chat]');
  await page.fill('#chatInput', 'Notlarımı göster'); await page.click('[data-act=send]'); await page.waitForTimeout(1300); t = await text();
  ok(!/Ürünü önce küçük|Benim başlığım/.test(t.split('Notlarımı göster').slice(1).join('')) && /erişimin kapalı/.test(t), 'erişim kapalıyken NORA kaydedilen notu okumadı');
  await openNotes(); await click('[data-act=nbNora][data-v=on]').catch(async () => { await page.click('#main .tgl, #main [data-act=nbNora]'); await settle(); });
  s = await stored(); ok(s.notebook.nora === true, 'kullanıcı NORA erişimini açtı');
  await click('.tab[data-route=chat]'); await page.fill('#chatInput', 'Notlarımı göster'); await page.click('[data-act=send]'); await page.waitForTimeout(1300);
  t = (await text()).split('Notlarımı göster').slice(-1)[0]; ok(/Ürünü önce küçük/.test(t) && !/Benim başlığım/.test(t) && !/Eski içerik/.test(t), 'erişim açılınca NORA yalnızca aktif projenin (Alfa) notlarını gösterdi; Beta notları karışmadı');

  // --- yeniden açılınca kalıcılık ve yedek
  await page.reload(); await page.waitForSelector('.tab'); await settle(); await openNotes();
  ok(/Benim başlığım/.test(await text()), 'uygulama yeniden açılınca kaydedilen not duruyor');
  s = await stored(); const backup = JSON.stringify(s); const n0 = s.notebook.notes.length;
  const del = s.notebook.notes.find(n => n.title === 'Benim başlığım');
  await click('.notecard >> text=Benim başlığım'); await click('[data-act=nbDelete]'); ok((await stored()).notebook.notes.length === n0 - 1, 'yedek öncesi not silindi');
  await click('.tab[data-route=account]'); await click('[data-act=go][data-route=settings]'); dialogs.length = 0;
  await page.setInputFiles('#importFile', { name: 'yedek.json', mimeType: 'application/json', buffer: Buffer.from(backup) }); await page.waitForTimeout(700); s = await stored();
  const back = s.notebook.notes.find(n => n.id === del.id);
  ok(s.notebook.notes.length === n0 && !!back && back.body === SRC && back.projectId === B.id && back.createdAt === del.createdAt, 'yedekten geri yükleme seçimden kaydedilen notu aynen (tarih, proje) geri getirdi');

  // --- mevcut not sistemi bozulmadı
  await openNotes(); await click('[data-act=nbNew]'); await page.fill('#ntTitle', 'Elle not'); await page.fill('#ntBody', 'Elle yazılan içerik'); await click('[data-act=nbSave]');
  ok(/Elle not/.test(await text()) && /Eski not/.test(await text()), 'elle not oluşturma ve eski not çalışıyor');

  // --- mobil genişlikler: çubuk + ekran
  for (const [w, h] of [[320, 640], [360, 720], [412, 915], [768, 1024]]) {
    await page.setViewportSize({ width: w, height: h }); await settle();
    await page.evaluate(src => { if (!document.getElementById('testsrc')) { const p = document.createElement('p'); p.id = 'testsrc'; p.className = 'muted'; p.textContent = src; document.getElementById('main').appendChild(p); } }, SRC);
    await selectSrc(); const bv = await barVisible();
    const g = await page.evaluate(() => { const b = document.getElementById('selbar'); if (!b || b.hidden) return null; const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, vw: innerWidth }; });
    ok(bv && g && g.l >= 0 && g.r <= g.vw, 'çubuk ' + w + 'px ekranda tamamen görünüyor'); await overflow('çubuk ' + w + 'px');
    await click('#selbar [data-act=selNora]'); await overflow('kaydetme ekranı ' + w + 'px');
    const sb = await page.evaluate(() => { const r = document.querySelector('.selsheet').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; });
    ok(sb, 'kaydetme ekranı ' + w + 'px içinde'); await click('[data-act=selCancel]');
  }
  await page.setViewportSize({ width: 360, height: 720 });

  // --- 5 sekme, İngilizce, dış istek, hata
  ok((await page.$$('.tab')).length === 5, 'beş sekmeli menü korunuyor');
  ok(errors.length === 0, 'konsol/sayfa hatası yok' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  ok(reqs.length === 0, 'özellik hiçbir dış ağ isteği yapmadı' + (reqs.length ? ': ' + reqs.join(',') : ''));
  const src = require('fs').readFileSync(path.resolve(__dirname, '../www/main.js'), 'utf8') + require('fs').readFileSync(path.resolve(__dirname, '../www/core.js'), 'utf8');
  ok(!/getUserMedia|webkitSpeechRecognition|SpeechRecognition\(|AccessibilityService|requestPermission\(/.test(src), 'mikrofon/erişilebilirlik/ekran izni kodu yok');
  await browser.close();
  // ayrı bağlam: İngilizce
  const b2 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const c2 = await b2.newContext({ viewport: { width: 360, height: 720 }, locale: 'en-US' }); const p2 = await c2.newPage();
  const st2 = JSON.parse(raw); st2.settings.lang = 'en';
  await p2.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await p2.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, JSON.stringify(st2));
  await p2.goto(URL); await p2.waitForSelector('.tab'); await p2.waitForTimeout(400);
  await p2.click('.tab[data-route=tools]'); await p2.waitForTimeout(400); await p2.click('.notetile'); await p2.waitForTimeout(500);
  await p2.evaluate(() => { const p = document.createElement('p'); p.id = 'x'; p.textContent = 'A selectable sentence about a project plan.'; document.getElementById('main').appendChild(p); });
  await p2.click('#x', { clickCount: 3 }); await p2.waitForTimeout(600);
  const en = await p2.$$eval('#selbar .sb-btn', bs => bs.map(b => b.textContent.trim()).join(' | '));
  ok(/Take a note with NORA/.test(en) && /Copy/.test(en), 'İngilizce: seçim çubuğu çevrildi (' + en + ')');
  await b2.close();

  console.log(fails ? '\n' + fails + ' kontrol başarısız' : '\nhepsi geçti'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
