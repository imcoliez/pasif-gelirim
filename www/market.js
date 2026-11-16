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

  // ---- Seçili para birimine göre fiyat (TRY dışındaki para birimleri) ----
  // Her şey önce ABD Doları'na çevrilir ("1 birim kaç USD"), sonra seçili para birimine bölünür.
  // USD/EUR/GBP/CHF/TRY: Avrupa Merkez Bankası (Frankfurter). SAR ve AED: ABD Doları'na sabit bağlıdır (3,75 ve 3,6725).
  // RUB: AMB yayımlamaz; Binance USDT/RUB paritesinden alınır, alınamazsa USD ile gösterilir.
  const PEG = { USD: 1, SAR: 1 / 3.75, AED: 1 / 3.6725 };
  const NAMES = { TRY: 'Türk Lirası', USD: 'Dolar', EUR: 'Euro', GBP: 'Sterlin', CHF: 'İsviçre Frangı' };
  const FX_LIST = ['USD', 'EUR', 'GBP', 'CHF', 'TRY'];
  function parseFxMulti(json, days, nowMs, symbols) {
    if (!json || typeof json !== 'object' || !json.rates || typeof json.rates !== 'object') return null;
    const minT = nowMs - (days + 1) * 86400000, out = {};
    symbols.forEach(function (sym) {
      const pts = Object.keys(json.rates).sort().map(function (d) {
        const r = json.rates[d] && +json.rates[d][sym];
        return { t: Date.parse(d + 'T12:00:00Z'), v: r > 0 ? 1 / r : NaN };   // 1 USD = r SYM  =>  1 SYM = 1/r USD
      }).filter(function (p) { return isFinite(p.t) && isFinite(p.v) && p.t >= minT; });
      if (pts.length >= 2) out[sym] = pts;
    });
    return out;
  }
  // Hafta sonu gibi kuru olmayan günlerde en son bilinen kur kullanılır (ileri taşıma).
  function applyRate(series, rate, div) {
    const D = 86400000, rs = rate.slice().sort(function (a, b) { return a.t - b.t; }), out = [];
    series.forEach(function (p) {
      const day = Math.floor(p.t / D); let r = null;
      for (let i = 0; i < rs.length; i++) { if (Math.floor(rs[i].t / D) <= day) r = rs[i]; else break; }
      if (!r && rs.length && Math.floor(rs[0].t / D) - day <= 5) r = rs[0];
      if (r) out.push({ t: p.t, v: p.v * r.v / (div || 1) });
    });
    return out.length >= 2 ? out : null;
  }
  function constSeries(ref, k) { return ref.map(function (p) { return { t: p.t, v: k }; }); }
  function scale(series, k) { return series.map(function (p) { return { t: p.t, v: p.v * k }; }); }
  function loadIn(fetchFn, cur, days, nowMs) {
    const items = [], errors = [];
    const fxUrl = FX_BASE + '/' + ymd(nowMs - (days + 8) * 86400000) + '..?base=USD&symbols=EUR,GBP,CHF,TRY';
    const fxP = timeout(fetchFn, fxUrl, 12000).then(function (j) { const m = parseFxMulti(j, days, nowMs, ['EUR', 'GBP', 'CHF', 'TRY']); if (!m) throw new Error('veri yok'); return m; });
    const usdtTry = klines(fetchFn, 'USDTTRY', days);
    const pax = klines(fetchFn, 'PAXGUSDT', days);
    // 1 birim seçili para = kaç USD (seri)
    const perCur = (cur === 'RUB'
      ? klines(fetchFn, 'USDTRUB', days).then(function (s) { return s.map(function (p) { return { t: p.t, v: 1 / p.v }; }); })
      : PEG[cur] ? pax.then(function (ref) { return constSeries(ref, PEG[cur]); })
      : fxP.then(function (m) { if (!m[cur]) throw new Error('kur yok'); return m[cur]; }));
    let shown = cur, note = '';
    return perCur.then(function (c) { return c; }, function () { shown = 'USD'; note = 'rate'; return pax.then(function (ref) { return constSeries(ref, 1); }); }).then(function (usdPerCur) {
      const inv = usdPerCur.map(function (p) { return { t: p.t, v: 1 / p.v }; });   // USD -> seçili para
      const toCur = function (usdSeries, div) { return applyRate(usdSeries, inv, div); };
      const tasks = [];
      function add(label, promise, make) { tasks.push(promise.then(function (v) { make(v); }, function () { errors.push(label); })); }
      FX_LIST.filter(function (x) { return x !== shown; }).forEach(function (x) {
        add(NAMES[x], x === 'USD' ? pax.then(function (ref) { return constSeries(ref, 1); }) : fxP.then(function (m) { if (!m[x]) throw new Error('kur yok'); return m[x]; }), function (usdSeries) {
          const s = toCur(usdSeries); if (!s) { errors.push(NAMES[x]); return; }
          items.push(item('fx-' + x, NAMES[x], x, 'fx', shown, s));
        });
      });
      CRYPTO.forEach(function (c) {
        add(c[1], klines(fetchFn, c[2], days).then(function (s) { const r = toCur(s); if (!r) throw new Error('birleştirilemedi'); return r; }), function (s) { items.push(item('cr-' + c[0], c[1], c[0], 'crypto', shown, s)); });
      });
      add('Gram altın', pax.then(function (s) { const r = toCur(s, OZ_GRAM); if (!r) throw new Error('birleştirilemedi'); return r; }), function (s) { items.push(item('gold-gram', 'Gram altın (yaklaşık)', 'GRAM', 'gold', shown, s)); });
      add('Ons altın', pax.then(function (s) { const r = toCur(s); if (!r) throw new Error('birleştirilemedi'); return r; }), function (s) { items.push(item('gold-oz', 'Ons altın', 'ONS', 'gold', shown, s)); });
      return Promise.all(tasks).then(function () {
        const order = FX_LIST.map(function (f) { return 'fx-' + f; }).concat(['gold-gram', 'gold-oz'], CRYPTO.map(function (c) { return 'cr-' + c[0]; }));
        items.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
        void usdtTry;
        return { items: items, errors: errors, at: nowMs, days: days, cur: shown, wanted: cur, fallback: note === 'rate' };
      });
    });
  }

  function item(id, name, sym, group, unit, series) {
    const st = stats(series);
    return { id: id, name: name, sym: sym, group: group, unit: unit, price: st.price, change: st.change, high: st.high, low: st.low, series: series };
  }

  // days: 7 | 30 | 90. Dönen: { items, errors, at }. Bir kaynak başarısız olsa da diğerleri gösterilir.
  function load(fetchFn, days, nowMs, cur) {
    days = days === 7 || days === 90 ? days : 30;
    nowMs = nowMs || Date.now();
    if (cur && cur !== 'TRY') return loadIn(fetchFn, cur, days, nowMs);
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
      return { items: items, errors: errors, at: nowMs, days: days, cur: 'TRY', wanted: 'TRY', fallback: false };
    });
  }

  const SYMBOL = { USD: '$', EUR: '€', GBP: '£', TRY: 'TL' };
  function unitLabel(unit) { return unit === 'TL' ? 'TL' : (SYMBOL[unit] || unit); }
  function fmtPrice(v, unit, locale) {
    const d = v >= 1 ? 2 : 4;
    return Number(v).toLocaleString(locale || 'tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ' + unitLabel(unit === '$' ? 'USD' : unit);
  }

  return { load: load, applyRate: applyRate, parseFxMulti: parseFxMulti, unitLabel: unitLabel, PEG: PEG, parseFx: parseFx, parseKlines: parseKlines, multiply: multiply, fmtPrice: fmtPrice, OZ_GRAM: OZ_GRAM, FX: FX, CRYPTO: CRYPTO };
});
