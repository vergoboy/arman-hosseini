import type { APIRoute } from 'astro';
import { getEntries } from '../../lib/content';
import { abs } from '../../lib/seo';
import { languages, type Lang } from '../../lib/i18n';
import { useTranslations } from '../../i18n/translations';
import { site } from '../../data/site';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/]]>/g, ']]&gt;');
export function getStaticPaths() { return languages.map((lang) => ({ params: { lang } })); }
export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Lang; const d = useTranslations(lang);
  const items = (await getEntries('journal', lang)).filter((e) => !e.seo.noindex).slice(0, 30);
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>` +
    `<title>${esc(site.name)} — ${esc(d.journal.title)}</title><link>${abs(`/${lang}/journal/`)}</link><description>${esc(d.journal.intro)}</description><language>${lang}</language>` +
    `<atom:link href="${abs(`/${lang}/rss.xml`)}" rel="self" type="application/rss+xml"/>` +
    items.map((e) => `<item><title>${esc(e.title)}</title><link>${abs(e.url)}</link><guid isPermaLink="true">${abs(e.url)}</guid><pubDate>${e.date.toUTCString()}</pubDate><description>${esc(e.seo.description)}</description></item>`).join('') +
    `</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
