// Grafikte parmakla/fareyle gezdirerek analiz: piyasa, gelir-gider, birikimli net.
const path = require('path'), fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const Core = require('../www/core.js');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }
(async () => {
  const T = Date.now(), DAY = 86400000;
  const st = Core.defaultState(); st.user.name = 'Ali'; st.user.onboarded = true; Core.setPackage(st, 'manual', T);
  for (let i = 0; i < 12; i++) { const d = new Date(T - i * 3 * DAY).toISOString().slice(0, 10); Core.addFinance(st, { type: 'in', amount: 100 + i * 10, cat: 'satis', date: d, note: 'x' }, T); if (i % 2) Core.addFinance(st, { type: 'out', amount: 30 + i, cat: 'diger', date: d, note: 'y' }, T); }
  const raw = JSON.stringify(st);
  fs.mkdirSync(path.resolve(__dirname, '../shots'), { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  async function run(opts, label) {
    const ctx = await browser.newContext(opts); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await page.route(/frankfurter\.dev|binance\.(com|vision)/, async route => {
      const url = route.request().url(), h = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
      if (url.includes('frankfurter')) { const code = /base=(\w+)/.exec(url)[1], rates = {}; for (let i = 40; i >= 0; i--) rates[new Date(T - i * DAY).toISOString().slice(0, 10)] = { TRY: (code === 'USD' ? 40 : 45) + (40 - i) * 0.05 }; return route.fulfill({ status: 200, headers: h, body: JSON.stringify({ base: code, rates }) }); }
      const sym = /symbol=(\w+)/.exec(url)[1], lim = +/limit=(\d+)/.exec(url)[1], b = { USDTTRY: [40, 0.05], BTCUSDT: [60000, 100], ETHUSDT: [3000, 10], BNBUSDT: [600, 1], XRPUSDT: [0.5, 0.001], SOLUSDT: [150, 1], PAXGUSDT: [2700, 5] }[sym];
      const rows = []; for (let i = lim - 1; i >= 0; i--) rows.push([T - i * DAY, '0', '0', '0', String(b[0] + (lim - 1 - i) * b[1]), '0']);
      return route.fulfill({ status: 200, headers: h, body: JSON.stringify(rows) });
    });
    await page.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, raw);
    await page.goto(URL); await page.waitForSelector('.tab'); await page.waitForTimeout(300);
    return { ctx, page, errs };
  }
  const tipOf = page => page.evaluate(() => { const t = document.querySelector('.scrubtip'); return t ? t.innerText : null; });
  const box = (page, sel) => page.locator(sel).first().boundingBox();

  // ---- fare ile (masaüstü) ----
  let { ctx, page, errs } = await run({ viewport: { width: 390, height: 780 }, locale: 'tr-TR' });
  await page.click('.tab[data-route="tools"]'); await page.waitForTimeout(300);
  await page.click('#main [data-route="market"]'); await page.waitForSelector('.mkchart', { timeout: 8000 }); await page.waitForTimeout(1300);
  let b = await box(page, '.mkchart');
  await page.mouse.move(b.x + b.width * 0.1, b.y + b.height * 0.5); await page.waitForTimeout(100);
  const t1 = await tipOf(page);
  ok(t1 && /\d+\.\d+\.\d{4}/.test(t1) && /Fiyat/.test(t1) && /Başlangıca göre/.test(t1) && /TL/.test(t1), 'piyasa: fareyi gezdirince tarih, fiyat ve başlangıca göre değişim görünüyor: ' + (t1 || '').replace(/\n/g, ' | '));
  ok(await page.locator('.mkchart .scrubg .sl').count() === 1, 'piyasa: dikey çizgi çiziliyor');
  await page.mouse.move(b.x + b.width * 0.9, b.y + b.height * 0.5); await page.waitForTimeout(100);
  const t2 = await tipOf(page);
  ok(t2 && t2 !== t1, 'piyasa: başka noktada farklı değer');
  const price = s => parseFloat((/Fiyat\s*\n?\s*([\d.]+,\d+)/.exec(s) || [])[1].replace(/\./g, '').replace(',', '.'));
  ok(price(t2) > price(t1), 'piyasa: fiyat artan seride sağa gidince yüksek (' + price(t1) + ' → ' + price(t2) + ')');
  const tb = await box(page, '.scrubtip'), cb = await box(page, '.mkhero');
  ok(tb.x >= cb.x - 1 && tb.x + tb.width <= cb.x + cb.width + 1, 'piyasa: ipucu kartın dışına taşmıyor');
  await page.screenshot({ path: path.resolve(__dirname, '../shots/scrub-market.png') });
  await page.mouse.move(5, 5); await page.waitForTimeout(150);
  ok((await tipOf(page)) === null, 'piyasa: fare çıkınca ipucu kapanıyor');

  // ---- gelir-gider ve birikimli net ----
  await page.click('.tab[data-route="tools"]'); await page.click('#main [data-route="charts"]'); await page.waitForSelector('.chart[data-scrub]'); await page.waitForTimeout(1200);
  const charts = page.locator('svg.chart[data-scrub]');
  ok(await charts.count() >= 2, 'gelir-gider ve birikimli net grafikleri gezdirilebilir');
  await charts.nth(0).scrollIntoViewIfNeeded(); await page.waitForTimeout(200); b = await charts.nth(0).boundingBox();
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5); await page.waitForTimeout(100);
  const tb1 = await tipOf(page);
  ok(tb1 && /Gelir/.test(tb1) && /Gider/.test(tb1) && /Net/.test(tb1), 'gelir-gider: gelir, gider ve net satırları: ' + (tb1 || '').replace(/\n/g, ' | '));
  await page.mouse.move(5, 5);
  await charts.nth(1).scrollIntoViewIfNeeded(); await page.waitForTimeout(200); b = await charts.nth(1).boundingBox(); await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.5); await page.waitForTimeout(100);
  const tl1 = await tipOf(page);
  ok(tl1 && /Birikimli net/.test(tl1) && /Dönem neti/.test(tl1), 'birikimli net: değer ve dönem neti: ' + (tl1 || '').replace(/\n/g, ' | '));
  ok(await charts.nth(1).locator('.scrubg .sd').evaluate(e => e.style.display !== 'none'), 'birikimli net: çizgi üzerinde nokta işaretleniyor');
  await page.mouse.move(5, 5); await page.waitForTimeout(100);
  // tıklama ile seçim eskisi gibi çalışıyor
  await charts.nth(0).scrollIntoViewIfNeeded(); await page.waitForTimeout(200); b = await charts.nth(0).boundingBox(); await page.mouse.click(b.x + b.width * 0.8, b.y + b.height * 0.5); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelectorAll('.chart .sel').length >= 1), 'dokunup seçme (eski davranış) bozulmadı');
  ok(errs.length === 0, 'konsolda hata yok ' + errs.join('|'));
  await ctx.close();

  // ---- dokunmatik (telefon): basılı tut, sürükle, bırak ----
  ({ ctx, page, errs } = await run({ viewport: { width: 360, height: 740 }, locale: 'tr-TR', hasTouch: true, isMobile: true }));
  await page.click('.tab[data-route="tools"]'); await page.waitForTimeout(300);
  await page.click('#main [data-route="market"]'); await page.waitForSelector('.mkchart', { timeout: 8000 }); await page.waitForTimeout(1300);
  b = await box(page, '.mkchart');
  const cdp = await ctx.newCDPSession(page);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const y0 = b.y + b.height * 0.5;
  await tp('touchStart', b.x + b.width * 0.15, y0); await page.waitForTimeout(80);
  const m1 = await tipOf(page);
  for (let k = 1; k <= 8; k++) { await tp('touchMove', b.x + b.width * (0.15 + 0.08 * k), y0); await page.waitForTimeout(30); }
  const m2 = await tipOf(page);
  ok(m1 && m2 && m1 !== m2, 'telefon: parmak sürüklenince ipucu noktayı izliyor');
  const sy = await page.evaluate(() => window.scrollY);
  await tp('touchEnd'); await page.waitForTimeout(300);
  ok((await tipOf(page)) !== null, 'telefon: bıraktıktan sonra değer okunabilsin diye ipucu kısa süre kalıyor');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'telefon: yatay taşma yok');
  await page.screenshot({ path: path.resolve(__dirname, '../shots/scrub-touch.png') });
  await page.waitForTimeout(2700);
  ok((await tipOf(page)) === null, 'telefon: ipucu birkaç saniye sonra kapanıyor');
  ok(errs.length === 0, 'telefon: konsolda hata yok ' + errs.join('|'));
  await ctx.close();

  // ---- İngilizce: etiketler çevriliyor ----
  ({ ctx, page, errs } = await run({ viewport: { width: 390, height: 780 }, locale: 'en-US' }));
  await page.click('.tab[data-route="tools"]'); await page.click('#main [data-route="charts"]'); await page.waitForSelector('.chart[data-scrub]'); await page.waitForTimeout(1200);
  await page.locator('svg.chart[data-scrub]').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(200); b = await page.locator('svg.chart[data-scrub]').first().boundingBox(); await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5); await page.waitForTimeout(150);
  const en = await tipOf(page);
  ok(en && /Income/.test(en) && /Expense/.test(en) && !/Gelir|Gider/.test(en), 'en: ipucu çevrilmiş: ' + (en || '').replace(/\n/g, ' | '));
  ok(errs.length === 0, 'en: konsolda hata yok ' + errs.join('|'));
  await ctx.close(); await browser.close();
  if (fails) { console.error('\n' + fails + ' kontrol başarısız'); process.exit(1); }
  console.log('\nGezdirme testleri geçti');
})().catch(e => { console.error(e); process.exit(1); });
