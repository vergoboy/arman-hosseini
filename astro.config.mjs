// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Canonical origin, used for canonical URLs, OG tags, sitemap and JSON-LD.
  site: 'https://arman-hosseini.ir',

  // English is the default language, served from /en/. Persian lives at /fa/.
  redirects: {
    '/': '/en/',
  },

  integrations: [
    // Vault notes are synced into src/content as .md/.mdx (see scripts/sync-content.mjs).
    // `.mdx` entries need this integration; plain `.md` entries are rendered by Astro's
    // built-in markdown pipeline, so a note containing `{` or `<Tag>` is not misparsed as MDX.
    mdx(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', fa: 'fa' },
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
