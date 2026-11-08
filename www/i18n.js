/* Pasif Gelirim — çok dilli arayüz.
   Kaynak metinler Türkçedir; çizilen ekrandaki metin düğümleri sözlükle çevrilir.
   Sayılar '#' ile normalize edilir ("Kalan: 5 gün" -> "Kalan: # gün"), çeviride '#' aynı sırayla geri konur.
   Sözlükte karşılığı olmayan metin Türkçe kalır (kullanıcının kendi yazdıkları da böyle korunur). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(typeof global !== 'undefined' ? global : root);
  else root.I18n = factory(root);
})(typeof self !== 'undefined' ? self : this, function (G) {

  const LANGS = [
    { code: 'tr', name: 'Türkçe', dir: 'ltr', locale: 'tr-TR', num: [',', '.'] },
    { code: 'en', name: 'English', dir: 'ltr', locale: 'en-US', num: ['.', ','] },
    { code: 'de', name: 'Deutsch', dir: 'ltr', locale: 'de-DE', num: [',', '.'] },
    { code: 'es', name: 'Español', dir: 'ltr', locale: 'es-ES', num: [',', '.'] },
    { code: 'ru', name: 'Русский', dir: 'ltr', locale: 'ru-RU', num: [',', ' '] },
    { code: 'ar', name: 'العربية', dir: 'rtl', locale: 'ar', num: ['.', ','] }
  ];
  let cur = 'tr', curCode = 'TRY';
  function curLabel() { return curCode === 'TRY' ? 'TL' : curCode; }
  function setCurrency(code) { curCode = /^[A-Z]{3}$/.test(code) ? code : 'TRY'; return curCode; }
  const missing = {};

  function langInfo(code) { return LANGS.find(function (l) { return l.code === code; }) || LANGS[0]; }
  function dicts() { return G.I18N_DICT || {}; }

  const NUM = /\d[\d.,:/]*\d|\d/g;
  function collapse(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  // Harf var mı? (\p{L} eski Android WebView'larda söz dizimi hatası verir)
  var LETTER = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u052F\u0600-\u06FF\u0750-\u077F]/;
  function norm(s) { return collapse(s).replace(NUM, '#'); }
  function nums(s) { return collapse(s).match(NUM) || []; }

  // Türkçe biçimli sayıyı (1.234,56) hedef dilin biçimine çevirir; tarih/saat/sürüm gibi diğerleri aynen kalır.
  function localizeNum(tok, lang) {
    const L = langInfo(lang);
    if (L.code === 'tr') return tok;
    let m = /^(\d{1,3}(?:\.\d{3})*|\d+),(\d+)$/.exec(tok), intPart, frac = '';
    if (m) { intPart = m[1].replace(/\./g, ''); frac = m[2]; }
    else if (/^\d{1,3}(?:\.\d{3})+$/.test(tok)) intPart = tok.replace(/\./g, '');
    else return tok;
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, L.num[1]);
    return grouped + (frac ? L.num[0] + frac : '');
  }

  function withCur(s, noCur) { return noCur || curCode === 'TRY' ? s : s.replace(/\bTL\b/g, curLabel()); }
  function translate(text, lang, noCur) {
    lang = lang || cur;
    if (lang === 'tr') return withCur(String(text), noCur);
    const d = dicts()[lang]; if (!d) return withCur(String(text), noCur);
    const raw = String(text);
    const lead = /^\s*/.exec(raw)[0], trail = /\s*$/.exec(raw)[0];
    const key = norm(raw);
    if (!key) return text;
    const tr = d[key];
    if (tr === undefined) { if (LETTER.test(key)) missing[key] = true; return withCur(String(text), noCur); }
    const ns = nums(raw); let i = 0;
    const out = tr.replace(/#/g, function () { const n = ns[i++]; return n === undefined ? '#' : localizeNum(n, lang); });
    return (lead ? ' ' : '') + withCur(out, noCur) + (trail ? ' ' : '');
  }
  function t(text) { return translate(text, cur); }

  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  function apply(el) {
    if ((cur === 'tr' && curCode === 'TRY') || !el) return;
    const doc = el.ownerDocument || document;
    const w = doc.createTreeWalker(el, 4 /* SHOW_TEXT */, null);
    const nodes = []; let n;
    while ((n = w.nextNode())) {
      const p = n.parentNode;
      if (!p || (p.closest && p.closest('[data-nt],script,style,textarea'))) continue;
      nodes.push(n);
    }
    nodes.forEach(function (x) { const v = translate(x.nodeValue, cur, !!(x.parentNode.closest && x.parentNode.closest('[data-fixcur]'))); if (v !== x.nodeValue) x.nodeValue = v; });
    const q = el.querySelectorAll ? el.querySelectorAll('[placeholder],[aria-label],[title],[alt]') : [];
    for (let i = 0; i < q.length; i++) ATTRS.forEach(function (a) {
      const v = q[i].getAttribute(a); if (v) { const tv = translate(v, cur); if (tv !== v) q[i].setAttribute(a, tv); }
    });
    if (el.getAttribute) ATTRS.forEach(function (a) { const v = el.getAttribute(a); if (v) { const tv = translate(v, cur); if (tv !== v) el.setAttribute(a, tv); } });
  }

  function setLang(code) {
    cur = LANGS.some(function (l) { return l.code === code; }) ? code : 'tr';
    const L = langInfo(cur);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', L.code);
      document.documentElement.setAttribute('dir', L.dir);
      const T = { tr: 'Pasif Gelirim', en: 'Passive Income', de: 'Passives Einkommen', es: 'Ingresos pasivos', ru: 'Пассивный доход', ar: 'دخلي السلبي' };
      document.title = T[cur] || T.tr;
    }
    return cur;
  }
  function detect() {
    const list = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
    for (let i = 0; i < list.length; i++) {
      const c = String(list[i] || '').slice(0, 2).toLowerCase();
      if (LANGS.some(function (l) { return l.code === c; })) return c;
    }
    return 'tr';
  }
  function resolve(pref) { return pref && pref !== 'auto' && LANGS.some(function (l) { return l.code === pref; }) ? pref : detect(); }

  // ---- geliştirme araçları (Node) ----
  function decode(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); }
  function extractTexts(html) {
    const out = [];
    const clean = String(html).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<textarea[\s\S]*?<\/textarea>/g, '<textarea></textarea>').replace(/<[^>]*data-nt[^>]*>[^<]*</g, '<');
    clean.replace(/>([^<>]+)</g, function (_, t) { out.push(decode(t)); return _; });
    clean.replace(/\s(?:placeholder|aria-label|title|alt)="([^"]*)"/g, function (_, t) { out.push(decode(t)); return _; });
    return out.map(collapse).filter(function (s) { return LETTER.test(norm(s)); });
  }

  return {
    LANGS: LANGS, norm: norm, nums: nums, translate: translate, t: t, apply: apply, setLang: setLang, getLang: function () { return cur; },
    detect: detect, resolve: resolve, setCurrency: setCurrency, getCurrency: function () { return curCode; }, curLabel: curLabel, info: langInfo, extractTexts: extractTexts, missing: function () { return Object.keys(missing); }, localizeNum: localizeNum
  };
});
