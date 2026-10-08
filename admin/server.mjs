#!/usr/bin/env node
/**
 * Zero-dependency admin service for arman-hosseini.ir.
 *   node admin/server.mjs            start (127.0.0.1:4322, put nginx in front)
 *   node admin/server.mjs --hash     print a password hash for ADMIN_PASSWORD_HASH
 */
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { DATA_DIR, HOST, PORT, PUBLIC_DIR, SCHEMA_TYPES, SITE_URL } from './config.mjs';
import { HttpError, hashPassword, hmac, limiter, rand, safeEqual, verifyPassword } from './lib/util.mjs';
import * as store from './lib/store.mjs';
import * as content from './lib/content.mjs';
import * as build from './lib/build.mjs';
import * as stats from './lib/stats.mjs';
import * as ingest from './lib/ingest.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const SESSION_MS = 12 * 3600_000;

if (process.argv.includes('--hash')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const pw = await rl.question('New admin password: '); rl.close();
  console.log(await hashPassword(pw)); process.exit(0);
}

await mkdir(DATA_DIR, { recursive: true });
const secret = await store.getSecret();
await store.loadState();
await stats.initStats(secret);

let passwordHash = process.env.ADMIN_PASSWORD_HASH || (await store.readAuth()).hash;
if (!passwordHash && process.env.ADMIN_PASSWORD) passwordHash = await hashPassword(process.env.ADMIN_PASSWORD);
if (!passwordHash) {
  const initial = rand(12);
  await store.setPassword(initial).catch(() => {});
  passwordHash = (await store.readAuth()).hash;
  console.log(`\n  First run – initial admin password: ${initial}\n  Change it in Settings. (It is not shown again.)\n`);
}

const loginLimit = limiter(8, 10 * 60_000);
const beaconLimit = limiter(120, 60_000);
const apiLimit = limiter(600, 60_000);

/* ---------------- helpers ---------------- */
const clientIp = (req) => (req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').trim();
const send = (res, status, body, headers = {}) => {
  const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(isObj ? { 'Content-Type': 'application/json; charset=utf-8' } : {}), ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
};
async function readBody(req, limit) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > limit) throw new HttpError(413, 'request too large'); chunks.push(c); }
  return Buffer.concat(chunks);
}
const readJsonBody = async (req, limit = 1_000_000) => {
  const buf = await readBody(req, limit);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf8')); } catch { throw new HttpError(400, 'invalid JSON'); }
};

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, v.join('=')]));
}
function makeSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_MS, csrf: rand(16) })).toString('base64url');
  return `${payload}.${hmac(secret, payload)}`;
}
function readSession(req) {
  const raw = parseCookies(req).vsid; if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !safeEqual(hmac(secret, payload), sig)) return null;
  try { const s = JSON.parse(Buffer.from(payload, 'base64url').toString()); return s.exp > Date.now() ? s : null; } catch { return null; }
}
const cookie = (value, req, maxAge) =>
  `vsid=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;

function requireAuth(req) {
  const s = readSession(req);
  if (!s) throw new HttpError(401, 'login required');
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (!safeEqual(req.headers['x-csrf'] || '', s.csrf)) throw new HttpError(403, 'bad CSRF token');
    const origin = req.headers.origin; const host = req.headers.host;
    if (origin && new URL(origin).host !== host && new URL(origin).host !== new URL(SITE_URL).host) throw new HttpError(403, 'bad origin');
  }
  return s;
}

/* ---------------- API ---------------- */
async function overview() {
  const [entries, builds] = await Promise.all([content.listEntries(), build.listBuilds()]);
  const real = entries.filter((e) => e.kind === 'content');
  const published = real.filter((e) => e.status === 'published');
  const avg = published.length ? Math.round(published.reduce((n, e) => n + e.health.score, 0) / published.length) : 100;
  const issues = {};
  for (const e of [...published, ...entries.filter((x) => x.kind === 'static')]) for (const i of e.health.issues) issues[i.code] = { level: i.level, count: (issues[i.code]?.count ?? 0) + 1 };
  return {
    state: store.getState(), running: build.isRunning(), builds: builds.slice(0, 5),
    counts: { total: real.length, published: published.length, draft: real.filter((e) => e.status === 'draft').length, disabled: real.filter((e) => e.status === 'disabled').length, vault: real.filter((e) => e.origin === 'vault').length },
    seo: { average: avg, issues, worst: published.slice().sort((a, b) => a.health.score - b.health.score).slice(0, 6).map((e) => ({ key: e.key, title: e.title, lang: e.lang, score: e.health.score })) },
    stats: stats.summary(14), live: await build.currentRelease(),
  };
}

const publicFields = (e) => e;

const routes = {
  'GET /api/health': { public: true, run: async () => ({ ok: true, live: await build.currentRelease(), mdxValidation: await ingest.mdxValidationActive() }) },
  'POST /api/login': { public: true, run: async (req, res, q, body) => {
    if (!loginLimit(clientIp(req))) throw new HttpError(429, 'too many attempts – try again in a few minutes');
    if (!(await verifyPassword(String(body.password ?? ''), passwordHash))) throw new HttpError(401, 'wrong password');
    const sess = makeSession();
    res.setHeader('Set-Cookie', cookie(sess, req, SESSION_MS / 1000));
    return { ok: true };
  } },
  'POST /api/logout': { public: true, run: async (req, res) => { res.setHeader('Set-Cookie', cookie('', req, 0)); return { ok: true }; } },
  'GET /api/me': { run: async (req, res, q, b, s) => ({ user: 'admin', csrf: s.csrf, schemaTypes: SCHEMA_TYPES, siteUrl: SITE_URL }) },
  'GET /api/overview': { run: overview },
  'GET /api/entries': { run: async () => {
    const views = stats.viewsByPath(30);
    return (await content.listEntries()).map((e) => ({ ...e, bodyPreview: undefined, views: views[e.url] ?? 0 }));
  } },
  'GET /api/entry': { run: async (req, res, q) => content.getEntry(q.get('key')) },
  'PATCH /api/entry': { run: async (req, res, q, body) => {
    const key = q.get('key'); await content.getEntry(key);
    const cur = await store.patchOverride(key, store.cleanOverride(body));
    return { ok: true, override: cur, state: store.getState() };
  } },
  'POST /api/entries': { run: async (req, res, q, body) => content.createNative(body) },
  'PUT /api/entry/body': { run: async (req, res, q, body) => { await content.saveBody(q.get('key'), body); return { ok: true, state: store.getState() }; } },
  'DELETE /api/entry': { run: async (req, res, q) => { await content.deleteNative(q.get('key')); return { ok: true }; } },
  'POST /api/entries/bulk': { run: async (req, res, q, body) => {
    const patch = store.cleanOverride(body.patch); const keys = Array.isArray(body.keys) ? body.keys.slice(0, 200) : [];
    for (const k of keys) await store.patchOverride(k, patch);
    return { ok: true, updated: keys.length, state: store.getState() };
  } },
  'POST /api/translations/link': { run: async (req, res, q, body) => ({ translationKey: await content.linkTranslation(body.a, body.b) }) },
  'POST /api/translations/unlink': { run: async (req, res, q, body) => { await content.unlinkTranslation(body.key); return { ok: true }; } },
  'GET /api/media': { run: async () => ingest.listMedia() },
  'POST /api/media': { run: async (req, res, q) => ingest.saveMedia(q.get('name') || 'image.png', await readBody(req, 8_000_000)), raw: true },
  'DELETE /api/media': { run: async (req, res, q) => { await ingest.deleteMedia(q.get('url')); return { ok: true }; } },
  'GET /api/stats': { run: async (req, res, q) => stats.summary(Math.min(90, Math.max(7, Number(q.get('days')) || 30))) },
  'POST /api/build': { run: async () => build.startBuild('manual') },
  'GET /api/builds': { run: async () => ({ running: build.isRunning(), builds: await build.listBuilds(), state: store.getState() }) },
  'GET /api/builds/log': { run: async (req, res, q) => ({ log: await build.buildLog(q.get('id')), running: build.isRunning() }) },
  'POST /api/rollback': { run: async (req, res, q, body) => { await build.rollback(body.id); return { ok: true }; } },
  'GET /api/audit': { run: async () => store.readAudit(150) },
  'GET /api/backups': { run: async () => store.listBackups() },
  'POST /api/backups/restore': { run: async (req, res, q, body) => { await store.restoreBackup(body.name); return { ok: true }; } },
  'GET /api/tokens': { run: async () => store.listTokens() },
  'POST /api/tokens': { run: async (req, res, q, body) => store.createToken(body.name) },
  'DELETE /api/tokens': { run: async (req, res, q) => { await store.deleteToken(q.get('id')); return { ok: true }; } },
  'POST /api/password': { run: async (req, res, q, body) => {
    if (!(await verifyPassword(String(body.current ?? ''), passwordHash))) throw new HttpError(401, 'current password is wrong');
    await store.setPassword(String(body.next ?? '')); passwordHash = (await store.readAuth()).hash; return { ok: true };
  } },
};

async function handleApi(req, res, url) {
  const key = `${req.method} ${url.pathname}`;

  // public beacon (no auth, rate limited, never fails loudly)
  if (key === 'POST /api/v') {
    if (beaconLimit(clientIp(req))) {
      try { const b = JSON.parse((await readBody(req, 1024)).toString() || '{}'); stats.record(b, clientIp(req), req.headers['user-agent'] || ''); } catch { /* ignore */ }
    }
    return send(res, 204, '');
  }

  // FIT plugin: bearer token
  if (url.pathname === '/api/ingest' || url.pathname === '/api/ingest/manifest') {
    const tok = await store.checkToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    if (!tok) throw new HttpError(401, 'invalid token');
    if (!apiLimit(`ing:${tok.id}`)) throw new HttpError(429, 'slow down');
    if (key === 'GET /api/ingest/manifest') return send(res, 200, await ingest.getManifest());
    if (key === 'POST /api/ingest') {
      const body = JSON.parse((await readBody(req, 40_000_000)).toString('utf8') || '{}');
      const result = await ingest.ingest(body);
      let buildInfo = null;
      if (!body.dryRun && body.build !== false && (result.written || result.deleted || result.media)) buildInfo = await build.startBuild(`ingest (${tok.name})`);
      return send(res, 200, { ...result, build: buildInfo });
    }
    throw new HttpError(404, 'not found');
  }

  const route = routes[key];
  if (!route) throw new HttpError(404, 'not found');
  let session = null;
  if (!route.public) { session = requireAuth(req); if (!apiLimit(`s:${clientIp(req)}`)) throw new HttpError(429, 'slow down'); }
  const body = route.raw || ['GET', 'DELETE', 'HEAD'].includes(req.method) ? {} : await readJsonBody(req);
  const out = await route.run(req, res, url.searchParams, body, session);
  return send(res, 200, publicFields(out));
}

const SEC = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'X-Robots-Tag': 'noindex, nofollow',
};

async function serveStatic(req, res, url) {
  let rel = url.pathname.replace(/^\/admin\/?/, '') || 'index.html';
  if (rel.includes('..')) throw new HttpError(400, 'bad path');
  if (!path.extname(rel)) rel = 'index.html';
  try {
    const buf = await readFile(path.join(PUBLIC_DIR, rel));
    send(res, 200, buf, { ...SEC, 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  } catch { throw new HttpError(404, 'not found'); }
}

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return await serveStatic(req, res, url);
    throw new HttpError(404, 'not found');
  } catch (e) {
    if (res.headersSent) return res.end();
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    send(res, status, { error: status === 500 ? 'internal error' : e.message, ...(e.extra ?? {}) });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => console.log(`admin listening on http://${HOST}:${PORT}/admin/`));
  process.on('SIGTERM', async () => { await stats.flush(); process.exit(0); });
  process.on('SIGINT', async () => { await stats.flush(); process.exit(0); });
}
