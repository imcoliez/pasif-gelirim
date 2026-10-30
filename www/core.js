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
              features: ['Manuel paketin tüm özellikleri', 'Otomatik içerik/iş planı hazırlama', 'Sesli anlatım dahil'] },
    ceo:    { id: 'ceo',    tier: 3, name: 'CEO Modu',       emoji: '👑', price: null, narrationIncluded: true,
              features: ['Yarı Otomasyon özellikleri', 'Haftalık karar kartları: önemli kararları sen verirsin', 'Yapay zekâ işin büyük kısmını yürütür'] }
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

  function defaultState() {
    return {
      v: STATE_VERSION,
      user: { name: '', onboarded: false },
      settings: { theme: 'dark', reminder: { enabled: false, time: '20:00' } },
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
    out.usage = Object.assign({ date: '', seconds: 0 }, s.usage || {});
    out.settings = Object.assign({ theme: 'dark' }, s.settings || {});
    if (THEMES.indexOf(out.settings.theme) === -1) out.settings.theme = 'dark';
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
    out.projects.forEach(function (p) { if (!p.tasks || typeof p.tasks !== 'object') p.tasks = {}; });
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
      return { model: m, score: score, reasons: reasons };
    });
    list.sort(function (a, b) { return b.score - a.score; });
    return list;
  }

  // ---------- Projeler ve görevler ----------
  function startProject(state, modelId, now) {
    const m = modelById(modelId);
    if (!m) throw new Error('Bilinmeyen model: ' + modelId);
    const p = {
      id: uid('proj'), modelId: m.id, title: m.title, createdAt: now, updatedAt: now,
      tasks: {}, lastNote: 'Proje başlatıldı.'
    };
    state.projects.push(p);
    state.activeProjectId = p.id;
    return p;
  }
  function projectById(state, id) { return state.projects.find(function (p) { return p.id === id; }) || null; }
  function activeProject(state) { return projectById(state, state.activeProjectId); }

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
    p.tasks[taskId] = cur;
    p.updatedAt = now;
    p.lastNote = done ? '"' + t.title + '" görevi tamamlandı.' : '"' + t.title + '" görevi tekrar açıldı.';
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
    st.chat = st.chat.slice(-200);
    st.plans = st.plans.slice(-200);
    st.decisions = st.decisions.slice(-200);
    if (!projectById(st, st.activeProjectId)) st.activeProjectId = st.projects.length ? st.projects[st.projects.length - 1].id : null;
    return { ok: true, state: st, counts: { finance: st.finance.length, projects: st.projects.length } };
  }

  // ---------- Tema ----------
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

  function aiReply(state, text, now) {
    const t = norm(text);
    const ent = entitlements(state);
    if (!t.trim()) return 'Bir soru yazarsan yardımcı olurum.';

    if (/otomatik|benim yerime|benim için .*(hazırla|üret|yayımla|yayinla|yap)|\b\d+\s*(video|içerik|gönderi)/.test(t)) {
      if (ent.automation) return 'Bu tür hazırlıkları "Otomasyon" bölümünden yapabilirsin. Orada günlük planı senin için hazırlıyorum.';
      return 'Bu işlemleri senin adına otomatik yapmak ücretli paketlerin (Yarı Otomasyon / CEO Modu) bir özelliği. Ama bunu kendin yapabilmen için yöntemi anlatabilirim: hedefini, haftalık sıklığını ve formatını seç, sonra her içeriği adım adım hazırla. İstersen ilk adımı birlikte netleştirelim.';
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

    const p = activeProject(state);
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
    const rows = ['Tarih;Tür;Kategori;Tutar (TL);Not'];
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
    startProject: startProject, projectById: projectById, activeProject: activeProject,
    progress: progress, nextTask: nextTask, setTaskDone: setTaskDone, setTaskNote: setTaskNote,
    addFinance: addFinance, removeFinance: removeFinance, financeSummary: financeSummary,
    CATEGORIES: CATEGORIES, categoryName: categoryName, parseDateInput: parseDateInput, dateInputValue: dateInputValue,
    PERIODS: PERIODS, periodRange: periodRange, financeSeries: financeSeries, categorySplit: categorySplit,
    setGoal: setGoal, goalProgress: goalProgress, streak: streak, badges: badges,
    THEMES: THEMES, setTheme: setTheme, exportCsv: exportCsv, chatSuggestions: chatSuggestions,
    insights: insights, setReminder: setReminder, isValidPin: isValidPin, setLock: setLock, clearLock: clearLock,
    importData: importData, APP_VERSION: '0.8',
    addRecurring: addRecurring, removeRecurring: removeRecurring, toggleRecurring: toggleRecurring, applyRecurring: applyRecurring,
    addSaving: addSaving, contributeSaving: contributeSaving, removeSaving: removeSaving, savingProgress: savingProgress,
    setTaxPct: setTaxPct, taxReserve: taxReserve, sourceSplit: sourceSplit,
    updateFinance: updateFinance, setBudget: setBudget, budgetProgress: budgetProgress, calcSales: calcSales, checklist: checklist, glossaryList: glossaryList,
    setPackage: setPackage, buyNarration: buyNarration, cancelNarration: cancelNarration,
    history: history, generatePlan: generatePlan, ensureDecisions: ensureDecisions, decide: decide,
    aiReply: aiReply, explainTerm: explainTerm, exportData: exportData
  };
});
