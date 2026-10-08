import type { APIRoute } from 'astro';
import { getAllEntries } from '../lib/content';
import { abs } from '../lib/seo';
import { site } from '../data/site';
import { U } from '../lib/ui';

export const GET: APIRoute = async () => {
  const all = await getAllEntries();
  const sec = (title: string, lang: 'en' | 'fa', col: string) => {
    const rows = all.filter((e) => e.lang === lang && e.collection === col);
    return rows.length ? [`## ${title}`, ...rows.map((e) => `- [${e.title}](${abs(e.url)}): ${e.seo.description}`), ''] : [];
  };
  const body = [
    `# ${site.name} (${site.alternateName})`, '',
    `> ${U('en').who}`, '',
    `Site languages: English (/en/) and Persian (/fa/). Contact: ${site.email}. Code: https://github.com/vergoboy, https://codeberg.org/vergoboy`, '',
    '## Main pages',
    `- [Home (EN)](${abs('/en/')}): overview`, `- [About (EN)](${abs('/en/about/')}): background and stack`,
    `- [خانه (FA)](${abs('/fa/')}): معرفی`, `- [درباره (FA)](${abs('/fa/about/')}): پیشینه و مهارت‌ها`, '',
    ...sec('Projects (EN)', 'en', 'projects'), ...sec('Journal (EN)', 'en', 'journal'),
    ...sec('پروژه‌ها (FA)', 'fa', 'projects'), ...sec('یادداشت‌ها (FA)', 'fa', 'journal'),
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
