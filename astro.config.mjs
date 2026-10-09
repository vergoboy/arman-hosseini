// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

/**
 * The site's built-in MDX components (Callout, Card, Tabs, …) are provided to every page, so an
 * author's `import { Callout } from "@/components/Callout"` is dropped before MDX compiles
 * (line-preserving). Any other import is rejected earlier by the admin service.
 * Done as a Vite pre-transform because Astro 7's default Markdown processor ignores remark plugins.
 */
const BUILTIN_IMPORT = /^import\s+[^"';]{0,300}?\s+from\s+["']@\/components\/[^"']+["'];?[ \t]*$/gm;
/** @returns {import('vite').Plugin} */
function dropBuiltinMdxImports() {
  return {
    name: 'drop-builtin-mdx-imports',
    enforce: 'pre',
    /** @param {string} code @param {string} id */
    transform(code, id) {
      if (!/\.mdx(\?|$)/.test(id) || !code.includes('@/components/')) return null;
      const out = code.split(/(^```[\s\S]*?^```)/gm).map((/** @type {string} */ part, /** @type {number} */ i) => (i % 2 ? part : part.replace(BUILTIN_IMPORT, (/** @type {string} */ m) => '\n'.repeat(m.split('\n').length - 1)))).join('');
      return out === code ? null : { code: out, map: null };
    },
  };
}

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
  vite: { plugins: [tailwindcss(), dropBuiltinMdxImports()] },
});
