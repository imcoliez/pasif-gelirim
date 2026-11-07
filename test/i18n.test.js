// Çeviri tamlığı: ekranlarda çizilen her metin için tüm dillerde karşılık olmalı ve '#' sayıları tutmalı.
const assert = require('assert');
global.window = global;
const I = require('../www/i18n.js');
global.I18N_DICT = {};
['en', 'de', 'es', 'ru', 'ar'].forEach(c => require('../www/lang/' + c + '.js'));
const { collect } = require('../tools/extract_strings.js');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      ' + e.message); } }

const keys = [...collect().keys()];
const MAIN = require('fs').readFileSync(__dirname + '/../www/main.js', 'utf8');
['en', 'de', 'es', 'ru', 'ar'].forEach(code => {
  t(code + ': tüm ekran metinleri çevrilmiş', () => {
    const miss = keys.filter(k => I18N_DICT[code][k] === undefined);
    assert.strictEqual(miss.length, 0, 'eksik (' + miss.length + '): ' + miss.slice(0, 5).join(' | '));
  });
  t(code + ': sayı yer tutucuları eşleşiyor', () => {
    const bad = Object.keys(I18N_DICT[code]).filter(k => (k.match(/#/g) || []).length !== (I18N_DICT[code][k].match(/#/g) || []).length);
    assert.strictEqual(bad.length, 0, bad.slice(0, 3).join(' | '));
  });
  t(code + ': boş çeviri yok', () => { assert.ok(Object.values(I18N_DICT[code]).every(v => v && v.trim())); });
});
t('çeviri ve para birimi: sayı yerelleşir, TL etiketi değişir', () => {
  I.setLang('de'); I.setCurrency('EUR');
  assert.strictEqual(I.t('Bu ay 1.234,50 TL'), 'Diesen Monat 1.234,50 EUR');
  I.setLang('en'); I.setCurrency('USD');
  assert.strictEqual(I.t('Bu ay 1.234,50 TL'), 'This month 1,234.50 USD');
  I.setLang('tr'); I.setCurrency('TRY'); assert.strictEqual(I.t('Bu ay 5 TL'), 'Bu ay 5 TL');
});
t('sözlükte olmayan metin Türkçe kalır (kullanıcı verisi korunur)', () => {
  I.setLang('en'); assert.strictEqual(I.t('Benim özel notum'), 'Benim özel notum');
});
t('toast ve onay metinleri main.js içinde çevrilebilir anahtarlara sahip', () => {
  const lits = []; MAIN.replace(/toast\('((?:[^'\\]|\\.)*)'\)/g, (_, s) => lits.push(s.replace(/\\'/g, "'")));
  const bad = lits.filter(s => /\p{L}{3}/u.test(s) && I18N_DICT.en[I.norm(s)] === undefined);
  assert.strictEqual(bad.length, 0, bad.join(' | '));
});
console.log('\n' + (fail ? fail + ' BAŞARISIZ, ' : '') + pass + ' test geçti'); process.exitCode = fail ? 1 : 0;
