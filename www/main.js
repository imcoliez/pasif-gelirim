/* Pasif Gelirim - tarayıcı/APK denetleyicisi: olaylar, kayıt, sesli okuma, sohbet sayacı */
(function () {
  'use strict';
  var Core = window.Core, App = window.App, Data = window.Data;

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
  var ui = { route: S.user.name ? 'home' : 'welcome', quiz: null, taskId: null, narr: null, narrAnswer: '', toast: '' };
  var root = document.getElementById('app');
  var toastTimer = null;

  function now() { return Date.now(); }

  function toast(msg) {
    ui.toast = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast = ''; var t = document.querySelector('.toast'); if (t) t.remove(); }, 2500);
  }

  function render() {
    root.innerHTML = App.shell(S, ui, now());
    var box = document.getElementById('chatBox');
    if (box) box.scrollTop = box.scrollHeight;
  }
  function go(route) {
    stopSpeak();
    ui.route = route; ui.narr = null; ui.narrAnswer = ''; if (route !== 'tasks') ui.quiz = null;
    render(); window.scrollTo(0, 0);
  }

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

  // ---------- Sohbet süre sayacı: yalnızca sohbet ekranı açıkken ve sayfa görünürken akar ----------
  setInterval(function () {
    if (ui.route !== 'chat' || document.hidden) return;
    if (Core.remainingSeconds(S, now()) <= 0) return;
    var left = Core.addUsage(S, 1, now());
    var el = document.getElementById('timeLeft');
    if (el) el.textContent = Core.formatDuration(left);
    if (left <= 0) { save(); render(); } else if (left % 10 === 0) save();
  }, 1000);

  // ---------- Olaylar ----------
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }

  var actions = {
    start: function () {
      var n = val('nameInput').trim();
      S.user.name = n; save(); go('home');
    },
    go: function (el) { go(el.getAttribute('data-route')); },
    quizStart: function () { ui.quiz = { step: 0, answers: {} }; ui.route = 'tasks'; render(); },
    quizCancel: function () { ui.quiz = null; render(); },
    answer: function (el) {
      ui.quiz.answers[el.getAttribute('data-q')] = el.getAttribute('data-v');
      ui.quiz.step += 1; render(); window.scrollTo(0, 0);
    },
    pickModel: function (el) {
      if (!Core.entitlements(S).selectModel) { toast('Model seçmek için Manuel paket gerekir.'); return; }
      Core.startProject(S, el.getAttribute('data-id'), now());
      ui.quiz = null; save(); toast('Proje başlatıldı!'); go('tasks');
    },
    switchProject: function (el) { S.activeProjectId = el.getAttribute('data-id'); save(); render(); },
    viewProject: function (el) { S.activeProjectId = el.getAttribute('data-id'); save(); go('tasks'); },
    openTask: function (el) { ui.taskId = el.getAttribute('data-id'); ui.route = 'task'; ui.narr = null; ui.narrAnswer = ''; render(); window.scrollTo(0, 0); },
    toggleTask: function (el) {
      var p = Core.activeProject(S); if (!p) return;
      var id = el.getAttribute('data-id');
      var cur = p.tasks[id] && p.tasks[id].done;
      var note = val('noteInput'); if (note !== undefined) Core.setTaskNote(S, p.id, id, note, now());
      Core.setTaskDone(S, p.id, id, !cur, now()); save();
      toast(cur ? 'Görev tekrar açıldı.' : 'Görev tamamlandı! 👏');
      if (!cur) { var nt = Core.nextTask(p); if (nt) { ui.taskId = nt.id; } else { ui.route = 'tasks'; } }
      render(); window.scrollTo(0, 0);
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
    send: function () {
      var inp = document.getElementById('chatInput'); if (!inp) return;
      var text = inp.value.trim(); if (!text) return;
      if (Core.remainingSeconds(S, now()) <= 0) { render(); return; }
      S.chat.push({ role: 'user', text: text, at: now() });
      S.chat.push({ role: 'ai', text: Core.aiReply(S, text, now()), at: now() });
      if (S.chat.length > 200) S.chat = S.chat.slice(-200);
      save(); render();
      var i2 = document.getElementById('chatInput'); if (i2) i2.focus();
    },
    addFin: function () {
      var rec = Core.addFinance(S, { type: val('finType'), amount: val('finAmount'), note: val('finNote') }, now());
      if (!rec) { toast('Geçerli bir tutar yaz (0\'dan büyük).'); return; }
      save(); toast('Kaydedildi.'); render();
    },
    delFin: function (el) { Core.removeFinance(S, el.getAttribute('data-id')); save(); render(); },
    makePlan: function () {
      var p = Core.activeProject(S); if (!p || !Core.entitlements(S).automation) return;
      Core.generatePlan(S, p, parseInt(val('planDays'), 10) || 7, now()); save(); toast('Plan hazırlandı.'); render();
    },
    copyPlan: function (el) {
      var pl = S.plans.find(function (x) { return x.id === el.getAttribute('data-id'); }); if (!pl) return;
      try { navigator.clipboard.writeText(pl.text).then(function () { toast('Kopyalandı.'); render(); }, function () { toast('Kopyalanamadı.'); render(); }); }
      catch (e) { toast('Kopyalanamadı.'); render(); }
    },
    decide: function (el) { Core.decide(S, el.getAttribute('data-id'), el.getAttribute('data-s'), now()); save(); render(); },
    setPkg: function (el) {
      var id = el.getAttribute('data-id');
      if (id === 'free' && !window.confirm('Aboneliği bitirmek istediğinden emin misin? (test) Kurduğun iş sende kalır, otomasyonlar durur.')) return;
      Core.setPackage(S, id, now()); save(); toast(id === 'free' ? 'Ücretsiz pakete dönüldü.' : 'Paket değişti (test).'); render();
    },
    saveName: function () { S.user.name = val('setName').trim(); save(); toast('Kaydedildi.'); render(); },
    export: function () {
      var json = Core.exportData(S);
      try {
        var blob = new Blob([json], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'pasif-gelirim-verilerim.json';
        document.body.appendChild(a); a.click(); a.remove();
        toast('Dosya indirildi.');
      } catch (e) { toast('Dışa aktarma başarısız.'); }
      render();
    },
    wipe: function () {
      if (!window.confirm('Tüm verilerin kalıcı olarak silinecek. Emin misin?')) return;
      S = Core.defaultState(); mem = null;
      try { window.localStorage.removeItem(App.STORAGE_KEY); } catch (e) { }
      ui = { route: 'welcome', quiz: null, taskId: null, narr: null, narrAnswer: '', toast: '' }; render();
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
    if (e.target && e.target.id === 'chatInput') actions.send();
    else if (e.target && e.target.id === 'askInput') actions.askNarr();
    else if (e.target && e.target.id === 'nameInput') actions.start();
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-change') === 'note') {
      var p = Core.activeProject(S);
      if (p) { Core.setTaskNote(S, p.id, t.getAttribute('data-id'), t.value, now()); save(); }
    }
  });
  window.addEventListener('error', function (e) { try { toast('Hata: ' + e.message); } catch (x) { } });
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });

  render();
})();
