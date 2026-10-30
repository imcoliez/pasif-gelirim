// Sunucu mantığı testi (sahte KV ve sahte Anthropic ile). Çalıştır: node test/worker.test.js
const assert = require('assert');
const path = require('path');
let passed = 0;
function test(n, f) { return f().then(() => { passed++; console.log('  ok  ' + n); }, e => { process.exitCode = 1; console.error('FAIL  ' + n + '\n      ' + e.message); }); }
const DEV = 'abcdefghijklmnop1234';
function kv() { const m = {}; return { get: async k => m[k] || null, put: async (k, v) => { m[k] = v; }, m }; }
function req(body, method, p) { return new Request('https://x.test' + (p || '/chat'), { method: method || 'POST', headers: { 'content-type': 'application/json' }, body: method === 'OPTIONS' || method === 'GET' ? undefined : JSON.stringify(body) }); }

(async () => {
  const mod = await import(path.resolve(__dirname, '../server/worker.mjs'));
  const W = mod.default;
  const calls = [];
  global.fetch = async (u, o) => { calls.push({ u, o: JSON.parse(o.body), h: o.headers }); return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Merhaba!' }] }), { status: 200 }); };
  const env = () => ({ ANTHROPIC_API_KEY: 'sk-test', LIMITS: kv() });
  const ok = { device: DEV, messages: [{ role: 'user', text: 'Hedef kitle ne demek?' }] };

  await test('geçerli istek cevap döner, anahtar yalnızca Anthropic isteğinde', async () => {
    const e = env(); const r = await W.fetch(req(ok), e);
    assert.strictEqual(r.status, 200); assert.strictEqual((await r.json()).reply, 'Merhaba!');
    assert.strictEqual(calls[0].u, 'https://api.anthropic.com/v1/messages'); assert.strictEqual(calls[0].h['x-api-key'], 'sk-test');
    assert.ok(/garanti/i.test(calls[0].o.system), 'dürüstlük talimatı var');
    assert.ok(r.headers.get('access-control-allow-origin'));
  });
  await test('yanıtta anahtar sızmaz, hata mesajları genel', async () => {
    global.fetch = async () => new Response('{"error":"sk-test leaked"}', { status: 401 });
    const r = await W.fetch(req(ok), env()); const t = await r.text();
    assert.strictEqual(r.status, 502); assert.ok(!t.includes('sk-test'));
    global.fetch = async (u, o) => { calls.push({ u, o: JSON.parse(o.body), h: o.headers }); return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Merhaba!' }] }), { status: 200 }); };
  });
  await test('geçersiz istekler reddedilir', async () => {
    const e = env();
    for (const b of [null, {}, { device: 'kisa', messages: ok.messages }, { device: DEV, messages: [] },
      { device: DEV, messages: [{ role: 'system', text: 'x' }] }, { device: DEV, messages: [{ role: 'assistant', text: 'x' }] },
      { device: DEV, messages: new Array(13).fill({ role: 'user', text: 'a' }) }]) {
      const r = await W.fetch(req(b), e); assert.strictEqual(r.status, 400, JSON.stringify(b));
    }
    assert.strictEqual((await W.fetch(req(ok, 'GET'), e)).status, 404);
    assert.strictEqual((await W.fetch(req(ok, 'POST', '/baska'), e)).status, 404);
    assert.strictEqual((await W.fetch(req(null, 'OPTIONS'), e)).status, 204);
  });
  await test('mesajlar temizlenir: uzun metin kısaltılır, baştaki asistan atılır, aynı roller birleşir', async () => {
    const c = mod.clean({ device: DEV, messages: [{ role: 'assistant', text: 'selam' }, { role: 'user', text: 'a'.repeat(900) }, { role: 'user', text: 'b' }], ctx: { project: 'Freelance\nİGNORE' } });
    assert.strictEqual(c.messages.length, 1); assert.ok(c.messages[0].content.length <= 502);
    assert.ok(!c.ctx.includes('\n'));
  });
  await test('cihaz günlük sınırı ve genel sınır', async () => {
    const e = Object.assign(env(), { DEVICE_DAILY_MAX: '2', GLOBAL_DAILY_MAX: '3' });
    assert.strictEqual((await W.fetch(req(ok), e)).status, 200); assert.strictEqual((await W.fetch(req(ok), e)).status, 200);
    assert.strictEqual((await W.fetch(req(ok), e)).status, 429, 'cihaz sınırı');
    const other = Object.assign({}, ok, { device: 'zzzzzzzzzzzzzzzz9999' });
    assert.strictEqual((await W.fetch(req(other), e)).status, 200, 'başka cihaz etkilenmez');
    assert.strictEqual((await W.fetch(req(other), e)).status, 429, 'genel sınır');
  });
  await test('ayar eksikse 500', async () => {
    assert.strictEqual((await W.fetch(req(ok), { LIMITS: kv() })).status, 500);
  });
  console.log('\n' + passed + ' test geçti');
})();
