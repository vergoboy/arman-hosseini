import type { APIRoute } from 'astro';
export const GET: APIRoute = () => new Response(JSON.stringify({
  name: 'Arman Hosseini', short_name: 'Arman', start_url: '/', display: 'browser',
  background_color: '#07090f', theme_color: '#07090f',
  icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
}), { headers: { 'Content-Type': 'application/manifest+json' } });
