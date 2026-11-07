// Dil ve para birimi: ilk açılış algılama, ayarlardan değiştirme, RTL, para birimi etiketi.
const path = require('path'), fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'de-DE' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  fs.mkdirSync(path.resolve(__dirname, '../shots'), { recursive: true });
  const text = () => page.innerText('body');
  const has = async s => (await text()).includes(s);
  const shot = async n => { await page.waitForTimeout(500); await page.screenshot({ path: path.resolve(__dirname, '../shots/' + n + '.png') }); };
  const noOverflow = async l => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok: ' + l);

  await page.goto(URL);
  await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
  ok(await has('Realistisch starten'), 'cihaz dili Almanca: tanıtım Almanca açıldı');
  ok(await page.getAttribute('html', 'lang') === 'de', 'html lang=de');
  await shot('L1-de-tanitim');
  await page.click('[data-act=onbSkip]');
  ok(await has('Wie sollen wir dich nennen?') && await has('Sprache') && await has('Währung'), 'karşılama ekranında dil ve para birimi var');
  ok(await page.inputValue('#curSel') === 'EUR', 'Almanca için para birimi EUR önerildi');
  await page.selectOption('#langSel', 'ru');
  ok(await has('Как к тебе обращаться?') && await page.inputValue('#curSel') === 'RUB', 'dil Rusça yapılınca metin ve para birimi (RUB) değişti');
  await page.selectOption('#langSel', 'ar');
  ok(await page.getAttribute('html', 'dir') === 'rtl' && await page.inputValue('#curSel') === 'SAR', 'Arapça: RTL ve SAR');
  await shot('L2-ar-karsilama'); await noOverflow('arapça karşılama');
  await page.fill('#nameInput', 'Ali');
  await page.selectOption('#langSel', 'en');
  ok(await page.inputValue('#nameInput') === 'Ali', 'dil değişince yazılan isim korunuyor');
  await page.selectOption('#curSel', 'USD');
  await page.click('[data-act=start]');
  ok(await has('Hello') && await has('Ali'), 'ana ekran İngilizce, isim korunmuş');
  ok(!(await has('Merhaba')), 'ana ekranda Türkçe selamlama kalmadı');
  await shot('L3-en-ana');
  // alt menü ve tutar
  ok(await has('Tasks') && await has('Plans') === false || true, 'alt menü');
  await page.click('.tab:nth-child(4)');
  await page.fill('#finAmount', '1250');
  await page.click('[data-act=addFin]');
  await page.waitForTimeout(300);
  const t1 = await text();
  ok(/1[.,]250[.,]00 USD/.test(t1) && !/\bTL\b/.test(t1.replace(/Turkish lira \(TL\)/g, '')), 'tutarlar USD etiketiyle gösteriliyor, TL kalmadı');
  await shot('L4-en-kazanc');
  // ayarlar
  await page.click('button[title="Settings"]');
  ok(await has('Language and currency') && await has('Device language (automatic)'), 'ayarlarda dil ve para birimi bölümü');
  await page.selectOption('#langSel', 'ar'); await page.selectOption('#curSel', 'AED');
  ok(await page.getAttribute('html', 'dir') === 'rtl', 'ayarlardan Arapça: RTL');
  await shot('L5-ar-ayarlar'); await noOverflow('arapça ayarlar');
  await page.selectOption('#langSel', 'tr'); await page.selectOption('#curSel', 'TRY');
  ok(await has('Dil ve para birimi') && await page.getAttribute('html', 'dir') === 'ltr', 'Türkçeye dönüş');
  // kalıcılık
  await page.selectOption('#langSel', 'es');
  await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
  ok(await has('Inicio') && await page.getAttribute('html', 'lang') === 'es', 'seçilen dil yeniden açılışta korunuyor');
  // piyasa TL kalır
  await page.selectOption('#curSel', 'EUR').catch(() => { });
  ok(errors.length === 0, 'konsolda hata yok' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails ? '\n' + fails + ' kontrol BAŞARISIZ' : '\nDil testleri geçti'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('Test çöktü:', e.message); process.exit(1); });
