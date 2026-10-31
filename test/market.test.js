const assert = require('assert');
const M = require('../www/market.js');
let passed = 0;
function test(n, f) { return Promise.resolve().then(f).then(() => { passed++; console.log('  ok  ' + n); }, e => { process.exitCode = 1; console.error('FAIL  ' + n + '\n      ' + e.message); }); }
const NOW = Date.parse('2026-10-31T12:00:00Z'), DAY = 86400000;
function klineRows(n, start, step, endOffset) { const rows = []; for (let i = n - 1; i >= 0; i--) { const t = NOW - i * DAY; rows.push([t, '0', '0', '0', String(start + (n - 1 - i) * step), '0']); } return rows; }
function fxJson(code, n, start, step) {
  const rates = {}; for (let i = n - 1; i >= 0; i--) { const d = new Date(NOW - i * DAY); rates[d.toISOString().slice(0, 10)] = { TRY: start + (n - 1 - i) * step }; }
  return { amount: 1, base: code, rates };
}
function mockFetch(opts) {
  opts = opts || {}; const urls = [];
  const f = async url => {
    urls.push(url);
    if (opts.fail && opts.fail(url)) return { ok: false, status: 500, json: async () => ({}) };
    if (url.includes('frankfurter')) { const code = /base=(\w+)/.exec(url)[1]; return { ok: true, json: async () => fxJson(code, 40, code === 'USD' ? 40 : 45, 0.1) }; }
    const sym = /symbol=(\w+)/.exec(url)[1], lim = +/limit=(\d+)/.exec(url)[1];
    const base = { USDTTRY: [40, 0.1], BTCUSDT: [60000, 100], ETHUSDT: [3000, 10], BNBUSDT: [600, 1], XRPUSDT: [0.5, 0.001], SOLUSDT: [150, 1], PAXGUSDT: [2700, 5] }[sym];
    if (!base) return { ok: false, status: 400, json: async () => ({}) };
    return { ok: true, json: async () => klineRows(lim, base[0], base[1]) };
  };
  f.urls = urls; return f;
}

(async () => {
  await test('tüm varlıklar yüklenir, sıralı ve doğru hesaplı', async () => {
    const f = mockFetch(); const r = await M.load(f, 30, NOW);
    assert.strictEqual(r.errors.length, 0); assert.strictEqual(r.items.length, 11);
    assert.deepStrictEqual(r.items.map(i => i.sym), ['USD', 'EUR', 'GBP', 'CHF', 'GRAM', 'ONS', 'BTC', 'ETH', 'BNB', 'XRP', 'SOL']);
    const usd = r.items[0]; assert.ok(usd.price > 40 && usd.series.length >= 25);
    const gram = r.items.find(i => i.sym === 'GRAM'); const ons = r.items.find(i => i.sym === 'ONS');
    const lastUsdt = 40 + 30 * 0.1, lastPaxg = 2700 + 30 * 5;
    assert.ok(Math.abs(gram.price - lastPaxg * lastUsdt / M.OZ_GRAM) < 0.01, 'gram altın = PAXG x USDTTRY / 31,1035');
    assert.strictEqual(ons.unit, '$'); assert.ok(Math.abs(ons.price - lastPaxg) < 1e-6);
    const btc = r.items.find(i => i.sym === 'BTC'); assert.ok(Math.abs(btc.price - (60000 + 3000) * lastUsdt) < 1);
    assert.ok(r.items.every(i => i.series.length <= 90 && isFinite(i.change) && i.high >= i.low));
  });
  await test('USDTTRY tek kez istenir (paylaşılan), dönem sınırı gönderilir', async () => {
    const f = mockFetch(); await M.load(f, 7, NOW);
    assert.strictEqual(f.urls.filter(u => u.includes('USDTTRY')).length, 1, 'USDTTRY paylaşılıyor... ' + f.urls.filter(u => u.includes('USDTTRY')).length);
    assert.ok(f.urls.some(u => u.includes('limit=8')), '7 gün = 8 mum');
    assert.ok(f.urls.every(u => u.startsWith('https://')), 'yalnızca https');
  });
  await test('bir kaynak çökerse diğerleri gösterilir; Binance yedek adrese geçer', async () => {
    const f = mockFetch({ fail: u => u.includes('frankfurter') }); const r = await M.load(f, 30, NOW);
    assert.strictEqual(r.items.filter(i => i.group === 'fx').length, 0); assert.strictEqual(r.errors.length, 4); assert.ok(r.items.length === 7);
    const f2 = mockFetch({ fail: u => u.startsWith('https://api.binance.com') }); const r2 = await M.load(f2, 30, NOW);
    assert.strictEqual(r2.items.length, 11, 'yedek adres kullanıldı'); assert.ok(f2.urls.some(u => u.startsWith('https://data-api.binance.vision')));
    const f3 = mockFetch({ fail: () => true }); const r3 = await M.load(f3, 30, NOW);
    assert.strictEqual(r3.items.length, 0); assert.ok(r3.errors.length >= 8);
  });
  await test('bozuk veri güvenle elenir', async () => {
    assert.strictEqual(M.parseFx(null, 30, NOW), null); assert.strictEqual(M.parseFx({ rates: {} }, 30, NOW), null);
    assert.strictEqual(M.parseFx({ rates: { '2026-10-30': { TRY: 'abc' }, '2026-10-31': { TRY: -1 } } }, 30, NOW), null);
    assert.strictEqual(M.parseKlines('x'), null); assert.strictEqual(M.parseKlines([[1, 0, 0, 0, 'NaN']]), null);
    assert.strictEqual(M.multiply([{ t: 0, v: 1 }, { t: DAY * 5, v: 2 }], [{ t: DAY * 9, v: 3 }]), null);
  });
  await test('fiyat biçimi', async () => {
    assert.strictEqual(M.fmtPrice(41.2345, 'TL'), '41,23 TL'); assert.strictEqual(M.fmtPrice(0.4567, 'TL'), '0,4567 TL');
    assert.strictEqual(M.fmtPrice(2700, '$'), '2.700,00 $');
  });
  console.log('\n' + passed + ' test geçti');
})();
