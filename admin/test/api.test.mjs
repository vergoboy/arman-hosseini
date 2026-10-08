import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, lstat, readlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(tmpdir(), 'admin-test-'));
await mkdir(path.join(root, 'src/content/journal/en'), { recursive: true });
await mkdir(path.join(root, 'content-meta'), { recursive: true });
await writeFile(path.join(root, 'content-meta/overrides.json'), '{}');
await writeFile(path.join(root, 'src/content/journal/en/hello.md'), '---\ntitle: "Hello"\ndate: 2026-01-02\nlang: en\ntags: [rust]\nsummary: short\n---\nBody text here.\n');
process.env.SITE_DIR = root;
process.env.ADMIN_PASSWORD = 'correct horse battery';
process.env.BUILD_CMD = 'mkdir -p "$ASTRO_OUT_DIR" && echo ok > "$ASTRO_OUT_DIR/index.html"';

const { server } = await import('../server.mjs');
let base, cookie = '', csrf = '';
before(() => new Promise((r) => server.listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${server.address().port}`; r(); })));
after(() => server.close());

const call = async (method, p, body, headers = {}) => {
  const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', cookie, 'x-csrf': csrf, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const text = await res.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
};

test('rejects anonymous and wrong password', async () => {
  assert.equal((await call('GET', '/api/entries')).status, 401);
  assert.equal((await call('POST', '/api/login', { password: 'nope' })).status, 401);
});

test('login, csrf required for writes', async () => {
  assert.equal((await call('POST', '/api/login', { password: 'correct horse battery' })).status, 200);
  csrf = (await call('GET', '/api/me')).json.csrf; assert.ok(csrf);
  const noCsrf = await call('PATCH', '/api/entry?key=journal/en/hello', { noindex: true }, { 'x-csrf': 'bad' });
  assert.equal(noCsrf.status, 403);
});

test('lists entries with health and patches seo overrides', async () => {
  const list = (await call('GET', '/api/entries')).json;
  const e = list.find((x) => x.key === 'journal/en/hello');
  assert.equal(e.status, 'published'); assert.ok(e.health.issues.some((i) => i.code === 'thin_content'));
  const bad = await call('PATCH', '/api/entry?key=journal/en/hello', { schemaType: 'Nope' });
  assert.equal(bad.status, 422);
  const ok = await call('PATCH', '/api/entry?key=journal/en/hello', { seoTitle: 'Hello world about Rust', keywords: ['rust', 'linux'], status: 'disabled', schemaType: 'TechArticle' });
  assert.equal(ok.status, 200);
  const saved = JSON.parse(await readFile(path.join(root, 'content-meta/overrides.json'), 'utf8'));
  assert.equal(saved['journal/en/hello'].status, 'disabled');
  assert.equal(ok.json.state.dirty, 1);
});

test('native create / edit / translation link / delete', async () => {
  const a = (await call('POST', '/api/entries', { collection: 'journal', lang: 'fa', title: 'سلام', body: 'متن' })).json;
  assert.equal(a.origin, 'native');
  assert.equal((await call('PUT', `/api/entry/body?key=${encodeURIComponent(a.key)}`, { body: 'new body' })).status, 200);
  const link = await call('POST', '/api/translations/link', { a: a.key, b: 'journal/en/hello' });
  assert.equal(link.status, 200);
  const list = (await call('GET', '/api/entries')).json;
  assert.equal(list.find((x) => x.key === a.key).translations[0].key, 'journal/en/hello');
  assert.equal((await call('DELETE', `/api/entry?key=${encodeURIComponent(a.key)}`)).status, 200);
});

test('ingest: token auth, mdx validation, atomic reject, prune only vault files', async () => {
  const { token } = (await call('POST', '/api/tokens', { name: 'test' })).json;
  const ing = (body, t = token) => fetch(base + '/api/ingest', { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json() }));
  assert.equal((await ing({}, 'wrong')).status, 401);
  const broken = await ing({ files: [{ path: 'journal/en/good.md', content: '# ok' }, { path: 'journal/en/bad.mdx', content: '---\ntitle: x\n---\n<Unclosed>\n' }], build: false });
  assert.equal(broken.status, 422); assert.equal(broken.json.errors[0].path, 'journal/en/bad.mdx');
  await assert.rejects(readFile(path.join(root, 'src/content/journal/en/good.md')), 'nothing written when any file is invalid');
  const good = await ing({ files: [{ path: 'journal/en/vault-note.mdx', content: 'Hi {1 + 1}' }], build: false });
  assert.equal(good.json.written, 1);
  const written = await readFile(path.join(root, 'src/content/journal/en/vault-note.mdx'), 'utf8');
  assert.match(written, /lang: "en"/); assert.match(written, /title: "vault-note"/);
  assert.equal((await ing({ files: [{ path: 'journal/en/vault-note.mdx', content: 'Hi {1 + 1}' }], build: false })).json.unchanged, 1);
  const del = await ing({ delete: ['journal/en/vault-note.mdx', 'journal/en/hello.md'], build: false });
  assert.equal(del.json.deleted, 1, 'hello.md is not vault-owned so it must survive');
  await readFile(path.join(root, 'src/content/journal/en/hello.md'));
  const manifest = await fetch(base + '/api/ingest/manifest', { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
  assert.deepEqual(manifest.files, {});
});

test('build switches symlink atomically and can roll back', async () => {
  const b = (await call('POST', '/api/build')).json; assert.ok(b.id);
  for (let i = 0; i < 50; i++) { const l = (await call('GET', '/api/builds')).json; if (!l.running) break; await new Promise((r) => setTimeout(r, 100)); }
  const builds = (await call('GET', '/api/builds')).json.builds;
  assert.equal(builds[0].status, 'success'); assert.equal(builds[0].current, true);
  assert.ok((await lstat(path.join(root, 'current'))).isSymbolicLink());
  assert.equal(path.basename(await readlink(path.join(root, 'current'))), builds[0].id);
  assert.equal((await call('GET', '/api/overview')).json.state.dirty, 0, 'dirty cleared after successful build');
});

test('beacon counts views, ignores bots and admin paths', async () => {
  const beacon = (p, ua) => fetch(base + '/api/v', { method: 'POST', headers: { 'user-agent': ua }, body: JSON.stringify({ p, r: 'https://news.ycombinator.com/x' }) });
  await beacon('/en/', 'Mozilla/5.0'); await beacon('/en/', 'Mozilla/5.0'); await beacon('/en/', 'Googlebot/2.1'); await beacon('/admin/', 'Mozilla/5.0');
  const s = (await call('GET', '/api/stats?days=7')).json;
  assert.equal(s.totals.views, 2); assert.equal(s.referrers[0].key, 'news.ycombinator.com');
});
