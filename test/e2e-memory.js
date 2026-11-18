// Aşama 4: proje bazlı yapay zekâ hafızası uçtan uca testleri (gerçek Chromium, kullanıcı gibi).
const path = require('path'), fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const Core = require('../www/core.js');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }
const KEY = 'pasif_gelirim_state_v1';

(async () => {
  const T = Date.now();
  const st = Core.defaultState(); st.user.name = 'Ali'; st.user.onboarded = true;
  Core.setPackage(st, 'semi', T);
  const A = Core.startProject(st, 'freelance', T - 5000); Core.updateProject(st, A.id, { title: 'Alfa Proje' }, T - 4000);
  const B = Core.startProject(st, 'sosyal-medya', T - 3000); Core.updateProject(st, B.id, { title: 'Beta Proje' }, T - 2000);
  Core.addMemory(st, B.id, 'goal', 'BETA-ozel-hedef', T - 1000, 'user');
  st.activeProjectId = A.id;
  Core.addFinance(st, { type: 'in', amount: 777, cat: 'satis', date: new Date().toISOString().slice(0, 10), note: 'alfa-kaydi', src: A.id }, T);
  const raw = JSON.stringify(st);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'tr-TR' });
  const page = await ctx.newPage();
  const errors = []; let accept = true; const dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss(); });
  await page.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
  await page.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, raw);
  await page.goto(URL); await page.waitForSelector('.tab');
  const settle = () => page.waitForTimeout(450);
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const text = sel => page.innerText(sel || '#main');
  const tab = async r => { await page.click('.tab[data-route="' + r + '"]'); await settle(); };
  const overflow = async l => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok: ' + l);
  const say = async t => { await page.fill('#chatInput', t); await page.click('[data-act=send]'); await page.waitForTimeout(1300); };
  const mem = (s, id) => s.projects.find(p => p.id === id).memory;

  // ---- 1. sohbet: aktif proje görünür, demo olduğu açıkça yazar ----
  await tab('chat');
  let t = await text();
  ok(t.includes('Konuştuğun proje') && t.includes('Alfa Proje'), 'sohbet ekranında aktif proje (Alfa) belli');
  ok(t.includes('demo yapay zekâ') && t.includes('Gerçek bir yapay zekâ modeli henüz bağlı değil'), 'demo olduğu gizlenmiyor');
  ok(t.includes('cihazında tutulur'), 'hafızanın cihazda tutulduğu yazıyor');
  await overflow('sohbet');

  // ---- 2. sıradan cümle hafızaya öneri çıkarmaz; önemli cümle onay ister, kendiliğinden kaydolmaz ----
  await say('Bugün hava çok güzel ve biraz yürüdüm');
  ok(!(await page.isVisible('.memsug')), 'sıradan cümlede kaydet kartı çıkmıyor');
  await say('Fiyatı 200 yapmaya karar verdim');
  ok(await page.isVisible('.memsug'), 'önemli cümlede "Hafızaya kaydedeyim mi?" kartı çıktı');
  let s = await stored(); ok(mem(s, A.id).items.length === 0 && mem(s, A.id).pending.length === 1, 'onaydan önce kalıcı hafıza boş, öneri beklemede');
  await page.click('[data-act=memDismiss]'); await settle();
  s = await stored(); ok(mem(s, A.id).items.length === 0 && mem(s, A.id).pending.length === 0 && !(await page.isVisible('.memsug')), '"Kaydetme" dersek hiçbir şey saklanmıyor');
  await say('Hedefim ayda 3000 kazanmak olacak');
  await page.click('[data-act=memConfirm]'); await settle();
  s = await stored(); ok(mem(s, A.id).items.length === 1 && mem(s, A.id).items[0].kind === 'goal' && mem(s, A.id).items[0].by === 'chat', '"Kaydet" dersek Alfa hafızasına eklendi (sohbetten onaylandı)');
  ok(mem(s, B.id).items.length === 1 && mem(s, B.id).items[0].text === 'BETA-ozel-hedef', 'Beta hafızası etkilenmedi');

  // ---- 3. hafıza ekranı ----
  await page.click('[data-act=go][data-route=memory]'); await settle();
  t = await text();
  ok(t.includes('Alfa Proje') && t.includes('Hedefim ayda 3000'), 'hafıza ekranı Alfa bilgisini gösteriyor');
  ok(!t.includes('BETA-ozel-hedef'), 'Alfa hafıza ekranında Beta bilgisi görünmüyor');
  ok(t.includes('yalnızca bu cihazda') && t.includes('sunucu'), 'hafızanın cihazda olduğu / sunucuya gitmediği açıklanıyor');
  ok(await page.isVisible('#main [data-act=aiShare]') && (await stored()).settings.aiShareMemory === false, 'sunucuya paylaşım kontrolü var ve varsayılan kapalı');
  await overflow('hafıza');
  // ekleme
  await page.selectOption('#memKind', 'decision'); await page.fill('#memText', 'Önce yalnızca Instagram ile başlayacağım'); await page.click('[data-act=memAdd]'); await settle();
  s = await stored(); ok(mem(s, A.id).items.some(i => i.kind === 'decision' && i.by === 'user'), 'elle bilgi eklendi');
  // hassas bilgi reddi
  await page.fill('#memText', 'Şifrem 123456'); await page.click('[data-act=memAdd]'); await settle();
  s = await stored(); ok(mem(s, A.id).items.length === 2 && (await page.innerText('body')).includes('hassas bilgiler'), 'şifre benzeri bilgi reddedildi ve nedeni söylendi');
  // düzenleme
  await page.locator('#main .mem', { hasText: 'Instagram' }).locator('[data-act=memEdit]').click(); await settle();
  await page.fill('#memEditText', 'Önce TikTok ile başlayacağım'); await page.click('[data-act=memEditSave]'); await settle();
  s = await stored(); ok(mem(s, A.id).items.some(i => i.text === 'Önce TikTok ile başlayacağım') && !mem(s, A.id).items.some(i => /Instagram/.test(i.text)), 'bilgi düzenlendi');
  // eski say
  await page.locator('#main .mem', { hasText: 'TikTok' }).locator('[data-act=memOld]').click(); await settle();
  s = await stored(); ok(mem(s, A.id).items.find(i => /TikTok/.test(i.text)).old === true, '"Eski say" çalışıyor (silmeden bağlam dışı bırakır)');
  // silme: iptal edilirse kalır
  accept = false; await page.locator('#main .mem', { hasText: 'TikTok' }).locator('[data-act=memDel]').click(); await settle();
  s = await stored(); ok(mem(s, A.id).items.length === 2, 'silme onayı reddedilince bilgi korunuyor');
  accept = true; await page.locator('#main .mem', { hasText: 'TikTok' }).locator('[data-act=memDel]').click(); await settle();
  s = await stored(); ok(mem(s, A.id).items.length === 1, 'onaylanınca bilgi silindi');

  // ---- 4. proje değişince hafıza ve sohbet ayrılıyor ----
  await tab('chat');
  ok(!(await text('#chatBox')).includes('BETA'), 'Alfa sohbetinde Beta içeriği yok');
  const alfaChat = (await text('#chatBox')).includes('Fiyatı 200');
  ok(alfaChat, 'Alfa sohbet geçmişi Alfa ekranında');
  await tab('projects');
  await page.locator('#main .card.proj', { hasText: 'Beta Proje' }).first().locator('[data-act=switchProject]').click(); await settle();
  await tab('chat');
  t = await text(); ok(t.includes('Beta Proje') && !t.includes('Alfa Proje'), 'proje değişince sohbet başlığı Beta oldu');
  ok(!(await text('#chatBox')).includes('Fiyatı 200') && !(await text('#chatBox')).includes('3000'), 'Beta sohbetinde Alfa mesajları görünmüyor');
  await page.click('[data-act=go][data-route=memory]'); await settle();
  t = await text(); ok(t.includes('BETA-ozel-hedef') && !t.includes('Hedefim ayda 3000'), 'Beta hafızasında yalnızca Beta bilgisi var');
  await say('projemi özetle').catch(() => { });
  await tab('chat'); await say('bu projemle ilgili ne biliyorsun');
  t = await text('#chatBox'); ok(t.includes('Beta Proje') && t.includes('BETA-ozel-hedef') && !t.includes('777') && !t.includes('3000'), 'yanıt yalnızca Beta bilgisini söylüyor, Alfa\'yı karıştırmıyor');
  ok(t.includes('Demo yapay zekâ'), 'özet yanıtı demo olduğunu belirtiyor');

  // ---- 5. genel sohbet: hiçbir proje hafızası kullanılmaz ----
  await page.click('[data-act=chatScope][data-v=general]'); await settle();
  t = await text(); ok(t.includes('Genel sohbet') && t.includes('Hiçbir projenin hafızası'), 'genel sohbette proje hafızası kullanılmadığı yazıyor');
  await say('Fiyatı 200 yapmaya karar verdim');
  ok(!(await page.isVisible('.memsug')), 'genel sohbette hafıza önerisi çıkmıyor');
  await page.click('[data-act=chatScope][data-v=project]'); await settle();

  // ---- 6. temizleme: onay ister, yalnızca o projeyi etkiler ----
  await tab('chat'); await page.click('[data-act=go][data-route=memory]'); await settle();
  accept = false; await page.click('[data-act=memClear]'); await settle();
  s = await stored(); ok(mem(s, B.id).items.length === 1, 'temizleme onayı reddedilince hafıza duruyor');
  accept = true; dialogs.length = 0; await page.click('[data-act=memClear]'); await settle();
  s = await stored(); ok(mem(s, B.id).items.length === 0 && mem(s, A.id).items.length === 1, 'onayla Beta temizlendi, Alfa hafızası durdu');
  ok(dialogs.some(d => d.includes('geri alınamaz')), 'onay metni geri alınamayacağını söylüyor');
  ok(s.finance.length === 1 && s.projects.length === 2 && s.chat.length > 0, 'gelir-gider, projeler ve sohbet geçmişi silinmedi');

  // ---- 7. yeniden açılış: hafıza kalıcı ----
  await page.reload(); await page.waitForSelector('.tab'); await settle();
  s = await stored(); ok(mem(s, A.id).items.length === 1 && s.activeProjectId === B.id, 'yeniden açılınca hafıza ve seçili proje korundu');

  // ---- 8. yedek dosyası hafızayı içerir ----
  ok(JSON.stringify(Core.importData(JSON.stringify(s)).state.projects.find(p => p.id === A.id).memory.items.map(i => i.kind)) === '["goal"]', 'kayıttan geri yükleme hafızayı koruyor');

  // ---- 9. arşivlenen projenin hafızası ----
  await tab('projects');
  await page.locator('#main .card.proj', { hasText: 'Alfa Proje' }).first().locator('[data-act=viewProject]').click(); await settle();
  await page.click('[data-act=archiveProject]').catch(() => { }); await settle();
  s = await stored(); const ar = s.projects.find(p => p.id === A.id);
  ok(ar.status === 'archived' && ar.memory.items.length === 1, 'arşivlenen projenin hafızası saklanıyor');
  await tab('chat'); t = await text(); ok(t.includes('Beta Proje') && !t.includes('Alfa Proje'), 'arşivdeki proje sohbet bağlamı olmuyor');
  await overflow('sohbet (son)');

  ok(errors.length === 0, 'konsolda hata yok' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log('\n' + (fails ? fails + ' BAŞARISIZ' : 'e2e hafıza testleri geçti')); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
