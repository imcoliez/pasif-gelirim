// Çeviri dosyalarını anahtar listesiyle karşılaştırır: satır sayısı, '#' sayısı.
const fs = require('fs'), path = require('path');
const keys = JSON.parse(fs.readFileSync(path.join(__dirname, 'tr/keys.json'), 'utf8'));
const lang = process.argv[2];
const lines = fs.readFileSync(path.join(__dirname, 'tr/' + lang + '.txt'), 'utf8').split('\n').filter(Boolean);
let bad = 0; const seen = new Set();
lines.forEach(l => {
  const i = l.indexOf('|'); const idx = +l.slice(0, i), tr = l.slice(i + 1); seen.add(idx);
  const k = keys[idx]; if (k === undefined) { console.log('fazla', idx); bad++; return; }
  const a = (k.match(/#/g) || []).length, b = (tr.match(/#/g) || []).length;
  if (a !== b) { console.log('# farkı', idx, k.slice(0, 50), '=>', tr.slice(0, 50)); bad++; }
});
keys.forEach((k, i) => { if (!seen.has(i) && !/^[A-Z]{2,5}$/.test(k)) { console.log('eksik', i, k.slice(0, 50)); bad++; } });
console.log(lang, lines.length + ' satır', bad + ' sorun');
process.exitCode = bad ? 1 : 0;
