import { createRequire } from 'node:module';
import { mkdir, readdir, rm, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR, MEDIA_DIR, SITE_DIR } from '../config.mjs';
import { parseFrontmatter, setKeys, slugify, splitFrontmatter } from './frontmatter.mjs';
import { scanContent } from './content.mjs';
import { audit, markDirty, readManifest, writeManifest } from './store.mjs';
import { HttpError, sha256, writeAtomic } from './util.mjs';

const MAX_FILE = 512 * 1024;
const MAX_MEDIA = 6 * 1024 * 1024;
const NOTE_PATH = /^(projects|journal)\/(en|fa)\/(?:[\p{L}\p{N}_ .()\-]+\/)*[\p{L}\p{N}_ .()\-]+\.(md|mdx)$/u;
const MEDIA_PATH = /^[\w.\-]{1,120}\.(png|jpe?g|webp|avif|gif|svg)$/i;

let mdxCompile; // lazily resolved from the site's own node_modules so versions always match
async function getCompiler() {
  if (mdxCompile !== undefined) return mdxCompile;
  mdxCompile = null;
  for (const base of [SITE_DIR, import.meta.dirname]) {
    try {
      const req = createRequire(path.join(base, 'package.json'));
      mdxCompile = (await import(pathToFileURL(req.resolve('@mdx-js/mdx')).href)).compile;
      break;
    } catch { /* try next */ }
  }
  return mdxCompile;
}

/** Syntax-check a note. Returns an array of {line, column, message}. */
export async function checkMdx(source) {
  const { body } = splitFrontmatter(source);
  const offset = source.length - body.length;
  const startLine = source.slice(0, offset).split('\n').length - 1;
  const compile = await getCompiler();
  if (!compile) return [];
  try { await compile(body, { format: 'mdx' }); return []; }
  catch (e) {
    return [{ line: (e.line ?? e.position?.start?.line ?? 1) + startLine, column: e.column ?? e.position?.start?.column ?? 1, message: String(e.reason || e.message).split('\n')[0] }];
  }
}

/** Fill the frontmatter keys the content schema requires, without disturbing anything else. */
export function normalizeNote(relPath, source) {
  const [, , lang] = /^(projects|journal)\/(en|fa)\//.exec(relPath);
  const file = path.basename(relPath).replace(/\.(md|mdx)$/i, '');
  const { data } = parseFrontmatter(source);
  const updates = {};
  if (!data.title) updates.title = file;
  if (!data.date) updates.date = new Date().toISOString().slice(0, 10);
  if (data.lang !== lang) updates.lang = lang;
  if (!Array.isArray(data.tags)) updates.tags = [];
  if (!data.slug) updates.slug = slugify(file) || `note-${sha256(relPath).slice(0, 8)}`;
  return Object.keys(updates).length ? setKeys(source, updates) : source;
}

export async function mdxValidationActive() { return Boolean(await getCompiler()); }

export async function getManifest() {
  const m = await readManifest();
  return { files: Object.fromEntries(Object.entries(m.files).map(([p, v]) => [p, v.sha])) };
}

/**
 * Apply a bundle atomically-ish: validate everything first, write nothing if any note is invalid.
 * body: { files:[{path, content, sha?}], delete:[path], media:[{name, base64}] }
 */
export async function ingest(body) {
  const files = Array.isArray(body.files) ? body.files : [];
  const del = Array.isArray(body.delete) ? body.delete : [];
  const media = Array.isArray(body.media) ? body.media : [];
  if (files.length > 400 || del.length > 400 || media.length > 100) throw new HttpError(413, 'bundle too large');

  const errors = []; const prepared = [];
  for (const f of files) {
    const p = String(f?.path ?? '');
    if (!NOTE_PATH.test(p) || p.includes('..')) { errors.push({ path: p, message: 'path must be projects|journal/<en|fa>/…/*.md|mdx' }); continue; }
    if (typeof f.content !== 'string' || Buffer.byteLength(f.content) > MAX_FILE) { errors.push({ path: p, message: 'missing content or larger than 512 KB' }); continue; }
    const normalized = normalizeNote(p, f.content);
    if (p.endsWith('.mdx')) for (const e of await checkMdx(normalized)) errors.push({ path: p, ...e });
    const { data } = parseFrontmatter(normalized);
    if (data.lang !== p.split('/')[1]) errors.push({ path: p, message: 'lang does not match folder' });
    prepared.push({ path: p, content: normalized, sha: sha256(f.content) });
  }
  for (const m of media) {
    if (!MEDIA_PATH.test(String(m?.name ?? ''))) errors.push({ path: `media/${m?.name}`, message: 'bad media name' });
    else if (Buffer.byteLength(String(m.base64 ?? ''), 'utf8') > MAX_MEDIA * 1.4) errors.push({ path: `media/${m.name}`, message: 'media larger than 6 MB' });
  }
  const existing = await scanContent();
  for (const p of prepared) {
    const { data } = parseFrontmatter(p.content); const [col, lang] = p.path.split('/');
    const key = `${col}/${lang}/${data.slug}`;
    const clash = existing.find((r) => r.key === key && r.relPath.toLowerCase() !== p.path.toLowerCase());
    if (clash) errors.push({ path: p.path, message: `slug "${data.slug}" already used by ${clash.relPath} (${clash.origin}); rename the note or delete that page in the dashboard` });
  }
  const seen = new Map();
  for (const p of prepared) { const k = p.path.toLowerCase(); if (seen.has(k)) errors.push({ path: p.path, message: 'duplicate path' }); seen.set(k, 1); }
  if (errors.length) throw new HttpError(422, 'validation failed – nothing was written', { errors });

  const manifest = await readManifest();
  if (body.dryRun) {
    const w = prepared.filter((p) => manifest.files[p.path]?.sha !== p.sha).length;
    return { dryRun: true, written: w, deleted: del.filter((p) => manifest.files[p]).length, unchanged: prepared.length - w, media: media.length };
  }
  let written = 0, deleted = 0, unchanged = 0;
  for (const p of prepared) {
    if (manifest.files[p.path]?.sha === p.sha) { unchanged++; continue; }
    await writeAtomic(path.join(CONTENT_DIR, p.path), p.content);
    manifest.files[p.path] = { sha: p.sha, at: Date.now() }; written++;
  }
  for (const p of del) {
    if (!NOTE_PATH.test(String(p)) || !manifest.files[p]) continue; // only files this pipeline created
    await rm(path.join(CONTENT_DIR, p), { force: true }); delete manifest.files[p]; deleted++;
  }
  for (const m of media) {
    await writeAtomic(path.join(MEDIA_DIR, 'vault', m.name), Buffer.from(m.base64, 'base64'));
  }
  await writeManifest(manifest);
  if (written || deleted || media.length) { await audit('ingest', 'ingest', `${written}w/${deleted}d/${media.length}m`, ''); await markDirty('ingest'); }
  return { written, deleted, unchanged, media: media.length };
}

/* ---------- dashboard media library ---------- */
let sharpMod;
async function getSharp() {
  if (sharpMod !== undefined) return sharpMod;
  try { sharpMod = (await import(pathToFileURL(createRequire(path.join(SITE_DIR, 'package.json')).resolve('sharp')).href)).default; } catch { sharpMod = null; }
  return sharpMod;
}

export async function saveMedia(name, buf) {
  if (buf.length > MAX_MEDIA) throw new HttpError(413, 'image larger than 6 MB');
  const base = slugify(path.basename(name, path.extname(name))) || 'image';
  const ext = path.extname(name).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'].includes(ext)) throw new HttpError(415, 'unsupported image type');
  const month = new Date().toISOString().slice(0, 7);
  let out = buf, outExt = ext, width = null, height = null;
  const sharp = ext === '.svg' || ext === '.gif' ? null : await getSharp();
  if (sharp) {
    const img = sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true });
    out = await img.webp({ quality: 82 }).toBuffer({ resolveWithObject: true }).then((r) => { width = r.info.width; height = r.info.height; return r.data; });
    outExt = '.webp';
  }
  const file = `${base}-${sha256(buf).slice(0, 6)}${outExt}`;
  await writeAtomic(path.join(MEDIA_DIR, month, file), out);
  await audit('admin', 'media.upload', `${month}/${file}`, '');
  return { url: `/media/${month}/${file}`, bytes: out.length, width, height, optimized: Boolean(sharp) };
}

export async function listMedia() {
  const out = [];
  async function walk(dir, rel = '') {
    for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (e.isDirectory()) await walk(path.join(dir, e.name), `${rel}/${e.name}`);
      else if (/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(e.name)) { const s = await stat(path.join(dir, e.name)); out.push({ url: `/media${rel}/${e.name}`, bytes: s.size, at: s.mtimeMs }); }
    }
  }
  await walk(MEDIA_DIR);
  return out.sort((a, b) => b.at - a.at);
}

export async function deleteMedia(url) {
  if (!/^\/media\/[\w\-./]+$/.test(url) || url.includes('..')) throw new HttpError(400, 'bad url');
  await rm(path.join(MEDIA_DIR, url.replace(/^\/media\//, '')), { force: true });
  await audit('admin', 'media.delete', url, ''); await markDirty('media');
}
