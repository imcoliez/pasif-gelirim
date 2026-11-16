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
    if (url.includes('frankfurter') && url.includes('symbols=EUR')) {
      const rates = {}; for (let i = 39; i >= 0; i--) { const d = new Date(NOW - i * DAY); if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue; rates[d.toISOString().slice(0, 10)] = { EUR: 0.9, GBP: 0.8, CHF: 0.88, TRY: 40 }; }
      return { ok: true, json: async () => ({ base: 'USD', rates }) };
    }
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
  await test('seçili para birimi USD: fiyatlar dolar cinsinden, Dolar kalemi yok, TL kalemi var', async () => {
    const f = mockFetch(); const r = await M.load(f, 30, NOW, 'USD');
    assert.strictEqual(r.errors.length, 0); assert.strictEqual(r.cur, 'USD'); assert.ok(!r.fallback);
    const sy = r.items.map(i => i.sym); assert.ok(!sy.includes('USD')); assert.ok(sy.includes('TRY') && sy.includes('EUR') && sy.includes('BTC') && sy.includes('GRAM'));
    assert.ok(r.items.every(i => i.unit === 'USD'));
    const btc = r.items.find(i => i.sym === 'BTC'); assert.ok(Math.abs(btc.price - 60000 - 30 * 100) < 1e-6, 'BTC doğrudan USDT fiyatı: ' + btc.price);
    const eur = r.items.find(i => i.sym === 'EUR'); assert.ok(Math.abs(eur.price - 1 / 0.9) < 1e-6, 'EUR/USD = 1/0,9: ' + eur.price);
    const trl = r.items.find(i => i.sym === 'TRY'); assert.ok(Math.abs(trl.price - 1 / 40) < 1e-9);
    const gram = r.items.find(i => i.sym === 'GRAM'); assert.ok(Math.abs(gram.price - (2700 + 30 * 5) / M.OZ_GRAM) < 1e-6);
  });
  await test('seçili para birimi EUR: çapraz kur, hafta sonu boşlukları kapanır', async () => {
    const r = await M.load(mockFetch(), 30, NOW, 'EUR'); assert.strictEqual(r.cur, 'EUR'); assert.ok(r.items.every(i => i.unit === 'EUR'));
    const usd = r.items.find(i => i.sym === 'USD'); assert.ok(Math.abs(usd.price - 0.9) < 1e-9, 'USD→EUR 0,9: ' + usd.price);
    const btc = r.items.find(i => i.sym === 'BTC'); assert.ok(Math.abs(btc.price - (60000 + 3000) * 0.9) < 1e-4);
    assert.ok(btc.series.length >= 28, 'kripto serisinde hafta sonu günleri düşmedi: ' + btc.series.length);
    assert.ok(!r.items.some(i => i.sym === 'EUR'));
  });
  await test('SAR ve AED dolara sabit bağlı: ek istek gerekmez', async () => {
    for (const [c, k] of [['SAR', 3.75], ['AED', 3.6725]]) {
      const f = mockFetch(); const r = await M.load(f, 30, NOW, c); assert.strictEqual(r.cur, c);
      const usd = r.items.find(i => i.sym === 'USD'); assert.ok(Math.abs(usd.price - k) < 1e-9, c + ': ' + usd.price);
      const btc = r.items.find(i => i.sym === 'BTC'); assert.ok(Math.abs(btc.price - 63000 * k) < 1e-3);
    }
  });
  await test('RUB: Binance USDTRUB varsa kullanılır, yoksa USD\'ye düşer ve bildirir', async () => {
    const f = async url => { if (url.includes('USDTRUB')) return { ok: true, json: async () => klineRows(40, 90, 0.1) }; return mockFetch()(url); };
    const r = await M.load(f, 30, NOW, 'RUB'); assert.strictEqual(r.cur, 'RUB'); assert.ok(!r.fallback);
    const btc = r.items.find(i => i.sym === 'BTC'); assert.ok(btc.price > 60000 * 90);
    const g = mockFetch({ fail: u => u.includes('USDTRUB') }); const r2 = await M.load(g, 30, NOW, 'RUB');
    assert.strictEqual(r2.cur, 'USD'); assert.strictEqual(r2.wanted, 'RUB'); assert.ok(r2.fallback); assert.ok(r2.items.length >= 8);
  });
  await test('TRY (varsayılan) yolu değişmedi', async () => {
    const r = await M.load(mockFetch(), 30, NOW, 'TRY'); assert.strictEqual(r.items.length, 11); assert.strictEqual(r.cur, 'TRY');
    assert.strictEqual(r.items.find(i => i.sym === 'ONS').unit, '$');
  });
  await test('kur kaynağı çökerse (EUR) diğer varlıklar USD ile gösterilir, çökmez', async () => {
    const f = mockFetch({ fail: u => u.includes('frankfurter') }); const r = await M.load(f, 30, NOW, 'EUR');
    assert.strictEqual(r.cur, 'USD'); assert.ok(r.fallback); assert.ok(r.items.some(i => i.sym === 'BTC'));
  });
  await test('uygulama: parçalar (applyRate ileri taşıma, birim etiketi)', async () => {
    const out = M.applyRate([{ t: 5 * DAY + 1, v: 10 }, { t: 6 * DAY + 1, v: 10 }, { t: 7 * DAY + 1, v: 10 }], [{ t: 5 * DAY + 5, v: 2 }], 1);
    assert.deepStrictEqual(out.map(p => p.v), [20, 20, 20]);
    assert.strictEqual(M.unitLabel('EUR'), '€'); assert.strictEqual(M.unitLabel('TL'), 'TL'); assert.strictEqual(M.unitLabel('SAR'), 'SAR'); assert.strictEqual(M.fmtPrice(1.5, 'GBP'), '1,50 £');
  });

  console.log('\n' + passed + ' test geçti');
})();
