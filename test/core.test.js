const assert = require('assert');
const C = require('../www/core.js');
const D = require('../www/data.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { console.error('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; }
}

const T0 = new Date(2026, 9, 23, 12, 0, 0).getTime();   // 23 Ekim 2026
const DAY = 86400000;

console.log('Pasif Gelirim - çekirdek testleri');

test('veri: her modelde 7 görev, benzersiz id, plan ve karar var', () => {
  assert.strictEqual(D.MODELS.length, 5);
  D.MODELS.forEach(m => {
    assert.strictEqual(m.tasks.length, 7, m.id);
    assert.strictEqual(new Set(m.tasks.map(t => t.id)).size, 7, m.id);
    assert.ok(m.planIdeas.length >= 6 && m.decisions.length >= 2, m.id);
    assert.ok(m.honest && m.summary, m.id);
  });
});

test('yetkiler: ücretsiz kullanıcı model seçemez ama sohbet ve geçmiş açık', () => {
  const s = C.defaultState();
  const e = C.entitlements(s);
  assert.ok(e.chat && e.history && !e.selectModel && !e.tasks && !e.automation && !e.ceo && !e.narration);
});

test('yetkiler: paket kademeleri', () => {
  const s = C.defaultState();
  C.setPackage(s, 'manual', T0);
  let e = C.entitlements(s);
  assert.ok(e.selectModel && e.tasks && !e.automation && !e.narration && e.canBuyNarration);
  C.buyNarration(s);
  e = C.entitlements(s);
  assert.ok(e.narration && !e.canBuyNarration);
  C.setPackage(s, 'semi', T0);
  e = C.entitlements(s);
  assert.ok(e.automation && !e.ceo && e.narration);
  C.setPackage(s, 'ceo', T0);
  assert.ok(C.entitlements(s).ceo);
});

test('sesli anlatım eklentisi yalnızca Manuel pakette satın alınır', () => {
  const s = C.defaultState();
  assert.strictEqual(C.buyNarration(s), false);
  C.setPackage(s, 'semi', T0);
  assert.strictEqual(C.buyNarration(s), false);
});

test('günlük 1 saat sınırı ve gün değişince sıfırlanma', () => {
  const s = C.defaultState();
  assert.strictEqual(C.remainingSeconds(s, T0), 3600);
  C.addUsage(s, 1000, T0);
  assert.strictEqual(C.remainingSeconds(s, T0), 2600);
  C.addUsage(s, 99999, T0);
  assert.strictEqual(C.remainingSeconds(s, T0), 0);
  assert.strictEqual(C.remainingSeconds(s, T0 + DAY), 3600);
});

test('öneri: bütçesiz, hızlı sonuç isteyen, konuşkan kişiye hızlı modeller çıkar', () => {
  const r = C.recommend({ time: 'mid', money: 'none', skill: 'talk', speed: 'fast' });
  assert.strictEqual(r.length, 5);
  assert.ok(['freelance', 'yerel-hizmet'].includes(r[0].model.id), r[0].model.id);
  const r2 = C.recommend({ time: 'low', money: 'none', skill: 'write', speed: 'slow' });
  assert.ok(r2[0].score >= r2[4].score);
});

test('görevler: tamamlama, ilerleme, sıradaki görev', () => {
  const s = C.defaultState();
  C.setPackage(s, 'manual', T0);
  const p = C.startProject(s, 'sosyal-medya', T0);
  assert.strictEqual(C.progress(p).pct, 0);
  assert.strictEqual(C.nextTask(p).id, 't1');
  assert.ok(C.setTaskDone(s, p.id, 't1', true, T0 + 1000));
  assert.strictEqual(C.progress(p).done, 1);
  assert.strictEqual(C.nextTask(p).id, 't2');
  assert.ok(C.setTaskDone(s, p.id, 't1', false, T0 + 2000));
  assert.strictEqual(C.progress(p).done, 0);
  assert.strictEqual(C.setTaskDone(s, p.id, 'yok', true, T0), false);
});

test('gelir-gider: toplamlar, ay ayrımı, geçersiz tutar reddi', () => {
  const s = C.defaultState();
  assert.ok(C.addFinance(s, { type: 'in', amount: '1500,50', note: 'ilk satış' }, T0));
  assert.ok(C.addFinance(s, { type: 'out', amount: 200, note: 'araç' }, T0));
  assert.ok(C.addFinance(s, { type: 'in', amount: 100, note: 'eski' }, T0 - 40 * DAY));
  assert.strictEqual(C.addFinance(s, { type: 'in', amount: 'abc' }, T0), null);
  assert.strictEqual(C.addFinance(s, { type: 'in', amount: -5 }, T0), null);
  const f = C.financeSummary(s, T0);
  assert.strictEqual(f.totalIn, 1600.5);
  assert.strictEqual(f.totalOut, 200);
  assert.strictEqual(f.net, 1400.5);
  assert.strictEqual(f.monthIn, 1500.5);
  assert.strictEqual(f.monthNet, 1300.5);
  const id = s.finance[0].id;
  assert.ok(C.removeFinance(s, id));
  assert.strictEqual(s.finance.length, 2);
});

test('abonelik iptali: iş kullanıcıda kalır, otomasyon durur, geçmiş açık', () => {
  const s = C.defaultState();
  C.setPackage(s, 'ceo', T0);
  const p = C.startProject(s, 'sosyal-medya', T0);
  C.setTaskDone(s, p.id, 't1', true, T0 + 1);
  C.generatePlan(s, p, 7, T0 + 2);
  C.setPackage(s, 'free', T0 + 3);
  assert.ok(s.cancelledAt);
  const e = C.entitlements(s);
  assert.ok(!e.automation && !e.ceo && !e.selectModel);
  assert.ok(e.tasks, 'mevcut işine manuel devam edebilmeli');
  assert.ok(e.history && e.chat);
  assert.strictEqual(s.projects.length, 1);
});

test('geçmiş: tamamlananlar + yalnızca EN SON yarım kalan proje', () => {
  const s = C.defaultState();
  C.setPackage(s, 'manual', T0);
  const a = C.startProject(s, 'sosyal-medya', T0);
  const b = C.startProject(s, 'freelance', T0 + 10);
  const c = C.startProject(s, 'blog-affiliate', T0 + 20);
  C.setTaskDone(s, a.id, 't1', true, T0 + 100);
  C.setTaskDone(s, b.id, 't1', true, T0 + 200);
  C.setTaskDone(s, c.id, 't1', true, T0 + 300);   // en son çalışılan
  const h = C.history(s);
  assert.strictEqual(h.completed.length, 3);
  assert.strictEqual(h.lastUnfinished.projectId, c.id);
  // tamamen biten proje "yarım kalan" olamaz
  D.MODELS.find(m => m.id === 'blog-affiliate').tasks.forEach(t => C.setTaskDone(s, c.id, t.id, true, T0 + 400));
  const h2 = C.history(s);
  assert.strictEqual(h2.lastUnfinished.projectId, b.id);
  assert.ok(h2.completed.find(x => x.projectId === c.id).projectComplete);
});

test('geçmiş: hiç iş yoksa boş döner', () => {
  const h = C.history(C.defaultState());
  assert.deepStrictEqual(h, { completed: [], lastUnfinished: null });
});

test('otomasyon planı: gün sayısı sınırlanır, haftalık değerlendirme eklenir', () => {
  const s = C.defaultState();
  C.setPackage(s, 'semi', T0);
  const p = C.startProject(s, 'dijital-sablon', T0);
  const plan = C.generatePlan(s, p, 99, T0);
  const gun = plan.text.split('\n').filter(l => l.startsWith('Gün '));
  assert.strictEqual(gun.length, 30);
  assert.ok(plan.text.includes('Hafta değerlendirmesi'));
  assert.strictEqual(s.plans.length, 1);
});

test('CEO kararları: oluşur, tekrar üretilmez, onaylanır', () => {
  const s = C.defaultState();
  C.setPackage(s, 'ceo', T0);
  const p = C.startProject(s, 'freelance', T0);
  const d1 = C.ensureDecisions(s, p, T0);
  assert.strictEqual(d1.length, 2);
  const d2 = C.ensureDecisions(s, p, T0);
  assert.strictEqual(d2.length, 2);
  assert.strictEqual(s.decisions.length, 2);
  assert.ok(C.decide(s, d1[0].id, 'onaylandı', T0));
  assert.strictEqual(C.decide(s, d1[1].id, 'belki', T0), false);
  assert.strictEqual(C.ensureDecisions(s, p, T0).length, 1);
});

test('AI: terim açıklar, otomasyon isteğini ücretsizde reddeder, garanti vermez', () => {
  const free = C.defaultState();
  assert.ok(C.aiReply(free, 'Hedef kitle ne demek?', T0).includes('insan grubu'));
  assert.ok(C.aiReply(free, 'benim için 30 video hazırla ve otomatik yayımla', T0).includes('ücretli paketlerin'));
  assert.ok(C.aiReply(free, 'ne kadar kazanırım, garanti var mı', T0).includes('garanti verilemez'));
  assert.ok(C.aiReply(free, 'eski çalışmalarımı nereden bulurum', T0).includes('↶'));
  const ceo = C.defaultState();
  C.setPackage(ceo, 'ceo', T0);
  assert.ok(C.aiReply(ceo, 'otomatik plan yap', T0).includes('Otomasyon'));
  assert.ok(C.aiReply(free, '   ', T0).length > 0);
});

test('AI: aktif proje varsa sıradaki görevi söyler', () => {
  const s = C.defaultState();
  C.setPackage(s, 'manual', T0);
  C.startProject(s, 'sosyal-medya', T0);
  assert.ok(C.aiReply(s, 'nereden başlayayım', T0).includes('Hedef Kitleni Belirle'));
});

test('migrate: bozuk/eksik veriyi güvenli duruma getirir', () => {
  assert.strictEqual(C.migrate(null).pkg, 'free');
  const m = C.migrate({ pkg: 'saçma', projects: 'x', finance: null });
  assert.strictEqual(m.pkg, 'free');
  assert.ok(Array.isArray(m.projects) && Array.isArray(m.finance));
});

test('dışa aktarma geçerli JSON üretir', () => {
  const s = C.defaultState();
  assert.strictEqual(JSON.parse(C.exportData(s)).pkg, 'free');
});

console.log('\n' + passed + ' test geçti' + (process.exitCode ? ', bazıları BAŞARISIZ' : ''));
