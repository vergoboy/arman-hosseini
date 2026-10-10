import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, lstat, readlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(tmpdir(), 'admin-test-'));
await mkdir(path.join(root, 'src/content/journal/en'), { recursive: true });
await mkdir(path.join(root, 'content-meta'), { recursive: true });
await writeFile(path.join(root, 'content-meta/overrides.json'), '{}');
await mkdir(path.join(root, 'public'), { recursive: true });
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

test('studio: token auth, media staging, mdx validation, approval inbox', async () => {
  const { createHash } = await import('node:crypto');
  const { token } = (await call('POST', '/api/tokens', { name: 'studio-test' })).json;
  const auth = { authorization: `Bearer ${token}` };
  const studio = (m, p, body, headers = {}) => fetch(base + p, { method: m, headers: { ...auth, ...headers }, body }).then(async (r) => ({ status: r.status, json: await r.json() }));
  const sj = (p, obj) => studio('POST', p, JSON.stringify(obj), { 'content-type': 'application/json' });

  assert.equal((await fetch(base + '/api/studio/ping', { headers: { authorization: 'Bearer nope' } })).status, 401);
  const ping = await studio('GET', '/api/studio/ping'); assert.equal(ping.json.ok, true); assert.equal(ping.json.mdxValidation, true);

  // media: hash-named, verified, staged (not public yet)
  const img = Buffer.from('fake-png-bytes-1234567890');
  const name = createHash('sha256').update(img).digest('hex').slice(0, 16) + '.png';
  assert.deepEqual((await sj('/api/studio/media/check', { names: [name] })).json.missing, [name]);
  assert.equal((await studio('PUT', `/api/studio/media?name=${'0'.repeat(16)}.png`, img)).status, 422, 'wrong hash rejected');
  assert.equal((await studio('PUT', `/api/studio/media?name=${name}`, img)).status, 200);
  assert.deepEqual((await sj('/api/studio/media/check', { names: [name] })).json.missing, []);
  await assert.rejects(readFile(path.join(root, 'public/media/studio', name)), 'not public before approval');

  const note = (body) => `---\ntitle: "Studio note"\ntags: [a]\n---\n${body}`;
  const missing = await sj('/api/studio/submissions', { collection: 'journal', lang: 'en', slug: 's1', content: note('x'), media: ['f'.repeat(16) + '.png'] });
  assert.equal(missing.status, 422);
  const broken = await sj('/api/studio/submissions', { collection: 'journal', lang: 'en', slug: 's1', content: note('<Unclosed>\n'), media: [] });
  assert.equal(broken.status, 422); assert.ok(broken.json.errors[0].line >= 1);
  assert.equal((await sj('/api/studio/submissions', { collection: 'blog', lang: 'en', slug: 's1', content: 'x' })).status, 422);

  const ok = await sj('/api/studio/submissions', { collection: 'journal', lang: 'en', slug: 's1', content: note(`Hello {1 + 1} ![a](/media/studio/${name})`), media: [name] });
  assert.equal(ok.status, 200); assert.equal(ok.json.status, 'pending');
  const again = await sj('/api/studio/submissions', { collection: 'journal', lang: 'en', slug: 's1', content: note('v2 body'), media: [] });
  const pending = (await call('GET', '/api/submissions?status=pending')).json;
  assert.equal(pending.length, 1, 'same key supersedes the older pending submission');
  assert.equal(pending[0].id, again.json.id);

  // approve v1-like flow with media: resubmit with media then approve
  const withMedia = (await sj('/api/studio/submissions', { collection: 'journal', lang: 'en', slug: 's1', content: note(`pic ![a](/media/studio/${name})`), media: [name] })).json;
  const before = (await call('GET', '/api/overview')).json.state.dirty;
  const appr = await call('POST', '/api/submissions/approve', { id: withMedia.id });
  assert.equal(appr.status, 200);
  const written = await readFile(path.join(root, 'src/content/journal/en/s1.mdx'), 'utf8');
  assert.match(written, /lang: "en"/); assert.match(written, /slug: "s1"/); assert.match(written, /pic !\[a\]/);
  assert.equal((await readFile(path.join(root, 'public/media/studio', name))).length, img.length, 'media moved on approval');
  assert.ok((await call('GET', '/api/overview')).json.state.dirty > before);
  assert.equal((await call('GET', '/api/entries')).json.find((e) => e.key === 'journal/en/s1').origin, 'studio');
  assert.equal((await call('POST', '/api/submissions/approve', { id: withMedia.id })).status, 409, 'cannot approve twice');
  assert.equal((await call('PUT', '/api/entry/body?key=journal%2Fen%2Fs1', { body: 'x' })).status, 409, 'studio pages are not body-editable in the dashboard');

  // slug used by a dashboard-created page needs explicit overwrite
  await call('POST', '/api/entries', { collection: 'journal', lang: 'en', title: 'Mine', slug: 'mine', body: 'native' });
  const clash = (await sj('/api/studio/submissions', { collection: 'journal', lang: 'en', slug: 'mine', content: note('from obsidian'), media: [] })).json;
  const denied = await call('POST', '/api/submissions/approve', { id: clash.id }); assert.equal(denied.status, 409); assert.equal(denied.json.conflict, true);
  assert.equal((await call('POST', '/api/submissions/approve', { id: clash.id, overwrite: true })).status, 200);

  const rej = (await sj('/api/studio/submissions', { collection: 'projects', lang: 'fa', slug: 'p1', content: note('p'), media: [] })).json;
  assert.equal((await call('POST', '/api/submissions/reject', { id: rej.id, reason: 'no' })).json.meta.status, 'rejected');
  await assert.rejects(readFile(path.join(root, 'src/content/projects/fa/p1.mdx')));
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

test('policy: only built-in components; no foreign imports, exports or server APIs', async () => {
  const { checkPolicy } = await import('../lib/policy.mjs');
  const fm = '---\ntitle: "T"\n---\n';
  assert.deepEqual(checkPolicy(fm + 'import { Callout } from "@/components/Callout"\n\n<Callout>ok</Callout>\n<Tabs><Tab label="a">x</Tab></Tabs>'), []);
  assert.deepEqual(checkPolicy(fm + '```js\nimport fs from "fs"\n<Evil />\n```\nand `<Evil />` in code'), [], 'code is ignored');
  const bad = checkPolicy(fm + 'import fs from "node:fs"\n\n<Evil x="1" />\n\nexport const a = 1\n\nKey: {process.env.ADMIN_PASSWORD}\n');
  assert.equal(bad.length, 4);
  assert.deepEqual(bad.map((e) => e.line), [4, 6, 8, 10], 'lines count the frontmatter');
  // the same rules gate the inbox and the dashboard editor
  const { token } = (await call('POST', '/api/tokens', { name: 'policy' })).json;
  const r = await fetch(base + '/api/studio/submissions', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ collection: 'journal', lang: 'en', slug: 'evil', content: fm + '<Unknown />\n', media: [] }) });
  assert.equal(r.status, 422);
  assert.match((await r.json()).errors[0].message, /Unknown component/);
  const made = await call('POST', '/api/entries', { collection: 'journal', lang: 'en', title: 'X', slug: 'x-mdx', mdx: true, body: 'import a from "b"\n' });
  assert.equal(made.status, 422);
});

test('live check: published pages are flagged until a build contains them', async () => {
  await call('POST', '/api/entries', { collection: 'journal', lang: 'en', title: 'Live probe', slug: 'live-probe', body: 'x' });
  const e = (await call('GET', '/api/entries')).json.find((x) => x.key === 'journal/en/live-probe');
  assert.equal(e.live, false, 'new page is not in the live release yet');
  const r = (await call('GET', '/api/entry/live?key=journal%2Fen%2Flive-probe')).json;
  assert.equal(r.inRelease, false); assert.equal(r.status, 'published'); assert.ok(r.liveDir);
});

