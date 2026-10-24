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
    exportText: null, exportTitle: '', resolvedTheme: 'dark', enter: 'fade', draft: {}
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
  function applyTheme() {
    var r = resolveTheme();
    ui.resolvedTheme = r;
    document.documentElement.setAttribute('data-theme', r);
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
  var DRAFT_IDS = ['finAmount', 'finNote', 'finDate', 'finCat', 'goalInput', 'chatInput', 'setName'];
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

  // ---------- Sohbet ----------
  function sendChat(text) {
    text = String(text || '').trim(); if (!text) return;
    if (Core.remainingSeconds(S, now()) <= 0) { render(); return; }
    var reply = Core.aiReply(S, text, now());
    withRewards(function () { S.chat.push({ role: 'user', text: text, at: now() }); });
    ui.typing = true; ui.noDraft = true; save(); render();
    var i2 = document.getElementById('chatInput'); if (i2) i2.focus();
    setTimeout(function () {
      ui.typing = false;
      S.chat.push({ role: 'ai', text: reply, at: now() });
      if (S.chat.length > 200) S.chat = S.chat.slice(-200);
      save();
      if (ui.route === 'chat') { render(); var i3 = document.getElementById('chatInput'); if (i3) i3.focus(); }
    }, reduce ? 0 : 650);
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
      var rec = withRewards(function () {
        return Core.addFinance(S, { type: ui.finType, amount: val('finAmount'), cat: val('finCat'), date: val('finDate'), note: val('finNote') }, now());
      });
      if (!rec) { toast('Tutarı ve tarihi kontrol et (gelecek tarih olamaz).'); return; }
      ui.noDraft = true; save(); toast('Kaydedildi.'); render();
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
  if (S.lock.enabled) { ui.pinMode = 'unlock'; }
  render();
  if (S.settings.reminder.enabled) scheduleReminder(false);
  setTimeout(function () { var s = document.getElementById('splash'); if (s) s.remove(); }, reduce ? 100 : 1750);
})();
