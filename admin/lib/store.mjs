import { appendFile, mkdir, readdir, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR, OVERRIDES_FILE, SCHEMA_TYPES } from '../config.mjs';
import { HttpError, hashPassword, rand, readJson, sha256, writeJson } from './util.mjs';

const f = (name) => path.join(DATA_DIR, name);

/* ---------- dirty tracking (pending changes not yet published) ---------- */
let state = { dirty: 0, dirtySince: null, lastChange: null };
export async function loadState() { state = { ...state, ...(await readJson(f('state.json'), {})) }; }
export async function markDirty(what) {
  state.dirty += 1; state.dirtySince ??= Date.now(); state.lastChange = what;
  await writeJson(f('state.json'), state);
}
export async function clearDirty(startedAt) {
  if (state.dirtySince && state.dirtySince <= startedAt) state = { dirty: 0, dirtySince: null, lastChange: null };
  await writeJson(f('state.json'), state);
}
export const getState = () => ({ ...state });

/* ---------- overrides ---------- */
const FIELDS = {
  status: (v) => ['published', 'draft', 'disabled'].includes(v) && v,
  title: str(200), summary: str(600), seoTitle: str(200), seoDescription: str(400),
  imageAlt: str(300), image: str(500), canonical: (v) => (v === '' ? '' : /^https?:\/\//.test(v) && v.length < 500 && v),
  published: date, updated: date, translationKey: (v) => (v === '' ? '' : /^[\p{L}\p{N}_-]{1,80}$/u.test(v) && v),
  schemaType: (v) => SCHEMA_TYPES.includes(v) && v,
  noindex: bool, featured: bool,
  keywords: list(30, 80), tags: list(30, 60),
  faq: (v) => Array.isArray(v) && v.length <= 30 && v.every((x) => x && typeof x.q === 'string' && typeof x.a === 'string') && v.map((x) => ({ q: x.q.slice(0, 300), a: x.a.slice(0, 1500) })),
};
function str(max) { return (v) => typeof v === 'string' && v.length <= max && v.trim(); }
function bool(v) { return typeof v === 'boolean' ? v : undefined; }
function date(v) { return v === '' ? '' : /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(v) && !Number.isNaN(Date.parse(v)) && v; }
function list(n, len) { return (v) => Array.isArray(v) && v.length <= n && v.every((x) => typeof x === 'string' && x.length <= len) && v.map((x) => x.trim()).filter(Boolean); }

/** Validate a partial override. `''`/null clears a field. Throws HttpError(422) on bad input. */
export function cleanOverride(input) {
  const out = {}; const bad = [];
  for (const [k, v] of Object.entries(input ?? {})) {
    if (!(k in FIELDS)) { bad.push(`unknown field "${k}"`); continue; }
    if (v === null || v === '' || (Array.isArray(v) && v.length === 0 && k !== 'tags')) { out[k] = null; continue; }
    const r = FIELDS[k](v);
    if (r === false || r === undefined) bad.push(`invalid ${k}`); else out[k] = r;
  }
  if (bad.length) throw new HttpError(422, bad.join('; '));
  return out;
}

export async function readOverrides() { return readJson(OVERRIDES_FILE, {}); }

export async function patchOverride(key, partial, actor = 'admin') {
  const all = await readOverrides();
  const cur = { ...(all[key] ?? {}) };
  const before = JSON.stringify(cur);
  for (const [k, v] of Object.entries(partial)) { if (v === null) delete cur[k]; else cur[k] = v; }
  if (JSON.stringify(cur) === before) return cur;
  if (Object.keys(cur).length) all[key] = cur; else delete all[key];
  await backup();
  await writeJson(OVERRIDES_FILE, sortKeys(all));
  await audit(actor, 'override', key, Object.keys(partial).join(','));
  await markDirty(`override:${key}`);
  return cur;
}
const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

async function backup() {
  const dir = f('backups');
  await mkdir(dir, { recursive: true });
  try {
    const cur = await readFile(OVERRIDES_FILE, 'utf8');
    await writeJson(path.join(dir, `overrides-${Date.now()}.json`), JSON.parse(cur));
    const files = (await readdir(dir)).sort();
    for (const old of files.slice(0, Math.max(0, files.length - 30))) await rm(path.join(dir, old));
  } catch { /* nothing to back up yet */ }
}
export async function listBackups() {
  try { return (await readdir(f('backups'))).sort().reverse().map((n) => ({ name: n, at: Number(/-(\d+)\.json$/.exec(n)?.[1]) })); } catch { return []; }
}
export async function restoreBackup(name) {
  if (!/^overrides-\d+\.json$/.test(name)) throw new HttpError(400, 'bad backup name');
  const data = await readJson(path.join(f('backups'), name), null);
  if (!data) throw new HttpError(404, 'backup not found');
  await backup(); await writeJson(OVERRIDES_FILE, data); await audit('admin', 'restore', name, '');
  await markDirty('restore');
}

/* ---------- ingest manifest: which content files came from the vault ---------- */
export const readManifest = () => readJson(f('manifest.json'), { files: {} });
export const writeManifest = (m) => writeJson(f('manifest.json'), m);

/* ---------- audit log ---------- */
export async function audit(actor, action, target, detail = '') {
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(f('audit.log'), JSON.stringify({ t: new Date().toISOString(), actor, action, target, detail }) + '\n');
}
export async function readAudit(limit = 100) {
  try { return (await readFile(f('audit.log'), 'utf8')).trim().split('\n').slice(-limit).reverse().map((l) => JSON.parse(l)); } catch { return []; }
}

/* ---------- auth settings + ingest tokens ---------- */
export async function getSecret() {
  const s = await readJson(f('secret.json'), null);
  if (s?.secret) return s.secret;
  const secret = rand(48); await writeJson(f('secret.json'), { secret }); return secret;
}
export const readAuth = () => readJson(f('auth.json'), {});
export async function setPassword(password) {
  if (String(password).length < 10) throw new HttpError(422, 'password must be at least 10 characters');
  await writeJson(f('auth.json'), { ...(await readAuth()), hash: await hashPassword(password), changed: Date.now() });
  await audit('admin', 'password', '-', '');
}

export async function listTokens() {
  const t = await readJson(f('tokens.json'), []);
  return t.map(({ hash, ...rest }) => rest);
}
export async function createToken(name) {
  const tokens = await readJson(f('tokens.json'), []);
  const secret = `vgp_${rand(32)}`;
  const rec = { id: rand(6), name: String(name || 'FIT').slice(0, 60), hash: sha256(secret), created: Date.now(), lastUsed: null };
  tokens.push(rec); await writeJson(f('tokens.json'), tokens);
  await audit('admin', 'token.create', rec.id, rec.name);
  return { id: rec.id, name: rec.name, token: secret };
}
export async function deleteToken(id) {
  const tokens = (await readJson(f('tokens.json'), [])).filter((t) => t.id !== id);
  await writeJson(f('tokens.json'), tokens); await audit('admin', 'token.delete', id, '');
}
export async function checkToken(secret) {
  const tokens = await readJson(f('tokens.json'), []);
  const h = sha256(secret || '');
  const hit = tokens.find((t) => t.hash === h);
  if (hit) { hit.lastUsed = Date.now(); await writeJson(f('tokens.json'), tokens); }
  return hit ? { id: hit.id, name: hit.name } : null;
}
