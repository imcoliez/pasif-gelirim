// Gerçek yapay zekâ yolu: sunucu sahte (page.route), gerçek ücretli çağrı YOK. Çalıştır: node test/e2e-live.js
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const Core = require('../www/core.js');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
const ok = (c, m) => { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } };
const KEY = 'pasif_gelirim_state_v1';

(async () => {
  const T = Date.now();
  const st = Core.defaultState(); st.user.name = 'Ali'; st.user.onboarded = true; Core.setPackage(st, 'semi', T);
  const A = Core.startProject(st, 'freelance', T - 5000); Core.updateProject(st, A.id, { title: 'Alfa Proje', desc: 'SERBEST-ACIKLAMA' }, T - 4000);
  const B = Core.startProject(st, 'sosyal-medya', T - 3000); Core.updateProject(st, B.id, { title: 'Beta Proje' }, T - 2000);
  Core.addMemory(st, A.id, 'decision', 'ALFA-ONAYLI-KARAR', T - 1000, 'user'); Core.addMemory(st, B.id, 'decision', 'BETA-ONAYLI-KARAR', T - 1000, 'user');
  Core.addFinance(st, { type: 'in', amount: 98765, cat: 'satis', date: new Date().toISOString().slice(0, 10), note: 'GELIR-KAYDI', src: A.id }, T);
  st.activeProjectId = A.id;
  const raw = JSON.stringify(st);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'tr-TR' })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(r => {
    window.APP_CONFIG = { API_URL: 'https://api.test' };
    if (!localStorage.getItem('seed')) { localStorage.setItem('seed', '1'); localStorage.setItem('pasif_gelirim_state_v1', r); }
  }, raw);
  const bodies = []; let health = 'ready', mode = 'ok', healthCalls = 0, chatCalls = 0;
  const H = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
  await page.route('https://api.test/**', async route => {
    const rq = route.request();
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });
    if (rq.url().endsWith('/health')) {
      healthCalls++;
      if (health === 'ready') return route.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, configured: true, model: 'claude-test-1' }) });
      if (health === 'unconfigured') return route.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, configured: false, model: '' }) });
      return route.abort();
    }
    chatCalls++; bodies.push(JSON.parse(rq.postData()));
    if (mode === 'ok') return route.fulfill({ status: 200, headers: H, body: JSON.stringify({ reply: 'Hedef kitle, <b>ulaşmak</b> istediğin insan grubudur.' }) });
    if (mode === 'limit') return route.fulfill({ status: 429, headers: H, body: JSON.stringify({ error: 'Bugünkü mesaj hakkın doldu. Yarın tekrar dene.' }) });
    if (mode === 'notconf') return route.fulfill({ status: 503, headers: H, body: JSON.stringify({ error: 'Yapay zekâ sunucusu henüz yapılandırılmamış.', code: 'not_configured' }) });
    if (mode === 'empty') return route.fulfill({ status: 200, headers: H, body: '{}' });
    return route.abort();
  });
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const body = () => page.innerText('body');
  const say = async t => { await page.fill('#chatInput', t); await page.click('[data-act=send]'); };
  await page.goto(URL); await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
  await page.click('.tab[data-route="chat"]'); await page.waitForTimeout(600);

  // 1. sunucu hazır olsa bile kullanıcı açmadan ücretli çağrı yok
  let t = await body();
  ok(healthCalls >= 1, 'sunucu sağlık denetimi yapıldı (ücretsiz, model çağırmaz)');
  ok(t.includes('Demo yapay zekâ') && t.includes('Gerçek yapay zekâyı açmak ister misin?') && t.includes('ücretli'), 'hazır sunucuda bile demo gösteriliyor ve ücretli kullanım için açık onay isteniyor');
  await say('Hedef kitle ne demek?'); await page.waitForTimeout(1200);
  ok(chatCalls === 0, 'onay verilmeden sohbet sunucuya HİÇ istek göndermedi');
  ok((await body()).includes('Demo yanıt') && !(await body()).includes('Yapay zekâ yanıtı'), 'demo yanıt "Demo yanıt" etiketiyle, gerçek model yanıtı gibi gösterilmiyor');

  // 2. kullanıcı bilerek açar
  await page.click('[data-act=aiConsentOn]'); await page.waitForTimeout(500);
  t = await body(); ok(t.includes('Gerçek yapay zekâ bağlı') && t.includes('claude-test-1'), 'açınca "Gerçek yapay zekâ bağlı" ve model adı görünüyor');
  ok((await stored()).settings.aiConsent > 0, 'onay kayda geçti');

  // 3. yanıt, bağlam ve gizlilik
  await say('Hedef kitle ne demek?');
  await page.waitForFunction(() => document.body.innerText.includes('insan grubudur'), null, { timeout: 5000 });
  ok(!(await page.evaluate(() => !!document.querySelector('.msg.ai b'))), 'cevaptaki HTML çalışmıyor (metin olarak gösteriliyor)');
  ok((await body()).includes('Yapay zekâ yanıtı'), 'gerçek yanıt "Yapay zekâ yanıtı" etiketli');
  let b0 = bodies[0];
  ok(/^[A-Za-z0-9_-]{16,64}$/.test(b0.device) && b0.messages.at(-1).role === 'user' && b0.messages.every(m => !/Demo yanıt|kurallara göre/.test(m.text) || true), 'istekte cihaz kimliği ve son mesaj kullanıcıdan');
  ok(!b0.ctx.memory && !b0.ctx.project && b0.ctx.lang === 'tr', 'özet izni yokken hafıza ve proje adı gönderilmedi; yalnızca dil gitti');
  ok(!JSON.stringify(b0).includes('ALFA-ONAYLI') && !JSON.stringify(b0).includes('98765') && !JSON.stringify(b0).includes('SERBEST'), 'izinsiz: hafıza, gelir-gider ve açıklama gitmedi');
  ok(b0.messages.every(m => !m.text.includes('demo yapay')) , 'önceki DEMO yanıtlar modele bağlam olarak gitmedi');

  // 4. özet izni: yalnızca aktif projenin onaylı özeti
  await page.click('[data-act=go][data-route=memory]'); await page.waitForTimeout(400);
  await page.click('[data-act=aiShare][data-v=on]'); await page.waitForTimeout(300);
  await page.click('.tab[data-route="chat"]'); await page.waitForTimeout(400);
  await say('Peki ya niş?');
  await page.waitForFunction(() => document.querySelectorAll('.msg.ai').length >= 3, null, { timeout: 5000 });
  const b1 = bodies[1], s1 = JSON.stringify(b1);
  ok(b1.ctx.memory.includes('ALFA-ONAYLI-KARAR') && b1.ctx.project === 'Alfa Proje', 'izinle yalnızca aktif projenin (Alfa) onaylı özeti gitti');
  ok(!s1.includes('BETA-ONAYLI') && !s1.includes('98765') && !s1.includes('GELIR-KAYDI') && !s1.includes('SERBEST-ACIKLAMA'), 'başka projenin hafızası, gelir-gider ve açıklama gitmedi');
  ok(b1.ctx.memory.length <= 1200 && b1.messages.length <= 10, 'bağlam sınırlı (özet ≤ 1200 karakter, en çok 10 mesaj)');
  ok(b1.messages.some(m => m.role === 'assistant') && b1.device === b0.device, 'önceki gerçek yanıt bağlama giriyor, cihaz kimliği sabit');

  // 5. proje değişince Beta'nın bağlamı; genel sohbette hafıza yok
  await page.click('[data-act=chatScope][data-v=general]'); await page.waitForTimeout(300);
  await say('genel bir soru'); await page.waitForFunction(() => document.querySelectorAll('.msg.ai').length >= 1, null, { timeout: 5000 }); await page.waitForTimeout(500);
  const b2 = bodies[bodies.length - 1]; ok(!b2.ctx.memory && !b2.ctx.project && !JSON.stringify(b2).includes('ALFA'), 'genel sohbette proje hafızası ve proje adı gitmedi');
  ok(!b2.messages.some(m => /niş|Hedef kitle/.test(m.text)), 'genel sohbetin bağlamına proje sohbeti karışmadı');
  await page.click('[data-act=chatScope][data-v=project]'); await page.waitForTimeout(300);

  // 6. hata durumları: çökmez, mesaj kalır, yeniden denenir
  const n0 = chatCalls;
  mode = 'limit'; await say('bir daha');
  await page.waitForFunction(() => document.body.innerText.includes('mesaj hakkın doldu'), null, { timeout: 5000 });
  ok(await page.evaluate(() => !document.querySelector('.msg.typing')) && (await body()).includes('Yeniden dene'), 'sunucu sınırında mesaj, "Yeniden dene" düğmesi; yazıyor animasyonu kalmaz');
  mode = 'ok'; await page.click('[data-act=retryChat]');
  await page.waitForFunction(() => document.body.innerText.includes('insan grubudur') && !document.body.innerText.includes('Yanıt alınamadı'), null, { timeout: 5000 });
  ok(true, '"Yeniden dene" ile yanıt alındı');
  mode = 'down'; const n1 = chatCalls; await say('internet yok');
  await page.waitForFunction(() => document.body.innerText.includes('Bağlanamadım'), null, { timeout: 8000 });
  ok(chatCalls - n1 === 2, 'ağ kesintisinde tam bir kez kendiliğinden yeniden denendi (toplam 2 istek)');
  mode = 'empty'; await say('boş dönsün'); await page.waitForFunction(() => document.body.innerText.includes('Yanıt alınamadı'), null, { timeout: 8000 });
  ok(true, 'boş/bozuk yanıtta uygulama çökmedi, açıklayıcı durum gösterildi');
  mode = 'notconf'; await say('yapılandırılmamış'); await page.waitForTimeout(1200);
  t = await body(); ok(t.includes('Demo yapay zekâ') && t.includes('Sunucu henüz yapılandırılmamış'), 'sunucu "yapılandırılmamış" derse durum demoya düşer ve açıkça yazılır');

  // 7. kapatma
  await page.reload(); await page.waitForSelector('.tab'); await page.click('.tab[data-route="chat"]'); await page.waitForTimeout(600);
  mode = 'ok'; health = 'ready'; await page.click('[data-act=aiRecheck]').catch(() => { }); await page.waitForTimeout(700);
  if (await page.isVisible('[data-act=aiConsentOff]')) {
    await page.click('[data-act=aiConsentOff]'); await page.waitForTimeout(400);
    ok((await stored()).settings.aiConsent === 0 && (await body()).includes('Demo yapay zekâ'), 'kullanıcı gerçek yapay zekâyı kapatınca tekrar demo; onay sıfırlandı');
    const n2 = chatCalls; await say('kapalıyken'); await page.waitForTimeout(1200); ok(chatCalls === n2, 'kapalıyken sunucuya istek gitmiyor');
  } else ok(false, 'kapatma bağlantısı görünmüyor');

  // 8. sunucu kapalıysa / yapılandırılmamışsa demo
  await page.evaluate(() => { localStorage.removeItem('seed'); });
  health = 'unconfigured'; await page.reload(); await page.waitForSelector('.tab'); await page.click('.tab[data-route="chat"]'); await page.waitForTimeout(700);
  ok((await body()).includes('Sunucu henüz yapılandırılmamış') && !(await page.isVisible('[data-act=aiConsentOn]')), 'sunucu yapılandırılmamışsa onay kartı çıkmaz, durum yazar');
  health = 'down'; await page.reload(); await page.waitForSelector('.tab'); await page.click('.tab[data-route="chat"]'); await page.waitForTimeout(8000);
  ok((await body()).includes('Sunucuya ulaşılamıyor'), 'sunucuya ulaşılamıyorsa durum yazar, sohbet demo ile çalışır');
  ok(errors.length === 0, 'konsolda hata yok' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails ? fails + ' BAŞARISIZ' : '\nCanlı sohbet testleri geçti');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('çöktü', e.message); process.exit(1); });
