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
              features: ['Günlük 1 saat yapay zekâ sohbeti', 'Geçmiş İşlemler arşivi', 'Verini dışa aktarma ve silme'] },
    manual: { id: 'manual', tier: 1, name: 'Manuel',         emoji: '📗', price: null, narrationIncluded: false,
              features: ['İnteraktif soru-cevap ile gelir modeli seçimi', 'Görev listesi ve yazılı açıklamalar', 'Gelir-gider takibi', 'Günlük 1 saat yapay zekâ sohbeti', '+150 TL ile sesli yapay zekâ anlatımı'] },
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

  function defaultState() {
    return {
      v: STATE_VERSION,
      user: { name: '' },
      pkg: 'free',
      addonNarration: false,
      cancelledAt: null,
      projects: [],
      activeProjectId: null,
      finance: [],
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
    out.user = Object.assign({ name: '' }, s.user || {});
    out.usage = Object.assign({ date: '', seconds: 0 }, s.usage || {});
    ['projects', 'finance', 'chat', 'plans', 'decisions'].forEach(function (k) { if (!Array.isArray(out[k])) out[k] = []; });
    if (!PACKAGES[out.pkg]) out.pkg = 'free';
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
      finance: p.tier >= 1 || state.finance.length > 0,
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
  function addFinance(state, entry, now) {
    const amount = Number(String(entry.amount).replace(',', '.'));
    if (!isFinite(amount) || amount <= 0) return null;
    const type = entry.type === 'out' ? 'out' : 'in';
    const rec = { id: uid('fin'), type: type, amount: Math.round(amount * 100) / 100, note: String(entry.note || '').slice(0, 120), date: now };
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
    if (/geçmiş|eski çalışma|eski işlem|nereden (bul|ulaş)/.test(t)) {
      return 'Daha önce tamamladığın çalışmalara ekranın üst kısmındaki ↶ simgesinden (Geçmiş İşlemler) ulaşabilirsin.';
    }
    if (/garanti|ne kadar kazan|kaç para|zengin|milyon|hemen para/.test(t)) {
      return 'Dürüst olmak istiyorum: hiçbir gelir modeli için garanti verilemez. Çoğu iş ilk haftalarda hiç gelir getirmeyebilir. Önemli olan küçük adımlarla ilerleyip gerçek rakamlarını Kazanç bölümünde takip etmek.';
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
  function exportData(state) { return JSON.stringify(state, null, 2); }

  return {
    DAILY_LIMIT_SEC: DAILY_LIMIT_SEC, NARRATION_ADDON_TL: NARRATION_ADDON_TL, PACKAGES: PACKAGES,
    defaultState: defaultState, migrate: migrate, entitlements: entitlements,
    dayKey: dayKey, monthKey: monthKey, formatDate: formatDate, formatDuration: formatDuration,
    remainingSeconds: remainingSeconds, addUsage: addUsage,
    modelById: modelById, recommend: recommend,
    startProject: startProject, projectById: projectById, activeProject: activeProject,
    progress: progress, nextTask: nextTask, setTaskDone: setTaskDone, setTaskNote: setTaskNote,
    addFinance: addFinance, removeFinance: removeFinance, financeSummary: financeSummary,
    setPackage: setPackage, buyNarration: buyNarration, cancelNarration: cancelNarration,
    history: history, generatePlan: generatePlan, ensureDecisions: ensureDecisions, decide: decide,
    aiReply: aiReply, explainTerm: explainTerm, exportData: exportData
  };
});
