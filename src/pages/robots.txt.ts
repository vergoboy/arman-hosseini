import type { APIRoute } from 'astro';
import { site } from '../data/site';
// AI answer engines are welcome: citations are the point of AEO.
const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
export const GET: APIRoute = () =>
  new Response(
    ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', '',
      ...bots.flatMap((b) => [`User-agent: ${b}`, 'Allow: /', '']),
      `Sitemap: ${site.url}/sitemap.xml`, ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
