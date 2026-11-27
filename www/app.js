/* Pasif Gelirim - arayüz. Görünümler saf fonksiyondur (durum -> HTML), böylece Node'da da test edilir. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./data.js'));
  else root.App = factory(root.Core, root.Data);
})(typeof self !== 'undefined' ? self : this, function (Core, Data) {

  const STORAGE_KEY = 'pasif_gelirim_state_v1';
  const TOP = ['home', 'projects', 'chat', 'tools', 'account'];
  const NO_CHROME = ['welcome', 'onboarding', 'lock'];
  const TITLES = { notes: 'Not Defteri', note: 'Not', task: 'Görev', calc: 'Hesaplayıcı', plans: 'Planlar ve Birikim', market: 'Piyasa', glossary: 'Sözlük', projects: 'Projelerim', project: 'Proje', tasks: 'Görevler', money: 'Kazanç', packages: 'Paketler', charts: 'Grafikler', auto: 'Otomasyon', history: 'Geçmiş İşlemler', memory: 'Proje Hafızası', settings: 'Ayarlar', about: 'Yardım ve Bilgi' };

  // ---------- Çizgi simgeler ----------
  const ICONS = {
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
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
    dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    repeat: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
    dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'
  };
  function icon(name, size) {
    const s = size || 20;
    return '<svg class="i" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }
  const BADGE_ICON = { 'first-task': 'check', 'first-record': 'file', 'first-income': 'trend', 'streak-3': 'flame', 'streak-7': 'flame', 'goal': 'target', 'project': 'trophy' };

  // ---------- Yardımcılar ----------
  function nt(x) { return '<span data-nt>' + esc(x) + '</span>'; }
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
  // Proje ilerlemesi (Aşama 10): yüzde mevcut Core.progress()/projectSummary değerinden gelir; burada yeniden hesaplanmaz.
  function pgm(pct, sub) {
    return '<div class="pgm' + (pct >= 100 ? ' full' : '') + '"><div class="pgm-top"><b class="pgm-pct">%' + pct + '</b><span class="pgm-sub">' + sub + '</span></div>' +
      '<div class="bar pgm-bar"><div class="bar-fill" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div></div>';
  }
  // Görev aşama göstergesi: yalnızca Core.taskStages() çıktısını çizer (görev durumunu değiştirmez).
  function stepper(t, big) {
    const g = Core.taskStages(t); let h = '';
    g.steps.forEach(function (st, i) {
      if (i) h += '<span class="sln' + (g.steps[i - 1].state === 'done' ? ' fill' : '') + '"><b></b></span>';
      h += '<span class="sp ' + st.state + '"><span class="sc">' + (st.state === 'done' ? icon('check', big ? 16 : 14) : st.state === 'stop' ? '!' : st.n) + '</span><span class="sl">' + esc(st.label) + '</span></span>';
    });
    return '<span class="stp' + (big ? ' big' : '') + '" role="img" aria-label="' + g.done + ' / ' + g.total + '">' + h + '</span>';
  }
  function pie3(b) {
    let off = 0, segs = '';
    const live = b.slices.filter(function (x) { return x.amount > 0; }).length;
    b.slices.forEach(function (it, i) {
      if (!(it.amount > 0)) return;
      const p = Math.max(0, it.pct - (live > 1 ? 0.8 : 0));
      segs += '<circle class="seg" cx="21" cy="21" r="15.9155" fill="none" stroke="var(--' + (it.id === 'income' ? 'inc' : it.id === 'other' ? 'oth' : 'mst') + ')" stroke-width="5.2" stroke-dasharray="' + p + ' ' + (100 - p) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 21 21)" style="animation-delay:' + (i * 120) + 'ms"/>';
      off += it.pct;
    });
    return '<svg viewBox="0 0 42 42" class="donut pie3" role="img" aria-label="Gelir, diğer giderler ve mecburi harcamalar dağılımı">' +
      '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--bd)" stroke-width="5.2"/>' + segs +
      (b.empty ? '' : '<text x="21" y="20.6" class="dn-main" text-anchor="middle">' + esc((b.net < 0 ? '−' : b.net > 0 ? '+' : '') + compact(Math.abs(b.net))) + '</text><text x="21" y="25.6" class="dn-sub" text-anchor="middle">Net</text>') + '</svg>';
  }
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
    return (type === 'must' ? Core.CATEGORIES.must : Core.CATEGORIES[type === 'out' ? 'out' : 'in']).map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
  }
  function seg(items, cur, act) {
    return '<div class="segctl" role="group">' + items.map(function (it) {
      return '<button class="segbtn ' + (cur === it.v ? 'on' : '') + '" data-act="' + act + '" data-v="' + esc(it.v) + '">' + esc(it.t) + '</button>';
    }).join('') + '</div>';
  }
  function avatar(S, cls, tag) {
    const u = S.user, init = esc((u.name || 'S').trim().charAt(0).toLocaleUpperCase('tr-TR') || 'S');
    const inner = u.avatar ? '<img class="av ' + (cls || '') + '" src="' + esc(u.avatar) + '" alt="Profil fotoğrafı">' : '<span class="av ' + (cls || '') + '" aria-hidden="true" data-nt>' + init + '</span>';
    return tag === 'btn' ? '<button class="avbtn" data-act="go" data-route="settings" aria-label="Profil ve ayarlar">' + inner + '</button>' : inner;
  }
  const SWATCH = { green: ['#2fdc77', 'Yeşil'], blue: ['#4aa8ff', 'Mavi'], purple: ['#a78bfa', 'Mor'], orange: ['#ff9f43', 'Turuncu'], pink: ['#ff6fae', 'Pembe'], teal: ['#2dd4d4', 'Turkuaz'] };
  function toggleRow(label, key, on) {
    return '<div class="togrow"><span>' + esc(label) + '</span>' + seg([{ v: 'on', t: 'Açık' }, { v: 'off', t: 'Kapalı' }], on ? 'on' : 'off', key) + '</div>';
  }
  function rowLink(ic, title, sub, act, extra) {
    return '<button class="rowlink" data-act="' + act + '"' + (extra || '') + '><span class="rl-ic">' + icon(ic, 20) + '</span><span class="rl-tx"><b>' + esc(title) + '</b>' +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + icon('chevron', 18) + '</button>';
  }

  // ---------- SVG grafikler ----------
  const CW = 340, CH = 200, CL = 40, CR = 8, CT = 10, CB = 26;
  const PW = CW - CL - CR, PH = CH - CT - CB;

  // Parmakla gezdirme: her grafik noktası x/y (viewBox), başlık ve satırlarla işaretlenir; main.js çizgi + ipucu gösterir.
  function scrubAttr(pts) { return ' data-scrub="' + esc(JSON.stringify(pts)) + '"'; }

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
    const sp = [];
    series.buckets.forEach(function (b, i) {
      const cx = CL + bw * (i + 0.5);
      sp.push({ x: +cx.toFixed(1), l: b.full, r: [['Gelir', tl(b.in), 'in'], ['Gider', tl(b.out), 'out'], ['Net', signed(b.in - b.out)]] });
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
    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="chart" role="img" aria-label="Gelir ve gider sütun grafiği"' + scrubAttr(sp) + '>' + g + '</svg>';
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
    const sp = [];
    series.buckets.forEach(function (b, i) {
      sp.push({ x: +x(i).toFixed(1), y: +y(b.cum).toFixed(1), l: b.full, r: [['Birikimli net', tl(b.cum)], ['Dönem neti', signed(b.in - b.out)]] });
      if (i % step === 0) g += '<text class="ax" x="' + x(i) + '" y="' + (CH - 8) + '" text-anchor="middle">' + esc(b.label) + '</text>';
      if (i === sel) g += '<line class="selline" x1="' + x(i) + '" x2="' + x(i) + '" y1="' + CT + '" y2="' + (CT + PH) + '"/>';
      if (i === sel || i === n - 1) g += '<circle class="dot" cx="' + x(i) + '" cy="' + y(b.cum) + '" r="' + (i === sel ? 4.5 : 3) + '"/>';
      g += '<rect class="hit" data-act="chartPick" data-i="' + i + '" x="' + (CL + bw * i) + '" y="' + CT + '" width="' + bw + '" height="' + PH + '"/>';
    });
    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="chart" role="img" aria-label="Birikimli net çizgi grafiği"' + scrubAttr(sp) + '>' + g + '</svg>';
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
  const CAT_ICON = { satis: 'cart', hizmet: 'wallet', ortaklik: 'megaphone', arac: 'tag', reklam: 'megaphone', malzeme: 'box', diger: 'dots', kira: 'box', fatura: 'tag', zorunlu: 'wallet', mdiger: 'dots' };

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
      '<div class="card"><p>Burada sana garanti kazanç vaat etmiyoruz. Kendi dijital işini adım adım kurmana, gerçek rakamlarını takip etmene ve ilerlemeni görmene yardımcı oluyoruz.</p>' +
      '<p class="muted">Kurduğun iş ve verilerin sana aittir.</p></div>' +
      '<label class="lbl" for="nameInput">Sana nasıl hitap edelim?</label>' +
      '<input id="nameInput" class="inp" maxlength="30" placeholder="Adın" value="' + esc(S.user.name) + '">' +
      '<label class="lbl" for="langSel">Dil</label>' + langSelect(S) + '<label class="lbl" for="curSel">Para birimi</label>' + currencySelect(S) +
      '<p class="muted small">Dil ve para birimini sonra Ayarlar\'dan değiştirebilirsin.</p>' +
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
    const look = S.settings.look;
    let html = '<div class="hello"><div class="hello-l">' + avatar(S, '', 'btn') + '<h2>Merhaba' + (S.user.name ? ' ' + nt(S.user.name) : '') + '</h2></div><span class="chip">' + esc(ent.pkg.name) + ' paketi</span></div>';
    html += '<button class="card hero" data-act="go" data-route="charts"><small>Toplam net</small><div class="hero-num ' + (fs.net < 0 ? 'neg' : '') + '">' + tl(fs.net) + '</div>' +
      '<span class="trend ' + (ins.thisMonth.net > 0 ? 'up' : ins.thisMonth.net < 0 ? 'down' : 'flat') + '">' + (ins.thisMonth.net > 0 ? '▲ ' : ins.thisMonth.net < 0 ? '▼ ' : '') + 'Bu ay ' + signed(ins.thisMonth.net) + '</span>' +
      (m30.empty ? '<p class="muted small hero-empty">İlk kaydını girince grafik burada çizilir.</p>' : heroChart(m30)) + '</button>';
    html += '<div class="grid2 pair"><div class="card stat2"><small>Aylık gelir</small><b>' + tl(ins.thisMonth.in) + '</b>' + chg(ins.thisMonth.in, ins.lastMonth.in, true) + '</div>' +
      '<div class="card stat2"><small>Aylık gider</small><b>' + tl(ins.thisMonth.out) + '</b>' + chg(ins.thisMonth.out, ins.lastMonth.out, false) + '</div></div>';
    const sp = Core.categorySplit(S, 'out', '30d', now);
    if (look.home.spend) html += '<div class="card spend"><div class="row"><b>Harcamalarım</b><span class="muted small">Son 30 gün</span></div>' +
      (sp.total > 0
        ? '<div class="donut-row">' + donut(sp.items, Math.round(sp.total).toLocaleString('tr-TR'), 'TL harcama') +
          '<ul class="legend spendlg">' + sp.items.map(function (it, i) { return '<li><i style="background:var(--c' + (i % 4) + ')"></i><span class="nm">' + esc(it.name) + '<small>' + tl(it.amount) + '</small></span><b>%' + Math.round(it.pct) + '</b></li>'; }).join('') + '</ul></div>'
        : '<p class="muted small">Gider kaydı ekledikçe harcamalarının dağılımı burada yüzdelerle görünür.</p>') + '</div>';
    const recent = S.finance.slice().sort(function (a, b) { return b.date - a.date || (b.at || 0) - (a.at || 0); }).slice(0, 4);
    html += '<div class="row sect"><h3>Son işlemler</h3><button class="link" data-act="go" data-route="money">Tümü ›</button></div>';
    if (!recent.length) html += '<div class="card muted small">Henüz işlem yok. Aşağıdaki düğmelerle ilk geliri veya gideri ekleyebilirsin.</div>';
    else html += '<div class="card nopad txlist">' + recent.map(function (r) {
      return '<div class="tx ' + r.type + '"><span class="tx-ic">' + icon(CAT_ICON[r.cat] || 'dots', 20) + '</span><span class="tx-tx"><b>' + esc(Core.categoryName(r.type, r.cat)) + '</b><small>' + Core.formatDate(r.date) + (r.note ? ' · ' + nt(r.note) : '') + '</small></span><b class="tx-amt">' + (r.type === 'in' ? '+' : '−') + tl(r.amount) + '</b></div>';
    }).join('') + '</div>';
    if (S.cancelledAt && ent.pkg.tier === 0) {
      html += '<div class="card note">Aboneliğin sona erdi. Kurduğun işe manuel devam edebilir, eski çalışmalarına Geçmiş İşlemler\'den ulaşabilirsin.</div>';
    }
    html += '<div class="qa-row"><button class="qa in" data-act="quickAdd" data-v="in">' + icon('plus', 18) + 'Gelir ekle</button><button class="qa out" data-act="quickAdd" data-v="out">' + icon('minus', 18) + 'Gider ekle</button></div>';
    const cl = Core.checklist(S, now);
    if (!cl.complete && look.home.checklist) {
      html += '<div class="card checklist"><div class="row"><b>Başlangıç adımları</b><span class="muted small">' + cl.done + ' / ' + cl.total + '</span></div>' + bar(Math.round(cl.done / cl.total * 100)) +
        cl.items.map(function (it) {
          return '<button class="cl ' + (it.done ? 'done' : '') + '" data-act="go" data-route="' + it.route + '"' + (it.done ? ' tabindex="-1"' : '') + '><span class="cl-ic">' + icon(it.done ? 'check' : 'circle', 18) + '</span><span>' + esc(it.title) + '</span>' + (it.done ? '' : icon('chevron', 16)) + '</button>';
        }).join('') + '</div>';
    }
    if (look.home.streak) html += '<div class="card streak"><div class="row"><div class="sline"><span class="flame ' + (st.current > 0 ? 'on' : '') + '">' + icon('flame', 22) + '</span><b>' + st.current + ' günlük seri</b></div><span class="muted small">En iyi: ' + st.best + '</span></div>' +
      '<p class="muted small">' + (st.activeToday ? 'Bugün de çalıştın, harika.' : (st.current > 0 ? 'Serini korumak için bugün küçük bir adım at.' : 'Bir görev tamamla, kayıt gir veya sohbet et; seri başlasın.')) + '</p>' +
      '<div class="badges">' + Core.badges(S, now).map(function (b) {
        return '<span class="badge ' + (b.earned ? 'on' : '') + '" title="' + esc(b.title + ' — ' + b.desc) + '"><i>' + icon(b.earned ? (BADGE_ICON[b.id] || 'check') : 'lock', 20) + '</i><small>' + esc(b.title) + '</small></span>';
      }).join('') + '</div></div>';
    if (p) {
      const pr = Core.progress(p);
      const nt = Core.nextTask(p);
      html += '<div class="card"><div class="row"><b>' + esc(p.title) + '</b></div>' + pgm(pr.pct, pr.done + ' / ' + pr.total + ' görev tamamlandı') +
        (nt ? '<button class="btn" data-act="openTask" data-id="' + esc(nt.id) + '"><span>Sıradaki:</span> <span>' + esc(nt.title) + '</span></button>'
            : '<p>Tüm görevleri tamamladın. Şimdi sonuçlarını takip etme zamanı.</p>') + '</div>';
    } else if (ent.selectModel) {
      html += '<div class="card"><b>Henüz bir gelir modeli seçmedin.</b><p class="muted">Birkaç kısa soruyla sana uygun olanı bulalım.</p>' +
        '<button class="btn" data-act="go" data-route="tasks">Gelir modelimi seç</button></div>';
    } else {
      html += lock('Gelir modeli seçmek ve görev listesini kullanmak için Manuel paket gerekir.', 'Paketlere bak', 'packages');
    }
    html += '<div class="grid2">' +
      '<button class="tile" data-act="go" data-route="projects"><span class="ti">' + icon('layers', 20) + '</span><b>Projelerim</b><small>' + Core.liveProjects(S).length + ' / ' + Core.MAX_PROJECTS + ' proje</small></button>' +
      '<button class="tile" data-act="go" data-route="chat"><span class="ti">' + icon('chat', 20) + '</span><b>AI Sohbet</b><small>Bugün kalan: ' + Core.formatDuration(left) + '</small></button>' +
      '<button class="tile" data-act="go" data-route="money"><span class="ti">' + icon('trend', 20) + '</span><b>Kazanç</b><small>' + tl(Core.financeSummary(S, now).net) + ' net</small></button>' +
      '<button class="tile" data-act="go" data-route="auto"><span class="ti">' + icon('zap', 20) + '</span><b>Otomasyon</b><small>' + (ent.automation ? 'Açık' : 'Ücretli paket') + '</small></button>' +
      '<button class="tile" data-act="go" data-route="history"><span class="ti">' + icon('history', 20) + '</span><b>Geçmiş İşlemler</b><small>Eski çalışmaların</small></button>' +
      '<button class="tile" data-act="go" data-route="market"><span class="ti">' + icon('dollar', 20) + '</span><b>Piyasa</b><small>Dolar, altın, kripto</small></button>' +
      '<button class="tile" data-act="go" data-route="plans"><span class="ti">' + icon('repeat', 20) + '</span><b>Planlar</b><small>Tekrarlayan, birikim</small></button>' +
      '<button class="tile" data-act="go" data-route="calc"><span class="ti">' + icon('calc', 20) + '</span><b>Hesaplayıcı</b><small>Hedefe kaç satış?</small></button>' +
      '<button class="tile" data-act="go" data-route="glossary"><span class="ti">' + icon('book', 20) + '</span><b>Sözlük</b><small>Terimleri öğren</small></button>' +
      '</div>';
    html += '<p class="fine">Pasif Gelirim hiçbir gelir garantisi vermez. Gerçek sonuçlar kişiden kişiye değişir.</p>';
    return html;
  };

  function factsHtml(m) {
    const f = m.facts; if (!f) return '';
    return '<dl class="facts"><div><dt>Başlangıç maliyeti</dt><dd>' + esc(f.cost) + '</dd></div><div><dt>Zorluk</dt><dd>' + esc(f.difficulty) + '</dd></div>' +
      '<div><dt>Gereken beceriler</dt><dd>' + f.skills.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join(', ') + '</dd></div>' +
      '<div><dt>Risk</dt><dd>' + esc(f.risk) + '</dd></div></dl>';
  }
  function stageTag(st) {
    if (!st || st.done) return '';
    if (st.understood) return '<small class="stg">Anladım</small>';
    if (st.read) return '<small class="stg">Okudum</small>';
    return '';
  }
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
    let html = '<h2>' + esc(p.title) + '</h2>' + pgm(pr.pct, pr.done + ' / ' + pr.total + ' tamamlandı');
    if (!ent.selectModel) html += '<div class="card note">Aboneliğin aktif değil; bu işe manuel devam edebilirsin. Yeni model seçmek için paket gerekir.</div>';
    html += '<div class="card honest"><b>Dürüst not:</b> ' + esc(m.honest) + '</div>';
    html += '<ul class="list">';
    m.tasks.forEach(function (t, i) {
      const done = p.tasks[t.id] && p.tasks[t.id].done;
      html += '<li><button class="task ' + (done ? 'done' : '') + '" data-act="openTask" data-id="' + esc(t.id) + '">' +
        '<span class="chk">' + (done ? icon('check', 16) : (i + 1)) + '</span><span>' + esc(t.title) + '</span>' + stageTag(p.tasks[t.id]) + '</button></li>';
    });
    html += '</ul>';
    html += '<button class="link" data-act="go" data-route="projects">Projelerim (' + Core.liveProjects(S).length + ' / ' + Core.MAX_PROJECTS + ')</button>';
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
    const all = Core.recommend(q.answers);
    const rec = all.filter(function (r) { return !r.blocked; }).slice(0, 3), blocked = all.filter(function (r) { return r.blocked; });
    let h = '<h2>Sana uygun modeller</h2><p class="muted">Cevaplarına göre sıraladık. Bu bir tahmindir, garanti değildir.</p>';
    if (!Core.canStartProject(S)) h += '<div class="card note">En fazla ' + Core.MAX_PROJECTS + ' proje oluşturabilirsin. Yeni model seçmeden önce Projelerim bölümünden birini tamamla.</div>';
    rec.forEach(function (r, i) {
      h += '<div class="card"><div class="row"><b>' + esc(r.model.title) + '</b>' + (i === 0 ? '<span class="chip">En uygun</span>' : '') + '</div>' +
        '<p>' + esc(r.model.summary) + '</p>' + factsHtml(r.model) +
        (r.reasons.length ? '<p class="muted">' + r.reasons.map(function (x) { const m = /^"(.*)" cevabınla iyi uyuşuyor$/.exec(x); return m ? '"<span>' + esc(m[1]) + '</span>" <span>cevabınla iyi uyuşuyor</span>' : '<span>' + esc(x) + '</span>'; }).join(' • ') + '</p>' : '') +
        '<p class="honest-line">' + esc(r.model.honest) + '</p>' +
        '<button class="btn" data-act="pickModel" data-id="' + esc(r.model.id) + '">Bunu seç</button></div>';
    });
    if (blocked.length) {
      h += '<h3>Şimdilik önerilmeyenler</h3>';
      blocked.forEach(function (r) {
        h += '<div class="card off"><b>' + esc(r.model.title) + '</b>' + factsHtml(r.model) + '<p class="muted">' + esc(r.blockReason) + '</p></div>';
      });
    }
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
      '<div class="stages" role="group" aria-label="İlerleme">' +
        '<button class="stg-btn' + (st.read ? ' on' : '') + '" data-act="stage" data-stage="read" data-id="' + esc(t.id) + '" aria-pressed="' + (st.read ? 'true' : 'false') + '">' + icon('check', 14) + ' Okudum</button>' +
        '<button class="stg-btn' + (st.understood ? ' on' : '') + '" data-act="stage" data-stage="understood" data-id="' + esc(t.id) + '" aria-pressed="' + (st.understood ? 'true' : 'false') + '">' + icon('check', 14) + ' Anladım</button></div>' +
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
      (ui.narrAnswer ? '<div class="card" data-nt>' + nl2br(ui.narrAnswer) + '</div>' : '') +
      '<button class="link" data-act="narrClose">Kapat</button></div></div>';
  }

  function memKindLabel(k) { return Core.MEMORY_KINDS[k] || k; }
  function pendCard(p, pe) {
    return '<div class="card memsug"><p class="small"><b>Hafızaya kaydedeyim mi?</b> <span class="chip">' + esc(memKindLabel(pe.kind)) + '</span></p>' +
      '<p data-nt>' + esc(pe.text) + '</p>' +
      '<div class="row wrap"><button class="btn slim" data-act="memConfirm" data-id="' + esc(pe.id) + '">Kaydet</button>' +
      '<button class="btn slim ghost" data-act="memDismiss" data-id="' + esc(pe.id) + '">Kaydetme</button></div></div>';
  }
  // NORA logosu: siyah zemin, neon yeşil halka ve parıltı (aydınlık temada da okunur; ağır efekt yok)
  function noraLogo(size) {
    return '<svg class="nora-logo" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" role="img" aria-label="NORA"><circle cx="24" cy="24" r="21" fill="#050805" stroke="#39ff88" stroke-width="2.5"/><path d="M15 33V15l18 18V15" fill="none" stroke="#39ff88" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  views.chat = function (S, ui, now) {
    const left = Core.remainingSeconds(S, now);
    const cp = Core.chatProject(S), live = Core.liveProjects(S).length > 0;
    const msgs = Core.chatFor(S);
    const nst = Core.noraStatus(S), nac = Core.noraAccess(S);
    let html = '<div class="nora-head">' + noraLogo(46) + '<div><h2 class="nora-name">NORA</h2><p class="nora-slogan">' + esc(Core.NORA.slogan) + '</p></div></div>' +
      '<div class="row"><span class="chip">Bugün kalan: <b id="timeLeft">' + Core.formatDuration(left) + '</b></span></div>';
    if (!nac.allowed) return html + lock('NORA bu pakette açık değil.', 'Paketlere bak', 'packages');
    // Hangi projenin sohbetinde olduğun her zaman görünür
    if (live) html += seg([{ v: 'project', t: 'Proje sohbeti' }, { v: 'general', t: 'Genel sohbet' }], cp ? 'project' : 'general', 'chatScope');
    html += '<div class="card memhead">' + (cp
      ? '<div class="row"><span><span class="muted small">Konuştuğun proje</span><br><b class="ptitle">' + esc(cp.title) + '</b></span><button class="btn slim ghost" data-act="go" data-route="memory">Hafıza (' + nst.memory + ')</button></div>' +
        '<div class="row wrap nora-links"><button class="btn slim" data-act="go" data-route="work">Görev Merkezi</button><button class="btn slim ghost" data-act="go" data-route="notes">Not Defteri</button><span class="chip ' + (nst.waiting ? 'warn' : '') + '">' + (nst.waiting ? nst.waiting + ' onay bekliyor' : nst.open + ' açık görev') + '</span></div>' +
        '<p class="fine">Bu sohbet ve hafıza yalnızca bu projeye aittir; başka projelerin bilgisi karışmaz. Bilgiler cihazında tutulur.' +
        (ui.live ? (S.settings.aiShareMemory ? ' Proje özetin, yanıt hazırlanırken yapay zekâ sunucusuna gönderilir (Hafıza ekranından kapatabilirsin).' : ' Proje özetin sunucuya gönderilmez.') : '') + '</p>'
      : '<b>Genel sohbet</b><p class="fine">' + (live ? 'Hiçbir projenin hafızası veya verisi kullanılmıyor. Bir projenin bağlamıyla konuşmak için "Proje sohbeti"ni seç.' : 'Henüz projen yok; sohbet genel. Proje başlatınca ona özel hafıza ve sohbet açılır.') + '</p><div class="row wrap nora-links"><button class="btn slim ghost" data-act="go" data-route="notes">Not Defteri</button></div>') + '</div>';
    // Modelin gerçekten bağlı olup olmadığı her zaman açıkça yazılır
    const ai = ui.ai || { state: 'demo', model: '' };
    html += '<div class="aistat">' + (ui.live
      ? '<span class="chip ok">Gerçek yapay zekâ bağlı</span>' + (ai.model ? ' <span class="muted small" data-nt>' + esc(ai.model) + '</span>' : '')
      : ai.state === 'ready' ? '<span class="chip warn">Demo yapay zekâ</span> <span class="muted small">Gerçek model hazır; sen açınca kullanılır.</span>'
      : ai.state === 'unconfigured' ? '<span class="chip warn">Demo yapay zekâ</span> <span class="muted small">Sunucu henüz yapılandırılmamış.</span>'
      : ai.state === 'offline' ? '<span class="chip warn">Demo yapay zekâ</span> <span class="muted small">Sunucuya ulaşılamıyor.</span> <button class="link" data-act="aiRecheck">Tekrar dene</button>'
      : ai.state === 'checking' ? '<span class="chip">Sunucu denetleniyor...</span>'
      : '<span class="chip warn">Demo yapay zekâ</span> <span class="muted small">Gerçek model bağlı değil.</span>') + '</div>';
    if (ai.state === 'ready' && !ui.live && !ui.consentHidden) {
      html += '<div class="card note"><b>Gerçek yapay zekâyı açmak ister misin?</b>' +
        '<p class="small">Açarsan yazdığın mesajlar, yanıt üretmesi için ücretli bir dış yapay zekâ servisine gönderilir. Servis kullanım başına ücretlidir ve sunucuda günlük kullanım sınırı vardır. Gelir-gider kayıtların, PIN ve şifren hiçbir zaman gönderilmez. Proje özetin yalnızca Hafıza ekranında izin verirsen gider. İstediğin an kapatabilirsin.</p>' +
        '<div class="row wrap"><button class="btn slim" data-act="aiConsentOn">Gerçek yapay zekâyı aç</button><button class="btn slim ghost" data-act="aiConsentLater">Demo ile devam</button></div></div>';
    }
    html += (ui.live
      ? '<p class="fine">Yanıtlar yapay zekâdan gelir; hata yapabilir ve yatırım, vergi veya hukuk tavsiyesi değildir. Kişisel bilgi (şifre, kart no) yazma. <button class="link" data-act="aiConsentOff">Gerçek yapay zekâyı kapat</button></p>'
      : '<p class="fine">Şu an demo yapay zekâ çalışıyor: kurallara göre terimleri açıklar, projenin özetini ve ilerlemeni söyler. Gerçek bir yapay zekâ modeli henüz bağlı değil.</p>') + '<div class="chat" id="chatBox">';
    if (!msgs.length) html += '<div class="msg ai"><span class="who">NORA</span>Merhaba, ben NORA! Anlamadığın bir terimi veya görevi yaz; bir hedefin varsa "…geliştirmek istiyorum" diye yaz, Görev Merkezi için plan taslağı hazırlayayım.</div>';
    msgs.slice(-40).forEach(function (m) {
      html += '<div class="msg ' + (m.role === 'user' ? 'me" data-nt="1' : 'ai') + '">' + (m.role !== 'user' ? '<span class="who">NORA</span>' : '') + nl2br(m.text) +
        (m.role !== 'user' && m.src === 'demo' ? '<small class="srcl">Demo yanıt</small>' : '') + (m.role !== 'user' && m.src === 'ai' ? '<small class="srcl">Yapay zekâ yanıtı</small>' : '') + '</div>';
      if (m.plan && cp) { const pl = Core.plansOf(S, cp.id).find(function (x) { return x.id === m.plan; }); if (pl) html += planCard(S, cp, pl, false); }
    });
    if (ui.typing) html += '<div class="msg ai typing" aria-label="Yazıyor"><i></i><i></i><i></i></div>';
    html += '</div>';
    if (ui.failed && !ui.busy && (ui.failed === '*' ? !cp : (cp && cp.id === ui.failed))) html += '<div class="card note"><b>Yanıt alınamadı.</b><p class="small">Mesajın duruyor; tekrar deneyebilirsin.</p><button class="btn slim" data-act="retryChat">Yeniden dene</button></div>';
    if (cp) Core.memOf(cp).pending.forEach(function (pe) { html += pendCard(cp, pe); });
    Core.notePendingFor(S, cp ? cp.id : '').forEach(function (pe) { html += notePendCard(S, pe); });
    html += '<p class="fine">NORA erişimi: bu test sürümünde tüm paketlerde açık. İleride ücretli paketle kontrol edilecek; şu an gerçek bir abonelik veya ödeme yoktur.</p>';
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

  views.memory = function (S, ui, now) {
    const p = Core.activeProject(S);
    if (!p || Core.isArchived(p)) return lock('Hafıza bir projeye aittir. Önce bir proje seç veya başlat.', 'Projelere git', 'projects');
    const m = Core.memOf(p), ctx = Core.projectContext(S, p.id), id = esc(p.id);
    let h = '<div class="row"><h2 class="ptitle">' + esc(p.title) + '</h2><span class="chip">Aktif proje</span></div>' +
      '<div class="card note"><b>Hafıza nerede tutulur?</b><p class="small">Burada yazanlar yalnızca bu cihazda, bu projenin içinde saklanır ve JSON yedeğine girer. Başka projelerle karışmaz. Yapay zekâ konuştuğun her cümleyi saklamaz: kalıcı bilgi ancak sen "Kaydet" dersen veya kendin eklersen girer.</p></div>';
    h += '<div class="card"><b>Yapay zekâ sunucusuyla paylaşım</b>' +
      toggleRow('Sohbette bu projenin özetini sunucuya gönder', 'aiShare', S.settings.aiShareMemory) +
      '<p class="fine">' + (ui.live ? 'Açıkken, bu projedeki sohbetlerde aşağıdaki özet (serbest notların ve gelir-gider kayıtların hariç) yanıt hazırlanırken sunucuya gidebilir. Kapalıyken hiçbir şey gitmez.' : (ui.ai && ui.ai.state === 'ready' ? 'Gerçek yapay zekâyı henüz sen açmadığın için kullanılmıyor; hiçbir şey dışarı gönderilmiyor. Bu ayar, gerçek yapay zekâyı açarsan geçerli olur.' : 'Şu an gerçek bir yapay zekâ sunucusu bağlı değil; hiçbir şey dışarı gönderilmiyor. Bu ayar, sunucu bağlanırsa geçerli olur.')) + '</p></div>';
    h += '<div class="card"><b>Projeden hesaplananlar</b><p class="fine">Bunlar kaydedilmez; her seferinde projenin güncel durumundan hesaplanır, bu yüzden eskimez.</p>' +
      '<div class="irow"><span>Görev ilerlemesi</span><b>' + ctx.progress.done + ' / ' + ctx.progress.total + '</b></div>' +
      (ctx.model ? '<div class="irow"><span>Gelir modeli</span><b>' + esc(ctx.model) + '</b></div>' : '') +
      (ctx.nextTask ? '<div class="irow"><span>Sıradaki görev</span><b>' + esc(ctx.nextTask) + '</b></div>' : '') + '</div>';
    if (m.pending.length) {
      h += '<div class="card"><b>Onay bekleyen öneriler</b><p class="fine">Sohbette yazdıkların önemli görünüyordu. Sen onaylamazsan saklanmaz.</p></div>';
      m.pending.forEach(function (pe) { h += pendCard(p, pe); });
    }
    h += '<div class="card"><div class="row"><b>Kayıtlı bilgiler</b><span class="muted small">' + m.items.length + ' / ' + Core.MEMORY_LIMITS.items + '</span></div>';
    if (!m.items.length) h += '<p class="muted small">Henüz kayıtlı bilgi yok. Aşağıdan kendin ekleyebilir ya da sohbette önemli bir kararını yazınca çıkan öneriyi onaylayabilirsin.</p>';
    else {
      h += '<ul class="list memlist">';
      m.items.slice().sort(function (a, b) { return (a.old - b.old) || (b.at - a.at); }).forEach(function (it) {
        const iid = esc(it.id);
        h += '<li class="mem' + (it.old ? ' old' : '') + '">';
        if (ui.memEdit === it.id) {
          h += '<input id="memEditText" class="inp" maxlength="' + Core.MEMORY_LIMITS.text + '" value="' + esc(it.text) + '">' +
            '<div class="row wrap"><button class="btn slim" data-act="memEditSave" data-id="' + iid + '">Kaydet</button><button class="btn slim ghost" data-act="memEditCancel">Vazgeç</button></div>';
        } else {
          h += '<div class="row"><span class="chip">' + esc(memKindLabel(it.kind)) + '</span>' + (it.old ? '<span class="chip warn">Eski</span>' : '') + '<span class="muted small">' + (it.by === 'chat' ? 'sohbetten onaylandı' : 'sen ekledin') + '</span></div>' +
            '<p data-nt>' + esc(it.text) + '</p>' +
            '<div class="row wrap"><button class="btn slim ghost" data-act="memEdit" data-id="' + iid + '">Düzenle</button>' +
            '<button class="btn slim ghost" data-act="memOld" data-id="' + iid + '">' + (it.old ? 'Güncel yap' : 'Eski say') + '</button>' +
            '<button class="btn slim ghost danger" data-act="memDel" data-id="' + iid + '">Sil</button></div>';
        }
        h += '</li>';
      });
      h += '</ul><p class="fine">"Eski" saydığın bilgi silinmez ama yapay zekâ bağlamında kullanılmaz; çelişen bilgileri böyle ayırabilirsin. "Son nokta" türünden tek bilgi tutulur; yenisini ekleyince eskisi yerini bırakır.</p>';
    }
    h += '</div>';
    h += '<div class="card"><b>Bilgi ekle</b>' +
      '<label class="lbl" for="memKind">Tür</label><select id="memKind" class="inp">' + Object.keys(Core.MEMORY_KINDS).map(function (k) { return '<option value="' + k + '">' + esc(Core.MEMORY_KINDS[k]) + '</option>'; }).join('') + '</select>' +
      '<label class="lbl" for="memText">Bilgi</label><div class="send"><input id="memText" class="inp" maxlength="' + Core.MEMORY_LIMITS.text + '" placeholder="Örn: Önce Instagram ile başlamaya karar verdim"><button class="btn" data-act="memAdd">Ekle</button></div>' +
      '<p class="fine">Şifre, PIN, kart/IBAN ve kimlik numarası gibi hassas bilgiler kaydedilmez.</p></div>';
    h += '<div class="card"><b>Hafızayı temizle</b><p class="fine">Yalnızca bu projenin kayıtlı bilgilerini ve onay bekleyen önerilerini siler. Görevler, notlar, gelir-gider kayıtları ve sohbet geçmişi silinmez. Onay istenir.</p>' +
      '<button class="btn ghost danger" data-act="memClear"' + (m.items.length + m.pending.length ? '' : ' disabled') + '>Bu projenin hafızasını temizle</button></div>';
    h += '<p class="fine">Hafıza, "Geçmiş İşlemler"den farklıdır: Geçmiş İşlemler yaptığın çalışmaların arşividir ve yapay zekâya talimat olarak verilmez.</p>';
    return h;
  };

  views.money = function (S, ui, now) {
    const f = Core.financeSummary(S, now);
    const gp = Core.goalProgress(S, now);
    const type = ui.finType === 'out' || ui.finType === 'must' ? ui.finType : 'in';
    const today = Core.dateInputValue(now);
    const ed = ui.editId ? S.finance.find(function (r) { return r.id === ui.editId; }) : null;
    let html = '<h2>Kazanç</h2>';
    // Gelir hedefi: pastadan bağımsız kart. Yalnızca gerçekleşen gelirden hesaplanır (giderler katılmaz).
    if (gp.target > 0) {
      html += '<div class="card goalc' + (gp.over ? ' over' : gp.reached ? ' hit' : '') + '"><div class="row"><b>Aylık gelir hedefi</b><span class="chip">Bu ay</span></div>' +
        '<div class="goalc-pct"><b>%' + gp.rawPct + '</b><span class="muted small">hedefe ulaşma</span></div>' +
        '<div class="bar goalc-bar"><div class="bar-fill" style="width:' + Math.min(100, gp.rawPct) + '%"></div></div>' +
        '<div class="goalc-st"><div class="irow"><span>Hedef</span><b>' + tl(gp.target) + '</b></div><div class="irow"><span>Gerçekleşen</span><b class="pos">' + tl(gp.got) + '</b></div>' +
        '<div class="irow"><span>' + (gp.over ? 'Aşan' : 'Kalan') + '</span><b>' + tl(gp.over ? gp.over : gp.left) + '</b></div></div>' +
        (gp.over ? '<p class="small pos">Hedefi aştın. Gerçek oran %' + gp.rawPct + '; çubuk görsel olarak %100\'de durur.</p>' : gp.reached ? '<p class="small pos">Hedefe ulaştın, tebrikler.</p>' : '') +
        '<details><summary class="link">Hedefi değiştir</summary><div class="send"><input id="goalInput" class="inp" inputmode="decimal" placeholder="Yeni hedef (TL)"><button class="btn" data-act="saveGoal">Kaydet</button></div></details></div>';
    } else {
      html += '<div class="card goalc"><b>Aylık gelir hedefi</b><p class="muted small">Gerçekçi bir hedef koy; ilerlemeni burada izle. Hedef bir garanti değildir.</p>' +
        '<div class="send"><input id="goalInput" class="inp" inputmode="decimal" placeholder="Örn: 2500"><button class="btn" data-act="saveGoal">Kaydet</button></div></div>';
    }
    // Gelir – diğer giderler – mecburi harcamalar: üç dilimli pasta (gerçek kayıtlardan)
    const pp = ui.pieP === '30d' || ui.pieP === '12m' ? ui.pieP : 'month', pb = Core.financeBreakdown(S, pp, now);
    html += '<div class="card pie3c"><div class="row"><b>Gelir ve gider dağılımı</b></div>' + seg([{ v: 'month', t: 'Bu ay' }, { v: '30d', t: '30 gün' }, { v: '12m', t: '12 ay' }], pp, 'pieP');
    if (pb.empty) html += '<div class="pie-empty">' + pie3(pb) + '<p class="muted small">Bu dönemde kayıt yok. Gelir, diğer gider veya mecburi harcama ekledikçe grafik gerçek verinle çizilir.</p></div>';
    else html += '<div class="donut-row">' + pie3(pb) + '<ul class="legend pl3">' + pb.slices.map(function (it) {
      const c = it.id === 'income' ? 'inc' : it.id === 'other' ? 'oth' : 'mst';
      return '<li class="pl-' + it.id + '"><i style="background:var(--' + c + ')"></i><span class="nm">' + esc(it.name) + '<small>' + tl(it.amount) + '</small></span><b>%' + Math.round(it.pct) + '</b></li>';
    }).join('') + '</ul></div>' +
      '<div class="irow"><span>Toplam gider</span><b>' + tl(pb.totalOut) + '</b></div><div class="irow"><span>Net kazanç</span><b class="' + (pb.net < 0 ? 'neg' : 'pos') + '">' + signed(pb.net) + '</b></div>' +
      '<p class="fine">Mecburi harcamalar diğer giderlere ikinci kez eklenmez; her kayıt yalnızca bir dilimdedir.</p>';
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
    html += '<div class="card' + (ed ? ' editing' : '') + '" id="finForm"><div class="row"><b>' + (ed ? 'Kaydı düzenle' : 'Yeni kayıt') + '</b>' + (ed ? '<button class="link" data-act="cancelEdit">Vazgeç</button>' : '') + '</div>' + seg([{ v: 'in', t: 'Gelir' }, { v: 'out', t: 'Diğer gider' }, { v: 'must', t: 'Mecburi harcama' }], type, 'finType') +
      '<label class="lbl" for="finAmount">Tutar (TL)</label><input id="finAmount" class="inp" inputmode="decimal" placeholder="0,00"' + (ed ? ' value="' + esc(String(ed.amount).replace('.', ',')) + '"' : '') + '>' +
      '<div class="two"><div><label class="lbl" for="finCat">Kategori</label><select id="finCat" class="inp">' + catOptions(type, ed && ed.cat) + '</select></div>' +
      '<div><label class="lbl" for="finDate">Tarih</label><input id="finDate" type="date" class="inp" value="' + (ed ? Core.dateInputValue(ed.date) : today) + '" max="' + today + '"></div></div>' +
      '<label class="lbl" for="finNote">Not</label><input id="finNote" class="inp" maxlength="120" placeholder="Örn: ilk satış"' + (ed ? ' value="' + esc(ed.note) + '"' : '') + '>' +
      (S.projects.length ? '<label class="lbl" for="finSrc">Hangi iş için?</label><select id="finSrc" class="inp"><option value="">Genel</option>' + S.projects.filter(function (q) { return !Core.isArchived(q) || (ed && ed.src === q.id); }).map(function (q) { return '<option value="' + esc(q.id) + '"' + ((ed ? ed.src === q.id : q.id === S.activeProjectId) ? ' selected' : '') + '>' + esc(q.title) + (Core.isArchived(q) ? ' (arşivde)' : '') + '</option>'; }).join('') + '</select>' : '') +
      '<button class="btn" data-act="addFin">' + (ed ? 'Güncelle' : 'Kaydet') + '</button></div>' +
      '<p class="fine">Gerçek rakamlarını yaz. Amaç kendini kandırmadan ilerlemeyi görmek. Kira, fatura ve zorunlu ödemeleri <b>Mecburi harcama</b> olarak gir; eski giderlerin “Diğer gider” olarak durur, istersen düzenleyip türünü değiştirebilirsin.</p>';
    const flt = ui.finFilter || 'all';
    if (S.finance.length > 4) html += '<div class="searchbox">' + icon('search', 18) + '<input id="finSearch" class="inp" type="search" placeholder="Kayıtlarda ara (not, kategori)" autocomplete="off"></div>';
    html += '<div class="row"><h3>Kayıtlar</h3>' + seg([{ v: 'all', t: 'Tümü' }, { v: 'in', t: 'Gelir' }, { v: 'out', t: 'Gider' }, { v: 'must', t: 'Mecburi' }], flt, 'finFilter') + '</div><ul class="list">';
    const rows = S.finance.slice().sort(function (a, b) { return b.date - a.date || (b.at || 0) - (a.at || 0); })
      .filter(function (r) { return flt === 'all' || (flt === 'must' ? Core.kindOf(r) === 'must' : r.type === flt); });
    if (!rows.length) html += '<li class="card muted">' + (S.finance.length ? 'Bu filtrede kayıt yok.' : 'Henüz kayıt yok. İlk kaydını yukarıdan ekleyebilirsin.') + '</li>';
    rows.forEach(function (r) {
      html += '<li class="fin ' + r.type + '" data-q="' + esc((Core.categoryName(r.type, r.cat) + ' ' + r.note).toLocaleLowerCase('tr')) + '"><span>' + Core.formatDate(r.date) + ' · <span>' + esc(Core.categoryName(r.type, r.cat)) + '</span>' + (r.kind === 'must' ? ' <span class="chip mute">Mecburi</span>' : '') + (r.note ? '<br><small class="muted">' + nt(r.note) + '</small>' : '') + (r.auto ? '<br><small class="muted">otomatik · tekrarlayan</small>' : '') + '</span>' +
        '<b>' + (r.type === 'in' ? '+' : '−') + tl(r.amount) + '</b><button class="x" data-act="editFin" data-id="' + esc(r.id) + '" aria-label="Kaydı düzenle">' + icon('edit', 18) + '</button><button class="x" data-act="delFin" data-id="' + esc(r.id) + '" aria-label="Kaydı sil">' + icon('trash', 18) + '</button></li>';
    });
    html += '</ul>';
    if (S.finance.length) html += '<button class="btn ghost" data-act="exportCsv">' + icon('download', 18) + ' Kayıtları CSV olarak dışa aktar</button>';
    return html;
  };

  const WD = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  views.plans = function (S, ui, now) {
    const type = ui.recType === 'in' || ui.recType === 'must' ? ui.recType : 'out', today = Core.dateInputValue(now);
    const tr = Core.taxReserve(S, now);
    let html = '<h2>Planlar ve Birikim</h2>';
    // Birikim hedefleri
    html += '<h3>Birikim hedefleri</h3>';
    if (!S.savings.length) html += '<div class="card muted small">Henüz birikim hedefin yok. Örn: yeni bilgisayar, reklam bütçesi, acil durum payı.</div>';
    S.savings.forEach(function (v) {
      const pr = Core.savingProgress(v);
      html += '<div class="card"><div class="row"><b>' + nt(v.name) + '</b><span class="muted small">%' + pr.pct + '</span></div>' + bar(pr.pct) +
        '<p class="small ' + (pr.reached ? 'pos' : 'muted') + '">' + tl(v.saved) + ' / ' + tl(v.target) + (pr.reached ? ' · Hedefe ulaştın' : ' · Kalan ' + tl(pr.left)) + '</p>' +
        '<div class="send"><input id="savAmt_' + esc(v.id) + '" class="inp" inputmode="decimal" placeholder="Tutar (TL)">' +
        '<button class="btn slim" data-act="savMoney" data-id="' + esc(v.id) + '" data-s="1">Ekle</button><button class="btn slim ghost" data-act="savMoney" data-id="' + esc(v.id) + '" data-s="-1">Çıkar</button></div>' +
        '<button class="link danger-link" data-act="savDel" data-id="' + esc(v.id) + '">Hedefi sil</button></div>';
    });
    html += '<details class="card"><summary class="link">' + icon('plus', 16) + ' Yeni birikim hedefi</summary>' +
      '<label class="lbl" for="savName">Ne için?</label><input id="savName" class="inp" maxlength="40" placeholder="Örn: Yeni bilgisayar">' +
      '<label class="lbl" for="savTarget">Hedef tutar (TL)</label><input id="savTarget" class="inp" inputmode="decimal" placeholder="Örn: 15000">' +
      '<button class="btn" data-act="savAdd">Hedefi oluştur</button></details>';
    // Tekrarlayan kayıtlar
    html += '<h3>Tekrarlayan kayıtlar</h3><p class="muted small">Kira, abonelik veya düzenli gelir gibi her ay/hafta tekrarlayanlar vadesi gelince kendiliğinden kaydedilir. Uygulamayı açtığında işlenir.</p>';
    if (!S.recurring.length) html += '<div class="card muted small">Tekrarlayan kaydın yok.</div>';
    S.recurring.forEach(function (r) {
      const nd = new Date(r.next);
      const when = r.freq === 'weekly' ? '<span>Her hafta</span> <span>' + WD[nd.getDay()] + '</span>' : '<span>Her ay ' + r.dom + '. gün</span>';
      html += '<div class="card rec ' + r.type + (r.active ? '' : ' off') + '"><div class="row"><b>' + (r.note ? nt(r.note) : esc(Core.categoryName(r.type, r.cat))) + '</b><b class="' + (r.type === 'in' ? 'pos' : 'neg') + '">' + (r.type === 'in' ? '+' : '−') + tl(r.amount) + '</b></div>' +
        '<p class="muted small">' + when + ' · <span>' + esc(Core.categoryName(r.type, r.cat)) + '</span>' + (r.active ? ' · <span>Sıradaki: ' + Core.formatDate(r.next) + '</span>' : ' · <span>Duraklatıldı</span>') + '</p>' +
        '<div class="row"><button class="link" data-act="recToggle" data-id="' + esc(r.id) + '">' + icon(r.active ? 'pause' : 'play', 14) + ' ' + (r.active ? 'Duraklat' : 'Devam ettir') + '</button>' +
        '<button class="link danger-link" data-act="recDel" data-id="' + esc(r.id) + '">Sil</button></div></div>';
    });
    html += '<details class="card"><summary class="link">' + icon('plus', 16) + ' Yeni tekrarlayan kayıt</summary>' +
      seg([{ v: 'out', t: 'Diğer gider' }, { v: 'must', t: 'Mecburi harcama' }, { v: 'in', t: 'Gelir' }], type, 'recType') +
      '<label class="lbl" for="recAmount">Tutar (TL)</label><input id="recAmount" class="inp" inputmode="decimal" placeholder="0,00">' +
      '<div class="two"><div><label class="lbl" for="recCat">Kategori</label><select id="recCat" class="inp">' + catOptions(type) + '</select></div>' +
      '<div><label class="lbl" for="recFreq">Sıklık</label><select id="recFreq" class="inp"><option value="monthly">Her ay</option><option value="weekly">Her hafta</option></select></div></div>' +
      '<label class="lbl" for="recDate">İlk tarih</label><input id="recDate" type="date" class="inp" value="' + today + '">' +
      '<label class="lbl" for="recNote">Not</label><input id="recNote" class="inp" maxlength="120" placeholder="Örn: alan adı yenileme">' +
      '<button class="btn" data-act="recAdd">Kaydet</button></details>';
    // Vergi payı
    html += '<h3>Vergi payı ayır</h3><div class="card"><p class="muted small">Gelirinden belirli bir yüzdeyi kenara ayırmak için hatırlatıcı hesap. Doğru oranı ve yükümlülüklerini bir mali müşavire danış; bu bir vergi tavsiyesi değildir.</p>' +
      '<div class="send"><input id="taxInput" class="inp" inputmode="decimal" placeholder="Yüzde (örn: 15)" value="' + (tr.pct ? esc(String(tr.pct).replace('.', ',')) : '') + '"><button class="btn" data-act="taxSave">Kaydet</button></div>' +
      (tr.pct > 0 ? '<div class="irow"><span>Bu ay net</span><b>' + tl(tr.monthNet) + '</b></div><div class="irow"><span>Kenara ayırman önerilen (%' + String(tr.pct).replace('.', ',') + ')</span><b>' + tl(tr.amount) + '</b></div>' : '') + '</div>';
    return html;
  };

  // ---------- Piyasa ----------
  function miniSpark(series, up) {
    const v = series.map(function (p) { return p.v; }), n = v.length, lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), span = hi - lo || 1;
    const pts = v.map(function (x, i) { return (2 + i * (76 / (n - 1))).toFixed(1) + ',' + (26 - (x - lo) / span * 22).toFixed(1); });
    return '<svg viewBox="0 0 80 30" class="mkspark ' + (up ? 'up' : 'down') + '" aria-hidden="true"><polyline points="' + pts.join(' ') + '" fill="none"/></svg>';
  }
  function marketChart(it) {
    const W = 340, H = 170, L = 6, R = 6, T = 14, B = 22, pw = W - L - R, ph = H - T - B;
    const v = it.series.map(function (p) { return p.v; }), n = v.length, lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), span = hi - lo || 1;
    const x = function (i) { return L + i * pw / (n - 1); }, y = function (val) { return T + ph * (1 - (val - lo) / span); };
    const pts = v.map(function (val, i) { return x(i).toFixed(1) + ' ' + y(val).toFixed(1); });
    const dfmt = function (t) { const d = new Date(t); return d.getDate() + '.' + (d.getMonth() + 1); };
    const up = it.change >= 0;
    const first = v[0], sp = it.series.map(function (p, i) {
      const d = new Date(p.t), ch = first > 0 ? Math.round((p.v - first) / first * 10000) / 100 : 0;
      return { x: +x(i).toFixed(1), y: +y(p.v).toFixed(1), l: d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(), r: [['Fiyat', Market_fmt(p.v, it.unit)], ['Başlangıca göre', (ch >= 0 ? '+%' : '−%') + String(Math.abs(ch)).replace('.', ',')]] };
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart mkchart ' + (up ? 'up' : 'down') + '" role="img" aria-label="Fiyat grafiği"' + scrubAttr(sp) + '>' +
      '<defs><linearGradient id="gMk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--mk);stop-opacity:.32"/><stop offset="1" style="stop-color:var(--mk);stop-opacity:0"/></linearGradient></defs>' +
      '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(hi) + '" y2="' + y(hi) + '"/><line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(lo) + '" y2="' + y(lo) + '"/>' +
      '<path class="area" d="M' + pts.join(' L') + ' L' + x(n - 1) + ' ' + (T + ph) + ' L' + x(0) + ' ' + (T + ph) + ' Z" fill="url(#gMk)"/>' +
      '<path class="mkline" pathLength="1" d="M' + pts.join(' L') + '" fill="none"/><circle class="mkdot" cx="' + x(n - 1) + '" cy="' + y(v[n - 1]) + '" r="3.5"/>' +
      '<text class="ax" x="' + L + '" y="' + (H - 6) + '">' + dfmt(it.series[0].t) + '</text><text class="ax" x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + dfmt(it.series[n - 1].t) + '</text></svg>';
  }
  function pctPill(c) { return '<span class="pc ' + (c >= 0 ? 'up' : 'down') + '"><i class="tri ' + (c >= 0 ? 'up' : 'down') + '"></i>%' + String(Math.abs(c)).replace('.', ',') + '</span>'; }
  function convHtml(items, amount) {
    const a = Number(String(amount).replace(',', '.'));
    if (!(a > 0) || !items || !items.length) return '<p class="muted small">Bir tutar yaz; seçili piyasa fiyatlarıyla karşılığını göstereyim.</p>';
    const rows = [['fx-USD', 'Dolar', 2], ['fx-EUR', 'Euro', 2], ['gold-gram', 'Gram altın', 3], ['cr-BTC', 'Bitcoin', 6]];
    return rows.map(function (r) {
      const it = items.find(function (i) { return i.id === r[0]; }); if (!it) return '';
      return '<div class="irow"><span>' + r[1] + '</span><b>' + (a / it.price).toLocaleString('tr-TR', { maximumFractionDigits: r[2] }) + '</b></div>';
    }).join('');
  }
  views.market = function (S, ui, now) {
    const m = ui.market || { status: 'idle', items: [], errors: [] };
    const items = m.items || [];
    const at = m.at ? new Date(m.at) : null;
    const hm = at ? ('0' + at.getHours()).slice(-2) + ':' + ('0' + at.getMinutes()).slice(-2) : '';
    let html = '<div class="row"><h2>Piyasa</h2><button class="icon ' + (m.status === 'loading' ? 'spin' : '') + '" data-act="mkRefresh" aria-label="Yenile" title="Yenile">' + icon('refresh', 20) + '</button></div>' +
      '<p class="muted small">' + (m.status === 'loading' && !items.length ? 'Veriler yükleniyor…' : at ? 'Son güncelleme: ' + hm + (m.status === 'loading' ? ' · yenileniyor…' : '') + ' · Fiyatlar: <span data-nt data-fixcur="1">' + esc(mkCode(m)) + '</span>' : 'Fiyatlar internetten çekilir.') + '</p>' +
      (m.fallback ? '<div class="card note"><b data-nt>' + esc(m.wanted) + '</b> <span>kuru şu an alınamadı; fiyatlar USD ile gösteriliyor.</span></div>' : '') +
      seg([{ v: '7', t: '7 Gün' }, { v: '30', t: '30 Gün' }, { v: '90', t: '90 Gün' }], String(ui.mkDays || 30), 'mkPeriod');
    if (!items.length) {
      return html + (m.status === 'loading'
        ? '<div class="card skeleton"><div class="sk"></div><div class="sk s"></div></div>'
        : '<div class="card note">Piyasa verileri şu an alınamadı. İnternet bağlantını kontrol edip tekrar dene.<button class="btn" data-act="mkRefresh">Tekrar dene</button></div>') + '<p class="fine">Bilgi amaçlıdır; yatırım tavsiyesi değildir.</p>';
    }
    const sel = items.find(function (i) { return i.id === ui.mkSel; }) || items[0];
    html += '<div class="card mkhero"><div class="row"><div><b>' + esc(sel.name) + '</b><div class="muted small">' + esc(sel.sym) + '</div></div>' + pctPill(sel.change) + '</div>' +
      '<div class="mkprice">' + Market_fmt(sel.price, sel.unit) + '</div>' + marketChart(sel) +
      '<div class="pick"><span>En yüksek <b>' + Market_fmt(sel.high, sel.unit) + '</b></span><span>En düşük <b>' + Market_fmt(sel.low, sel.unit) + '</b></span></div></div>';
    [['fx', 'Döviz'], ['gold', 'Altın'], ['crypto', 'Kripto']].forEach(function (g) {
      const list = items.filter(function (i) { return i.group === g[0]; });
      if (!list.length) return;
      html += '<h3>' + g[1] + '</h3><div class="card nopad mklist">' + list.map(function (i) {
        return '<button class="mkrow ' + (i.id === sel.id ? 'sel' : '') + '" data-act="mkSel" data-id="' + esc(i.id) + '"><span class="mkn"><b>' + esc(i.name) + '</b><small>' + esc(i.sym) + '</small></span>' +
          miniSpark(i.series, i.change >= 0) + '<span class="mkv"><b>' + Market_fmt(i.price, i.unit) + '</b>' + pctPill(i.change) + '</span></button>';
      }).join('') + '</div>';
    });
    if (m.errors && m.errors.length) html += '<p class="fine">Alınamayanlar: ' + m.errors.map(function (e) { return '<span>' + esc(e) + '</span>'; }).join(', ') + '. Yenilemeyi dene.</p>';
    html += '<div class="card"><b>Kendi paranı çevir</b><label class="lbl" for="mkAmount"><span>Tutar</span> <span data-nt data-fixcur="1">(' + esc(mkCode(m)) + ')</span></label><input id="mkAmount" class="inp" inputmode="decimal" placeholder="Örn: 10000">' +
      '<div id="mkConv">' + convHtml(items, '') + '</div></div>';
    html += '<p class="fine">Döviz kurları Avrupa Merkez Bankası verisidir (günlük). Altın ve kripto fiyatları Binance üzerindeki piyasadan alınır; gram altın PAXG (ons altına dayalı) üzerinden yaklaşık hesaplanır ve Türkiye\'deki gram altın fiyatından farklı olabilir. Veriler gecikmeli veya hatalı olabilir. Bilgi amaçlıdır, yatırım tavsiyesi değildir.</p>';
    return html;
  };
  const MK_SYM = { USD: '$', EUR: '€', GBP: '£' };
  function mkCode(m) { return (m && m.cur) || 'TRY'; }
  function Market_fmt(v, unit) {
    const d = v >= 1 ? 2 : 4;
    const u = unit === 'TL' || unit === 'TRY' || !unit ? 'TL' : (MK_SYM[unit === '$' ? 'USD' : unit] || unit);
    return Number(v).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ' + u;
  }

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

  function statusChip(x) {
    return x.archived ? '<span class="chip mute">Arşivde</span>' : (x.complete ? '<span class="chip">Proje bitti</span>' : '<span class="chip soft">Devam ediyor</span>');
  }
  function pkgLine(S, p) {
    const st = Core.projectPackageState(S, p);
    if (st.state === 'active') return '<span class="chip">' + icon('zap', 14) + ' ' + esc(st.pkg.name) + ' paketi (test)</span>';
    if (st.state === 'inactive') return '<span class="chip mute">Paket şu an aktif değil</span>';
    return '<span class="chip mute">Paket atanmadı</span>';
  }
  function projCard(S, p) {
    const x = Core.projectSummary(S, p), id = esc(p.id);
    return '<div class="card proj' + (x.active ? ' act' : '') + (x.archived ? ' arch' : '') + '">' +
      '<div class="row"><b class="ptitle">' + esc(x.title) + '</b>' + (x.active ? '<span class="chip">Aktif proje</span>' : '') + '</div>' +
      (x.desc ? '<p class="muted small">' + nt(x.desc) + '</p>' : '') +
      '<div class="pchips">' + statusChip(x) + pkgLine(S, p) + '</div>' +
      pgm(x.pct, x.done + ' / ' + x.total + ' görev tamamlandı') +
      '<div class="irow"><span>Gelir</span><b class="pos">' + tl(x.income) + '</b></div>' +
      '<div class="irow"><span>Gider</span><b>' + tl(x.expense) + '</b></div>' +
      '<div class="irow"><span>Bu projenin neti</span><b class="' + (x.net < 0 ? 'neg' : 'pos') + '">' + signed(x.net) + '</b></div>' +
      (x.next && !x.archived ? '<p class="muted small"><span>Sıradaki görev:</span> <span>' + esc(x.next) + '</span></p>' : '') +
      '<div class="row wrap"><button class="btn slim" data-act="viewProject" data-id="' + id + '">Aç</button>' +
      (!x.archived && !x.active ? '<button class="btn slim ghost" data-act="switchProject" data-id="' + id + '">Aktif yap</button>' : '') +
      (x.archived ? '<button class="btn slim ghost" data-act="restoreProject" data-id="' + id + '">Arşivden çıkar</button>' : '') + '</div></div>';
  }
  views.projects = function (S, ui, now) {
    const ent = Core.entitlements(S), live = Core.liveProjects(S), arch = S.projects.filter(Core.isArchived);
    let h = '<h2>Projelerim</h2><p class="muted"><b>' + live.length + ' / ' + Core.MAX_PROJECTS + '</b> aktif proje. Az ve odaklı proje, dağınık çok işten daha iyi ilerler.</p>' +
      '<button class="tile wide" data-act="go" data-route="tasks"><span class="ti">' + icon('tasks', 20) + '</span><b>Görevler</b><small>Aktif projenin görev listesi</small></button>';
    if (!S.projects.length) h += '<div class="card muted">Henüz projen yok. Sana uygun gelir modelini bulup ilk projeni başlatabilirsin.</div>';
    live.sort(function (a, b) { return (b.id === S.activeProjectId) - (a.id === S.activeProjectId) || b.updatedAt - a.updatedAt; }).forEach(function (p) { h += projCard(S, p); });
    if (!ent.selectModel) h += '<div class="card note">Yeni proje başlatmak için Manuel veya üstü paket gerekir.</div>';
    else if (!Core.canStartProject(S)) h += '<div class="card note"><b>Proje sınırına ulaştın.</b> Aynı anda en fazla ' + Core.MAX_PROJECTS + ' aktif proje yürütebilirsin; böylece dağılmadan ilerlersin. Yeni proje için bir projeni arşivleyebilirsin: arşivlenen projenin hiçbir verisi silinmez.</div>';
    else h += '<button class="btn" data-act="quizStart">' + icon('plus', 18) + ' Yeni proje oluştur</button>';
    if (arch.length) {
      h += '<details class="archbox"' + (ui.archOpen ? ' open' : '') + '><summary>Arşiv (' + arch.length + ')</summary>';
      arch.sort(function (a, b) { return (b.archivedAt || 0) - (a.archivedAt || 0); }).forEach(function (p) { h += projCard(S, p); });
      h += '</details>';
    }
    h += '<p class="fine">Paketin hesabına bağlıdır; otomasyon paketini bir projene atayabilirsin. Projeyi değiştirsen de gelir-gider kayıtların kaybolmaz.</p>';
    return h;
  };

  views.project = function (S, ui, now) {
    const p = Core.activeProject(S) || Core.projectById(S, ui.projectId);
    if (!p) return lock('Önce bir proje seç.', 'Projelere git', 'projects');
    const x = Core.projectSummary(S, p), id = esc(p.id), ent = Core.entitlements(S);
    const recs = Core.projectFinance(S, p.id), unl = Core.unlinkedFinance(S).length, pst = Core.projectPackageState(S, p);
    let h = '<div class="row"><h2 class="ptitle">' + esc(x.title) + '</h2>' + (x.active ? '<span class="chip">Aktif proje</span>' : '') + '</div>' +
      (x.desc ? '<p class="muted">' + nt(x.desc) + '</p>' : '') +
      '<div class="pchips">' + statusChip(x) + pkgLine(S, p) + '</div>';
    h += '<div class="grid3"><div class="stat in"><small>Gelir</small><b>' + tl(x.income) + '</b></div><div class="stat out"><small>Gider</small><b>' + tl(x.expense) + '</b></div>' +
      '<div class="stat"><small>Net</small><b class="' + (x.net < 0 ? 'neg' : '') + '">' + tl(x.net) + '</b></div></div>';
    if (x.goal > 0) h += '<div class="card"><div class="irow"><span>Proje hedefi (gelir)</span><b>' + tl(x.goal) + '</b></div>' + bar(x.goalPct) + '<p class="muted small">%' + x.goalPct + ' · Hedefe ' + tl(Math.max(0, Math.round((x.goal - x.income) * 100) / 100)) + ' kaldı</p></div>';
    h += '<div class="card"><div class="row"><b>Görevler</b></div>' + pgm(x.pct, x.done + ' / ' + x.total + ' görev tamamlandı') +
      (x.next && !x.archived ? '<p class="muted small"><span>Sıradaki görev:</span> <span>' + esc(x.next) + '</span></p>' : '') +
      (x.archived ? '' : '<button class="btn slim" data-act="go" data-route="tasks">Görevlere git</button>') + '</div>';
    const ws = Core.workSummary(S, p.id);
    h += '<div class="card"><div class="row"><b>Görev merkezi</b><span class="muted small">' + ws.open + ' açık · ' + ws.waiting + ' onay bekliyor</span></div><p class="muted small">Yapay zekâ destekli görev planı. Her adım senin onayınla ilerler.</p>' + (x.archived ? '' : '<button class="btn slim" data-act="go" data-route="work">Görev merkezine git</button>') + '</div>';
    h += '<div class="card"><b>Proje notları</b><textarea id="pjNote" class="inp" rows="4" maxlength="2000" data-change="projNote" placeholder="Bu projeyle ilgili notların burada saklanır"' + (x.archived ? ' readonly' : '') + '>' + esc(p.note || '') + '</textarea></div>';
    h += '<div class="card"><div class="row"><b>Yapay zekâ hafızası</b><span class="muted small">' + Core.memOf(p).items.length + ' bilgi</span></div><p class="muted small">Bu projeye özel, cihazında tutulan bilgiler. Yapay zekâ yalnızca bu projedeyken bunları kullanır.</p>' + (x.archived ? '' : '<button class="btn slim ghost" data-act="go" data-route="memory">Hafızayı yönet</button>') + '</div>';
    h += '<div class="card"><div class="row"><b>Gelir ve giderler</b><button class="link" data-act="go" data-route="money">Kayıt ekle ›</button></div>';
    if (!recs.length) h += '<p class="muted small">Bu projeye bağlı kayıt yok. Kayıt eklerken “Hangi iş için?” alanından bu projeyi seçebilirsin.</p>';
    else h += '<ul class="list">' + recs.slice(0, 6).map(function (r) { return '<li class="fin ' + r.type + '"><span>' + Core.formatDate(r.date) + ' · <span>' + esc(Core.categoryName(r.type, r.cat)) + '</span>' + (r.note ? '<br><small class="muted">' + nt(r.note) + '</small>' : '') + '</span><b>' + (r.type === 'in' ? '+' : '−') + tl(r.amount) + '</b></li>'; }).join('') + '</ul>' + (recs.length > 6 ? '<p class="muted small">Son 6 kayıt gösteriliyor (' + recs.length + ' kayıt).</p>' : '');
    if (unl && !x.archived) h += '<div class="note-in"><p class="muted small"><b>' + unl + '</b> kaydın hiçbir projeye bağlı değil (eski kayıtlar). Hepsini bu projeye bağlayabilirsin; kayıtlar silinmez, istediğinde tek tek yeniden değiştirebilirsin.</p><button class="btn slim ghost" data-act="linkLegacy" data-id="' + id + '">' + unl + ' kaydı bu projeye bağla</button></div>';
    h += '</div>';
    // paket
    h += '<div class="card"><b>Paket</b>';
    if (pst.state === 'active') h += '<p class="muted small">Hesabındaki otomasyon paketi bu projeye atanmış. (TEST MODU: gerçek ödeme yok.)</p><button class="btn slim ghost" data-act="unassignPkg" data-id="' + id + '">Paketi bu projeden kaldır</button>';
    else if (pst.state === 'inactive') h += '<p class="muted small">Bu projeye atanmış paket şu an hesabında aktif değil. Projenin verileri, geçmişi ve görevleri olduğu gibi duruyor. Hesabındaki aktif paketi atayabilir ya da atamayı kaldırabilirsin.</p>';
    else h += '<p class="muted small">Bu projede paket yok; proje paketsiz de kullanılabilir.</p>';
    if (!x.archived && ent.automation && pst.state !== 'active') {
      const other = S.projects.find(function (q) { return q.id !== p.id && Core.projectPackageState(S, q).state === 'active'; });
      h += (other ? '<p class="muted small"><span>Paket şu an bu projede:</span> ' + nt(other.title) + '</p>' : '') + '<button class="btn slim" data-act="assignPkg" data-id="' + id + '">' + (other ? 'Paketi buraya taşı' : 'Paketimi bu projeye ata') + '</button>';
    } else if (!x.archived && !ent.automation) h += '<p class="fine">Atanabilir bir otomasyon paketin yok. Paketler hesabına bağlıdır (Hesabım › Paketler, test modu).</p>';
    if (pst.state === 'inactive' && !x.archived) h += '<button class="btn slim ghost" data-act="unassignPkg" data-id="' + id + '">Atamayı kaldır</button>';
    h += '</div>';
    // düzenleme
    if (!x.archived) h += '<div class="card"><b>Proje bilgileri</b>' +
      '<label class="lbl" for="pjTitle">Proje adı</label><input id="pjTitle" class="inp" maxlength="40" value="' + esc(p.title) + '">' +
      '<label class="lbl" for="pjDesc">Kısa açıklama</label><input id="pjDesc" class="inp" maxlength="160" value="' + esc(p.desc || '') + '" placeholder="Bu proje ne hakkında?">' +
      '<label class="lbl" for="pjGoal">Proje hedefi: toplam gelir (TL)</label><input id="pjGoal" class="inp" inputmode="decimal" value="' + (p.goal > 0 ? esc(String(p.goal).replace('.', ',')) : '') + '" placeholder="İsteğe bağlı">' +
      '<button class="btn" data-act="saveProject" data-id="' + id + '">Kaydet</button></div>';
    // aktif yap / arşiv / dışa aktar / sil
    h += '<div class="row wrap">' + (!x.archived && !x.active ? '<button class="btn slim" data-act="switchProject" data-id="' + id + '">Aktif yap</button>' : '') +
      '<button class="btn slim ghost" data-act="exportProject" data-id="' + id + '">' + icon('download', 16) + ' Dışa aktar</button>' +
      (x.archived ? '<button class="btn slim ghost" data-act="restoreProject" data-id="' + id + '">Arşivden çıkar</button>' : '<button class="btn slim ghost" data-act="archiveProject" data-id="' + id + '">Arşivle</button>') + '</div>';
    h += '<div class="card danger"><b>Projeyi sil</b><p class="muted small">Silmeden önce arşivlemeyi düşün: arşivde hiçbir veri kaybolmaz. Silersen projenin görevleri, notları, planları ve kararları gider; gelir-gider kayıtların kalır ve “Genel”e döner. Silmeden önce dışa aktarabilirsin.</p><button class="btn slim danger" data-act="deleteProject" data-id="' + id + '">' + icon('trash', 16) + ' Projeyi sil</button></div>';
    const nn = Core.noteProjectCount(S, p.id);
    if (nn) h += '<div class="card ' + (ui.delChoice === p.id ? 'danger' : '') + '"><b>Not Defteri notları</b><p class="muted small">Bu projeye bağlı ' + nn + ' not var. Projeyi silersen bu notlar için sen karar verirsin; sen seçmeden hiçbir not silinmez.</p>' +
      '<button class="btn slim ghost" data-act="nbShowNotes" data-id="' + id + '">Notları gör</button>' +
      (ui.delChoice === p.id ? '<div class="row wrap"><button class="btn slim" data-act="deleteProjectGo" data-id="' + id + '" data-v="move">Notları genel notlara taşı ve projeyi sil</button><button class="btn slim danger" data-act="deleteProjectGo" data-id="' + id + '" data-v="delete">Notlarla birlikte projeyi sil</button><button class="btn slim ghost" data-act="deleteProjectCancel">Vazgeç</button></div>' : '') + '</div>';
    return h;
  };

  // ---------- Görev merkezi (Aşama 6) ----------
  function hm(ms) { const d = new Date(ms), z = function (n) { return (n < 10 ? '0' : '') + n; }; return Core.formatDate(ms) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); }
  function stChip(t) {
    const cls = t.status === 'done' ? 'ok' : t.status === 'awaiting' ? 'warn' : t.status === 'failed' || t.status === 'cancelled' ? 'mute' : '';
    return '<span class="chip ' + cls + '">' + esc(Core.TASK_STATUS[t.status]) + '</span>';
  }
  function approvalBox(p, t) {
    const a = t.approval; if (!a) return '';
    const id = esc(t.id);
    let h = '<div class="card note apv"><b>' + esc(a.title) + '</b><p class="small">' + esc(a.question) + '</p>';
    if (a.state === 'pending' && t.status === 'awaiting') {
      a.options.forEach(function (o) {
        h += '<div class="opt-box"><b class="small">' + esc(o.label) + '</b><p class="fine">' + esc(o.effect) + '</p>' +
          '<button class="btn slim" data-act="wkApprove" data-id="' + id + '" data-v="' + esc(o.id) + '">' + (a.type === 'external' ? 'Onaylıyorum' : 'Bunu seç') + '</button></div>';
      });
      h += '<button class="btn slim ghost" data-act="wkReject" data-id="' + id + '">Onaylamıyorum (iptal et)</button>';
    } else if (a.state === 'approved') {
      h += '<p class="small"><span class="chip ok">Onaylandı</span> ' + esc((a.options.find(function (o) { return o.id === a.chosen; }) || {}).label || '') + '</p>' +
        (t.external ? '<p class="fine"><b>Bu işlem yapılmadı:</b> ' + esc(Core.CAPABILITIES[t.external.cap] ? Core.CAPABILITIES[t.external.cap].note : '') + ' Taslak hazır; işlemi sen kendin yapabilirsin.</p>' : '');
    } else if (a.state === 'rejected') h += '<p class="small"><span class="chip mute">Onaylanmadı</span> İşlem yapılmadı.</p>';
    else h += '<p class="fine">Hazırlık başlayınca onayına sunulur.</p>';
    return h + '</div>';
  }
  function taskDetail(S, p, t, ui, now) {
    const id = esc(t.id), live = !Core.isArchived(p);
    let h = '<div class="card wk"><div class="row"><b>' + esc(t.title) + '</b>' + stChip(t) + '</div>' +
      '<p class="muted small"><span>Öncelik:</span> <span>' + esc(Core.PRIORITIES[t.priority]) + '</span> · <span>Oluşturuldu:</span> ' + Core.formatDate(t.createdAt) + (t.snoozeUntil > now ? ' · <span>Ertelendi:</span> ' + Core.formatDate(t.snoozeUntil) : '') + '</p>';
    if (ui.workEdit === t.id) {
      h += '<label class="lbl" for="wkTitle">Görev adı</label><input id="wkTitle" class="inp" maxlength="80" value="' + esc(t.title) + '">' +
        '<label class="lbl" for="wkDesc">Açıklama</label><textarea id="wkDesc" class="inp" rows="3" maxlength="400">' + esc(t.desc) + '</textarea>' +
        '<label class="lbl" for="wkPri">Öncelik</label><select id="wkPri" class="inp">' + Object.keys(Core.PRIORITIES).map(function (k) { return '<option value="' + k + '"' + (t.priority === k ? ' selected' : '') + '>' + esc(Core.PRIORITIES[k]) + '</option>'; }).join('') + '</select>' +
        '<label class="lbl" for="wkRes">Sonuç / çıktı (kendi notun)</label><textarea id="wkRes" class="inp" rows="4" maxlength="1500">' + esc(t.result) + '</textarea>' +
        '<div class="row wrap"><button class="btn slim" data-act="wkSave" data-id="' + id + '">Kaydet</button><button class="btn slim ghost" data-act="wkEditCancel">Vazgeç</button></div></div>';
      return h;
    }
    h += '<div class="stp-card">' + stepper(t, true) + '</div>';
    if (t.desc) h += '<p>' + esc(t.desc) + '</p>';
    const bl = Core.blockers(p, t);
    if (t.deps.length) h += '<p class="small"><b>Bağımlı olduğu görevler:</b> ' + t.deps.map(function (d) { const x = Core.tasksOf(S, p.id).find(function (y) { return y.id === d; }); return x ? '<span class="chip ' + (x.status === 'done' ? 'ok' : '') + '">' + esc(x.title) + '</span>' : ''; }).join(' ') + '</p>';
    h += '</div>';
    h += approvalBox(p, t);
    if (t.result) h += '<div class="card"><b>Çıktı</b> <span class="muted small">(' + (t.src === 'ai' ? 'yapay zekâ' : 'demo, yerel şablon') + ')</span><p class="small pre" data-nt>' + esc(t.result) + '</p></div>';
    if (live) {
      h += '<div class="row wrap">';
      if (t.status === 'planned') h += '<button class="btn slim" data-act="wkPrepare" data-id="' + id + '"' + (bl.length ? ' disabled' : '') + '>Hazırlığı başlat</button>';
      if (t.status === 'active' || t.status === 'preparing') h += '<button class="btn slim" data-act="wkComplete" data-id="' + id + '"' + (t.approval && t.approval.state !== 'approved' ? ' disabled' : '') + '>' + (t.external ? 'Ben yaptım, tamamla' : 'Çıktıyı kabul et') + '</button>';
      if (t.status === 'planned' || t.status === 'preparing' || t.status === 'active' || t.status === 'awaiting') h += '<button class="btn slim ghost" data-act="wkEdit" data-id="' + id + '">Düzenle</button>';
      if (t.status === 'planned') h += (t.snoozeUntil > now ? '<button class="btn slim ghost" data-act="wkSnooze" data-id="' + id + '" data-v="0">Ertelemeyi kaldır</button>' : '<button class="btn slim ghost" data-act="wkSnooze" data-id="' + id + '" data-v="7">7 gün ertele</button>');
      if (t.status === 'preparing' || t.status === 'active') h += '<button class="btn slim ghost" data-act="wkFail" data-id="' + id + '">Başarısız say</button>';
      if (['planned', 'preparing', 'awaiting', 'active'].indexOf(t.status) !== -1) h += '<button class="btn slim ghost" data-act="wkCancel" data-id="' + id + '">İptal et</button>';
      if (['done', 'failed', 'cancelled'].indexOf(t.status) !== -1) h += '<button class="btn slim ghost" data-act="wkReopen" data-id="' + id + '">Yeniden planla</button><button class="btn slim danger" data-act="wkDelete" data-id="' + id + '">Sil</button>';
      h += '</div>';
      if (t.status === 'planned' && bl.length) h += '<p class="fine"><span>Önce şunlar tamamlanmalı:</span> ' + bl.map(function (x) { return '<span>' + esc(x.title) + '</span>'; }).join(', ') + '</p>';
    }
    h += '<div class="card"><b>İşlem geçmişi</b><ul class="list tlog">' + t.log.slice().reverse().map(function (l) {
      return '<li><span class="muted small">' + hm(l.at) + '</span><br>' + esc(l.text) + ' <span class="chip ' + (l.by === 'user' ? '' : 'mute') + '">' + (l.by === 'user' ? 'Sen' : 'Sistem') + '</span></li>';
    }).join('') + '</ul></div>';
    return h;
  }
  function planCard(S, p, plan, compact) {
    const ts = Core.tasksOf(S, p.id).filter(function (t) { return t.planId === plan.id; });
    let h = '<div class="card plan"><div class="row"><b>Görev planı</b><span class="chip ' + (plan.state === 'approved' ? 'ok' : plan.state === 'rejected' ? 'mute' : 'warn') + '">' + (plan.state === 'approved' ? 'Onaylandı' : plan.state === 'rejected' ? 'Reddedildi' : 'Taslak: onayını bekliyor') + '</span></div>' +
      '<p class="small" data-nt>' + esc(plan.goal) + '</p><ol class="plist">' + ts.map(function (t) { return '<li><span>' + esc(t.title) + '</span> ' + (compact ? '' : stChip(t)) + '</li>'; }).join('') + '</ol>';
    if (plan.state === 'proposed') h += '<p class="fine">Onaylamazsan hiçbir görev çalışmaz. Onaylasan bile her görevi sen başlatırsın.</p><div class="row wrap"><button class="btn slim" data-act="wkPlanOk" data-id="' + esc(plan.id) + '" data-pid="' + esc(p.id) + '">Planı onayla</button><button class="btn slim ghost" data-act="wkPlanNo" data-id="' + esc(plan.id) + '" data-pid="' + esc(p.id) + '">Reddet</button></div>';
    else h += '<button class="link" data-act="go" data-route="work">Görev merkezine git ›</button>';
    return h + '</div>';
  }
  views.work = function (S, ui, now) {
    const p = Core.activeProject(S);
    if (!p) return '<h2>Görev Merkezi</h2>' + lock('Görevler bir projeye bağlıdır. Önce bir proje başlat veya seç.', 'Projelere git', 'projects');
    const w = Core.workSummary(S, p.id), tasks = Core.tasksOf(S, p.id), we = Core.workEntitlements(S);
    if (ui.workTask) {
      const t = tasks.find(function (x) { return x.id === ui.workTask; });
      if (t) return '<button class="link" data-act="wkBack">‹ Görev listesi</button>' + taskDetail(S, p, t, ui, now);
      ui.workTask = null;
    }
    let h = '<h2>Görev Merkezi</h2><div class="row"><span><span class="muted small">Proje</span><br><b class="ptitle">' + esc(p.title) + '</b></span><span class="chip">' + w.open + ' açık</span></div>' +
      '<p class="fine">Akış: planla → hazırla → seçenek sun → onay al → desteklenen işlemi yap → raporla. Burada yapay zekâ kendi başına işlem yapmaz; her adımı sen onaylarsın. Görevler yalnızca bu projeye aittir.</p>';
    const aw = Core.pendingApprovals(S, p.id);
    h += '<div class="card ' + (aw.length ? 'note' : '') + '"><b>Onay bekleyenler</b> <span class="muted small">(' + aw.length + ')</span>' + (aw.length ? '<ul class="list">' + aw.map(function (t) { return '<li><button class="task" data-act="wkOpen" data-id="' + esc(t.id) + '"><span class="chk">!</span><span>' + esc(t.title) + '</span></button></li>'; }).join('') + '</ul>' : '<p class="muted small">Şu an onayını bekleyen bir işlem yok.</p>') + '</div>';
    Core.plansOf(S, p.id).filter(function (x) { return x.state === 'proposed'; }).forEach(function (x) { h += planCard(S, p, x, true); });
    const groups = [['awaiting', 'Onay bekliyor'], ['active', 'Devam ediyor'], ['preparing', 'Hazırlanıyor'], ['planned', 'Planlandı'], ['done', 'Tamamlandı'], ['failed', 'Başarısız'], ['cancelled', 'İptal edildi']];
    if (!tasks.length) h += '<div class="card"><p class="muted">Henüz görev yok. Sohbette "Dijital ürün projemi geliştirmek istiyorum" gibi bir hedef yaz, plan taslağı hazırlansın; ya da aşağıdan kendin görev ekle.</p><button class="btn slim" data-act="go" data-route="chat">Sohbete git</button></div>';
    groups.forEach(function (g) {
      const l = tasks.filter(function (t) { return t.status === g[0]; }); if (!l.length) return;
      h += '<h3 class="sec"><span>' + g[1] + '</span> <span class="muted">(' + l.length + ')</span></h3><ul class="list">' + l.map(function (t) {
        return '<li><button class="task ' + (t.status === 'done' ? 'done' : '') + '" data-act="wkOpen" data-id="' + esc(t.id) + '"><span class="chk">' + (t.status === 'done' ? icon('check', 16) : t.priority === 'high' ? '!' : '•') + '</span><span class="tk-main"><span class="tk-t">' + esc(t.title) + '</span>' + stepper(t, false) + '</span>' + (t.snoozeUntil > now && t.status === 'planned' ? '<small class="muted">ertelendi</small>' : '') + '</button></li>';
      }).join('') + '</ul>';
    });
    h += '<div class="card"><b>Yeni görev</b><label class="lbl" for="wkNewTitle">Görev adı</label><input id="wkNewTitle" class="inp" maxlength="80" placeholder="Örn. İlk ürün taslağını çiz"><label class="lbl" for="wkNewPri">Öncelik</label><select id="wkNewPri" class="inp"><option value="normal">Normal</option><option value="high">Yüksek</option><option value="low">Düşük</option></select><button class="btn" data-act="wkAdd">Ekle</button></div>';
    h += '<div class="card"><b>Dış işlemler ve izinler</b><p class="fine">Bu sürümde hiçbir dış hesaba (sosyal medya, e-posta, ödeme, web sitesi) bağlı değilim ve şifre/OAuth istemem. Aşağıdaki işlemler yapılmaz; yalnızca taslak hazırlanır. İleride bir bağlantı eklenirse her biri ayrı izinle ve her seferinde onayınla çalışır.</p><ul class="list">' +
      Object.keys(Core.CAPABILITIES).map(function (k) { const c = Core.capabilityStatus(S, k); return '<li class="irow"><span>' + esc(c.name) + '</span><span class="chip ' + (c.supported ? 'ok' : 'mute') + '">' + (c.supported ? 'Bu cihazda' : 'Bağlı değil') + '</span></li>'; }).join('') +
      '</ul><p class="fine"><span>Paket:</span> <span>' + esc(Core.PACKAGES[S.pkg] ? Core.PACKAGES[S.pkg].name : S.pkg) + '</span> · <span>tüm paketlerde şimdilik aynı temel görev motoru kullanılır.</span></p></div>';
    return h;
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
    const srcs = Core.sourceSplit(S);
    if (srcs.hasSources) {
      html += '<div class="card"><b>İşlere göre net (tüm zamanlar)</b><p class="muted small">Kayıt girerken seçtiğin işe göre gelir − gider.</p>' +
        srcs.items.map(function (it) { return '<div class="irow"><span>' + esc(it.name) + '</span><b class="' + (it.net < 0 ? 'neg' : 'pos') + '">' + signed(it.net) + '</b></div>'; }).join('') + '</div>';
    }
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
      html += lock('Yapay zekânın plan ve taslak hazırlayıp önemli kararları sana bıraktığı bölüm CEO Modu\'nda açılır.', null);
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
        '<p><b>Son kaydedilen bilgi:</b><br>' + nt(u.lastNote) + '</p>' +
        (u.next ? '<p class="muted"><span>Sıradaki görev:</span> <span>' + esc(u.next.title) + '</span></p>' : '') +
        '<button class="btn" data-act="viewProject" data-id="' + esc(u.projectId) + '">PROJEYİ GÖRÜNTÜLE</button></div>';
    }
    return html;
  };

  const LANG_OPTS = [['tr', 'Türkçe'], ['en', 'English'], ['de', 'Deutsch'], ['es', 'Español'], ['ru', 'Русский'], ['ar', 'العربية']];
  const CUR_NAMES = { TRY: 'Türk Lirası (TRY)', USD: 'ABD Doları (USD)', EUR: 'Euro (EUR)', GBP: 'İngiliz Sterlini (GBP)', CHF: 'İsviçre Frangı (CHF)', RUB: 'Rus Rublesi (RUB)', SAR: 'Suudi Riyali (SAR)', AED: 'BAE Dirhemi (AED)' };
  function langSelect(S) {
    return '<select id="langSel" class="inp" data-act-change="setLang" aria-label="Dil"><option value="auto"' + (S.settings.lang === 'auto' ? ' selected' : '') + '>Cihaz dili (otomatik)</option>' +
      LANG_OPTS.map(function (l) { return '<option data-nt value="' + l[0] + '"' + (S.settings.lang === l[0] ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('') + '</select>';
  }
  function currencySelect(S) {
    return '<select id="curSel" class="inp" data-act-change="setCurrency" aria-label="Para birimi">' +
      Core.CURRENCIES.map(function (c) { return '<option value="' + c + '"' + (S.settings.currency === c ? ' selected' : '') + '>' + CUR_NAMES[c] + '</option>'; }).join('') + '</select>';
  }
  views.settings = function (S, ui) {
    const rem = S.settings.reminder, look = S.settings.look;
    return '<h2>Ayarlar</h2>' +
      '<div class="card profile">' + avatar(S, 'lg') + '<div class="pb"><b>' + (S.user.name ? nt(S.user.name) : 'Profilin') + '</b><small class="muted">Fotoğraf yalnızca bu cihazda saklanır.</small><div class="row">' +
      '<button class="btn slim" data-act="avatarPick">' + icon('upload', 16) + (S.user.avatar ? 'Değiştir' : 'Fotoğraf ekle') + '</button>' + (S.user.avatar ? '<button class="btn slim ghost" data-act="avatarDel">Kaldır</button>' : '') +
      '</div></div><input id="avatarFile" type="file" accept="image/*" hidden></div>' +
      '<div class="card"><b>Dil ve para birimi</b><label class="lbl" for="langSel">Dil</label>' + langSelect(S) +
      '<label class="lbl" for="curSel">Para birimi</label>' + currencySelect(S) +
      '<p class="muted small">Para birimi yalnızca gösterim içindir; girdiğin tutarlar otomatik dönüştürülmez. Piyasa sayfası Türk lirası cinsinden kalır.</p></div>' +
      '<div class="card"><b>Görünüm</b><p class="muted small">Siyah tema pil tasarrufu sağlar ve geceleri gözü yormaz.</p>' +
      seg([{ v: 'dark', t: 'Siyah' }, { v: 'light', t: 'Açık' }, { v: 'system', t: 'Sistem' }], S.settings.theme, 'setTheme') +
      '<label class="lbl">Vurgu rengi</label><div class="swatches">' + Object.keys(SWATCH).map(function (k) {
        return '<button class="sw ' + (look.accent === k ? 'on' : '') + '" style="--c:' + SWATCH[k][0] + '" data-act="setAccent" data-v="' + k + '" aria-label="' + SWATCH[k][1] + '" title="' + SWATCH[k][1] + '">' + (look.accent === k ? icon('check', 18) : '') + '</button>';
      }).join('') + '<label class="sw custom ' + (look.accent === 'custom' ? 'on' : '') + '" title="Özel renk"><input id="accentCustom" type="color" value="' + esc(look.custom || '#2fdc77') + '" aria-label="Özel renk seç">' + (look.accent === 'custom' ? icon('check', 18) : '') + '</label></div>' +
      '<label class="lbl">Yazı boyutu</label>' + seg([{ v: 's', t: 'Küçük' }, { v: 'm', t: 'Normal' }, { v: 'l', t: 'Büyük' }], look.font, 'setFont') +
      '<label class="lbl">Köşeler</label>' + seg([{ v: 'soft', t: 'Yumuşak' }, { v: 'sharp', t: 'Keskin' }], look.radius, 'setRadius') +
      '<label class="lbl">Animasyonlar</label>' + seg([{ v: 'on', t: 'Açık' }, { v: 'off', t: 'Kapalı' }], look.motion, 'setMotion') + '</div>' +
      '<div class="card"><b>Ana ekranda göster</b>' + toggleRow('Harcama pastası', 'homeSpend', look.home.spend) + toggleRow('Seri ve rozetler', 'homeStreak', look.home.streak) + toggleRow('Başlangıç adımları', 'homeChecklist', look.home.checklist) + '</div>' +
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

  // ---------- Sekme giriş ekranları (Araçlar, Hesabım) ----------
  function hubTile(route, ic, title, sub) {
    return '<button class="tile" data-act="go" data-route="' + route + '"><span class="ti">' + icon(ic, 20) + '</span><b>' + title + '</b><small>' + sub + '</small></button>';
  }
  // ---------- Not Defteri (Aşama 8) ----------
  function noteProjOptions(S, cur) {
    let o = '<option value=""' + (!cur ? ' selected' : '') + '>Genel (projesiz)</option>';
    S.projects.forEach(function (p) {
      const arch = Core.isArchived(p);
      if (arch && p.id !== cur) return;
      o += '<option value="' + esc(p.id) + '"' + (p.id === cur ? ' selected' : '') + ' data-nt>' + esc(p.title) + (arch ? ' (arşiv)' : '') + '</option>';
    });
    return o;
  }
  function noteCard(S, n) {
    const p = n.projectId ? Core.projectById(S, n.projectId) : null;
    const snip = n.body.replace(/\s+/g, ' ').trim().slice(0, 110);
    return '<li><button class="notecard" data-act="nbOpen" data-id="' + esc(n.id) + '">' +
      '<b class="nt-t" data-nt>' + esc(n.title) + '</b>' + (snip ? '<span class="nt-s" data-nt>' + esc(snip) + '</span>' : '') +
      '<span class="nt-m"><span class="chip">' + esc(Core.noteCatName(S, n.cat)) + '</span>' +
      (p ? '<span class="chip pj" data-nt>' + esc(p.title) + '</span>' : '') +
      (Core.noteIsSensitive(n) ? '<span class="chip warn">Hassas olabilir</span>' : '') +
      '<span class="muted small">Güncellendi: ' + Core.formatDate(n.updatedAt) + '</span></span></button></li>';
  }
  function noteListHtml(S, ui) {
    const list = Core.listNotes(S, { q: ui.nbQ, cat: ui.nbCat, project: ui.nbProj, sort: ui.nbSort, dir: ui.nbSort === 'title' ? 'asc' : 'desc' });
    if (!list.length) return '<p class="muted small nb-empty">' + (Core.notebookOf(S).notes.length ? 'Bu filtreyle eşleşen not yok.' : 'Henüz notun yok. "Yeni not" ile başla.') + '</p>';
    return '<ul class="list notelist">' + list.map(function (n) { return noteCard(S, n); }).join('') + '</ul>';
  }
  function notePendCard(S, pe) {
    const n = pe.noteId ? Core.noteById(S, pe.noteId) : null, id = esc(pe.id);
    const p = pe.projectId ? Core.projectById(S, pe.projectId) : null;
    let h = '<div class="card memsug npend">';
    if (pe.kind === 'new') h += '<p class="small"><b>NORA bu notu kaydetmeyi öneriyor</b> <span class="chip">' + (p ? esc('Proje notu') : 'Genel not') + '</span></p><p data-nt>' + esc(pe.text) + '</p>';
    else if (pe.kind === 'edit') h += '<p class="small"><b>Önerilen yeni metin</b> <span class="chip warn">Demo düzenleme</span></p><p class="muted small">Şimdiki not:</p><p class="nb-old" data-nt>' + nl2br(n ? n.body : '') + '</p><p class="muted small">Önerilen:</p><p data-nt>' + nl2br(pe.text) + '</p>';
    else if (pe.kind === 'link') h += '<p class="small"><b>Not projeye bağlansın mı?</b></p><p><span data-nt>' + esc(pe.title) + '</span> → <b data-nt>' + esc(p ? p.title : '') + '</b></p>';
    else if (pe.kind === 'task') h += '<p class="small"><b>Bu nottan görev planı taslağı hazırlansın mı?</b></p><p><span data-nt>' + esc(pe.title) + '</span> → <b data-nt>' + esc(p ? p.title : '') + '</b></p><p class="fine">Taslak Görev Merkezi\'ne düşer; orada onaylamadan hiçbir görev çalışmaz.</p>';
    else h += '<p class="small"><b>Proje hafızasına aktarılsın mı?</b></p><p data-nt>' + esc(pe.text) + '</p><p class="fine">Yalnızca bu notun projesinin hafızasına eklenir.</p>';
    const yes = pe.kind === 'new' ? 'Kaydet' : pe.kind === 'edit' ? 'Uygula' : pe.kind === 'link' ? 'Bağla' : pe.kind === 'task' ? 'Taslak hazırla' : 'Hafızaya aktar';
    return h + '<div class="row wrap"><button class="btn slim" data-act="nbPend" data-id="' + id + '" data-v="yes">' + yes + '</button><button class="btn slim ghost" data-act="nbPend" data-id="' + id + '" data-v="no">Vazgeç</button></div></div>';
  }
  // ---------- Aşama 9: seçilen metni Not Defteri'ne kaydet ----------
  // Seçim çubuğu (yüzen düğmeler). Yalnızca uygulamanın kendi ekranında kullanıcının seçtiği metin için gösterilir.
  function selBarHtml() {
    return '<button class="sb-btn sb-nora" data-act="selNora">' + icon('note', 16) + ' NORA\'ya Not Al</button>' +
      '<button class="sb-btn" data-act="selSave">Not Defterine Kaydet</button>' +
      '<button class="sb-btn" data-act="selCopy">' + icon('copy', 16) + ' Kopyala</button>';
  }
  function selSheetHtml(S, ui) {
    const d = ui.selSheet, sel = Core.selClean(d.text), nora = d.mode === 'nora', nb = Core.notebookOf(S);
    const dup = Core.findNoteByText(S, sel.text), sens = Core.isSensitive(sel.text);
    let h = '<div class="modal"><div class="sheet selsheet" role="dialog" aria-modal="true"><h3>' + (nora ? 'NORA\'ya Not Al' : 'Not Defterine Kaydet') + '</h3>' +
      '<p class="muted small">Seçtiğin metin aşağıda. Kaydetmeden önce kontrol et.</p>' +
      '<div class="selprev" data-nt>' + esc(sel.text) + '</div>';
    if (sel.truncated) h += '<p class="fine"><span class="chip warn">Metin çok uzun</span> Yalnızca ilk ' + Core.NOTE_LIMITS.body + ' karakter kaydedilir.</p>';
    if (sens) h += '<p class="fine"><span class="chip warn">Hassas olabilir</span> Şifre, kart/IBAN gibi bilgi içeriyor olabilir. Yine de kaydedebilirsin; NORA hassas görünen notlara dokunmaz.</p>';
    if (dup) h += '<div class="card note"><p class="small">Bu metin zaten bir notta kayıtlı: <b data-nt>' + esc(dup.title) + '</b></p><p class="fine">Aynı metinden ikinci bir not oluşturmak istemiyorsan Vazgeç\'e bas veya mevcut notu aç.</p></div>';
    if (nora) {
      h += '<div class="card nora-sug"><b>NORA önerisi <span class="chip">Demo</span></b>' +
        '<p class="fine">Bu öneri kural tabanlı bir demodur, gerçek yapay zekâ analizi değildir. Yalnızca seçtiğin metne ve proje adlarına bakar; notlarını okumaz. Önerileri aşağıdaki alanlara yerleştirdim, istediğini değiştirebilirsin.</p>' +
        '<ul class="list"><li>Başlık önerisi hazır</li><li>Kategori önerisi: <b data-nt>' + esc(d.sug.catName) + '</b></li>' +
        '<li>' + (d.sug.projectId ? 'Proje önerisi: <b data-nt>' + esc(d.sug.projectName) + '</b>' : 'Projeyle net bir eşleşme bulamadım; genel not olarak kalır') + '</li></ul></div>';
    }
    h += '<label class="lbl" for="selTitle">Başlık</label><input id="selTitle" class="inp" maxlength="' + Core.NOTE_LIMITS.title + '" value="' + esc(d.title) + '">' +
      '<label class="lbl" for="selCat">Kategori</label><select id="selCat" class="inp">' + Core.noteCats(S).map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === d.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<label class="lbl" for="selProj">Proje bağlantısı (isteğe bağlı)</label><select id="selProj" class="inp">' + noteProjOptions(S, d.pid) + '</select>' +
      '<p class="fine">' + (nb.nora ? 'NORA erişimi açık: bu notu Not Defteri izinlerin kapsamında görebilir.' : 'NORA erişimi kapalı: NORA bu notu okumaz. Not Defteri ekranından açabilirsin.') + ' Not yalnızca bu cihazda saklanır.</p>' +
      '<div class="row wrap"><button class="btn" data-act="selConfirm" data-v="' + (dup ? 'force' : '') + '">' + (dup ? 'Yine de kaydet' : 'Kaydet') + '</button>' +
      (dup ? '<button class="btn ghost" data-act="selOpenDup" data-id="' + esc(dup.id) + '">Mevcut notu aç</button>' : '') +
      '<button class="btn ghost" data-act="selCancel">Vazgeç</button></div></div></div>';
    return h;
  }
  views.notes = function (S, ui, now) {
    const nb = Core.notebookOf(S), live = Core.liveProjects(S);
    let h = '<div class="row"><h2>Not Defteri</h2><span class="chip">' + nb.notes.length + ' not</span></div>' +
      '<p class="muted small">Notların bu cihazda saklanır, JSON yedeğine girer ve sunucuya gönderilmez.</p>' +
      '<button class="btn" data-act="nbNew">' + icon('plus', 18) + ' Yeni not</button>' +
      '<p class="fine">İpucu: uygulamadaki bir metni basılı tutup seçersen "NORA\'ya Not Al" çıkar. Çıkmazsa metni kopyalayıp Yeni not\'a yapıştırabilirsin.</p>';
    nb.pending.forEach(function (pe) { h += notePendCard(S, pe); });
    h += '<div class="card"><b>NORA erişimi</b>' + toggleRow('NORA bu defterdeki notları okuyabilsin', 'nbNora', nb.nora) +
      '<p class="fine">' + (nb.nora ? 'Açık: NORA, sohbet ettiğin kapsamdaki (genel veya aktif proje) notları yerelde okur. Hassas görünen notlara dokunmaz. Notu değiştirmeden önce sana gösterir ve onayını ister; silmez.' : 'Kapalı: NORA hiçbir notunu okumaz. İstediğin an açıp kapatabilirsin.') + '</p></div>';
    if (nb.notes.length > 3 && !ui.nbQ && !ui.nbCat && !ui.nbProj) {
      h += '<h3>Son düzenlenenler</h3><ul class="list notelist">' + Core.listNotes(S, { sort: 'updated' }).slice(0, 3).map(function (n) { return noteCard(S, n); }).join('') + '</ul>';
    }
    h += '<h3>Tüm notlar</h3><div class="searchbox"><span class="si">' + icon('search', 18) + '</span><input id="nbQ" class="inp" type="search" maxlength="60" placeholder="Notlarda ara" value="' + esc(ui.nbQ || '') + '" aria-label="Notlarda ara"></div>' +
      '<div class="nb-filters"><select id="nbCat" class="inp" aria-label="Kategori"><option value="">Tüm kategoriler</option>' + Core.noteCats(S).map(function (c) { return '<option value="' + esc(c.id) + '"' + (ui.nbCat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<select id="nbProj" class="inp" aria-label="Proje"><option value="">Tüm notlar</option><option value="general"' + (ui.nbProj === 'general' ? ' selected' : '') + '>Genel notlar</option>' +
      S.projects.map(function (p) { return '<option value="' + esc(p.id) + '"' + (ui.nbProj === p.id ? ' selected' : '') + ' data-nt>' + esc(p.title) + (Core.isArchived(p) ? ' (arşiv)' : '') + '</option>'; }).join('') + '</select>' +
      '<select id="nbSort" class="inp" aria-label="Sırala"><option value="updated"' + (ui.nbSort !== 'created' && ui.nbSort !== 'title' ? ' selected' : '') + '>Son düzenlenen</option><option value="created"' + (ui.nbSort === 'created' ? ' selected' : '') + '>Oluşturulma tarihi</option><option value="title"' + (ui.nbSort === 'title' ? ' selected' : '') + '>Başlığa göre</option></select></div>' +
      '<div id="nbList">' + noteListHtml(S, ui) + '</div>';
    return h;
  };
  views.note = function (S, ui, now) {
    const isNew = !ui.noteId || ui.noteId === 'new', n = isNew ? null : Core.noteById(S, ui.noteId);
    if (!isNew && !n) return lock('Bu not bulunamadı.', 'Not Defteri', 'notes');
    const d = ui.noteDraft || {}, nb = Core.notebookOf(S);
    const title = d.title != null ? d.title : n ? n.title : '', body = d.body != null ? d.body : n ? n.body : '';
    const cat = d.cat != null ? d.cat : n ? n.cat : (ui.nbCat || 'genel'), pid = d.pid != null ? d.pid : n ? n.projectId : (ui.nbProj && ui.nbProj !== 'general' && Core.projectById(S, ui.nbProj) && !Core.isArchived(Core.projectById(S, ui.nbProj)) ? ui.nbProj : '');
    let h = '<div class="row"><h2>' + (isNew ? 'Yeni not' : 'Not') + '</h2>' + (n && Core.noteIsSensitive(n) ? '<span class="chip warn">Hassas olabilir</span>' : '') + '</div>';
    if (n) {
      n && nb.pending.filter(function (x) { return x.noteId === n.id; }).forEach(function (pe) { h += notePendCard(S, pe); });
    }
    if (ui.noteMsg) h += '<div class="card note"><p class="small" data-nt>' + nl2br(ui.noteMsg) + '</p></div>';
    h += '<div class="card"><label class="lbl" for="ntTitle">Başlık</label><input id="ntTitle" class="inp" maxlength="' + Core.NOTE_LIMITS.title + '" value="' + esc(title) + '">' +
      '<label class="lbl" for="ntBody">İçerik</label><textarea id="ntBody" class="inp" rows="9" maxlength="' + Core.NOTE_LIMITS.body + '">' + esc(body) + '</textarea>' +
      '<label class="lbl" for="ntCat">Kategori</label><select id="ntCat" class="inp">' + Core.noteCats(S).map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === cat ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<label class="lbl" for="ntProj">Proje bağlantısı</label><select id="ntProj" class="inp">' + noteProjOptions(S, pid) + '</select>' +
      '<p class="fine">Genel notlar hiçbir projeye bağlı değildir. Proje notu yalnızca o projeyle birlikte görünür ve başka projeye karışmaz. Şifre, kart/IBAN, kimlik no gibi bilgileri not defterine yazmamanı öneririm.</p>' +
      (n ? '<p class="fine">Oluşturuldu: ' + hm(n.createdAt) + ' · Güncellendi: ' + hm(n.updatedAt) + '</p>' : '') +
      '<div class="row wrap"><button class="btn" data-act="nbSave">Kaydet</button><button class="btn ghost" data-act="back">Vazgeç</button>' +
      (n ? '<button class="btn ghost danger" data-act="nbDelete" data-id="' + esc(n.id) + '">' + icon('trash', 16) + ' Sil</button>' : '') + '</div></div>';
    if (n) {
      const on = nb.nora, sens = Core.noteIsSensitive(n);
      h += '<div class="card"><b>NORA ile</b>' + (on && !sens
        ? '<p class="fine">Aşağıdaki işlemler yerelde çalışır. Değişiklik gerektirenler önce sana gösterilir, onayınla uygulanır. Özetleme gerçek yapay zekâ gerektirir ve şu an kullanılamıyor.</p>' +
          '<div class="row wrap">' + [['summarize', 'Özetle'], ['tidy', 'Düzenli hâle getir'], ['link', 'Projeye bağla'], ['task', 'Görev öner'], ['memory', 'Hafızaya aktar']].map(function (a) { return '<button class="btn slim ghost" data-act="nbAsk" data-v="' + a[0] + '" data-id="' + esc(n.id) + '">' + a[1] + '</button>'; }).join('') + '</div>'
        : '<p class="fine">' + (sens ? 'Bu not hassas bilgi içerebileceği için NORA ona dokunmaz.' : 'NORA erişimi kapalı. Notlar ekranından açabilirsin.') + '</p>') + '</div>';
    }
    return h;
  };

  views.tools = function (S, ui, now) {
    const ent = Core.entitlements(S);
    return '<h2>Araçlar</h2><p class="muted">Gelirini takip etmek ve karar vermek için araçların hepsi burada.</p><div class="grid2">' +
      hubTile('money', 'trend', 'Kazanç', tl(Core.financeSummary(S, now).net) + ' net') +
      hubTile('charts', 'chart', 'Grafikler', 'Gelir ve gider dağılımı') +
      hubTile('calc', 'calc', 'Hesaplayıcı', 'Hedefe kaç satış?') +
      hubTile('market', 'dollar', 'Piyasa', 'Dolar, altın, kripto') +
      hubTile('plans', 'repeat', 'Planlar', 'Tekrarlayan, birikim') +
      '<button class="tile wide notetile" data-act="go" data-route="notes"><span class="ti">' + icon('note', 20) + '</span><b>Not Defteri</b><small>' + (Core.notebookOf(S).notes.length ? Core.notebookOf(S).notes.length + ' not · fikirlerini, işlerini ve araştırmalarını bir arada tut' : 'Fikirlerini, işlerini ve araştırmalarını bir arada tut') + '</small></button>' +
      hubTile('auto', 'zap', 'Otomasyon', ent.automation ? 'Açık' : 'Ücretli paket') +
      hubTile('glossary', 'book', 'Sözlük', 'Terimleri öğren') +
      hubTile('tasks', 'target', 'Gelir modeli testi', 'Sana uygun modeli bul') +
      '</div>';
  };
  views.account = function (S, ui) {
    const ent = Core.entitlements(S);
    return '<h2>Hesabım</h2>' +
      '<div class="card profile">' + avatar(S, 'lg') + '<div class="pb"><b>' + (S.user.name ? nt(S.user.name) : 'Profilin') + '</b><small class="muted">' + esc(ent.pkg.name) + ' paketi</small></div></div>' +
      '<div class="grid2">' +
      hubTile('settings', 'sliders', 'Ayarlar', 'Profil, dil, tema, güvenlik, yedek') +
      hubTile('packages', 'layers', 'Paketler', esc(ent.pkg.name) + ' paketi (test)') +
      hubTile('history', 'history', 'Geçmiş İşlemler', 'Eski çalışmaların') +
      hubTile('about', 'info', 'Yardım ve Bilgi', 'Sık sorulanlar, gizlilik') +
      '</div>';
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
    if (ui.selSheet) html += selSheetHtml(S, ui);
    if (ui.exportText != null) {
      html += '<div class="modal"><div class="sheet"><h3>' + esc(ui.exportTitle || 'Dışa aktarma') + '</h3>' +
        '<p class="muted small">' + esc(ui.exportNote || 'Dosya otomatik kaydedilemedi. Metni kopyalayıp bir not uygulamasına yapıştırabilirsin.') + '</p>' +
        '<textarea id="exportBox" class="inp" rows="8" readonly>' + esc(ui.exportText) + '</textarea>' +
        '<button class="btn" data-act="copyExport">' + icon('copy', 18) + ' Kopyala</button><button class="btn ghost" data-act="closeExport">Kapat</button></div></div>';
    }
    if (ui.toast) html += '<div class="toast" role="status">' + esc(ui.toast) + '</div>';
    return html;
  }

  const TAB_OF = { notes: 'tools', note: 'tools', work: 'projects', memory: 'chat', project: 'projects', task: 'projects', tasks: 'projects', money: 'tools', charts: 'tools', calc: 'tools', market: 'tools', plans: 'tools', auto: 'tools', glossary: 'tools', settings: 'account', history: 'account', packages: 'account', about: 'account' };
  function tabOf(route) { return TAB_OF[route] || (TOP.indexOf(route) !== -1 ? route : 'home'); }

  const NO_CHIP = ['welcome', 'onboarding', 'lock', 'projects', 'project', 'chat', 'memory', 'settings', 'account'];
  // Hangi projede çalıştığını her ekranda gösteren küçük gösterge
  function activeChip(S, route) {
    const p = Core.activeProject(S);
    if (!p || Core.isArchived(p) || NO_CHIP.indexOf(route) !== -1) return '';
    return '<button class="pchip" data-act="go" data-route="project" aria-label="Aktif proje"><span class="dot"></span><span class="pl">Aktif proje:</span> <b>' + esc(p.title) + '</b>' + icon('chevron', 14) + '</button>';
  }

  function parts(S, ui, now) {
    const route = ui.pinMode ? 'lock' : (views[ui.route] ? ui.route : 'home');
    return {
      route: route,
      chrome: NO_CHROME.indexOf(route) === -1,
      activeTab: tabOf(route),
      top: topHtml(S, ui),
      main: activeChip(S, route) + views[route](S, ui, now),
      layer: layerHtml(S, ui)
    };
  }

  return { tabOf: tabOf, selBarHtml: selBarHtml, noteListHtml: noteListHtml, convHtml: convHtml, esc: esc, tl: tl, icon: icon, views: views, parts: parts, catOptions: catOptions, STORAGE_KEY: STORAGE_KEY, TOP: TOP };
});
