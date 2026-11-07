// tools/tr/<dil>.txt (numara|çeviri) + tools/tr/keys.json -> www/lang/<dil>.js
const fs = require('fs'), path = require('path');
const keys = JSON.parse(fs.readFileSync(path.join(__dirname, 'tr/keys.json'), 'utf8'));
const extra = require('./tr/extra.js');   // sonradan eklenen metinler: { en: {anahtar: çeviri}, ... }
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const out = path.join(__dirname, '../www/lang'); fs.mkdirSync(out, { recursive: true });
['en', 'de', 'es', 'ru', 'ar'].forEach(code => {
  const d = {};
  fs.readFileSync(path.join(__dirname, 'tr/' + code + '.txt'), 'utf8').split('\n').filter(Boolean).forEach(l => {
    const i = l.indexOf('|'); const k = keys[+l.slice(0, i)]; if (k !== undefined) d[k] = l.slice(i + 1);
  });
  MONTHS.forEach(m => { if (d[m]) { d[m + ' #'] = d[m] + ' #'; d[m + ' #: # TL'] = d[m] + ' #: # TL'; } });
  Object.assign(d, extra[code] || {});
  fs.writeFileSync(path.join(out, code + '.js'), '/* otomatik üretildi: tools/build_lang.js */\n(window.I18N_DICT = window.I18N_DICT || {}).' + code + ' = ' + JSON.stringify(d) + ';\n');
  console.log(code, Object.keys(d).length);
});
