// Aşama 10: finans türleri (gelir / diğer gider / mecburi), üç dilimli dağılım, gelir hedefi, görev aşamaları, proje yüzdesi.
const assert = require('assert');
const Core = require('../www/core.js');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n      ')); } }
const T = Date.UTC(2026, 10, 25, 10, 0, 0), DAY = 86400000;
const D = '2026-11-20';
function mk() { const s = Core.defaultState(); s.user.name = 'Ali'; s.user.onboarded = true; return s; }
function sample() {
  const s = mk();
  Core.addFinance(s, { type: 'in', amount: 12500, cat: 'hizmet', date: D }, T);
  Core.addFinance(s, { type: 'out', amount: 800, cat: 'reklam', date: D }, T);
  Core.addFinance(s, { type: 'out', kind: 'must', amount: 5000, cat: 'kira', date: D }, T);
  Core.addFinance(s, { type: 'out', kind: 'must', amount: 700, cat: 'fatura', date: D }, T);
  return s;
}

t('kayıt türü saklanır: yalnızca mecburi harcamada kind alanı olur, diğer gider ve gelirde olmaz', () => {
  const s = sample(); const [a, b, c, d] = s.finance;
  assert.strictEqual(a.kind, undefined); assert.strictEqual(b.kind, undefined); assert.strictEqual(c.kind, 'must'); assert.strictEqual(d.kind, 'must');
  assert.deepStrictEqual(s.finance.map(Core.kindOf), ['in', 'out', 'must', 'must']);
  assert.strictEqual(Core.addFinance(s, { type: 'in', kind: 'must', amount: 5, cat: 'satis' }, T).kind, undefined);   // gelir asla mecburi olamaz
});
t('mecburi kategori doğrulanır: bilinmeyen kategori "Diğer mecburi"ye, mecburi dışı kategori "diğer gider" listesine düşer', () => {
  const s = mk();
  assert.strictEqual(Core.addFinance(s, { type: 'out', kind: 'must', amount: 10, cat: 'reklam' }, T).cat, 'mdiger');
  assert.strictEqual(Core.addFinance(s, { type: 'out', amount: 10, cat: 'kira' }, T).cat, 'diger');
  assert.strictEqual(Core.categoryName('out', 'kira'), 'Kira'); assert.strictEqual(Core.categoryName('out', 'mdiger'), 'Diğer mecburi');
});
t('toplamlar tutarlı: mecburi harcama diğer giderlere ikinci kez girmez; toplam gider = diğer + mecburi', () => {
  const s = sample(); const f = Core.financeSummary(s, T);
  assert.strictEqual(f.totalOut, 6500); assert.strictEqual(f.totalOther, 800); assert.strictEqual(f.totalMust, 5700); assert.strictEqual(f.totalOther + f.totalMust, f.totalOut);
  assert.strictEqual(f.monthMust, 5700); assert.strictEqual(f.monthOther, 800); assert.strictEqual(f.net, 6000); assert.strictEqual(f.monthNet, 6000);
});
t('üç dilimli dağılım: gelir / diğer giderler / mecburi harcamalar doğru, yüzdeler toplamı %100', () => {
  const s = sample(); const b = Core.financeBreakdown(s, 'month', T);
  assert.deepStrictEqual(b.slices.map(x => x.id), ['income', 'other', 'must']); assert.deepStrictEqual(b.slices.map(x => x.amount), [12500, 800, 5700]);
  assert.strictEqual(b.income, 12500); assert.strictEqual(b.other, 800); assert.strictEqual(b.must, 5700); assert.strictEqual(b.totalOut, 6500); assert.strictEqual(b.net, 6000); assert.strictEqual(b.total, 19000);
  assert.ok(Math.abs(b.slices.reduce((a, x) => a + x.pct, 0) - 100) < 1e-9); assert.ok(Math.abs(b.slices[0].pct - 12500 / 19000 * 100) < 1e-9);
  assert.strictEqual(b.empty, false);
});
t('dağılım dönemi: ay dışı ve eski kayıtlar doğru ayrılır', () => {
  const s = sample(); Core.addFinance(s, { type: 'out', kind: 'must', amount: 1000, cat: 'kira', date: '2026-09-05' }, T);
  assert.strictEqual(Core.financeBreakdown(s, 'month', T).must, 5700); assert.strictEqual(Core.financeBreakdown(s, '12m', T).must, 6700); assert.strictEqual(Core.financeBreakdown(s, '30d', T).must, 5700);
});
t('boş durum: kayıt yokken dilimler 0, empty=true, bölme hatası yok', () => {
  const b = Core.financeBreakdown(mk(), 'month', T); assert.strictEqual(b.empty, true); assert.strictEqual(b.total, 0); assert.strictEqual(b.net, 0);
  b.slices.forEach(x => { assert.strictEqual(x.amount, 0); assert.strictEqual(x.pct, 0); assert.ok(isFinite(x.pct)); });
});
t('yalnızca gelir / yalnızca mecburi: tek dilim %100, diğerleri %0', () => {
  const s = mk(); Core.addFinance(s, { type: 'out', kind: 'must', amount: 300, cat: 'fatura', date: D }, T);
  const b = Core.financeBreakdown(s, 'month', T); assert.strictEqual(b.slices[2].pct, 100); assert.strictEqual(b.slices[0].pct, 0); assert.strictEqual(b.net, -300);
});
t('ESKİ KAYITLAR korunur: türsüz giderler "diğer gider" kalır, mecburiye TAHMİN EDİLMEZ (kira gibi görünse bile)', () => {
  const s = mk(); const old = [{ id: 'f1', type: 'out', amount: 4000, cat: 'diger', note: 'kira', date: Date.parse('2026-11-01T12:00:00'), at: T },
    { id: 'f2', type: 'in', amount: 9000, cat: 'satis', note: '', date: Date.parse('2026-11-02T12:00:00'), at: T }, { id: 'f3', type: 'out', amount: 50, cat: 'arac', note: 'fatura', date: Date.parse('2026-11-03T12:00:00'), at: T }];
  const m = Core.migrate(JSON.parse(JSON.stringify(Object.assign({}, s, { finance: old }))));
  assert.strictEqual(m.finance.length, 3); m.finance.forEach(f => assert.strictEqual(f.kind, undefined));
  assert.deepStrictEqual(m.finance.map(Core.kindOf), ['out', 'in', 'out']);
  const f = Core.financeSummary(m, T); assert.strictEqual(f.totalMust, 0); assert.strictEqual(f.totalOther, 4050); assert.strictEqual(f.totalOut, 4050);
  assert.strictEqual(m.finance[0].amount, 4000); assert.strictEqual(m.finance[0].note, 'kira');
});
t('eski kayıt sonradan elle mecburiye alınabilir ve geri alınabilir; tutar/tarih/not korunur', () => {
  const s = mk(); const r = Core.addFinance(s, { type: 'out', amount: 4000, cat: 'diger', note: 'ev', date: D }, T);
  const u = Core.updateFinance(s, r.id, { type: 'out', kind: 'must', amount: 4000, cat: 'kira', note: 'ev', date: D }, T); assert.ok(u); assert.strictEqual(Core.kindOf(u), 'must'); assert.strictEqual(u.cat, 'kira'); assert.strictEqual(u.note, 'ev');
  assert.strictEqual(Core.financeSummary(s, T).totalMust, 4000); assert.strictEqual(Core.financeSummary(s, T).totalOther, 0);
  const v = Core.updateFinance(s, r.id, { type: 'out', amount: 4000, cat: 'diger', note: 'ev', date: D }, T); assert.strictEqual(Core.kindOf(v), 'out'); assert.strictEqual(v.kind, undefined);
  assert.strictEqual(s.finance.length, 1);                                             // kayıt çoğalmadı
});
t('yedek: dışa/içe aktarmada mecburi tür korunur; eski yedek (kind yok) bozulmadan açılır', () => {
  const s = sample(); const res = Core.importData(Core.exportData(s)); assert.ok(res.ok);
  assert.deepStrictEqual(res.state.finance.map(Core.kindOf), ['in', 'out', 'must', 'must']); assert.strictEqual(Core.financeSummary(res.state, T).totalMust, 5700);
  const o = JSON.parse(Core.exportData(s)); o.finance.forEach(f => delete f.kind); const r2 = Core.importData(JSON.stringify(o));
  assert.ok(r2.ok); assert.strictEqual(r2.state.finance.length, 4); assert.strictEqual(Core.financeSummary(r2.state, T).totalMust, 0); assert.strictEqual(Core.financeSummary(r2.state, T).totalOut, 6500);
  const bad = JSON.parse(Core.exportData(s)); bad.finance[0].kind = 'must'; const r3 = Core.importData(JSON.stringify(bad)); assert.strictEqual(r3.state.finance[0].kind, undefined);   // gelir mecburi olamaz
});
t('tekrarlayan mecburi gider (kira): kayıtlar mecburi olarak oluşur', () => {
  const s = mk(); const r = Core.addRecurring(s, { type: 'out', kind: 'must', amount: 5000, cat: 'kira', freq: 'monthly', date: '2026-10-05' }, T);
  assert.ok(r && r.kind === 'must'); Core.applyRecurring(s, T); assert.ok(s.finance.length >= 2); s.finance.forEach(f => { assert.strictEqual(f.kind, 'must'); assert.strictEqual(f.cat, 'kira'); });
  assert.strictEqual(Core.migrate(JSON.parse(JSON.stringify(s))).recurring[0].kind, 'must');
});
t('CSV: tür sütunu Gelir / Gider / Mecburi harcama', () => {
  const csv = Core.exportCsv(sample()); assert.ok(/;"Gelir";/.test(csv) && /;"Gider";/.test(csv) && /;"Mecburi harcama";"Kira";/.test(csv));
});
t('proje bağlı mecburi gider proje giderine girer (mevcut hesap bozulmadı)', () => {
  const s = mk(); Core.startProject(s, 'sosyal-medya', T); const p = s.projects[0];
  Core.addFinance(s, { type: 'out', kind: 'must', amount: 100, cat: 'fatura', date: D, src: p.id }, T); Core.addFinance(s, { type: 'in', amount: 500, cat: 'satis', date: D, src: p.id }, T);
  const x = Core.projectSummary(s, p); assert.strictEqual(x.expense, 100); assert.strictEqual(x.income, 500); assert.strictEqual(x.net, 400);
});

// ---- gelir hedefi: pastadan bağımsız, yalnızca gerçekleşen gelirden ----
t('gelir hedefi: 50.000 hedef / 30.000 gelir = %60, kalan 20.000', () => {
  const s = mk(); Core.setGoal(s, 50000); Core.addFinance(s, { type: 'in', amount: 30000, cat: 'satis', date: D }, T);
  const g = Core.goalProgress(s, T); assert.strictEqual(g.rawPct, 60); assert.strictEqual(g.pct, 60); assert.strictEqual(g.got, 30000); assert.strictEqual(g.left, 20000); assert.strictEqual(g.over, 0); assert.strictEqual(g.reached, false);
});
t('gelir hedefi YALNIZCA geliri sayar: diğer gider ve mecburi harcama sonucu değiştirmez', () => {
  const s = mk(); Core.setGoal(s, 50000); Core.addFinance(s, { type: 'in', amount: 30000, cat: 'satis', date: D }, T);
  const before = JSON.stringify(Core.goalProgress(s, T));
  Core.addFinance(s, { type: 'out', amount: 9000, cat: 'reklam', date: D }, T); Core.addFinance(s, { type: 'out', kind: 'must', amount: 8000, cat: 'kira', date: D }, T);
  assert.strictEqual(JSON.stringify(Core.goalProgress(s, T)), before);
});
t('hedef aşımı: gerçek oran gizlenmez (rawPct>100), pct görsel için %100\'de sınırlı, aşan tutar hesaplanır', () => {
  const s = mk(); Core.setGoal(s, 10000); Core.addFinance(s, { type: 'in', amount: 15000, cat: 'satis', date: D }, T);
  const g = Core.goalProgress(s, T); assert.strictEqual(g.rawPct, 150); assert.strictEqual(g.pct, 100); assert.strictEqual(g.reached, true); assert.strictEqual(g.over, 5000); assert.strictEqual(g.left, 0);
});
t('hedef belirlenmemiş / sıfır: bölme hatası yok, yüzde 0', () => {
  const s = mk(); Core.addFinance(s, { type: 'in', amount: 100, cat: 'satis', date: D }, T);
  const g = Core.goalProgress(s, T); assert.strictEqual(g.target, 0); assert.strictEqual(g.rawPct, 0); assert.strictEqual(g.pct, 0); assert.strictEqual(g.over, 0); assert.strictEqual(g.reached, false); assert.ok(isFinite(g.left));
  Core.setGoal(s, 0);
  assert.strictEqual(Core.goalProgress(s, T).rawPct, 0);
});
t('hedef yalnızca bu ayın gelirine bakar (geçen ayın geliri sayılmaz)', () => {
  const s = mk(); Core.setGoal(s, 1000); Core.addFinance(s, { type: 'in', amount: 900, cat: 'satis', date: '2026-10-10' }, T);
  assert.strictEqual(Core.goalProgress(s, T).got, 0); assert.strictEqual(Core.goalProgress(s, T).rawPct, 0);
});

// ---- görev aşamaları: gerçek durumdan türetilir ----
function taskOf(status, approval, result) { return { status: status, approval: approval || null, result: result || '' }; }
const states = (t) => Core.taskStages(t).steps.map(x => x.state).join(',');
t('aşama göstergesi: onaysız görev 3 aşama (Plan, Hazırlık, Sonuç) — gereksiz "Onay" aşaması yok', () => {
  const g = Core.taskStages(taskOf('planned')); assert.deepStrictEqual(g.steps.map(x => x.label), ['Plan', 'Hazırlık', 'Sonuç']);
  assert.strictEqual(states(taskOf('planned')), 'cur,todo,todo'); assert.strictEqual(states(taskOf('preparing')), 'done,cur,todo'); assert.strictEqual(states(taskOf('active')), 'done,done,cur'); assert.strictEqual(states(taskOf('done')), 'done,done,done');
});
t('aşama göstergesi: onaylı görev 4 aşama; onay bekliyor → Onay aşaması devam eden; onay sonrası Sonuç', () => {
  const A = (st) => ({ state: st });
  assert.deepStrictEqual(Core.taskStages(taskOf('planned', A('none'))).steps.map(x => x.label), ['Plan', 'Hazırlık', 'Onay', 'Sonuç']);
  assert.strictEqual(states(taskOf('planned', A('none'))), 'cur,todo,todo,todo'); assert.strictEqual(states(taskOf('preparing', A('none'))), 'done,cur,todo,todo');
  assert.strictEqual(states(taskOf('awaiting', A('pending'))), 'done,done,cur,todo'); assert.strictEqual(states(taskOf('active', A('approved'))), 'done,done,done,cur');
  assert.strictEqual(states(taskOf('done', A('approved'))), 'done,done,done,done');
});
t('tamamlanan görevde tüm aşamalar yeşil onay (done) ve complete=true; bağlantı çizgileri tam dolu', () => {
  const g = Core.taskStages(taskOf('done', { state: 'approved' })); assert.strictEqual(g.complete, true); assert.strictEqual(g.done, g.total); assert.ok(g.steps.every(x => x.state === 'done'));
});
t('başarısız / iptal: ulaşılan aşama "durdu", sonrası boş; yanlışlıkla tamamlanmış gibi görünmez', () => {
  assert.strictEqual(states(taskOf('cancelled')), 'stop,todo,todo'); assert.strictEqual(states(taskOf('failed', null, 'taslak')), 'done,done,stop');
  assert.strictEqual(states(taskOf('failed', { state: 'pending' }, 'taslak')), 'done,done,stop,todo'); assert.strictEqual(Core.taskStages(taskOf('cancelled')).complete, false);
});
t('gerçek görev motoru: tüm yaşam döngüsü boyunca gösterge motorun gerçek durumunu izler ve durumu DEĞİŞTİRMEZ', () => {
  const s = mk(); Core.startProject(s, 'sosyal-medya', T); const p = s.projects[0];
  const pl = Core.proposePlan(s, p.id, 'Projemi geliştirmek istiyorum', T).plan; Core.decidePlan(s, p.id, pl.id, true, T);
  const ts = Core.tasksOf(s, p.id); const before = JSON.stringify(s);
  ts.forEach(x => { Core.taskStages(x); }); assert.strictEqual(JSON.stringify(s), before);               // salt okunur
  // görevleri sırayla GERÇEK motorla ilerlet; her adımda gösterge durumla uyumlu olmalı
  const get = (id) => Core.tasksOf(s, p.id).find(x => x.id === id);
  let sawAwaiting = false, sawDone = 0;
  ts.forEach(x => {
    const r = Core.prepareTask(s, p.id, x.id, T); if (!r.ok) return;
    let c = get(x.id), g = Core.taskStages(c);
    if (c.status === 'awaiting') { sawAwaiting = true; assert.strictEqual(g.steps[g.current].label, 'Onay'); assert.strictEqual(g.steps[g.current].state, 'cur'); assert.ok(g.steps.slice(0, g.current).every(y => y.state === 'done'));
      assert.ok(Core.approveTask(s, p.id, x.id, c.approval.options[0].id, T).ok); c = get(x.id); g = Core.taskStages(c); }
    if (c.status === 'active') { assert.strictEqual(g.steps[g.current].label, 'Sonuç'); assert.strictEqual(g.steps[g.current].state, 'cur'); assert.ok(Core.completeTask(s, p.id, x.id, undefined, T).ok); c = get(x.id); }
    if (c.status === 'done') { sawDone++; assert.ok(Core.taskStages(c).complete); assert.ok(Core.taskStages(c).steps.every(y => y.state === 'done')); }
  });
  assert.ok(sawAwaiting && sawDone >= 3);
});

// ---- proje yüzdesi: mevcut hesaptan ----
t('proje yüzdesi mevcut Core.progress hesabından gelir (yeni hesap yok)', () => {
  const s = mk(); Core.startProject(s, 'sosyal-medya', T); const p = s.projects[0]; Core.setTaskDone(s, p.id, 't1', true, T); Core.setTaskDone(s, p.id, 't2', true, T);
  const pr = Core.progress(p), x = Core.projectSummary(s, p); assert.strictEqual(x.pct, pr.pct); assert.strictEqual(x.done, pr.done); assert.strictEqual(x.total, pr.total);
  assert.strictEqual(pr.pct, Math.round(pr.done / pr.total * 100));
});
console.log('\n' + (fail ? fail + ' BAŞARISIZ, ' : '') + pass + ' test geçti'); process.exitCode = fail ? 1 : 0;
