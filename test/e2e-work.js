// Aşama 6: görev ve iş akışı motoru uçtan uca (gerçek Chromium, kullanıcı gibi).
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
  Core.addMemory(st, A.id, 'goal', 'ALFA-ONAYLI-HEDEF', T - 1000, 'user'); st.activeProjectId = A.id;
  const raw = JSON.stringify(st);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'tr-TR' });
  const page = await ctx.newPage();
  const errors = [], reqs = []; let accept = true;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => accept ? d.accept() : d.dismiss());
  page.on('request', r => { if (/^https?:/.test(r.url())) reqs.push(r.url()); });
  await page.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await page.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, raw);
  await page.goto(URL); await page.waitForSelector('.tab');
  const settle = () => page.waitForTimeout(400);
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const text = () => page.innerText('#main');
  const tab = async r => { await page.click('.tab[data-route="' + r + '"]'); await settle(); };
  const click = async sel => { await page.click(sel); await settle(); };
  const overflow = async l => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok: ' + l);
  const say = async t => { await page.fill('#chatInput', t); await page.click('[data-act=send]'); await page.waitForTimeout(1300); };
  const work = s => s.projects.find(p => p.id === A.id).work;
  const tabs = await page.$$('.tab'); ok(tabs.length === 5, 'beş sekmeli menü korunuyor');

  // 1. sohbetten plan: genel sohbette plan oluşmaz
  await tab('chat');
  await click('[data-act=chatScope][data-v=general]');
  await say('Dijital ürün satışı projemi geliştirmek istiyorum');
  let t = await text(); let s = await stored();
  ok(/bir projeye bağlı olmalı/.test(t), 'genel sohbette plan yerine yönlendirme mesajı');
  ok(s.projects.every(p => p.work.tasks.length === 0), 'genel sohbette hiç görev oluşmadı');
  // 2. proje sohbetinde plan taslağı
  await click('[data-act=chatScope][data-v=project]');
  await say('Dijital ürün satışı projemi geliştirmek istiyorum');
  t = await text(); s = await stored();
  ok(/Görev planı/.test(t) && /Taslak: onayını bekliyor/.test(t), 'plan kartı taslak olarak görünüyor');
  ok(/Demo yanıt/.test(t) && /gerçek model yazmadı/.test(t), 'demo olduğu açıkça yazıyor');
  ok(work(s).tasks.length === 6 && work(s).tasks.every(x => x.status === 'planned'), 'altı görev Planlandı durumunda');
  ok(s.projects.find(p => p.id === B.id).work.tasks.length === 0, 'diğer projeye görev karışmadı');
  ok(reqs.filter(u => !/^file:/.test(u) && !/frankfurter|binance/.test(u)).length === 0, 'hiçbir ücretli/dış istek gitmedi');
  await overflow('plan kartı');
  // 3. reddet
  await click('[data-act=wkPlanNo]'); s = await stored();
  ok(work(s).tasks.every(x => x.status === 'cancelled') && work(s).plans[0].state === 'rejected', 'plan reddi: görevler iptal, hiçbiri çalışmadı');
  // 4. yeni plan, onayla
  await say('Ürünlerimi büyütmek istiyorum'); await click('[data-act=wkPlanOk]'); s = await stored();
  ok(work(s).plans.some(p => p.state === 'approved'), 'plan onaylandı');
  // 5. görev merkezi
  await click('[data-act=go][data-route=work]'); t = await text();
  ok(/Görev Merkezi/.test(t) && /Alfa Proje/.test(t), 'görev merkezi aktif projeyi gösteriyor');
  ok(/Dış işlemler ve izinler/.test(t) && /Bağlı değil/.test(t), 'dış işlemler bağlı değil diye gösteriliyor');
  await overflow('görev merkezi');
  // ilk onaylı planın ilk görevi
  const first = async () => (await stored()).projects.find(p => p.id === A.id).work.tasks.filter(x => x.status !== 'cancelled');
  let list = await first(); ok(list.length === 6, 'onaylı planın 6 görevi listede');
  const openT = async id => { await click('[data-act=wkOpen][data-id="' + id + '"]'); };
  await openT(list[1].id);
  ok(await page.isDisabled('[data-act=wkPrepare]'), 'bağımlılığı bitmeyen görev başlatılamaz');
  await click('[data-act=wkBack]'); await openT(list[0].id);
  await click('[data-act=wkPrepare]'); t = await text();
  ok(/Devam ediyor/.test(t) && /ALFA-ONAYLI-HEDEF/.test(t), 'hazırlandı; çıktı onaylı hafızayı kullandı');
  ok(/İşlem geçmişi/.test(t) && /Hazırlık başladı/.test(t), 'işlem geçmişi görünüyor');
  await click('[data-act=wkComplete]'); s = await stored();
  ok(work(s).tasks.find(x => x.id === list[0].id).status === 'done', 'görev tamamlandı');
  // 6. ilerle: 2,3 tamamla; 4. görev karar ister
  for (const i of [1, 2]) { await click('[data-act=wkBack]'); await openT(list[i].id); await click('[data-act=wkPrepare]'); await click('[data-act=wkComplete]'); }
  await click('[data-act=wkBack]'); await openT(list[3].id); await click('[data-act=wkPrepare]'); t = await text();
  ok(/Hangi yaklaşımla ilerleyelim/.test(t) && /A: Düşük maliyet/.test(t) && /B: Daha yüksek maliyet/.test(t), 'seçenekler ve etkileri sunuluyor');
  ok(/garantisi yoktur|garanti değildir/.test(t), 'kazanç garantisi verilmiyor');
  ok(await page.isDisabled('[data-act=wkComplete]').catch(() => true), 'onaysız görev tamamlanamaz (düğme yok/pasif)');
  await overflow('onay kartı');
  // 7. reddetme yolu ayrı görevle denenir: önce onayla
  await click('[data-act=wkApprove][data-v=b]'); s = await stored();
  const t3 = work(s).tasks.find(x => x.id === list[3].id);
  ok(t3.status === 'done' && t3.approval.chosen === 'b' && /B/.test(t3.result), 'seçim B plana işlendi, görev tamamlandı');
  // 8. yayımlama: onaylansa bile yapılmaz
  await click('[data-act=wkBack]'); await openT(list[4].id); await click('[data-act=wkPrepare]'); t = await text();
  ok(/Taslakların yayımlanması/.test(t), 'yayımlama onayı isteniyor');
  await click('[data-act=wkApprove]'); t = await text(); s = await stored();
  const t4 = work(s).tasks.find(x => x.id === list[4].id);
  ok(t4.status !== 'done' && t4.external && t4.external.state === 'draft_only', 'yayımlama onaylansa bile yapılmadı, taslak olarak kaldı');
  ok(/Bu işlem yapılmadı/.test(t) && /HİÇBİR İŞLEM YAPILMADI/.test(t), 'ekran yapılmadığını açıkça söylüyor');
  await overflow('harici işlem');
  // 9. elle görev ekle, düzenle, ertele, iptal
  await click('[data-act=wkBack]');
  await page.fill('#wkNewTitle', 'Logo taslağı çiz'); await click('[data-act=wkAdd]'); s = await stored();
  const mine = work(s).tasks.find(x => x.title === 'Logo taslağı çiz'); ok(!!mine && mine.status === 'planned', 'elle görev eklendi');
  await openT(mine.id); await click('[data-act=wkEdit]'); await page.fill('#wkTitle', 'Logo çiz (v2)'); await page.selectOption('#wkPri', 'high'); await click('[data-act=wkSave]');
  s = await stored(); ok(work(s).tasks.find(x => x.id === mine.id).title === 'Logo çiz (v2)' && work(s).tasks.find(x => x.id === mine.id).priority === 'high', 'görev düzenlendi');
  await click('[data-act=wkSnooze][data-v="7"]'); s = await stored(); ok(work(s).tasks.find(x => x.id === mine.id).snoozeUntil > Date.now(), 'görev ertelendi');
  await click('[data-act=wkCancel]'); s = await stored(); ok(work(s).tasks.find(x => x.id === mine.id).status === 'cancelled', 'görev iptal edildi (onay penceresiyle)');
  ok(work(s).tasks.find(x => x.id === mine.id).log.length >= 4, 'geçmiş korundu');
  // 10. kalıcılık: yeniden aç
  const rawBefore = await page.evaluate(k => localStorage.getItem(k), KEY);
  await page.reload(); await page.waitForSelector('.tab'); await settle(); s = await stored();
  const rawAfter = await page.evaluate(k => localStorage.getItem(k), KEY);
  ok(work(s).tasks.length >= 13, 'yeniden açınca görevler kayıp değil' + (work(s).tasks.length < 13 ? ' | anahtarlar: ' + (await page.evaluate(() => Object.keys(localStorage).join(','))) + ' | proje sayısı ' + s.projects.length + ' | önce ' + rawBefore.length + ' sonra ' + rawAfter.length + ' tasks ' + work(s).tasks.length + ' seedMi=' + (rawAfter === raw) : ''));
  await tab('projects'); await settle(); await page.evaluate(() => { }); 
  // 11. başka projede görevler karışmaz (taze bağlamda, B aktifken; dışarıdan yazılan kayıt sayfa kapanırken ezildiği için tohumla)
  const bs = await stored(); bs.activeProjectId = B.id;
  const ctxB = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'tr-TR' }); const pgB = await ctxB.newPage();
  await pgB.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await pgB.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, JSON.stringify(bs));
  await pgB.goto(URL); await pgB.waitForSelector('.tab'); await pgB.click('.tab[data-route=projects]'); await pgB.waitForTimeout(400);
  await pgB.evaluate(() => { var b = document.querySelector('[data-act=go][data-route=work]'); if (b) b.click(); }); await pgB.waitForTimeout(400);
  t = await pgB.innerText('#main'); ok(/Beta Proje/.test(t) && !/Logo çiz/.test(t) && !/Ürünlerimi/.test(t), 'Beta projesinin Görev Merkezi boş; Alfa görevleri görünmüyor'); await ctxB.close();
  ok(errors.length === 0, 'konsol/sayfa hatası yok ' + errors.join(' | '));
  await browser.close();
  console.log(fails ? '\n' + fails + ' BAŞARISIZ' : '\nhepsi geçti'); process.exitCode = fails ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
