// tools/tr/x_<dil>.txt + new_keys.json -> tools/tr/extra.js
const fs = require('fs'), path = require('path');
const keys = JSON.parse(fs.readFileSync(path.join(__dirname, 'tr/new_keys.json'), 'utf8'));
const out = {};
['en', 'de', 'es', 'ru', 'ar'].forEach(c => {
  out[c] = {};
  fs.readFileSync(path.join(__dirname, 'tr/x_' + c + '.txt'), 'utf8').split('\n').filter(Boolean).forEach(l => {
    const i = l.indexOf('|'); const k = keys[+l.slice(0, i)];
    const tr = l.slice(i + 1);
    if (k === undefined || (k.match(/#/g) || []).length !== (tr.match(/#/g) || []).length) throw new Error(c + ' ' + l.slice(0, 30));
    out[c][k] = tr;
  });
  if (Object.keys(out[c]).length !== keys.length) throw new Error(c + ' eksik');
});
fs.writeFileSync(path.join(__dirname, 'tr/extra.js'), 'module.exports = ' + JSON.stringify(out, null, 1) + ';\n');
console.log('ok', keys.length);
