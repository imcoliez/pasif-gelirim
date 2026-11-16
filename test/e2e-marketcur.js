// Piyasa: seçili para birimine göre fiyatlar (TRY dışı), canlı geçiş, RUB yedeği, grafikte gezdirme.
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const Core = require('../www/core.js');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }
(async () => {
  const T = Date.now(), DAY = 86400000;
  const base = Core.defaultState(); base.user.name = 'Ali'; base.user.onboarded = true; Core.setPackage(base, 'manual', T);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  async function open(cur, opts) {
    opts = opts || {};
    const st = JSON.parse(JSON.stringify(base)); st.settings.currency = cur; if (opts.lang) st.settings.lang = opts.lang;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'tr-TR' }); const page = await ctx.newPage(); const errs = [], urls = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await page.route(/frankfurter\.dev|binance\.(com|vision)/, async route => {
      const url = route.request().url(), h = { 'access-control-allow-origin': '*', 'content-type': 'application/json' }; urls.push(url);
      if (opts.noRub && url.includes('USDTRUB')) return route.abort();
      if (url.includes('frankfurter')) {
        const rates = {}; for (let i = 40; i >= 0; i--) { const d = new Date(T - i * DAY).toISOString().slice(0, 10); rates[d] = url.includes('symbols=EUR') ? { EUR: 0.9, GBP: 0.8, CHF: 0.88, TRY: 40 } : { TRY: 40 + (40 - i) * 0.05 }; }
        return route.fulfill({ status: 200, headers: h, body: JSON.stringify({ base: 'USD', rates }) });
      }
      const sym = /symbol=(\w+)/.exec(url)[1], lim = +/limit=(\d+)/.exec(url)[1], b = { USDTTRY: [40, 0.05], USDTRUB: [90, 0.1], BTCUSDT: [60000, 100], ETHUSDT: [3000, 10], BNBUSDT: [600, 1], XRPUSDT: [0.5, 0.001], SOLUSDT: [150, 1], PAXGUSDT: [2700, 5] }[sym];
      const rows = []; for (let i = lim - 1; i >= 0; i--) rows.push([T - i * DAY, '0', '0', '0', String(b[0] + (lim - 1 - i) * b[1]), '0']);
      return route.fulfill({ status: 200, headers: h, body: JSON.stringify(rows) });
    });
    await page.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, JSON.stringify(st));
    await page.goto(URL); await page.waitForSelector('.tab');
    await page.click('.tab[data-route="tools"]'); await page.click('#main [data-route="market"]'); await page.waitForSelector('.mkhero', { timeout: 8000 }); await page.waitForTimeout(900);
    return { ctx, page, errs, urls };
  }
  const main = p => p.innerText('#main');

  // TRY: eskisi gibi TL
  let o = await open('TRY'); let t = await main(o.page);
  ok(/TL/.test(await o.page.innerText('.mkprice')) && /Fiyatlar: TRY/.test(t) && t.includes('Tutar (TRY)'), 'TRY: fiyatlar TL, başlıkta para birimi görünüyor');
  ok(!(await o.page.locator('.mkrow', { hasText: 'Türk Lirası' }).count()), 'TRY: Türk Lirası kalemi yok');
  await o.ctx.close();

  // USD
  o = await open('USD'); t = await main(o.page);
  ok(/\$/.test(await o.page.innerText('.mkprice')) && !/TL/.test(await o.page.innerText('.mkhero')), 'USD: hero fiyatı $ cinsinden');
  ok(await o.page.locator('.mkrow', { hasText: 'Türk Lirası' }).count() === 1 && await o.page.locator('.mkrow', { hasText: 'Dolar' }).count() === 0, 'USD: Dolar kalemi yok, Türk Lirası var');
  ok(/Fiyatlar: USD/.test(t) && t.includes('Tutar (USD)') && !/Bir TL tutarı/.test(t), 'USD: tutar etiketi ve açıklamalar para birimine göre');
  const btc = await o.page.locator('.mkrow', { hasText: 'Bitcoin' }).innerText();
  ok(/\$/.test(btc) && !/TL/.test(btc) && /60\.\d{3},00|6\d\.\d{3},\d\d/.test(btc), 'USD: Bitcoin dolar fiyatı (' + btc.replace(/\n/g, ' ') + ')');
  await o.page.fill('#mkAmount', '1000'); await o.page.waitForTimeout(200);
  ok(/Euro/.test(await o.page.innerText('#mkConv')) && !/Dolar/.test(await o.page.innerText('#mkConv')), 'USD: çevirici dolar satırını atlıyor, euro gösteriyor');
  // grafikte gezdirme (yeni para birimiyle)
  await o.page.locator('.mkchart').scrollIntoViewIfNeeded(); await o.page.waitForTimeout(200); const b = await o.page.locator('.mkchart').boundingBox(); await o.page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5); await o.page.waitForTimeout(120);
  const tip = await o.page.evaluate(() => (document.querySelector('.scrubtip') || {}).innerText);
  ok(tip && /\$/.test(tip) && !/TL/.test(tip), 'USD: gezdirme ipucu $ ile: ' + (tip || '').replace(/\n/g, ' | '));
  // canlı geçiş: Ayarlar'dan EUR
  await o.page.click('.top [data-route="settings"]').catch(async () => { await o.page.click('.tab[data-route="account"]'); await o.page.click('#main [data-route="settings"]'); });
  await o.page.waitForSelector('#curSel'); await o.page.selectOption('#curSel', 'EUR'); await o.page.waitForTimeout(300);
  await o.page.click('.tab[data-route="tools"]'); await o.page.click('#main [data-route="market"]'); await o.page.waitForSelector('.mkhero'); await o.page.waitForTimeout(1200);
  t = await main(o.page);
  ok(/€/.test(await o.page.innerText('.mkprice')) && /Fiyatlar: EUR/.test(t) && await o.page.locator('.mkrow', { hasText: 'Euro' }).count() === 0, 'EUR: ayarı değiştirince piyasa euro cinsinden yeniden yüklendi');
  ok(o.errs.length === 0, 'konsolda hata yok ' + o.errs.join('|')); await o.ctx.close();

  // SAR (dolara bağlı): ek kaynak yok
  o = await open('SAR'); t = await main(o.page);
  ok(/SAR/.test(await o.page.innerText('.mkprice')) && /Fiyatlar: SAR/.test(t), 'SAR: fiyatlar SAR cinsinden');
  const usdRow = await o.page.locator('.mkrow', { hasText: 'Dolar' }).innerText();
  ok(/3,75/.test(usdRow), 'SAR: 1 dolar = 3,75 SAR (' + usdRow.replace(/\n/g, ' ') + ')'); await o.ctx.close();

  // RUB var / yok
  o = await open('RUB'); ok(/RUB/.test(await o.page.innerText('.mkprice')) && !(await main(o.page)).includes('şu an alınamadı'), 'RUB: Binance kuru varsa RUB ile gösterilir'); await o.ctx.close();
  o = await open('RUB', { noRub: true }); t = await main(o.page);
  ok(/RUB/.test(t) && t.includes('kuru şu an alınamadı') && /\$/.test(await o.page.innerText('.mkprice')) && /Fiyatlar: USD/.test(t), 'RUB yoksa: dürüst uyarı + USD ile gösterim'); await o.ctx.close();

  // İngilizce + AED: çevrilmiş etiketler
  o = await open('AED', { lang: 'en' }); t = await main(o.page);
  ok(/Prices in: AED/.test(t) && t.includes('Amount (AED)') && /Turkish Lira/.test(t) && !/Fiyatlar|Tutar/.test(t), 'en + AED: etiketler çevrilmiş'); ok(o.errs.length === 0, 'en: konsolda hata yok'); await o.ctx.close();
  await browser.close();
  if (fails) { console.error('\n' + fails + ' kontrol başarısız'); process.exit(1); }
  console.log('\nPiyasa para birimi testleri geçti');
})().catch(e => { console.error(e); process.exit(1); });
