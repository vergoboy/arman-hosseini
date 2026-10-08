/** Page-level SEO: meta, hreflang and a JSON-LD @graph (Person entity is on every page). */
import { site } from '../data/site';
import { useTranslations } from '../i18n/translations';
import { languages, locale, type Lang } from './i18n';
import { U } from './ui';
import type { Entry, Faq } from './content';
import { overrideFor, type Override } from './overrides';

export const abs = (p: string) => new URL(p, site.url).href;

export const sameAs = [
  'https://github.com/vergoboy',
  'https://codeberg.org/vergoboy',
  'https://www.linkedin.com/in/arman-hosseini-022471334',
  'https://t.me/the_vergoboy',
  'https://mastodon.social/@the_vergoboy',
];

export interface Crumb { name: string; url: string }

export interface PageSeo {
  lang: Lang;
  path: string; // canonical path
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
  canonical?: string;
  type?: 'website' | 'article' | 'profile';
  alternates?: Partial<Record<Lang, string>>;
  published?: Date;
  updated?: Date;
  graph?: Record<string, unknown>[];
}

/** SEO for a static page (home/about/…) merged with its dashboard override `static/<lang>/<route>`. */
export function staticSeo(lang: Lang, route: string, base: { title: string; description: string }) {
  const o: Override = overrideFor(`static/${lang}/${route || 'home'}`);
  return {
    title: o.seoTitle ?? base.title,
    description: o.seoDescription ?? base.description,
    keywords: o.keywords ?? [],
    image: o.image,
    imageAlt: o.imageAlt,
    noindex: o.noindex ?? false,
    canonical: o.canonical,
    schemaType: o.schemaType,
  };
}

export const personNode = (lang: Lang) => ({
  '@type': 'Person',
  '@id': `${site.url}/#person`,
  name: site.name,
  alternateName: [...site.aliases, site.alternateName].filter((v, i, a) => a.indexOf(v) === i && v !== site.name),
  jobTitle: useTranslations(lang).site.jobTitle,
  description: U(lang).who,
  url: site.url,
  image: abs('/assets/Vargo/mark.svg'),
  email: `mailto:${site.email}`,
  sameAs,
  knowsAbout: ['Rust', 'Linux', 'Computer networking', 'TLS', 'Reverse engineering', 'Local LLM', 'Flutter', 'OpenRGB'],
  knowsLanguage: ['en', 'fa'],
});

export const websiteNode = {
  '@type': 'WebSite',
  '@id': `${site.url}/#website`,
  url: site.url,
  name: site.name,
  inLanguage: ['en', 'fa'],
  publisher: { '@id': `${site.url}/#person` },
};

export function breadcrumbs(items: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.url),
    })),
  };
}

export function faqNode(faq: Faq[], lang: Lang) {
  return {
    '@type': 'FAQPage',
    inLanguage: lang,
    mainEntity: faq.map((f) => ({
      '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** JSON-LD node for a content entry, honouring the dashboard's schemaType override. */
export function entryNode(e: Entry, alternates: Partial<Record<Lang, string>>) {
  const url = abs(e.url);
  const type =
    e.seo.schemaType !== 'auto' ? e.seo.schemaType
    : e.collection === 'projects' ? 'SoftwareApplication' : 'BlogPosting';
  const node: Record<string, unknown> = {
    '@type': type,
    '@id': `${url}#main`,
    mainEntityOfPage: url,
    url,
    name: e.title,
    headline: e.title,
    description: e.seo.description,
    inLanguage: e.lang,
    keywords: [...e.tags, ...e.seo.keywords].join(', '),
    datePublished: e.date.toISOString(),
    dateModified: (e.updated ?? e.date).toISOString(),
    author: { '@id': `${site.url}/#person` },
    publisher: { '@id': `${site.url}/#person` },
    isPartOf: { '@id': `${site.url}/#website` },
  };
  if (e.seo.image) node.image = abs(e.seo.image);
  if (type === 'SoftwareApplication') {
    node.applicationCategory = 'DeveloperApplication';
    node.operatingSystem = 'Linux';
    const repo = e.links.find((l) => /github|codeberg/.test(l.href));
    if (repo) node.sameAs = repo.href;
  }
  if (type === 'SoftwareSourceCode') {
    node.programmingLanguage = e.tags[0];
    const repo = e.links.find((l) => /github|codeberg/.test(l.href));
    if (repo) node.codeRepository = repo.href;
  }
  const other = languages.find((l) => l !== e.lang && alternates[l]);
  if (other) node.workTranslation = { '@type': 'CreativeWork', url: abs(alternates[other]!), inLanguage: other };
  return node;
}

export { locale };
