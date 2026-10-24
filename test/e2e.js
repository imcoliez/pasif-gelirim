// Uçtan uca test: gerçek Chromium'da uygulamayı kullanıcı gibi gezer.
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');

const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }

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
  const shot = n => page.screenshot({ path: path.resolve(__dirname, '../shots/' + n + '.png') });
  require('fs').mkdirSync(path.resolve(__dirname, '../shots'), { recursive: true });

  await page.goto(URL);
  ok((await text()).includes('DAHA FAZLASI MÜMKÜN'), 'karşılama ekranı ve slogan');
  await shot('01-karsilama');
  await page.fill('#nameInput', 'Ali');
  await click('[data-act=start]');
  ok((await text()).includes('Merhaba Ali'), 'isimle ana ekran');
  ok((await text()).includes('Ücretsiz paketi'), 'varsayılan ücretsiz paket');
  ok(await page.isVisible('button[title="Geçmiş İşlemler"]'), 'üstte ↶ Geçmiş İşlemler simgesi');
  await shot('02-ana');

  // Ücretsiz: görevler kilitli
  await click('.tab:has-text("Görevler")');
  ok((await text()).includes('Manuel pakette açılır'), 'ücretsizde görev listesi kilitli');

  // Ücretsiz sohbet + otomasyon isteği reddi
  await click('.tab:has-text("Sohbet")');
  await page.fill('#chatInput', 'benim için 30 video hazırla ve otomatik yayımla');
  await click('[data-act=send]');
  ok((await text()).includes('ücretli paketlerin'), 'ücretsiz AI otomasyonu yapmıyor, yöntemi anlatıyor');
  await page.fill('#chatInput', 'Hedef kitle ne demek?');
  await page.press('#chatInput', 'Enter');
  ok((await text()).includes('insan grubu'), 'Enter ile gönderme ve terim açıklama');
  await shot('03-sohbet');

  // Günlük süre sınırı
  await click('button[title="Ayarlar"]');
  await click('[data-act=fillUsage]');
  await click('.tab:has-text("Sohbet")');
  ok((await text()).includes('hakkın doldu'), 'günlük 1 saat dolunca sohbet kapanıyor');
  ok(!(await page.isVisible('#chatInput')), 'süre dolunca giriş kutusu yok');
  await click('button[title="Ayarlar"]');
  await click('[data-act=resetUsage]');

  // Manuel paket (test)
  await click('.tab:has-text("Paketler")');
  ok((await text()).includes('TEST MODU'), 'paket ekranında test modu uyarısı');
  await page.click('[data-act=setPkg][data-id=manual]');
  await click('.tab:has-text("Görevler")');
  await click('[data-act=quizStart]');
  await page.click('[data-act=answer][data-q=time][data-v=mid]');
  await page.click('[data-act=answer][data-q=money][data-v=none]');
  await page.click('[data-act=answer][data-q=skill][data-v=talk]');
  await shot('04-soru');
  await page.click('[data-act=answer][data-q=speed][data-v=fast]');
  ok((await text()).includes('En uygun'), 'öneri ekranı');
  ok((await text()).includes('garanti değildir'), 'öneride dürüstlük notu');
  await shot('05-oneri');
  await page.click('[data-act=pickModel] >> nth=0');
  ok((await text()).includes('0 / 7 tamamlandı'), 'proje başladı, 7 görev');
  await shot('06-gorevler');

  // Görev + sesli anlatım teklifi
  await page.click('[data-act=openTask] >> nth=0');
  ok(await page.isVisible('.heart'), 'sağ altta 💚 simgesi');
  await page.click('.heart');
  ok((await text()).includes('Okumaktan yoruldun mu?'), 'teklif penceresi');
  ok((await text()).includes('150 TL'), '150 TL farkı yazıyor');
  await shot('07-teklif');
  await page.click('[data-act=narrClose]');
  ok(!(await text()).includes('Okumaktan yoruldun mu?'), '"Şimdilik istemiyorum" kapatır');
  await page.click('.heart');
  await page.click('[data-act=buyNarr]');
  ok((await text()).includes('Bana sesli anlat'), 'satın alınca sesli anlatım paneli açılır');
  await page.fill('#askInput', 'portfolyo nedir');
  await page.click('[data-act=askNarr]');
  ok((await text()).includes('örnek koleksiyonudur'), 'anlatım panelinde terim açıklaması');
  await page.click('[data-act=narrClose]');

  // Not + tamamlama
  await page.fill('#noteInput', 'Hedef kitlem: üniversite öğrencileri');
  await page.click('[data-act=toggleTask]');
  await click('.tab:has-text("Görevler")');
  ok((await text()).includes('1 / 7 tamamlandı'), 'görev tamamlanınca ilerleme artar');

  // Kazanç
  await click('.tab:has-text("Kazanç")');
  await page.fill('#finAmount', '250,5');
  await page.fill('#finNote', 'ilk satış');
  await click('[data-act=addFin]');
  ok((await text()).includes('250,50'), 'gelir kaydı eklendi');
  await page.selectOption('#finType', 'out');
  await page.fill('#finAmount', '50');
  await click('[data-act=addFin]');
  ok((await text()).includes('200,50'), 'net hesaplandı');
  await shot('08-kazanc');

  // Manuel pakette otomasyon kilitli
  await click('button[title="Ayarlar"]');
  await click('.tab:has-text("Ana")');
  await click('.tile:has-text("Otomasyon")');
  ok((await text()).includes('Yarı Otomasyon ve CEO Modu'), 'manuelde otomasyon kilitli');

  // CEO paketi: plan + karar
  await click('.tab:has-text("Paketler")');
  await page.click('[data-act=setPkg][data-id=ceo]');
  await click('.tab:has-text("Ana")');
  await click('.tile:has-text("Otomasyon")');
  await page.selectOption('#planDays', '7');
  await click('[data-act=makePlan]');
  ok((await text()).includes('7 günlük'), 'CEO: plan hazırlandı');
  ok((await text()).includes('Karar kartları'), 'CEO: karar kartları');
  await page.click('[data-act=decide] >> nth=0');
  ok((await text()).includes('onaylandı') || (await text()).includes('reddedildi'), 'karar verildi');
  await shot('09-otomasyon');

  // İptal: iş kalır, otomasyon durur, geçmiş açık
  await click('.tab:has-text("Paketler")');
  await page.click('[data-act=setPkg][data-id=free]');
  await click('.tab:has-text("Ana")');
  ok((await text()).includes('Aboneliğin sona erdi'), 'iptal bilgilendirmesi');
  await click('.tile:has-text("Otomasyon")');
  ok((await text()).includes('Yarı Otomasyon ve CEO Modu'), 'iptalden sonra otomasyon durdu');
  await click('.tab:has-text("Görevler")');
  ok((await text()).includes('1 / 7 tamamlandı'), 'iptalden sonra işine manuel devam edebilir');
  await click('button[title="Geçmiş İşlemler"]');
  const hist = await text();
  ok(hist.includes('Tamamlanan çalışmalar') && hist.includes('Hizmetini Tanımla'), 'geçmişte tamamlananlar');
  ok(hist.includes('En son yarım kalan proje') && hist.includes('PROJEYİ GÖRÜNTÜLE'), 'geçmişte en son yarım kalan proje');
  ok(hist.includes('7 günlük'), 'geçmişte hazırlanan plan duruyor');
  await shot('10-gecmis');

  // Kalıcılık
  await page.reload();
  ok((await text()).includes('Merhaba Ali'), 'yeniden açınca veriler duruyor');
  await click('.tab:has-text("Kazanç")');
  ok((await text()).includes('250,50'), 'kazanç kayıtları kalıcı');

  // Dışa aktarma ve silme
  await click('button[title="Ayarlar"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), click('[data-act=export]')]);
  ok(dl.suggestedFilename().endsWith('.json'), 'dışa aktarma dosyası indi');
  await click('[data-act=wipe]');
  ok((await text()).includes('DAHA FAZLASI MÜMKÜN'), 'tüm veriyi silince başa dönüyor');

  // Güvenlik: HTML enjeksiyonu
  await page.fill('#nameInput', '<img src=x onerror=window.__xss=1>');
  await click('[data-act=start]');
  ok(!(await page.evaluate(() => window.__xss)), 'isim alanına yazılan HTML çalışmıyor');

  ok(errors.length === 0, 'konsolda hata yok' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails ? '\n' + fails + ' kontrol BAŞARISIZ' : '\nTüm uçtan uca kontroller geçti');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('Test çöktü:', e.message); process.exit(1); });
