/**
 * Content collections. Files are written by the admin ingest endpoint (from the Obsidian
 * FIT plugin) or by the dashboard; SEO/status overrides live separately in
 * `content-meta/overrides.json` and are merged in `src/lib/content.ts`.
 * Ids are `<lang>/<slug>` so `en/foo` and `fa/foo` never collide.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const langSchema = z.enum(['en', 'fa']);
const spanSchema = z.enum(['both', 'col', 'row', 'full', 'none']);
const slugSchema = z
  .string()
  .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, 'slug must be words joined by single hyphens');

export const schemaTypes = [
  'auto', 'Article', 'BlogPosting', 'TechArticle', 'HowTo', 'FAQPage',
  'SoftwareApplication', 'SoftwareSourceCode', 'CreativeWork', 'WebPage',
] as const;

const faqSchema = z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).default([]);

const baseFrontmatter = z.object({
  title: z.string().min(1, 'title is required'),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string().min(1)).default([]),
  lang: langSchema,
  summary: z.string().default(''),
  draft: z.boolean().default(false),
  slug: slugSchema.optional(),
  // SEO / AEO (all optional; the dashboard can override every one of them)
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  schemaType: z.enum(schemaTypes).default('auto'),
  noindex: z.boolean().default(false),
  canonical: z.url().optional(),
  /** Same value on the en and fa version of a page links them (hreflang + switcher). */
  translationKey: z.string().optional(),
  faq: faqSchema,
});

const projects = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/i, ''),
  }),
  schema: baseFrontmatter.extend({
    tagline: z.string().default(''),
    highlights: z.array(z.string().min(1)).default([]),
    featured: z.boolean().default(false),
    span: spanSchema.default('none'),
    links: z.array(z.object({ label: z.string().min(1), href: z.url() })).default([]),
  }),
});

const journal = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/journal',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/i, ''),
  }),
  schema: baseFrontmatter,
});

export const collections = { projects, journal };
