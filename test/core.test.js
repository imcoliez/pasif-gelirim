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

// ---------- v0.2: kazanç herkese açık, grafikler, hedef, seri, tema ----------

test('kazanç ve grafikler ücretsiz pakette de açık', () => {
  assert.strictEqual(C.entitlements(C.defaultState()).finance, true);
});

test('kayıt: tarih ve kategori doğrulanır, gelecek tarih reddedilir', () => {
  const s = C.defaultState();
  const r = C.addFinance(s, { type: 'in', amount: 100, cat: 'satis', date: '2026-10-20' }, T0);
  assert.ok(r);
  assert.strictEqual(r.cat, 'satis');
  assert.strictEqual(C.dateInputValue(r.date), '2026-10-20');
  assert.strictEqual(C.addFinance(s, { type: 'in', amount: 5, date: '2026-10-25' }, T0), null, 'gelecek');
  assert.strictEqual(C.addFinance(s, { type: 'in', amount: 5, date: '2026-02-31' }, T0), null, 'geçersiz gün');
  assert.strictEqual(C.addFinance(s, { type: 'in', amount: 5, date: 'abc' }, T0), null);
  assert.ok(C.addFinance(s, { type: 'in', amount: 5, date: '2026-10-23' }, T0), 'bugün olur');
  assert.strictEqual(C.addFinance(s, { type: 'out', amount: 5, cat: 'satis' }, T0).cat, 'diger', 'gider için geçersiz kategori');
  assert.strictEqual(C.addFinance(s, { type: 'in', amount: 1e12 }, T0), null);
});

test('grafik serisi: 7 gün, 30 gün, 12 ay kova sayıları ve toplamlar', () => {
  const s = C.defaultState();
  C.addFinance(s, { type: 'in', amount: 300, date: '2026-10-23' }, T0);
  C.addFinance(s, { type: 'out', amount: 100, date: '2026-10-23' }, T0);
  C.addFinance(s, { type: 'in', amount: 50, date: '2026-10-20' }, T0);
  C.addFinance(s, { type: 'in', amount: 1000, date: '2026-01-05' }, T0);      // 7 günden önce
  const w = C.financeSeries(s, '7d', T0);
  assert.strictEqual(w.buckets.length, 7);
  assert.strictEqual(w.totals.in, 350);
  assert.strictEqual(w.totals.out, 100);
  assert.strictEqual(w.totals.net, 250);
  const last = w.buckets[6];
  assert.strictEqual(last.in, 300); assert.strictEqual(last.out, 100); assert.strictEqual(last.net, 200);
  assert.strictEqual(w.buckets[0].cum, 1000, 'birikim dönem öncesini içerir');
  assert.strictEqual(last.cum, 1250);
  assert.strictEqual(w.max, 300);
  assert.strictEqual(C.financeSeries(s, '30d', T0).buckets.length, 30);
  const y = C.financeSeries(s, '12m', T0);
  assert.strictEqual(y.buckets.length, 12);
  assert.strictEqual(y.totals.in, 1350);
  assert.strictEqual(y.buckets[11].label, 'Eki');
  assert.strictEqual(y.buckets[0].label, 'Kas');
  assert.ok(!w.empty);
  assert.ok(C.financeSeries(C.defaultState(), '7d', T0).empty);
  assert.strictEqual(C.financeSeries(s, 'saçma', T0).buckets.length, 7, 'bilinmeyen dönem 7 güne düşer');
});

test('kategori dağılımı: yüzdeler 100 eder, büyükten küçüğe', () => {
  const s = C.defaultState();
  C.addFinance(s, { type: 'in', amount: 300, cat: 'satis', date: '2026-10-22' }, T0);
  C.addFinance(s, { type: 'in', amount: 100, cat: 'hizmet', date: '2026-10-21' }, T0);
  C.addFinance(s, { type: 'in', amount: 600, cat: 'satis', date: '2026-10-01' }, T0);   // 7 gün dışı
  const w = C.categorySplit(s, 'in', '7d', T0);
  assert.strictEqual(w.total, 400);
  assert.strictEqual(w.items[0].id, 'satis');
  assert.strictEqual(Math.round(w.items.reduce((a, b) => a + b.pct, 0)), 100);
  assert.strictEqual(C.categorySplit(s, 'in', '30d', T0).total, 1000);
  assert.deepStrictEqual(C.categorySplit(s, 'out', '7d', T0), { items: [], total: 0 });
});

test('aylık hedef: ilerleme, tamamlanma, geçersiz değer', () => {
  const s = C.defaultState();
  assert.strictEqual(C.goalProgress(s, T0).pct, 0);
  assert.ok(C.setGoal(s, '1000,5'));
  assert.strictEqual(s.goal.monthly, 1000.5);
  C.addFinance(s, { type: 'in', amount: 500, date: '2026-10-10' }, T0);
  let g = C.goalProgress(s, T0);
  assert.strictEqual(g.pct, 50); assert.ok(!g.reached); assert.strictEqual(g.left, 500.5);
  C.addFinance(s, { type: 'in', amount: 600, date: '2026-10-11' }, T0);
  g = C.goalProgress(s, T0);
  assert.ok(g.reached); assert.strictEqual(g.pct, 100); assert.strictEqual(g.left, 0);
  C.addFinance(s, { type: 'in', amount: 9999, date: '2026-09-11' }, T0);        // geçen ay sayılmaz
  assert.strictEqual(C.financeSummary(s, T0).monthIn, 1100);
  assert.strictEqual(C.setGoal(s, -5), false);
  assert.strictEqual(C.setGoal(s, 'abc'), false);
  assert.strictEqual(s.goal.monthly, 1000.5);
});

test('seri: ardışık günler, bugün boşsa dünden sayar, kopunca sıfırlanır', () => {
  const s = C.defaultState();
  assert.deepStrictEqual(C.streak(s, T0), { current: 0, best: 0, activeToday: false });
  C.addFinance(s, { type: 'in', amount: 1 }, T0 - 2 * DAY);
  C.addFinance(s, { type: 'in', amount: 1 }, T0 - 1 * DAY);
  let st = C.streak(s, T0);
  assert.strictEqual(st.current, 2); assert.ok(!st.activeToday);
  C.addFinance(s, { type: 'in', amount: 1 }, T0);
  st = C.streak(s, T0);
  assert.strictEqual(st.current, 3); assert.ok(st.activeToday);
  assert.strictEqual(C.streak(s, T0 + 3 * DAY).current, 0, 'iki gün boş geçince seri biter');
  assert.strictEqual(C.streak(s, T0 + 3 * DAY).best, 3);
  // sohbet ve görev de seriyi sürdürür
  const s2 = C.defaultState();
  C.setPackage(s2, 'manual', T0);
  const p = C.startProject(s2, 'freelance', T0);
  C.setTaskDone(s2, p.id, 't1', true, T0 - DAY);
  s2.chat.push({ role: 'user', text: 'merhaba', at: T0 });
  assert.strictEqual(C.streak(s2, T0).current, 2);
});

test('rozetler: koşullar sağlanınca kazanılır', () => {
  const s = C.defaultState();
  const get = id => C.badges(s, T0).find(b => b.id === id).earned;
  assert.ok(!get('first-task') && !get('first-record') && !get('first-income') && !get('goal'));
  C.addFinance(s, { type: 'out', amount: 10 }, T0);
  assert.ok(get('first-record') && !get('first-income'));
  C.addFinance(s, { type: 'in', amount: 10 }, T0);
  assert.ok(get('first-income'));
  C.setGoal(s, 5); assert.ok(get('goal'));
  C.setPackage(s, 'manual', T0);
  const p = C.startProject(s, 'freelance', T0);
  C.setTaskDone(s, p.id, 't1', true, T0);
  assert.ok(get('first-task') && !get('project'));
  D.MODELS.find(m => m.id === 'freelance').tasks.forEach(t => C.setTaskDone(s, p.id, t.id, true, T0));
  assert.ok(get('project'));
});

test('tema: geçerli değerler kabul, eski kayıt varsayılana düşer', () => {
  const s = C.defaultState();
  assert.strictEqual(s.settings.theme, 'dark');
  assert.ok(C.setTheme(s, 'light') && s.settings.theme === 'light');
  assert.ok(C.setTheme(s, 'system'));
  assert.strictEqual(C.setTheme(s, 'pembe'), false);
  assert.strictEqual(s.settings.theme, 'system');
  const old = C.migrate({ pkg: 'free', finance: [{ id: 'x', type: 'in', amount: 5, date: T0 }] });
  assert.strictEqual(old.settings.theme, 'dark');
  assert.strictEqual(old.finance[0].cat, 'diger');
  assert.strictEqual(C.migrate({ settings: { theme: 'pembe' } }).settings.theme, 'dark');
  assert.strictEqual(C.migrate({ goal: { monthly: -3 } }).goal.monthly, 0);
});

test('CSV: başlık, Türkçe ondalık, tırnak ve formül enjeksiyonu', () => {
  const s = C.defaultState();
  C.addFinance(s, { type: 'in', amount: '12,5', cat: 'satis', note: '=HYPERLINK("x")', date: '2026-10-22' }, T0);
  C.addFinance(s, { type: 'out', amount: 3, note: 'a "b" c', date: '2026-10-21' }, T0);
  const csv = C.exportCsv(s);
  assert.ok(csv.startsWith('﻿Tarih;Tür;Kategori;Tutar (TL);Not'));
  const lines = csv.split('\r\n');
  assert.strictEqual(lines.length, 3);
  assert.ok(lines[1].includes('"Gider"'), 'tarihe göre sıralı');
  assert.ok(lines[1].includes('"a ""b"" c"'));
  assert.ok(lines[2].includes('"12,5"'));
  assert.ok(lines[2].includes('"\'=HYPERLINK'), 'formül başındaki = etkisizleştirildi');
});

test('AI: kazanç ve grafik sorusu Kazanç sekmesine yönlendirir, "hedef kitle" karışmaz', () => {
  const s = C.defaultState();
  assert.ok(C.aiReply(s, 'grafiklerimi nerede görürüm', T0).includes('Kazanç sekmesinden'));
  assert.ok(C.aiReply(s, 'Hedef kitle ne demek?', T0).includes('insan grubu'));
  assert.ok(C.chatSuggestions(s).length === 4);
  C.chatSuggestions(s).forEach(q => assert.ok(C.aiReply(s, q, T0).length > 30, 'öneri cevabı var: ' + q));
  assert.ok(C.aiReply(s, 'Garanti kazanç var mı?', T0).includes('garanti verilemez'), 'garanti sorusu kazanç yönlendirmesine karışmaz');
  assert.ok(C.aiReply(s, 'Kazancımı nasıl takip ederim?', T0).includes('Kazanç sekmesinden'));
});

// ---------- v0.3: tanıtım, kilit, hatırlatıcı, yedek, özet ----------

test('varsayılanlar ve eski kayıt göçü: tanıtım, hatırlatıcı, kilit', () => {
  const s = C.defaultState();
  assert.strictEqual(s.user.onboarded, false);
  assert.deepStrictEqual(s.settings.reminder, { enabled: false, time: '20:00' });
  assert.strictEqual(s.lock.enabled, false);
  assert.strictEqual(C.migrate({ user: { name: 'Ali' } }).user.onboarded, true, 'adı olan eski kullanıcı tanıtımı atlar');
  assert.strictEqual(C.migrate({ user: { name: '' } }).user.onboarded, false);
  assert.strictEqual(C.migrate({ settings: { reminder: { enabled: true, time: '25:99' } } }).settings.reminder.time, '20:00');
  assert.strictEqual(C.migrate({ lock: { enabled: true, salt: '', hash: '' } }).lock.enabled, false, 'özetsiz kilit açık sayılmaz');
  assert.strictEqual(C.migrate({ lock: { enabled: true, salt: 's', hash: 'h' } }).lock.enabled, true);
});

test('hatırlatıcı: geçerli saat kabul, geçersiz reddedilir', () => {
  const s = C.defaultState();
  assert.ok(C.setReminder(s, true, '08:30'));
  assert.deepStrictEqual(s.settings.reminder, { enabled: true, time: '08:30' });
  assert.strictEqual(C.setReminder(s, true, '8:30'), false);
  assert.strictEqual(C.setReminder(s, true, '24:00'), false);
  assert.strictEqual(s.settings.reminder.time, '08:30');
  assert.ok(C.setReminder(s, false, null));
  assert.strictEqual(s.settings.reminder.enabled, false);
  assert.strictEqual(s.settings.reminder.time, '08:30');
});

test('kilit: PIN biçimi, kaydetme, kaldırma; yedeğe kilit bilgisi girmez', () => {
  const s = C.defaultState();
  assert.ok(C.isValidPin('0420') && !C.isValidPin('123') && !C.isValidPin('12345') && !C.isValidPin('12a4'));
  assert.strictEqual(C.setLock(s, '', 'x'), false);
  assert.ok(C.setLock(s, 'salt', 'hash'));
  assert.ok(s.lock.enabled);
  assert.ok(!C.exportData(s).includes('"hash"') && !C.exportData(s).includes('"lock"'), 'dışa aktarmada kilit yok');
  C.clearLock(s);
  assert.deepStrictEqual(s.lock, { enabled: false, salt: '', hash: '' });
});

test('yedek içe aktarma: gidiş-dönüş, bozuk dosya, geçersiz kayıt ayıklama', () => {
  const s = C.defaultState();
  s.user.name = 'Ali';
  C.setPackage(s, 'manual', T0);
  const p = C.startProject(s, 'freelance', T0);
  C.setTaskDone(s, p.id, 't1', true, T0);
  C.addFinance(s, { type: 'in', amount: 120, cat: 'satis', note: 'x', date: '2026-10-20' }, T0);
  const r = C.importData(C.exportData(s));
  assert.ok(r.ok);
  assert.strictEqual(r.state.user.name, 'Ali');
  assert.strictEqual(r.state.finance.length, 1);
  assert.strictEqual(r.state.finance[0].amount, 120);
  assert.strictEqual(r.state.projects.length, 1);
  assert.strictEqual(r.state.activeProjectId, p.id);
  assert.strictEqual(r.counts.finance, 1);
  assert.strictEqual(C.importData('').ok, false);
  assert.strictEqual(C.importData('{bozuk').ok, false);
  assert.strictEqual(C.importData('[1,2]').ok, false);
  assert.strictEqual(C.importData('{"foo":1}').ok, false);
  assert.strictEqual(C.importData('x'.repeat(6 * 1024 * 1024)).ok, false, 'çok büyük dosya');
  const dirty = JSON.stringify({
    finance: [
      { id: 'a', type: 'in', amount: 5, date: T0 }, { id: 'b', type: 'zzz', amount: 5, date: T0 },
      { id: 'c', type: 'out', amount: -4, date: T0 }, { id: 'd', type: 'out', amount: 'x', date: T0 },
      { id: 'e', type: 'out', amount: 7, date: 'yok' }, null, 'metin'
    ],
    projects: [{ modelId: 'yok', tasks: {} }, { modelId: 'freelance', tasks: {} }, { modelId: 'freelance' }]
  });
  const d = C.importData(dirty);
  assert.ok(d.ok);
  assert.deepStrictEqual(d.state.finance.map(f => f.id), ['a']);
  assert.strictEqual(d.state.projects.length, 2, 'bilinmeyen modelli proje atılır, görevi eksik ama modeli geçerli proje onarılır');
  assert.ok(d.state.projects.every(p => p.modelId === 'freelance' && typeof p.tasks === 'object'));
  assert.ok(d.state.finance[0].cat === 'diger' && d.state.finance[0].at);
  assert.ok(C.importData(C.exportCsv(s)).ok === false, 'CSV yedek olarak kabul edilmez');
});

test('aylık özet: bu ay / geçen ay, en çok kategori, tasarruf oranı', () => {
  const s = C.defaultState();
  assert.strictEqual(C.insights(s, T0).hasData, false);
  C.addFinance(s, { type: 'in', amount: 1000, cat: 'satis', date: '2026-10-05' }, T0);
  C.addFinance(s, { type: 'in', amount: 250, cat: 'hizmet', date: '2026-10-06' }, T0);
  C.addFinance(s, { type: 'out', amount: 300, cat: 'arac', date: '2026-10-07' }, T0);
  C.addFinance(s, { type: 'out', amount: 50, cat: 'reklam', date: '2026-10-08' }, T0);
  let i = C.insights(s, T0);
  assert.ok(i.hasData && !i.hasLast);
  assert.strictEqual(i.thisMonth.net, 900);
  assert.strictEqual(i.bestIncome.name, 'Satış');
  assert.strictEqual(i.topExpense.name, 'Araç / abonelik');
  assert.strictEqual(i.savingsRate, 72);
  C.addFinance(s, { type: 'in', amount: 400, cat: 'satis', date: '2026-09-10' }, T0);
  C.addFinance(s, { type: 'out', amount: 100, cat: 'arac', date: '2026-09-11' }, T0);
  i = C.insights(s, T0);
  assert.ok(i.hasLast);
  assert.strictEqual(i.lastMonth.net, 300);
  assert.strictEqual(i.diffNet, 600);
  C.addFinance(s, { type: 'out', amount: 10, date: '2026-09-12' }, T0);
  assert.strictEqual(C.insights(s, T0 + 40 * DAY).thisMonth.net, 0, 'ay değişince bu ay boş');
  const onlyOut = C.defaultState();
  C.addFinance(onlyOut, { type: 'out', amount: 10, date: '2026-10-05' }, T0);
  assert.strictEqual(C.insights(onlyOut, T0).savingsRate, null, 'gelir yoksa tasarruf oranı yok');
});

// ---------- v0.4: düzenleme, bütçe, hesaplayıcı, kontrol listesi, sözlük ----------
test('kayıt düzenleme: geçerliyse günceller, geçersizse eskisini korur', () => {
  const s = C.defaultState();
  const r = C.addFinance(s, { type: 'in', amount: 100, cat: 'satis', date: '2026-10-05', note: 'a' }, T0);
  assert.ok(C.updateFinance(s, r.id, { type: 'out', amount: '45,5', cat: 'arac', date: '2026-10-06', note: 'b' }, T0));
  assert.strictEqual(s.finance[0].type, 'out'); assert.strictEqual(s.finance[0].amount, 45.5);
  assert.strictEqual(s.finance[0].id, r.id); assert.strictEqual(s.finance.length, 1);
  assert.strictEqual(C.updateFinance(s, r.id, { type: 'in', amount: -3 }, T0), null);
  assert.strictEqual(C.updateFinance(s, r.id, { type: 'in', amount: 5, date: '2099-01-01' }, T0), null, 'gelecek tarih olmaz');
  assert.strictEqual(C.updateFinance(s, 'yok', { type: 'in', amount: 5 }, T0), null);
  assert.strictEqual(s.finance[0].amount, 45.5, 'başarısız güncelleme kaydı bozmaz');
});

test('aylık gider bütçesi', () => {
  const s = C.defaultState();
  assert.strictEqual(C.budgetProgress(s, T0).target, 0);
  assert.ok(C.setBudget(s, '500')); assert.ok(!C.setBudget(s, 'abc')); assert.ok(!C.setBudget(s, -1));
  C.addFinance(s, { type: 'out', amount: 200, date: '2026-10-05' }, T0);
  let b = C.budgetProgress(s, T0);
  assert.strictEqual(b.pct, 40); assert.strictEqual(b.left, 300); assert.ok(!b.over);
  C.addFinance(s, { type: 'out', amount: 400, date: '2026-10-06' }, T0);
  b = C.budgetProgress(s, T0);
  assert.ok(b.over); assert.strictEqual(b.overBy, 100); assert.strictEqual(b.pct, 100);
  assert.strictEqual(C.migrate({ goal: { monthly: 5 } }).goal.expenseMonthly, 0, 'eski kayıtta bütçe 0');
});

test('satış hesaplayıcı', () => {
  const r = C.calcSales({ price: 100, cost: 20, fee: 10, target: 1000 });
  assert.ok(r.ok); assert.strictEqual(r.netPerSale, 70); assert.strictEqual(r.sales, 15); assert.strictEqual(r.revenue, 1500);
  assert.ok(!C.calcSales({ price: 10, cost: 9, fee: 20, target: 100 }).ok, 'zarar eden fiyat uyarılır');
  assert.ok(!C.calcSales({ price: '', target: 5 }).ok);
  assert.ok(!C.calcSales({ price: 50, fee: 100, target: 5 }).ok);
  assert.ok(!C.calcSales({ price: 50, target: 0 }).ok);
  assert.strictEqual(C.calcSales({ price: '49,90', cost: 0, fee: 0, target: '99,8' }).sales, 2);
});

test('başlangıç kontrol listesi ilerlemeyi izler', () => {
  const s = C.defaultState();
  assert.strictEqual(C.checklist(s, T0).done, 0);
  s.user.name = 'Ali'; C.addFinance(s, { type: 'in', amount: 5 }, T0); C.setGoal(s, 100);
  const c = C.checklist(s, T0);
  assert.strictEqual(c.done, 3); assert.ok(!c.complete);
  C.setPackage(s, 'manual', T0); C.startProject(s, 'sosyal-medya', T0);
  const p = C.activeProject(s); C.setTaskDone(s, p.id, 't1', true, T0);
  assert.ok(C.checklist(s, T0).complete);
});

test('sözlük: tekrarsız liste, arama', () => {
  const all = C.glossaryList('');
  assert.ok(all.length >= 5);
  assert.strictEqual(new Set(all.map(e => e.text)).size, all.length, 'aynı açıklama iki kez listelenmez');
  assert.ok(C.glossaryList('komisyon').some(e => /affiliate|ortaklığı/i.test(e.key)));
  assert.strictEqual(C.glossaryList('zzzzqq').length, 0);
  assert.ok(C.glossaryList('NİŞ').length >= 1, 'Türkçe büyük/küçük harf duyarsız');
});

// ---------- v0.7: tekrarlayan kayıt, birikim, vergi payı, kaynak ----------
test('tekrarlayan kayıt: aylık, eksik aylar tamamlanır, ay sonu taşmaz', () => {
  const s = C.defaultState();
  const r = C.addRecurring(s, { type: 'out', amount: 100, cat: 'arac', note: 'abonelik', freq: 'monthly', date: '2026-07-31' }, T0);
  assert.ok(r); assert.strictEqual(C.addRecurring(s, { type: 'out', amount: 0 }, T0), null);
  const n = C.applyRecurring(s, T0);                       // T0 = 2026-10 ortası
  assert.strictEqual(n, 3, 'Tem, Ağu, Eyl (31 Ekim henüz gelmedi)');
  assert.ok(s.finance.every(f => f.auto && f.recId === r.id));
  assert.strictEqual(new Date(s.finance.find(f => new Date(f.date).getMonth() === 8).date).getDate(), 30, 'Eylül 31 yerine 30');
  assert.strictEqual(C.applyRecurring(s, T0), 0, 'ikinci çağrıda tekrar eklenmez');
  assert.strictEqual(C.applyRecurring(s, T0 + 40 * DAY) >= 1, true, 'sonraki ay yeni kayıt');
});

test('tekrarlayan kayıt: haftalık, duraklatma geriye dönük eklemez, otomatik kayıt seriyi/rozeti etkilemez', () => {
  const s = C.defaultState();
  const r = C.addRecurring(s, { type: 'in', amount: 50, freq: 'weekly', date: '2026-10-01' }, T0);
  assert.ok(C.applyRecurring(s, T0) >= 2);
  assert.strictEqual(C.streak(s, T0).current, 0, 'otomatik kayıt seri sayılmaz');
  assert.ok(!C.badges(s, T0).find(b => b.id === 'first-record').earned, 'otomatik kayıt rozet vermez');
  assert.ok(!C.checklist(s, T0).items.find(i => i.id === 'record').done);
  C.toggleRecurring(s, r.id, T0);
  const before = s.finance.length;
  C.applyRecurring(s, T0 + 30 * DAY);
  assert.strictEqual(s.finance.length, before, 'duraklatılmışken eklenmez');
  C.toggleRecurring(s, r.id, T0 + 30 * DAY);
  assert.strictEqual(C.applyRecurring(s, T0 + 30 * DAY) <= 1, true, 'devam edince geçmiş dönem eklenmez');
  assert.ok(C.removeRecurring(s, r.id) && s.recurring.length === 0);
});

test('birikim hedefleri', () => {
  const s = C.defaultState();
  assert.strictEqual(C.addSaving(s, '', 100, T0), null);
  assert.strictEqual(C.addSaving(s, 'Laptop', -5, T0), null);
  const v = C.addSaving(s, 'Laptop', '1000', T0);
  assert.ok(C.contributeSaving(s, v.id, '250,5'));
  assert.strictEqual(C.savingProgress(v).pct, 25);
  assert.ok(C.contributeSaving(s, v.id, -9999)); assert.strictEqual(v.saved, 0, 'eksiye düşmez');
  assert.ok(!C.contributeSaving(s, v.id, 0)); assert.ok(!C.contributeSaving(s, 'yok', 5));
  C.contributeSaving(s, v.id, 1000); assert.ok(C.savingProgress(v).reached);
  assert.ok(C.removeSaving(s, v.id));
});

test('vergi payı ve kaynağa göre net', () => {
  const s = C.defaultState();
  assert.ok(!C.setTaxPct(s, 80) && !C.setTaxPct(s, 'x') && C.setTaxPct(s, '20'));
  C.addFinance(s, { type: 'in', amount: 1000, date: '2026-10-05' }, T0);
  C.addFinance(s, { type: 'out', amount: 200, date: '2026-10-06' }, T0);
  assert.strictEqual(C.taxReserve(s, T0).amount, 160);
  C.setPackage(s, 'manual', T0);
  const p = C.startProject(s, 'sosyal-medya', T0);
  C.addFinance(s, { type: 'in', amount: 300, date: '2026-10-07', src: p.id }, T0);
  C.addFinance(s, { type: 'in', amount: 5, date: '2026-10-07', src: 'sahte' }, T0);
  const sp = C.sourceSplit(s);
  assert.ok(sp.hasSources);
  assert.strictEqual(sp.items.find(i => i.id === p.id).net, 300);
  assert.strictEqual(sp.items.find(i => i.id === '').net, 805, 'geçersiz kaynak Genel sayılır');
  const back = C.importData(C.exportData(s)).state;
  assert.strictEqual(back.finance.filter(f => f.src === p.id).length, 1, 'yedekte kaynak korunur');
  assert.strictEqual(back.settings.taxPct, 20);
  assert.strictEqual(C.migrate({ recurring: [null, { type: 'in', amount: -1 }], savings: 'x' }).recurring.length, 0);
});

console.log('\n' + passed + ' test geçti' + (process.exitCode ? ', bazıları BAŞARISIZ' : ''));
