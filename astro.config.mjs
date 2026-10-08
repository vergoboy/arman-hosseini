// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://arman-hosseini.ir',
  // The admin service builds into a fresh release dir and flips a symlink (see admin/).
  outDir: process.env.ASTRO_OUT_DIR || './dist',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  prefetch: false,
  integrations: [mdx()],
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false, wrap: false },
  },
  vite: { plugins: [tailwindcss()] },
});
