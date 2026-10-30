// Canlı sohbet yolu: sunucu sahte (page.route). Çalıştır: node test/e2e-live.js
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
const ok = (c, m) => { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.APP_CONFIG = { API_URL: 'https://api.test' };
    if (!localStorage.getItem('seed')) { localStorage.setItem('seed', '1'); localStorage.setItem('pasif_gelirim_state_v1', JSON.stringify({ user: { name: 'Ali', onboarded: true } })); }
  });
  const bodies = []; let mode = 'ok';
  await page.route('https://api.test/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });
    bodies.push(JSON.parse(route.request().postData()));
    const h = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (mode === 'ok') return route.fulfill({ status: 200, headers: h, body: JSON.stringify({ reply: 'Hedef kitle, <b>ulaşmak</b> istediğin insan grubudur.' }) });
    if (mode === 'limit') return route.fulfill({ status: 429, headers: h, body: JSON.stringify({ error: 'Bugünkü mesaj hakkın doldu. Yarın tekrar dene.' }) });
    return route.abort();
  });
  await page.goto(URL);
  await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
  await page.click('.tab:has-text("Sohbet")');
  ok((await page.innerText('body')).includes('Yanıtlar yapay zekâdan gelir'), 'canlı modda doğru bilgilendirme');
  await page.fill('#chatInput', 'Hedef kitle ne demek?');
  await page.click('[data-act=send]');
  await page.waitForFunction(() => document.body.innerText.includes('insan grubudur'), null, { timeout: 5000 });
  ok(true, 'sunucu cevabı sohbette görünüyor');
  ok(!(await page.evaluate(() => !!document.querySelector('.msg.ai b'))), 'cevaptaki HTML çalışmıyor (metin olarak gösteriliyor)');
  ok(/^[A-Za-z0-9_-]{16,64}$/.test(bodies[0].device) && bodies[0].messages.at(-1).role === 'user', 'istekte cihaz kimliği ve son mesaj kullanıcıdan');
  const dev = bodies[0].device;
  await page.fill('#chatInput', 'Peki ya niş?'); await page.press('#chatInput', 'Enter');
  await page.waitForFunction(() => document.querySelectorAll('.msg.ai').length >= 2, null, { timeout: 5000 });
  ok(bodies[1].messages.length === 3 && bodies[1].messages[1].role === 'assistant' && bodies[1].device === dev, 'sohbet geçmişi gönderiliyor, cihaz kimliği sabit');
  mode = 'limit';
  await page.fill('#chatInput', 'bir daha'); await page.click('[data-act=send]');
  await page.waitForFunction(() => document.body.innerText.includes('mesaj hakkın doldu'), null, { timeout: 5000 });
  ok(await page.evaluate(() => !document.querySelector('.msg.typing')), 'sunucu sınırında mesaj gösterilir, yazıyor animasyonu kalmaz');
  mode = 'down';
  await page.fill('#chatInput', 'internet yok'); await page.click('[data-act=send]');
  await page.waitForFunction(() => document.body.innerText.includes('Bağlanamadım'), null, { timeout: 5000 });
  ok(true, 'bağlantı hatasında anlaşılır uyarı');
  mode = 'ok';
  await page.fill('#chatInput', 'tekrar'); await page.click('[data-act=send]');
  await page.waitForFunction(() => document.querySelectorAll('.msg.ai').length >= 3, null, { timeout: 5000 });
  ok(true, 'hata sonrası yeniden denenebiliyor');
  ok(errors.length === 0, 'konsolda hata yok' + errors.join('|'));
  await browser.close();
  console.log(fails ? fails + ' BAŞARISIZ' : '\nCanlı sohbet testleri geçti');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('çöktü', e.message); process.exit(1); });
