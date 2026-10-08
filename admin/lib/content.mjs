import { readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { COLLECTIONS, CONTENT_DIR, LANGS, SITE_URL, STATIC_PAGES } from '../config.mjs';
import { buildDocument, parseFrontmatter, slugify } from './frontmatter.mjs';
import { audit, markDirty, patchOverride, readManifest, readOverrides, writeManifest } from './store.mjs';
import { HttpError, writeAtomic } from './util.mjs';

const EXT = /\.(md|mdx)$/i;

async function walk(dir) {
  const out = [];
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}

const words = (s) => s.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;

/** Every content file on disk, parsed. */
export async function scanContent() {
  const manifest = await readManifest();
  const rows = [];
  for (const collection of COLLECTIONS) {
    for (const file of await walk(path.join(CONTENT_DIR, collection))) {
      const rel = path.relative(path.join(CONTENT_DIR, collection), file).split(path.sep).join('/');
      const lang = rel.split('/')[0];
      if (!LANGS.includes(lang)) continue;
      const src = await readFile(file, 'utf8');
      const { data, body } = parseFrontmatter(src);
      const id = rel.replace(EXT, '');
      const slug = data.slug || id.slice(id.lastIndexOf('/') + 1);
      const relRepo = `${collection}/${rel}`;
      rows.push({
        key: `${collection}/${lang}/${slug}`, collection, lang, slug, file, relPath: relRepo,
        fm: data, body, origin: manifest.files[relRepo] ? 'studio' : 'native',
        ext: path.extname(file).slice(1).toLowerCase(),
      });
    }
  }
  return rows;
}

const STATIC_TITLES = { home: 'Home', about: 'About', projects: 'Projects', journal: 'Journal', contact: 'Contact' };
const staticUrl = (lang, p) => (p === 'home' ? `/${lang}/` : `/${lang}/${p}/`);

/** Rules shared by the dashboard badges and the "SEO health" overview. */
export function lint(e) {
  const issues = [];
  const add = (code, level) => issues.push({ code, level });
  const title = e.seo.title || '';
  const desc = e.seo.description || '';
  if (title.length < 25) add('title_short', 'warn'); else if (title.length > 65) add('title_long', 'warn');
  if (!desc) add('desc_missing', 'error'); else if (desc.length < 70) add('desc_short', 'warn'); else if (desc.length > 165) add('desc_long', 'warn');
  if (!e.seo.keywords.length) add('keywords_missing', 'info');
  if (e.kind === 'content') {
    if (!e.seo.image) add('image_missing', e.collection === 'journal' ? 'warn' : 'info');
    else if (!e.seo.imageAlt) add('alt_missing', 'error');
    if (!e.translations.length) add('translation_missing', 'info');
    if (!e.faqCount) add('faq_missing', 'info');
    if (e.words < 120) add('thin_content', 'warn');
    if (/^# \S/m.test(e.bodyPreview || '')) add('h1_in_body', 'warn');
    if (!e.date) add('date_missing', 'warn');
    if (!e.tags.length) add('tags_missing', 'info');
  }
  if (e.seo.canonical && !/^https?:\/\//.test(e.seo.canonical)) add('canonical_invalid', 'error');
  const penalty = { error: 20, warn: 8, info: 2 };
  const score = Math.max(0, 100 - issues.reduce((n, i) => n + penalty[i.level], 0));
  return { score, issues };
}

const asArray = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

/** Frontmatter + overrides merged the same way src/lib/content.ts does at build time. */
export async function listEntries() {
  const [rows, over] = await Promise.all([scanContent(), readOverrides()]);
  const out = [];
  for (const r of rows) {
    const o = over[r.key] ?? {};
    const fm = r.fm;
    const status = o.status ?? (fm.draft ? 'draft' : 'published');
    const title = o.title ?? fm.title ?? r.slug;
    const summary = o.summary ?? fm.summary ?? '';
    const entry = {
      kind: 'content', key: r.key, collection: r.collection, lang: r.lang, slug: r.slug,
      origin: r.origin, ext: r.ext, status, title, summary,
      url: `/${r.lang}/${r.collection}/${r.slug}/`,
      tags: o.tags ?? asArray(fm.tags),
      date: o.published ?? (fm.date ? String(fm.date).slice(0, 10) : ''),
      updated: o.updated ?? (fm.updated ? String(fm.updated).slice(0, 10) : ''),
      translationKey: o.translationKey ?? fm.translationKey ?? '',
      featured: o.featured ?? fm.featured ?? false,
      faqCount: (o.faq ?? (Array.isArray(fm.faq) ? fm.faq : [])).length,
      words: words(r.body), bodyPreview: r.body.slice(0, 4000),
      seo: {
        title: o.seoTitle ?? fm.seoTitle ?? `${title} | Arman Hosseini`,
        description: o.seoDescription ?? fm.seoDescription ?? summary,
        keywords: o.keywords ?? asArray(fm.keywords),
        image: o.image ?? fm.image ?? '', imageAlt: o.imageAlt ?? fm.imageAlt ?? '',
        noindex: o.noindex ?? fm.noindex ?? false, canonical: o.canonical ?? fm.canonical ?? '',
        schemaType: o.schemaType ?? fm.schemaType ?? 'auto',
      },
      override: o, translations: [],
    };
    out.push(entry);
  }
  // translation links: same translationKey, else same slug across languages
  for (const e of out) {
    e.translations = out.filter((x) => x.key !== e.key && x.collection === e.collection && x.lang !== e.lang && (
      e.translationKey ? x.translationKey === e.translationKey : (!x.translationKey && x.slug === e.slug)));
    e.translations = e.translations.map((x) => ({ key: x.key, lang: x.lang, title: x.title, url: x.url }));
  }
  // static pages (SEO overrides only)
  for (const lang of LANGS) for (const p of STATIC_PAGES) {
    const key = `static/${lang}/${p}`; const o = over[key] ?? {};
    const s = { kind: 'static', key, collection: 'static', lang, slug: p, origin: 'site', status: 'published', title: STATIC_TITLES[p],
      summary: '', url: staticUrl(lang, p), tags: [], date: '', updated: '', translationKey: '', faqCount: 0, words: 999,
      seo: { title: o.seoTitle ?? '', description: o.seoDescription ?? '', keywords: o.keywords ?? [], image: o.image ?? '',
        imageAlt: o.imageAlt ?? '', noindex: o.noindex ?? false, canonical: o.canonical ?? '', schemaType: o.schemaType ?? 'auto' },
      override: o, translations: [{ key: `static/${lang === 'en' ? 'fa' : 'en'}/${p}`, lang: lang === 'en' ? 'fa' : 'en', title: STATIC_TITLES[p], url: staticUrl(lang === 'en' ? 'fa' : 'en', p) }] };
    // static pages fall back to built-in copy; only lint fields that are explicitly set
    if (!s.seo.title) s.seo.title = 'x'.repeat(40); if (!s.seo.description) s.seo.description = 'x'.repeat(100);
    s.health = lint(s);
    if (!o.seoTitle) s.seo.title = ''; if (!o.seoDescription) s.seo.description = '';
    out.push(s);
  }
  for (const e of out) if (!e.health) e.health = lint(e);
  const dup = new Map();
  for (const e of out) if (e.kind === 'content' && e.status === 'published') dup.set(e.seo.title, [...(dup.get(e.seo.title) ?? []), e]);
  for (const list of dup.values()) if (list.length > 1) for (const e of list) { e.health.issues.push({ code: 'title_duplicate', level: 'warn' }); e.health.score = Math.max(0, e.health.score - 8); }
  return out;
}

export async function getEntry(key) {
  const e = (await listEntries()).find((x) => x.key === key);
  if (!e) throw new HttpError(404, 'entry not found');
  if (e.kind === 'content') {
    const row = (await scanContent()).find((r) => r.key === key);
    e.body = row.body; e.relPath = row.relPath;
  }
  return e;
}

/* ---------- native (dashboard-owned) entries ---------- */
function assertNative(row) { if (row.origin !== 'native') throw new HttpError(409, 'this page was sent from Obsidian; edit it there and send it again (or disable it here)'); }

export async function createNative({ collection, lang, title, slug, body = '', summary = '', tags = [], mdx = false }) {
  if (!COLLECTIONS.includes(collection) || !LANGS.includes(lang)) throw new HttpError(422, 'bad collection or language');
  if (!title?.trim()) throw new HttpError(422, 'title is required');
  const s = slugify(slug || title) || `note-${Date.now().toString(36)}`;
  const file = path.join(CONTENT_DIR, collection, lang, `${s}.${mdx ? 'mdx' : 'md'}`);
  if ((await stat(file).catch(() => null)) || (await scanContent()).some((r) => r.key === `${collection}/${lang}/${s}`)) throw new HttpError(409, 'slug already exists');
  const today = new Date().toISOString().slice(0, 10);
  await writeAtomic(file, buildDocument({ title, date: today, lang, tags, summary, slug: s }, body));
  await audit('admin', 'create', `${collection}/${lang}/${s}`, '');
  await markDirty('create');
  return getEntry(`${collection}/${lang}/${s}`);
}

export async function saveBody(key, { body, title }) {
  const row = (await scanContent()).find((r) => r.key === key);
  if (!row) throw new HttpError(404, 'entry not found');
  assertNative(row);
  const src = await readFile(row.file, 'utf8');
  const { setKeys } = await import('./frontmatter.mjs');
  let next = src;
  if (typeof title === 'string' && title.trim()) next = setKeys(next, { title });
  if (typeof body === 'string') { const m = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(next); next = (m ? m[0] : '') + (m ? '\n' : '') + body.replace(/^\n+/, ''); }
  await writeAtomic(row.file, next);
  await audit('admin', 'edit-body', key, ''); await markDirty('edit');
}

export async function deleteNative(key) {
  const row = (await scanContent()).find((r) => r.key === key);
  if (!row) throw new HttpError(404, 'entry not found');
  assertNative(row);
  await rm(row.file); await patchOverride(key, Object.fromEntries(Object.keys((await readOverrides())[key] ?? {}).map((k) => [k, null])));
  await audit('admin', 'delete', key, ''); await markDirty('delete');
}

/** Link two entries as translations of each other by giving both the same translationKey. */
export async function linkTranslation(a, b) {
  const list = await listEntries();
  const x = list.find((e) => e.key === a), y = list.find((e) => e.key === b);
  if (!x || !y || x.kind !== 'content' || y.kind !== 'content') throw new HttpError(404, 'entry not found');
  if (x.collection !== y.collection || x.lang === y.lang) throw new HttpError(422, 'pick one entry per language in the same collection');
  const tk = x.translationKey || y.translationKey || x.slug.replace(/[^\p{L}\p{N}_-]/gu, '') || 'pair';
  await patchOverride(x.key, { translationKey: tk }); await patchOverride(y.key, { translationKey: tk });
  return tk;
}
export async function unlinkTranslation(key) {
  const e = (await listEntries()).find((x) => x.key === key);
  if (!e) throw new HttpError(404, 'entry not found');
  // give it a unique key so the same-slug fallback does not silently re-link it
  await patchOverride(key, { translationKey: `solo-${e.lang}-${e.slug}`.slice(0, 80) });
}

export const publicUrl = (p) => new URL(p, SITE_URL).href;
export { readManifest, writeManifest };
