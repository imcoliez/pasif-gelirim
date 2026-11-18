/* Pasif Gelirim - uygulama mantığı (arayüzden bağımsız, Node'da test edilebilir) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.Core = factory(root.Data);
})(typeof self !== 'undefined' ? self : this, function (Data) {

  const DAILY_LIMIT_SEC = 3600;          // Günlük 1 saat ücretsiz AI sohbet
  const NARRATION_ADDON_TL = 150;        // Manuel pakete eklenen sesli anlatım farkı
  const STATE_VERSION = 1;

  // Not: Gerçek fiyatlar henüz belirlenmedi (price: null). Google Play'e çıkmadan önce girilecek.
  // Varsayım: Sesli anlatım Yarı Otomasyon ve CEO paketlerinde dahil. Değiştirmek için narrationIncluded.
  const PACKAGES = {
    free:   { id: 'free',   tier: 0, name: 'Ücretsiz',       emoji: '🌱', price: 0,    narrationIncluded: false,
              features: ['Gelir-gider takibi ve grafikler', 'Aylık hedef, çalışma serisi ve rozetler', 'Günlük 1 saat yapay zekâ sohbeti', 'Geçmiş İşlemler arşivi', 'Verini dışa aktarma ve silme'] },
    manual: { id: 'manual', tier: 1, name: 'Manuel',         emoji: '📗', price: null, narrationIncluded: false,
              features: ['Ücretsiz paketin tüm özellikleri', 'İnteraktif soru-cevap ile gelir modeli seçimi', 'Görev listesi ve yazılı açıklamalar', '+150 TL ile sesli yapay zekâ anlatımı'] },
    semi:   { id: 'semi',   tier: 2, name: 'Yarı Otomasyon', emoji: '⚙️', price: null, narrationIncluded: true,
              features: ['Manuel paketin tüm özellikleri', 'Seçtiğin modele göre günlük iş planı hazırlama (şu an hazır şablonlarla; yapay zekâ bağlantısı yakında)', 'Sesli anlatım dahil'] },
    ceo:    { id: 'ceo',    tier: 3, name: 'CEO Modu',       emoji: '👑', price: null, narrationIncluded: true,
              features: ['Yarı Otomasyon özellikleri', 'Haftalık karar kartları: önemli kararları sen verirsin', 'Yapay zekâ plan ve taslakları hazırlar; harcama ve dış işlemlerde senden onay ister (gerçek yapay zekâ bağlantısı yakında)'] }
  };

  let idCounter = 0;
  function uid(prefix) {
    idCounter += 1;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + idCounter + '_' + Math.floor(Math.random() * 1e4).toString(36);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dayKey(now) { const d = new Date(now); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function monthKey(now) { const d = new Date(now); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function formatDate(now) { const d = new Date(now); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }

  const THEMES = ['system', 'light', 'dark'];

  const ACCENTS = ['green', 'blue', 'purple', 'orange', 'pink', 'teal'];
  const FONT_SCALES = ['s', 'm', 'l'], RADII = ['soft', 'sharp'], MOTIONS = ['on', 'off'];
  function defaultLook() {
    return { accent: 'green', custom: '', font: 'm', radius: 'soft', motion: 'on', home: { spend: true, streak: true, checklist: true } };
  }
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const AVATAR_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/;
  function cleanLook(l) {
    const d = defaultLook(), o = l && typeof l === 'object' ? l : {};
    const h = o.home && typeof o.home === 'object' ? o.home : {};
    return {
      accent: ACCENTS.indexOf(o.accent) !== -1 || o.accent === 'custom' ? o.accent : d.accent,
      custom: HEX.test(o.custom || '') ? String(o.custom).toLowerCase() : '',
      font: FONT_SCALES.indexOf(o.font) !== -1 ? o.font : d.font,
      radius: RADII.indexOf(o.radius) !== -1 ? o.radius : d.radius,
      motion: MOTIONS.indexOf(o.motion) !== -1 ? o.motion : d.motion,
      home: { spend: h.spend !== false, streak: h.streak !== false, checklist: h.checklist !== false }
    };
  }

  function defaultState() {
    return {
      v: STATE_VERSION,
      user: { name: '', onboarded: false },
      settings: { theme: 'dark', lang: 'auto', currency: 'TRY', reminder: { enabled: false, time: '20:00' }, look: defaultLook() },
      lock: { enabled: false, salt: '', hash: '' },
      goal: { monthly: 0, expenseMonthly: 0 },
      pkg: 'free',
      addonNarration: false,
      cancelledAt: null,
      projects: [],
      activeProjectId: null,
      finance: [],
      recurring: [],
      savings: [],
      usage: { date: '', seconds: 0 },
      chat: [],
      chatGeneral: false,
      plans: [],
      decisions: [],
      createdAt: Date.now()
    };
  }

  function migrate(s) {
    const d = defaultState();
    if (!s || typeof s !== 'object') return d;
    const out = Object.assign(d, s);
    out.user = Object.assign({ name: '', onboarded: false }, s.user || {});
    out.user.name = String(out.user.name || '').slice(0, 30);
    out.user.onboarded = !!out.user.onboarded;
    out.user.avatar = typeof out.user.avatar === 'string' && out.user.avatar.length <= 250000 && AVATAR_RE.test(out.user.avatar) ? out.user.avatar : '';
    out.usage = Object.assign({ date: '', seconds: 0 }, s.usage || {});
    out.settings = Object.assign({ theme: 'dark' }, s.settings || {});
    if (THEMES.indexOf(out.settings.theme) === -1) out.settings.theme = 'dark';
    if (LANG_CODES.indexOf(out.settings.lang) === -1) out.settings.lang = 'auto';
    if (CURRENCIES.indexOf(out.settings.currency) === -1) out.settings.currency = 'TRY';
    out.settings.look = cleanLook(out.settings.look);
    if (out.settings.look.accent === 'custom' && !out.settings.look.custom) out.settings.look.accent = 'green';
    out.settings.reminder = Object.assign({ enabled: false, time: '20:00' }, (s.settings && s.settings.reminder) || {});
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(out.settings.reminder.time)) out.settings.reminder.time = '20:00';
    out.settings.reminder.enabled = !!out.settings.reminder.enabled;
    out.lock = Object.assign({ enabled: false, salt: '', hash: '' }, s.lock || {});
    if (!out.lock.hash || !out.lock.salt) out.lock.enabled = false;
    out.lock.enabled = !!out.lock.enabled;
    if (out.user.name) out.user.onboarded = true;       // eski kullanıcılar tanıtımı atlar
    out.goal = Object.assign({ monthly: 0, expenseMonthly: 0 }, s.goal || {});
    if (!isFinite(out.goal.monthly) || out.goal.monthly < 0) out.goal.monthly = 0;
    if (!isFinite(out.goal.expenseMonthly) || out.goal.expenseMonthly < 0) out.goal.expenseMonthly = 0;
    ['projects', 'finance', 'chat', 'plans', 'decisions', 'recurring', 'savings'].forEach(function (k) { if (!Array.isArray(out[k])) out[k] = []; });
    if (!PACKAGES[out.pkg]) out.pkg = 'free';
    // bozuk kayıtlardaki geçersiz öğeleri (null, metin...) ayıkla
    ['projects', 'finance', 'chat', 'plans', 'decisions', 'recurring', 'savings'].forEach(function (k) {
      out[k] = out[k].filter(function (x) { return x && typeof x === 'object' && !Array.isArray(x); });
    });
    out.finance.forEach(function (f) { if (!f.cat) f.cat = 'diger'; if (!f.at) f.at = f.date; });
    out.recurring = out.recurring.filter(function (r) {
      return (r.type === 'in' || r.type === 'out') && isFinite(r.amount) && r.amount > 0 && (r.freq === 'weekly' || r.freq === 'monthly') && isFinite(r.next);
    }).slice(0, 50).map(function (r) {
      return { id: String(r.id || uid('rec')), type: r.type, amount: +r.amount, cat: r.cat || 'diger', note: String(r.note || '').slice(0, 120), freq: r.freq,
        dom: Math.min(31, Math.max(1, +r.dom || new Date(+r.next).getDate())), next: +r.next, active: r.active !== false };
    });
    out.savings = out.savings.filter(function (v) { return v.name && isFinite(v.target) && v.target > 0 && isFinite(v.saved); }).slice(0, 50).map(function (v) {
      return { id: String(v.id || uid('sav')), name: String(v.name).slice(0, 40), target: +v.target, saved: Math.max(0, +v.saved), at: +v.at || 0 };
    });
    out.settings.taxPct = isFinite(out.settings.taxPct) ? Math.min(60, Math.max(0, +out.settings.taxPct)) : 0;
    let pkgSeen = false;
    out.projects.forEach(function (p) {
      p.status = p.status === 'archived' ? 'archived' : 'active';
      p.desc = typeof p.desc === 'string' ? p.desc.slice(0, 160) : '';
      p.note = typeof p.note === 'string' ? p.note.slice(0, 2000) : '';
      p.goal = isFinite(p.goal) && p.goal > 0 ? +p.goal : 0;
      const mm = modelById(p.modelId);
      p.title = (typeof p.title === 'string' && p.title.trim() ? p.title.trim() : (mm ? mm.title : 'Proje')).slice(0, 40);
      p.pkg = typeof p.pkg === 'string' && PACKAGES[p.pkg] && p.pkg !== 'free' && !pkgSeen && p.status === 'active' ? p.pkg : '';
      if (p.pkg) pkgSeen = true;
      p.memory = cleanMemory(p.memory);
      if (!p.tasks || typeof p.tasks !== 'object') p.tasks = {};
      Object.keys(p.tasks).forEach(function (k) {
        const t = p.tasks[k]; if (!t || typeof t !== 'object') { delete p.tasks[k]; return; }
        t.read = !!(t.read || t.understood || t.done); t.understood = !!(t.understood || t.done);
      });
    });
    out.chatGeneral = !!out.chatGeneral;
    out.settings.aiShareMemory = out.settings.aiShareMemory === true;
    out.settings.aiConsent = +out.settings.aiConsent > 0 ? +out.settings.aiConsent : 0;      // ücretli gerçek AI kullanımını bilerek açma zamanı (0 = açmadı)
    out.chat.forEach(function (m) { m.pid = typeof m.pid === 'string' ? m.pid : ''; m.src = m.src === 'demo' || m.src === 'ai' ? m.src : ''; });
    if (out.projects.length) { const cur = out.projects.find(function (q) { return q.id === out.activeProjectId; }); if (!cur || cur.status === 'archived') { const live = out.projects.filter(function (q) { return q.status !== 'archived'; }); out.activeProjectId = live.length ? live[live.length - 1].id : null; } }
    return out;
  }

  // ---------- Yetkiler ----------
  function entitlements(state) {
    const p = PACKAGES[state.pkg] || PACKAGES.free;
    const hasWork = state.projects.length > 0;
    return {
      pkg: p,
      chat: true,
      history: true,
      selectModel: p.tier >= 1,
      tasks: p.tier >= 1 || hasWork,           // abonelik bitse de kendi emeğine manuel devam edebilir
      finance: true,                            // gelir-gider takibi ve grafikler herkese açık
      automation: p.tier >= 2,
      ceo: p.tier >= 3,
      narration: p.tier >= 1 && (p.narrationIncluded || !!state.addonNarration),
      canBuyNarration: p.id === 'manual' && !state.addonNarration
    };
  }

  // ---------- Günlük AI sohbet süresi ----------
  function normalizeUsage(state, now) {
    const k = dayKey(now);
    if (state.usage.date !== k) { state.usage.date = k; state.usage.seconds = 0; }
  }
  function remainingSeconds(state, now) {
    normalizeUsage(state, now);
    return Math.max(0, DAILY_LIMIT_SEC - state.usage.seconds);
  }
  function addUsage(state, seconds, now) {
    normalizeUsage(state, now);
    state.usage.seconds = Math.min(DAILY_LIMIT_SEC, state.usage.seconds + Math.max(0, seconds));
    return remainingSeconds(state, now);
  }
  function formatDuration(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ' dk ' + pad(s) + ' sn';
  }

  // ---------- Gelir modeli önerisi ----------
  function modelById(id) { return Data.MODELS.find(function (m) { return m.id === id; }) || null; }

  const APP_VERSION = '1.1';
  const MONEY_RANK = { none: 0, low: 1, mid: 2 };
  function recommend(answers) {
    const list = Data.MODELS.map(function (m) {
      let score = 0;
      const reasons = [];
      Object.keys(m.score).forEach(function (q) {
        const a = answers[q];
        const pts = a && m.score[q][a] != null ? m.score[q][a] : 0;
        score += pts;
        if (pts >= 3) {
          const qq = Data.QUESTIONS.find(function (x) { return x.id === q; });
          const opt = qq && qq.options.find(function (o) { return o.v === a; });
          if (opt) reasons.push('"' + opt.t + '" cevabınla iyi uyuşuyor');
        }
      });
      // bütçesi yetmeyen kullanıcıya sermaye isteyen model önerilmez; nedeniyle birlikte "blocked" olarak işaretlenir
      const blocked = !!(m.minMoney && answers.money != null && (MONEY_RANK[answers.money] || 0) < MONEY_RANK[m.minMoney]);
      return { model: m, score: score, reasons: blocked ? [] : reasons, blocked: blocked, blockReason: blocked ? 'Alan adı ve barındırma için küçük bir bütçe gerekir; şimdilik başka modellerle başla.' : '' };
    });
    list.sort(function (a, b) { return (a.blocked - b.blocked) || (b.score - a.score); });
    return list;
  }

  // ---------- Projeler ve görevler ----------
  const MAX_PROJECTS = 4;
  function isArchived(p) { return !!p && p.status === 'archived'; }
  function liveProjects(state) { return state.projects.filter(function (p) { return !isArchived(p); }); }
  // Üst sınır: aynı anda en fazla 4 (arşivde olmayan) proje. Arşiv yer açar, geri alma da aynı sınıra tabidir.
  function canStartProject(state) { return liveProjects(state).length < MAX_PROJECTS; }
  function startProject(state, modelId, now) {
    const m = modelById(modelId);
    if (!m) throw new Error('Bilinmeyen model: ' + modelId);
    if (!canStartProject(state)) return null;
    const p = {
      id: uid('proj'), modelId: m.id, title: m.title, desc: '', status: 'active', goal: 0, note: '', pkg: '', createdAt: now, updatedAt: now,
      memory: { items: [], pending: [] }, tasks: {}, lastNote: 'Proje başlatıldı.'
    };
    state.projects.push(p);
    state.activeProjectId = p.id;
    return p;
  }
  function projectById(state, id) { return state.projects.find(function (p) { return p.id === id; }) || null; }
  function activeProject(state) { return projectById(state, state.activeProjectId); }
  function setActiveProject(state, id) { const p = projectById(state, id); if (!p || isArchived(p)) return false; state.activeProjectId = id; return true; }
  function fallbackActive(state) {
    const cur = projectById(state, state.activeProjectId);
    if (cur && !isArchived(cur)) return;
    const live = liveProjects(state).sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    state.activeProjectId = live.length ? live[0].id : null;
  }

  // ---- Proje yönetimi (Aşama 3) ----
  const PROJECT_LIMITS = { title: 40, desc: 160, note: 2000, goal: 1e9 };
  function updateProject(state, id, fields, now) {
    const p = projectById(state, id); if (!p) return null;
    const f = fields || {};
    if ('title' in f) { const t = String(f.title || '').trim().slice(0, PROJECT_LIMITS.title); if (!t) return null; p.title = t; }
    if ('desc' in f) p.desc = String(f.desc || '').trim().slice(0, PROJECT_LIMITS.desc);
    if ('note' in f) p.note = String(f.note || '').slice(0, PROJECT_LIMITS.note);
    if ('goal' in f) {
      const g = typeof f.goal === 'number' ? f.goal : parseFloat(String(f.goal || '0').replace(/\./g, '').replace(',', '.'));
      if (!isFinite(g) || g < 0 || g > PROJECT_LIMITS.goal) return null;
      p.goal = Math.round(g * 100) / 100;
    }
    p.updatedAt = now;
    return p;
  }
  // Arşivleme veri silmez: görevler, notlar, kayıtlar yerinde kalır; yalnızca proje listeden kalkar ve bir yer açar.
  function archiveProject(state, id, now) {
    const p = projectById(state, id); if (!p || isArchived(p)) return false;
    p.status = 'archived'; p.archivedAt = now; p.updatedAt = now; p.pkg = '';
    fallbackActive(state);
    return true;
  }
  function restoreProject(state, id, now) {
    const p = projectById(state, id); if (!p || !isArchived(p)) return false;
    if (!canStartProject(state)) return false;
    p.status = 'active'; delete p.archivedAt; p.updatedAt = now;
    if (!state.activeProjectId) state.activeProjectId = p.id;
    return true;
  }
  // Silme: proje, görevleri, notları, planları ve kararları gider. Gelir-gider kayıtları SİLİNMEZ; "Genel"e döner.
  function deleteProject(state, id) {
    const p = projectById(state, id); if (!p) return null;
    let keptFinance = 0;
    state.finance.forEach(function (f) { if (f.src === id) { delete f.src; keptFinance++; } });
    const plans = state.plans.filter(function (x) { return x.projectId === id; }).length;
    const decisions = state.decisions.filter(function (x) { return x.projectId === id; }).length;
    const memory = memOf(p).items.length, chats = state.chat.filter(function (m) { return m.pid === id; }).length;
    state.plans = state.plans.filter(function (x) { return x.projectId !== id; });
    state.decisions = state.decisions.filter(function (x) { return x.projectId !== id; });
    state.chat = state.chat.filter(function (m) { return m.pid !== id; });      // yalnızca bu projenin sohbeti gider
    state.projects = state.projects.filter(function (x) { return x.id !== id; });
    fallbackActive(state);
    return { keptFinance: keptFinance, plans: plans, decisions: decisions, tasks: Object.keys(p.tasks).length, memory: memory, chats: chats };
  }
  // Eski, hiçbir projeye bağlı olmayan kayıtlar
  function unlinkedFinance(state) {
    return state.finance.filter(function (f) { return !f.src || !projectById(state, f.src); });
  }
  function linkUnlinkedFinance(state, id) {
    const p = projectById(state, id); if (!p || isArchived(p)) return 0;
    const list = unlinkedFinance(state);
    list.forEach(function (f) { f.src = id; });
    return list.length;
  }

  // ---- Paket - proje ilişkisi (gerçek ödeme yok; yalnızca atama) ----
  function projectPackageState(state, p) {
    if (!p || !p.pkg) return { state: 'none', pkg: null };
    const cur = PACKAGES[state.pkg];
    if (p.pkg === state.pkg && cur && cur.tier >= 2) return { state: 'active', pkg: cur };
    return { state: 'inactive', pkg: PACKAGES[p.pkg] || null };   // paket bitti/değişti: veriler durur, atama yeniden açılabilir
  }
  function assignPackage(state, id, now) {
    const p = projectById(state, id);
    if (!p || isArchived(p)) return { ok: false, error: 'Arşivdeki projeye paket atanamaz.' };
    if (!entitlements(state).automation) return { ok: false, error: 'Atayabileceğin bir otomasyon paketin yok.' };
    let from = null;
    state.projects.forEach(function (q) { if (q.id !== id && q.pkg) { from = q; q.pkg = ''; q.updatedAt = now; } });
    p.pkg = state.pkg; p.updatedAt = now;
    return { ok: true, movedFrom: from ? from.id : null };
  }
  function unassignPackage(state, id, now) {
    const p = projectById(state, id); if (!p || !p.pkg) return false;
    p.pkg = ''; p.updatedAt = now; return true;
  }
  function projectFinance(state, id) { return state.finance.filter(function (f) { return f.src === id; }).sort(function (a, b) { return b.date - a.date; }); }

  // Projelerim kartı için özet: ilerleme + bu projeye bağlı gerçek gelir-gider
  function projectSummary(state, p) {
    const pr = progress(p), m = modelById(p.modelId);
    let income = 0, expense = 0;
    state.finance.forEach(function (f) { if (f.src === p.id) { if (f.type === 'in') income += f.amount; else expense += f.amount; } });
    income = Math.round(income * 100) / 100; expense = Math.round(expense * 100) / 100;
    const nt = nextTask(p);
    return { id: p.id, title: p.title, emoji: m ? m.emoji : '', pct: pr.pct, done: pr.done, total: pr.total, complete: pr.complete,
      income: income, expense: expense, net: Math.round((income - expense) * 100) / 100, updatedAt: p.updatedAt, lastNote: p.lastNote,
      next: nt ? nt.title : '', active: state.activeProjectId === p.id && !isArchived(p),
      desc: p.desc || '', archived: isArchived(p), goal: p.goal || 0,
      goalPct: p.goal > 0 ? Math.min(100, Math.round(income / p.goal * 100)) : 0,
      pkgState: projectPackageState(state, p).state, pkgName: (projectPackageState(state, p).pkg || {}).name || '',
      status: isArchived(p) ? 'archived' : (pr.complete ? 'complete' : 'active') };
  }
  // Tek projenin dışa aktarımı (görevler, notlar, kayıtlar, planlar, kararlar)
  function exportProject(state, id, now) {
    const p = projectById(state, id); if (!p) return null;
    return JSON.stringify({
      app: 'Pasif Gelirim', kind: 'project', version: APP_VERSION, exportedAt: now || Date.now(), project: p,
      finance: state.finance.filter(function (f) { return f.src === p.id; }),
      plans: state.plans.filter(function (x) { return x.projectId === p.id; }),
      decisions: state.decisions.filter(function (x) { return x.projectId === p.id; }),
      chat: state.chat.filter(function (m) { return m.pid === p.id; })
    }, null, 2);
  }

  function progress(project) {
    const m = modelById(project.modelId);
    const total = m ? m.tasks.length : 0;
    const done = m ? m.tasks.filter(function (t) { return project.tasks[t.id] && project.tasks[t.id].done; }).length : 0;
    return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0, complete: total > 0 && done === total };
  }
  function nextTask(project) {
    const m = modelById(project.modelId);
    if (!m) return null;
    return m.tasks.find(function (t) { return !(project.tasks[t.id] && project.tasks[t.id].done); }) || null;
  }

  function setTaskDone(state, projectId, taskId, done, now) {
    const p = projectById(state, projectId);
    if (!p) return false;
    const m = modelById(p.modelId);
    const t = m && m.tasks.find(function (x) { return x.id === taskId; });
    if (!t) return false;
    const cur = p.tasks[taskId] || { done: false, note: '' };
    cur.done = !!done;
    cur.doneAt = done ? now : null;
    if (done) { cur.read = true; cur.understood = true; }
    p.tasks[taskId] = cur;
    p.updatedAt = now;
    p.lastNote = done ? '"' + t.title + '" görevi tamamlandı.' : '"' + t.title + '" görevi tekrar açıldı.';
    return true;
  }
  // Okudum / anladım aşamaları (tamamlama ayrı; "anladım" işaretlemek "okudum"u da işaretler)
  function setTaskStage(state, projectId, taskId, stage, value, now) {
    const p = projectById(state, projectId);
    if (!p || (stage !== 'read' && stage !== 'understood')) return false;
    const m = modelById(p.modelId);
    if (!m || !m.tasks.some(function (x) { return x.id === taskId; })) return false;
    const cur = p.tasks[taskId] || { done: false, note: '' };
    if (stage === 'read') { cur.read = !!value; if (!value) cur.understood = false; }
    else { cur.understood = !!value; if (value) cur.read = true; }
    p.tasks[taskId] = cur; p.updatedAt = now;
    return true;
  }
  function setTaskNote(state, projectId, taskId, note, now) {
    const p = projectById(state, projectId);
    if (!p) return false;
    const m = modelById(p.modelId);
    const t = m && m.tasks.find(function (x) { return x.id === taskId; });
    if (!t) return false;
    const cur = p.tasks[taskId] || { done: false, note: '' };
    cur.note = String(note || '').slice(0, 2000);
    p.tasks[taskId] = cur;
    p.updatedAt = now;
    if (cur.note.trim()) p.lastNote = '"' + t.title + '" için not kaydedildi: ' + cur.note.trim().slice(0, 140);
    return true;
  }

  // ---------- Gelir - gider ----------
  const CATEGORIES = {
    in: [
      { id: 'satis', name: 'Satış' }, { id: 'hizmet', name: 'Hizmet bedeli' },
      { id: 'ortaklik', name: 'Ortaklık / reklam' }, { id: 'diger', name: 'Diğer' }
    ],
    out: [
      { id: 'arac', name: 'Araç / abonelik' }, { id: 'reklam', name: 'Reklam gideri' },
      { id: 'malzeme', name: 'Malzeme / ürün' }, { id: 'diger', name: 'Diğer' }
    ]
  };
  function categoryName(type, id) {
    const c = CATEGORIES[type === 'out' ? 'out' : 'in'].find(function (x) { return x.id === id; });
    return c ? c.name : 'Diğer';
  }
  function startOfDay(ts) { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function endOfDay(ts) { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1; }
  // "2026-10-23" -> o günün öğlen 12:00'si (yerel saat). Geçersizse null.
  function parseDateInput(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(y, mo - 1, d, 12, 0, 0);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt.getTime();
  }
  function dateInputValue(ts) { return dayKey(ts); }

  function addFinance(state, entry, now) {
    const amount = Number(String(entry.amount).replace(',', '.'));
    if (!isFinite(amount) || amount <= 0 || amount > 1e9) return null;
    const type = entry.type === 'out' ? 'out' : 'in';
    let date = now;
    if (entry.date) {
      date = parseDateInput(entry.date);
      if (date == null) return null;
      if (date > endOfDay(now)) return null;       // gelecek tarihe kayıt girilmez
    }
    const cat = CATEGORIES[type].some(function (c) { return c.id === entry.cat; }) ? entry.cat : 'diger';
    const src = state.projects && state.projects.some(function (p) { return p.id === entry.src; }) ? entry.src : '';
    const rec = { id: uid('fin'), type: type, amount: Math.round(amount * 100) / 100, cat: cat, note: String(entry.note || '').slice(0, 120), date: date, at: now };
    if (src) rec.src = src;
    state.finance.push(rec);
    return rec;
  }
  function removeFinance(state, id) {
    const n = state.finance.length;
    state.finance = state.finance.filter(function (f) { return f.id !== id; });
    return state.finance.length < n;
  }
  function financeSummary(state, now) {
    const mk = monthKey(now);
    const sum = { totalIn: 0, totalOut: 0, net: 0, monthIn: 0, monthOut: 0, monthNet: 0 };
    state.finance.forEach(function (f) {
      if (f.type === 'in') { sum.totalIn += f.amount; if (monthKey(f.date) === mk) sum.monthIn += f.amount; }
      else { sum.totalOut += f.amount; if (monthKey(f.date) === mk) sum.monthOut += f.amount; }
    });
    ['totalIn', 'totalOut', 'monthIn', 'monthOut'].forEach(function (k) { sum[k] = Math.round(sum[k] * 100) / 100; });
    sum.net = Math.round((sum.totalIn - sum.totalOut) * 100) / 100;
    sum.monthNet = Math.round((sum.monthIn - sum.monthOut) * 100) / 100;
    return sum;
  }

  // ---------- Grafik verileri ----------
  const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const DAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const PERIODS = { '7d': '7 Gün', '30d': '30 Gün', '12m': '12 Ay' };

  function periodRange(period, now) {
    const d = new Date(now);
    if (period === '12m') return { start: new Date(d.getFullYear(), d.getMonth() - 11, 1).getTime(), end: endOfDay(now) };
    const n = period === '30d' ? 30 : 7;
    return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate() - (n - 1)).getTime(), end: endOfDay(now) };
  }

  // period: '7d' | '30d' | '12m'. Her kova: gelir, gider, net ve birikimli net (dönemden önceki kayıtlar dahil).
  function financeSeries(state, period, now) {
    if (!PERIODS[period]) period = '7d';
    const d = new Date(now);
    const buckets = [];
    if (period === '12m') {
      for (let i = 11; i >= 0; i--) {
        const s = new Date(d.getFullYear(), d.getMonth() - i, 1);
        const e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1);
        buckets.push({ start: s.getTime(), end: e.getTime() - 1, label: MONTHS_TR[s.getMonth()], full: MONTHS_TR[s.getMonth()] + ' ' + s.getFullYear(), in: 0, out: 0 });
      }
    } else {
      const n = period === '30d' ? 30 : 7;
      for (let i = n - 1; i >= 0; i--) {
        const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
        const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i + 1);
        const dd = pad(s.getDate()) + '.' + pad(s.getMonth() + 1);
        buckets.push({ start: s.getTime(), end: e.getTime() - 1, label: n === 7 ? DAYS_TR[s.getDay()] : dd, full: dd + '.' + s.getFullYear(), in: 0, out: 0 });
      }
    }
    let baseline = 0;
    const first = buckets[0].start, last = buckets[buckets.length - 1].end;
    state.finance.forEach(function (f) {
      if (f.date < first) { baseline += f.type === 'in' ? f.amount : -f.amount; return; }
      if (f.date > last) return;
      for (let i = 0; i < buckets.length; i++) {
        if (f.date >= buckets[i].start && f.date <= buckets[i].end) { buckets[i][f.type] += f.amount; break; }
      }
    });
    let cum = baseline, max = 0, totIn = 0, totOut = 0;
    buckets.forEach(function (b) {
      b.in = Math.round(b.in * 100) / 100; b.out = Math.round(b.out * 100) / 100;
      b.net = Math.round((b.in - b.out) * 100) / 100;
      cum = Math.round((cum + b.net) * 100) / 100; b.cum = cum;
      max = Math.max(max, b.in, b.out);
      totIn += b.in; totOut += b.out;
    });
    return {
      period: period, buckets: buckets, max: max,
      totals: { in: Math.round(totIn * 100) / 100, out: Math.round(totOut * 100) / 100, net: Math.round((totIn - totOut) * 100) / 100 },
      empty: totIn === 0 && totOut === 0
    };
  }

  // Dönem içindeki gelir veya giderin kategorilere dağılımı (büyükten küçüğe).
  function categorySplit(state, type, period, now) {
    const r = periodRange(period, now);
    const map = {};
    let total = 0;
    state.finance.forEach(function (f) {
      if (f.type !== type || f.date < r.start || f.date > r.end) return;
      map[f.cat || 'diger'] = (map[f.cat || 'diger'] || 0) + f.amount;
      total += f.amount;
    });
    const list = Object.keys(map).map(function (k) {
      return { id: k, name: categoryName(type, k), amount: Math.round(map[k] * 100) / 100, pct: total ? map[k] / total * 100 : 0 };
    });
    list.sort(function (a, b) { return b.amount - a.amount; });
    return { items: list, total: Math.round(total * 100) / 100 };
  }

  // ---------- Aylık hedef ----------
  function setGoal(state, amount) {
    const n = Number(String(amount).replace(',', '.'));
    if (!isFinite(n) || n < 0 || n > 1e9) return false;
    state.goal.monthly = Math.round(n * 100) / 100;
    return true;
  }
  function goalProgress(state, now) {
    const target = state.goal.monthly || 0;
    const got = financeSummary(state, now).monthIn;
    const pct = target > 0 ? Math.min(100, Math.round(got / target * 100)) : 0;
    return { target: target, got: got, pct: pct, reached: target > 0 && got >= target, left: Math.max(0, Math.round((target - got) * 100) / 100) };
  }


  // ---------- Kayıt düzenleme ----------
  function updateFinance(state, id, entry, now) {
    const rec = state.finance.find(function (f) { return f.id === id; });
    if (!rec) return null;
    const tmp = { finance: [], projects: state.projects };
    const fresh = addFinance(tmp, entry, now);
    if (!fresh) return null;
    rec.type = fresh.type; rec.amount = fresh.amount; rec.cat = fresh.cat; rec.note = fresh.note; rec.date = fresh.date;
    if (fresh.src) rec.src = fresh.src; else delete rec.src;
    return rec;
  }

  // ---------- Aylık gider bütçesi ----------
  function setBudget(state, amount) {
    const n = Number(String(amount).replace(',', '.'));
    if (!isFinite(n) || n < 0 || n > 1e9) return false;
    state.goal.expenseMonthly = Math.round(n * 100) / 100;
    return true;
  }
  function budgetProgress(state, now) {
    const target = state.goal.expenseMonthly || 0;
    const spent = financeSummary(state, now).monthOut;
    const raw = target > 0 ? spent / target * 100 : 0;
    return { target: target, spent: spent, pct: Math.min(100, Math.round(raw)), over: target > 0 && spent > target,
      left: Math.max(0, Math.round((target - spent) * 100) / 100), overBy: Math.max(0, Math.round((spent - target) * 100) / 100) };
  }

  // ---------- Fiyat / satış hesaplayıcı (tahmindir, satış garantisi değildir) ----------
  function calcSales(o) {
    const num = function (v) { return Number(String(v == null ? '' : v).replace(',', '.')); };
    const price = num(o.price), cost = num(o.cost || 0), fee = num(o.fee || 0), target = num(o.target);
    if (!(price > 0) || price > 1e9) return { ok: false, error: 'Satış fiyatını yaz.' };
    if (!isFinite(cost) || cost < 0) return { ok: false, error: 'Birim maliyet geçersiz.' };
    if (!isFinite(fee) || fee < 0 || fee >= 100) return { ok: false, error: 'Komisyon oranı 0 ile 99 arasında olmalı.' };
    if (!(target > 0) || target > 1e9) return { ok: false, error: 'Hedef net geliri yaz.' };
    const net = Math.round((price * (1 - fee / 100) - cost) * 100) / 100;
    if (net <= 0) return { ok: false, error: 'Bu fiyatta her satıştan zarar ediyorsun (satış başına net ' + net.toFixed(2).replace('.', ',') + ' TL). Fiyatı artır veya maliyeti düşür.' };
    const sales = Math.ceil(target / net - 1e-9);
    return { ok: true, netPerSale: net, sales: sales, revenue: Math.round(sales * price * 100) / 100, perDay: Math.round(sales / 30 * 10) / 10 };
  }

  // ---------- Başlangıç kontrol listesi ----------
  function checklist(state, now) {
    const doneTasks = state.projects.some(function (p) { return Object.keys(p.tasks).some(function (k) { return p.tasks[k].done; }); });
    const items = [
      { id: 'name', title: 'Adını yaz', route: 'settings', done: !!state.user.name },
      { id: 'model', title: 'Gelir modelini seç', route: 'tasks', done: state.projects.length > 0 },
      { id: 'task', title: 'İlk görevi tamamla', route: 'tasks', done: doneTasks },
      { id: 'record', title: 'İlk gelir/gider kaydını gir', route: 'money', done: state.finance.some(function (f) { return !f.auto; }) },
      { id: 'goal', title: 'Aylık gelir hedefi koy', route: 'money', done: (state.goal.monthly || 0) > 0 }
    ];
    const done = items.filter(function (i) { return i.done; }).length;
    return { items: items, done: done, total: items.length, complete: done === items.length };
  }

  // ---------- Sözlük ----------
  function glossaryList(query) {
    const q = norm(query || '');
    const byText = {}, out = [];
    Object.keys(Data.GLOSSARY).forEach(function (k) {
      const t = Data.GLOSSARY[k];
      if (byText[t]) { byText[t].aliases.push(k); return; }
      byText[t] = { term: k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1), key: k, text: t, aliases: [] };
      out.push(byText[t]);
    });
    out.sort(function (a, b) { return a.term.localeCompare(b.term, 'tr'); });
    if (!q) return out;
    return out.filter(function (e) { return norm(e.key + ' ' + e.aliases.join(' ') + ' ' + e.text).indexOf(q) !== -1; });
  }

  // ---------- Tekrarlayan kayıtlar (kira, abonelik, düzenli gelir) ----------
  function monthlyNext(ts, dom, steps) {
    const d = new Date(ts);
    const y = d.getFullYear(), m = d.getMonth() + (steps || 1);
    const last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(dom, last), 12, 0, 0).getTime();
  }
  function addRecurring(state, e, now) {
    if (state.recurring.length >= 50) return null;
    const probe = addFinance({ finance: [], projects: [] }, { type: e.type, amount: e.amount, cat: e.cat, note: e.note }, now);
    if (!probe) return null;
    const start = parseDateInput(e.date || dateInputValue(now));
    if (start == null) return null;
    if (start > now + 400 * 86400000) return null;
    if (start < now - 400 * 86400000) return null;           // en fazla ~13 ay geriye
    const freq = e.freq === 'weekly' ? 'weekly' : 'monthly';
    const rec = { id: uid('rec'), type: probe.type, amount: probe.amount, cat: probe.cat, note: probe.note, freq: freq, dom: new Date(start).getDate(), next: start, active: true };
    state.recurring.push(rec);
    return rec;
  }
  function removeRecurring(state, id) {
    const n = state.recurring.length;
    state.recurring = state.recurring.filter(function (r) { return r.id !== id; });
    return state.recurring.length < n;
  }
  function toggleRecurring(state, id, now) {
    const r = state.recurring.find(function (x) { return x.id === id; });
    if (!r) return false;
    r.active = !r.active;
    if (r.active) {                                          // duraklatılan dönem geriye dönük eklenmesin
      while (r.next < startOfDay(now == null ? Date.now() : now)) r.next = r.freq === 'weekly' ? r.next + 7 * 86400000 : monthlyNext(r.next, r.dom, 1);
    }
    return true;
  }
  // Vadesi gelen tekrarlayan kayıtları ekler. Dönen: eklenen kayıt sayısı.
  function applyRecurring(state, now) {
    let made = 0;
    const limit = endOfDay(now);
    state.recurring.forEach(function (r) {
      if (!r.active) return;
      let guard = 0;
      while (r.next <= limit && guard < 60) {
        state.finance.push({ id: uid('fin'), type: r.type, amount: r.amount, cat: r.cat, note: r.note, date: r.next, at: now, auto: true, recId: r.id });
        made++; guard++;
        r.next = r.freq === 'weekly' ? r.next + 7 * 86400000 : monthlyNext(r.next, r.dom, 1);
      }
      if (guard >= 60) while (r.next <= limit) r.next = r.freq === 'weekly' ? r.next + 7 * 86400000 : monthlyNext(r.next, r.dom, 1);
    });
    return made;
  }

  // ---------- Birikim hedefleri ----------
  function addSaving(state, name, target, now) {
    const n = String(name || '').trim().slice(0, 40), t = Number(String(target).replace(',', '.'));
    if (!n || !isFinite(t) || t <= 0 || t > 1e9 || state.savings.length >= 50) return null;
    const v = { id: uid('sav'), name: n, target: Math.round(t * 100) / 100, saved: 0, at: now };
    state.savings.push(v);
    return v;
  }
  function contributeSaving(state, id, amount) {
    const v = state.savings.find(function (x) { return x.id === id; });
    const a = Number(String(amount).replace(',', '.'));
    if (!v || !isFinite(a) || a === 0 || Math.abs(a) > 1e9) return false;
    v.saved = Math.max(0, Math.round((v.saved + a) * 100) / 100);
    return true;
  }
  function removeSaving(state, id) {
    const n = state.savings.length;
    state.savings = state.savings.filter(function (x) { return x.id !== id; });
    return state.savings.length < n;
  }
  function savingProgress(v) {
    const pct = Math.min(100, Math.round(v.saved / v.target * 100));
    return { pct: pct, reached: v.saved >= v.target, left: Math.max(0, Math.round((v.target - v.saved) * 100) / 100) };
  }

  // ---------- Vergi payı ayırma (bilgi amaçlı, vergi tavsiyesi değildir) ----------
  function setTaxPct(state, pct) {
    const n = Number(String(pct).replace(',', '.'));
    if (!isFinite(n) || n < 0 || n > 60) return false;
    state.settings.taxPct = Math.round(n * 10) / 10;
    return true;
  }
  function taxReserve(state, now) {
    const pct = state.settings.taxPct || 0, net = financeSummary(state, now).monthNet;
    return { pct: pct, monthNet: net, amount: pct > 0 && net > 0 ? Math.round(net * pct) / 100 : 0 };
  }

  // ---------- Kaynağa (proje) göre net ----------
  function sourceSplit(state) {
    const map = {};
    state.finance.forEach(function (f) {
      const k = f.src || '';
      const m = map[k] || (map[k] = { id: k, name: '', in: 0, out: 0, net: 0 });
      m[f.type] += f.amount;
    });
    const out = Object.keys(map).map(function (k) {
      const m = map[k], p = k ? state.projects.find(function (x) { return x.id === k; }) : null;
      m.name = k ? (p ? p.title : 'Silinmiş proje') : 'Genel';
      m.in = Math.round(m.in * 100) / 100; m.out = Math.round(m.out * 100) / 100; m.net = Math.round((m.in - m.out) * 100) / 100;
      return m;
    }).sort(function (a, b) { return b.net - a.net; });
    return { items: out, hasSources: state.finance.some(function (f) { return f.src; }) };
  }

  // ---------- Seri ve rozetler ----------
  function activityDays(state) {
    const set = {};
    function mark(ts) { if (ts) set[dayKey(ts)] = true; }
    state.projects.forEach(function (p) { Object.keys(p.tasks).forEach(function (k) { if (p.tasks[k].done) mark(p.tasks[k].doneAt); }); });
    state.finance.forEach(function (f) { if (!f.auto) mark(f.at || f.date); });
    state.chat.forEach(function (c) { if (c.role === 'user') mark(c.at); });
    state.plans.forEach(function (p) { mark(p.createdAt); });
    return set;
  }
  function streak(state, now) {
    const set = activityDays(state);
    const d = new Date(now);
    function keyBack(i) { return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - i).getTime()); }
    const today = !!set[keyBack(0)];
    let i = today ? 0 : 1, cur = 0;
    while (set[keyBack(i)]) { cur++; i++; if (i > 3650) break; }
    // en iyi seri
    const keys = Object.keys(set).sort();
    let best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      const parts = k.split('-');
      const t = new Date(+parts[0], +parts[1] - 1, +parts[2]).getTime();
      run = (prev !== null && Math.round((t - prev) / 86400000) === 1) ? run + 1 : 1;
      prev = t; if (run > best) best = run;
    });
    return { current: cur, best: Math.max(best, cur), activeToday: today };
  }
  function badges(state, now) {
    const st = streak(state, now);
    const gp = goalProgress(state, now);
    const doneTasks = state.projects.reduce(function (n, p) { return n + progress(p).done; }, 0);
    const projDone = state.projects.some(function (p) { return progress(p).complete; });
    const manual = state.finance.filter(function (f) { return !f.auto; });
    const firstIncome = manual.some(function (f) { return f.type === 'in'; });
    return [
      { id: 'first-task', emoji: '🌱', title: 'İlk adım', desc: 'İlk görevini tamamla', earned: doneTasks >= 1 },
      { id: 'first-record', emoji: '🧾', title: 'Kayıt tutan', desc: 'İlk gelir/gider kaydını gir', earned: manual.length >= 1 },
      { id: 'first-income', emoji: '💰', title: 'İlk gelir', desc: 'İlk gerçek gelirini kaydet', earned: firstIncome },
      { id: 'streak-3', emoji: '🔥', title: '3 gün seri', desc: 'Üst üste 3 gün çalış', earned: st.best >= 3 },
      { id: 'streak-7', emoji: '⚡', title: '7 gün seri', desc: 'Üst üste 7 gün çalış', earned: st.best >= 7 },
      { id: 'goal', emoji: '🎯', title: 'Hedef tamam', desc: 'Aylık gelir hedefine ulaş', earned: gp.reached },
      { id: 'project', emoji: '🏆', title: 'Proje bitti', desc: 'Bir projenin tüm görevlerini bitir', earned: projDone }
    ];
  }

  // ---------- Aylık özet ----------
  function monthSummary(state, y, m) {
    const s = new Date(y, m, 1).getTime(), e = new Date(y, m + 1, 1).getTime() - 1;
    const r = { in: 0, out: 0, net: 0, cats: { in: {}, out: {} }, count: 0 };
    state.finance.forEach(function (f) {
      if (f.date < s || f.date > e) return;
      r.count++;
      r[f.type] += f.amount;
      r.cats[f.type][f.cat || 'diger'] = (r.cats[f.type][f.cat || 'diger'] || 0) + f.amount;
    });
    r.in = Math.round(r.in * 100) / 100; r.out = Math.round(r.out * 100) / 100;
    r.net = Math.round((r.in - r.out) * 100) / 100;
    return r;
  }
  function topCat(cats, type) {
    let best = null;
    Object.keys(cats).forEach(function (k) { if (!best || cats[k] > best.amount) best = { id: k, name: categoryName(type, k), amount: Math.round(cats[k] * 100) / 100 }; });
    return best;
  }
  // Bu ay / geçen ay karşılaştırması ve kısa içgörüler (yalnızca girilen gerçek kayıtlara dayanır).
  function insights(state, now) {
    const d = new Date(now);
    const cur = monthSummary(state, d.getFullYear(), d.getMonth());
    const prev = monthSummary(state, d.getFullYear(), d.getMonth() - 1);
    return {
      hasData: cur.count > 0 || prev.count > 0,
      thisMonth: { in: cur.in, out: cur.out, net: cur.net },
      lastMonth: { in: prev.in, out: prev.out, net: prev.net },
      hasLast: prev.count > 0,
      diffNet: Math.round((cur.net - prev.net) * 100) / 100,
      bestIncome: topCat(cur.cats.in, 'in'),
      topExpense: topCat(cur.cats.out, 'out'),
      savingsRate: cur.in > 0 ? Math.round(cur.net / cur.in * 100) : null
    };
  }

  // ---------- Hatırlatıcı ----------
  function setReminder(state, enabled, time) {
    if (time != null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) return false;
    if (time != null) state.settings.reminder.time = String(time);
    if (enabled != null) state.settings.reminder.enabled = !!enabled;
    return true;
  }

  // ---------- Uygulama kilidi (PIN özeti ana dosyada üretilir; burada yalnızca saklanır) ----------
  function isValidPin(pin) { return /^\d{4}$/.test(String(pin)); }
  function setLock(state, salt, hash) {
    if (!salt || !hash) return false;
    state.lock = { enabled: true, salt: String(salt), hash: String(hash) };
    return true;
  }
  function clearLock(state) { state.lock = { enabled: false, salt: '', hash: '' }; }

  // ---------- Yedekten geri yükleme ----------
  const MAX_IMPORT_CHARS = 5 * 1024 * 1024;
  function importData(text) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'Dosya boş.' };
    if (text.length > MAX_IMPORT_CHARS) return { ok: false, error: 'Dosya çok büyük.' };
    let raw;
    try { raw = JSON.parse(text.replace(/^﻿/, '')); } catch (e) { return { ok: false, error: 'Bu bir yedek dosyası değil (JSON okunamadı).' }; }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Yedek dosyası geçersiz.' };
    if (!('finance' in raw) && !('projects' in raw) && !('user' in raw)) return { ok: false, error: 'Bu dosya Pasif Gelirim yedeği gibi görünmüyor.' };
    const st = migrate(raw);
    // geçersiz kayıtları ayıkla, sayıları sınırla
    st.finance = st.finance.filter(function (f) {
      return f && (f.type === 'in' || f.type === 'out') && isFinite(f.amount) && f.amount > 0 && f.amount <= 1e9 && isFinite(f.date);
    }).slice(-5000).map(function (f) {
      return { id: String(f.id || uid('fin')), type: f.type, amount: Math.round(f.amount * 100) / 100, cat: f.cat || 'diger', note: String(f.note || '').slice(0, 120), date: +f.date, at: +f.at || +f.date, src: f.src && st.projects.some(function (p) { return p.id === f.src; }) ? f.src : undefined, auto: f.auto ? true : undefined };
    });
    st.projects = st.projects.filter(function (p) { return p && modelById(p.modelId) && p.tasks && typeof p.tasks === 'object'; }).slice(0, 200);
    trimChat(st);
    st.plans = st.plans.slice(-200);
    st.decisions = st.decisions.slice(-200);
    if (!projectById(st, st.activeProjectId)) st.activeProjectId = st.projects.length ? st.projects[st.projects.length - 1].id : null;
    return { ok: true, state: st, counts: { finance: st.finance.length, projects: st.projects.length } };
  }

  // ---------- Tema ----------
  function setLook(state, key, value) {
    const l = state.settings.look;
    if (key === 'accent') {
      if (ACCENTS.indexOf(value) === -1) return false;
      l.accent = value; return true;
    }
    if (key === 'custom') {
      if (!HEX.test(String(value))) return false;
      l.custom = String(value).toLowerCase(); l.accent = 'custom'; return true;
    }
    if (key === 'font') { if (FONT_SCALES.indexOf(value) === -1) return false; l.font = value; return true; }
    if (key === 'radius') { if (RADII.indexOf(value) === -1) return false; l.radius = value; return true; }
    if (key === 'motion') { if (MOTIONS.indexOf(value) === -1) return false; l.motion = value; return true; }
    if (key.indexOf('home.') === 0) {
      const k = key.slice(5);
      if (!(k in l.home)) return false;
      l.home[k] = !!value; return true;
    }
    return false;
  }
  function setAvatar(state, dataUrl) {
    if (dataUrl === '' || dataUrl == null) { state.user.avatar = ''; return true; }
    if (typeof dataUrl !== 'string' || dataUrl.length > 250000 || !AVATAR_RE.test(dataUrl)) return false;
    state.user.avatar = dataUrl; return true;
  }
  const LANG_CODES = ['auto', 'tr', 'en', 'de', 'es', 'ru', 'ar'];
  const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'RUB', 'SAR', 'AED'];
  const LANG_CURRENCY = { tr: 'TRY', en: 'USD', de: 'EUR', es: 'EUR', ru: 'RUB', ar: 'SAR' };
  function setLanguage(state, code) {
    if (LANG_CODES.indexOf(code) === -1) return false;
    state.settings.lang = code; return true;
  }
  // Para birimi yalnızca gösterim etiketidir; tutarlar dönüştürülmez.
  function setCurrency(state, code) {
    if (CURRENCIES.indexOf(code) === -1) return false;
    state.settings.currency = code; return true;
  }
  function setTheme(state, theme) {
    if (THEMES.indexOf(theme) === -1) return false;
    state.settings.theme = theme;
    return true;
  }

  // ---------- Paketler (TEST modu: gerçek ödeme yok) ----------
  function setPackage(state, pkgId, now) {
    if (!PACKAGES[pkgId]) return false;
    const prev = PACKAGES[state.pkg] || PACKAGES.free;
    const next = PACKAGES[pkgId];
    state.pkg = pkgId;
    if (next.tier === 0 && prev.tier > 0) {
      state.cancelledAt = now;
      state.addonNarration = false;
    }
    if (next.tier > 0) state.cancelledAt = null;
    if (next.tier < 1) state.addonNarration = false;
    return true;
  }
  function buyNarration(state) {
    if (state.pkg !== 'manual') return false;
    state.addonNarration = true;
    return true;
  }
  function cancelNarration(state) { state.addonNarration = false; }

  // ---------- Geçmiş İşlemler ----------
  // Gösterilecekler: tamamlanmış çalışmalar + yalnızca EN SON yarım kalan proje.
  function history(state) {
    const completed = [];
    state.projects.forEach(function (p) {
      const m = modelById(p.modelId);
      if (!m) return;
      const items = m.tasks.filter(function (t) { return p.tasks[t.id] && p.tasks[t.id].done; }).map(function (t) {
        return { taskId: t.id, title: t.title, doneAt: p.tasks[t.id].doneAt || p.updatedAt, note: p.tasks[t.id].note || '' };
      });
      const plans = state.plans.filter(function (pl) { return pl.projectId === p.id; });
      if (items.length || plans.length) completed.push({ projectId: p.id, projectTitle: p.title, items: items, plans: plans, projectComplete: progress(p).complete });
    });
    let last = null;
    state.projects.forEach(function (p) {
      const pr = progress(p);
      if (pr.complete) return;
      if (!last || p.updatedAt > last.updatedAt) last = p;
    });
    const lastUnfinished = last ? {
      projectId: last.id, title: last.title, updatedAt: last.updatedAt, lastNote: last.lastNote,
      progress: progress(last), next: nextTask(last)
    } : null;
    return { completed: completed, lastUnfinished: lastUnfinished };
  }

  // ---------- Otomasyon (Yarı Otomasyon / CEO) ----------
  function generatePlan(state, project, days, now) {
    const m = modelById(project.modelId);
    const n = Math.max(1, Math.min(30, days | 0));
    const lines = [];
    for (let i = 0; i < n; i++) {
      const d = now + i * 86400000;
      lines.push('Gün ' + (i + 1) + ' (' + formatDate(d) + '): ' + m.planIdeas[i % m.planIdeas.length]);
      if (i % 7 === 6 && i < n - 1) lines.push('— Hafta değerlendirmesi: Ne işe yaradı? Gelecek hafta neyi değiştireceksin?');
    }
    const plan = {
      id: uid('plan'), projectId: project.id, title: n + ' günlük ' + m.title + ' planı',
      createdAt: now, text: lines.join('\n')
    };
    state.plans.push(plan);
    project.updatedAt = now;
    project.lastNote = n + ' günlük plan hazırlandı.';
    return plan;
  }
  function ensureDecisions(state, project, now) {
    const m = modelById(project.modelId);
    const open = state.decisions.filter(function (d) { return d.projectId === project.id && d.status === 'bekliyor'; });
    if (open.length) return open;
    const made = m.decisions.map(function (text) {
      return { id: uid('dec'), projectId: project.id, text: text, status: 'bekliyor', createdAt: now };
    });
    made.forEach(function (d) { state.decisions.push(d); });
    return made;
  }
  function decide(state, id, status, now) {
    const d = state.decisions.find(function (x) { return x.id === id; });
    if (!d || (status !== 'onaylandı' && status !== 'reddedildi')) return false;
    d.status = status; d.decidedAt = now;
    const p = projectById(state, d.projectId);
    if (p) { p.updatedAt = now; p.lastNote = 'Karar: "' + d.text + '" → ' + status + '.'; }
    return true;
  }

  // ---------- Yerel yapay zekâ (DEMO) ----------
  // Gerçek yapay zekâ için ileride bir sunucu (backend) bağlanacak. Şimdilik kural tabanlı yanıt verir.
  function norm(s) { return String(s || '').toLocaleLowerCase('tr'); }

  function explainTerm(text) {
    const t = norm(text);
    const found = [];
    Object.keys(Data.GLOSSARY).forEach(function (k) {
      if (t.indexOf(k) !== -1 && found.indexOf(Data.GLOSSARY[k]) === -1) found.push(Data.GLOSSARY[k]);
    });
    return found;
  }

  // ---------- Proje bazlı yapay zekâ hafızası (Aşama 4) ----------
  // İlke: hafıza proje nesnesinin İÇİNDE durur (p.memory); başka projeye yazılabilecek ortak bir alan yoktur.
  // Kalıcı bilgi yalnızca kullanıcı onayıyla (veya kendi elle yazmasıyla) girer. Görev ilerlemesi gibi
  // değişen veriler saklanmaz, her seferinde projeden hesaplanır; böylece eski bilgi çelişki yaratmaz.
  const MEMORY_KINDS = { goal: 'Hedef', decision: 'Karar', pref: 'Tercih', note: 'Not', status: 'Son nokta' };
  const MEMORY_LIMITS = { items: 40, text: 240, pending: 3, chat: 100, server: 1200 };
  const SENSITIVE_RE = /şifre|sifre|parola|password|\bpin\b|\bcvv\b|\bcvc\b|\biban\b|kart\s*(no|numar)|kimlik\s*(no|numar)|\btc\s*kimlik|api.?key|(?:\d[\s-]?){11,}|\b[a-z]{2}\d{2}(?:\s?[a-z0-9]{4}){4,}\b/i;
  function isSensitive(text) { return SENSITIVE_RE.test(String(text || '')); }
  function cleanMemText(t) { return String(t || '').replace(/\s+/g, ' ').trim().slice(0, MEMORY_LIMITS.text); }
  function cleanMemory(m) {
    const out = { items: [], pending: [] };
    if (!m || typeof m !== 'object') return out;
    const seen = {};
    (Array.isArray(m.items) ? m.items : []).forEach(function (x) {
      if (!x || typeof x !== 'object' || !MEMORY_KINDS[x.kind]) return;
      const text = cleanMemText(x.text);
      if (!text || isSensitive(text) || out.items.length >= MEMORY_LIMITS.items) return;
      let id = String(x.id || uid('mem')); if (seen[id]) id = uid('mem'); seen[id] = 1;
      out.items.push({ id: id, kind: x.kind, text: text, at: +x.at || 0, old: x.old === true, by: x.by === 'chat' ? 'chat' : 'user' });
    });
    (Array.isArray(m.pending) ? m.pending : []).forEach(function (x) {
      if (!x || typeof x !== 'object' || !MEMORY_KINDS[x.kind]) return;
      const text = cleanMemText(x.text);
      if (!text || isSensitive(text) || out.pending.length >= MEMORY_LIMITS.pending) return;
      out.pending.push({ id: String(x.id || uid('pend')), kind: x.kind, text: text, at: +x.at || 0 });
    });
    return out;
  }
  function memOf(p) { if (!p.memory || !Array.isArray(p.memory.items) || !Array.isArray(p.memory.pending)) p.memory = cleanMemory(p.memory); return p.memory; }
  function memKey(t) { return String(t || '').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
  function memTarget(state, id) { const p = projectById(state, id); return p && !isArchived(p) ? p : null; }

  function addMemory(state, projectId, kind, text, now, by) {
    const p = memTarget(state, projectId);
    if (!p) return { ok: false, error: 'Arşivdeki veya olmayan projenin hafızası değiştirilemez.' };
    if (!MEMORY_KINDS[kind]) return { ok: false, error: 'Geçersiz bilgi türü.' };
    const t = cleanMemText(text);
    if (!t) return { ok: false, error: 'Bilgi boş olamaz.' };
    if (isSensitive(t)) return { ok: false, error: 'Şifre, PIN, kart/IBAN veya kimlik numarası gibi hassas bilgiler hafızaya kaydedilmez.' };
    const m = memOf(p);
    if (kind === 'status') m.items = m.items.filter(function (x) { return x.kind !== 'status'; });   // "son nokta" tek olur: eskisi çelişmesin
    const dup = m.items.find(function (x) { return x.kind === kind && memKey(x.text) === memKey(t); });
    if (dup) { dup.at = now; dup.old = false; p.updatedAt = now; return { ok: true, item: dup, dup: true }; }
    if (m.items.length >= MEMORY_LIMITS.items) return { ok: false, error: 'Hafıza dolu (' + MEMORY_LIMITS.items + ' bilgi). Eski bir bilgiyi silip tekrar dene.' };
    const item = { id: uid('mem'), kind: kind, text: t, at: now, old: false, by: by === 'chat' ? 'chat' : 'user' };
    m.items.push(item); p.updatedAt = now;
    return { ok: true, item: item };
  }
  function updateMemory(state, projectId, itemId, fields, now) {
    const p = memTarget(state, projectId); if (!p) return { ok: false, error: 'Arşivdeki veya olmayan projenin hafızası değiştirilemez.' };
    const it = memOf(p).items.find(function (x) { return x.id === itemId; }); if (!it) return { ok: false, error: 'Bilgi bulunamadı.' };
    const f = fields || {};
    if ('text' in f) {
      const t = cleanMemText(f.text);
      if (!t) return { ok: false, error: 'Bilgi boş olamaz.' };
      if (isSensitive(t)) return { ok: false, error: 'Şifre, PIN, kart/IBAN veya kimlik numarası gibi hassas bilgiler hafızaya kaydedilmez.' };
      it.text = t;
    }
    if ('kind' in f && MEMORY_KINDS[f.kind]) it.kind = f.kind;
    if ('old' in f) it.old = !!f.old;
    it.at = now; p.updatedAt = now;
    return { ok: true, item: it };
  }
  function removeMemory(state, projectId, itemId) {
    const p = memTarget(state, projectId); if (!p) return false;
    const m = memOf(p), n = m.items.length;
    m.items = m.items.filter(function (x) { return x.id !== itemId; });
    return m.items.length < n;
  }
  function clearMemory(state, projectId) {
    const p = memTarget(state, projectId); if (!p) return 0;
    const m = memOf(p), n = m.items.length + m.pending.length;
    m.items = []; m.pending = [];
    return n;
  }
  // Sohbette yazılan cümleden "kaydedeyim mi?" önerisi çıkarır. Hiçbir şey kendiliğinden kaydedilmez.
  function guessKind(t) {
    if (/karar verdim|karar verdik|karar aldım|ile devam edece|ile devam ediyorum|yapmaya karar|seçtim|vazgeçtim/.test(t)) return 'decision';
    if (/hedefim|amacım|hedef olarak|hedefimiz/.test(t)) return 'goal';
    if (/tercihim|istemiyorum|unutma|hatırla|asla |her zaman |özellikle/.test(t)) return 'pref';
    if (/bitirdim|tamamladım|şu an .*(yapıyorum|çalışıyorum)|şimdi .*(yapıyorum|çalışıyorum)|sırada .* var|son olarak/.test(t)) return 'status';
    return '';
  }
  function chatProject(state) {
    if (state.chatGeneral) return null;
    const p = activeProject(state);
    return p && !isArchived(p) ? p : null;
  }
  function suggestMemory(state, text, now) {
    const p = chatProject(state); if (!p) return null;
    const raw = String(text || '').trim();
    if (raw.length < 12 || /\?\s*$/.test(raw)) return null;
    const kind = guessKind(norm(raw)); if (!kind) return null;
    const t = cleanMemText(raw);
    if (isSensitive(t)) return null;
    const m = memOf(p);
    if (m.items.some(function (x) { return x.kind === kind && memKey(x.text) === memKey(t); })) return null;
    if (m.pending.some(function (x) { return memKey(x.text) === memKey(t); })) return null;
    const pend = { id: uid('pend'), kind: kind, text: t, at: now };
    m.pending.push(pend);
    while (m.pending.length > MEMORY_LIMITS.pending) m.pending.shift();
    return pend;
  }
  function confirmMemory(state, projectId, pendId, now) {
    const p = memTarget(state, projectId); if (!p) return { ok: false, error: 'Proje bulunamadı.' };
    const m = memOf(p), pe = m.pending.find(function (x) { return x.id === pendId; });
    if (!pe) return { ok: false, error: 'Öneri bulunamadı.' };
    const r = addMemory(state, projectId, pe.kind, pe.text, now, 'chat');
    if (r.ok) m.pending = m.pending.filter(function (x) { return x.id !== pendId; });
    return r;
  }
  function dismissMemory(state, projectId, pendId) {
    const p = projectById(state, projectId); if (!p) return false;
    const m = memOf(p), n = m.pending.length;
    m.pending = m.pending.filter(function (x) { return x.id !== pendId; });
    return m.pending.length < n;
  }
  // Tek projenin bağlamı: yalnızca o projenin kendi verisinden hesaplanır (başka proje karışmaz).
  function projectContext(state, projectId, forServer) {
    const p = projectById(state, projectId); if (!p) return null;
    const m = modelById(p.modelId), pr = progress(p), items = memOf(p).items;
    const done = [], doing = [];
    if (m) m.tasks.forEach(function (t) {
      const st = p.tasks[t.id];
      if (st && st.done) done.push(t.title); else if (st && (st.read || st.understood)) doing.push(t.title);
    });
    const nt = nextTask(p);
    const cur = items.filter(function (x) { return !x.old; }).sort(function (a, b) { return b.at - a.at; });
    const byKind = function (k) { return cur.filter(function (x) { return x.kind === k; }).map(function (x) { return x.text; }); };
    const ctx = {
      id: p.id, title: p.title, desc: p.desc || '', model: m ? m.title : '', goalIncome: p.goal || 0,
      progress: { done: pr.done, total: pr.total, pct: pr.pct }, doneTasks: done, doingTasks: doing, nextTask: nt ? nt.title : '',
      note: p.note || '', goals: byKind('goal'), decisions: byKind('decision'), prefs: byKind('pref'), notes: byKind('note'), status: byKind('status')[0] || '',
      archived: isArchived(p)
    };
    const L = ['Proje: ' + ctx.title + (ctx.model ? ' (gelir modeli: ' + ctx.model + ')' : '')];
    if (ctx.desc && !forServer) L.push('Açıklama: ' + ctx.desc);   // serbest metin: onaylı hafıza değil, sunucuya gitmez
    L.push('Görev ilerlemesi: ' + pr.done + '/' + pr.total + (done.length ? '. Tamamlanan: ' + done.join(', ') : '') + (doing.length ? '. Devam eden: ' + doing.join(', ') : '') + (ctx.nextTask ? '. Sıradaki: ' + ctx.nextTask : ''));
    if (ctx.goalIncome > 0 && !forServer) L.push('Proje gelir hedefi: ' + ctx.goalIncome);   // para tutarı sunucuya gitmez
    if (ctx.status) L.push('Son nokta: ' + ctx.status);
    if (ctx.goals.length) L.push('Hedefler: ' + ctx.goals.join(' | '));
    if (ctx.decisions.length) L.push('Kararlar: ' + ctx.decisions.join(' | '));
    if (ctx.prefs.length) L.push('Tercihler: ' + ctx.prefs.join(' | '));
    if (ctx.notes.length) L.push('Notlar: ' + ctx.notes.join(' | '));
    ctx.text = L.join('\n');
    return ctx;
  }
  // Sunucuya gidebilecek metin: yalnızca kullanıcı izin verdiyse, yalnızca aktif projenin özeti; serbest not ve finans hariç.
  function memoryForServer(state) {
    if (!state.settings.aiShareMemory) return '';
    const p = chatProject(state); if (!p) return '';
    return projectContext(state, p.id, true).text.slice(0, MEMORY_LIMITS.server);
  }
  // Modele giden önceki mesajlar: yalnızca bu sohbetin (proje/genel) mesajları, demo yanıtları hariç,
  // en fazla maxMsgs mesaj ve toplam maxChars karakter (en yeniler korunur). Token tüketimini sınırlar.
  function chatContext(state, pid, maxMsgs, maxChars) {
    maxMsgs = maxMsgs || 10; maxChars = maxChars || 3000;
    const list = state.chat.filter(function (c) { return (c.pid || '') === (pid || '') && !(c.role !== 'user' && c.src === 'demo'); }).slice(-maxMsgs);
    const out = []; let total = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const t = String(list[i].text || '').slice(0, 500);
      if (total + t.length > maxChars && out.length) break;
      total += t.length; out.unshift({ role: list[i].role === 'user' ? 'user' : 'assistant', text: t });
    }
    return out;
  }
  // Ücretli gerçek yapay zekâ ancak kullanıcı bilerek açtıysa kullanılır.
  function setAiConsent(state, on, now) { state.settings.aiConsent = on ? (now || Date.now()) : 0; return true; }
  function hasAiConsent(state) { return +state.settings.aiConsent > 0; }

  // ---- Sohbet: her mesaj bir projeye (pid) ya da "genel"e ('') bağlıdır ----
  function chatPid(state) { const p = chatProject(state); return p ? p.id : ''; }
  function chatFor(state) { const pid = chatPid(state); return state.chat.filter(function (m) { return (m.pid || '') === pid; }); }
  function trimChat(state) {
    const count = {};
    for (let i = state.chat.length - 1; i >= 0; i--) {
      const k = state.chat[i].pid || '';
      count[k] = (count[k] || 0) + 1;
      if (count[k] > MEMORY_LIMITS.chat) state.chat[i] = null;
    }
    state.chat = state.chat.filter(Boolean);
  }
  // src: 'ai' = gerçek model yanıtı, 'demo' = yerel kural tabanlı yanıt (gerçek model gibi gösterilmez)
  function addChat(state, role, text, now, pid, src) {
    state.chat.push({ role: role === 'user' ? 'user' : 'ai', text: String(text || ''), at: now, pid: typeof pid === 'string' ? pid : chatPid(state), src: role === 'user' ? '' : (src === 'ai' ? 'ai' : src === 'demo' ? 'demo' : '') });
    trimChat(state);
  }
  function setChatScope(state, general) { state.chatGeneral = !!general; return true; }

  function aiReply(state, text, now) {
    const t = norm(text);
    const ent = entitlements(state);
    if (!t.trim()) return 'Bir soru yazarsan yardımcı olurum.';

    if (/otomatik|benim yerime|benim için .*(hazırla|üret|yayımla|yayinla|yap)|\b\d+\s*(video|içerik|gönderi)/.test(t)) {
      if (ent.automation) return 'Bu tür hazırlıkları "Otomasyon" bölümünden yapabilirsin. Orada günlük planı senin için hazırlıyorum.';
      return 'Bu işlemleri senin adına otomatik yapmak ücretli paketlerin (Yarı Otomasyon / CEO Modu) bir özelliği. Ama bunu kendin yapabilmen için yöntemi anlatabilirim: hedefini, haftalık sıklığını ve formatını seç, sonra her içeriği adım adım hazırla. İstersen ilk adımı birlikte netleştirelim.';
    }
    if (/hafıza|hafiza|ne biliyorsun|bu proje(m)? (hakkında|ile ilgili)|projemi özetle|özetle|neler karar|ne karar/.test(t)) {
      const cp = chatProject(state);
      if (!cp) return 'Şu an genel sohbettesin; hiçbir projenin hafızasını kullanmıyorum. Bir proje seçersen o projeye kaydettiğin bilgileri ve görev durumunu söyleyebilirim.';
      const c = projectContext(state, cp.id);
      return '"' + c.title + '" projesi için cihazındaki kayıtlardan bildiklerim:\n' + c.text + '\n\nHafızayı Yapay Zekâ > Hafıza ekranından görüp düzenleyebilir veya silebilirsin. (Demo yapay zekâ: bu özeti kurallara göre hazırlıyorum, gerçek bir model yazmıyor.)';
    }
    if (/ilerleme|kaç görev|ne kadar (yaptım|bitirdim)|ne durumda/.test(t)) {
      const cp = chatProject(state);
      if (!cp) return 'Genel sohbettesin. Bir proje seçersen görev ilerlemeni söyleyebilirim.';
      const pr = progress(cp), nt = nextTask(cp);
      return '"' + cp.title + '" projesinde ' + pr.total + ' görevin ' + pr.done + '\'i tamamlandı (%' + pr.pct + ').' + (nt ? ' Sıradaki görev: "' + nt.title + '".' : ' Tüm görevler tamam.');
    }
    // Dürüstlük sorusu her zaman öncelikli (içinde "kazanç" geçse bile)
    if (/garanti|ne kadar kazan|kaç para|zengin|milyon|hemen para/.test(t)) {
      return 'Dürüst olmak istiyorum: hiçbir gelir modeli için garanti verilemez. Çoğu iş ilk haftalarda hiç gelir getirmeyebilir. Önemli olan küçük adımlarla ilerleyip gerçek rakamlarını Kazanç bölümünde takip etmek.';
    }
    if (/grafik|kazanç|kazancı|gelir.?gider|bütçe|aylık hedef|gelir hedef|hedefim/.test(t)) {
      return 'Gelir-gider kayıtlarını ve grafiklerini alttaki Kazanç sekmesinden herkes ücretsiz kullanabilir. Orada aylık hedef de koyabilirsin. Gerçek rakamlarını girdikçe grafikler kendiliğinden çizilir.';
    }
    if (/\bseri\b|\bserim\b|rozet/.test(t)) {
      return 'Ana ekrandaki çalışma serisi, her gün görev tamamladığında, kayıt girdiğinde veya sohbet ettiğinde artar. Rozetler de ana ekranda duruyor.';
    }
    if (/geçmiş|eski çalışma|eski işlem|nereden (bul|ulaş)/.test(t)) {
      return 'Daha önce tamamladığın çalışmalara ekranın üst kısmındaki ↶ simgesinden (Geçmiş İşlemler) ulaşabilirsin.';
    }
    const terms = explainTerm(t);
    if (terms.length) return terms.join('\n\n');

    const p = chatProject(state);
    if (/nereden başla|ne yapmalıyım|sıradaki|başla/.test(t)) {
      if (p) {
        const nt = nextTask(p);
        if (nt) return 'Sıradaki görevin: "' + nt.title + '". Görevler bölümünden açıklamasını okuyabilirsin. Anlamadığın bir yer olursa bana sor.';
        return 'Tüm görevlerini tamamlamışsın. Sonuçlarını Kazanç bölümünde takip edebilir ve neyi geliştireceğine karar verebilirsin.';
      }
      return ent.selectModel
        ? 'Önce Görevler bölümünden birkaç kısa soruyu cevaplayıp sana uygun gelir modelini seçebilirsin.'
        : 'Gelir modeli seçmek ve görev listesini kullanmak için Manuel pakete geçmen gerekir. Şimdilik genel sorularını burada sorabilirsin.';
    }
    if (p) {
      const nt = nextTask(p);
      return 'Bunu biraz daha açabilir misin? Ya da "hedef kitle", "niş", "portfolyo" gibi anlamadığın bir terimi yaz, açıklayayım.' +
        (nt ? ' Şu an sıradaki görevin "' + nt.title + '".' : '');
    }
    return 'Bunu biraz daha açabilir misin? Anlamadığın bir terimi (örneğin "hedef kitle" veya "niş") yazarsan açıklayabilirim.';
  }

  // ---------- Dışa aktarma ----------
  // Yedeğe PIN özeti konmaz (başkasına gönderilen dosyada kilit bilgisi olmasın).
  function exportData(state) {
    const copy = Object.assign({}, state);
    delete copy.lock;
    return JSON.stringify(copy, null, 2);
  }

  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;           // Excel formül enjeksiyonunu engelle
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function exportCsv(state) {
    const cur = state.settings && state.settings.currency, unit = !cur || cur === 'TRY' ? 'TL' : cur;
    const rows = ['Tarih;Tür;Kategori;Tutar (' + unit + ');Not'];
    state.finance.slice().sort(function (a, b) { return a.date - b.date; }).forEach(function (f) {
      rows.push([formatDate(f.date), f.type === 'in' ? 'Gelir' : 'Gider', categoryName(f.type, f.cat), String(f.amount).replace('.', ','), f.note].map(csvCell).join(';'));
    });
    return '﻿' + rows.join('\r\n');
  }

  function chatSuggestions(state) {
    const s = ['Nereden başlayayım?', 'Hedef kitle ne demek?', 'Garanti kazanç var mı?'];
    if (state.projects.length || state.finance.length) s.push('Geçmiş işlemlerime nereden ulaşırım?');
    else s.push('Kazancımı nasıl takip ederim?');
    return s;
  }

  return {
    DAILY_LIMIT_SEC: DAILY_LIMIT_SEC, NARRATION_ADDON_TL: NARRATION_ADDON_TL, PACKAGES: PACKAGES,
    defaultState: defaultState, migrate: migrate, entitlements: entitlements,
    dayKey: dayKey, monthKey: monthKey, formatDate: formatDate, formatDuration: formatDuration,
    remainingSeconds: remainingSeconds, addUsage: addUsage,
    modelById: modelById, recommend: recommend,
    startProject: startProject, updateProject: updateProject, archiveProject: archiveProject, restoreProject: restoreProject, deleteProject: deleteProject, unlinkedFinance: unlinkedFinance, linkUnlinkedFinance: linkUnlinkedFinance, assignPackage: assignPackage, unassignPackage: unassignPackage, projectPackageState: projectPackageState, projectFinance: projectFinance, isArchived: isArchived, liveProjects: liveProjects, PROJECT_LIMITS: PROJECT_LIMITS, projectById: projectById, activeProject: activeProject,
    progress: progress, nextTask: nextTask, setTaskDone: setTaskDone, setTaskNote: setTaskNote,
    addFinance: addFinance, removeFinance: removeFinance, financeSummary: financeSummary,
    CATEGORIES: CATEGORIES, categoryName: categoryName, parseDateInput: parseDateInput, dateInputValue: dateInputValue,
    PERIODS: PERIODS, periodRange: periodRange, financeSeries: financeSeries, categorySplit: categorySplit,
    setGoal: setGoal, goalProgress: goalProgress, streak: streak, badges: badges,
    THEMES: THEMES, setTheme: setTheme, LANG_CODES: LANG_CODES, CURRENCIES: CURRENCIES, LANG_CURRENCY: LANG_CURRENCY, setLanguage: setLanguage, setCurrency: setCurrency, exportCsv: exportCsv, chatSuggestions: chatSuggestions,
    insights: insights, setReminder: setReminder, isValidPin: isValidPin, setLock: setLock, clearLock: clearLock,
    importData: importData, APP_VERSION: APP_VERSION,
    MEMORY_KINDS: MEMORY_KINDS, MEMORY_LIMITS: MEMORY_LIMITS, isSensitive: isSensitive, addMemory: addMemory, updateMemory: updateMemory, removeMemory: removeMemory, clearMemory: clearMemory, suggestMemory: suggestMemory, confirmMemory: confirmMemory, dismissMemory: dismissMemory, projectContext: projectContext, memoryForServer: memoryForServer, chatProject: chatProject, chatPid: chatPid, chatFor: chatFor, chatContext: chatContext, setAiConsent: setAiConsent, hasAiConsent: hasAiConsent, addChat: addChat, setChatScope: setChatScope, memOf: memOf, SUGGEST_REPLY: 'Bunu önemli bir bilgi gibi gördüm. Aşağıdaki kartta "Kaydet"e basarsan bu projenin hafızasına eklerim; basmazsan hiçbir şey saklanmaz.',
    addRecurring: addRecurring, removeRecurring: removeRecurring, toggleRecurring: toggleRecurring, applyRecurring: applyRecurring,
    addSaving: addSaving, contributeSaving: contributeSaving, removeSaving: removeSaving, savingProgress: savingProgress,
    MAX_PROJECTS: MAX_PROJECTS, canStartProject: canStartProject, setActiveProject: setActiveProject, projectSummary: projectSummary, exportProject: exportProject, setTaskStage: setTaskStage,
    setTaxPct: setTaxPct, taxReserve: taxReserve, sourceSplit: sourceSplit,
    ACCENTS: ACCENTS, setLook: setLook, setAvatar: setAvatar,
    updateFinance: updateFinance, setBudget: setBudget, budgetProgress: budgetProgress, calcSales: calcSales, checklist: checklist, glossaryList: glossaryList,
    setPackage: setPackage, buyNarration: buyNarration, cancelNarration: cancelNarration,
    history: history, generatePlan: generatePlan, ensureDecisions: ensureDecisions, decide: decide,
    aiReply: aiReply, explainTerm: explainTerm, exportData: exportData
  };
});
