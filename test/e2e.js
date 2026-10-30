// Uçtan uca test: gerçek Chromium'da uygulamayı kullanıcı gibi gezer.
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');

const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }
const pad = n => (n < 10 ? '0' : '') + n;
function ymd(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function sameMonth(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.getMonth() === new Date().getMonth(); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());

  const click = sel => page.click(sel);
  const text = () => page.innerText('body');
  const has = async s => (await text()).includes(s);
  const tab = async n => { await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await page.waitForTimeout(100); await click('.tab:has-text("' + n + '")'); };
  const theme = () => page.getAttribute('html', 'data-theme');
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const shot = async (n, wait = 1100) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.resolve(__dirname, '../shots/' + n + '.png') }); };
  const noOverflow = async label => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok: ' + label);
  const waitText = (s, ms = 4000) => page.waitForFunction(t => document.body.innerText.includes(t), s, { timeout: ms });
  fs.mkdirSync(path.resolve(__dirname, '../shots'), { recursive: true });

  // ---------- Açılış, logo, tema ----------
  await page.goto(URL);
  ok(await page.isVisible('#splash'), 'açılış ekranı (splash) görünüyor');
  ok(await page.evaluate(() => { const i = document.querySelector('#splash img'); return i.complete && i.naturalWidth > 0; }), 'splash logosu yüklendi');
  await shot('00-splash');
  await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
  ok(true, 'açılış ekranı kendiliğinden kapanıyor');
  ok(await has('Gerçekçi başla') && (await page.locator('.pager i').count()) === 3, 'ilk açılışta tanıtım ekranı (3 sayfa)');
  ok(!(await page.isVisible('#tabs')), 'tanıtımda alt menü görünmüyor');
  await shot('00b-tanitim');
  await click('[data-act=onbNext]');
  ok(await has('Adım adım ilerle'), 'tanıtım: 2. sayfa');
  await click('[data-act=onbNext]');
  ok(await has('Rakamlarını takip et') && await has('Başlayalım'), 'tanıtım: 3. sayfa');
  await click('[data-act=onbNext]');
  ok(await has('DAHA FAZLASI MÜMKÜN'), 'karşılama ekranı ve slogan');
  ok(await page.evaluate(() => { const i = document.querySelector('.logo-big'); return i.complete && i.naturalWidth > 0; }), 'karşılamada logo yüklendi');
  ok((await theme()) === 'dark', 'varsayılan tema siyah');
  ok((await bodyBg()) === 'rgb(8, 10, 11)', 'siyah tema zemin rengi');
  await shot('01-karsilama');
  await page.fill('#nameInput', 'Ali');
  await click('[data-act=start]');
  ok(await has('Merhaba Ali'), 'isimle ana ekran');
  ok(await page.isVisible('.brand-logo'), 'üst çubukta logo');
  ok(await page.getAttribute('#main', 'class').then(c => c.includes('anim')), 'sayfa geçiş animasyonu sınıfı uygulanıyor');
  ok((await page.locator('.tab').count()) === 5 && (await page.locator('.tab svg.i').count()) === 5, 'alt menü: 5 çizgi simge, emoji yok');
  ok(await page.evaluate(() => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.getElementById('tabs').innerText)), 'alt menüde emoji yok');
  ok((await page.locator('.tab.on').count()) === 1 && (await page.locator('.tab.on').innerText()).includes('Ana sayfa'), 'seçili sekme vurgulu');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.tab.on .pill')).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'seçili simgenin arkasında hap');
  ok(await has('Gelir ekle') && await has('Gider ekle'), 'ana ekranda hızlı ekle düğmeleri');
  await shot('02-ana-siyah');
  await noOverflow('ana');

  await click('[data-act=toggleTheme]');
  await page.waitForTimeout(450);                     // tema geçiş animasyonu (0,3 sn) bitsin
  ok((await theme()) === 'light' && (await bodyBg()) === 'rgb(244, 246, 245)', 'üstteki düğme açık temaya geçirir');
  await shot('02b-ana-acik');
  await page.reload();
  await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
  ok((await theme()) === 'light', 'tema seçimi yeniden açınca korunuyor');
  await click('[data-act=toggleTheme]');
  ok((await theme()) === 'dark', 'tekrar siyaha dönüş');

  ok(await has('0 günlük seri') && (await page.locator('.badge').count()) === 7, 'ana ekranda seri ve 7 rozet');

  // ---------- Ücretsiz paket ----------
  await tab('Görevler');
  ok(await has('Manuel pakette açılır'), 'ücretsizde görev listesi kilitli');
  await tab('Sohbet');
  ok((await page.locator('.sugg').count()) === 4, 'sohbette 4 öneri düğmesi');
  await page.fill('#chatInput', 'benim için 30 video hazırla ve otomatik yayımla');
  await click('[data-act=send]');
  ok(await page.isVisible('.msg.typing'), 'yazıyor animasyonu görünüyor');
  await waitText('ücretli paketlerin');
  ok(true, 'ücretsiz AI otomasyonu yapmıyor, yöntemi anlatıyor');
  ok((await page.inputValue('#chatInput')) === '', 'gönderince giriş kutusu temizlendi');
  await page.fill('#chatInput', 'Hedef kitle ne demek?');
  await page.press('#chatInput', 'Enter');
  await waitText('insan grubu');
  ok(true, 'Enter ile gönderme ve terim açıklama');
  await click('.sugg:has-text("Garanti")');
  await waitText('garanti verilemez');
  ok(true, 'öneri düğmesi doğrudan soruyu gönderiyor');
  await shot('03-sohbet');
  await noOverflow('sohbet');

  // ---------- Hızlı ekle ----------
  await tab('Ana');
  await click('[data-act=quickAdd][data-v=out]');
  ok(await has('Yeni kayıt') && (await page.locator('[data-act=finType][data-v=out]').getAttribute('class')).includes('on'), 'hızlı ekle: Kazanç ekranında gider seçili açılır');
  await click('[data-act=finType][data-v=in]');

  // ---------- Kazanç: herkese açık ----------
  await tab('Kazanç');
  ok(!(await has('Manuel pakette')) && await has('Yeni kayıt'), 'kazanç ekranı ücretsiz pakette açık');
  ok(await has('Aylık gelir hedefi'), 'hedef alanı var');
  await page.fill('#goalInput', '1000');
  await click('[data-act=saveGoal]');
  ok(await has('Aylık hedef: 1.000,00 TL'), 'aylık hedef kaydedildi');
  // gelir 300 (bugün)
  await page.fill('#finAmount', '300');
  await page.selectOption('#finCat', 'satis');
  await page.fill('#finNote', 'ilk satış');
  await click('[data-act=addFin]');
  ok(await has('Kaydedildi'), 'kayıt eklendi bildirimi');
  ok(await has('Yeni rozet'), 'ilk kayıtla rozet kazanıldı bildirimi');
  ok((await page.inputValue('#finAmount')) === '', 'kayıttan sonra form temizlendi');
  // gider 80 (2 gün önce)
  await click('[data-act=finType][data-v=out]');
  ok((await page.locator('#finCat option').first().innerText()).includes('Araç'), 'gider seçince kategori listesi değişti');
  await page.fill('#finAmount', '80');
  await page.fill('#finDate', ymd(2));
  await click('[data-act=addFin]');
  // gelir 200 (5 gün önce)
  await click('[data-act=finType][data-v=in]');
  await page.fill('#finAmount', '200');
  await page.selectOption('#finCat', 'hizmet');
  await page.fill('#finDate', ymd(5));
  await click('[data-act=addFin]');
  ok(await has('420,00 TL'), 'toplam net 420,00 TL');
  const monthIn = 300 + (sameMonth(5) ? 200 : 0);
  ok(await has('%' + Math.min(100, Math.round(monthIn / 10))), 'hedef ilerlemesi (%' + Math.min(100, Math.round(monthIn / 10)) + ')');
  // gelecek tarih reddedilir
  await page.fill('#finAmount', '10');
  await page.evaluate(() => { const d = document.getElementById('finDate'); d.removeAttribute('max'); });
  const t = new Date(); t.setDate(t.getDate() + 3);
  await page.fill('#finDate', t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()));
  await click('[data-act=addFin]');
  ok(await has('gelecek tarih olamaz'), 'gelecek tarihli kayıt reddedildi');
  await page.fill('#finAmount', '');
  // filtre
  await click('[data-act=finFilter][data-v=out]');
  ok((await page.locator('li.fin').count()) === 1, 'gider filtresi tek kayıt gösteriyor');
  await click('[data-act=finFilter][data-v=all]');
  ok((await page.locator('li.fin').count()) === 3, 'tümü 3 kayıt');
  await shot('04-kazanc');
  await noOverflow('kazanç');

  // ---------- Grafik ekranı ----------
  await click('button:has-text("Gelir-Gider Grafiklerini Aç")');
  ok(await has('Gelir-Gider Grafikleri') && await page.isVisible('[data-act=back]'), 'grafik ekranı ve geri oku');
  ok((await page.locator('svg.chart rect.cbar.in').count()) === 2, 'sütun grafiğinde 2 gelir sütunu');
  ok((await page.locator('svg.chart rect.cbar.out').count()) === 1, 'sütun grafiğinde 1 gider sütunu');
  ok((await page.locator('svg.chart path.line').count()) === 1, 'birikimli net çizgisi var');
  ok(await has('Bu ayın özeti') && await has('Elde kalan oranı'), 'grafik ekranında aylık özet kartı');
  ok((await page.locator('svg.donut').count()) === 2, 'iki halka grafiği (gelir kaynakları, gider dağılımı)');
  ok(await has('Satış') && await has('Hizmet bedeli') && await has('Araç'), 'kategori açıklamaları');
  ok(await has('420,00 TL'), 'dönem net toplamı');
  await page.click('svg.chart rect.hit[data-i="6"] >> nth=0');
  ok((await page.locator('.pick').first().innerText()).includes('300,00 TL'), 'sütuna dokununca o günün ayrıntısı (bugün: 300)');
  await page.click('svg.chart rect.hit[data-i="1"] >> nth=0');
  ok((await page.locator('.pick').first().innerText()).includes('200,00 TL'), 'başka güne dokununca ayrıntı değişti (5 gün önce: 200)');
  await shot('05-grafik-siyah');
  await click('[data-act=period][data-v="30d"]');
  ok((await page.locator('svg.chart').first().locator('rect.hit').count()) === 30, '30 günlük görünüm: 30 kova');
  await click('[data-act=period][data-v="12m"]');
  ok((await page.locator('svg.chart').first().locator('rect.hit').count()) === 12, '12 aylık görünüm: 12 kova');
  await shot('06-grafik-12ay');
  await noOverflow('grafik 12 ay');
  await click('[data-act=period][data-v="30d"]');
  await noOverflow('grafik 30 gün');
  await click('[data-act=period][data-v="7d"]');
  await click('[data-act=toggleTheme]');
  await shot('07-grafik-acik');
  await click('[data-act=toggleTheme]');

  // ---------- Geri tuşu ----------
  await page.goBack();
  ok(await has('Yeni kayıt') && !(await page.isVisible('[data-act=back]')), 'geri tuşu grafikten Kazanç ekranına döner');
  await click('button[title="Geçmiş İşlemler"]');
  await click('[data-act=back]');
  ok(await has('Merhaba Ali') || await has('Kazanç'), 'üstteki geri oku önceki ekrana döner');
  await click('button[title="Ayarlar"]');
  await page.goBack();
  ok(!(await has('Görünüm')), 'geri tuşu ayarlardan çıkar');

  // ---------- Manuel paket, görev, rozet ----------
  await tab('Paketler');
  ok(await has('TEST MODU'), 'paket ekranında test modu uyarısı');
  ok((await page.locator('.card.pkg').first().innerText()).includes('Gelir-gider takibi ve grafikler'), 'gelir-gider ücretsiz paketin özelliği olarak listeli');
  await page.click('[data-act=setPkg][data-id=manual]');
  await tab('Görevler');
  await click('[data-act=quizStart]');
  await page.click('[data-act=answer][data-q=time][data-v=mid]');
  await page.click('[data-act=answer][data-q=money][data-v=none]');
  await page.click('[data-act=answer][data-q=skill][data-v=talk]');
  await shot('08-soru');
  await page.click('[data-act=answer][data-q=speed][data-v=fast]');
  ok(await has('En uygun') && await has('garanti değildir'), 'öneri ekranı ve dürüstlük notu');
  await page.click('[data-act=pickModel] >> nth=0');
  ok(await has('0 / 7 tamamlandı'), 'proje başladı, 7 görev');
  await shot('09-gorevler');
  await page.click('[data-act=openTask] >> nth=0');
  ok(await has('Görev 1 / 7') && await page.isVisible('.heart'), 'görev ekranı ve sağ altta 💚');
  await page.goBack();
  ok(await has('0 / 7 tamamlandı'), 'geri tuşu görevden listeye döner');
  await page.click('[data-act=openTask] >> nth=0');
  await page.click('.heart');
  ok(await has('Okumaktan yoruldun mu?') && await has('150 TL'), 'sesli anlatım teklifi, 150 TL');
  await shot('10-teklif');
  await page.click('[data-act=narrClose]');
  ok(!(await has('Okumaktan yoruldun mu?')), '"Şimdilik istemiyorum" kapatır');
  await page.click('.heart');
  await page.click('[data-act=buyNarr]');
  ok(await has('Bana sesli anlat'), 'satın alınca sesli anlatım paneli');
  await page.fill('#askInput', 'portfolyo nedir');
  await page.click('[data-act=askNarr]');
  ok(await has('örnek koleksiyonudur'), 'anlatım panelinde terim açıklaması');
  await page.click('[data-act=narrClose]');
  await page.fill('#noteInput', 'Hedef kitlem: üniversite öğrencileri');
  await page.click('[data-act=toggleTask]');
  ok(await page.waitForSelector('.confetti', { timeout: 2000 }).then(() => true, () => false), 'görev tamamlanınca konfeti');
  await waitText('Görev 2 / 7');
  ok(true, 'tamamlanınca sıradaki göreve geçer');
  await tab('Ana');
  ok(await has('1 günlük seri'), 'seri sayacı 1 gün');
  ok((await page.locator('.badge.on').count()) >= 3, 'kazanılan rozetler renkli');
  await shot('11-ana-dolu', 3600);

  // ---------- Otomasyon: CEO ----------
  await tab('Paketler');
  await page.click('[data-act=setPkg][data-id=manual]').catch(() => { });
  await page.click('[data-act=setPkg][data-id=ceo]');
  await tab('Ana');
  await click('.tile:has-text("Otomasyon")');
  await page.selectOption('#planDays', '7');
  await click('[data-act=makePlan]');
  ok(await has('7 günlük') && await has('Karar kartları'), 'CEO: plan ve karar kartları');
  await page.click('[data-act=decide] >> nth=0');
  ok(await has('onaylandı') || await has('reddedildi'), 'karar verildi');
  await page.reload();
  await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
  await tab('Ana');
  await click('.tile:has-text("Otomasyon")');
  ok(await has('Karar kartları') && ((await page.locator('[data-act=decide]').count()) >= 1 || (await has('onaylandı'))), 'kararlar yeniden açınca duruyor');

  // ---------- İptal: iş kalır, otomasyon durur ----------
  await tab('Paketler');
  await page.click('[data-act=setPkg][data-id=free]');
  await tab('Ana');
  ok(await has('Aboneliğin sona erdi'), 'iptal bilgilendirmesi');
  await click('.tile:has-text("Otomasyon")');
  ok(await has('Yarı Otomasyon ve CEO Modu'), 'iptalden sonra otomasyon durdu');
  await tab('Görevler');
  ok(await has('1 / 7 tamamlandı'), 'iptalden sonra işine manuel devam edebilir');
  await tab('Kazanç');
  ok(await has('420,00 TL'), 'iptalden sonra kazanç kayıtları duruyor');
  await click('button[title="Geçmiş İşlemler"]');
  const hist = await text();
  ok(hist.includes('Hizmetini Tanımla') && hist.includes('PROJEYİ GÖRÜNTÜLE') && hist.includes('7 günlük'), 'geçmiş: tamamlananlar, plan, en son yarım kalan proje');
  await shot('12-gecmis');

  // ---------- Ayarlar, yardım, dışa aktarma ----------
  await click('button[title="Ayarlar"]');
  ok(await has('Görünüm') && await has('Siyah') && await has('Sistem'), 'ayarlarda tema seçici');
  await click('[data-act=setTheme][data-v=light]');
  ok((await theme()) === 'light', 'ayarlardan açık tema');
  await click('[data-act=setTheme][data-v=system]');
  ok(['light', 'dark'].includes(await theme()), 'sistem teması');
  await click('[data-act=setTheme][data-v=dark]');
  ok((await theme()) === 'dark', 'ayarlardan siyah tema');
  await shot('13-ayarlar');
  await noOverflow('ayarlar');
  // hatırlatıcı (tarayıcıda yalnızca ayar kaydedilir)
  await click('[data-act=remToggle][data-v=on]');
  ok(await has('yalnızca Android uygulamasında'), 'hatırlatıcı: tarayıcıda dürüst uyarı');
  await page.fill('#remTime', '21:30');
  await click('[data-act=saveReminder]');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('pasif_gelirim_state_v1')).settings.reminder.time) === '21:30', 'hatırlatıcı saati kaydedildi');
  await click('[data-act=remToggle][data-v=off]');
  // tanılama
  await click('[data-act=diag]');
  ok(await has('Tanılama bilgisi') && (await page.inputValue('#exportBox')).includes('Pasif Gelirim 0.8'), 'tanılama bilgisi açılıyor');
  await click('[data-act=closeExport]');
  const [dl] = await Promise.all([page.waitForEvent('download'), click('[data-act=export]')]);
  ok(dl.suggestedFilename().endsWith('.json'), 'JSON dışa aktarma indi');
  const jsonBackup = await dl.path();
  const backupText = fs.readFileSync(jsonBackup, 'utf8');
  ok(!backupText.includes('"lock"') && !backupText.includes('"hash"'), 'yedek dosyasında PIN bilgisi yok');
  const [dl2] = await Promise.all([page.waitForEvent('download'), click('[data-act=exportCsv]')]);
  ok(dl2.suggestedFilename().endsWith('.csv'), 'CSV dışa aktarma indi');
  const csv = fs.readFileSync(await dl2.path(), 'utf8');
  ok(csv.includes('Tarih;Tür;Kategori') && csv.includes('Satış') && csv.includes('Hizmet bedeli'), 'CSV içeriği doğru');
  await click('[data-act=go][data-route=about]');
  ok((await page.locator('details.faq').count()) === 6 && await has('garanti'), 'yardım: 6 soru ve uyarı');
  await shot('14-yardim');
  await noOverflow('yardım');
  await page.click('details.faq >> nth=0 >> summary');
  ok(await has('Hayır. Hiçbir gelir modeli için garanti vermiyoruz'), 'SSS açılıyor');
  await tab('Paketler');
  await noOverflow('paketler');


  // ---------- v0.4: kontrol listesi, düzenleme, bütçe, arama, hesaplayıcı, sözlük ----------
  await tab('Ana');
  ok(!(await has('Başlangıç adımları')), 'tüm adımlar bitince kontrol listesi kayboluyor');
  await tab('Kazanç');
  await page.fill('#budgetInput', '100');
  await click('[data-act=saveBudget]');
  ok(await has('Aylık gider bütçesi') && await has('Kalan: 20,00 TL'), 'gider bütçesi kaydedildi ve kalan gösteriliyor');
  await page.fill('#finAmount', '70'); await click('[data-act=finType][data-v=out]');
  await click('[data-act=addFin]');
  ok(await has('Bütçeyi 50,00 TL aştın'), 'bütçe aşımı uyarısı');
  await page.click('[data-act=editFin] >> nth=0');
  ok(await has('Kaydı düzenle') && await has('Güncelle'), 'düzenleme formu açılıyor');
  const amt = await page.inputValue('#finAmount');
  ok(amt !== '', 'düzenleme formu mevcut tutarla doluyor (' + amt + ')');
  await page.fill('#finAmount', '15');
  await click('[data-act=addFin]');
  ok(await has('Kayıt güncellendi') && await has('Kalan: 5,00 TL'), 'kayıt güncellendi, bütçe yeniden hesaplandı');
  ok(!(await has('Kaydı düzenle')), 'güncelleyince form yeni kayda döndü');
  await click('[data-act=finType][data-v=in]');
  for (const n of ['1', '2', '3']) { await page.fill('#finAmount', n); await page.fill('#finNote', 'arama' + n); await click('[data-act=addFin]'); }
  ok((await page.locator('#finSearch').count()) === 1, 'çok kayıt olunca arama kutusu');
  await page.fill('#finSearch', 'arama2');
  ok((await page.locator('li.fin:visible').count()) === 1, 'arama kayıtları süzüyor');
  await page.fill('#finSearch', '');
  await shot('17-kazanc-butce');
  await noOverflow('kazanç v0.4');
  await tab('Ana');
  await click('.tile:has-text("Hesaplayıcı")');
  await page.fill('#calcPrice', '100'); await page.fill('#calcCost', '20'); await page.fill('#calcFee', '10'); await page.fill('#calcTarget', '1000');
  await click('[data-act=calcRun]');
  ok(await has('15 adet') && await has('70,00 TL'), 'hesaplayıcı: 15 satış, satış başı 70 TL');
  ok((await page.inputValue('#calcPrice')) === '100', 'hesapladıktan sonra girişler korunuyor');
  await page.fill('#calcPrice', '10'); await page.fill('#calcCost', '30');
  await click('[data-act=calcRun]');
  ok(await has('zarar ediyorsun'), 'zarar ettiren fiyat uyarısı');
  await shot('18-hesaplayici');
  await click('[data-act=back]');
  await click('.tile:has-text("Sözlük")');
  const all = await page.locator('#glossList details').count();
  ok(all >= 5, 'sözlükte ' + all + ' terim');
  await page.fill('#glossQ', 'zzzqq');
  ok((await page.locator('#glossList details:visible').count()) === 0 && await page.isVisible('#glossEmpty'), 'sözlük araması: sonuç yoksa mesaj');
  await page.fill('#glossQ', 'niş');
  ok((await page.locator('#glossList details:visible').count()) >= 1, 'sözlük araması terim buluyor');
  await shot('19-sozluk');
  await noOverflow('sözlük');


  // ---------- v0.7: planlar, birikim, tekrarlayan, vergi payı, kaynak ----------
  await tab('Kazanç');
  ok((await page.locator('#finSrc').count()) === 1, 'proje varken "Hangi iş için?" seçimi');
  await page.fill('#finAmount', '40'); await page.fill('#finNote', 'kaynakli');
  await page.selectOption('#finSrc', { index: 1 });
  await click('[data-act=addFin]');
  await click('button:has-text("Gelir-Gider Grafiklerini Aç")');
  ok(await has('İşlere göre net'), 'grafiklerde işe göre net kartı');
  await tab('Ana');
  await click('.tile:has-text("Planlar")');
  ok(await has('Birikim hedefleri') && await has('Tekrarlayan kayıtlar') && await has('Vergi payı'), 'planlar ekranı');
  await page.click('summary:has-text("Yeni birikim hedefi")');
  await page.fill('#savName', 'Laptop'); await page.fill('#savTarget', '1000');
  await click('[data-act=savAdd]');
  ok(await has('Laptop') && await has('Kalan 1.000,00 TL'), 'birikim hedefi oluşturuldu');
  await page.fill('input[id^=savAmt_]', '250');
  await click('[data-act=savMoney][data-s="1"]');
  ok(await has('%25') && await has('250,00 TL / 1.000,00 TL'), 'birikime para eklendi (%25)');
  await page.fill('input[id^=savAmt_]', '50');
  await click('[data-act=savMoney][data-s="-1"]');
  ok(await has('200,00 TL / 1.000,00 TL'), 'birikimden çıkarma');
  await page.click('summary:has-text("Yeni tekrarlayan kayıt")');
  await page.fill('#recAmount', '30'); await page.fill('#recNote', 'alan adı'); await page.fill('#recDate', ymd(70));
  await click('[data-act=recAdd]');
  ok(await has('Her ay') && await has('alan adı') && await has('kayıt eklendi'), 'tekrarlayan kayıt eklendi, geçmiş aylar işlendi');
  await click('[data-act=recToggle]');
  ok(await has('Duraklatıldı'), 'tekrarlayan kayıt duraklatıldı');
  await click('[data-act=recToggle]');
  await page.fill('#taxInput', '20');
  await click('[data-act=taxSave]');
  ok(await has('Kenara ayırman önerilen'), 'vergi payı hesabı');
  await shot('21-planlar');
  await noOverflow('planlar');
  await tab('Kazanç');
  ok(await has('otomatik · tekrarlayan'), 'otomatik kayıtlar listede işaretli');
  await tab('Ana');
  ok(!(await has('0 / 5')), 'otomatik kayıt kontrol listesini etkilemez');

  // ---------- PIN kilidi ----------
  const pin = async d => { for (const c of d) await page.click('.key[data-v="' + c + '"]'); };
  await click('button[title="Ayarlar"]');
  await click('[data-act=lockOn]');
  ok(await has('Yeni PIN belirle') && !(await page.isVisible('#tabs')), 'PIN belirleme ekranı');
  await shot('16-pin');
  await pin('1234');
  await waitText('tekrar gir');
  await pin('1111');
  await waitText('uyuşmadı');
  ok(true, 'farklı PIN reddedildi');
  await pin('1234'); await waitText('tekrar gir'); await pin('1234');
  await waitText('Uygulama kilidi açıldı');
  ok(await has('Uygulama kilidi: Açık'), 'kilit açıldı');
  const stored = await page.evaluate(() => localStorage.getItem('pasif_gelirim_state_v1'));
  ok(!stored.includes('1234') && /"hash":"[0-9a-f]{64}"/.test(stored), 'PIN düz metin saklanmıyor (SHA-256 özeti)');
  await page.reload();
  await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
  ok(await page.isVisible('.pinwrap') && !(await page.isVisible('#tabs')), 'yeniden açınca kilit ekranı geliyor');
  await pin('0000');
  await waitText('Yanlış PIN');
  ok(true, 'yanlış PIN reddedildi');
  await pin('1234');
  await waitText('Merhaba');
  ok(!(await page.isVisible('.pinwrap')) && await page.isVisible('#tabs'), 'doğru PIN ile kilit açıldı');
  await click('button[title="Ayarlar"]');
  await click('[data-act=lockOff]');
  await pin('1234');
  await waitText('Uygulama kilidi kapatıldı');
  ok(await has('Uygulama kilidi: Kapalı'), 'kilit kapatıldı');

  // ---------- Verileri sil, geri yükle, boş durumlar, güvenlik ----------
  await click('[data-act=wipe]');
  ok(await has('Gerçekçi başla'), 'tüm veriyi silince tanıtıma dönüyor');
  await click('[data-act=onbSkip]');
  await page.fill('#nameInput', 'Veli');
  await click('[data-act=start]');
  ok(await has('Başlangıç adımları') && (await page.locator('.cl').count()) === 5 && (await page.locator('.cl.done').count()) === 1, 'yeni kullanıcıda kontrol listesi (1/5)');
  await shot('20-kontrol-listesi');
  await click('button[title="Ayarlar"]');
  await page.setInputFiles('#importFile', jsonBackup);
  await waitText('Yedek geri yüklendi');
  await tab('Kazanç');
  ok(await has('420,00 TL'), 'yedekten geri yükleme: kayıtlar geri geldi');
  await page.setInputFiles('#importFile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('bu json degil') }).catch(() => { });
  await click('button[title="Ayarlar"]');
  await page.setInputFiles('#importFile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('bu json degil') });
  await waitText('yedek dosyası değil');
  ok(true, 'bozuk yedek dosyası reddedildi');
  await click('[data-act=wipe]');
  await click('[data-act=onbSkip]');
  await page.fill('#nameInput', '<img src=x onerror=window.__xss=1>');
  await click('[data-act=start]');
  await tab('Kazanç');
  await click('button:has-text("Gelir-Gider Grafiklerini Aç")');
  ok(await has('Bu dönemde kayıt yok'), 'kayıt yokken grafik ekranı boş durum gösteriyor');
  await shot('15-bos-grafik');
  await tab('Sohbet');
  await page.fill('#chatInput', '<script>window.__xss=2</script>');
  await click('[data-act=send]');
  await waitText('Bunu biraz daha açabilir misin');
  await tab('Kazanç');
  await page.fill('#finAmount', '5');
  await page.fill('#finNote', '<img src=x onerror=window.__xss=3>');
  await click('[data-act=addFin]');
  ok(!(await page.evaluate(() => window.__xss)), 'isim, sohbet ve not alanlarına yazılan HTML çalışmıyor');

  ok(errors.length === 0, 'konsolda hata yok' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails ? '\n' + fails + ' kontrol BAŞARISIZ' : '\nTüm uçtan uca kontroller geçti');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('Test çöktü:', e.message); process.exit(1); });
