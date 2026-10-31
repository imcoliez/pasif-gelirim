/* Pasif Gelirim — piyasa verileri (döviz, altın, kripto). Anahtarsız herkese açık kaynaklar:
   Döviz: Frankfurter (Avrupa Merkez Bankası kurları). Altın/kripto: Binance herkese açık fiyat verisi.
   Altın, PAXG (1 ons altına dayalı) üzerinden YAKLAŞIK hesaplanır; Türkiye'deki gram altın fiyatından farklı olabilir. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Market = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const FX_BASE = 'https://api.frankfurter.dev/v1';
  const BN_HOSTS = ['https://api.binance.com', 'https://data-api.binance.vision'];
  const OZ_GRAM = 31.1034768;
  const MAX_POINTS = 90;

  const FX = [['USD', 'Dolar', 'USD'], ['EUR', 'Euro', 'EUR'], ['GBP', 'Sterlin', 'GBP'], ['CHF', 'İsviçre Frangı', 'CHF']];
  const CRYPTO = [['BTC', 'Bitcoin', 'BTCUSDT'], ['ETH', 'Ethereum', 'ETHUSDT'], ['BNB', 'BNB', 'BNBUSDT'], ['XRP', 'XRP', 'XRPUSDT'], ['SOL', 'Solana', 'SOLUSDT']];

  function ymd(ms) { const d = new Date(ms); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  function downsample(pts) {
    if (pts.length <= MAX_POINTS) return pts;
    const out = [], step = (pts.length - 1) / (MAX_POINTS - 1);
    for (let i = 0; i < MAX_POINTS; i++) out.push(pts[Math.round(i * step)]);
    return out;
  }
  function stats(series) {
    const v = series.map(function (p) { return p.v; });
    const first = v[0], last = v[v.length - 1];
    return { price: last, change: first > 0 ? Math.round((last - first) / first * 10000) / 100 : 0, high: Math.max.apply(null, v), low: Math.min.apply(null, v) };
  }

  // ---- ayrıştırıcılar (saf fonksiyonlar, testlenir) ----
  function parseFx(json, days, nowMs) {
    if (!json || typeof json !== 'object' || !json.rates || typeof json.rates !== 'object') return null;
    const minT = nowMs - (days + 1) * 86400000;
    const pts = Object.keys(json.rates).sort().map(function (d) {
      const v = json.rates[d] && json.rates[d].TRY;
      return { t: Date.parse(d + 'T12:00:00Z'), v: +v };
    }).filter(function (p) { return isFinite(p.t) && isFinite(p.v) && p.v > 0 && p.t >= minT; });
    return pts.length >= 2 ? downsample(pts) : null;
  }
  function parseKlines(rows) {
    if (!Array.isArray(rows)) return null;
    const pts = rows.map(function (r) { return { t: +r[0], v: +r[4] }; }).filter(function (p) { return isFinite(p.t) && isFinite(p.v) && p.v > 0; });
    return pts.length >= 2 ? pts : null;
  }
  // iki seriyi aynı günlere göre çarpar (ör. USDT fiyatı x USDTTRY)
  function multiply(a, b, div) {
    const map = {};
    b.forEach(function (p) { map[Math.floor(p.t / 86400000)] = p.v; });
    const out = [];
    a.forEach(function (p) {
      const k = Math.floor(p.t / 86400000), r = map[k];
      if (r) out.push({ t: p.t, v: p.v * r / (div || 1) });
    });
    return out.length >= 2 ? out : null;
  }

  function timeout(fetchFn, url, ms) {
    return new Promise(function (resolve, reject) {
      let ctl = null; try { ctl = new AbortController(); } catch (e) { }
      const timer = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error('zaman aşımı')); }, ms);
      fetchFn(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(resolve, function (e) { clearTimeout(timer); reject(e); });
    });
  }

  function klines(fetchFn, symbol, days) {
    const q = '/api/v3/klines?symbol=' + symbol + '&interval=1d&limit=' + (days + 1);
    let p = Promise.reject(new Error('x'));
    BN_HOSTS.forEach(function (h) { p = p.catch(function () { return timeout(fetchFn, h + q, 12000); }); });
    return p.then(function (rows) { const s = parseKlines(rows); if (!s) throw new Error('veri yok'); return s; });
  }
  function fx(fetchFn, code, days, nowMs) {
    const url = FX_BASE + '/' + ymd(nowMs - (days + 8) * 86400000) + '..?base=' + code + '&symbols=TRY';
    return timeout(fetchFn, url, 12000).then(function (j) { const s = parseFx(j, days, nowMs); if (!s) throw new Error('veri yok'); return s; });
  }

  function item(id, name, sym, group, unit, series) {
    const st = stats(series);
    return { id: id, name: name, sym: sym, group: group, unit: unit, price: st.price, change: st.change, high: st.high, low: st.low, series: series };
  }

  // days: 7 | 30 | 90. Dönen: { items, errors, at }. Bir kaynak başarısız olsa da diğerleri gösterilir.
  function load(fetchFn, days, nowMs) {
    days = days === 7 || days === 90 ? days : 30;
    nowMs = nowMs || Date.now();
    const tasks = [];
    const items = [], errors = [];
    function add(label, promise, make) {
      tasks.push(promise.then(function (v) { make(v); }, function () { errors.push(label); }));
    }
    FX.forEach(function (f) {
      add(f[1], fx(fetchFn, f[0], days, nowMs), function (s) { items.push(item('fx-' + f[0], f[1], f[0], 'fx', 'TL', s)); });
    });
    const usdtTry = klines(fetchFn, 'USDTTRY', days);
    CRYPTO.forEach(function (c) {
      add(c[1], Promise.all([klines(fetchFn, c[2], days), usdtTry]).then(function (r) {
        const s = multiply(r[0], r[1]); if (!s) throw new Error('birleştirilemedi'); return s;
      }), function (s) { items.push(item('cr-' + c[0], c[1], c[0], 'crypto', 'TL', s)); });
    });
    const paxg = klines(fetchFn, 'PAXGUSDT', days);
    add('Gram altın', Promise.all([paxg, usdtTry]).then(function (r) {
      const s = multiply(r[0], r[1], OZ_GRAM); if (!s) throw new Error('birleştirilemedi'); return s;
    }), function (s) { items.push(item('gold-gram', 'Gram altın (yaklaşık)', 'GRAM', 'gold', 'TL', s)); });
    add('Ons altın', paxg, function (s) { items.push(item('gold-oz', 'Ons altın', 'ONS', 'gold', '$', s)); });
    return Promise.all(tasks).then(function () {
      const order = FX.map(function (f) { return 'fx-' + f[0]; }).concat(['gold-gram', 'gold-oz'], CRYPTO.map(function (c) { return 'cr-' + c[0]; }));
      items.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
      return { items: items, errors: errors, at: nowMs, days: days };
    });
  }

  function fmtPrice(v, unit) {
    const d = v >= 1000 ? 2 : v >= 1 ? 2 : 4;
    return Number(v).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }) + (unit === '$' ? ' $' : ' TL');
  }

  return { load: load, parseFx: parseFx, parseKlines: parseKlines, multiply: multiply, fmtPrice: fmtPrice, OZ_GRAM: OZ_GRAM, FX: FX, CRYPTO: CRYPTO };
});
