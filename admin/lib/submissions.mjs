/**
 * Inbox for notes sent by the Obsidian plugin. Nothing here touches the live content until a human
 * approves it in the dashboard:
 *   plugin ─► media staged (hash-named) ─► submission validated + stored (pending)
 *   dashboard ─► approve: content written, media moved to public/media/studio ─► (optional) build
 */
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat, utimes } from 'node:fs/promises';
import path from 'node:path';
import { COLLECTIONS, CONTENT_DIR, DATA_DIR, LANGS, MEDIA_DIR } from '../config.mjs';
import { parseFrontmatter, setKeys, splitFrontmatter } from './frontmatter.mjs';
import { scanContent } from './content.mjs';
import { checkMdx } from './ingest.mjs';
import { audit, markDirty, readManifest, writeManifest } from './store.mjs';
import { HttpError, rand, readJson, sha256, writeAtomic, writeJson } from './util.mjs';

const MAX_NOTE = 512 * 1024;
export const MAX_MEDIA_BYTES = Number(process.env.MAX_MEDIA_MB || 250) * 1024 * 1024;
const SLUG = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
export const MEDIA_NAME = /^[a-f0-9]{16}\.(png|jpe?g|webp|avif|gif|svg|mp4|webm|mov|m4v|ogv|mp3|ogg|wav|pdf)$/;

const SUB_DIR = path.join(DATA_DIR, 'submissions');
const STAGE_DIR = path.join(DATA_DIR, 'staging', 'media');
export const STUDIO_MEDIA_DIR = path.join(MEDIA_DIR, 'studio');
export const studioUrl = (name) => `/media/studio/${name}`;

const exists = (p) => stat(p).then(() => true, () => false);
const mediaPaths = (name) => ({ staged: path.join(STAGE_DIR, name), live: path.join(STUDIO_MEDIA_DIR, name) });

/* ---------------- media ---------------- */
export async function mediaStatus(names) {
  if (!Array.isArray(names) || names.length > 500) throw new HttpError(422, 'names must be an array of up to 500 items');
  const missing = [];
  for (const n of names) {
    if (!MEDIA_NAME.test(n)) throw new HttpError(422, `bad media name: ${n}`);
    const p = mediaPaths(n);
    if (!(await exists(p.staged)) && !(await exists(p.live))) missing.push(n);
  }
  return { missing };
}

/** Stream a request body to staging, verifying that the file name is the SHA-256 prefix of its bytes. */
export async function stageMedia(name, readable, declaredLength) {
  if (!MEDIA_NAME.test(name)) throw new HttpError(422, 'bad media name (expected <16 hex of sha256>.<ext>)');
  if (declaredLength && declaredLength > MAX_MEDIA_BYTES) throw new HttpError(413, `file larger than ${Math.round(MAX_MEDIA_BYTES / 1048576)} MB`);
  const p = mediaPaths(name);
  await mkdir(STAGE_DIR, { recursive: true });
  if ((await exists(p.staged)) || (await exists(p.live))) { readable.resume(); return { bytes: 0, existed: true }; }
  const tmp = `${p.staged}.${process.pid}.${Date.now()}.part`;
  const hash = createHash('sha256'); let bytes = 0;
  await new Promise((resolve, reject) => {
    const out = createWriteStream(tmp);
    const fail = (e) => { out.destroy(); rm(tmp, { force: true }).finally(() => reject(e)); };
    readable.on('data', (c) => { bytes += c.length; if (bytes > MAX_MEDIA_BYTES) { readable.destroy(); fail(new HttpError(413, 'file too large')); } else hash.update(c); });
    readable.on('error', fail); out.on('error', fail);
    readable.on('end', () => out.end(resolve));
    readable.pipe(out);
  });
  if (hash.digest('hex').slice(0, 16) !== name.slice(0, 16)) { await rm(tmp, { force: true }); throw new HttpError(422, 'content hash does not match the file name'); }
  await rename(tmp, p.staged);
  await audit('studio', 'media.stage', name, `${bytes} bytes`);
  return { bytes, existed: false };
}

async function pruneStaging(pendingNames) {
  const now = Date.now();
  for (const f of await readdir(STAGE_DIR).catch(() => [])) {
    if (pendingNames.has(f)) continue;
    const s = await stat(path.join(STAGE_DIR, f)).catch(() => null);
    if (s && now - s.mtimeMs > 14 * 864e5) await rm(path.join(STAGE_DIR, f), { force: true });
  }
}

/* ---------------- submissions ---------------- */
const metaFile = (id) => path.join(SUB_DIR, id, 'meta.json');
const bodyFile = (id) => path.join(SUB_DIR, id, 'content');
const safeId = (id) => { if (!/^[\w-]{6,20}$/.test(String(id))) throw new HttpError(400, 'bad id'); return id; };

export async function listSubmissions(status) {
  const out = [];
  for (const id of await readdir(SUB_DIR).catch(() => [])) {
    const m = await readJson(metaFile(id), null);
    if (m && (!status || m.status === status)) out.push(m);
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}
export const pendingCount = async () => (await listSubmissions('pending')).length;

function normalize({ collection, lang, slug, source }) {
  const { data } = parseFrontmatter(source);
  const updates = { lang, slug };
  if (!data.title) updates.title = slug;
  if (!data.date) updates.date = new Date().toISOString().slice(0, 10);
  if (!Array.isArray(data.tags)) updates.tags = [];
  return setKeys(source, updates);
}

export async function createSubmission(input, token) {
  const { collection, lang, slug } = input ?? {};
  const ext = input?.ext === 'md' ? 'md' : 'mdx';
  const problems = [];
  if (!COLLECTIONS.includes(collection)) problems.push('collection must be "projects" or "journal"');
  if (!LANGS.includes(lang)) problems.push('lang must be "en" or "fa"');
  if (typeof slug !== 'string' || !SLUG.test(slug) || slug.length > 120) problems.push('slug must be words joined by single hyphens');
  if (typeof input?.content !== 'string' || !input.content.trim()) problems.push('content is empty');
  else if (Buffer.byteLength(input.content) > MAX_NOTE) problems.push('note is larger than 512 KB');
  const media = [...new Set(Array.isArray(input?.media) ? input.media : [])];
  if (media.length > 200 || media.some((n) => !MEDIA_NAME.test(n))) problems.push('invalid media list');
  if (problems.length) throw new HttpError(422, 'invalid submission', { errors: problems.map((message) => ({ path: 'submission', message })) });

  const { missing } = await mediaStatus(media);
  if (missing.length) throw new HttpError(422, 'media not uploaded yet', { missing, errors: missing.map((n) => ({ path: n, message: 'upload this file first' })) });

  const content = normalize({ collection, lang, slug, source: input.content });
  if (ext === 'mdx') {
    const errs = await checkMdx(content);
    if (errs.length) throw new HttpError(422, 'MDX does not compile – nothing was stored', { errors: errs.map((e) => ({ path: `${slug}.mdx`, ...e })) });
  }

  const key = `${collection}/${lang}/${slug}`;
  const id = rand(9).replace(/[^\w-]/g, 'x');
  for (const old of await listSubmissions('pending')) if (old.key === key) await rm(path.join(SUB_DIR, old.id), { recursive: true, force: true });

  const { data } = parseFrontmatter(content);
  const meta = {
    id, key, collection, lang, slug, ext, status: 'pending', createdAt: Date.now(), by: token?.name ?? 'studio',
    title: String(data.title ?? slug), tags: Array.isArray(data.tags) ? data.tags : [], media, bytes: Buffer.byteLength(content),
    vaultPath: typeof input.vaultPath === 'string' ? input.vaultPath.slice(0, 300) : '',
  };
  await mkdir(path.join(SUB_DIR, id), { recursive: true });
  await writeAtomic(bodyFile(id), content);
  await writeJson(metaFile(id), meta);
  await audit('studio', 'submit', key, `${id} by ${meta.by}`);
  await pruneStaging(new Set((await listSubmissions('pending')).flatMap((m) => m.media)));
  return { id, key, status: 'pending' };
}

export async function getSubmission(id) {
  safeId(id);
  const meta = await readJson(metaFile(id), null);
  if (!meta) throw new HttpError(404, 'submission not found');
  const content = await readFile(bodyFile(id), 'utf8').catch(() => '');
  const existing = (await scanContent()).find((r) => r.key === meta.key);
  const media = [];
  for (const name of meta.media) {
    const p = mediaPaths(name); const f = (await exists(p.live)) ? p.live : p.staged;
    const s = await stat(f).catch(() => null);
    media.push({ name, bytes: s?.size ?? 0, live: f === p.live, missing: !s, url: f === p.live ? studioUrl(name) : null });
  }
  const manifest = await readManifest();
  return {
    ...meta, content, media,
    existing: existing ? { relPath: existing.relPath, origin: manifest.files[existing.relPath] ? 'studio' : 'dashboard', body: splitFrontmatter(await readFile(existing.file, 'utf8')).body } : null,
  };
}

export async function approveSubmission(id, { overwrite = false } = {}) {
  const sub = await getSubmission(id);
  if (sub.status !== 'pending') throw new HttpError(409, `submission is already ${sub.status}`);
  if (sub.existing?.origin === 'dashboard' && !overwrite) throw new HttpError(409, 'a page created in the dashboard already uses this slug; approve with overwrite to replace it', { conflict: true });
  if (sub.ext === 'mdx') {
    const errs = await checkMdx(sub.content);
    if (errs.length) throw new HttpError(422, 'MDX no longer compiles', { errors: errs });
  }
  for (const m of sub.media) if (m.missing) throw new HttpError(409, `media ${m.name} is missing on the server; re-send from Obsidian`);

  const rel = `${sub.collection}/${sub.lang}/${sub.slug}.${sub.ext}`;
  const manifest = await readManifest();
  // an earlier version may have used the other extension
  const other = `${sub.collection}/${sub.lang}/${sub.slug}.${sub.ext === 'mdx' ? 'md' : 'mdx'}`;
  await rm(path.join(CONTENT_DIR, other), { force: true }); delete manifest.files[other];
  if (sub.existing && sub.existing.relPath !== rel) await rm(path.join(CONTENT_DIR, sub.existing.relPath), { force: true });

  await mkdir(STUDIO_MEDIA_DIR, { recursive: true });
  for (const m of sub.media) {
    const p = mediaPaths(m.name);
    if (!m.live) await rename(p.staged, p.live).catch(async () => { if (!(await exists(p.live))) throw new HttpError(500, `could not publish media ${m.name}`); });
    await utimes(p.live, new Date(), new Date()).catch(() => {});
  }
  await writeAtomic(path.join(CONTENT_DIR, rel), sub.content);
  manifest.files[rel] = { sha: sha256(sub.content), at: Date.now(), origin: 'studio' };
  await writeManifest(manifest);

  const meta = await readJson(metaFile(id), {});
  Object.assign(meta, { status: 'approved', decidedAt: Date.now() });
  await writeJson(metaFile(id), meta);
  await audit('admin', 'approve', sub.key, id); await markDirty('approve');
  return meta;
}

export async function rejectSubmission(id, reason = '') {
  safeId(id);
  const meta = await readJson(metaFile(id), null);
  if (!meta) throw new HttpError(404, 'submission not found');
  if (meta.status !== 'pending') throw new HttpError(409, `submission is already ${meta.status}`);
  Object.assign(meta, { status: 'rejected', decidedAt: Date.now(), reason: String(reason).slice(0, 300) });
  await writeJson(metaFile(id), meta);
  await audit('admin', 'reject', meta.key, id);
  return meta;
}
