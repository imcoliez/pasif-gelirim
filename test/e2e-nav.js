// Aşama 2: 5 sekmeli yüzen kapsül alt menü testleri (Expanding Label).
const path = require('path'), fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const Core = require('../www/core.js');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html');
let fails = 0;
function ok(c, m) { if (c) console.log('  ok  ' + m); else { fails++; console.error('FAIL  ' + m); } }

(async () => {
  const T = Date.now();
  const st = Core.defaultState(); st.user.name = 'Ali'; st.user.onboarded = true; st.user.lang = 'tr';
  Core.setPackage(st, 'manual', T);
  Core.addFinance(st, { type: 'in', amount: 1234, cat: 'satis', date: new Date().toISOString().slice(0, 10), note: 'nav-test-kaydi' }, T);
  const raw = JSON.stringify(st);
  fs.mkdirSync(path.resolve(__dirname, '../shots'), { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

  async function open(vp, theme, seed) {
    const ctx = await browser.newContext({ viewport: vp, locale: 'tr-TR' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
    await page.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
    await page.addInitScript(([r, th, seedIt]) => { try { if (seedIt && !localStorage.getItem('pasif_gelirim_state_v1')) { const s = JSON.parse(r); s.settings.theme = th; localStorage.setItem('pasif_gelirim_state_v1', JSON.stringify(s)); } } catch (e) { } }, [raw, theme, seed !== false]);
    await page.goto(URL);
    await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('.tab');
    return { ctx, page, errors };
  }
  const active = p => p.evaluate(() => { const a = document.querySelectorAll('.tab.on'); return a.length === 1 ? a[0].getAttribute('data-route') : 'n=' + a.length; });
  const widths = p => p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.tab'), t => Math.round(t.getBoundingClientRect().width)));
  const route = p => p.evaluate(() => (window.history.state || {}).route);
  const settle = p => p.waitForTimeout(550);

  // ---- 390x780 koyu ----
  let { ctx, page, errors } = await open({ width: 390, height: 780 }, 'dark');
  const names = await page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.tab .lb'), e => e.textContent));
  ok(JSON.stringify(names) === JSON.stringify(['Ana Sayfa', 'Projeler', 'Yapay Zekâ', 'Araçlar', 'Hesabım']), 'beş sekme doğru sırada: ' + names.join(', '));
  ok((await page.locator('.tab svg.i').count()) === 5, 'her sekmede çizgi ikon var');
  ok(await page.evaluate(() => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.getElementById('tabs').innerText)), 'alt menüde emoji yok');
  ok((await active(page)) === 'home', 'açılışta Ana Sayfa seçili');
  const cap = await page.evaluate(() => { const r = document.getElementById('tabs').getBoundingClientRect(); const cs = getComputedStyle(document.getElementById('tabs')); return { b: window.innerHeight - r.bottom, w: r.width, l: r.left, rr: window.innerWidth - r.right, rad: parseFloat(cs.borderTopLeftRadius), pos: cs.position, bg: cs.backgroundColor }; });
  ok(cap.pos === 'fixed' && cap.b > 4 && cap.l > 4 && cap.rr > 4, 'menü ekranın altında yüzüyor (kenarlardan boşluklu)');
  ok(cap.rad >= 24, 'menü yuvarlatılmış kapsül (' + cap.rad + 'px)');
  ok(/rgba\(/.test(cap.bg) && !/, 1\)$/.test(cap.bg), 'kapsül hafif şeffaf: ' + cap.bg);
  // yalnızca aktif sekmede etiket görünür
  const vis = await page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.tab'), t => { const l = t.querySelector('.lb'); return l.getBoundingClientRect().width > 20 && parseFloat(getComputedStyle(l).opacity) > .9; }));
  ok(JSON.stringify(vis) === JSON.stringify([true, false, false, false, false]), 'aktif sekme ikon + ad, diğerleri yalnızca ikon');
  const w0 = await widths(page);
  ok(w0[0] > w0[1] * 1.8, 'aktif sekme genişlemiş: ' + w0.join('/'));
  await page.screenshot({ path: path.resolve(__dirname, '../shots/nav-home-dark.png') });

  // ---- sekmeler arası geçiş ----
  const tabs = [['projects', 'Projelerim'], ['chat', 'Sohbet'], ['tools', 'Hesaplayıcı'], ['account', 'Ayarlar'], ['home', 'Gelir ekle']];
  for (const [r, needle] of tabs) {
    await page.click('.tab[data-route="' + r + '"]'); await settle(page);
    ok((await active(page)) === r, 'sekme ' + r + ' seçildi');
    ok((await page.innerText('#main')).includes(needle) || (await page.innerText('body')).includes(needle), r + ' ekranı açıldı (“' + needle + '” görünüyor)');
    const w = await widths(page); const i = ['home', 'projects', 'chat', 'tools', 'account'].indexOf(r);
    ok(w[i] === Math.max.apply(null, w) && w[i] > 70, r + ': aktif sekme genişledi');
    ok(await page.evaluate(() => { const a = document.querySelector('.tab.on .lb'); return a.scrollWidth <= a.clientWidth + 1; }), r + ': etiket kesilmiyor');
  }
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'yatay taşma yok');
  ok(errors.length === 0, 'konsolda hata yok (390 koyu) ' + errors.join(' | '));

  // ---- Araçlar: mevcut tüm araçlara erişim ----
  await page.click('.tab[data-route="tools"]'); await settle(page);
  for (const r of ['money', 'charts', 'calc', 'market', 'plans', 'auto', 'glossary', 'tasks']) {
    ok((await page.locator('#main [data-act=go][data-route="' + r + '"]').count()) === 1, 'Araçlar içinde ' + r + ' kutucuğu var');
  }
  await page.click('#main [data-route="calc"]'); await settle(page);
  ok((await active(page)) === 'tools' && await page.isVisible('.back'), 'alt ekranda (Hesaplayıcı) Araçlar sekmesi seçili ve geri düğmesi var');
  await page.goBack(); await settle(page);
  ok((await route(page)) === 'tools' && (await active(page)) === 'tools', 'geri tuşu Araçlar giriş ekranına döndürüyor');

  // ---- Hesabım: ayarlar, paketler, geçmiş, yardım ----
  await page.click('.tab[data-route="account"]'); await settle(page);
  for (const r of ['settings', 'packages', 'history', 'about']) ok((await page.locator('#main [data-act=go][data-route="' + r + '"]').count()) === 1, 'Hesabım içinde ' + r + ' kutucuğu var');
  await page.click('#main [data-route="settings"]'); await settle(page);
  ok((await active(page)) === 'account' && (await page.innerText('#main')).includes('Dil ve para birimi') && (await page.innerText('#main')).includes('Yedek al (JSON)') && (await page.innerText('#main')).includes('PIN'), 'Ayarlar (dil, tema, güvenlik, yedek) Hesabım altında erişilebilir');
  // üst çubuktaki kısayollar hâlâ çalışıyor
  await page.click('.top [data-route="history"]'); await settle(page);
  ok((await active(page)) === 'account', 'üst çubuk Geçmiş kısayolu çalışıyor');

  // ---- Projeler ----
  await page.click('.tab[data-route="projects"]'); await settle(page);
  ok((await page.locator('#main [data-act=go][data-route="tasks"]').count()) === 1, 'Projeler başlangıç ekranında Görevler girişi var');
  await page.click('#main [data-route="tasks"]'); await settle(page);
  ok((await active(page)) === 'projects', 'Görevler ekranında Projeler sekmesi seçili');

  // ---- Ana sayfa verileri, yeniden açılış ----
  await page.click('.tab[data-route="home"]'); await settle(page);
  ok((await page.innerText('#main')).includes('1.234'), 'ana sayfa finansal özeti korunuyor');
  await page.click('.tab[data-route="tools"]'); await settle(page);
  await page.reload(); await page.waitForSelector('.tab'); await settle(page);
  ok((await active(page)) === 'home' && (await page.innerText('#main')).includes('1.234'), 'yeniden açınca navigasyon Ana Sayfa ile başlıyor, veriler duruyor');
  const stored = await page.evaluate(() => localStorage.getItem('pasif_gelirim_state_v1'));
  ok(stored.includes('nav-test-kaydi'), 'kullanıcı kayıtları localStorage’da korunuyor');
  await ctx.close();

  // ---- küçük ekran + içerik örtüşmesi, her iki tema ----
  for (const [th, vp] of [['dark', { width: 320, height: 568 }], ['light', { width: 320, height: 568 }], ['dark', { width: 360, height: 640 }]]) {
    const o = await open(vp, th); const p = o.page;
    for (const r of ['home', 'projects', 'chat', 'tools', 'account']) {
      await p.click('.tab[data-route="' + r + '"]'); await settle(p);
      const m = await p.evaluate(() => {
        const t = document.getElementById('tabs').getBoundingClientRect();
        const a = document.querySelector('.tab.on .lb');
        const tb = Array.prototype.map.call(document.querySelectorAll('.tab'), x => x.getBoundingClientRect());
        window.scrollTo(0, document.documentElement.scrollHeight);
        const kids = Array.prototype.filter.call(document.getElementById('main').children, c => c.getBoundingClientRect().height > 0);
        const last = kids.length ? kids[kids.length - 1].getBoundingClientRect().bottom : 0;
        return { tabTop: t.top, last: last, trunc: a.scrollWidth > a.clientWidth + 1, tw: t.width, sum: tb.reduce((s, x) => s + x.width, 0), over: document.documentElement.scrollWidth > window.innerWidth + 1, lb: a.textContent };
      });
      ok(!m.over, vp.width + ' ' + th + ' ' + r + ': yatay taşma yok');
      ok(!m.trunc, vp.width + ' ' + th + ' ' + r + ': etiket “' + m.lb + '” sığıyor');
      ok(m.sum <= m.tw + 1, vp.width + ' ' + th + ' ' + r + ': beş sekme kapsüle sığıyor');
      await p.waitForTimeout(100);
      ok(m.last <= m.tabTop + 1 || m.last === 0, vp.width + ' ' + th + ' ' + r + ': son içerik menünün altında kalmıyor (' + Math.round(m.last) + '/' + Math.round(m.tabTop) + ')');
    }
    await p.click('.tab[data-route="tools"]'); await settle(p);
    await p.screenshot({ path: path.resolve(__dirname, '../shots/nav-' + vp.width + '-' + th + '.png') });
    ok(o.errors.length === 0, vp.width + ' ' + th + ': konsolda hata yok ' + o.errors.join('|'));
    await o.ctx.close();
  }

  // ---- diller: etiket sığması (en uzun çeviriler) ----
  for (const lang of ['en', 'de', 'es', 'ru', 'ar']) {
    const ctx2 = await browser.newContext({ viewport: { width: 320, height: 568 }, locale: lang });
    const p = await ctx2.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route(/frankfurter\.dev|binance\.(com|vision)/, r => r.abort());
    await p.addInitScript(([r, l]) => { try { if (!localStorage.getItem('pasif_gelirim_state_v1')) { const s = JSON.parse(r); s.settings.lang = l; s.settings.language = l; s.user.lang = l; localStorage.setItem('pasif_gelirim_state_v1', JSON.stringify(s)); } } catch (e) { } }, [raw, lang]);
    await p.goto(URL); await p.waitForSelector('.tab'); await p.waitForTimeout(400);
    const labels = [];
    for (const r of ['home', 'projects', 'chat', 'tools', 'account']) {
      await p.click('.tab[data-route="' + r + '"]'); await p.waitForTimeout(500);
      const m = await p.evaluate(() => { const a = document.querySelector('.tab.on .lb'); return { t: a.textContent, trunc: a.scrollWidth > a.clientWidth + 1 }; });
      labels.push(m.t); ok(!m.trunc, lang + ': “' + m.t + '” kesilmiyor');
    }
    const dir = await p.evaluate(() => document.documentElement.getAttribute('dir'));
    ok(lang === 'tr' || labels.every(l => l && !/[ğş]/.test(l) || lang !== 'tr'), lang + ' etiketleri: ' + labels.join(', ') + (dir === 'rtl' ? ' (RTL)' : ''));
    ok(!labels.includes('Ana Sayfa') && !labels.includes('Projeler'), lang + ': sekme adları çevrilmiş');
    ok(errs.length === 0, lang + ': konsolda hata yok ' + errs.join('|'));
    await ctx2.close();
  }

  await browser.close();
  if (fails) { console.error('\n' + fails + ' kontrol başarısız'); process.exit(1); }
  console.log('\nNavigasyon testleri geçti');
})().catch(e => { console.error(e); process.exit(1); });
