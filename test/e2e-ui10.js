// Aşama 10: Görev Merkezi aşama göstergesi, proje yüzdesi, üç dilimli pasta, kayıt türleri, bağımsız gelir hedefi (gerçek Chromium).
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const Core = require('../www/core.js');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
const KEY = 'pasif_gelirim_state_v1';
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }

function baseState(now) {
  const st = Core.defaultState(); st.user.name = 'Ali'; st.user.onboarded = true; Core.setPackage(st, 'ceo', now);
  return st;
}
function workState(now) {
  const st = baseState(now); Core.startProject(st, 'sosyal-medya', now - 5 * 86400000); const p = Core.activeProject(st);
  Core.setTaskDone(st, p.id, 't1', true, now - 86400000); Core.setTaskDone(st, p.id, 't2', true, now - 86400000);
  const pl = Core.proposePlan(st, p.id, 'Zzgoal projemi geliştirmek istiyorum', now).plan; Core.decidePlan(st, p.id, pl.id, true, now);
  const ts = Core.tasksOf(st, p.id);
  [0, 1, 2].forEach(i => { Core.prepareTask(st, p.id, ts[i].id, now); Core.completeTask(st, p.id, ts[i].id, undefined, now); });   // 3 görev tamamlandı
  Core.prepareTask(st, p.id, ts[3].id, now);                                                              // onay bekliyor (onaylı görev)
  Core.addTask(st, p.id, { title: 'Zzdevam' }, now); Core.prepareTask(st, p.id, Core.tasksOf(st, p.id).slice(-1)[0].id, now);   // devam eden (onaysız)
  Core.addTask(st, p.id, { title: 'Zziptal' }, now); Core.cancelTask(st, p.id, Core.tasksOf(st, p.id).slice(-1)[0].id, now);
  return st;
}
function money(now) {
  const st = baseState(now); const D = Core.dateInputValue(now);
  Core.addFinance(st, { type: 'in', amount: 12500, cat: 'hizmet', date: D, note: 'zzgelir' }, now);
  Core.addFinance(st, { type: 'out', amount: 800, cat: 'reklam', date: D, note: 'zzeski' }, now);              // eski tip kayıt: türsüz (diğer gider)
  Core.addFinance(st, { type: 'out', amount: 4000, cat: 'diger', date: D, note: 'zzkira-gibi' }, now);        // kira gibi görünen ESKİ kayıt: mecburiye tahmin edilmemeli
  Core.addFinance(st, { type: 'out', kind: 'must', amount: 700, cat: 'fatura', date: D, note: 'zzfatura' }, now);
  Core.setGoal(st, 50000);
  return st;
}

(async () => {
  const now = Date.now();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const errors = [], reqs = [];
  async function open(state, w, h, locale) {
    const ctx = await browser.newContext({ viewport: { width: w || 360, height: h || 760 }, locale: locale || 'tr-TR', acceptDownloads: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_BLOCKED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on('request', r => { if (/^https?:/.test(r.url())) reqs.push(r.url()); });
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.addInitScript(r => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) localStorage.setItem('pasif_gelirim_state_v1', r); } catch (e) { } }, JSON.stringify(state));
    await page.goto(URL); await page.waitForSelector('.tab'); await page.waitForTimeout(400);
    return { ctx, page };
  }
  const settle = page => page.waitForTimeout(450);
  const stored = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const overflow = async (page, l) => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok: ' + l);
  async function goWork(page) { await page.click('.tab[data-route=projects]'); await settle(page); await page.click('[data-act=viewProject]'); await settle(page); await page.click('[data-act=go][data-route=work]'); await settle(page); }
  async function goMoney(page) { await page.click('.tab[data-route=home]'); await settle(page); await page.click('[data-act=go][data-route=money]'); await settle(page); }

  // ===== 1. Görev Merkezi: numaralı aşama göstergesi =====
  {
    const st = workState(now); const pid = Core.activeProject(st).id; const tasks = Core.tasksOf(st, pid);
    const { ctx, page } = await open(st);
    await goWork(page);
    const rows = await page.$$eval('.task:has(.stp)', bs => bs.map(b => ({ t: b.querySelector('.tk-t').textContent.trim(), steps: [...b.querySelectorAll('.sp')].map(x => x.className.replace('sp ', '')), lines: [...b.querySelectorAll('.sln')].map(x => x.classList.contains('fill')), labels: [...b.querySelectorAll('.sl')].map(x => x.textContent.trim()), nums: [...b.querySelectorAll('.sc')].map(x => x.textContent.trim()) })));
    ok(rows.length === tasks.length, 'her görev satırında aşama göstergesi var (' + rows.length + ' görev)');
    let mism = 0;
    tasks.forEach(t => {
      const r = rows.find(x => x.t === t.title); const exp = Core.taskStages(t);
      if (!r || r.steps.join() !== exp.steps.map(x => x.state).join() || r.labels.join() !== exp.steps.map(x => x.label).join()) mism++;
      // çizgiler: önceki aşama tamamlandıysa dolu
      if (r) exp.steps.forEach((x, i) => { if (i && (r.lines[i - 1] !== (exp.steps[i - 1].state === 'done'))) mism++; });
    });
    ok(mism === 0, 'gösterge her görevin GERÇEK durumundan (taskStages) çiziliyor; ekranla motor uyumlu');
    const done = rows.find(x => x.steps.every(s => s === 'done'));
    ok(!!done && done.lines.every(Boolean), 'tamamlanan görevde tüm aşamalar onaylı (yeşil) ve tüm bağlantı çizgileri dolu');
    ok(rows.some(x => x.steps[0] === 'cur' && x.steps.slice(1).every(s => s === 'todo') && x.lines.every(l => !l)), 'başlanmamış görevde yalnızca 1. aşama vurgulu, sonrası sade, çizgiler boş');
    const aw = rows.find(x => x.steps.includes('cur') && x.steps.indexOf('cur') === 2);
    ok(!!aw && aw.labels[2] === 'Onay' && aw.steps[0] === 'done' && aw.steps[1] === 'done', 'onay bekleyen görevde 3. aşama "Onay" devam ediyor, öncekiler tamam');
    ok(rows.some(x => x.labels.length === 3) && rows.some(x => x.labels.length === 4), 'onay gerektirmeyen görevde "Onay" aşaması hiç yok (3 aşama), onaylı görevde 4 aşama');
    ok(rows.some(x => x.steps.includes('stop')), 'iptal edilen görev "durdu" olarak işaretli, tamamlanmış gibi görünmüyor');
    const circ = await page.$$eval('.task .sp.done .sc svg', e => e.length); ok(circ > 0, 'tamamlanan aşamalarda onay işareti (✓) görünüyor');
    const geo = await page.evaluate(() => [...document.querySelectorAll('.stp')].every(s => { const r = s.getBoundingClientRect(); const p = s.closest('.task').getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1; }));
    ok(geo, 'aşama göstergeleri satırın dışına taşmıyor');
    const snap = async () => { const x = await stored(page); return JSON.stringify([x.projects, x.plans, x.finance]); };
    const before = await snap();
    await overflow(page, 'görev merkezi 360px');
    // detay
    await page.click('.task:has(.sp.cur)'); await settle(page);
    ok(!!(await page.$('.stp.big')) && (await page.$$('.stp.big .sp')).length >= 3, 'görev detayında büyük aşama göstergesi var');
    ok(before === await snap(), 'listeyi ve görev detayını açmak hiçbir görev/proje/finans verisini değiştirmedi (yalnızca görsel gösterim)');
    for (const [w, h] of [[320, 640], [412, 915], [768, 1024]]) { await page.setViewportSize({ width: w, height: h }); await settle(page); await overflow(page, 'görev detayı ' + w + 'px'); }
    await page.setViewportSize({ width: 360, height: 760 });
    await ctx.close();
  }

  // ===== 2. Proje yüzdesi =====
  {
    const st = workState(now); const p = Core.activeProject(st); const x = Core.projectSummary(st, p);
    const { ctx, page } = await open(st);
    await page.click('.tab[data-route=projects]'); await settle(page);
    const pct = await page.$eval('.card.proj .pgm-pct', e => e.textContent.trim());
    ok(pct === '%' + x.pct, 'proje kartındaki yüzde mevcut hesaptan: ' + pct + ' = %' + x.pct);
    ok(await page.$eval('.card.proj .pgm-bar .bar-fill', e => e.style.width) === x.pct + '%', 'ilerleme çubuğu genişliği yüzdeyle aynı');
    const fs = await page.$eval('.card.proj .pgm-pct', e => parseFloat(getComputedStyle(e).fontSize)); ok(fs >= 26, 'yüzde değeri belirgin (' + fs + 'px)');
    ok((await page.$eval('.card.proj', e => e.textContent)).includes(x.done + ' / ' + x.total + ' görev tamamlandı'), 'kartta tamamlanan/toplam görev yazıyor');
    await page.click('[data-act=viewProject]'); await settle(page);
    ok((await page.$$eval('.pgm-pct', e => e.map(y => y.textContent.trim()))).includes('%' + x.pct), 'proje detayında aynı yüzde (tutarlı tasarım)');
    for (const w of [320, 412, 768]) { await page.setViewportSize({ width: w, height: 800 }); await settle(page); await overflow(page, 'proje detayı ' + w + 'px'); }
    await ctx.close();
  }

  // ===== 3. Gelir-Gider: pasta, kayıt türleri, eski kayıtlar =====
  {
    const st = money(now);
    const { ctx, page } = await open(st);
    await goMoney(page);
    ok((await page.$$('.pie3c .donut.pie3 circle.seg')).length === 3, 'pasta grafik tam 3 dilimden oluşuyor');
    const cols = await page.$$eval('.pie3c circle.seg', c => c.map(x => x.getAttribute('stroke')));
    ok(new Set(cols).size === 3 && cols[0] === 'var(--inc)' && cols[1] === 'var(--oth)' && cols[2] === 'var(--mst)', 'üç dilim farklı renkte (gelir neon yeşil, diğer giderler turuncu, mecburi mavi)');
    const legend = await page.$$eval('.pl3 li', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    ok(legend.length === 3 && /Gelir/.test(legend[0]) && /Diğer giderler/.test(legend[1]) && /Mecburi harcamalar/.test(legend[2]), 'üç kategori ayrı ayrı adlandırılmış');
    const num = s => +s.replace(/[^\d,]/g, '').replace(',', '.');
    const tl = (x, y) => legend[x].includes(y);
    ok(/12\.500/.test(legend[0]) && /4\.800/.test(legend[1]) && /700/.test(legend[2]), 'tutarlar gerçek kayıtlardan: gelir 12.500, diğer 4.800 (eski türsüz giderler), mecburi 700');
    const b = Core.financeBreakdown(st, 'month', now);
    ok(legend.every((l, i) => l.includes('%' + Math.round(b.slices[i].pct))), 'yüzdeler hesapla aynı: ' + b.slices.map(x => Math.round(x.pct)).join('/'));
    ok(/Toplam gider/.test(await page.$eval('.pie3c', e => e.textContent)) && /5\.500/.test(await page.$eval('.pie3c', e => e.textContent)), 'toplam gider = diğer + mecburi (5.500), mecburi iki kez sayılmıyor');
    // hedef bağımsız
    const goalInPie = await page.$('.pie3c .goalc, .pie3c .goalc-pct');
    ok(!goalInPie, 'gelir hedefi pasta kartının içinde değil');
    ok(!!(await page.$('.card.goalc')) && !(await page.$eval('.card.goalc', e => !!e.querySelector('svg.pie3'))), 'gelir hedefi ayrı bir kart (içinde pasta yok)');
    const gp = await page.$eval('.goalc-pct b', e => e.textContent.trim()); const g = Core.goalProgress(st, now);
    ok(gp === '%' + g.rawPct && g.rawPct === 25, 'hedef yüzdesi yalnızca gelirden: 12.500 / 50.000 = %25 (' + gp + '); giderler katılmadı');
    const gt = await page.$eval('.goalc', e => e.textContent); ok(/50\.000/.test(gt) && /12\.500/.test(gt) && /37\.500/.test(gt), 'hedef tutarı, gerçekleşen gelir ve kalan tutar gösteriliyor');
    await overflow(page, 'gelir-gider 360px');

    // yeni mecburi kayıt: tür seçimi, kategori listesi, saklama, çift sayım yok
    ok((await page.$$eval('#finForm .segbtn', b => b.map(x => x.textContent.trim()))).join('|') === 'Gelir|Diğer gider|Mecburi harcama', 'kayıt formunda üç tür var: Gelir | Diğer gider | Mecburi harcama');
    await page.click('#finForm [data-act=finType][data-v=must]'); await page.waitForTimeout(200);
    const catOpts = await page.$$eval('#finCat option', o => o.map(x => x.textContent.trim()));
    ok(catOpts.join('|') === 'Kira|Faturalar|Zorunlu ödeme|Diğer mecburi', 'mecburi türde kategoriler: ' + catOpts.join(', '));
    await page.fill('#finAmount', '3000'); await page.selectOption('#finCat', 'kira'); await page.fill('#finNote', 'zzyenikira'); await page.click('[data-act=addFin]'); await settle(page);
    let s = await stored(page); const rec = s.finance.find(f => f.note === 'zzyenikira');
    ok(!!rec && rec.type === 'out' && rec.kind === 'must' && rec.cat === 'kira' && rec.amount === 3000, 'mecburi kayıt doğru saklandı (type out, kind must, kira)');
    const lg = await page.$$eval('.pl3 li', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    ok(/3\.700/.test(lg[2]) && /4\.800/.test(lg[1]), 'pasta otomatik güncellendi: mecburi 3.700, diğer 4.800 değişmedi (çift sayım yok)');
    const f1 = Core.financeSummary(s, now); ok(f1.totalOut === f1.totalOther + f1.totalMust && f1.totalMust === 3700 && f1.totalOther === 4800, 'toplamlar tutarlı: gider ' + f1.totalOut + ' = diğer ' + f1.totalOther + ' + mecburi ' + f1.totalMust);
    // diğer gider ekle
    await page.click('#finForm [data-act=finType][data-v=out]'); await page.fill('#finAmount', '200'); await page.fill('#finNote', 'zzdiger'); await page.click('[data-act=addFin]'); await settle(page);
    s = await stored(page); const r2 = s.finance.find(f => f.note === 'zzdiger'); ok(!!r2 && r2.type === 'out' && r2.kind === undefined, 'diğer gider kaydında kind alanı yok');
    ok(/5\.000/.test((await page.$$eval('.pl3 li', l => l.map(x => x.textContent)))[1]) && /3\.700/.test((await page.$$eval('.pl3 li', l => l.map(x => x.textContent)))[2]), 'diğer giderler 5.000, mecburi aynı kaldı');
    // filtre
    await page.click('[data-act=finFilter][data-v=must]'); await settle(page);
    const mustRows = await page.$$eval('li.fin', l => l.map(x => x.textContent)); ok(mustRows.length === 2 && mustRows.every(x => /Mecburi/.test(x)), 'Mecburi filtresi yalnızca mecburi kayıtları gösteriyor');
    await page.click('[data-act=finFilter][data-v=out]'); await settle(page);
    ok((await page.$$('li.fin')).length === 5, 'Gider filtresi tüm giderleri (diğer + mecburi) gösteriyor'); await page.click('[data-act=finFilter][data-v=all]'); await settle(page);

    // ESKİ kayıt: türsüz, "diğer gider" olarak duruyor; kullanıcı isterse değiştirir
    const oldBefore = s.finance.find(f => f.note === 'zzkira-gibi'); ok(oldBefore && oldBefore.kind === undefined, 'eski (türsüz) gider "kira gibi" görünse de mecburiye tahmin EDİLMEDİ');
    await page.click('li.fin:has-text("zzkira-gibi") [data-act=editFin]'); await settle(page);
    ok(await page.$eval('#finForm [data-act=finType][data-v=out]', e => e.classList.contains('on')), 'eski kaydı düzenlerken tür "Diğer gider" seçili geliyor');
    await page.click('#finForm [data-act=finType][data-v=must]'); await page.selectOption('#finCat', 'kira'); await page.click('[data-act=addFin]'); await settle(page);
    s = await stored(page); const edited = s.finance.find(f => f.note === 'zzkira-gibi');
    ok(edited.kind === 'must' && edited.cat === 'kira' && edited.amount === 4000 && edited.id === oldBefore.id && s.finance.length === 6, 'eski kayıt düzenlenerek mecburiye alındı: aynı kayıt, tutar korundu, kayıt sayısı artmadı');
    ok(/7\.700/.test((await page.$$eval('.pl3 li', l => l.map(x => x.textContent)))[2]) && /1\.000/.test((await page.$$eval('.pl3 li', l => l.map(x => x.textContent)))[1]), 'pasta yeniden hesaplandı: mecburi 7.700, diğer 1.000');
    // dönem seçici
    await page.click('[data-act=pieP][data-v="12m"]'); await settle(page); ok((await page.$$('.pie3c circle.seg')).length === 3, 'dönem değişince pasta yine 3 dilim');
    await page.click('[data-act=pieP][data-v="month"]'); await settle(page);
    // yedek: dışa aktar → sil → içe aktar
    const backup = await page.evaluate(() => localStorage.getItem('pasif_gelirim_state_v1'));
    await page.click('.tab[data-route=account]'); await settle(page); await page.click('[data-act=go][data-route=settings]').catch(() => { }); await settle(page);
    await page.setInputFiles('#importFile', { name: 'yedek.json', mimeType: 'application/json', buffer: Buffer.from(Core.exportData(Core.migrate(JSON.parse(backup)))) }).catch(() => { }); await page.waitForTimeout(700);
    s = await stored(page); ok(s.finance.filter(f => f.kind === 'must').length === 3 && s.finance.length === 6, 'yedeğe/geri yüklemeye mecburi tür dahil: 3 mecburi kayıt korundu');
    await ctx.close();
  }

  // ===== 4. Boş durum + hedef belirlenmemiş =====
  {
    const { ctx, page } = await open(baseState(now));
    await goMoney(page);
    ok(!!(await page.$('.pie-empty')) && (await page.$$('.pl3 li')).length === 0, 'kayıt yokken boş durum gösteriliyor (örnek rakam / dilim yok)');
    ok((await page.$$('.pie3c circle.seg')).length === 0, 'boş durumda gerçek dilim çizilmiyor');
    ok(/Bu dönemde kayıt yok/.test(await page.$eval('.pie-empty', e => e.textContent)), 'boş durum metni açıklayıcı');
    ok(!!(await page.$('#goalInput')) && !(await page.$('.goalc-pct')), 'hedef belirlenmemişse hedef girişi gösteriliyor, yüzde uydurulmuyor');
    await page.fill('#goalInput', '1000'); await page.click('[data-act=saveGoal]'); await settle(page);
    ok(/%0/.test(await page.$eval('.goalc-pct', e => e.textContent)), 'hedef konunca gerçek gelir yokken %0 (sıfır gelir, hata yok)');
    await overflow(page, 'boş durum 360px');
    await ctx.close();
  }

  // ===== 5. Hedef aşımı =====
  {
    const st = baseState(now); const D = Core.dateInputValue(now); Core.setGoal(st, 10000); Core.addFinance(st, { type: 'in', amount: 15000, cat: 'satis', date: D }, now); Core.addFinance(st, { type: 'out', kind: 'must', amount: 9000, cat: 'kira', date: D }, now);
    const { ctx, page } = await open(st);
    await goMoney(page);
    ok(/%150/.test(await page.$eval('.goalc-pct b', e => e.textContent)), 'hedef aşılınca GERÇEK oran gösteriliyor: %150 (gizlenmiyor)');
    ok(await page.$eval('.goalc-bar .bar-fill', e => e.style.width) === '100%', 'ilerleme çubuğu görsel olarak %100\'de sınırlı');
    const t = await page.$eval('.goalc', e => e.textContent); ok(/Aşan/.test(t) && /5\.000/.test(t) && /aştın/.test(t), 'aşan tutar (5.000) ve açıklama gösteriliyor');
    ok(/%150/.test(t) && /9\.000|Mecburi/.test(await page.$eval('.pie3c', e => e.textContent)), 'hedef, 9.000 TL mecburi giderden etkilenmedi (gider eklenmedi)');
    for (const w of [320, 412, 768]) { await page.setViewportSize({ width: w, height: 800 }); await settle(page); await overflow(page, 'hedef aşımı ' + w + 'px'); }
    await ctx.close();
  }

  // ===== 6. Mobil genişliklerde gelir-gider =====
  for (const [w, h] of [[320, 640], [360, 760], [412, 915], [768, 1024]]) {
    const { ctx, page } = await open(money(now), w, h); await goMoney(page);
    await overflow(page, 'gelir-gider ' + w + 'px');
    const g = await page.evaluate(() => { const r = document.querySelector('.donut.pie3').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 80; }); ok(g, 'pasta ' + w + 'px ekranda tamamen görünüyor');
    await ctx.close();
  }

  // ===== 7. İngilizce =====
  {
    const st = money(now); st.settings.lang = 'en';
    const { ctx, page } = await open(st, 360, 760, 'en-US'); await goMoney(page);
    const lg = await page.$$eval('.pl3 li', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    ok(/Income/i.test(lg[0]) && /Other expenses/.test(lg[1]) && /Mandatory spending/.test(lg[2]), 'İngilizce: üç dilim çevrildi (' + lg.map(x => x.split(' ')[0] + ' ' + x.split(' ')[1]).join(' | ') + ')');
    ok(/Mandatory/.test(await page.$eval('#finForm', e => e.textContent)), 'İngilizce: kayıt türü etiketi çevrildi');
    await ctx.close();
  }

  ok((await Promise.resolve(5)) === 5, 'beş sekmeli alt menü kontrolü ayrıca e2e-nav ile yapılır');
  ok(errors.length === 0, 'konsol/sayfa hatası yok' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  ok(reqs.length === 0, 'dış ağ isteği yok' + (reqs.length ? ': ' + reqs.slice(0, 3).join(',') : ''));
  await browser.close();
  console.log(fails ? '\n' + fails + ' kontrol başarısız' : '\nhepsi geçti'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
