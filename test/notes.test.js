// Aşama 8: Not Defteri çekirdeği, proje izolasyonu, NORA izinleri ve onay kuralları.
const assert = require('assert');
const Core = require('../www/core.js');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n      ')); } }
const T = Date.UTC(2026, 10, 25, 10, 0, 0), H = 3600000;
function mk() { const s = Core.defaultState(); s.user.name = 'Ali'; s.user.onboarded = true; return s; }
function withProjects() {
  const s = mk(); Core.startProject(s, 'sosyal-medya', T); Core.startProject(s, 'freelance', T + 1);
  return { s, a: s.projects[0], b: s.projects[1] };
}

t('not oluştur / düzenle / sil, tarihler doğru', () => {
  const s = mk(); const r = Core.addNote(s, { title: 'Fikir 1', body: 'Reels serisi', cat: 'fikir' }, T);
  assert.ok(r.ok); assert.strictEqual(r.note.createdAt, T); assert.strictEqual(r.note.updatedAt, T); assert.strictEqual(r.note.projectId, '');
  const u = Core.updateNote(s, r.note.id, { title: 'Fikir 1b', body: 'Yeni' }, T + H); assert.ok(u.ok);
  assert.strictEqual(Core.noteById(s, r.note.id).updatedAt, T + H); assert.strictEqual(Core.noteById(s, r.note.id).createdAt, T);
  const same = Core.updateNote(s, r.note.id, { title: 'Fikir 1b', body: 'Yeni' }, T + 2 * H); assert.ok(same.unchanged); assert.strictEqual(Core.noteById(s, r.note.id).updatedAt, T + H);
  assert.strictEqual(Core.deleteNote(s, r.note.id), true); assert.strictEqual(Core.listNotes(s).length, 0); assert.strictEqual(Core.deleteNote(s, 'yok'), false);
});
t('boş not reddedilir; başlıksız notta başlık içerikten türer', () => {
  const s = mk(); assert.strictEqual(Core.addNote(s, { title: ' ', body: '  ' }, T).ok, false);
  assert.strictEqual(Core.addNote(s, { body: 'Merhaba dünya notu' }, T).note.title, 'Merhaba dünya notu');
  const n = Core.listNotes(s)[0]; assert.strictEqual(Core.updateNote(s, n.id, { title: '', body: '' }, T).ok, false);
});
t('kategoriler: yedi hazır kategori, geçersiz kategori Genel olur, kategori değiştirilir', () => {
  const s = mk(); assert.deepStrictEqual(Core.NOTE_CATS.map(c => c.name), ['Genel', 'Fikirler', 'İş', 'Projeler', 'Araştırma', 'Hatırlatmalar', 'Kişisel']);
  const n = Core.addNote(s, { title: 'x', cat: 'uydurma' }, T).note; assert.strictEqual(n.cat, 'genel');
  assert.ok(Core.updateNote(s, n.id, { cat: 'is' }, T + 1).ok); assert.strictEqual(Core.noteById(s, n.id).cat, 'is');
  assert.strictEqual(Core.updateNote(s, n.id, { cat: 'yok' }, T + 2).ok, false);
});
t('özel kategori mimarisi: eklenir, çakışma reddedilir, silinince notlar Genel\'e döner (silinmez)', () => {
  const s = mk(); const c = Core.addNoteCategory(s, 'Kitaplar'); assert.ok(c.ok);
  assert.strictEqual(Core.addNoteCategory(s, 'kitaplar').ok, false); assert.strictEqual(Core.addNoteCategory(s, 'Genel').ok, false);
  const n = Core.addNote(s, { title: 'k', cat: c.cat.id }, T).note; assert.strictEqual(Core.noteCatName(s, c.cat.id), 'Kitaplar');
  const r = Core.removeNoteCategory(s, c.cat.id, T + 1); assert.ok(r.ok); assert.strictEqual(r.moved, 1);
  assert.strictEqual(Core.noteById(s, n.id).cat, 'genel'); assert.strictEqual(Core.removeNoteCategory(s, 'genel', T).ok, false);
  const s2 = Core.migrate(JSON.parse(JSON.stringify(s))); assert.strictEqual(s2.notebook.cats.length, 0);
});
t('arama: başlık, içerik, kategori ve proje adı; Türkçe büyük/küçük harf', () => {
  const { s, a } = withProjects();
  Core.addNote(s, { title: 'İSTANBUL planı', body: 'kargo', cat: 'is' }, T); Core.addNote(s, { title: 'Başka', body: 'Reels', cat: 'fikir', projectId: a.id }, T + 1);
  assert.strictEqual(Core.listNotes(s, { q: 'istanbul' }).length, 1); assert.strictEqual(Core.listNotes(s, { q: 'İSTANBUL' }).length, 1);
  assert.strictEqual(Core.listNotes(s, { q: 'İstanbul' }).length, 1);
  assert.strictEqual(Core.listNotes(s, { q: 'reels' }).length, 1); assert.strictEqual(Core.listNotes(s, { q: 'Fikirler' }).length, 1);
  assert.strictEqual(Core.listNotes(s, { q: a.title.slice(0, 6) }).length, 1); assert.strictEqual(Core.listNotes(s, { q: 'yokyokyok' }).length, 0);
});
t('filtre ve sıralama: kategori, genel/proje, tarih, başlık', () => {
  const { s, a } = withProjects();
  Core.addNote(s, { title: 'B not', cat: 'is' }, T); Core.addNote(s, { title: 'A not', cat: 'fikir', projectId: a.id }, T + H); Core.addNote(s, { title: 'C not', cat: 'is' }, T + 2 * H);
  assert.strictEqual(Core.listNotes(s, { cat: 'is' }).length, 2); assert.strictEqual(Core.listNotes(s, { project: 'general' }).length, 2);
  assert.deepStrictEqual(Core.listNotes(s, { project: a.id }).map(n => n.title), ['A not']);
  assert.deepStrictEqual(Core.listNotes(s, { sort: 'updated' }).map(n => n.title), ['C not', 'A not', 'B not']);
  assert.deepStrictEqual(Core.listNotes(s, { sort: 'created', dir: 'asc' }).map(n => n.title), ['B not', 'A not', 'C not']);
  assert.deepStrictEqual(Core.listNotes(s, { sort: 'title', dir: 'asc' }).map(n => n.title), ['A not', 'B not', 'C not']);
  Core.updateNote(s, Core.listNotes(s, { q: 'B not' })[0].id, { body: 'x' }, T + 5 * H);
  assert.strictEqual(Core.listNotes(s, { sort: 'updated' })[0].title, 'B not');
});
t('proje izolasyonu: başka projenin notu görünmez, aynı filtre karışmaz', () => {
  const { s, a, b } = withProjects();
  Core.addNote(s, { title: 'A notu', projectId: a.id }, T); Core.addNote(s, { title: 'B notu', projectId: b.id }, T); Core.addNote(s, { title: 'Genel notu' }, T);
  assert.deepStrictEqual(Core.listNotes(s, { project: a.id }).map(n => n.title), ['A notu']);
  assert.deepStrictEqual(Core.listNotes(s, { project: b.id }).map(n => n.title), ['B notu']);
  assert.deepStrictEqual(Core.listNotes(s, { project: 'general' }).map(n => n.title), ['Genel notu']);
});
t('arşivlenen projenin notları korunur; arşive yeni not bağlanamaz; geri alınca yine bağlı', () => {
  const { s, a } = withProjects(); const n = Core.addNote(s, { title: 'Kalıcı', projectId: a.id }, T).note;
  assert.ok(Core.archiveProject(s, a.id, T + 1)); assert.strictEqual(Core.noteById(s, n.id).projectId, a.id);
  assert.strictEqual(Core.addNote(s, { title: 'Yeni', projectId: a.id }, T + 2).ok, false);
  assert.strictEqual(Core.updateNote(s, n.id, { title: 'Kalıcı2' }, T + 3).ok, true);              // mevcut bağlantıyla düzenlenebilir
  assert.strictEqual(Core.updateNote(s, Core.addNote(s, { title: 'g' }, T).note.id, { projectId: a.id }, T + 4).ok, false);
  const s2 = Core.migrate(JSON.parse(JSON.stringify(s))); assert.strictEqual(Core.noteById(s2, n.id).projectId, a.id);
  assert.ok(Core.restoreProject(s, a.id, T + 5)); assert.strictEqual(Core.noteById(s, n.id).projectId, a.id);
});
t('proje silme: bağlı not varsa karar verilmeden HİÇBİR ŞEY silinmez', () => {
  const { s, a } = withProjects(); Core.addNote(s, { title: 'n1', projectId: a.id }, T); Core.addNote(s, { title: 'n2', projectId: a.id }, T);
  const r = Core.deleteProject(s, a.id); assert.strictEqual(r.blocked, true); assert.strictEqual(r.notes, 2);
  assert.ok(Core.projectById(s, a.id)); assert.strictEqual(Core.listNotes(s).length, 2);
  assert.strictEqual(Core.deleteProject(s, a.id, 'bilinmeyen').blocked, true); assert.ok(Core.projectById(s, a.id));
});
t('proje silme + "genel notlara taşı": notlar kalır, projesiz olur', () => {
  const { s, a, b } = withProjects(); Core.addNote(s, { title: 'n1', projectId: a.id }, T); Core.addNote(s, { title: 'bn', projectId: b.id }, T);
  const r = Core.deleteProject(s, a.id, 'move'); assert.strictEqual(r.notesMoved, 1); assert.strictEqual(Core.projectById(s, a.id), null);
  assert.deepStrictEqual(Core.listNotes(s, { project: 'general' }).map(n => n.title), ['n1']); assert.strictEqual(Core.listNotes(s, { project: b.id }).length, 1);
});
t('proje silme + "notlarla sil": yalnızca o projenin notları gider', () => {
  const { s, a, b } = withProjects(); Core.addNote(s, { title: 'n1', projectId: a.id }, T); Core.addNote(s, { title: 'bn', projectId: b.id }, T); Core.addNote(s, { title: 'gn' }, T);
  const r = Core.deleteProject(s, a.id, 'delete'); assert.strictEqual(r.notesDeleted, 1);
  assert.deepStrictEqual(Core.listNotes(s, { sort: 'title', dir: 'asc' }).map(n => n.title), ['bn', 'gn']);
});
t('notu olmayan projenin silinmesi eskisi gibi çalışır', () => {
  const { s, a } = withProjects(); const r = Core.deleteProject(s, a.id); assert.ok(!r.blocked); assert.strictEqual(r.notesMoved, 0); assert.strictEqual(s.projects.length, 1);
});
t('yedek: dışa aktarma notları içerir, geri yükleme korur, eski yedek (notebook yok) açılır', () => {
  const { s, a } = withProjects(); Core.addNote(s, { title: 'Yedek notu', body: 'içerik', cat: 'is', projectId: a.id }, T); Core.addNote(s, { title: 'Genel' }, T); Core.setNoraNoteAccess(s, true);
  const res = Core.importData(Core.exportData(s)); assert.ok(res.ok); assert.strictEqual(res.counts.notes, 2);
  const n = res.state.notebook.notes.find(x => x.title === 'Yedek notu'); assert.strictEqual(n.body, 'içerik'); assert.strictEqual(n.projectId, a.id); assert.strictEqual(n.cat, 'is');
  const old = JSON.parse(Core.exportData(s)); delete old.notebook; const r2 = Core.importData(JSON.stringify(old)); assert.ok(r2.ok); assert.deepStrictEqual(r2.state.notebook.notes, []);
  assert.strictEqual(Core.migrate(null).notebook.notes.length, 0); assert.strictEqual(Core.migrate({ finance: [] }).notebook.nora, false);
});
t('bozuk not verisi ayıklanır; var olmayan projeye bağlı not silinmez, genele döner', () => {
  const s = mk(); s.notebook = { notes: [null, 'x', { title: 'ok', projectId: 'yokproje', cat: 'constructor', createdAt: 5 }, { title: '', body: '' }, { id: 'a', title: 'T', body: 'B' }, { id: 'a', title: 'Çift', body: 'B' }], cats: [{ id: 'kotu id', name: 'x' }], nora: 'evet', pending: [{ kind: 'edit', noteId: 'yok', text: 'x' }] };
  const m = Core.migrate(JSON.parse(JSON.stringify(s))); assert.strictEqual(m.notebook.notes.length, 3);
  const ok = m.notebook.notes.find(n => n.title === 'ok'); assert.strictEqual(ok.projectId, ''); assert.strictEqual(ok.cat, 'genel');
  assert.strictEqual(new Set(m.notebook.notes.map(n => n.id)).size, 3); assert.strictEqual(m.notebook.cats.length, 0); assert.strictEqual(m.notebook.nora, false); assert.strictEqual(m.notebook.pending.length, 0);
  assert.deepStrictEqual(Core.migrate(m).notebook, m.notebook);                      // idempotent
});
t('sınırlar: not sayısı ve uzunluk', () => {
  const s = mk(); const r = Core.addNote(s, { title: 'x'.repeat(500), body: 'y'.repeat(20000) }, T); assert.strictEqual(r.note.title.length, Core.NOTE_LIMITS.title); assert.strictEqual(r.note.body.length, Core.NOTE_LIMITS.body);
  for (let i = 1; i < Core.NOTE_LIMITS.notes; i++) assert.ok(Core.addNote(s, { title: 'n' + i }, T).ok);
  assert.strictEqual(Core.addNote(s, { title: 'fazla' }, T).ok, false);
});
t('hassas not: işaretlenir, NORA görmez; sunucu bağlamlarına ve proje hafızasına sızmaz', () => {
  const { s, a } = withProjects(); Core.setNoraNoteAccess(s, true); Core.setChatScope(s, true);
  Core.addNote(s, { title: 'Banka', body: 'IBAN TR12 3456 7890 1234 5678 9012 34' }, T); Core.addNote(s, { title: 'Normal not', body: 'ZZSIRDEGIL' }, T + 1);
  assert.ok(Core.noteIsSensitive(Core.listNotes(s, { q: 'Banka' })[0]));
  const r = Core.noraNotes(s, 'Notlarımı göster', T + 2, {}); assert.ok(/Normal not/.test(r.text)); assert.ok(!/Banka/.test(r.text) && !/IBAN/.test(r.text)); assert.ok(/gizlendi/.test(r.text));
  Core.setChatScope(s, false);
  assert.ok(!Core.memoryForServer(s).includes('ZZSIRDEGIL')); assert.ok(!Core.projectContext(s, a.id).text.includes('ZZSIRDEGIL')); assert.ok(!JSON.stringify(Core.projectContext(s, a.id)).includes('ZZSIRDEGIL'));
});
t('notlar proje hafızasından ayrı veri türüdür: not eklemek hafızayı değiştirmez', () => {
  const { s, a } = withProjects(); const before = JSON.stringify(Core.memOf(a)); Core.addNote(s, { title: 'n', projectId: a.id }, T); assert.strictEqual(JSON.stringify(Core.memOf(a)), before);
});

// ---- NORA ----
t('NORA: izin kapalıyken notları OKUMAZ (liste, son not, düzenleme, görev, bağlama)', () => {
  const s = mk(); Core.addNote(s, { title: 'Gizli Başlık', body: 'ZZGIZLIICERIK' }, T);
  assert.strictEqual(Core.noraNoteAccess(s), false);
  ['Notlarımı göster', 'Son aldığım notu bul', 'Bu notu özetle', 'Bu notu daha düzenli hale getir', 'Bu notu projeye bağla', 'Bu nottan görev oluştur', 'Bu notu proje hafızasına aktar'].forEach(q => {
    const r = Core.noraNotes(s, q, T, {}); assert.ok(r, q); assert.ok(!/Gizli Başlık|ZZGIZLIICERIK/.test(r.text), q); assert.ok(/erişimin kapalı/.test(r.text), q); assert.ok(!r.pending, q);
  });
  const r = Core.noraNotes(s, 'Bu notu özetle', T, { noteId: Core.listNotes(s)[0].id, explicit: true }); assert.ok(!/ZZGIZLIICERIK/.test(r.text));
  assert.strictEqual(s.notebook.pending.length, 0);
});
t('NORA: izin açılınca listeler, son notu bulur; izin kapanınca yine okumaz', () => {
  const s = mk(); Core.addNote(s, { title: 'Eski', body: 'a' }, T); Core.addNote(s, { title: 'Yeni fikir', body: 'ayrıntı metni', cat: 'fikir' }, T + H);
  Core.setNoraNoteAccess(s, true);
  let r = Core.noraNotes(s, 'Notlarımı göster', T + 2 * H, {}); assert.ok(/Yeni fikir/.test(r.text) && /Eski/.test(r.text));
  r = Core.noraNotes(s, 'Son aldığım notu bul', T + 2 * H, {}); assert.ok(/Yeni fikir/.test(r.text) && /ayrıntı metni/.test(r.text) && !/Eski/.test(r.text));
  Core.setNoraNoteAccess(s, false); r = Core.noraNotes(s, 'Notlarımı göster', T, {}); assert.ok(/erişimin kapalı/.test(r.text));
});
t('NORA: kapsam izolasyonu: genel sohbet yalnızca genel notları, proje sohbeti yalnızca o projenin notlarını görür', () => {
  const { s, a, b } = withProjects(); Core.setNoraNoteAccess(s, true);
  Core.addNote(s, { title: 'GENELNOT' }, T); Core.addNote(s, { title: 'ANOT', projectId: a.id }, T); Core.addNote(s, { title: 'BNOT', projectId: b.id }, T);
  Core.setActiveProject(s, a.id); Core.setChatScope(s, false);
  let r = Core.noraNotes(s, 'Notlarımı göster', T, {}).text; assert.ok(/ANOT/.test(r) && !/BNOT|GENELNOT/.test(r));
  Core.setActiveProject(s, b.id); r = Core.noraNotes(s, 'Notlarımı göster', T, {}).text; assert.ok(/BNOT/.test(r) && !/ANOT|GENELNOT/.test(r));
  Core.setChatScope(s, true); r = Core.noraNotes(s, 'Notlarımı göster', T, {}).text; assert.ok(/GENELNOT/.test(r) && !/ANOT|BNOT/.test(r));
  r = Core.noraNotes(s, 'Son aldığım notu bul', T, {}).text; assert.ok(!/ANOT|BNOT/.test(r));
});
t('NORA: kendiliğinden not değiştirmez; yalnızca öneri (bekleyen) üretir, onaysız not aynı kalır', () => {
  const s = mk(); const n = Core.addNote(s, { title: 'Dağınık', body: '  ilk   satır  \n\n\n  ikinci satır ' }, T).note; Core.setNoraNoteAccess(s, true);
  const snap = JSON.stringify(Core.noteById(s, n.id));
  const r = Core.noraNotes(s, 'Bu notu daha düzenli hale getir', T + H, {}); assert.ok(r.pending); assert.strictEqual(JSON.stringify(Core.noteById(s, n.id)), snap);
  const pe = s.notebook.pending[0]; assert.strictEqual(pe.kind, 'edit'); assert.strictEqual(pe.text, 'İlk satır\n\nİkinci satır'); assert.ok(/Demo/.test(r.text));
  Core.noraNotes(s, 'Notlarımı göster', T + H, {}); Core.noraNotes(s, 'Son aldığım notu bul', T + H, {}); assert.strictEqual(JSON.stringify(Core.noteById(s, n.id)), snap);
});
t('NORA: düzenleme onaylanınca uygulanır, reddedilince hiçbir şey olmaz, bayat öneri reddedilir', () => {
  const s = mk(); const n = Core.addNote(s, { title: 'D', body: ' ilk  satır ' }, T).note; Core.setNoraNoteAccess(s, true);
  let id = Core.noraNotes(s, 'Bu notu daha düzenli hale getir', T + 1, {}).pending;
  assert.ok(Core.resolveNotePending(s, id, false, T + 2).declined); assert.strictEqual(Core.noteById(s, n.id).body, ' ilk  satır '); assert.strictEqual(s.notebook.pending.length, 0);
  id = Core.noraNotes(s, 'Bu notu daha düzenli hale getir', T + 3, {}).pending;
  assert.ok(Core.resolveNotePending(s, id, true, T + 4).ok); assert.strictEqual(Core.noteById(s, n.id).body, 'İlk satır'); assert.strictEqual(Core.noteById(s, n.id).updatedAt, T + 4);
  Core.updateNote(s, n.id, { body: ' başka  metin ' }, T + 5); id = Core.noraNotes(s, 'Bu notu daha düzenli hale getir', T + 6, {}).pending;
  Core.updateNote(s, n.id, { body: 'kullanıcı değiştirdi' }, T + 7);
  const r = Core.resolveNotePending(s, id, true, T + 8); assert.strictEqual(r.ok, false); assert.strictEqual(Core.noteById(s, n.id).body, 'kullanıcı değiştirdi');
  assert.strictEqual(Core.resolveNotePending(s, 'yok', true, T).ok, false);
});
t('NORA: not silmez; "sil" isteğine yalnızca yönlendirir', () => {
  const s = mk(); Core.addNote(s, { title: 'Silme beni' }, T); Core.setNoraNoteAccess(s, true);
  const r = Core.noraNotes(s, 'Notumu sil', T, {}); assert.ok(/onay/.test(r.text)); assert.strictEqual(Core.listNotes(s).length, 1); assert.strictEqual(s.notebook.pending.length, 0);
});
t('NORA: özetleme gerçek AI gerektirir; sahte özet üretmez, kullanılamıyor der', () => {
  const s = mk(); Core.addNote(s, { title: 'Uzun', body: 'ZZUZUNICERIK bir iki üç dört beş' }, T); Core.setNoraNoteAccess(s, true);
  const r = Core.noraNotes(s, 'Bu notu özetle', T, {}); assert.ok(/kullanılamıyor/.test(r.text)); assert.ok(/gerçek bir yapay zekâ/.test(r.text)); assert.ok(!/ZZUZUNICERIK/.test(r.text)); assert.ok(!r.pending);
});
t('NORA: "bu fikrimi kaydet" önce onay kartı üretir; onaylanmadan not oluşmaz; hassas metin reddedilir', () => {
  const s = mk(); Core.setChatScope(s, true);
  let r = Core.noraNotes(s, 'Bunu not defterime kaydet: Haftada 3 reels paylaşmak', T, {}); assert.ok(r.pending); assert.strictEqual(Core.listNotes(s).length, 0);
  assert.ok(Core.resolveNotePending(s, r.pending, true, T + 1).ok); assert.strictEqual(Core.listNotes(s).length, 1); assert.strictEqual(Core.listNotes(s)[0].body, 'Haftada 3 reels paylaşmak');
  r = Core.noraNotes(s, 'Bu fikrimi not defterime kaydet', T + 2, { prevUser: 'Önceki cümle fikir' }); assert.ok(r.pending); assert.strictEqual(s.notebook.pending[0].text, 'Önceki cümle fikir');
  assert.ok(Core.resolveNotePending(s, r.pending, false, T + 3).declined); assert.strictEqual(Core.listNotes(s).length, 1);
  r = Core.noraNotes(s, 'Not defterime kaydet: şifrem 123456', T, {}); assert.ok(!r.pending); assert.strictEqual(s.notebook.pending.length, 0);
  r = Core.noraNotes(s, 'Not defterime kaydet', T, {}); assert.ok(!r.pending);
});
t('NORA: proje sohbetinden kaydedilen not o projeye bağlanır', () => {
  const { s, a } = withProjects(); Core.setActiveProject(s, a.id); Core.setChatScope(s, false);
  const r = Core.noraNotes(s, 'Not defterime kaydet: proje fikri', T, {}); Core.resolveNotePending(s, r.pending, true, T);
  assert.strictEqual(Core.listNotes(s)[0].projectId, a.id);
});
t('NORA: projeye bağlama önerisi onaylanınca bağlanır; arşivdeki/başka proje önerilmez', () => {
  const { s, a, b } = withProjects(); Core.setNoraNoteAccess(s, true); Core.setChatScope(s, true);
  const n = Core.addNote(s, { title: 'Serbest çalışan müşteri', body: 'freelance müşteri bulma' }, T).note;
  const r = Core.noraNotes(s, 'Bu notu projeye bağla', T, {}); assert.ok(r.pending); assert.strictEqual(s.notebook.pending[0].projectId, b.id);
  assert.strictEqual(Core.noteById(s, n.id).projectId, ''); assert.ok(Core.resolveNotePending(s, r.pending, true, T + 1).ok); assert.strictEqual(Core.noteById(s, n.id).projectId, b.id);
  const r2 = Core.noraNotes(s, 'Bu notu projeye bağla', T + 2, { noteId: n.id, explicit: true }); assert.ok(!r2.pending); assert.ok(/zaten/.test(r2.text));
  const m = Core.addNote(s, { title: 'Alakasız', body: 'zzzzz qqqqq' }, T + 3).note; Core.setChatScope(s, true);
  assert.ok(!Core.noraNotes(s, 'Bu notu projeye bağla', T + 4, { noteId: m.id, explicit: true }).pending);
  Core.archiveProject(s, b.id, T + 5); const k = Core.addNote(s, { title: 'Başka', body: 'freelance müşteri' }, T + 6).note;
  assert.ok(!Core.noraNotes(s, 'Bu notu projeye bağla', T + 7, { noteId: k.id, explicit: true }).pending);
});
t('NORA: nottan görev önerisi mevcut görev/onay sistemini kullanır (taslak, onay olmadan görev çalışmaz)', () => {
  const { s, a } = withProjects(); Core.setNoraNoteAccess(s, true); Core.setActiveProject(s, a.id); Core.setChatScope(s, false);
  const n = Core.addNote(s, { title: 'Haftalık video planı', body: 'her hafta 3 video', projectId: a.id }, T).note;
  assert.strictEqual(Core.plansOf(s, a.id).length, 0);
  const r = Core.noraNotes(s, 'Bu nottan görev oluştur', T + 1, {}); assert.ok(r.pending); assert.strictEqual(Core.plansOf(s, a.id).length, 0);
  const res = Core.resolveNotePending(s, r.pending, true, T + 2); assert.ok(res.ok); assert.strictEqual(res.plan.state, 'proposed'); assert.ok(/Haftalık video planı/.test(res.plan.goal));
  const tasks = Core.tasksOf(s, a.id); assert.ok(tasks.length > 0); assert.ok(tasks.every(x => x.status === 'planned'));
  assert.ok(Core.pendingApprovals(s, a.id).length === 0);                                // plan onaylanmadı: hiçbir görev çalışmadı
  const pr = Core.prepareTask(s, a.id, tasks[0].id, T + 3); assert.strictEqual(pr.ok, false);          // plan onaylanmadan görev başlamaz
  // genel not: görev önerilemez
  Core.setChatScope(s, true); const g = Core.addNote(s, { title: 'Genel fikir' }, T).note;
  assert.ok(!Core.noraNotes(s, 'Bu nottan görev oluştur', T, { noteId: g.id, explicit: true }).pending);
});
t('NORA: nottan hafıza aktarımı önce onay ister, yalnızca notun projesine yazar, başka projeye yazmaz', () => {
  const { s, a, b } = withProjects(); Core.setNoraNoteAccess(s, true);
  const n = Core.addNote(s, { title: 'Karar', body: 'Önce Instagram ile başla', projectId: a.id }, T).note;
  const r = Core.noraNotes(s, 'Bu notu proje hafızasına aktar', T, { noteId: n.id, explicit: true }); assert.ok(r.pending); assert.strictEqual(Core.memOf(a).items.length, 0);
  assert.ok(Core.resolveNotePending(s, r.pending, true, T + 1).ok); assert.strictEqual(Core.memOf(a).items.length, 1); assert.ok(/Instagram/.test(Core.memOf(a).items[0].text)); assert.strictEqual(Core.memOf(b).items.length, 0);
  const r2 = Core.noraNotes(s, 'Bu notu proje hafızasına aktar', T + 2, { noteId: n.id, explicit: true }); Core.updateNote(s, n.id, { projectId: b.id }, T + 3);
  assert.strictEqual(Core.resolveNotePending(s, r2.pending, true, T + 4).ok, false); assert.strictEqual(Core.memOf(b).items.length, 0);
  const g = Core.addNote(s, { title: 'Genel' }, T).note; assert.ok(!Core.noraNotes(s, 'Bu notu proje hafızasına aktar', T, { noteId: g.id, explicit: true }).pending);
});
t('izin kapatılınca bekleyen NORA önerileri temizlenir; not silinince önerileri gider; proje silinince projenin önerileri gider', () => {
  const { s, a } = withProjects(); Core.setNoraNoteAccess(s, true);
  const n = Core.addNote(s, { title: 'D', body: ' x  y', projectId: a.id }, T).note; Core.setActiveProject(s, a.id); Core.setChatScope(s, false);
  Core.noraNotes(s, 'Bu notu daha düzenli hale getir', T, {}); assert.strictEqual(s.notebook.pending.length, 1);
  Core.deleteNote(s, n.id); assert.strictEqual(s.notebook.pending.length, 0);
  Core.addNote(s, { title: 'E', body: ' x  y', projectId: a.id }, T); Core.noraNotes(s, 'Bu notu daha düzenli hale getir', T, {}); Core.setNoraNoteAccess(s, false); assert.strictEqual(s.notebook.pending.length, 0);
});
t('not içeriği sunucu yükünde yok: memoryForServer ve sohbet bağlamı notları içermez', () => {
  const { s, a } = withProjects(); Core.addNote(s, { title: 'ZZBASLIK', body: 'ZZGOVDE', projectId: a.id }, T); Core.setNoraNoteAccess(s, true);
  const all = Core.memoryForServer(s) + JSON.stringify(Core.projectContext(s, a.id)) + JSON.stringify(Core.chatContext ? Core.chatContext(s) : '');
  assert.ok(!/ZZBASLIK|ZZGOVDE/.test(all));
});
t('NORA not niyeti: diğer sohbetleri bozmaz', () => {
  ['Hedef kitle ne demek?', 'Projemi özetle', 'Görev planı hazırla', 'Garanti kazanç var mı?', 'Nereden başlayayım?', 'Görev merkezi durumu'].forEach(q => assert.strictEqual(Core.noteIntent(q), '', q));
  assert.strictEqual(Core.noteIntent('Notlarımı göster'), 'list'); assert.strictEqual(Core.noteIntent('Not defterimi aç'), 'list');
});
t('mevcut paket yetkileri ve NORA erişimi Not Defteri yüzünden değişmedi', () => {
  const s = mk(); assert.strictEqual(Core.noraAccess(s).allowed, true); Core.addNote(s, { title: 'x' }, T); assert.strictEqual(Core.entitlements(s).finance, true);
});
console.log('\n' + (fail ? fail + ' BAŞARISIZ, ' : '') + pass + ' test geçti'); process.exitCode = fail ? 1 : 0;
