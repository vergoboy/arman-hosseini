/**
 * Content collections for vault-sourced content.
 *
 * Files here are **generated** by `npm run sync:content` (scripts/sync-content.mjs), which
 * mirrors the Obsidian vault's `project/{en,fa}` and `journal/{en,fa}` folders into
 * `src/content/projects` and `src/content/journal`. The synced files are git-ignored — the
 * vault is the source of truth — so a fresh clone has empty collections and the site falls
 * back to the copy baked into `src/i18n/translations.ts` (see src/data/projects.ts).
 *
 * Entry ids are `<lang>/<slug>` (for example `en/vegord`), produced by an explicit
 * `generateId` rather than the loader default: the default returns a frontmatter `slug`
 * verbatim, which would drop the language prefix and let `en/foo` and `fa/foo` collide.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Languages the site ships. Mirrors `Lang` in src/i18n/translations.ts. */
const langSchema = z.enum(['en', 'fa']);

/** Bento-grid span on the home page. Mirrors `ProjectSpan` in src/data/site.ts. */
const spanSchema = z.enum(['both', 'col', 'row', 'full', 'none']);

/**
 * Slug: lowercase, words joined by single hyphens — the URL segment the entry is served from.
 *
 * Unicode letters and digits are allowed (and lower-cased) so a Persian note named
 * `برنامه هفتگی` gets the slug `برنامه-هفتگی` and a readable Persian URL, instead of being
 * rejected or collapsed to an opaque hash. `sync-content` writes this value into frontmatter.
 */
const slugSchema = z
  .string()
  .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, 'slug must be lowercase words joined by single hyphens (e.g. "intel-arc-rgb")');

const linkSchema = z.object({
  label: z.string().min(1),
  href: z.url(),
});

/**
 * Frontmatter every entry shares.
 *
 * `lang` is required and is cross-checked against the entry's directory in
 * src/data/projects.ts and src/data/journal.ts: a note dropped into the wrong language
 * folder fails loudly instead of silently vanishing from one language's listing.
 * `date` is required — `sync:content` fills it from the file's mtime when a note has none,
 * so it is only ever missing for a hand-written file.
 */
const baseFrontmatter = z.object({
  title: z.string().min(1, 'title is required'),
  date: z.coerce.date(),
  tags: z.array(z.string().min(1)).default([]),
  lang: langSchema,
  /** Short blurb: card description, page meta description and journal excerpt. */
  summary: z.string().default(''),
  /** Excluded from listings and routes when true. */
  draft: z.boolean().default(false),
});

const projects = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/i, ''),
  }),
  schema: baseFrontmatter.extend({
    /** Shown under the title, and on the project card. */
    tagline: z.string().default(''),
    /** Bullet list under "What it does" on the detail page. */
    highlights: z.array(z.string().min(1)).default([]),
    /** Fills the home bento grid when true. */
    featured: z.boolean().default(false),
    /** Grid span on the home page; irrelevant unless `featured`. */
    span: spanSchema.default('none'),
    /** Source / live links rendered as buttons on the detail page. */
    links: z.array(linkSchema).default([]),
    /** Overrides the slug derived from the file name. */
    slug: slugSchema.optional(),
  }),
});

const journal = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/journal',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/i, ''),
  }),
  schema: baseFrontmatter.extend({
    /** Overrides the slug derived from the file name. */
    slug: slugSchema.optional(),
  }),
});

export const collections = { projects, journal };
