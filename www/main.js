/* Pasif Gelirim - tarayıcı/APK denetleyicisi: gezinme, olaylar, kayıt, tema, sesli okuma, sohbet sayacı */
(function () {
  'use strict';
  var Core = window.Core, App = window.App;

  var reduce = false;
  try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }

  // ---------- Kayıt ----------
  var mem = null;                       // localStorage çalışmazsa bellekte tut
  function load() {
    try {
      var raw = window.localStorage.getItem(App.STORAGE_KEY);
      if (raw) return Core.migrate(JSON.parse(raw));
    } catch (e) { if (mem) return mem; }
    return mem || Core.defaultState();
  }
  function save() {
    mem = S;
    try { window.localStorage.setItem(App.STORAGE_KEY, JSON.stringify(S)); } catch (e) { /* sessizce geç */ }
  }

  var S = load();
  var ui = {
    route: S.user.onboarded ? 'home' : 'onboarding', onb: 0, pinMode: null, pin: '', pinMsg: '', pinTmp: '', depth: 0, quiz: null, taskId: null, narr: null, narrAnswer: '', toast: '',
    period: '7d', chartSel: null, finType: 'in', finFilter: 'all', typing: false,
    market: null, mkDays: 30, mkSel: null, exportText: null, exportTitle: '', live: !!(window.APP_CONFIG && window.APP_CONFIG.API_URL), resolvedTheme: 'dark', enter: 'fade', draft: {}
  };
  var elApp = document.getElementById('app'), elTop = document.getElementById('top'), elMain = document.getElementById('main'),
      elTabs = document.getElementById('tabs'), elLayer = document.getElementById('layer');
  var toastTimer = null, lastRoute = null;

  function now() { return Date.now(); }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }

  // ---------- Tema ----------
  function resolveTheme() {
    var t = S.settings.theme;
    if (t === 'system') {
      try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'dark'; }
    }
    return t === 'light' ? 'light' : 'dark';
  }
  // ---------- Renk ve görünüm özelleştirmesi ----------
  var PRESETS = {
    green: { d: ['#2fdc77', '#4fe88f'], l: ['#17a35a', '#0f7d43'] }, blue: { d: ['#4aa8ff', '#7bbfff'], l: ['#1f7ae0', '#155bb0'] },
    purple: { d: ['#a78bfa', '#c0a8ff'], l: ['#7c4ddb', '#5a33b0'] }, orange: { d: ['#ff9f43', '#ffb870'], l: ['#e8780c', '#b85c05'] },
    pink: { d: ['#ff6fae', '#ff94c4'], l: ['#d9347f', '#ab2563'] }, teal: { d: ['#2dd4d4', '#5ee6e6'], l: ['#0e9aa7', '#0a7580'] }
  };
  function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, t) {
    var x = hex2rgb(a), y = hex2rgb(b);
    return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(x[i] * t + y[i] * (1 - t)).toString(16)).slice(-2); }).join('');
  }
  function applyAppearance() {
    var look = S.settings.look, dark = ui.resolvedTheme === 'dark', root = document.documentElement;
    var g, g2;
    if (look.accent === 'custom' && look.custom) { g = look.custom; g2 = dark ? mix('#ffffff', g, 0.2) : mix('#000000', g, 0.25); }
    else { var pr = PRESETS[look.accent] || PRESETS.green; g = (dark ? pr.d : pr.l)[0]; g2 = (dark ? pr.d : pr.l)[1]; }
    var bg = dark ? '#080a0b' : '#f4f6f5', rgb = hex2rgb(g);
    var lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    var st = root.style;
    st.setProperty('--g', g); st.setProperty('--g2', g2); st.setProperty('--c0', g);
    st.setProperty('--gl', mix(g, bg, dark ? 0.14 : 0.12)); st.setProperty('--pill', mix(g, bg, dark ? 0.24 : 0.18));
    st.setProperty('--gr', rgb.join(',')); st.setProperty('--on-g', lum > 0.55 ? '#06110a' : '#ffffff');
    root.setAttribute('data-radius', look.radius); root.setAttribute('data-font', look.font); root.setAttribute('data-motion', look.motion);
  }
  function applyTheme() {
    var r = resolveTheme();
    ui.resolvedTheme = r;
    document.documentElement.setAttribute('data-theme', r);
    applyAppearance();
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', r === 'dark' ? '#080a0b' : '#f4f6f5');
    try {
      var sb = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar;
      if (sb) {
        sb.setBackgroundColor({ color: r === 'dark' ? '#080a0b' : '#f4f6f5' });
        sb.setStyle({ style: r === 'dark' ? 'DARK' : 'LIGHT' });   // DARK = açık renkli yazı
      }
    } catch (e) { }
  }
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (S.settings.theme === 'system') { applyTheme(); render(); }
    });
  } catch (e) { }

  // ---------- Alt menü (çizgi simgeli, hap biçimli seçili durum) ----------
  var NAV = [['home', 'home', 'Ana sayfa'], ['tasks', 'tasks', 'Görevler'], ['chat', 'chat', 'Sohbet'], ['money', 'trend', 'Kazanç'], ['packages', 'layers', 'Paketler']];
  elTabs.innerHTML = NAV.map(function (n) {
    return '<button class="tab" data-act="go" data-route="' + n[0] + '"><span class="pill">' + App.icon(n[1], 22) + '</span><small>' + n[2] + '</small></button>';
  }).join('');

  // ---------- Çizim ----------
  var DRAFT_IDS = ['finAmount', 'finNote', 'finDate', 'finCat', 'goalInput', 'budgetInput', 'chatInput', 'setName', 'finSrc', 'recAmount', 'recNote', 'recDate', 'recCat', 'recFreq', 'savName', 'savTarget', 'taxInput', 'calcPrice', 'calcCost', 'calcFee', 'calcTarget'];
  function captureDraft() {
    if (ui.noDraft) { ui.draft = {}; ui.noDraft = false; return; }   // gönderildi/kaydedildi: alanlar temizlensin
    if (lastRoute !== ui.route) { ui.draft = {}; return; }
    DRAFT_IDS.forEach(function (id) { var e = document.getElementById(id); if (e) ui.draft[id] = e.value; });
  }
  function restoreDraft() {
    DRAFT_IDS.forEach(function (id) {
      var e = document.getElementById(id);
      if (e && ui.draft[id] != null && ui.draft[id] !== '') e.value = ui.draft[id];
    });
  }

  function prepare() {
    if (ui.route !== 'auto') return;
    var ent = Core.entitlements(S), p = Core.activeProject(S);
    if (ent.ceo && p) {
      var before = S.decisions.length;
      Core.ensureDecisions(S, p, now());
      if (S.decisions.length !== before) save();
    }
  }

  function render() {
    captureDraft();
    prepare();
    var p = App.parts(S, ui, now());
    elApp.classList.toggle('no-chrome', !p.chrome);
    elApp.classList.toggle('is-lock', p.route === 'lock');
    elTop.innerHTML = p.top;
    elMain.innerHTML = p.main;
    elLayer.innerHTML = p.layer;
    restoreDraft();
    // sayfa geçiş animasyonu
    elMain.className = 'main';
    if (ui.enter && !reduce) {
      void elMain.offsetWidth;
      elMain.className = 'main anim enter-' + ui.enter;
    }
    ui.enter = '';
    // alt menü: aktif sekme
    var tabs = elTabs.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-route') === p.activeTab;
      tabs[i].classList.toggle('on', on);
      if (on) tabs[i].setAttribute('aria-current', 'page'); else tabs[i].removeAttribute('aria-current');
    }
    var box = document.getElementById('chatBox');
    if (box) box.scrollTop = box.scrollHeight;
    lastRoute = ui.route;
  }

  var lastReward = { msg: '', at: 0 };
  function toast(msg) {
    // Rozet bildirimi hemen ardından gelen genel bildirimle ezilmesin: ikisini birleştir.
    if (lastReward.msg && Date.now() - lastReward.at < 200 && msg !== lastReward.msg) msg = msg + ' · ' + lastReward.msg;
    ui.toast = msg;
    clearTimeout(toastTimer);
    var old = elLayer.querySelector('.toast'); if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    elLayer.appendChild(t);
    toastTimer = setTimeout(function () { ui.toast = ''; var x = elLayer.querySelector('.toast'); if (x) x.remove(); }, 2600);
  }

  // ---------- Gezinme (Android geri tuşu dahil) ----------
  function isTop(r) { return App.TOP.indexOf(r) !== -1; }
  function direction(a, b) {
    if (a === b) return 'fade';
    var ia = App.TOP.indexOf(a), ib = App.TOP.indexOf(b);
    if (ia !== -1 && ib !== -1) return ib > ia ? 'fwd' : 'back';
    if (ib !== -1) return 'back';
    return 'fwd';
  }
  function pushNav(route, prev) {
    try {
      if (isTop(route) || route === prev) {
        window.history.replaceState({ route: route, taskId: ui.taskId, depth: isTop(route) ? 0 : ui.depth }, '');
        if (isTop(route)) ui.depth = 0;
      } else {
        ui.depth += 1;
        window.history.pushState({ route: route, taskId: ui.taskId, depth: ui.depth }, '');
      }
    } catch (e) { }
  }
  function go(route, extra) {
    stopSpeak();
    var prev = ui.route;
    var dir = direction(prev, route);
    ui.route = route; ui.narr = null; ui.narrAnswer = ''; ui.exportText = null;
    if (route !== 'tasks') ui.quiz = null;
    if (route === 'charts') ui.chartSel = null;
    if (route !== 'money') ui.editId = null;
    if (route === 'market') setTimeout(function () { loadMarket(false); }, 0);
    if (extra) for (var k in extra) ui[k] = extra[k];
    ui.enter = dir;
    pushNav(route, prev);
    render();
    window.scrollTo(0, 0);
  }
  function back() {
    var st = null;
    try { st = window.history.state; } catch (e) { }
    if (st && st.depth > 0) { try { window.history.back(); return; } catch (e) { } }
    go('home');
  }
  window.addEventListener('popstate', function (e) {
    var st = e.state, r = (st && st.route) || (S.user.onboarded ? 'home' : 'onboarding');
    if ((r === 'welcome' || r === 'onboarding') && S.user.onboarded) r = 'home';
    if (ui.pinMode) { try { window.history.pushState({ route: ui.route, depth: ui.depth }, ''); } catch (x) { } return; }
    stopSpeak();
    ui.enter = direction(ui.route, r) === 'fwd' ? 'back' : direction(ui.route, r);
    ui.route = r; ui.depth = (st && st.depth) || 0;
    if (st && st.taskId) ui.taskId = st.taskId;
    ui.narr = null; ui.narrAnswer = ''; ui.exportText = null;
    if (r !== 'tasks') ui.quiz = null;
    render();
  });
  try { window.history.replaceState({ route: ui.route, depth: 0 }, ''); } catch (e) { }

  // ---------- Sesli okuma (cihazın kendi sesi, ücretsiz) ----------
  function stopSpeak() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { } }
  function speak(text) {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { toast('Bu cihazda sesli okuma desteklenmiyor.'); return; }
      stopSpeak();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'tr-TR'; u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) { toast('Sesli okuma başlatılamadı.'); }
  }

  // ---------- Kutlama ----------
  function celebrate(big) {
    if (reduce) return;
    var box = document.createElement('div');
    box.className = 'confetti';
    var cols = ['#2fd16b', '#7be0a4', '#e9f2ec', '#38bdf8', '#fbbf24'], n = big ? 40 : 18, html = '';
    for (var i = 0; i < n; i++) {
      html += '<span style="--x:' + Math.round(Math.random() * 100) + '%;--s:' + (5 + Math.round(Math.random() * 6)) + 'px;--d:' +
        (1.3 + Math.random() * 1.2).toFixed(2) + 's;--r:' + Math.round(Math.random() * 720 - 360) + 'deg;background:' + cols[i % cols.length] +
        ';border-radius:' + (i % 3 ? '2px' : '50%') + ';animation-delay:' + (Math.random() * 0.4).toFixed(2) + 's"></span>';
    }
    box.innerHTML = html;
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3200);
    try { if (navigator.vibrate) navigator.vibrate(big ? [30, 40, 30] : 20); } catch (e) { }
  }

  // Yeni kazanılan rozetleri ve hedefi yakala
  function earnedIds() {
    var o = {}; Core.badges(S, now()).forEach(function (b) { if (b.earned) o[b.id] = b; }); return o;
  }
  function withRewards(fn) {
    var before = earnedIds();
    var res = fn();
    var after = earnedIds(), fresh = [];
    for (var k in after) if (!before[k]) fresh.push(after[k]);
    if (fresh.length) {
      var rmsg = 'Yeni rozet: ' + fresh.map(function (b) { return b.title; }).join(', ');
      toast(rmsg);
      lastReward = { msg: rmsg, at: Date.now() };
      celebrate(fresh.some(function (b) { return b.id === 'goal' || b.id === 'project'; }));
    }
    return res;
  }

  // ---------- Dışa aktarma (APK'da paylaşma menüsü, tarayıcıda indirme, olmazsa kopyalama) ----------
  function showExportText(title, text) { ui.exportTitle = title; ui.exportText = text; render(); }
  function exportFile(name, text, mime, title) {
    var cap = window.Capacitor, P = cap && cap.Plugins;
    var native = false;
    try { native = !!(cap && cap.isNativePlatform && cap.isNativePlatform()); } catch (e) { }
    if (native && P && P.Filesystem && P.Share) {
      P.Filesystem.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' })
        .then(function (r) { return P.Share.share({ title: title, url: r.uri, dialogTitle: title }); })
        .catch(function (e) {
          if (e && /cancel/i.test(String(e.message || e))) return;
          showExportText(title, text);
        });
      return;
    }
    try {
      var blob = new Blob([text], { type: mime });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      toast('Dosya indirildi.');
    } catch (e) { showExportText(title, text); }
  }

  // ---------- Piyasa ----------
  var MK_KEY = 'pasif_market_v1', mkTimer = null;
  function mkCacheLoad() {
    try {
      var c = JSON.parse(window.localStorage.getItem(MK_KEY) || 'null');
      if (c && c.days === ui.mkDays && Array.isArray(c.items) && c.at) return c;
    } catch (e) { }
    return null;
  }
  function loadMarket(force) {
    if (!window.Market) return;
    var mk = ui.market || (ui.market = { status: 'idle', items: [], errors: [] });
    if (mk.status === 'loading') return;
    if (!mk.items.length) { var c = mkCacheLoad(); if (c) { mk.items = c.items; mk.at = c.at; mk.errors = []; } }
    if (!force && mk.at && mk.days === ui.mkDays && now() - mk.at < 60000) return;
    var days = ui.mkDays;
    mk.status = 'loading'; if (ui.route === 'market') render();
    window.Market.load(window.fetch.bind(window), days, now()).then(function (r) {
      if (days !== ui.mkDays) return;
      if (r.items.length) {
        mk.items = r.items; mk.at = r.at; mk.days = r.days; mk.errors = r.errors;
        try { window.localStorage.setItem(MK_KEY, JSON.stringify({ days: days, at: r.at, items: r.items })); } catch (e) { }
      } else { mk.errors = r.errors; if (!mk.items.length) mk.at = 0; else toast('Güncellenemedi, son veriler gösteriliyor.'); }
      mk.status = 'idle'; if (ui.route === 'market') render();
    }, function () { mk.status = 'idle'; if (ui.route === 'market') render(); });
  }
  setInterval(function () {
    if (ui.route === 'market' && !document.hidden && !ui.pinMode) loadMarket(true);
  }, 90000);

  // ---------- Sohbet ----------
  function liveUrl() {
    var c = window.APP_CONFIG;
    return c && c.API_URL ? String(c.API_URL).replace(/\/+$/, '') + '/chat' : '';
  }
  var memDevice = '';
  function deviceId() {
    var k = 'pasif_device_v1', id = '';
    try { id = window.localStorage.getItem(k) || ''; } catch (e) { }
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      id = memDevice;
      if (!id) {
        try { var a = new Uint8Array(18); window.crypto.getRandomValues(a); id = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
        catch (e) { id = (String(Math.random()).slice(2) + String(Math.random()).slice(2) + '0000000000000000').slice(0, 32); }
        memDevice = id;
      }
      try { window.localStorage.setItem(k, id); } catch (e) { }
    }
    return id;
  }
  function finishChat(replyText) {
    ui.typing = false; ui.busy = false;
    if (replyText) {
      S.chat.push({ role: 'ai', text: replyText, at: now() });
      if (S.chat.length > 200) S.chat = S.chat.slice(-200);
      save();
    }
    if (ui.route === 'chat') { render(); var i3 = document.getElementById('chatInput'); if (i3) i3.focus(); }
  }
  function askLive(url) {
    var msgs = S.chat.slice(-10).map(function (c) { return { role: c.role === 'user' ? 'user' : 'assistant', text: String(c.text || '').slice(0, 500) }; });
    var p = Core.activeProject(S);
    var ctl = null, timer = null;
    try { ctl = new AbortController(); timer = setTimeout(function () { ctl.abort(); }, 25000); } catch (e) { }
    fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
      body: JSON.stringify({ device: deviceId(), messages: msgs, ctx: { project: p ? p.title : '' } })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
    }).then(function (x) {
      clearTimeout(timer);
      if (x.ok && x.d && typeof x.d.reply === 'string' && x.d.reply) finishChat(x.d.reply);
      else { finishChat(''); toast((x.d && x.d.error) || 'Yanıt alınamadı, tekrar dene.'); }
    }, function () {
      clearTimeout(timer); finishChat('');
      toast('Bağlanamadım. İnternetini kontrol edip tekrar dene.');
    });
  }
  function sendChat(text) {
    text = String(text || '').trim(); if (!text || ui.busy) return;
    if (Core.remainingSeconds(S, now()) <= 0) { render(); return; }
    var url = liveUrl();
    var reply = url ? '' : Core.aiReply(S, text, now());
    withRewards(function () { S.chat.push({ role: 'user', text: text, at: now() }); });
    ui.typing = true; ui.busy = true; ui.noDraft = true; save(); render();
    var i2 = document.getElementById('chatInput'); if (i2) i2.focus();
    if (url) { askLive(url); return; }
    setTimeout(function () { finishChat(reply); }, reduce ? 0 : 650);
  }

  // Sohbet süre sayacı: yalnızca sohbet ekranı açıkken ve sayfa görünürken akar
  setInterval(function () {
    if (ui.route !== 'chat' || document.hidden || ui.pinMode) return;
    if (Core.remainingSeconds(S, now()) <= 0) return;
    var left = Core.addUsage(S, 1, now());
    var el = document.getElementById('timeLeft');
    if (el) el.textContent = Core.formatDuration(left);
    if (left <= 0) { save(); render(); } else if (left % 10 === 0) save();
  }, 1000);

  // ---------- PIN kilidi ----------
  var pinFails = 0, pinBlockedUntil = 0;
  function randomSalt() {
    try {
      var a = new Uint8Array(12); window.crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    } catch (e) { return String(Math.random()).slice(2) + String(now()); }
  }
  function weakHash(s) {                  // crypto.subtle yoksa yedek özet (güvenli bağlamda kullanılmaz)
    var h = 2166136261;
    for (var r = 0; r < 2000; r++) for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'w' + (h >>> 0).toString(16);
  }
  function hashPin(pin, salt) {
    var text = salt + ':' + pin + ':pasif';
    try {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        }, function () { return weakHash(text); });
      }
    } catch (e) { }
    return Promise.resolve(weakHash(text));
  }
  function pinUpdate(shake) {
    var dots = document.getElementById('pinDots');
    if (dots) {
      var is = dots.children;
      for (var i = 0; i < is.length; i++) is[i].className = i < ui.pin.length ? 'f' : '';
      if (shake) { dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); }
    }
    var m = document.querySelector('.pin-msg'); if (m) m.textContent = ui.pinMsg || '';
  }
  function pinFail(msg) {
    ui.pin = ''; ui.pinMsg = msg; pinUpdate(true);
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { }
  }
  function pinKey(k) {
    if (!ui.pinMode || ui.pinBusy) return;
    if (now() < pinBlockedUntil) { ui.pinMsg = 'Çok fazla deneme. ' + Math.ceil((pinBlockedUntil - now()) / 1000) + ' sn bekle.'; pinUpdate(false); return; }
    if (k === 'del') { ui.pin = ui.pin.slice(0, -1); ui.pinMsg = ''; pinUpdate(false); return; }
    if (!/^\d$/.test(k) || ui.pin.length >= 4) return;
    ui.pin += k; ui.pinMsg = ''; pinUpdate(false);
    if (ui.pin.length < 4) return;
    var pin = ui.pin, mode = ui.pinMode;
    ui.pinBusy = true;
    var done = function () { ui.pinBusy = false; };
    if (mode === 'new') {
      ui.pinTmp = pin; ui.pin = ''; ui.pinMode = 'confirm'; ui.pinBusy = false; render(); return;
    }
    if (mode === 'confirm') {
      if (pin !== ui.pinTmp) { ui.pinTmp = ''; ui.pinMode = 'new'; ui.pinBusy = false; ui.pin = ''; ui.pinMsg = 'PIN\'ler uyuşmadı. Yeniden belirle.'; render(); return; }
      var salt = randomSalt();
      hashPin(pin, salt).then(function (h) {
        Core.setLock(S, salt, h); save();
        ui.pinMode = null; ui.pin = ''; ui.pinTmp = ''; ui.pinBusy = false; ui.pinMsg = '';
        toast('Uygulama kilidi açıldı.'); render();
      });
      return;
    }
    // unlock | disable: doğrula
    hashPin(pin, S.lock.salt).then(function (h) {
      done();
      if (h === S.lock.hash) {
        pinFails = 0;
        if (mode === 'disable') { Core.clearLock(S); save(); toast('Uygulama kilidi kapatıldı.'); }
        ui.pinMode = null; ui.pin = ''; ui.pinMsg = ''; render();
      } else {
        pinFails += 1;
        if (pinFails >= 5) { pinBlockedUntil = now() + 30000; pinFails = 0; pinFail('Çok fazla yanlış deneme. 30 sn bekle.'); }
        else pinFail('Yanlış PIN.');
      }
    });
  }
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = now(); save(); return; }
    if (S.lock.enabled && !ui.pinMode && hiddenAt && now() - hiddenAt > 60000) {
      ui.pinMode = 'unlock'; ui.pin = ''; ui.pinMsg = ''; stopSpeak(); render();
    }
  });

  // ---------- Günlük hatırlatıcı (yalnızca Android uygulamasında) ----------
  function localNotif() {
    var cap = window.Capacitor, native = false;
    try { native = !!(cap && cap.isNativePlatform && cap.isNativePlatform()); } catch (e) { }
    return native && cap.Plugins && cap.Plugins.LocalNotifications ? cap.Plugins.LocalNotifications : null;
  }
  function cancelReminder() {
    var ln = localNotif(); if (!ln) return;
    try { ln.cancel({ notifications: [{ id: 1 }] }); } catch (e) { }
  }
  function scheduleReminder(announce) {
    var ln = localNotif();
    if (!ln) { if (announce) toast('Hatırlatıcı yalnızca Android uygulamasında çalışır; ayarın kaydedildi.'); return; }
    var parts = S.settings.reminder.time.split(':');
    ln.requestPermissions().then(function (r) {
      if (!r || r.display !== 'granted') {
        Core.setReminder(S, false, null); save(); render();
        toast('Bildirim izni verilmedi, hatırlatıcı kapalı kaldı.'); return null;
      }
      return ln.cancel({ notifications: [{ id: 1 }] }).catch(function () { }).then(function () {
        return ln.schedule({ notifications: [{ id: 1, title: 'Pasif Gelirim', body: 'Bugün küçük bir adım atmak ister misin?',
          schedule: { on: { hour: +parts[0], minute: +parts[1] } } }] });
      }).then(function () { if (announce) toast('Hatırlatıcı ' + S.settings.reminder.time + ' için ayarlandı.'); });
    }).catch(function () { if (announce) toast('Hatırlatıcı kurulamadı.'); });
  }

  // ---------- Yedekten geri yükleme ----------
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.id !== 'importFile' || !t.files || !t.files[0]) return;
    var f = t.files[0];
    if (f.size > 6 * 1024 * 1024) { toast('Dosya çok büyük.'); t.value = ''; return; }
    var rd = new FileReader();
    rd.onload = function () {
      var res = Core.importData(String(rd.result || ''));
      if (!res.ok) { toast(res.error); return; }
      if (!window.confirm('Yedekteki ' + res.counts.finance + ' kayıt ve ' + res.counts.projects + ' proje yüklenecek. Şu anki verilerinin yerine geçer. Devam edilsin mi?')) return;
      res.state.lock = S.lock;                        // kilit yedeğe girmez, mevcut kilit korunur
      res.state.user.onboarded = true;
      S = res.state; save(); applyTheme(); ui.noDraft = true; toast('Yedek geri yüklendi.'); render();
    };
    rd.onerror = function () { toast('Dosya okunamadı.'); };
    rd.readAsText(f);
    t.value = '';
  });

  // Profil fotoğrafı: seç, kare kırp, küçült, JPEG olarak sakla
  function makeAvatar(file, done) {
    var url = null, img = new Image();
    try { url = URL.createObjectURL(file); } catch (e) { done(null); return; }
    img.onload = function () {
      try {
        var c = document.createElement('canvas'), n = 256; c.width = n; c.height = n;
        var side = Math.min(img.width, img.height), sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, n, n);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, n, n);
        var d = c.toDataURL('image/jpeg', 0.82);
        if (d.length > 240000) d = c.toDataURL('image/jpeg', 0.6);
        done(d);
      } catch (e) { done(null); }
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { URL.revokeObjectURL(url); done(null); };
    img.src = url;
  }
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t) return;
    if (t.id === 'avatarFile' && t.files && t.files[0]) {
      var f = t.files[0];
      if (!/^image\//.test(f.type) || f.size > 25 * 1024 * 1024) { toast('Bir resim dosyası seç.'); t.value = ''; return; }
      makeAvatar(f, function (d) {
        if (d && Core.setAvatar(S, d)) { save(); toast('Fotoğraf güncellendi.'); render(); } else toast('Fotoğraf işlenemedi.');
      });
      t.value = '';
    } else if (t.id === 'accentCustom') {
      if (Core.setLook(S, 'custom', t.value)) { applyAppearance(); save(); render(); }
    }
  });

  // Canlı arama (yeniden çizmeden, odak kaybolmasın)
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t) return;
    if (t.id === 'mkAmount') {
      var box = document.getElementById('mkConv'); if (box && ui.market) box.innerHTML = App.convHtml(ui.market.items, t.value);
      return;
    }
    if (t.id === 'finSearch' || t.id === 'glossQ') {
      var q = t.value.trim().toLocaleLowerCase('tr'), n = 0;
      var items = document.querySelectorAll(t.id === 'finSearch' ? 'li.fin' : '#glossList details');
      for (var i = 0; i < items.length; i++) {
        var hit = !q || (items[i].getAttribute('data-q') || '').indexOf(q) !== -1;
        items[i].hidden = !hit; if (hit) n++;
      }
      var em = document.getElementById('glossEmpty'); if (em) em.hidden = n > 0;
    }
  });

  // Klavye açıkken alt menüyü gizle (küçük ekranlarda yer açar)
  document.addEventListener('focusin', function (e) {
    var n = e.target && e.target.tagName;
    if (n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT') elApp.classList.add('kb');
  });
  document.addEventListener('focusout', function () {
    setTimeout(function () {
      var a = document.activeElement, n = a && a.tagName;
      if (n !== 'INPUT' && n !== 'TEXTAREA' && n !== 'SELECT') elApp.classList.remove('kb');
    }, 60);
  });

  // ---------- Olaylar ----------
  var actions = {
    start: function () { S.user.name = val('nameInput').trim(); S.user.onboarded = true; save(); go('home'); },
    onbNext: function () {
      if (ui.onb >= 2) { ui.enter = 'fwd'; ui.route = 'welcome'; render(); return; }
      ui.onb += 1; ui.enter = 'fwd'; render();
    },
    onbSkip: function () { ui.enter = 'fwd'; ui.route = 'welcome'; render(); },
    quickAdd: function (el) {
      go('money', { finType: el.getAttribute('data-v') === 'out' ? 'out' : 'in' });
      var a = document.getElementById('finAmount');
      if (a) { try { a.scrollIntoView({ block: 'center' }); } catch (e) { } }
    },
    go: function (el) { go(el.getAttribute('data-route')); },
    back: function () { back(); },
    toggleTheme: function () {
      Core.setTheme(S, ui.resolvedTheme === 'dark' ? 'light' : 'dark'); applyTheme(); save(); render();
    },
    setTheme: function (el) { Core.setTheme(S, el.getAttribute('data-v')); applyTheme(); save(); render(); },
    quizStart: function () { ui.quiz = { step: 0, answers: {} }; ui.route = 'tasks'; ui.enter = 'fade'; render(); },
    quizCancel: function () { ui.quiz = null; render(); },
    answer: function (el) {
      ui.quiz.answers[el.getAttribute('data-q')] = el.getAttribute('data-v');
      ui.quiz.step += 1; ui.enter = 'fwd'; render(); window.scrollTo(0, 0);
    },
    pickModel: function (el) {
      if (!Core.entitlements(S).selectModel) { toast('Model seçmek için Manuel paket gerekir.'); return; }
      Core.startProject(S, el.getAttribute('data-id'), now());
      ui.quiz = null; save(); toast('Proje başlatıldı!'); celebrate(false); go('tasks');
    },
    switchProject: function (el) { S.activeProjectId = el.getAttribute('data-id'); save(); ui.enter = 'fade'; render(); },
    viewProject: function (el) { S.activeProjectId = el.getAttribute('data-id'); save(); go('tasks'); },
    openTask: function (el) { go('task', { taskId: el.getAttribute('data-id') }); },
    toggleTask: function (el) {
      var p = Core.activeProject(S); if (!p) return;
      var id = el.getAttribute('data-id');
      var cur = p.tasks[id] && p.tasks[id].done;
      Core.setTaskNote(S, p.id, id, val('noteInput'), now());
      withRewards(function () { Core.setTaskDone(S, p.id, id, !cur, now()); });
      save();
      if (cur) { toast('Görev tekrar açıldı.'); render(); return; }
      var nt = Core.nextTask(p);
      if (nt) { toast('Görev tamamlandı.'); celebrate(false); go('task', { taskId: nt.id }); }
      else { toast('Tebrikler, tüm görevleri tamamladın.'); celebrate(true); go('tasks'); }
    },
    narrOpen: function () { ui.narr = Core.entitlements(S).narration ? 'panel' : 'offer'; render(); },
    narrClose: function () { stopSpeak(); ui.narr = null; ui.narrAnswer = ''; render(); },
    buyNarr: function () {
      if (Core.buyNarration(S)) { save(); toast('Yapay zekâlı anlatım açıldı (test).'); ui.narr = (ui.route === 'task') ? 'panel' : null; render(); }
      else toast('Bu ek yalnızca Manuel pakette satın alınır.');
    },
    cancelNarr: function () { Core.cancelNarration(S); save(); render(); },
    speak: function (el) {
      var p = Core.activeProject(S); var m = p && Core.modelById(p.modelId);
      var t = m && m.tasks.find(function (x) { return x.id === el.getAttribute('data-id'); });
      if (t) speak(t.title + '. ' + t.body);
    },
    stopSpeak: function () { stopSpeak(); },
    askNarr: function () {
      var q = val('askInput').trim(); if (!q) return;
      var terms = Core.explainTerm(q);
      ui.narrAnswer = terms.length ? terms.join('\n\n') : Core.aiReply(S, q, now());
      render(); speak(ui.narrAnswer);
    },
    send: function () { sendChat(val('chatInput')); },
    suggest: function (el) { sendChat(el.getAttribute('data-t')); },
    finType: function (el) {
      ui.finType = el.getAttribute('data-v') === 'out' ? 'out' : 'in';
      var btns = elMain.querySelectorAll('[data-act=finType]');
      for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i].getAttribute('data-v') === ui.finType);
      var cat = document.getElementById('finCat'); if (cat) cat.innerHTML = App.catOptions(ui.finType);
    },
    finFilter: function (el) { ui.finFilter = el.getAttribute('data-v'); render(); },
    addFin: function () {
      var entry = { type: ui.finType, amount: val('finAmount'), cat: val('finCat'), date: val('finDate'), note: val('finNote'), src: val('finSrc') };
      var editing = !!ui.editId;
      var rec = withRewards(function () {
        return editing ? Core.updateFinance(S, ui.editId, entry, now()) : Core.addFinance(S, entry, now());
      });
      if (!rec) { toast('Tutarı ve tarihi kontrol et (gelecek tarih olamaz).'); return; }
      ui.editId = null; ui.noDraft = true; save(); toast(editing ? 'Kayıt güncellendi.' : 'Kaydedildi.'); render();
    },
    editFin: function (el) {
      var r = S.finance.find(function (x) { return x.id === el.getAttribute('data-id'); }); if (!r) return;
      ui.editId = r.id; ui.finType = r.type; ui.noDraft = true; ui.enter = 'fade'; render();
      var f = document.getElementById('finForm'); if (f) { try { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { } }
    },
    cancelEdit: function () { ui.editId = null; ui.noDraft = true; render(); },
    saveBudget: function () {
      if (!Core.setBudget(S, val('budgetInput'))) { toast('Geçerli bir tutar yaz.'); return; }
      ui.noDraft = true; save(); toast('Bütçe kaydedildi.'); render();
    },
    recType: function (el) {
      ui.recType = el.getAttribute('data-v') === 'in' ? 'in' : 'out';
      var btns = elMain.querySelectorAll('[data-act=recType]');
      for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i].getAttribute('data-v') === ui.recType);
      var cat = document.getElementById('recCat'); if (cat) cat.innerHTML = App.catOptions(ui.recType);
    },
    recAdd: function () {
      var r = Core.addRecurring(S, { type: ui.recType === 'in' ? 'in' : 'out', amount: val('recAmount'), cat: val('recCat'), freq: val('recFreq'), date: val('recDate'), note: val('recNote') }, now());
      if (!r) { toast('Tutarı ve tarihi kontrol et.'); return; }
      var made = Core.applyRecurring(S, now());
      ui.noDraft = true; save(); toast(made ? 'Kaydedildi, ' + made + ' kayıt eklendi.' : 'Tekrarlayan kayıt eklendi.'); render();
    },
    recToggle: function (el) { Core.toggleRecurring(S, el.getAttribute('data-id'), now()); save(); render(); },
    recDel: function (el) {
      if (!window.confirm('Bu tekrarlayan kayıt silinsin mi? Daha önce eklenen kayıtlar kalır.')) return;
      Core.removeRecurring(S, el.getAttribute('data-id')); save(); render();
    },
    savAdd: function () {
      if (!Core.addSaving(S, val('savName'), val('savTarget'), now())) { toast('Ad ve geçerli bir hedef tutar yaz.'); return; }
      ui.noDraft = true; save(); toast('Birikim hedefi oluşturuldu.'); render();
    },
    savMoney: function (el) {
      var id = el.getAttribute('data-id'), sign = el.getAttribute('data-s') === '-1' ? -1 : 1;
      var amt = Number(String(val('savAmt_' + id)).replace(',', '.'));
      if (!isFinite(amt) || amt <= 0 || !Core.contributeSaving(S, id, sign * amt)) { toast('Geçerli bir tutar yaz.'); return; }
      var v = S.savings.find(function (x) { return x.id === id; });
      save(); render();
      if (v && Core.savingProgress(v).reached && sign > 0) { toast('Birikim hedefine ulaştın.'); celebrate(true); }
    },
    savDel: function (el) {
      if (!window.confirm('Bu birikim hedefi silinsin mi?')) return;
      Core.removeSaving(S, el.getAttribute('data-id')); save(); render();
    },
    taxSave: function () {
      var v = val('taxInput').trim();
      if (!Core.setTaxPct(S, v === '' ? 0 : v)) { toast('0 ile 60 arasında bir yüzde yaz.'); return; }
      ui.noDraft = true; save(); toast('Kaydedildi.'); render();
    },
    mkRefresh: function () { loadMarket(true); },
    mkPeriod: function (el) {
      var d = parseInt(el.getAttribute('data-v'), 10); if (d !== 7 && d !== 30 && d !== 90) return;
      ui.mkDays = d; if (ui.market) { ui.market.items = []; ui.market.at = 0; }
      ui.enter = 'fade'; loadMarket(true);
    },
    mkSel: function (el) { ui.mkSel = el.getAttribute('data-id'); render(); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { } },
    calcRun: function () {
      ui.calcRes = Core.calcSales({ price: val('calcPrice'), cost: val('calcCost'), fee: val('calcFee'), target: val('calcTarget') });
      render();
    },
    delFin: function (el) {
      if (!window.confirm('Bu kayıt silinsin mi?')) return;
      Core.removeFinance(S, el.getAttribute('data-id')); save(); render();
    },
    saveGoal: function () {
      var ok = withRewards(function () { return Core.setGoal(S, val('goalInput')); });
      if (!ok) { toast('Geçerli bir tutar yaz.'); return; }
      ui.noDraft = true; save(); toast('Hedef kaydedildi.'); render();
    },
    period: function (el) { ui.period = el.getAttribute('data-v'); ui.chartSel = null; ui.enter = 'fade'; render(); },
    chartPick: function (el) { ui.chartSel = parseInt(el.getAttribute('data-i'), 10); render(); },
    makePlan: function () {
      var p = Core.activeProject(S); if (!p || !Core.entitlements(S).automation) return;
      withRewards(function () { Core.generatePlan(S, p, parseInt(val('planDays'), 10) || 7, now()); });
      save(); toast('Plan hazırlandı.'); render();
    },
    copyPlan: function (el) {
      var pl = S.plans.find(function (x) { return x.id === el.getAttribute('data-id'); }); if (!pl) return;
      try { navigator.clipboard.writeText(pl.text).then(function () { toast('Kopyalandı.'); }, function () { toast('Kopyalanamadı.'); }); }
      catch (e) { toast('Kopyalanamadı.'); }
    },
    decide: function (el) { Core.decide(S, el.getAttribute('data-id'), el.getAttribute('data-s'), now()); save(); render(); },
    setPkg: function (el) {
      var id = el.getAttribute('data-id');
      if (id === 'free' && !window.confirm('Aboneliği bitirmek istediğinden emin misin? (test) Kurduğun iş sende kalır, otomasyonlar durur.')) return;
      Core.setPackage(S, id, now()); save(); toast(id === 'free' ? 'Ücretsiz pakete dönüldü.' : 'Paket değişti (test).'); render();
    },
    saveName: function () { S.user.name = val('setName').trim(); save(); toast('Kaydedildi.'); render(); },
    export: function () { exportFile('pasif-gelirim-verilerim.json', Core.exportData(S), 'application/json', 'Verilerim (JSON)'); },
    exportCsv: function () { exportFile('pasif-gelirim-kayitlar.csv', Core.exportCsv(S), 'text/csv;charset=utf-8', 'Gelir-gider kayıtları (CSV)'); },
    copyExport: function () {
      var t = ui.exportText || '';
      try { navigator.clipboard.writeText(t).then(function () { toast('Kopyalandı.'); }, fallbackCopy); } catch (e) { fallbackCopy(); }
      function fallbackCopy() {
        var b = document.getElementById('exportBox');
        if (b) { b.removeAttribute('readonly'); b.select(); try { document.execCommand('copy'); toast('Kopyalandı.'); } catch (e) { toast('Metni elle seçip kopyala.'); } }
      }
    },
    closeExport: function () { ui.exportText = null; ui.exportNote = ''; render(); },
    wipe: function (skipConfirm) {
      if (skipConfirm !== true && !window.confirm('Tüm verilerin kalıcı olarak silinecek. Emin misin?')) return;
      S = Core.defaultState(); mem = null;
      try { window.localStorage.removeItem(App.STORAGE_KEY); } catch (e) { }
      applyTheme(); ui.noDraft = true; ui.depth = 0; ui.onb = 0; ui.pinMode = null;
      cancelReminder();
      go('onboarding');
    },
    // ---- PIN kilidi ----
    lockOn: function () { ui.pinMode = 'new'; ui.pin = ''; ui.pinMsg = ''; ui.pinTmp = ''; render(); },
    lockOff: function () { ui.pinMode = 'disable'; ui.pin = ''; ui.pinMsg = ''; render(); },
    pinCancel: function () { ui.pinMode = null; ui.pin = ''; ui.pinMsg = ''; ui.pinTmp = ''; render(); },
    pinForgot: function () {
      if (!window.confirm('PIN\'i kurtarmanın yolu yok: kilidi açmak için uygulama verileri silinir. Devam edilsin mi?')) return;
      actions.wipe(true);
    },
    pinKey: function (el) { pinKey(el.getAttribute('data-v')); },
    // ---- Yedek, hatırlatıcı, tanılama ----
    importPick: function () { var f = document.getElementById('importFile'); if (f) f.click(); },
    remToggle: function (el) {
      var on = el.getAttribute('data-v') === 'on';
      Core.setReminder(S, on, null); save();
      if (on) scheduleReminder(true); else cancelReminder();
      render();
    },
    saveReminder: function () {
      if (!Core.setReminder(S, null, val('remTime'))) { toast('Saati kontrol et.'); return; }
      save();
      if (S.settings.reminder.enabled) scheduleReminder(true); else toast('Saat kaydedildi.');
      render();
    },
    diag: function () {
      var cap = window.Capacitor, native = false;
      try { native = !!(cap && cap.isNativePlatform && cap.isNativePlatform()); } catch (e) { }
      var t = ['Pasif Gelirim ' + Core.APP_VERSION, 'Platform: ' + (native ? 'Android uygulaması' : 'tarayıcı'),
        'Tema: ' + S.settings.theme + ' (' + ui.resolvedTheme + ')', 'Paket: ' + S.pkg,
        'Kayıt: ' + S.finance.length + ' · Proje: ' + S.projects.length, 'Kilit: ' + (S.lock.enabled ? 'açık' : 'kapalı'),
        'Hatırlatıcı: ' + (S.settings.reminder.enabled ? S.settings.reminder.time : 'kapalı'),
        'Ekran: ' + window.innerWidth + 'x' + window.innerHeight, 'Cihaz: ' + (navigator.userAgent || '')].join('\n');
      ui.exportNote = 'Bir sorun yaşarsan bu bilgiyi kopyalayıp bana gönderebilirsin. Kişisel veri (adın, tutarlar) içermez.';
      showExportText('Tanılama bilgisi', t);
    },
    setAccent: function (el) { if (Core.setLook(S, 'accent', el.getAttribute('data-v'))) { applyAppearance(); save(); render(); } },
    setFont: function (el) { Core.setLook(S, 'font', el.getAttribute('data-v')); applyAppearance(); save(); render(); },
    setRadius: function (el) { Core.setLook(S, 'radius', el.getAttribute('data-v')); applyAppearance(); save(); render(); },
    setMotion: function (el) { Core.setLook(S, 'motion', el.getAttribute('data-v')); applyAppearance(); save(); render(); },
    homeSpend: function (el) { Core.setLook(S, 'home.spend', el.getAttribute('data-v') === 'on'); save(); render(); },
    homeStreak: function (el) { Core.setLook(S, 'home.streak', el.getAttribute('data-v') === 'on'); save(); render(); },
    homeChecklist: function (el) { Core.setLook(S, 'home.checklist', el.getAttribute('data-v') === 'on'); save(); render(); },
    avatarPick: function () { var f = document.getElementById('avatarFile'); if (f) f.click(); },
    avatarDel: function () { Core.setAvatar(S, ''); save(); toast('Fotoğraf kaldırıldı.'); render(); },
    resetUsage: function () { S.usage.seconds = 0; S.usage.date = Core.dayKey(now()); save(); toast('Sohbet süresi sıfırlandı.'); render(); },
    fillUsage: function () { Core.addUsage(S, 999999, now()); save(); toast('Süre bitirildi.'); render(); }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var fn = actions[el.getAttribute('data-act')];
    if (fn) { try { fn(el); } catch (err) { toast('Bir hata oluştu: ' + err.message); render(); } }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var id = e.target && e.target.id;
    if (id === 'chatInput') actions.send();
    else if (id === 'askInput') actions.askNarr();
    else if (id === 'nameInput') actions.start();
    else if (id === 'goalInput') actions.saveGoal();
    else if (id === 'finNote' || id === 'finAmount') actions.addFin();
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-change') === 'note') {
      var p = Core.activeProject(S);
      if (p) { Core.setTaskNote(S, p.id, t.getAttribute('data-id'), t.value, now()); save(); }
    }
  });
  window.addEventListener('error', function (e) { try { toast('Hata: ' + e.message); } catch (x) { } });

  // ---------- Başlat ----------
  applyTheme();
  function runRecurring() {
    var n = Core.applyRecurring(S, now());
    if (n) { save(); toast(n + ' tekrarlayan kayıt eklendi.'); }
    return n;
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && runRecurring()) render(); });
  runRecurring();
  if (S.lock.enabled) { ui.pinMode = 'unlock'; }
  render();
  if (S.settings.reminder.enabled) scheduleReminder(false);
  setTimeout(function () { var s = document.getElementById('splash'); if (s) s.remove(); }, reduce ? 100 : 1750);
})();
