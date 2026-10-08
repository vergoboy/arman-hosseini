import { createRequire } from 'node:module';
import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MEDIA_DIR, SITE_DIR } from '../config.mjs';
import { slugify, splitFrontmatter } from './frontmatter.mjs';
import { audit, markDirty } from './store.mjs';
import { HttpError, sha256, writeAtomic } from './util.mjs';

const MAX_MEDIA = 6 * 1024 * 1024;

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

export async function mdxValidationActive() { return Boolean(await getCompiler()); }

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
