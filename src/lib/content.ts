/**
 * One merged view of projects + journal: frontmatter < dashboard overrides.
 * Everything that renders or lists content goes through here.
 */
import { getCollection, render, type CollectionEntry } from 'astro:content';
import { overrideFor, type Override } from './overrides';
import { readingMinutes, type Lang } from './i18n';
import { site, type ProjectLink, type ProjectSpan } from '../data/site';

export type Collection = 'projects' | 'journal';
export interface Faq { q: string; a: string }

export interface Seo {
  title: string;
  description: string;
  keywords: string[];
  image?: string;
  imageAlt?: string;
  noindex: boolean;
  canonical?: string;
  schemaType: string;
}

export interface Entry {
  key: string;
  collection: Collection;
  lang: Lang;
  slug: string;
  url: string;
  title: string;
  summary: string;
  tags: string[];
  date: Date;
  updated?: Date;
  readingMin: number;
  seo: Seo;
  translationKey?: string;
  faq: Faq[];
  // projects only
  tagline: string;
  highlights: string[];
  featured: boolean;
  span: ProjectSpan;
  links: ProjectLink[];
  raw?: CollectionEntry<Collection>;
}

const slugOf = (id: string, explicit?: string) => explicit ?? id.slice(id.lastIndexOf('/') + 1);
const toDate = (v: string | Date | undefined) => (v ? new Date(v) : undefined);

function build(
  collection: Collection, lang: Lang, slug: string, d: Record<string, any>, body: string,
  raw?: CollectionEntry<Collection>,
): Entry | undefined {
  const key = `${collection}/${lang}/${slug}`;
  const o: Override = overrideFor(key);
  if (d.draft && !o.status) return undefined;
  const status = o.status ?? 'published';
  if (status !== 'published') return undefined;

  const title = o.title ?? d.title;
  const summary = o.summary ?? d.summary ?? '';
  const date = toDate(o.published) ?? d.date;
  const updated = toDate(o.updated) ?? d.updated;
  return {
    key, collection, lang, slug,
    url: `/${lang}/${collection}/${slug}/`,
    title, summary,
    tags: o.tags ?? d.tags ?? [],
    date, updated,
    readingMin: readingMinutes(body),
    translationKey: o.translationKey ?? d.translationKey,
    faq: o.faq ?? d.faq ?? [],
    tagline: d.tagline ?? '',
    highlights: d.highlights ?? [],
    featured: o.featured ?? d.featured ?? false,
    span: d.span ?? 'none',
    links: d.links ?? [],
    seo: {
      title: o.seoTitle ?? d.seoTitle ?? `${title} | ${site.name}`,
      description: (o.seoDescription ?? d.seoDescription ?? summary) || title,
      keywords: o.keywords ?? d.keywords ?? [],
      image: o.image ?? d.image,
      imageAlt: o.imageAlt ?? d.imageAlt,
      noindex: o.noindex ?? d.noindex ?? false,
      canonical: o.canonical ?? d.canonical,
      schemaType: o.schemaType ?? d.schemaType ?? 'auto',
    },
    raw,
  };
}

const cached = new Map<Collection, Promise<Entry[]>>();

async function load(collection: Collection): Promise<Entry[]> {
  const rows = await getCollection(collection);
  const out: Entry[] = [];
  for (const row of rows) {
    const folder = row.id.split('/')[0];
    if (folder !== row.data.lang) {
      throw new Error(`"${row.id}" declares lang: ${row.data.lang} but lives in "${folder}/".`);
    }
    const e = build(collection, row.data.lang, slugOf(row.id, row.data.slug), row.data, row.body ?? '', row);
    if (e) out.push(e);
  }
  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getEntries(collection: Collection, lang?: Lang): Promise<Entry[]> {
  if (!cached.has(collection)) cached.set(collection, load(collection));
  return cached.get(collection)!.then((all) => (lang ? all.filter((e) => e.lang === lang) : all));
}

export async function getAllEntries(): Promise<Entry[]> {
  return [...(await getEntries('projects')), ...(await getEntries('journal'))];
}

export async function renderEntry(e: Entry) {
  if (!e.raw) return { Content: undefined, headings: [] as { depth: number; slug: string; text: string }[] };
  const { Content, headings } = await render(e.raw);
  return { Content, headings };
}

/** URL of the same page in every language that has it (translationKey, else same slug). */
export async function alternatesFor(e: Entry): Promise<Partial<Record<Lang, string>>> {
  const all = await getEntries(e.collection);
  const out: Partial<Record<Lang, string>> = { [e.lang]: e.url };
  for (const other of all) {
    if (other.lang === e.lang) continue;
    const linked = e.translationKey && other.translationKey === e.translationKey;
    const sameSlug = !e.translationKey && !other.translationKey && other.slug === e.slug;
    if (linked || sameSlug) out[other.lang] = other.url;
  }
  return out;
}

/** All tags with counts for one language across both collections. */
export async function getTags(lang: Lang): Promise<Map<string, Entry[]>> {
  const map = new Map<string, Entry[]>();
  for (const e of await getAllEntries()) {
    if (e.lang !== lang) continue;
    for (const t of e.tags) map.set(t, [...(map.get(t) ?? []), e]);
  }
  return map;
}

export const tagSlug = (t: string) =>
  t.normalize('NFC').toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\p{L}\p{N}-]+/gu, '').replace(/-+/g, '-');
