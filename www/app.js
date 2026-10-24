/* Pasif Gelirim - arayüz. Görünümler saf fonksiyondur (durum -> HTML), böylece Node'da da test edilir. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./data.js'));
  else root.App = factory(root.Core, root.Data);
})(typeof self !== 'undefined' ? self : this, function (Core, Data) {

  const STORAGE_KEY = 'pasif_gelirim_state_v1';

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

  // ---------- Görünümler ----------
  const views = {};

  views.welcome = function (S) {
    return '<div class="welcome">' +
      '<div class="logo">💚</div><h1>Pasif Gelirim</h1><p class="slogan">DAHA FAZLASI MÜMKÜN.</p>' +
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
    let html = '<h2>Merhaba' + (S.user.name ? ' ' + esc(S.user.name) : '') + ' 👋</h2>';
    html += '<div class="chip">' + ent.pkg.emoji + ' ' + esc(ent.pkg.name) + ' paketi</div>';
    if (S.cancelledAt && ent.pkg.tier === 0) {
      html += '<div class="card note">Aboneliğin sona erdi. Kurduğun işe manuel devam edebilir, eski çalışmalarına ↶ Geçmiş İşlemler\'den ulaşabilirsin.</div>';
    }
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
    const ent = Core.entitlements(S);
    const p = Core.activeProject(S);
    if (!p) return lock('Önce bir proje seç.', 'Görevlere git', 'tasks');
    const m = Core.modelById(p.modelId);
    const t = m.tasks.find(function (x) { return x.id === ui.taskId; });
    if (!t) return lock('Görev bulunamadı.', 'Görevlere git', 'tasks');
    const st = p.tasks[t.id] || { done: false, note: '' };
    let html = '<button class="link" data-act="go" data-route="tasks">← Görevler</button><h2>' + esc(t.title) + '</h2>' +
      '<div class="card"><p>' + nl2br(t.body) + '</p></div>' +
      '<label class="lbl" for="noteInput">Notların</label>' +
      '<textarea id="noteInput" class="inp" rows="4" data-change="note" data-id="' + esc(t.id) + '" placeholder="Bu görevle ilgili yazdıkların burada saklanır">' + esc(st.note) + '</textarea>' +
      '<button class="btn ' + (st.done ? 'ghost' : '') + '" data-act="toggleTask" data-id="' + esc(t.id) + '">' + (st.done ? 'Tamamlandı ✅ (geri al)' : 'Görevi tamamladım') + '</button>';
    if (ent.pkg.tier >= 1) html += '<button class="heart" data-act="narrOpen" aria-label="Yapay zekâlı anlatım">💚</button>';
    if (ui.narr === 'offer') html += offerModal();
    if (ui.narr === 'panel') html += narrationPanel(S, ui, t);
    return html;
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
    html += '</div>';
    if (left <= 0) {
      html += '<div class="card note">Bugünkü 1 saatlik ücretsiz sohbet hakkın doldu. Yarın yenilenir.</div>';
    } else {
      html += '<div class="send"><input id="chatInput" class="inp" placeholder="Sorunu yaz..." maxlength="500"><button class="btn" data-act="send">Gönder</button></div>';
    }
    return html;
  };

  views.money = function (S, ui, now) {
    const ent = Core.entitlements(S);
    if (!ent.finance) return '<h2>Kazanç</h2>' + lock('Gelir-gider takibi Manuel pakette açılır.', 'Paketlere bak', 'packages');
    const f = Core.financeSummary(S, now);
    let html = '<h2>💰 Gelir - Gider</h2>' +
      '<div class="grid2"><div class="stat"><small>Bu ay net</small><b>' + tl(f.monthNet) + '</b></div><div class="stat"><small>Toplam net</small><b>' + tl(f.net) + '</b></div>' +
      '<div class="stat in"><small>Toplam gelir</small><b>' + tl(f.totalIn) + '</b></div><div class="stat out"><small>Toplam gider</small><b>' + tl(f.totalOut) + '</b></div></div>' +
      '<div class="card"><label class="lbl" for="finType">Tür</label><select id="finType" class="inp"><option value="in">Gelir</option><option value="out">Gider</option></select>' +
      '<label class="lbl" for="finAmount">Tutar (TL)</label><input id="finAmount" class="inp" inputmode="decimal" placeholder="0,00">' +
      '<label class="lbl" for="finNote">Not</label><input id="finNote" class="inp" maxlength="120" placeholder="Örn: ilk satış">' +
      '<button class="btn" data-act="addFin">Kaydet</button></div>' +
      '<p class="fine">Gerçek rakamlarını yaz. Amaç kendini kandırmadan ilerlemeyi görmek.</p><ul class="list">';
    S.finance.slice().reverse().forEach(function (r) {
      html += '<li class="fin ' + r.type + '"><span>' + Core.formatDate(r.date) + ' · ' + esc(r.note || (r.type === 'in' ? 'Gelir' : 'Gider')) + '</span>' +
        '<b>' + (r.type === 'in' ? '+' : '−') + tl(r.amount) + '</b><button class="x" data-act="delFin" data-id="' + esc(r.id) + '" aria-label="Sil">✕</button></li>';
    });
    html += '</ul>';
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
      const ds = Core.ensureDecisions(S, p, now);
      const all = S.decisions.filter(function (d) { return d.projectId === p.id; }).slice().reverse();
      all.forEach(function (d) {
        html += '<div class="card"><p><b>' + esc(d.text) + '</b></p>' +
          (d.status === 'bekliyor'
            ? '<div class="row"><button class="btn" data-act="decide" data-id="' + esc(d.id) + '" data-s="onaylandı">Onayla</button><button class="btn ghost" data-act="decide" data-id="' + esc(d.id) + '" data-s="reddedildi">Reddet</button></div>'
            : '<span class="chip">' + esc(d.status) + '</span>') + '</div>';
      });
      void ds;
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

  views.settings = function (S) {
    return '<h2>⚙ Ayarlar</h2><div class="card"><label class="lbl" for="setName">Adın</label>' +
      '<input id="setName" class="inp" maxlength="30" value="' + esc(S.user.name) + '"><button class="btn" data-act="saveName">Kaydet</button></div>' +
      '<div class="card"><b>Verilerin</b><p class="muted">Veriler şu an yalnızca bu cihazda saklanır. İstediğin zaman dışa aktarabilir veya silebilirsin.</p>' +
      '<button class="btn" data-act="export">Verilerimi dışa aktar (JSON)</button>' +
      '<button class="btn danger" data-act="wipe">Tüm verilerimi sil</button></div>' +
      '<div class="card"><b>Test araçları</b><p class="muted">Yalnızca geliştirme sürecinde kullanılır.</p>' +
      '<button class="btn ghost" data-act="resetUsage">Bugünkü sohbet süresini sıfırla</button>' +
      '<button class="btn ghost" data-act="fillUsage">Sohbet süresini bitir (sınırı test et)</button></div>' +
      '<p class="fine">Pasif Gelirim · sürüm 0.1 (test)</p>';
  };

  const TABS = [
    { r: 'home', i: '🏠', t: 'Ana' }, { r: 'tasks', i: '✅', t: 'Görevler' }, { r: 'chat', i: '💬', t: 'Sohbet' },
    { r: 'money', i: '💰', t: 'Kazanç' }, { r: 'packages', i: '📦', t: 'Paketler' }
  ];

  function shell(S, ui, now) {
    const route = ui.route;
    const inner = (views[route] || views.home)(S, ui, now);
    if (route === 'welcome') return inner + toastHtml(ui);
    const activeTab = (route === 'task') ? 'tasks' : route;
    let html = '<header class="top"><b>Pasif Gelirim 💚</b><div class="top-r">' +
      '<button class="icon" data-act="go" data-route="history" title="Geçmiş İşlemler" aria-label="Geçmiş İşlemler"><span class="ic">↶</span><small>Geçmiş</small></button>' +
      '<button class="icon" data-act="go" data-route="settings" title="Ayarlar" aria-label="Ayarlar"><span class="ic">⚙</span></button></div></header>' +
      '<main class="main">' + inner + '</main><nav class="tabs">';
    TABS.forEach(function (t) {
      html += '<button class="tab ' + (activeTab === t.r ? 'on' : '') + '" data-act="go" data-route="' + t.r + '"><span>' + t.i + '</span><small>' + t.t + '</small></button>';
    });
    html += '</nav>' + toastHtml(ui);
    return html;
  }
  function toastHtml(ui) { return ui.toast ? '<div class="toast">' + esc(ui.toast) + '</div>' : ''; }

  return { esc: esc, tl: tl, views: views, shell: shell, STORAGE_KEY: STORAGE_KEY };
});
