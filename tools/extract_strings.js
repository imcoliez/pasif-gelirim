// Arayüzdeki Türkçe metinleri toplar (sunucusuz): ekranları çeşitli durumlarda çizip metin düğümlerini ve
// placeholder/aria-label/title/alt özelliklerini çıkarır. Çıktı: normalize edilmiş anahtar listesi.
const Core = require('../www/core.js'), App = require('../www/app.js'), Data = require('../www/data.js');
const I = require('../www/i18n.js');
const DAY = 86400000;

function states() {
  const T = Date.UTC(2026, 9, 15, 10, 0, 0);
  const out = [];
  const base = () => { const s = Core.defaultState(); s.user.name = 'Zzname'; s.user.onboarded = true; return s; };
  out.push(['empty', base(), T]);
  const s1 = base(); s1.cancelledAt = T - DAY; out.push(['cancelled', s1, T]);
  const mk = (pkg, model) => {
    const s = base(); Core.setPackage(s, pkg, T);
    Core.startProject(s, model || 'sosyal-medya', T - 3 * DAY); const p = Core.activeProject(s);
    Core.setTaskDone(s, p.id, 't1', true, T - 2 * DAY); Core.setTaskNote(s, p.id, 't2', 'zznote', T - DAY);
    Core.addFinance(s, { type: 'in', amount: 1500, cat: 'satis', date: '2026-10-10', note: 'zzfin' }, T);
    Core.addFinance(s, { type: 'in', amount: 700, cat: 'hizmet', date: '2026-09-10' }, T);
    Core.addFinance(s, { type: 'out', amount: 300, cat: 'arac', date: '2026-10-11' }, T);
    Core.addFinance(s, { type: 'out', amount: 100, cat: 'reklam', date: '2026-09-11' }, T);
    for (const c of ['ortaklik', 'diger']) Core.addFinance(s, { type: 'in', amount: 50, cat: c, date: '2026-10-12' }, T);
    for (const c of ['malzeme', 'diger']) Core.addFinance(s, { type: 'out', amount: 20, cat: c, date: '2026-10-12' }, T);
    for (let i = 0; i < 6; i++) Core.addFinance(s, { type: 'in', amount: 5, date: '2026-10-1' + (i % 5), src: p.id }, T);
    Core.setGoal(s, 3000); Core.setBudget(s, 200);
    Core.addSaving(s, 'Zzsave', 1000, T); Core.contributeSaving(s, s.savings[0].id, 400);
    Core.addRecurring(s, { type: 'out', amount: 30, freq: 'monthly', note: 'Zzrec', date: '2026-08-05' }, T);
    Core.addRecurring(s, { type: 'in', amount: 30, freq: 'weekly', note: 'Zzrec2', date: '2026-10-01' }, T);
    Core.applyRecurring(s, T); s.recurring[1].active = false;
    Core.setTaxPct(s, 15);
    s.chat.push({ role: 'user', text: 'zzq', at: T }, { role: 'ai', text: Core.aiReply(s, 'Hedef kitle ne demek?', T), at: T });
    if (Core.entitlements(s).automation) { Core.generatePlan(s, p, 7, T); }
    if (Core.entitlements(s).ceo) { Core.ensureDecisions(s, p, T); }
    return s;
  };
  ['free', 'manual', 'semi', 'ceo'].forEach(k => out.push([k, mk(k), T]));
  Data.MODELS.slice(1).forEach(m => out.push(['m-' + m.id, mk('ceo', m.id), T]));
  const full = mk('ceo'); full.addonNarration = true;
  Core.decide(full, full.decisions[0].id, 'onaylandı', T);
  full.settings.look.accent = 'custom'; full.settings.look.custom = '#ff8800'; full.settings.reminder.enabled = true; full.lock = { enabled: true, salt: 'a', hash: 'b' };
  full.user.avatar = 'data:image/jpeg;base64,AAAA';
  out.push(['full', full, T]);
  const man = mk('manual'); man.addonNarration = true; out.push(['manualNarr', man, T]);
  return out;
}

function uiStates(S, T) {
  const ui = (o) => Object.assign({ route: 'home', quiz: null, taskId: null, narr: null, narrAnswer: '', toast: '', period: '7d', chartSel: null, finType: 'in', finFilter: 'all', typing: false, exportText: null, resolvedTheme: 'dark', depth: 0, onb: 0, market: null, mkDays: 30 }, o || {});
  const list = [];
  ['onboarding', 'welcome', 'home', 'tasks', 'chat', 'money', 'charts', 'auto', 'packages', 'history', 'settings', 'about', 'calc', 'glossary', 'plans', 'market'].forEach(r => list.push(ui({ route: r })));
  [0, 1, 2].forEach(i => list.push(ui({ route: 'onboarding', onb: i })));
  const p = Core.activeProject(S);
  if (p) {
    const m = Core.modelById(p.modelId);
    m.tasks.forEach(t => list.push(ui({ route: 'task', taskId: t.id })));
    list.push(ui({ route: 'task', taskId: m.tasks[0].id, narr: 'offer' }), ui({ route: 'task', taskId: m.tasks[0].id, narr: 'panel', narrAnswer: 'zzans' }));
  }
  for (let st = 0; st <= Data.QUESTIONS.length; st++) list.push(ui({ route: 'tasks', quiz: { step: st, answers: { time: 'mid', money: 'none', skill: 'talk', speed: 'fast' } } }));
  ['7d', '30d', '12m'].forEach(pr => list.push(ui({ route: 'charts', period: pr })));
  ['unlock', 'new', 'confirm', 'disable'].forEach(m => list.push(ui({ route: 'home', pinMode: m, pin: '12', pinMsg: 'Yanlış PIN.' })));
  list.push(ui({ route: 'money', editId: S.finance[0] && S.finance[0].id }), ui({ route: 'money', finType: 'out', finFilter: 'out' }), ui({ route: 'chat', typing: true }));
  list.push(ui({ route: 'settings', exportText: 'x', exportTitle: 'Tanılama bilgisi' }));
  list.push(ui({ route: 'calc', calcRes: Core.calcSales({ price: 100, cost: 20, fee: 10, target: 1000 }) }), ui({ route: 'calc', calcRes: Core.calcSales({ price: 10, cost: 30, fee: 0, target: 100 }) }));
  list.push(ui({ route: 'plans', recType: 'in' }));
  const ser = []; for (let i = 0; i < 12; i++) ser.push({ t: T - (12 - i) * DAY, v: 40 + i / 10 });
  const Mk = require('../www/market.js');
  const names = Mk.FX.map(f => ['fx', f[1], f[0]]).concat([['gold', 'Gram altın (yaklaşık)', 'GRAM'], ['gold', 'Ons altın', 'ONS']], Mk.CRYPTO.map(c => ['crypto', c[1], c[0]]));
  const items = names.map((n, i) => ({ id: n[0] + i, name: n[1], sym: n[2], group: n[0], unit: 'TL', price: 41, change: 2.5, high: 42, low: 40, series: ser }));
  list.push(ui({ route: 'market', market: { status: 'idle', items, at: T, errors: ['Gram altın', 'Bitcoin'] } }), ui({ route: 'market', market: { status: 'idle', items: [] } }), ui({ route: 'market', market: { status: 'loading', items: [] } }));
  return list;
}

function collect() {
  const strings = new Map();
  const add = (s, src) => { const k = I.norm(s); if (k && !strings.has(k)) strings.set(k, src); };
  const grab = (html, src) => I.extractTexts(html).forEach(x => add(x, src));
  states().forEach(([name, S, T]) => {
    uiStates(S, T).forEach(ui => {
      let parts; try { parts = App.parts(S, ui, T); } catch (e) { console.error('çizim hatası', name, ui.route, e.message); return; }
      grab(parts.top + parts.main + parts.layer, ui.route);
    });
    // Core metinleri
    Core.badges(S, T).forEach(b => { add(b.title, 'badge'); add(b.desc, 'badge'); });
    Core.chatSuggestions(S).forEach(x => add(x, 'suggest'));
    Data.MODELS.forEach(m => { add(m.title, 'model'); add(m.summary, 'model'); add(m.honest, 'model'); m.tasks.forEach(t => { add(t.title, 'task'); add(t.body || t.text || '', 'task'); }); m.planIdeas.forEach(x => add('Gün 1 (01.01.2026): ' + x, 'plan')); m.decisions.forEach(x => add(x, 'dec')); add('# günlük ' + m.title + ' planı', 'plan'); add('# günlük ' + m.title + ' planı · #', 'plan'); });
    ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara', '— Hafta değerlendirmesi: Ne işe yaradı? Gelecek hafta neyi değiştireceksin?'].forEach(x => add(x, 'misc'));
    Data.QUESTIONS.forEach(q => { add(q.text, 'quiz'); q.options.forEach(o => add(o.t, 'quiz')); });
    Object.values(Core.PACKAGES).forEach(p => { add(p.name, 'pkg'); p.features.forEach(f => add(f, 'pkg')); });
  });
  return strings;
}
module.exports = { collect, states, uiStates };
if (require.main === module) {
  const m = collect();
  console.log(JSON.stringify([...m.keys()], null, 0));
  console.error(m.size + ' benzersiz metin');
}
