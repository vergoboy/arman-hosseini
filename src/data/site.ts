/**
 * Identity, profile links and project structure.
 * All human-readable copy lives in `src/i18n/translations.ts`.
 */

export const site = {
  url: 'https://arman-hosseini.ir',
  name: 'Arman Hosseini',
  alternateName: 'آرمان حسینی',
  aliases: ['Arman Hosseini', 'آرمان حسینی', 'vergoboy', 'the_vergoboy'],
  email: 'hi@arman-hosseini.ir',
  emailAlt: 'the.arman.hosseini@gmail.com',
} as const;

/** Brand glyphs hand-rolled in `BrandIcon.astro` (Lucide has no brand icons). */
export type BrandIconName =
  | 'github'
  | 'codeberg'
  | 'linkedin'
  | 'telegram'
  | 'discord'
  | 'mastodon'
  | 'mail';

export interface ProjectLink {
  label: string;
  href: string;
}

/** Bento-grid span on the home page. */
export type ProjectSpan = 'both' | 'col' | 'row' | 'full' | 'none';

export interface ProjectMeta {
  slug: string;
  /** Grid span, only used by the home bento grid. */
  span: ProjectSpan;
  /** Shown in the three-card bento grid on the home page. */
  featured: boolean;
  /** Optional source / live links. Add real URLs when available. */
  links?: ProjectLink[];
}

/** Structure and order of projects; copy is resolved per language. */
export const projectMeta: ProjectMeta[] = [
  { slug: 'vegord', span: 'col', featured: true },
  { slug: 'bidandoonvpn', span: 'none', featured: true },
  { slug: 'intel-arc-rgb', span: 'full', featured: true },
  { slug: 'arman-music', span: 'col', featured: false },
];
