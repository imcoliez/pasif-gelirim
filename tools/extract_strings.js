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
    s.chat.push({ role: 'user', text: 'zzq', at: T }, { role: 'ai', text: Core.aiReply(s, 'Hedef kitle ne demek?', T), at: T, src: 'demo' }, { role: 'ai', text: 'zzreal', at: T, src: 'ai' });
    if (Core.entitlements(s).automation) { Core.generatePlan(s, p, 7, T); }
    if (Core.entitlements(s).ceo) { Core.ensureDecisions(s, p, T); }
    return s;
  };
  ['free', 'manual', 'semi', 'ceo'].forEach(k => out.push([k, mk(k), T]));
  Data.MODELS.slice(1).forEach(m => out.push(['m-' + m.id, mk('ceo', m.id), T]));
  const four = mk('ceo'); ['freelance', 'blog-affiliate', 'yerel-hizmet'].forEach(m => Core.startProject(four, m, T)); out.push(['four', four, T]);
  const full = mk('ceo'); full.addonNarration = true;
  Core.decide(full, full.decisions[0].id, 'onaylandı', T);
  full.settings.look.accent = 'custom'; full.settings.look.custom = '#ff8800'; full.settings.reminder.enabled = true; full.lock = { enabled: true, salt: 'a', hash: 'b' };
  full.user.avatar = 'data:image/jpeg;base64,AAAA'; full.settings.aiShareMemory = true;
  out.push(['full', full, T]);
  // Aşama 6: görev motoru durumları
  const wk = mk('ceo'); const wp = Core.activeProject(wk);
  const pl1 = Core.proposePlan(wk, wp.id, 'Zzgoal projemi geliştirmek istiyorum', T).plan; Core.decidePlan(wk, wp.id, pl1.id, true, T);
  const wt = Core.tasksOf(wk, wp.id);
  Core.prepareTask(wk, wp.id, wt[0].id, T); Core.completeTask(wk, wp.id, wt[0].id, undefined, T);
  Core.prepareTask(wk, wp.id, wt[1].id, T); Core.completeTask(wk, wp.id, wt[1].id, undefined, T);
  Core.prepareTask(wk, wp.id, wt[2].id, T); Core.completeTask(wk, wp.id, wt[2].id, undefined, T);
  Core.prepareTask(wk, wp.id, wt[3].id, T); Core.approveTask(wk, wp.id, wt[3].id, 'a', T);
  Core.prepareTask(wk, wp.id, wt[4].id, T); Core.approveTask(wk, wp.id, wt[4].id, 'publish', T);   // harici: yalnızca taslak
  Core.addTask(wk, wp.id, { title: 'Zzown', priority: 'low' }, T); Core.cancelTask(wk, wp.id, Core.tasksOf(wk, wp.id)[6].id, T);
  Core.addTask(wk, wp.id, { title: 'Zzsnooze' }, T); Core.snoozeTask(wk, wp.id, Core.tasksOf(wk, wp.id)[7].id, T + 3 * DAY, T);
  Core.addTask(wk, wp.id, { title: 'Zzfail' }, T); Core.prepareTask(wk, wp.id, Core.tasksOf(wk, wp.id)[8].id, T); Core.failTask(wk, wp.id, Core.tasksOf(wk, wp.id)[8].id, '', T);
  const pl2 = Core.proposePlan(wk, wp.id, 'Zzgoal2 büyütmek istiyorum', T).plan;
  Core.prepareTask(wk, wp.id, Core.tasksOf(wk, wp.id)[5].id, T);
  wk.chat.push({ role: 'user', text: 'zzgoal', at: T, pid: wp.id }, { role: 'ai', text: Core.PLAN_REPLY, at: T, pid: wp.id, src: 'demo', plan: pl2.id }, { role: 'ai', text: 'zz', at: T, pid: wp.id, src: 'demo', plan: pl1.id });
  out.push(['work', wk, T]);
  const pm = mk('semi'); Core.startProject(pm, 'freelance', T); Core.startProject(pm, 'blog-affiliate', T + 1); Core.startProject(pm, 'yerel-hizmet', T + 2);
  Core.updateProject(pm, pm.projects[0].id, { desc: 'zzdesc', goal: 100, note: 'zznote' }, T); Core.addFinance(pm, { type: 'in', amount: 30, src: pm.projects[0].id, note: 'zzrec' }, T); Core.addFinance(pm, { type: 'in', amount: 5, note: 'legacy' }, T);
  Core.assignPackage(pm, pm.projects[0].id, T); Core.archiveProject(pm, pm.projects[1].id, T); Core.setActiveProject(pm, pm.projects[0].id); out.push(['projMix', pm, T]);
  const pn = mk('ceo'); Core.startProject(pn, 'freelance', T); Core.startProject(pn, 'blog-affiliate', T + 1); Core.assignPackage(pn, pn.projects[0].id, T); Core.setPackage(pn, 'free', T); Core.setActiveProject(pn, pn.projects[0].id); out.push(['projInactive', pn, T]);
  const man = mk('manual'); man.addonNarration = true; out.push(['manualNarr', man, T]);
  return out;
}

function uiStates(S, T) {
  const ui = (o) => Object.assign({ route: 'home', quiz: null, taskId: null, narr: null, narrAnswer: '', toast: '', period: '7d', chartSel: null, finType: 'in', finFilter: 'all', typing: false, exportText: null, resolvedTheme: 'dark', depth: 0, onb: 0, market: null, mkDays: 30 }, o || {});
  const list = [];
  ['onboarding', 'welcome', 'home', 'tasks', 'chat', 'money', 'charts', 'auto', 'packages', 'history', 'settings', 'about', 'calc', 'glossary', 'plans', 'market', 'projects', 'project', 'tools', 'account'].forEach(r => list.push(ui({ route: r })));
  [0, 1, 2].forEach(i => list.push(ui({ route: 'onboarding', onb: i })));
  const p = Core.activeProject(S);
  if (p) {
    list.push(ui({ route: 'work' }));
    Core.tasksOf(S, p.id).forEach(t => { list.push(ui({ route: 'work', workTask: t.id })); list.push(ui({ route: 'work', workTask: t.id, workEdit: t.id })); });
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
  // Aşama 5: yapay zekâ bağlantı durumları (sunucu hazır/yapılandırılmamış/çevrimdışı/denetleniyor, onay, bağlı, hata)
  const fp = p ? p.id : '*';
  [{ state: 'ready', model: 'claude-test' }, { state: 'unconfigured', model: '' }, { state: 'offline', model: '' }, { state: 'checking', model: '' }].forEach(ai => list.push(ui({ route: 'chat', ai }), ui({ route: 'memory', ai })));
  list.push(ui({ route: 'chat', ai: { state: 'ready', model: 'claude-test' }, live: true, failed: fp }), ui({ route: 'memory', ai: { state: 'ready', model: 'claude-test' }, live: true }), ui({ route: 'chat', ai: { state: 'ready', model: 'claude-test' }, consentHidden: true }));
  const ser = []; for (let i = 0; i < 12; i++) ser.push({ t: T - (12 - i) * DAY, v: 40 + i / 10 });
  const Mk = require('../www/market.js');
  const names = Mk.FX.map(f => ['fx', f[1], f[0]]).concat([['gold', 'Gram altın (yaklaşık)', 'GRAM'], ['gold', 'Ons altın', 'ONS']], Mk.CRYPTO.map(c => ['crypto', c[1], c[0]]));
  const items = names.map((n, i) => ({ id: n[0] + i, name: n[1], sym: n[2], group: n[0], unit: 'TL', price: 41, change: 2.5, high: 42, low: 40, series: ser }));
  list.push(ui({ route: 'market', market: { status: 'idle', items, at: T, errors: ['Gram altın', 'Bitcoin'] } }), ui({ route: 'market', market: { status: 'idle', items: [] } }), ui({ route: 'market', market: { status: 'loading', items: [] } }));
  return list;
}

function collect() {
  const strings = new Map();
  const add = (s, src) => { const k = I.norm(s); if (k && !/^zz/i.test(k) && !strings.has(k)) strings.set(k, src); };
  const grab = (html, src) => I.extractTexts(html).forEach(x => add(x, src));
  states().forEach(([name, S, T]) => {
    uiStates(S, T).forEach(ui => {
      let parts; try { parts = App.parts(S, ui, T); } catch (e) { console.error('çizim hatası', name, ui.route, e.message); return; }
      grab(parts.top + parts.main + parts.layer, ui.route);
    });
    // Core metinleri
    Core.badges(S, T).forEach(b => { add(b.title, 'badge'); add(b.desc, 'badge'); });
    Core.chatSuggestions(S).forEach(x => add(x, 'suggest'));
    Object.values(Core.TASK_STATUS).concat(Object.values(Core.PRIORITIES)).forEach(x => add(x, 'work'));
    Object.values(Core.CAPABILITIES).forEach(c => { add(c.name, 'work'); add(c.note, 'work'); });
    add(Core.noraIntro(), 'nora'); add('Genel sohbettesin; hiçbir projenin görevine bakmıyorum. "Proje sohbeti"ne geçersen o projenin Görev Merkezi durumunu söyleyebilirim.', 'nora'); add(Core.PLAN_REPLY, 'work'); add(Core.PLAN_NEEDS_PROJECT, 'work');
    (function () {
      const src = require('fs').readFileSync(__dirname + '/../www/core.js', 'utf8');
      const w = src.slice(src.indexOf('Görev ve iş akışı motoru'), src.indexOf('// ---------- Dışa aktarma'));
      const re = /(?:error: |tlog\(t, |move\((?:t|g\.t), '[a-z]+', now, )'((?:[^'\\\n]|\\.)*)'(?=\s*[,)}])/g; let m;
      while ((m = re.exec(w))) { const s = m[1].replace(/\\'/g, "'"); if (/\p{L}{3}/u.test(s)) add(s, 'work-core'); }
    })();
    // Sunucudan gelen hata metinleri ve istemci bildirimleri (ekrana çizilmez, toast olarak çıkar)
    ['Yapay zekâ sunucusu henüz yapılandırılmamış.', 'Bugünlük yapay zekâ kapasitesi doldu. Yarın tekrar dene.', 'Bugünkü mesaj hakkın doldu. Yarın tekrar dene.', 'Bugünlük sohbet kapasitesi doldu. Yarın tekrar dene.', 'Yapay zekâ zamanında yanıt veremedi. Tekrar dene.', 'Yapay zekâ şu an yoğun. Biraz sonra tekrar dene.', 'Yanıt okunamadı.', 'Yapay zekâ şu an yanıt veremiyor. Biraz sonra tekrar dene.', 'Boş yanıt geldi, tekrar dene.', 'İstek çok büyük.', 'Geçersiz istek.', 'Yetkisiz.', 'Bulunamadı.', 'Yanıt çok gecikti. Tekrar dene.', 'Bağlanamadım. İnternetini kontrol edip tekrar dene.', 'Yanıt alınamadı, tekrar dene.', 'Gerçek yapay zekâ kapatıldı. Demo yanıtlar kullanılacak.', 'Plan onaylandı. Görevleri tek tek sen başlatırsın.', 'Plan reddedildi; hiçbir görev çalışmadı.', 'Hazırlık yapıldı.', 'Onayın kaydedildi, ama bu işlem bu sürümde desteklenmiyor: hiçbir şey yapılmadı.', 'Onaylandı ve raporlandı.', 'Onaylanmadı; işlem yapılmadı, görev iptal edildi.', 'Görev tamamlandı.', 'Başarısız olarak işaretlendi.', 'Bu görev iptal edilsin mi?', 'Görev iptal edildi.', 'Görev yeniden planlandı.', 'Görev ertelendi.', 'Erteleme kaldırıldı.', 'Bu görev ve işlem geçmişi silinsin mi? Bu işlem geri alınamaz.', 'Görev silindi.', 'Görev güncellendi.', 'Görev eklendi.', 'İşlem yapılamadı.'].forEach(x => add(x, 'ai-msg'));
    Data.MODELS.forEach(m => { add(m.title, 'model'); add(m.summary, 'model'); if (m.facts) { add(m.facts.cost, 'facts'); add(m.facts.difficulty, 'facts'); m.facts.skills.forEach(x => add(x, 'facts')); add(m.facts.risk, 'facts'); } add(m.honest, 'model'); m.tasks.forEach(t => { add(t.title, 'task'); add(t.body || t.text || '', 'task'); }); m.planIdeas.forEach(x => add('Gün 1 (01.01.2026): ' + x, 'plan')); m.decisions.forEach(x => add(x, 'dec')); add('# günlük ' + m.title + ' planı', 'plan'); add('# günlük ' + m.title + ' planı · #', 'plan'); });
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
