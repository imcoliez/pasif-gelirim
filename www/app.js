/* Pasif Gelirim - arayüz. Görünümler saf fonksiyondur (durum -> HTML), böylece Node'da da test edilir. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./data.js'));
  else root.App = factory(root.Core, root.Data);
})(typeof self !== 'undefined' ? self : this, function (Core, Data) {

  const STORAGE_KEY = 'pasif_gelirim_state_v1';
  const TOP = ['home', 'tasks', 'chat', 'money', 'packages'];
  const TITLES = { task: 'Görev', charts: 'Grafikler', auto: 'Otomasyon', history: 'Geçmiş İşlemler', settings: 'Ayarlar', about: 'Yardım ve Bilgi' };

  // ---------- Yardımcılar ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function tl(n) {
    return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  }
  function bar(pct) { return '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>'; }
  function lock(msg, btnText, route) {
    return '<div class="card lock"><div class="lock-ico">🔒</div><p>' + esc(msg) + '</p>' +
      (btnText ? '<button class="btn" data-act="go" data-route="' + route + '">' + esc(btnText) + '</button>' : '') + '</div>';
  }
  function niceCeil(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  function compact(n) {
    const a = Math.abs(n);
    const f = function (x) { return String(Math.round(x * 10) / 10).replace('.', ','); };
    if (a >= 1e6) return f(n / 1e6) + ' Mn';
    if (a >= 1e3) return f(n / 1e3) + ' B';
    return String(Math.round(n));
  }
  function catOptions(type) {
    return Core.CATEGORIES[type === 'out' ? 'out' : 'in'].map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>';
    }).join('');
  }
  function seg(items, cur, act, key) {
    return '<div class="segctl" role="group">' + items.map(function (it) {
      return '<button class="segbtn ' + (cur === it.v ? 'on' : '') + '" data-act="' + act + '" data-v="' + esc(it.v) + '"' + (key ? ' data-key="' + key + '"' : '') + '>' + esc(it.t) + '</button>';
    }).join('') + '</div>';
  }

  // ---------- SVG grafikler ----------
  const CW = 340, CH = 200, CL = 40, CR = 8, CT = 10, CB = 26;
  const PW = CW - CL - CR, PH = CH - CT - CB;

  function barChart(series, sel) {
    const n = series.buckets.length, ymax = niceCeil(series.max), bw = PW / n;
    const barW = Math.max(2, Math.min(14, bw * 0.36));
    const step = n <= 12 ? 1 : Math.ceil(n / 6);
    let g = '';
    for (let k = 0; k <= 4; k++) {
      const y = CT + PH - PH * k / 4;
      g += '<line class="grid" x1="' + CL + '" x2="' + (CW - CR) + '" y1="' + y + '" y2="' + y + '"/>' +
        '<text class="ax" x="' + (CL - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + compact(ymax * k / 4) + '</text>';
    }
    series.buckets.forEach(function (b, i) {
      const cx = CL + bw * (i + 0.5);
      if (i === sel) g += '<rect class="sel" x="' + (CL + bw * i) + '" y="' + CT + '" width="' + bw + '" height="' + PH + '" rx="4"/>';
      [['in', -barW - 0.5], ['out', 0.5]].forEach(function (p) {
        const v = b[p[0]];
        if (v <= 0) return;
        const h = Math.max(2, v / ymax * PH);
        g += '<rect class="cbar ' + p[0] + '" style="animation-delay:' + (i * 20) + 'ms" x="' + (cx + p[1]) + '" y="' + (CT + PH - h) + '" width="' + barW + '" height="' + h + '" rx="' + Math.min(3, barW / 2) + '"/>';
      });
      if (i % step === 0) g += '<text class="ax" x="' + cx + '" y="' + (CH - 8) + '" text-anchor="middle">' + esc(b.label) + '</text>';
      g += '<rect class="hit" data-act="chartPick" data-i="' + i + '" x="' + (CL + bw * i) + '" y="' + CT + '" width="' + bw + '" height="' + PH + '"/>';
    });
    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="chart" role="img" aria-label="Gelir ve gider sütun grafiği">' + g + '</svg>';
  }

  function lineChart(series, sel) {
    const n = series.buckets.length, bw = PW / n;
    const vals = series.buckets.map(function (b) { return b.cum; });
    let lo = Math.min.apply(null, vals.concat([0])), hi = Math.max.apply(null, vals.concat([0]));
    if (hi === lo) hi = lo + 1;
    const pad = (hi - lo) * 0.08;
    if (lo < 0) lo -= pad;
    hi += pad;
    const y = function (v) { return CT + PH * (1 - (v - lo) / (hi - lo)); };
    const x = function (i) { return CL + bw * (i + 0.5); };
    let g = '';
    for (let k = 0; k <= 4; k++) {
      const v = lo + (hi - lo) * k / 4, yy = y(v);
      g += '<line class="grid" x1="' + CL + '" x2="' + (CW - CR) + '" y1="' + yy + '" y2="' + yy + '"/>' +
        '<text class="ax" x="' + (CL - 6) + '" y="' + (yy + 3) + '" text-anchor="end">' + compact(v) + '</text>';
    }
    if (lo < 0 && hi > 0) g += '<line class="zero" x1="' + CL + '" x2="' + (CW - CR) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    const pts = vals.map(function (v, i) { return x(i).toFixed(1) + ' ' + y(v).toFixed(1); });
    const base = Math.min(CT + PH, Math.max(CT, y(0)));
    g += '<defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--g);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--g);stop-opacity:0"/></linearGradient></defs>';
    g += '<path class="area" d="M' + pts.join(' L') + ' L' + x(n - 1).toFixed(1) + ' ' + base + ' L' + x(0).toFixed(1) + ' ' + base + ' Z" fill="url(#gArea)"/>';
    g += '<path class="line" pathLength="1" d="M' + pts.join(' L') + '" fill="none"/>';
    const step = n <= 12 ? 1 : Math.ceil(n / 6);
    series.buckets.forEach(function (b, i) {
      if (i % step === 0) g += '<text class="ax" x="' + x(i) + '" y="' + (CH - 8) + '" text-anchor="middle">' + esc(b.label) + '</text>';
      if (i === sel) g += '<line class="selline" x1="' + x(i) + '" x2="' + x(i) + '" y1="' + CT + '" y2="' + (CT + PH) + '"/>';
      if (i === sel || i === n - 1) g += '<circle class="dot" cx="' + x(i) + '" cy="' + y(b.cum) + '" r="' + (i === sel ? 4.5 : 3) + '"/>';
      g += '<rect class="hit" data-act="chartPick" data-i="' + i + '" x="' + (CL + bw * i) + '" y="' + CT + '" width="' + bw + '" height="' + PH + '"/>';
    });
    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="chart" role="img" aria-label="Birikimli net çizgi grafiği">' + g + '</svg>';
  }

  function donut(items, main, sub) {
    let off = 0, segs = '';
    items.forEach(function (it, i) {
      const p = Math.max(0, it.pct - (items.length > 1 ? 0.8 : 0));
      segs += '<circle class="seg" cx="21" cy="21" r="15.9155" fill="none" stroke="var(--c' + (i % 4) + ')" stroke-width="5" stroke-dasharray="' + p + ' ' + (100 - p) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 21 21)" style="animation-delay:' + (i * 120) + 'ms"/>';
      off += it.pct;
    });
    return '<svg viewBox="0 0 42 42" class="donut" role="img" aria-label="Dağılım halka grafiği">' +
      '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--bd)" stroke-width="5"/>' + segs +
      '<text x="21" y="21.2" class="dn-main" text-anchor="middle">' + esc(main) + '</text>' +
      '<text x="21" y="26.2" class="dn-sub" text-anchor="middle">' + esc(sub) + '</text></svg>';
  }

  function ring(pct, label) {
    return '<svg viewBox="0 0 42 42" class="donut ring" role="img" aria-label="İlerleme halkası">' +
      '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--bd)" stroke-width="4.5"/>' +
      '<circle class="seg" cx="21" cy="21" r="15.9155" fill="none" stroke="var(--g)" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="' + pct + ' ' + (100 - pct) + '" transform="rotate(-90 21 21)"/>' +
      '<text x="21" y="23.6" class="dn-main" text-anchor="middle">' + esc(label) + '</text></svg>';
  }

  function spark(series) {
    const vals = series.buckets.map(function (b) { return b.cum; });
    const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), n = vals.length;
    const span = hi - lo || 1;
    const pts = vals.map(function (v, i) { return (4 + i * (112 / (n - 1))).toFixed(1) + ',' + (30 - (v - lo) / span * 24).toFixed(1); });
    return '<svg viewBox="0 0 120 36" class="spark" aria-hidden="true"><polyline class="line" pathLength="1" points="' + pts.join(' ') + '" fill="none"/></svg>';
  }

  function legend(items, type) {
    if (!items.length) return '<p class="muted small">Bu dönemde kayıt yok.</p>';
    return '<ul class="legend">' + items.map(function (it, i) {
      return '<li><i style="background:var(--c' + (i % 4) + ')"></i><span>' + esc(it.name) + '</span><b>' + tl(it.amount) + '</b><small>%' + Math.round(it.pct) + '</small></li>';
    }).join('') + '</ul>';
  }

  // ---------- Görünümler ----------
  const views = {};

  views.welcome = function (S) {
    return '<div class="welcome">' +
      '<div class="logo-wrap"><img class="logo-big" src="logo.png" alt="Pasif Gelirim logosu"></div><h1>Pasif Gelirim</h1><p class="slogan">DAHA FAZLASI MÜMKÜN.</p>' +
      '<div class="card"><p>Burada sana <b>garanti kazanç</b> vaat etmiyoruz. Kendi dijital işini adım adım kurmana, gerçek rakamlarını takip etmene ve ilerlemeni görmene yardımcı oluyoruz.</p>' +
      '<p class="muted">Kurduğun iş ve verilerin sana aittir.</p></div>' +
      '<label class="lbl" for="nameInput">Sana nasıl hitap edelim?</label>' +
      '<input id="nameInput" class="inp" maxlength="30" placeholder="Adın" value="' + esc(S.user.name) + '">' +
      '<button class="btn big" data-act="start">Başla</button></div>';
  };

  views.home = function (S, ui, now) {
    const ent = Core.entitlements(S);
    const p = Core.activeProject(S);
    const left = Core.remainingSeconds(S, now);
    const st = Core.streak(S, now);
    const week = Core.financeSeries(S, '7d', now);
    const gp = Core.goalProgress(S, now);
    let html = '<h2>Merhaba' + (S.user.name ? ' ' + esc(S.user.name) : '') + ' 👋</h2>';
    html += '<div class="chip">' + ent.pkg.emoji + ' ' + esc(ent.pkg.name) + ' paketi</div>';
    if (S.cancelledAt && ent.pkg.tier === 0) {
      html += '<div class="card note">Aboneliğin sona erdi. Kurduğun işe manuel devam edebilir, eski çalışmalarına ↶ Geçmiş İşlemler\'den ulaşabilirsin.</div>';
    }
    html += '<div class="card streak"><div class="row"><div><span class="flame">' + (st.current > 0 ? '🔥' : '🌱') + '</span> <b>' + st.current + ' günlük seri</b></div><span class="muted small">En iyi: ' + st.best + '</span></div>' +
      '<p class="muted small">' + (st.activeToday ? 'Bugün de çalıştın, harika!' : (st.current > 0 ? 'Serini korumak için bugün küçük bir adım at.' : 'Bugün bir görev tamamla, kayıt gir veya sohbet et; seri başlasın.')) + '</p>' +
      '<div class="badges">' + Core.badges(S, now).map(function (b) {
        return '<span class="badge ' + (b.earned ? 'on' : '') + '" title="' + esc(b.title + ' — ' + b.desc) + '"><i>' + (b.earned ? b.emoji : '🔒') + '</i><small>' + esc(b.title) + '</small></span>';
      }).join('') + '</div></div>';
    if (p) {
      const pr = Core.progress(p);
      const nt = Core.nextTask(p);
      html += '<div class="card"><div class="row"><b>' + esc(p.title) + '</b><span class="muted">%' + pr.pct + '</span></div>' + bar(pr.pct) +
        '<p class="muted">' + pr.done + ' / ' + pr.total + ' görev tamamlandı</p>' +
        (nt ? '<button class="btn" data-act="openTask" data-id="' + esc(nt.id) + '">Sıradaki: ' + esc(nt.title) + '</button>'
            : '<p>🎉 Tüm görevleri tamamladın. Şimdi sonuçlarını takip etme zamanı.</p>') + '</div>';
    } else if (ent.selectModel) {
      html += '<div class="card"><b>Henüz bir gelir modeli seçmedin.</b><p class="muted">Birkaç kısa soruyla sana uygun olanı bulalım.</p>' +
        '<button class="btn" data-act="go" data-route="tasks">Gelir modelimi seç</button></div>';
    } else {
      html += lock('Gelir modeli seçmek ve görev listesini kullanmak için Manuel paket gerekir.', 'Paketlere bak', 'packages');
    }
    html += '<button class="card weekcard" data-act="go" data-route="charts"><div class="row"><b>📊 Son 7 gün</b><span class="muted small">Grafikleri aç ›</span></div>' +
      '<div class="row"><div><div class="big ' + (week.totals.net < 0 ? 'neg' : '') + '">' + tl(week.totals.net) + '</div><small class="muted">net</small></div>' + (week.empty ? '<small class="muted">Henüz kayıt yok</small>' : spark(week)) + '</div>' +
      (gp.target > 0 ? '<div class="mini-goal">' + bar(gp.pct) + '<small class="muted">Aylık hedef: %' + gp.pct + '</small></div>' : '') + '</button>';
    html += '<div class="grid2">' +
      '<button class="tile" data-act="go" data-route="chat"><span>💬</span><b>AI Sohbet</b><small>Bugün kalan: ' + Core.formatDuration(left) + '</small></button>' +
      '<button class="tile" data-act="go" data-route="money"><span>💰</span><b>Kazanç</b><small>' + tl(Core.financeSummary(S, now).net) + ' net</small></button>' +
      '<button class="tile" data-act="go" data-route="auto"><span>⚙️</span><b>Otomasyon</b><small>' + (ent.automation ? 'Açık' : '🔒 Ücretli paket') + '</small></button>' +
      '<button class="tile" data-act="go" data-route="history"><span>↶</span><b>Geçmiş İşlemler</b><small>Eski çalışmaların</small></button>' +
      '</div>';
    html += '<p class="fine">Pasif Gelirim hiçbir gelir garantisi vermez. Gerçek sonuçlar kişiden kişiye değişir.</p>';
    return html;
  };

  views.tasks = function (S, ui, now) {
    const ent = Core.entitlements(S);
    const p = Core.activeProject(S);
    if (ui.quiz) return quizView(S, ui);
    if (!ent.tasks) return '<h2>Görevler</h2>' + lock('Görev listesi Manuel pakette açılır.', 'Paketlere bak', 'packages');
    if (!p) {
      return '<h2>Görevler</h2><div class="card"><p>Önce sana uygun gelir modelini bulalım.</p>' +
        (ent.selectModel ? '<button class="btn" data-act="quizStart">Soruları cevapla</button>' : '') + '</div>';
    }
    const m = Core.modelById(p.modelId);
    const pr = Core.progress(p);
    let html = '<h2>' + m.emoji + ' ' + esc(p.title) + '</h2>' + bar(pr.pct) + '<p class="muted">' + pr.done + ' / ' + pr.total + ' tamamlandı</p>';
    if (!ent.selectModel) html += '<div class="card note">Aboneliğin aktif değil; bu işe manuel devam edebilirsin. Yeni model seçmek için paket gerekir.</div>';
    html += '<div class="card honest">⚠️ ' + esc(m.honest) + '</div>';
    html += '<ul class="list">';
    m.tasks.forEach(function (t, i) {
      const done = p.tasks[t.id] && p.tasks[t.id].done;
      html += '<li><button class="task ' + (done ? 'done' : '') + '" data-act="openTask" data-id="' + esc(t.id) + '">' +
        '<span class="chk">' + (done ? '✅' : (i + 1)) + '</span><span>' + esc(t.title) + '</span></button></li>';
    });
    html += '</ul>';
    if (S.projects.length > 1) {
      html += '<details class="card"><summary>Diğer projelerim (' + (S.projects.length - 1) + ')</summary>';
      S.projects.forEach(function (q) {
        if (q.id === p.id) return;
        html += '<button class="link" data-act="switchProject" data-id="' + esc(q.id) + '">' + esc(q.title) + ' (%' + Core.progress(q).pct + ')</button>';
      });
      html += '</details>';
    }
    if (ent.selectModel) html += '<button class="btn ghost" data-act="quizStart">Yeni gelir modeli seç</button>';
    return html;
  };

  function quizView(S, ui) {
    const q = ui.quiz;
    const Q = Data.QUESTIONS;
    if (q.step < Q.length) {
      const cur = Q[q.step];
      let h = '<h2>Sana uygun modeli bulalım</h2><p class="muted">Soru ' + (q.step + 1) + ' / ' + Q.length + '</p>' + bar(Math.round(q.step / Q.length * 100));
      h += '<div class="card"><b>' + esc(cur.text) + '</b></div>';
      cur.options.forEach(function (o) {
        h += '<button class="opt" data-act="answer" data-q="' + esc(cur.id) + '" data-v="' + esc(o.v) + '">' + esc(o.t) + '</button>';
      });
      h += '<button class="link" data-act="quizCancel">Vazgeç</button>';
      return h;
    }
    const rec = Core.recommend(q.answers).slice(0, 3);
    let h = '<h2>Sana uygun modeller</h2><p class="muted">Cevaplarına göre sıraladık. Bu bir tahmindir, garanti değildir.</p>';
    rec.forEach(function (r, i) {
      h += '<div class="card"><div class="row"><b>' + r.model.emoji + ' ' + esc(r.model.title) + '</b>' + (i === 0 ? '<span class="chip">En uygun</span>' : '') + '</div>' +
        '<p>' + esc(r.model.summary) + '</p>' +
        (r.reasons.length ? '<p class="muted">' + r.reasons.map(esc).join(' • ') + '</p>' : '') +
        '<p class="honest-line">⚠️ ' + esc(r.model.honest) + '</p>' +
        '<button class="btn" data-act="pickModel" data-id="' + esc(r.model.id) + '">Bunu seç</button></div>';
    });
    h += '<button class="link" data-act="quizStart">Soruları baştan cevapla</button>';
    return h;
  }

  views.task = function (S, ui, now) {
    const p = Core.activeProject(S);
    if (!p) return lock('Önce bir proje seç.', 'Görevlere git', 'tasks');
    const m = Core.modelById(p.modelId);
    const idx = m.tasks.findIndex(function (x) { return x.id === ui.taskId; });
    const t = m.tasks[idx];
    if (!t) return lock('Görev bulunamadı.', 'Görevlere git', 'tasks');
    const st = p.tasks[t.id] || { done: false, note: '' };
    const prev = m.tasks[idx - 1], next = m.tasks[idx + 1];
    return '<p class="muted small">Görev ' + (idx + 1) + ' / ' + m.tasks.length + '</p><h2>' + esc(t.title) + '</h2>' +
      '<div class="card"><p>' + nl2br(t.body) + '</p></div>' +
      '<label class="lbl" for="noteInput">Notların</label>' +
      '<textarea id="noteInput" class="inp" rows="4" data-change="note" data-id="' + esc(t.id) + '" placeholder="Bu görevle ilgili yazdıkların burada saklanır">' + esc(st.note) + '</textarea>' +
      '<button class="btn ' + (st.done ? 'ghost' : '') + '" data-act="toggleTask" data-id="' + esc(t.id) + '">' + (st.done ? 'Tamamlandı ✅ (geri al)' : 'Görevi tamamladım') + '</button>' +
      '<div class="row pn">' + (prev ? '<button class="link" data-act="openTask" data-id="' + esc(prev.id) + '">← Önceki</button>' : '<span></span>') +
      (next ? '<button class="link" data-act="openTask" data-id="' + esc(next.id) + '">Sonraki →</button>' : '<span></span>') + '</div>';
  };

  function offerModal() {
    return '<div class="modal"><div class="sheet"><h3>💚 Okumaktan yoruldun mu?</h3>' +
      '<p>Anlamakta zorlandığın bir bölüm mü var?</p>' +
      '<p>🤖 Yapay zekâ sana görevleri sesli olarak anlatsın, karmaşık konuları basitleştirsin ve anlamadığın yerleri açıklasın.</p>' +
      '<p><b>Yalnızca ' + Core.NARRATION_ADDON_TL + ' TL farkla!</b></p>' +
      '<p class="fine">TEST MODU: gerçek ödeme alınmaz.</p>' +
      '<button class="btn" data-act="buyNarr">YAPAY ZEKÂLI ANLATIMI AÇ — ' + Core.NARRATION_ADDON_TL + ' TL</button>' +
      '<button class="btn ghost" data-act="narrClose">ŞİMDİLİK İSTEMİYORUM</button></div></div>';
  }

  function narrationPanel(S, ui, t) {
    return '<div class="modal"><div class="sheet"><h3>💚 Yapay zekâlı anlatım</h3>' +
      '<button class="btn" data-act="speak" data-id="' + esc(t.id) + '">🔊 Bana sesli anlat</button>' +
      '<button class="btn ghost" data-act="stopSpeak">⏹ Durdur</button>' +
      '<label class="lbl" for="askInput">Anlamadığın yeri yaz</label>' +
      '<input id="askInput" class="inp" placeholder="Örn: Hedef kitle ne demek? Örnek ver">' +
      '<button class="btn" data-act="askNarr">Açıkla</button>' +
      (ui.narrAnswer ? '<div class="card">' + nl2br(ui.narrAnswer) + '</div>' : '') +
      '<button class="link" data-act="narrClose">Kapat</button></div></div>';
  }

  views.chat = function (S, ui, now) {
    const left = Core.remainingSeconds(S, now);
    let html = '<h2>💬 AI Sohbet</h2>' +
      '<div class="row"><span class="chip">Bugün kalan: <b id="timeLeft">' + Core.formatDuration(left) + '</b></span></div>' +
      '<p class="fine">Şu an demo yapay zekâ çalışıyor: terimleri açıklar ve yönlendirir. Gerçek yapay zekâ sunucusu sonra bağlanacak.</p><div class="chat" id="chatBox">';
    if (!S.chat.length) html += '<div class="msg ai">Merhaba! Anlamadığın bir terimi veya görevi yaz, birlikte netleştirelim.</div>';
    S.chat.slice(-40).forEach(function (m) {
      html += '<div class="msg ' + (m.role === 'user' ? 'me' : 'ai') + '">' + nl2br(m.text) + '</div>';
    });
    if (ui.typing) html += '<div class="msg ai typing" aria-label="Yazıyor"><i></i><i></i><i></i></div>';
    html += '</div>';
    if (left <= 0) {
      html += '<div class="card note">Bugünkü 1 saatlik ücretsiz sohbet hakkın doldu. Yarın yenilenir.</div>';
    } else {
      html += '<div class="chips">' + Core.chatSuggestions(S).map(function (s) {
        return '<button class="sugg" data-act="suggest" data-t="' + esc(s) + '">' + esc(s) + '</button>';
      }).join('') + '</div>';
      html += '<div class="send"><input id="chatInput" class="inp" placeholder="Sorunu yaz..." maxlength="500"><button class="btn" data-act="send">Gönder</button></div>';
    }
    return html;
  };

  views.money = function (S, ui, now) {
    const f = Core.financeSummary(S, now);
    const gp = Core.goalProgress(S, now);
    const type = ui.finType === 'out' ? 'out' : 'in';
    const today = Core.dateInputValue(now);
    let html = '<h2>💰 Kazanç</h2>';
    // Aylık hedef
    html += '<div class="card goal">';
    if (gp.target > 0) {
      html += '<div class="goal-row">' + ring(gp.pct, '%' + gp.pct) + '<div><b>Aylık hedef: ' + tl(gp.target) + '</b><p class="muted small">Bu ay: ' + tl(gp.got) + '</p>' +
        '<p class="small">' + (gp.reached ? '🎉 Hedefe ulaştın!' : 'Kalan: ' + tl(gp.left)) + '</p></div></div>' +
        '<details><summary class="link">Hedefi değiştir</summary><div class="send"><input id="goalInput" class="inp" inputmode="decimal" placeholder="Yeni hedef (TL)"><button class="btn" data-act="saveGoal">Kaydet</button></div></details>';
    } else {
      html += '<b>🎯 Aylık gelir hedefi</b><p class="muted small">Gerçekçi bir hedef koy; ilerlemeni burada izle. Hedef bir garanti değildir.</p>' +
        '<div class="send"><input id="goalInput" class="inp" inputmode="decimal" placeholder="Örn: 2500"><button class="btn" data-act="saveGoal">Kaydet</button></div>';
    }
    html += '</div>';
    html += '<div class="grid2"><div class="stat"><small>Bu ay net</small><b class="' + (f.monthNet < 0 ? 'neg' : '') + '">' + tl(f.monthNet) + '</b></div><div class="stat"><small>Toplam net</small><b class="' + (f.net < 0 ? 'neg' : '') + '">' + tl(f.net) + '</b></div>' +
      '<div class="stat in"><small>Toplam gelir</small><b>' + tl(f.totalIn) + '</b></div><div class="stat out"><small>Toplam gider</small><b>' + tl(f.totalOut) + '</b></div></div>';
    html += '<button class="btn ghost" data-act="go" data-route="charts">📊 Gelir-Gider Grafiklerini Aç</button>';
    html += '<div class="card"><b>Yeni kayıt</b>' + seg([{ v: 'in', t: '➕ Gelir' }, { v: 'out', t: '➖ Gider' }], type, 'finType') +
      '<label class="lbl" for="finAmount">Tutar (TL)</label><input id="finAmount" class="inp" inputmode="decimal" placeholder="0,00">' +
      '<div class="two"><div><label class="lbl" for="finCat">Kategori</label><select id="finCat" class="inp">' + catOptions(type) + '</select></div>' +
      '<div><label class="lbl" for="finDate">Tarih</label><input id="finDate" type="date" class="inp" value="' + today + '" max="' + today + '"></div></div>' +
      '<label class="lbl" for="finNote">Not</label><input id="finNote" class="inp" maxlength="120" placeholder="Örn: ilk satış">' +
      '<button class="btn" data-act="addFin">Kaydet</button></div>' +
      '<p class="fine">Gerçek rakamlarını yaz. Amaç kendini kandırmadan ilerlemeyi görmek.</p>';
    const flt = ui.finFilter || 'all';
    html += '<div class="row"><h3>Kayıtlar</h3>' + seg([{ v: 'all', t: 'Tümü' }, { v: 'in', t: 'Gelir' }, { v: 'out', t: 'Gider' }], flt, 'finFilter') + '</div><ul class="list">';
    const rows = S.finance.slice().sort(function (a, b) { return b.date - a.date || (b.at || 0) - (a.at || 0); })
      .filter(function (r) { return flt === 'all' || r.type === flt; });
    if (!rows.length) html += '<li class="card muted">' + (S.finance.length ? 'Bu filtrede kayıt yok.' : 'Henüz kayıt yok. İlk kaydını yukarıdan ekleyebilirsin.') + '</li>';
    rows.forEach(function (r) {
      html += '<li class="fin ' + r.type + '"><span>' + Core.formatDate(r.date) + ' · ' + esc(Core.categoryName(r.type, r.cat)) + (r.note ? '<br><small class="muted">' + esc(r.note) + '</small>' : '') + '</span>' +
        '<b>' + (r.type === 'in' ? '+' : '−') + tl(r.amount) + '</b><button class="x" data-act="delFin" data-id="' + esc(r.id) + '" aria-label="Kaydı sil">✕</button></li>';
    });
    html += '</ul>';
    if (S.finance.length) html += '<button class="btn ghost" data-act="exportCsv">Kayıtları CSV olarak dışa aktar</button>';
    return html;
  };

  views.charts = function (S, ui, now) {
    const period = Core.PERIODS[ui.period] ? ui.period : '7d';
    const series = Core.financeSeries(S, period, now);
    let html = '<h2>📊 Gelir-Gider Grafikleri</h2>' +
      seg(Object.keys(Core.PERIODS).map(function (k) { return { v: k, t: Core.PERIODS[k] }; }), period, 'period');
    if (series.empty) {
      return html + '<div class="card empty"><div class="empty-ico">📭</div><p><b>Bu dönemde kayıt yok.</b></p><p class="muted">Grafikler, girdiğin gerçek gelir ve giderlere göre çizilir.</p>' +
        '<button class="btn" data-act="go" data-route="money">İlk kaydını gir</button></div>';
    }
    const sel = (ui.chartSel != null && ui.chartSel < series.buckets.length) ? ui.chartSel : series.buckets.length - 1;
    const b = series.buckets[sel];
    html += '<div class="grid3"><div class="stat in"><small>Gelir</small><b>' + tl(series.totals.in) + '</b></div><div class="stat out"><small>Gider</small><b>' + tl(series.totals.out) + '</b></div>' +
      '<div class="stat"><small>Net</small><b class="' + (series.totals.net < 0 ? 'neg' : '') + '">' + tl(series.totals.net) + '</b></div></div>';
    html += '<div class="card"><div class="row"><b>Gelir ve gider</b><span class="lg"><i class="in"></i>Gelir <i class="out"></i>Gider</span></div>' + barChart(series, sel) +
      '<div class="pick"><b>' + esc(b.full) + '</b><span>Gelir <b class="pin">' + tl(b.in) + '</b></span><span>Gider <b class="pout">' + tl(b.out) + '</b></span><span>Net <b class="' + (b.net < 0 ? 'neg' : '') + '">' + tl(b.net) + '</b></span></div></div>';
    html += '<div class="card"><div class="row"><b>Birikimli net</b><small class="muted">' + esc(b.full) + ': ' + tl(b.cum) + '</small></div>' + lineChart(series, sel) +
      '<p class="fine">Çizgi, başlangıçtan bu yana toplam net durumunu gösterir.</p></div>';
    const inc = Core.categorySplit(S, 'in', period, now), exp = Core.categorySplit(S, 'out', period, now);
    html += '<div class="card"><b>Gelir kaynakları</b><div class="donut-row">' + donut(inc.items, inc.total ? compact(inc.total) : '—', 'TL') + legend(inc.items, 'in') + '</div></div>';
    html += '<div class="card"><b>Gider dağılımı</b><div class="donut-row">' + donut(exp.items, exp.total ? compact(exp.total) : '—', 'TL') + legend(exp.items, 'out') + '</div></div>';
    html += '<p class="fine">Sütunlara dokunarak o günün veya ayın ayrıntısını görebilirsin.</p>';
    return html;
  };

  views.auto = function (S, ui, now) {
    const ent = Core.entitlements(S);
    let html = '<h2>⚙️ Otomasyon</h2>';
    if (!ent.automation) {
      return html + lock('Otomatik plan hazırlama Yarı Otomasyon ve CEO Modu paketlerinde açılır.' +
        (S.cancelledAt ? ' Daha önce hazırlanan çalışmalarına ↶ Geçmiş İşlemler\'den ulaşabilirsin.' : ''), 'Paketlere bak', 'packages');
    }
    const p = Core.activeProject(S);
    if (!p) return html + lock('Önce bir gelir modeli seçmelisin.', 'Görevlere git', 'tasks');
    html += '<div class="card"><b>' + esc(p.title) + '</b><p class="muted">Seçtiğin modele göre günlük plan hazırlanır.</p>' +
      '<label class="lbl" for="planDays">Kaç günlük?</label><select id="planDays" class="inp"><option value="7">7 gün</option><option value="14">14 gün</option><option value="30">30 gün</option></select>' +
      '<button class="btn" data-act="makePlan">Planı hazırla</button></div>';
    const plans = S.plans.filter(function (x) { return x.projectId === p.id; }).slice().reverse();
    plans.forEach(function (pl) {
      html += '<details class="card"><summary>' + esc(pl.title) + ' · ' + Core.formatDate(pl.createdAt) + '</summary><p class="plan">' + nl2br(pl.text) + '</p>' +
        '<button class="btn ghost" data-act="copyPlan" data-id="' + esc(pl.id) + '">Kopyala</button></details>';
    });
    html += '<h3>👑 CEO Modu · Karar kartları</h3>';
    if (!ent.ceo) {
      html += lock('Önemli kararları sana bırakıp işi yapay zekânın yürüttüğü bölüm CEO Modu\'nda açılır.', null);
    } else {
      const all = S.decisions.filter(function (d) { return d.projectId === p.id; }).slice().reverse();
      all.forEach(function (d) {
        html += '<div class="card"><p><b>' + esc(d.text) + '</b></p>' +
          (d.status === 'bekliyor'
            ? '<div class="row"><button class="btn" data-act="decide" data-id="' + esc(d.id) + '" data-s="onaylandı">Onayla</button><button class="btn ghost" data-act="decide" data-id="' + esc(d.id) + '" data-s="reddedildi">Reddet</button></div>'
            : '<span class="chip">' + esc(d.status) + '</span>') + '</div>';
      });
    }
    return html;
  };

  views.packages = function (S) {
    const ent = Core.entitlements(S);
    let html = '<h2>Paketler</h2><div class="card note"><b>TEST MODU:</b> Gerçek ödeme alınmaz. Paketleri deneyip ekranların nasıl değiştiğini görebilirsin. Google Play\'e çıkmadan önce gerçek abonelik (Play Faturalandırma) bağlanacak.</div>';
    Object.keys(Core.PACKAGES).forEach(function (id) {
      const p = Core.PACKAGES[id];
      const cur = S.pkg === id;
      html += '<div class="card pkg ' + (cur ? 'cur' : '') + '"><div class="row"><b>' + p.emoji + ' ' + esc(p.name) + '</b>' + (cur ? '<span class="chip">Aktif</span>' : '') + '</div>' +
        '<p class="muted">' + (p.price === 0 ? 'Ücretsiz' : 'Aylık abonelik · fiyat henüz belirlenmedi') + '</p><ul class="feat">' +
        p.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
        (cur ? '' : '<button class="btn ' + (id === 'free' ? 'ghost' : '') + '" data-act="setPkg" data-id="' + id + '">' + (id === 'free' ? 'Aboneliği bitir (test)' : 'Bu paketi dene (test)') + '</button>') + '</div>';
    });
    if (S.pkg === 'manual') {
      html += '<div class="card"><b>💚 Yapay zekâlı sesli anlatım</b><p class="muted">Manuel pakete +' + Core.NARRATION_ADDON_TL + ' TL fark ile eklenir.</p>' +
        (ent.narration ? '<span class="chip">Açık</span> <button class="link" data-act="cancelNarr">Kapat</button>' : '<button class="btn" data-act="buyNarr">Aç — ' + Core.NARRATION_ADDON_TL + ' TL (test)</button>') + '</div>';
    }
    return html;
  };

  views.history = function (S, ui, now) {
    const h = Core.history(S);
    let html = '<h2>↶ Geçmiş İşlemler</h2><p class="muted">Burası bir çöp kutusu değil, tamamladığın işlerin arşivi.</p>';
    html += '<h3>✅ Tamamlanan çalışmalar</h3>';
    if (!h.completed.length) html += '<div class="card muted">Henüz tamamlanmış çalışma yok.</div>';
    h.completed.forEach(function (g) {
      html += '<div class="card"><b>📁 ' + esc(g.projectTitle) + '</b>' + (g.projectComplete ? ' <span class="chip">Proje bitti</span>' : '') + '<ul class="feat">';
      g.items.forEach(function (it) { html += '<li>✅ ' + esc(it.title) + ' <small class="muted">' + Core.formatDate(it.doneAt) + '</small></li>'; });
      html += '</ul>';
      g.plans.forEach(function (pl) {
        html += '<details><summary>📄 ' + esc(pl.title) + '</summary><p class="plan">' + nl2br(pl.text) + '</p></details>';
      });
      html += '</div>';
    });
    html += '<h3>🕒 En son yarım kalan proje</h3>';
    if (!h.lastUnfinished) html += '<div class="card muted">Yarım kalan proje yok.</div>';
    else {
      const u = h.lastUnfinished;
      html += '<div class="card"><b>🟨 ' + esc(u.title) + '</b><p class="muted">Son çalışma: ' + Core.formatDate(u.updatedAt) + ' · %' + u.progress.pct + '</p>' +
        '<p><b>Son kaydedilen bilgi:</b><br>' + esc(u.lastNote) + '</p>' +
        (u.next ? '<p class="muted">Sıradaki görev: ' + esc(u.next.title) + '</p>' : '') +
        '<button class="btn" data-act="viewProject" data-id="' + esc(u.projectId) + '">PROJEYİ GÖRÜNTÜLE</button></div>';
    }
    return html;
  };

  views.settings = function (S, ui) {
    return '<h2>⚙ Ayarlar</h2>' +
      '<div class="card"><b>🎨 Görünüm</b><p class="muted small">Siyah tema pil tasarrufu sağlar ve geceleri gözü yormaz.</p>' +
      seg([{ v: 'dark', t: '🌑 Siyah' }, { v: 'light', t: '☀️ Açık' }, { v: 'system', t: '📱 Sistem' }], S.settings.theme, 'setTheme') + '</div>' +
      '<div class="card"><label class="lbl" for="setName">Adın</label>' +
      '<input id="setName" class="inp" maxlength="30" value="' + esc(S.user.name) + '"><button class="btn" data-act="saveName">Kaydet</button></div>' +
      '<div class="card"><b>Verilerin</b><p class="muted">Veriler şu an yalnızca bu cihazda saklanır. İstediğin zaman dışa aktarabilir veya silebilirsin.</p>' +
      '<button class="btn" data-act="export">Verilerimi dışa aktar (JSON)</button>' +
      '<button class="btn ghost" data-act="exportCsv">Gelir-gider kayıtlarını dışa aktar (CSV)</button>' +
      '<button class="btn danger" data-act="wipe">Tüm verilerimi sil</button></div>' +
      '<button class="card linkcard" data-act="go" data-route="about"><b>❓ Yardım, gizlilik ve bilgi</b><span class="muted small">Sık sorulan sorular, uyarılar ›</span></button>' +
      '<div class="card"><b>Test araçları</b><p class="muted">Yalnızca geliştirme sürecinde kullanılır.</p>' +
      '<button class="btn ghost" data-act="resetUsage">Bugünkü sohbet süresini sıfırla</button>' +
      '<button class="btn ghost" data-act="fillUsage">Sohbet süresini bitir (sınırı test et)</button></div>' +
      '<p class="fine">Pasif Gelirim · sürüm 0.2 (test)</p>';
  };

  views.about = function () {
    const faq = [
      ['Pasif Gelirim para kazanmayı garanti eder mi?', 'Hayır. Hiçbir gelir modeli için garanti vermiyoruz. Çoğu iş ilk haftalarda ve hatta aylarda gelir getirmeyebilir. Amacımız, kendi işini adım adım kurmana ve gerçek rakamlarını görmene yardımcı olmak.'],
      ['Kurduğum iş kime ait?', 'Sana. Aboneliğin bitse bile kurduğun işe, hesaplarına ve çalışmalarına el konmaz. Biten tek şey, ücretli yapay zekâ ve otomasyon hizmetleridir.'],
      ['Ücretsiz pakette neler var?', 'Gelir-gider takibi ve grafikler, aylık hedef, çalışma serisi, rozetler, günlük 1 saatlik yapay zekâ sohbeti ve Geçmiş İşlemler arşivi.'],
      ['Aboneliği bırakırsam ne olur?', 'Otomasyonlar durur. Kendi işine manuel devam edebilir, eski çalışmalarına ↶ Geçmiş İşlemler\'den ulaşabilirsin. Yeniden abone olursan otomasyonlar yeniden açılır.'],
      ['Verilerim nerede saklanıyor?', 'Şu an yalnızca bu cihazda. Uygulamayı silersen veriler de gider; bu yüzden Ayarlar\'dan düzenli olarak dışa aktarmanı öneririz.'],
      ['Günlük 1 saatlik sohbet nasıl çalışıyor?', 'Sayaç yalnızca Sohbet ekranı açıkken işler ve her gün yenilenir.']
    ];
    return '<h2>❓ Yardım ve Bilgi</h2><div class="card honest">⚠️ <b>Önemli uyarı:</b> Pasif Gelirim bir finansal, hukuki veya vergi danışmanlığı değildir. Gelir elde etmek garanti edilmez; kazançlar kişiden kişiye değişir.</div>' +
      '<h3>Sık sorulan sorular</h3>' +
      faq.map(function (q) { return '<details class="card faq"><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>'; }).join('') +
      '<h3>Gizlilik (taslak)</h3><div class="card"><p class="small">Bu test sürümünde girdiğin bilgiler yalnızca cihazında saklanır ve herhangi bir sunucuya gönderilmez. Google Play yayını öncesinde bu metin, uygulamanın gerçek veri kullanımına göre hukuki olarak gözden geçirilip tamamlanacaktır.</p></div>' +
      '<p class="fine">Pasif Gelirim · sürüm 0.2 (test) · DAHA FAZLASI MÜMKÜN.</p>';
  };

  // ---------- Üst çubuk, katman (modal, kalp, bildirim) ----------
  function topHtml(S, ui) {
    const sub = TOP.indexOf(ui.route) === -1;
    const themeIcon = ui.resolvedTheme === 'light' ? '🌙' : '☀️';
    return (sub
      ? '<div class="brandrow"><button class="icon back" data-act="back" aria-label="Geri"><span class="ic">←</span></button><b>' + esc(TITLES[ui.route] || '') + '</b></div>'
      : '<div class="brandrow"><img class="brand-logo" src="logo.png" alt=""><b>Pasif Gelirim</b></div>') +
      '<div class="top-r">' +
      '<button class="icon" data-act="toggleTheme" title="Tema" aria-label="Temayı değiştir"><span class="ic">' + themeIcon + '</span></button>' +
      '<button class="icon" data-act="go" data-route="history" title="Geçmiş İşlemler" aria-label="Geçmiş İşlemler"><span class="ic">↶</span></button>' +
      '<button class="icon" data-act="go" data-route="settings" title="Ayarlar" aria-label="Ayarlar"><span class="ic">⚙</span></button></div>';
  }

  function layerHtml(S, ui) {
    const ent = Core.entitlements(S);
    let html = '';
    if (ui.route === 'task') {
      const p = Core.activeProject(S);
      const m = p && Core.modelById(p.modelId);
      const t = m && m.tasks.find(function (x) { return x.id === ui.taskId; });
      if (ent.pkg.tier >= 1) html += '<button class="heart" data-act="narrOpen" aria-label="Yapay zekâlı anlatım">💚</button>';
      if (t && ui.narr === 'offer') html += offerModal();
      if (t && ui.narr === 'panel') html += narrationPanel(S, ui, t);
    }
    if (ui.exportText != null) {
      html += '<div class="modal"><div class="sheet"><h3>' + esc(ui.exportTitle || 'Dışa aktarma') + '</h3>' +
        '<p class="muted small">Dosya otomatik kaydedilemedi. Metni kopyalayıp bir not uygulamasına yapıştırabilirsin.</p>' +
        '<textarea id="exportBox" class="inp" rows="8" readonly>' + esc(ui.exportText) + '</textarea>' +
        '<button class="btn" data-act="copyExport">Kopyala</button><button class="btn ghost" data-act="closeExport">Kapat</button></div></div>';
    }
    if (ui.toast) html += '<div class="toast" role="status">' + esc(ui.toast) + '</div>';
    return html;
  }

  function parts(S, ui, now) {
    const route = views[ui.route] ? ui.route : 'home';
    return {
      route: route,
      chrome: route !== 'welcome',
      activeTab: route === 'task' ? 'tasks' : (route === 'charts' ? 'money' : route),
      top: topHtml(S, ui),
      main: views[route](S, ui, now),
      layer: layerHtml(S, ui)
    };
  }

  return { esc: esc, tl: tl, views: views, parts: parts, catOptions: catOptions, STORAGE_KEY: STORAGE_KEY, TOP: TOP };
});
