// tools/tr/x_<dil>.txt + new_keys.json -> tools/tr/extra.js
const fs = require('fs'), path = require('path');
// Sürümler: [anahtar dosyası, çeviri öneki]. Yeni metinler için yeni bir satır ekle.
const SETS = [['new_keys.json', 'x'], ['new3.json', 'z'], ['new4.json', 'w'], ['new5.json', 'v'], ['new6.json', 'u'], ['new7.json', 't'], ['new8.json', 's'], ['new9.json', 'r'], ['new10.json', 'q']];
const out = {};
['en', 'de', 'es', 'ru', 'ar'].forEach(c => {
  out[c] = {};
  SETS.forEach(([kf, pre]) => {
    const keys = JSON.parse(fs.readFileSync(path.join(__dirname, 'tr/' + kf), 'utf8'));
    let n = 0;
    fs.readFileSync(path.join(__dirname, 'tr/' + pre + '_' + c + '.txt'), 'utf8').split('\n').filter(Boolean).forEach(l => {
      const i = l.indexOf('|'); const k = keys[+l.slice(0, i)];
      const tr = l.slice(i + 1);
      if (k === undefined || (k.match(/#/g) || []).length !== (tr.match(/#/g) || []).length) throw new Error(c + ' ' + l.slice(0, 30));
      out[c][k] = tr; n++;
    });
    if (n !== keys.length) throw new Error(c + ' ' + kf + ' eksik');
  });
});
fs.writeFileSync(path.join(__dirname, 'tr/extra.js'), 'module.exports = ' + JSON.stringify(out, null, 1) + ';\n');
console.log('ok');
