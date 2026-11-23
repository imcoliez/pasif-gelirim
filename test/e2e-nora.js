// Aşama 7: NORA merkezi uçtan uca (gerçek Chromium).
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
  Core.addMemory(st, A.id, 'goal', 'ALFA-ozel-hedef', T - 1000, 'user'); Core.addMemory(st, B.id, 'goal', 'BETA-ozel-hedef', T - 900, 'user');
  Core.addFinance(st, { type: 'in', amount: 777, cat: 'satis', date: new Date().toISOString().slice(0, 10), note: 'eski-kayit', src: A.id }, T);
  st.activeProjectId = A.id;
  const before = { fin: st.finance.length, projects: st.projects.length };
  const raw = JSON.stringify(st);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'tr-TR' });
  const page = await ctx.newPage();
  const errors = [], reqs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url())) reqs.push(r.url()); });
  await page.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await page.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, raw);
  await page.goto(URL); await page.waitForSelector('.tab');
  const settle = () => page.waitForTimeout(400);
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const text = () => page.innerText('#main');
  const click = async sel => { await page.click(sel); await settle(); };
  const say = async t => { await page.fill('#chatInput', t); await page.click('[data-act=send]'); await page.waitForTimeout(1300); };
  const overflow = async l => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok: ' + l);

  ok((await page.$$('.tab')).length === 5, 'beş sekmeli menü korunuyor');
  await click('.tab[data-route=chat]'); let t = await text();
  ok(/NORA/.test(t) && /Düşünür\. Öğrenir\. Planlar\. Geliştirir\./.test(t), 'NORA adı ve sloganı görünüyor');
  ok(!!(await page.$('.nora-logo')), 'NORA logosu var');
  ok(/Alfa Proje/.test(t), 'aktif proje bilgisi görünüyor');
  ok(/Demo yapay zekâ/.test(t) && !/Gerçek yapay zekâ bağlı/.test(t), 'demo durumu açıkça yazıyor');
  ok(/gerçek bir abonelik veya ödeme yoktur/.test(t), 'sahte abonelik/ödeme iddiası yok');
  ok(/Hafıza \(1\)/.test(t), 'hafıza sayısı aktif projeden (Alfa: 1)');
  await overflow('NORA ekranı');
  // sohbet çalışıyor, NORA tanıtır, demo etiketi
  await say('Sen kimsin?'); t = await text();
  ok(/Ben NORA/.test(t) && /Demo yanıt/.test(t), 'sohbet çalışıyor; NORA kendini tanıtıyor ve yanıt demo diye etiketli');
  ok(!/Yapay zekâ yanıtı/.test(t), 'demo yanıt gerçek yapay zekâ gibi etiketlenmedi');
  // hafıza: doğru projeden
  await click('[data-act=go][data-route=memory]'); t = await text();
  ok(/ALFA-ozel-hedef/.test(t) && !/BETA-ozel-hedef/.test(t), 'hafıza ekranı yalnızca Alfa projesinin bilgisini gösteriyor');
  await page.click('.tab[data-route=chat]'); await settle();
  // Görev Merkezi bağlantısı
  await click('.nora-links [data-act=go][data-route=work]'); t = await text();
  ok(/Görev Merkezi/.test(t) && /Alfa Proje/.test(t), 'NORA ekranından Görev Merkezi açılıyor');
  await page.click('.tab[data-route=chat]'); await settle();
  // sohbet çipi: plan taslağı, onay kuralı
  await click('.sugg[data-t="Görev planı hazırla"]'); await page.waitForTimeout(900); t = await text();
  let s = await stored(); const w = s.projects.find(p => p.id === A.id).work;
  ok(/Taslak: onayını bekliyor/.test(t) && w.tasks.length === 6 && w.tasks.every(x => x.status === 'planned'), 'NORA plan taslağı hazırladı; hiçbir görev onaysız başlamadı');
  ok(s.projects.find(p => p.id === B.id).work.tasks.length === 0, 'plan yalnızca aktif projeye bağlandı');
  ok(/Görev Merkezi/.test(await text()) && /6 açık görev|açık görev/.test(await text()), 'görev sayısı NORA ekranında görünüyor');
  await overflow('plan kartlı NORA ekranı');
  // eski kayıtlar korunuyor
  ok(s.finance.length === before.fin && s.projects.length === before.projects && s.finance[0].note === 'eski-kayit', 'eski kayıtlar ve projeler korundu');
  // proje değişince NORA doğru projeyi gösterir (uygulamanın kendi "Aktif yap" eylemiyle; dışarıdan yazılan kayıt sayfa kapanırken ezilir)
  s = await stored(); const betaSeed = Object.assign({}, s, { activeProjectId: B.id });
  const ctx2 = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'tr-TR' }); const pg2 = await ctx2.newPage();
  await pg2.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await pg2.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, JSON.stringify(betaSeed));
  await pg2.goto(URL); await pg2.waitForSelector('.tab'); await pg2.click('.tab[data-route=chat]'); await pg2.waitForTimeout(400);
  t = await pg2.innerText('#main');
  ok(/Beta Proje/.test(t) && /Hafıza \(1\)/.test(t) && /0 açık görev/.test(t), 'Beta aktifken NORA Beta projesini ve kendi hafıza/görev sayısını gösteriyor');
  await ctx2.close();
  // genel sohbet: proje verisi kullanılmaz
  await click('[data-act=chatScope][data-v=general]'); t = await text();
  ok(/Hiçbir projenin hafızası veya verisi kullanılmıyor/.test(t) && !/Görev Merkezi<\/button>/.test(t), 'genel sohbette proje bilgisi/görev bağlantısı yok');
  // ekran boyutları
  for (const [w2, h2] of [[320, 640], [360, 720], [412, 915], [768, 1024]]) { await page.setViewportSize({ width: w2, height: h2 }); await settle(); await overflow('NORA ' + w2 + 'px'); }
  await page.setViewportSize({ width: 360, height: 720 });
  // çeviri
  const enSeed = Object.assign({}, await stored(), {}); enSeed.settings = Object.assign({}, enSeed.settings, { lang: 'en' });
  const ctx3 = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'tr-TR' }); const pg3 = await ctx3.newPage();
  await pg3.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await pg3.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, JSON.stringify(enSeed));
  await pg3.goto(URL); await pg3.waitForSelector('.tab'); await pg3.click('.tab[data-route=chat]'); await pg3.waitForTimeout(400); t = await pg3.innerText('#main'); await ctx3.close();
  ok(/NORA/.test(t) && /Thinks\. Learns\. Plans\. Improves\./.test(t), 'İngilizce: NORA sloganı çevrildi');
  ok(!(reqs.filter(u => !/^file:/.test(u) && !/frankfurter|binance/.test(u)).length), 'dış/ücretli istek gitmedi');
  ok(errors.length === 0, 'konsol/sayfa hatası yok ' + errors.join(' | '));
  await browser.close();
  console.log(fails ? '\n' + fails + ' BAŞARISIZ' : '\nhepsi geçti'); process.exitCode = fails ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
