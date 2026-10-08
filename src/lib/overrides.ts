/** Dashboard-managed overrides: content-meta/overrides.json (key = `collection/lang/slug`). */
import { readFileSync } from 'node:fs';
import path from 'node:path';

export type Status = 'published' | 'draft' | 'disabled';

export interface Override {
  status?: Status;
  title?: string;
  summary?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  published?: string; // ISO date
  updated?: string;
  schemaType?: string;
  noindex?: boolean;
  canonical?: string;
  translationKey?: string;
  featured?: boolean;
  faq?: { q: string; a: string }[];
}

let cache: Record<string, Override> | undefined;

export function getOverrides(): Record<string, Override> {
  if (cache) return cache;
  try {
    const file = path.join(process.cwd(), 'content-meta', 'overrides.json');
    cache = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Override>;
  } catch {
    cache = {};
  }
  return cache;
}

export const overrideFor = (key: string): Override => getOverrides()[key] ?? {};
