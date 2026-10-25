/* Pasif Gelirim - arayüz. Görünümler saf fonksiyondur (durum -> HTML), böylece Node'da da test edilir. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./data.js'));
  else root.App = factory(root.Core, root.Data);
})(typeof self !== 'undefined' ? self : this, function (Core, Data) {

  const STORAGE_KEY = 'pasif_gelirim_state_v1';
  const TOP = ['home', 'tasks', 'chat', 'money', 'packages'];
  const NO_CHROME = ['welcome', 'onboarding', 'lock'];
  const TITLES = { task: 'Görev', calc: 'Hesaplayıcı', glossary: 'Sözlük', charts: 'Grafikler', auto: 'Otomasyon', history: 'Geçmiş İşlemler', settings: 'Ayarlar', about: 'Yardım ve Bilgi' };

  // ---------- Çizgi simgeler ----------
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    tasks: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    history: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><polyline points="12 7 12 12 15 14"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-1.21 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98 1.21 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    backspace: '<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    chevron: '<polyline points="9 18 15 12 9 6"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="16" y1="11" x2="16.01" y2="11"/><line x1="8" y1="15" x2="8.01" y2="15"/><line x1="12" y1="15" x2="12.01" y2="15"/><line x1="16" y1="15" x2="16.01" y2="15"/><line x1="8" y1="19" x2="12" y2="19"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    circle: '<circle cx="12" cy="12" r="9"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'
  };
  function icon(name, size) {
    const s = size || 20;
    return '<svg class="i" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }
  const BADGE_ICON = { 'first-task': 'check', 'first-record': 'file', 'first-income': 'trend', 'streak-3': 'flame', 'streak-7': 'flame', 'goal': 'target', 'project': 'trophy' };

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
  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + tl(Math.abs(n)); }
  function bar(pct, over) { return '<div class="bar' + (over ? ' over' : '') + '"><div class="bar-fill" style="width:' + pct + '%"></div></div>'; }
  function lock(msg, btnText, route) {
    return '<div class="card lock"><div class="lock-ico">' + icon('lock', 28) + '</div><p>' + esc(msg) + '</p>' +
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
  function catOptions(type, sel) {
    return Core.CATEGORIES[type === 'out' ? 'out' : 'in'].map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
  }
  function seg(items, cur, act) {
    return '<div class="segctl" role="group">' + items.map(function (it) {
      return '<button class="segbtn ' + (cur === it.v ? 'on' : '') + '" data-act="' + act + '" data-v="' + esc(it.v) + '">' + esc(it.t) + '</button>';
    }).join('') + '</div>';
  }
  function rowLink(ic, title, sub, act, extra) {
    return '<button class="rowlink" data-act="' + act + '"' + (extra || '') + '><span class="rl-ic">' + icon(ic, 20) + '</span><span class="rl-tx"><b>' + esc(title) + '</b>' +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + icon('chevron', 18) + '</button>';
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
    g += '<defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--g);stop-opacity:.3"/><stop offset="1" style="stop-color:var(--g);stop-opacity:0"/></linearGradient></defs>';
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

  function legend(items) {
    if (!items.length) return '<p class="muted small">Bu dönemde kayıt yok.</p>';
    return '<ul class="legend">' + items.map(function (it, i) {
      return '<li><i style="background:var(--c' + (i % 4) + ')"></i><span>' + esc(it.name) + '</span><b>' + tl(it.amount) + '</b><small>%' + Math.round(it.pct) + '</small></li>';
    }).join('') + '</ul>';
  }

  // ---------- Ana ekran kahraman grafiği ----------
  function heroChart(series) {
    const n = series.buckets.length, W = 320, H = 84, pad = 6;
    const vals = series.buckets.map(function (b) { return b.cum; });
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi += 1; lo -= 1; }
    const x = function (i) { return pad + i * ((W - pad * 2) / Math.max(1, n - 1)); };
    const y = function (v) { return pad + (H - pad * 2) * (1 - (v - lo) / (hi - lo)); };
    const pts = vals.map(function (v, i) { return x(i).toFixed(1) + ' ' + y(v).toFixed(1); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="herochart" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="gHero" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--g);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--g);stop-opacity:0"/></linearGradient></defs>' +
      '<path class="area" d="M' + pts.join(' L') + ' L' + x(n - 1).toFixed(1) + ' ' + H + ' L' + x(0).toFixed(1) + ' ' + H + ' Z" fill="url(#gHero)"/>' +
      '<path class="line" pathLength="1" d="M' + pts.join(' L') + '" fill="none" vector-effect="non-scaling-stroke"/></svg>';
  }
  function chg(cur, prev, goodWhenUp) {
    if (!(prev > 0)) return '<span class="trend flat">Geçen ay verisi yok</span>';
    const p = Math.round((cur - prev) / prev * 1000) / 10;
    if (p === 0) return '<span class="trend flat">Geçen ayla aynı</span>';
    const up = p > 0, good = up === goodWhenUp;
    return '<span class="trend ' + (good ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' %' + String(Math.abs(p)).replace('.', ',') + '</span>';
  }
  const CAT_ICON = { satis: 'cart', hizmet: 'wallet', ortaklik: 'megaphone', arac: 'tag', reklam: 'megaphone', malzeme: 'box', diger: 'dots' };

  // ---------- Görünümler ----------
  const views = {};

  const ONB = [
    { ic: 'target', t: 'Gerçekçi başla', d: 'Pasif Gelirim garanti kazanç vaat etmez. Sana uygun bir dijital iş modelini seçmene ve adım adım kurmana yardım eder.' },
    { ic: 'tasks', t: 'Adım adım ilerle', d: 'Kısa görevlerle işini kur. Takıldığın yerde yapay zekâ sohbetinden destek al.' },
    { ic: 'trend', t: 'Rakamlarını takip et', d: 'Gelir ve giderlerini kaydet, grafiklerle gerçek ilerlemeni gör. Bu bölüm herkese ücretsiz.' }
  ];

  views.onboarding = function (S, ui) {
    const i = Math.max(0, Math.min(ONB.length - 1, ui.onb || 0)), s = ONB[i];
    return '<div class="onb"><div class="onb-top"><img class="onb-logo" src="logo.png" alt=""><button class="link" data-act="onbSkip">Atla</button></div>' +
      '<div class="onb-body"><div class="onb-ic">' + icon(s.ic, 44) + '</div><h1>' + esc(s.t) + '</h1><p>' + esc(s.d) + '</p></div>' +
      '<div class="onb-foot"><div class="pager">' + ONB.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<button class="btn big" data-act="onbNext">' + (i === ONB.length - 1 ? 'Başlayalım' : 'Devam') + '</button></div></div>';
  };

  views.welcome = function (S) {
    return '<div class="welcome">' +
      '<div class="logo-wrap"><img class="logo-big" src="logo.png" alt="Pasif Gelirim logosu"></div><h1>Pasif Gelirim</h1><p class="slogan">DAHA FAZLASI MÜMKÜN.</p>' +
      '<div class="card"><p>Burada sana <b>garanti kazanç</b> vaat etmiyoruz. Kendi dijital işini adım adım kurmana, gerçek rakamlarını takip etmene ve ilerlemeni görmene yardımcı oluyoruz.</p>' +
      '<p class="muted">Kurduğun iş ve verilerin sana aittir.</p></div>' +
      '<label class="lbl" for="nameInput">Sana nasıl hitap edelim?</label>' +
      '<input id="nameInput" class="inp" maxlength="30" placeholder="Adın" value="' + esc(S.user.name) + '">' +
      '<button class="btn big" data-act="start">Başla</button></div>';
  };

  views.lock = function (S, ui) {
    const mode = ui.pinMode || 'unlock';
    const titles = { unlock: 'PIN kodunu gir', new: 'Yeni PIN belirle', confirm: 'PIN\'i tekrar gir', disable: 'Kilidi kapatmak için PIN gir' };
    const len = (ui.pin || '').length;
    let keys = '';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(function (k) { keys += '<button class="key" data-act="pinKey" data-v="' + k + '">' + k + '</button>'; });
    keys += '<span></span><button class="key" data-act="pinKey" data-v="0">0</button><button class="key del" data-act="pinKey" data-v="del" aria-label="Sil">' + icon('backspace', 24) + '</button>';
    return '<div class="pinwrap"><img class="pin-logo" src="logo.png" alt=""><h2>' + esc(titles[mode]) + '</h2>' +
      '<div class="dots" id="pinDots">' + [0, 1, 2, 3].map(function (k) { return '<i class="' + (k < len ? 'f' : '') + '"></i>'; }).join('') + '</div>' +
      '<p class="pin-msg" role="alert">' + esc(ui.pinMsg || '') + '</p>' +
      '<div class="keypad">' + keys + '</div>' +
      (mode === 'unlock' ? '<button class="link" data-act="pinForgot">PIN\'imi unuttum</button>' : '<button class="link" data-act="pinCancel">Vazgeç</button>') + '</div>';
  };

  views.home = function (S, ui, now) {
    const ent = Core.entitlements(S);
    const p = Core.activeProject(S);
    const left = Core.remainingSeconds(S, now);
    const st = Core.streak(S, now);
    const week = Core.financeSeries(S, '7d', now);
    const gp = Core.goalProgress(S, now);
    const fs = Core.financeSummary(S, now), ins = Core.insights(S, now), m30 = Core.financeSeries(S, '30d', now);
    let html = '<div class="hello"><h2>Merhaba' + (S.user.name ? ' ' + esc(S.user.name) : '') + '</h2><span class="chip">' + esc(ent.pkg.name) + ' paketi</span></div>';
    html += '<button class="card hero" data-act="go" data-route="charts"><small>Toplam net</small><div class="hero-num ' + (fs.net < 0 ? 'neg' : '') + '">' + tl(fs.net) + '</div>' +
      '<span class="trend ' + (ins.thisMonth.net > 0 ? 'up' : ins.thisMonth.net < 0 ? 'down' : 'flat') + '">' + (ins.thisMonth.net > 0 ? '▲ ' : ins.thisMonth.net < 0 ? '▼ ' : '') + 'Bu ay ' + signed(ins.thisMonth.net) + '</span>' +
      (m30.empty ? '<p class="muted small hero-empty">İlk kaydını girince grafik burada çizilir.</p>' : heroChart(m30)) + '</button>';
    html += '<div class="grid2 pair"><div class="card stat2"><small>Aylık gelir</small><b>' + tl(ins.thisMonth.in) + '</b>' + chg(ins.thisMonth.in, ins.lastMonth.in, true) + '</div>' +
      '<div class="card stat2"><small>Aylık gider</small><b>' + tl(ins.thisMonth.out) + '</b>' + chg(ins.thisMonth.out, ins.lastMonth.out, false) + '</div></div>';
    const recent = S.finance.slice().sort(function (a, b) { return b.date - a.date || (b.at || 0) - (a.at || 0); }).slice(0, 4);
    html += '<div class="row sect"><h3>Son işlemler</h3><button class="link" data-act="go" data-route="money">Tümü ›</button></div>';
    if (!recent.length) html += '<div class="card muted small">Henüz işlem yok. Aşağıdaki düğmelerle ilk geliri veya gideri ekleyebilirsin.</div>';
    else html += '<div class="card nopad txlist">' + recent.map(function (r) {
      return '<div class="tx ' + r.type + '"><span class="tx-ic">' + icon(CAT_ICON[r.cat] || 'dots', 20) + '</span><span class="tx-tx"><b>' + esc(Core.categoryName(r.type, r.cat)) + '</b><small>' + Core.formatDate(r.date) + (r.note ? ' · ' + esc(r.note) : '') + '</small></span><b class="tx-amt">' + (r.type === 'in' ? '+' : '−') + tl(r.amount) + '</b></div>';
    }).join('') + '</div>';
    if (S.cancelledAt && ent.pkg.tier === 0) {
      html += '<div class="card note">Aboneliğin sona erdi. Kurduğun işe manuel devam edebilir, eski çalışmalarına Geçmiş İşlemler\'den ulaşabilirsin.</div>';
    }
    html += '<div class="qa-row"><button class="qa in" data-act="quickAdd" data-v="in">' + icon('plus', 18) + 'Gelir ekle</button><button class="qa out" data-act="quickAdd" data-v="out">' + icon('minus', 18) + 'Gider ekle</button></div>';
    const cl = Core.checklist(S, now);
    if (!cl.complete) {
      html += '<div class="card checklist"><div class="row"><b>Başlangıç adımları</b><span class="muted small">' + cl.done + ' / ' + cl.total + '</span></div>' + bar(Math.round(cl.done / cl.total * 100)) +
        cl.items.map(function (it) {
          return '<button class="cl ' + (it.done ? 'done' : '') + '" data-act="go" data-route="' + it.route + '"' + (it.done ? ' tabindex="-1"' : '') + '><span class="cl-ic">' + icon(it.done ? 'check' : 'circle', 18) + '</span><span>' + esc(it.title) + '</span>' + (it.done ? '' : icon('chevron', 16)) + '</button>';
        }).join('') + '</div>';
    }
    html += '<div class="card streak"><div class="row"><div class="sline"><span class="flame ' + (st.current > 0 ? 'on' : '') + '">' + icon('flame', 22) + '</span><b>' + st.current + ' günlük seri</b></div><span class="muted small">En iyi: ' + st.best + '</span></div>' +
      '<p class="muted small">' + (st.activeToday ? 'Bugün de çalıştın, harika.' : (st.current > 0 ? 'Serini korumak için bugün küçük bir adım at.' : 'Bir görev tamamla, kayıt gir veya sohbet et; seri başlasın.')) + '</p>' +
      '<div class="badges">' + Core.badges(S, now).map(function (b) {
        return '<span class="badge ' + (b.earned ? 'on' : '') + '" title="' + esc(b.title + ' — ' + b.desc) + '"><i>' + icon(b.earned ? (BADGE_ICON[b.id] || 'check') : 'lock', 20) + '</i><small>' + esc(b.title) + '</small></span>';
      }).join('') + '</div></div>';
    if (p) {
      const pr = Core.progress(p);
      const nt = Core.nextTask(p);
      html += '<div class="card"><div class="row"><b>' + esc(p.title) + '</b><span class="muted">%' + pr.pct + '</span></div>' + bar(pr.pct) +
        '<p class="muted">' + pr.done + ' / ' + pr.total + ' görev tamamlandı</p>' +
        (nt ? '<button class="btn" data-act="openTask" data-id="' + esc(nt.id) + '">Sıradaki: ' + esc(nt.title) + '</button>'
            : '<p>Tüm görevleri tamamladın. Şimdi sonuçlarını takip etme zamanı.</p>') + '</div>';
    } else if (ent.selectModel) {
      html += '<div class="card"><b>Henüz bir gelir modeli seçmedin.</b><p class="muted">Birkaç kısa soruyla sana uygun olanı bulalım.</p>' +
        '<button class="btn" data-act="go" data-route="tasks">Gelir modelimi seç</button></div>';
    } else {
      html += lock('Gelir modeli seçmek ve görev listesini kullanmak için Manuel paket gerekir.', 'Paketlere bak', 'packages');
    }
    html += '<div class="grid2">' +
      '<button class="tile" data-act="go" data-route="chat"><span class="ti">' + icon('chat', 20) + '</span><b>AI Sohbet</b><small>Bugün kalan: ' + Core.formatDuration(left) + '</small></button>' +
      '<button class="tile" data-act="go" data-route="money"><span class="ti">' + icon('trend', 20) + '</span><b>Kazanç</b><small>' + tl(Core.financeSummary(S, now).net) + ' net</small></button>' +
      '<button class="tile" data-act="go" data-route="auto"><span class="ti">' + icon('zap', 20) + '</span><b>Otomasyon</b><small>' + (ent.automation ? 'Açık' : 'Ücretli paket') + '</small></button>' +
      '<button class="tile" data-act="go" data-route="history"><span class="ti">' + icon('history', 20) + '</span><b>Geçmiş İşlemler</b><small>Eski çalışmaların</small></button>' +
      '<button class="tile" data-act="go" data-route="calc"><span class="ti">' + icon('calc', 20) + '</span><b>Hesaplayıcı</b><small>Hedefe kaç satış?</small></button>' +
      '<button class="tile" data-act="go" data-route="glossary"><span class="ti">' + icon('book', 20) + '</span><b>Sözlük</b><small>Terimleri öğren</small></button>' +
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
    let html = '<h2>' + esc(p.title) + '</h2>' + bar(pr.pct) + '<p class="muted">' + pr.done + ' / ' + pr.total + ' tamamlandı</p>';
    if (!ent.selectModel) html += '<div class="card note">Aboneliğin aktif değil; bu işe manuel devam edebilirsin. Yeni model seçmek için paket gerekir.</div>';
    html += '<div class="card honest"><b>Dürüst not:</b> ' + esc(m.honest) + '</div>';
    html += '<ul class="list">';
    m.tasks.forEach(function (t, i) {
      const done = p.tasks[t.id] && p.tasks[t.id].done;
      html += '<li><button class="task ' + (done ? 'done' : '') + '" data-act="openTask" data-id="' + esc(t.id) + '">' +
        '<span class="chk">' + (done ? icon('check', 16) : (i + 1)) + '</span><span>' + esc(t.title) + '</span></button></li>';
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
      h += '<div class="card"><div class="row"><b>' + esc(r.model.title) + '</b>' + (i === 0 ? '<span class="chip">En uygun</span>' : '') + '</div>' +
        '<p>' + esc(r.model.summary) + '</p>' +
        (r.reasons.length ? '<p class="muted">' + r.reasons.map(esc).join(' • ') + '</p>' : '') +
        '<p class="honest-line">' + esc(r.model.honest) + '</p>' +
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
      '<button class="btn ' + (st.done ? 'ghost' : '') + '" data-act="toggleTask" data-id="' + esc(t.id) + '">' + (st.done ? 'Tamamlandı (geri al)' : 'Görevi tamamladım') + '</button>' +
      '<div class="row pn">' + (prev ? '<button class="link" data-act="openTask" data-id="' + esc(prev.id) + '">← Önceki</button>' : '<span></span>') +
      (next ? '<button class="link" data-act="openTask" data-id="' + esc(next.id) + '">Sonraki →</button>' : '<span></span>') + '</div>';
  };

  function offerModal() {
    return '<div class="modal"><div class="sheet"><h3>💚 Okumaktan yoruldun mu?</h3>' +
      '<p>Anlamakta zorlandığın bir bölüm mü var?</p>' +
      '<p>Yapay zekâ sana görevleri sesli olarak anlatsın, karmaşık konuları basitleştirsin ve anlamadığın yerleri açıklasın.</p>' +
      '<p><b>Yalnızca ' + Core.NARRATION_ADDON_TL + ' TL farkla!</b></p>' +
      '<p class="fine">TEST MODU: gerçek ödeme alınmaz.</p>' +
      '<button class="btn" data-act="buyNarr">YAPAY ZEKÂLI ANLATIMI AÇ — ' + Core.NARRATION_ADDON_TL + ' TL</button>' +
      '<button class="btn ghost" data-act="narrClose">ŞİMDİLİK İSTEMİYORUM</button></div></div>';
  }

  function narrationPanel(S, ui, t) {
    return '<div class="modal"><div class="sheet"><h3>💚 Yapay zekâlı anlatım</h3>' +
      '<button class="btn" data-act="speak" data-id="' + esc(t.id) + '">Bana sesli anlat</button>' +
      '<button class="btn ghost" data-act="stopSpeak">Durdur</button>' +
      '<label class="lbl" for="askInput">Anlamadığın yeri yaz</label>' +
      '<input id="askInput" class="inp" placeholder="Örn: Hedef kitle ne demek? Örnek ver">' +
      '<button class="btn" data-act="askNarr">Açıkla</button>' +
      (ui.narrAnswer ? '<div class="card">' + nl2br(ui.narrAnswer) + '</div>' : '') +
      '<button class="link" data-act="narrClose">Kapat</button></div></div>';
  }

  views.chat = function (S, ui, now) {
    const left = Core.remainingSeconds(S, now);
    let html = '<h2>AI Sohbet</h2>' +
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
    const ed = ui.editId ? S.finance.find(function (r) { return r.id === ui.editId; }) : null;
    let html = '<h2>Kazanç</h2>';
    html += '<div class="card goal">';
    if (gp.target > 0) {
      html += '<div class="goal-row">' + ring(gp.pct, '%' + gp.pct) + '<div><b>Aylık hedef: ' + tl(gp.target) + '</b><p class="muted small">Bu ay: ' + tl(gp.got) + '</p>' +
        '<p class="small">' + (gp.reached ? 'Hedefe ulaştın, tebrikler.' : 'Kalan: ' + tl(gp.left)) + '</p></div></div>' +
        '<details><summary class="link">Hedefi değiştir</summary><div class="send"><input id="goalInput" class="inp" inputmode="decimal" placeholder="Yeni hedef (TL)"><button class="btn" data-act="saveGoal">Kaydet</button></div></details>';
    } else {
      html += '<b>Aylık gelir hedefi</b><p class="muted small">Gerçekçi bir hedef koy; ilerlemeni burada izle. Hedef bir garanti değildir.</p>' +
        '<div class="send"><input id="goalInput" class="inp" inputmode="decimal" placeholder="Örn: 2500"><button class="btn" data-act="saveGoal">Kaydet</button></div>';
    }
    html += '</div>';
    const bp = Core.budgetProgress(S, now);
    html += '<div class="card goal">';
    if (bp.target > 0) {
      html += '<div class="row"><b>Aylık gider bütçesi</b><span class="muted small">' + tl(bp.spent) + ' / ' + tl(bp.target) + '</span></div>' + bar(bp.pct, bp.over) +
        '<p class="small ' + (bp.over ? 'neg' : 'muted') + '">' + (bp.over ? 'Bütçeyi ' + tl(bp.overBy) + ' aştın.' : 'Kalan: ' + tl(bp.left)) + '</p>' +
        '<details><summary class="link">Bütçeyi değiştir</summary><div class="send"><input id="budgetInput" class="inp" inputmode="decimal" placeholder="Yeni bütçe (TL)"><button class="btn" data-act="saveBudget">Kaydet</button></div></details>';
    } else {
      html += '<b>Aylık gider bütçesi</b><p class="muted small">İstersen aylık harcama sınırı koy; aşmaya yaklaşınca görürsün. Boş bırakabilirsin.</p>' +
        '<div class="send"><input id="budgetInput" class="inp" inputmode="decimal" placeholder="Örn: 800"><button class="btn" data-act="saveBudget">Kaydet</button></div>';
    }
    html += '</div>';
    html += '<div class="grid2"><div class="stat"><small>Bu ay net</small><b class="' + (f.monthNet < 0 ? 'neg' : '') + '">' + tl(f.monthNet) + '</b></div><div class="stat"><small>Toplam net</small><b class="' + (f.net < 0 ? 'neg' : '') + '">' + tl(f.net) + '</b></div>' +
      '<div class="stat in"><small>Toplam gelir</small><b>' + tl(f.totalIn) + '</b></div><div class="stat out"><small>Toplam gider</small><b>' + tl(f.totalOut) + '</b></div></div>';
    html += '<button class="btn ghost" data-act="go" data-route="charts">' + icon('chart', 18) + ' Gelir-Gider Grafiklerini Aç</button>';
    html += '<div class="card' + (ed ? ' editing' : '') + '" id="finForm"><div class="row"><b>' + (ed ? 'Kaydı düzenle' : 'Yeni kayıt') + '</b>' + (ed ? '<button class="link" data-act="cancelEdit">Vazgeç</button>' : '') + '</div>' + seg([{ v: 'in', t: 'Gelir' }, { v: 'out', t: 'Gider' }], type, 'finType') +
      '<label class="lbl" for="finAmount">Tutar (TL)</label><input id="finAmount" class="inp" inputmode="decimal" placeholder="0,00"' + (ed ? ' value="' + esc(String(ed.amount).replace('.', ',')) + '"' : '') + '>' +
      '<div class="two"><div><label class="lbl" for="finCat">Kategori</label><select id="finCat" class="inp">' + catOptions(type, ed && ed.cat) + '</select></div>' +
      '<div><label class="lbl" for="finDate">Tarih</label><input id="finDate" type="date" class="inp" value="' + (ed ? Core.dateInputValue(ed.date) : today) + '" max="' + today + '"></div></div>' +
      '<label class="lbl" for="finNote">Not</label><input id="finNote" class="inp" maxlength="120" placeholder="Örn: ilk satış"' + (ed ? ' value="' + esc(ed.note) + '"' : '') + '>' +
      '<button class="btn" data-act="addFin">' + (ed ? 'Güncelle' : 'Kaydet') + '</button></div>' +
      '<p class="fine">Gerçek rakamlarını yaz. Amaç kendini kandırmadan ilerlemeyi görmek.</p>';
    const flt = ui.finFilter || 'all';
    if (S.finance.length > 4) html += '<div class="searchbox">' + icon('search', 18) + '<input id="finSearch" class="inp" type="search" placeholder="Kayıtlarda ara (not, kategori)" autocomplete="off"></div>';
    html += '<div class="row"><h3>Kayıtlar</h3>' + seg([{ v: 'all', t: 'Tümü' }, { v: 'in', t: 'Gelir' }, { v: 'out', t: 'Gider' }], flt, 'finFilter') + '</div><ul class="list">';
    const rows = S.finance.slice().sort(function (a, b) { return b.date - a.date || (b.at || 0) - (a.at || 0); })
      .filter(function (r) { return flt === 'all' || r.type === flt; });
    if (!rows.length) html += '<li class="card muted">' + (S.finance.length ? 'Bu filtrede kayıt yok.' : 'Henüz kayıt yok. İlk kaydını yukarıdan ekleyebilirsin.') + '</li>';
    rows.forEach(function (r) {
      html += '<li class="fin ' + r.type + '" data-q="' + esc((Core.categoryName(r.type, r.cat) + ' ' + r.note).toLocaleLowerCase('tr')) + '"><span>' + Core.formatDate(r.date) + ' · ' + esc(Core.categoryName(r.type, r.cat)) + (r.note ? '<br><small class="muted">' + esc(r.note) + '</small>' : '') + '</span>' +
        '<b>' + (r.type === 'in' ? '+' : '−') + tl(r.amount) + '</b><button class="x" data-act="editFin" data-id="' + esc(r.id) + '" aria-label="Kaydı düzenle">' + icon('edit', 18) + '</button><button class="x" data-act="delFin" data-id="' + esc(r.id) + '" aria-label="Kaydı sil">' + icon('trash', 18) + '</button></li>';
    });
    html += '</ul>';
    if (S.finance.length) html += '<button class="btn ghost" data-act="exportCsv">' + icon('download', 18) + ' Kayıtları CSV olarak dışa aktar</button>';
    return html;
  };

  views.calc = function (S, ui) {
    const g = S.goal.monthly || '';
    const r = ui.calcRes;
    let html = '<h2>Hedefe kaç satış?</h2><p class="muted">Satış fiyatını, maliyetini ve platform komisyonunu yaz; aylık net hedefine kaç satış gerektiğini gör.</p>' +
      '<div class="card"><label class="lbl" for="calcPrice">Satış fiyatı (TL)</label><input id="calcPrice" class="inp" inputmode="decimal" placeholder="Örn: 250">' +
      '<div class="two"><div><label class="lbl" for="calcCost">Satış başı maliyet (TL)</label><input id="calcCost" class="inp" inputmode="decimal" placeholder="0"></div>' +
      '<div><label class="lbl" for="calcFee">Komisyon (%)</label><input id="calcFee" class="inp" inputmode="decimal" placeholder="0"></div></div>' +
      '<label class="lbl" for="calcTarget">Aylık net hedef (TL)</label><input id="calcTarget" class="inp" inputmode="decimal" placeholder="Örn: 2500"' + (g ? ' value="' + esc(g) + '"' : '') + '>' +
      '<button class="btn" data-act="calcRun">Hesapla</button></div>';
    if (r) {
      html += r.ok
        ? '<div class="card result"><div class="irow"><span>Satış başına net</span><b>' + tl(r.netPerSale) + '</b></div><div class="irow"><span>Gereken satış</span><b>' + r.sales + ' adet</b></div>' +
          '<div class="irow"><span>Toplam ciro</span><b>' + tl(r.revenue) + '</b></div><div class="irow"><span>Günde yaklaşık</span><b>' + String(r.perDay).replace('.', ',') + ' satış</b></div></div>'
        : '<div class="card note">' + esc(r.error) + '</div>';
    }
    return html + '<p class="fine">Bu bir hesap makinesidir; o kadar satış yapacağını garanti etmez. Vergi ve diğer giderleri ayrıca düşünmelisin.</p>';
  };

  views.glossary = function () {
    const list = Core.glossaryList('');
    return '<h2>Sözlük</h2><p class="muted">Görevlerde karşına çıkabilecek terimler, sade anlatımla.</p>' +
      '<div class="searchbox">' + icon('search', 18) + '<input id="glossQ" class="inp" type="search" placeholder="Terim ara" autocomplete="off"></div>' +
      '<div id="glossList">' + list.map(function (e) {
        const q = (e.key + ' ' + e.aliases.join(' ') + ' ' + e.text).toLocaleLowerCase('tr');
        return '<details class="card faq" data-q="' + esc(q) + '"><summary>' + esc(e.term) + '</summary><p>' + esc(e.text) + '</p></details>';
      }).join('') + '</div><p class="muted small" id="glossEmpty" hidden>Eşleşen terim yok. Sohbette sormayı dene.</p>';
  };

  views.charts = function (S, ui, now) {
    const period = Core.PERIODS[ui.period] ? ui.period : '7d';
    const series = Core.financeSeries(S, period, now);
    let html = '<h2>Gelir-Gider Grafikleri</h2>' +
      seg(Object.keys(Core.PERIODS).map(function (k) { return { v: k, t: Core.PERIODS[k] }; }), period, 'period');
    if (series.empty) {
      return html + '<div class="card empty"><div class="empty-ico">' + icon('chart', 32) + '</div><p><b>Bu dönemde kayıt yok.</b></p><p class="muted">Grafikler, girdiğin gerçek gelir ve giderlere göre çizilir.</p>' +
        '<button class="btn" data-act="go" data-route="money">İlk kaydını gir</button></div>';
    }
    const sel = (ui.chartSel != null && ui.chartSel < series.buckets.length) ? ui.chartSel : series.buckets.length - 1;
    const b = series.buckets[sel];
    html += '<div class="grid3"><div class="stat in"><small>Gelir</small><b>' + tl(series.totals.in) + '</b></div><div class="stat out"><small>Gider</small><b>' + tl(series.totals.out) + '</b></div>' +
      '<div class="stat"><small>Net</small><b class="' + (series.totals.net < 0 ? 'neg' : '') + '">' + tl(series.totals.net) + '</b></div></div>';
    const ins = Core.insights(S, now);
    if (ins.hasData) {
      html += '<div class="card insight"><b>Bu ayın özeti</b>' +
        '<div class="irow"><span>Net</span><b class="' + (ins.thisMonth.net < 0 ? 'neg' : '') + '">' + tl(ins.thisMonth.net) + '</b></div>' +
        (ins.hasLast ? '<div class="irow"><span>Geçen aya göre</span><b class="' + (ins.diffNet < 0 ? 'neg' : 'pos') + '">' + signed(ins.diffNet) + '</b></div>' : '') +
        (ins.bestIncome ? '<div class="irow"><span>En çok gelir</span><b>' + esc(ins.bestIncome.name) + ' · ' + tl(ins.bestIncome.amount) + '</b></div>' : '') +
        (ins.topExpense ? '<div class="irow"><span>En çok gider</span><b>' + esc(ins.topExpense.name) + ' · ' + tl(ins.topExpense.amount) + '</b></div>' : '') +
        (ins.savingsRate != null ? '<div class="irow"><span>Elde kalan oranı</span><b class="' + (ins.savingsRate < 0 ? 'neg' : '') + '">%' + ins.savingsRate + '</b></div>' : '') +
        '<p class="fine">Yalnızca girdiğin kayıtlara dayanır; bir tahmin veya tavsiye değildir.</p></div>';
    }
    html += '<div class="card"><div class="row"><b>Gelir ve gider</b><span class="lg"><i class="in"></i>Gelir <i class="out"></i>Gider</span></div>' + barChart(series, sel) +
      '<div class="pick"><b>' + esc(b.full) + '</b><span>Gelir <b class="pin">' + tl(b.in) + '</b></span><span>Gider <b class="pout">' + tl(b.out) + '</b></span><span>Net <b class="' + (b.net < 0 ? 'neg' : '') + '">' + tl(b.net) + '</b></span></div></div>';
    html += '<div class="card"><div class="row"><b>Birikimli net</b><small class="muted">' + esc(b.full) + ': ' + tl(b.cum) + '</small></div>' + lineChart(series, sel) +
      '<p class="fine">Çizgi, başlangıçtan bu yana toplam net durumunu gösterir.</p></div>';
    const inc = Core.categorySplit(S, 'in', period, now), exp = Core.categorySplit(S, 'out', period, now);
    html += '<div class="card"><b>Gelir kaynakları</b><div class="donut-row">' + donut(inc.items, inc.total ? compact(inc.total) : '—', 'TL') + legend(inc.items) + '</div></div>';
    html += '<div class="card"><b>Gider dağılımı</b><div class="donut-row">' + donut(exp.items, exp.total ? compact(exp.total) : '—', 'TL') + legend(exp.items) + '</div></div>';
    html += '<p class="fine">Sütunlara dokunarak o günün veya ayın ayrıntısını görebilirsin.</p>';
    return html;
  };

  views.auto = function (S, ui, now) {
    const ent = Core.entitlements(S);
    let html = '<h2>Otomasyon</h2>';
    if (!ent.automation) {
      return html + lock('Otomatik plan hazırlama Yarı Otomasyon ve CEO Modu paketlerinde açılır.' +
        (S.cancelledAt ? ' Daha önce hazırlanan çalışmalarına Geçmiş İşlemler\'den ulaşabilirsin.' : ''), 'Paketlere bak', 'packages');
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
    html += '<h3>CEO Modu · Karar kartları</h3>';
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
      html += '<div class="card pkg ' + (cur ? 'cur' : '') + '"><div class="row"><b>' + esc(p.name) + '</b>' + (cur ? '<span class="chip">Aktif</span>' : '') + '</div>' +
        '<p class="muted">' + (p.price === 0 ? 'Ücretsiz' : 'Aylık abonelik · fiyat henüz belirlenmedi') + '</p><ul class="feat">' +
        p.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
        (cur ? '' : '<button class="btn ' + (id === 'free' ? 'ghost' : '') + '" data-act="setPkg" data-id="' + id + '">' + (id === 'free' ? 'Aboneliği bitir (test)' : 'Bu paketi dene (test)') + '</button>') + '</div>';
    });
    if (S.pkg === 'manual') {
      html += '<div class="card"><b>Yapay zekâlı sesli anlatım</b><p class="muted">Manuel pakete +' + Core.NARRATION_ADDON_TL + ' TL fark ile eklenir.</p>' +
        (ent.narration ? '<span class="chip">Açık</span> <button class="link" data-act="cancelNarr">Kapat</button>' : '<button class="btn" data-act="buyNarr">Aç — ' + Core.NARRATION_ADDON_TL + ' TL (test)</button>') + '</div>';
    }
    return html;
  };

  views.history = function (S, ui, now) {
    const h = Core.history(S);
    let html = '<h2>Geçmiş İşlemler</h2><p class="muted">Burası bir çöp kutusu değil, tamamladığın işlerin arşivi.</p>';
    html += '<h3>Tamamlanan çalışmalar</h3>';
    if (!h.completed.length) html += '<div class="card muted">Henüz tamamlanmış çalışma yok.</div>';
    h.completed.forEach(function (g) {
      html += '<div class="card"><b>' + esc(g.projectTitle) + '</b>' + (g.projectComplete ? ' <span class="chip">Proje bitti</span>' : '') + '<ul class="feat">';
      g.items.forEach(function (it) { html += '<li>' + esc(it.title) + ' <small class="muted">' + Core.formatDate(it.doneAt) + '</small></li>'; });
      html += '</ul>';
      g.plans.forEach(function (pl) {
        html += '<details><summary>' + esc(pl.title) + '</summary><p class="plan">' + nl2br(pl.text) + '</p></details>';
      });
      html += '</div>';
    });
    html += '<h3>En son yarım kalan proje</h3>';
    if (!h.lastUnfinished) html += '<div class="card muted">Yarım kalan proje yok.</div>';
    else {
      const u = h.lastUnfinished;
      html += '<div class="card"><b>' + esc(u.title) + '</b><p class="muted">Son çalışma: ' + Core.formatDate(u.updatedAt) + ' · %' + u.progress.pct + '</p>' +
        '<p><b>Son kaydedilen bilgi:</b><br>' + esc(u.lastNote) + '</p>' +
        (u.next ? '<p class="muted">Sıradaki görev: ' + esc(u.next.title) + '</p>' : '') +
        '<button class="btn" data-act="viewProject" data-id="' + esc(u.projectId) + '">PROJEYİ GÖRÜNTÜLE</button></div>';
    }
    return html;
  };

  views.settings = function (S, ui) {
    const rem = S.settings.reminder;
    return '<h2>Ayarlar</h2>' +
      '<div class="card"><b>Görünüm</b><p class="muted small">Siyah tema pil tasarrufu sağlar ve geceleri gözü yormaz.</p>' +
      seg([{ v: 'dark', t: 'Siyah' }, { v: 'light', t: 'Açık' }, { v: 'system', t: 'Sistem' }], S.settings.theme, 'setTheme') + '</div>' +
      '<div class="card"><b>Güvenlik</b><p class="muted small">PIN kilidi, uygulamayı açarken ve arka plandan dönerken sorulur. Cihaz içi basit bir kilittir.</p>' +
      '<div class="row"><span>' + icon('lock', 18) + ' Uygulama kilidi: <b>' + (S.lock.enabled ? 'Açık' : 'Kapalı') + '</b></span>' +
      (S.lock.enabled ? '<button class="btn ghost slim" data-act="lockOff">Kapat</button>' : '<button class="btn slim" data-act="lockOn">PIN belirle</button>') + '</div></div>' +
      '<div class="card"><b>Günlük hatırlatıcı</b><p class="muted small">Küçük bir adım atmanı hatırlatan, baskı yapmayan tek bir bildirim. Yalnızca Android uygulamasında çalışır.</p>' +
      seg([{ v: 'off', t: 'Kapalı' }, { v: 'on', t: 'Açık' }], rem.enabled ? 'on' : 'off', 'remToggle') +
      '<label class="lbl" for="remTime">Saat</label><div class="send"><input id="remTime" type="time" class="inp" value="' + esc(rem.time) + '"><button class="btn" data-act="saveReminder">Kaydet</button></div></div>' +
      '<div class="card"><label class="lbl" for="setName">Adın</label>' +
      '<input id="setName" class="inp" maxlength="30" value="' + esc(S.user.name) + '"><button class="btn" data-act="saveName">Kaydet</button></div>' +
      '<div class="card"><b>Verilerin</b><p class="muted small">Veriler şu an yalnızca bu cihazda saklanır. Uygulamayı silersen kaybolur; düzenli yedek almanı öneririz.</p>' +
      '<button class="btn" data-act="export">' + icon('download', 18) + ' Yedek al (JSON)</button>' +
      '<button class="btn ghost" data-act="importPick">' + icon('upload', 18) + ' Yedekten geri yükle</button>' +
      '<input id="importFile" type="file" accept="application/json,.json,text/plain" hidden>' +
      '<button class="btn ghost" data-act="exportCsv">' + icon('file', 18) + ' Gelir-gider kayıtları (CSV)</button>' +
      '<button class="btn danger" data-act="wipe">' + icon('trash', 18) + ' Tüm verilerimi sil</button></div>' +
      '<div class="card nopad">' + rowLink('help', 'Yardım ve bilgi', 'Sık sorulan sorular, uyarılar', 'go', ' data-route="about"') +
      rowLink('info', 'Sorun bildir', 'Tanılama bilgisini kopyala', 'diag') + '</div>' +
      '<div class="card"><b>Test araçları</b><p class="muted small">Yalnızca geliştirme sürecinde kullanılır.</p>' +
      '<button class="btn ghost" data-act="resetUsage">Bugünkü sohbet süresini sıfırla</button>' +
      '<button class="btn ghost" data-act="fillUsage">Sohbet süresini bitir (sınırı test et)</button></div>' +
      '<p class="fine">Pasif Gelirim · sürüm ' + esc(Core.APP_VERSION) + ' (test)</p>';
  };

  views.about = function () {
    const faq = [
      ['Pasif Gelirim para kazanmayı garanti eder mi?', 'Hayır. Hiçbir gelir modeli için garanti vermiyoruz. Çoğu iş ilk haftalarda ve hatta aylarda gelir getirmeyebilir. Amacımız, kendi işini adım adım kurmana ve gerçek rakamlarını görmene yardımcı olmak.'],
      ['Kurduğum iş kime ait?', 'Sana. Aboneliğin bitse bile kurduğun işe, hesaplarına ve çalışmalarına el konmaz. Biten tek şey, ücretli yapay zekâ ve otomasyon hizmetleridir.'],
      ['Ücretsiz pakette neler var?', 'Gelir-gider takibi ve grafikler, aylık hedef, çalışma serisi, rozetler, günlük 1 saatlik yapay zekâ sohbeti ve Geçmiş İşlemler arşivi.'],
      ['Aboneliği bırakırsam ne olur?', 'Otomasyonlar durur. Kendi işine manuel devam edebilir, eski çalışmalarına Geçmiş İşlemler\'den ulaşabilirsin. Yeniden abone olursan otomasyonlar yeniden açılır.'],
      ['Verilerim nerede saklanıyor?', 'Şu an yalnızca bu cihazda. Uygulamayı silersen veriler de gider; bu yüzden Ayarlar\'dan düzenli olarak yedek almanı öneririz.'],
      ['Günlük 1 saatlik sohbet nasıl çalışıyor?', 'Sayaç yalnızca Sohbet ekranı açıkken işler ve her gün yenilenir.']
    ];
    return '<h2>Yardım ve Bilgi</h2><div class="card honest"><b>Önemli uyarı:</b> Pasif Gelirim bir finansal, hukuki veya vergi danışmanlığı değildir. Gelir elde etmek garanti edilmez; kazançlar kişiden kişiye değişir.</div>' +
      '<h3>Sık sorulan sorular</h3>' +
      faq.map(function (q) { return '<details class="card faq"><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>'; }).join('') +
      '<h3>Gizlilik (taslak)</h3><div class="card"><p class="small">Bu test sürümünde girdiğin bilgiler yalnızca cihazında saklanır ve herhangi bir sunucuya gönderilmez. Google Play yayını öncesinde bu metin, uygulamanın gerçek veri kullanımına göre hukuki olarak gözden geçirilip tamamlanacaktır.</p></div>' +
      '<p class="fine">Pasif Gelirim · sürüm ' + esc(Core.APP_VERSION) + ' (test) · DAHA FAZLASI MÜMKÜN.</p>';
  };

  // ---------- Üst çubuk, katman (modal, kalp, bildirim) ----------
  function topHtml(S, ui) {
    const sub = TOP.indexOf(ui.route) === -1;
    const themeIcon = ui.resolvedTheme === 'light' ? 'moon' : 'sun';
    return (sub
      ? '<div class="brandrow"><button class="icon back" data-act="back" aria-label="Geri">' + icon('back', 22) + '</button><b>' + esc(TITLES[ui.route] || '') + '</b></div>'
      : '<div class="brandrow"><img class="brand-logo" src="logo.png" alt=""><b>Pasif Gelirim</b></div>') +
      '<div class="top-r">' +
      '<button class="icon" data-act="toggleTheme" title="Tema" aria-label="Temayı değiştir">' + icon(themeIcon, 20) + '</button>' +
      '<button class="icon" data-act="go" data-route="history" title="Geçmiş İşlemler" aria-label="Geçmiş İşlemler">' + icon('history', 20) + '</button>' +
      '<button class="icon" data-act="go" data-route="settings" title="Ayarlar" aria-label="Ayarlar">' + icon('sliders', 20) + '</button></div>';
  }

  function layerHtml(S, ui) {
    const ent = Core.entitlements(S);
    let html = '';
    if (ui.route === 'task' && !ui.pinMode) {
      const p = Core.activeProject(S);
      const m = p && Core.modelById(p.modelId);
      const t = m && m.tasks.find(function (x) { return x.id === ui.taskId; });
      if (ent.pkg.tier >= 1) html += '<button class="heart" data-act="narrOpen" aria-label="Yapay zekâlı anlatım">💚</button>';
      if (t && ui.narr === 'offer') html += offerModal();
      if (t && ui.narr === 'panel') html += narrationPanel(S, ui, t);
    }
    if (ui.exportText != null) {
      html += '<div class="modal"><div class="sheet"><h3>' + esc(ui.exportTitle || 'Dışa aktarma') + '</h3>' +
        '<p class="muted small">' + esc(ui.exportNote || 'Dosya otomatik kaydedilemedi. Metni kopyalayıp bir not uygulamasına yapıştırabilirsin.') + '</p>' +
        '<textarea id="exportBox" class="inp" rows="8" readonly>' + esc(ui.exportText) + '</textarea>' +
        '<button class="btn" data-act="copyExport">' + icon('copy', 18) + ' Kopyala</button><button class="btn ghost" data-act="closeExport">Kapat</button></div></div>';
    }
    if (ui.toast) html += '<div class="toast" role="status">' + esc(ui.toast) + '</div>';
    return html;
  }

  function parts(S, ui, now) {
    const route = ui.pinMode ? 'lock' : (views[ui.route] ? ui.route : 'home');
    return {
      route: route,
      chrome: NO_CHROME.indexOf(route) === -1,
      activeTab: route === 'task' ? 'tasks' : (route === 'charts' ? 'money' : route),
      top: topHtml(S, ui),
      main: views[route](S, ui, now),
      layer: layerHtml(S, ui)
    };
  }

  return { esc: esc, tl: tl, icon: icon, views: views, parts: parts, catOptions: catOptions, STORAGE_KEY: STORAGE_KEY, TOP: TOP };
});
