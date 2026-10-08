import type { APIRoute } from 'astro';
import { alternatesFor, getAllEntries } from '../lib/content';
import { abs, staticSeo } from '../lib/seo';
import { isoDate, languages, lp } from '../lib/i18n';
import { useTranslations } from '../i18n/translations';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const STATIC = ['', 'about', 'projects', 'journal', 'contact'];

export const GET: APIRoute = async () => {
  const urls: string[] = [];
  const row = (loc: string, alts: Record<string, string>, lastmod?: string) =>
    `<url><loc>${esc(abs(loc))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}` +
    Object.entries(alts).map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(abs(h))}"/>`).join('') +
    (alts.en ? `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(abs(alts.en))}"/>` : '') + '</url>';

  urls.push(`<url><loc>${abs('/')}</loc></url>`);
  for (const r of STATIC) {
    const alts = Object.fromEntries(languages.map((l) => [l, lp(l, r)]));
    for (const l of languages) {
      if (staticSeo(l, r, useTranslations(l).meta.home).noindex) continue;
      urls.push(row(lp(l, r), alts));
    }
  }
  for (const e of await getAllEntries()) {
    if (e.seo.noindex) continue;
    const alts = await alternatesFor(e);
    urls.push(row(e.seo.canonical ? new URL(e.seo.canonical).pathname : e.url, alts as Record<string, string>, isoDate(e.updated ?? e.date)));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
