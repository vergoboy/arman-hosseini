# arman-hosseini.ir

Personal site of **Arman Hosseini (آرمان حسینی)** — static Astro site (EN + FA, RTL), built for SEO/AEO and tiny page weight, with a zero-dependency admin dashboard and an Obsidian publishing pipeline.

```
Obsidian ─Vergo MDX Studio─► /api/studio (media staged, MDX compiled) ─► Inbox ─(you approve)─► src/content ─► astro build ─► releases/<ts> ─► current (symlink)
Dashboard (/admin) ─► content-meta/overrides.json (SEO, status, translations) ─► same build
```

## What's in the box
- **Site** (`src/`): Astro 7 + Tailwind 4, no client framework. Pages: home, about, projects, journal, tags, contact, language-aware 404, root language picker. Output also includes `sitemap.xml` (hreflang + lastmod), `robots.txt` (AI crawlers allowed), `llms.txt`, per-language RSS, web manifest.
- **SEO/AEO** (`src/lib/seo.ts`): per-page title/description/keywords/canonical/noindex, OG + Twitter cards, JSON-LD `@graph` (Person, WebSite, ProfilePage, Article types, SoftwareApplication, BreadcrumbList, FAQPage), "Quick answer" blocks and FAQ sections, reading time, TOC.
- **Admin** (`admin/`): Node ≥ 20, no npm dependencies. Pages table with filters/bulk actions, SEO editor with live Google + social preview and health score, featured image + alt, publish/updated dates, schema type override, FAQ editor, translation linking, draft/disabled toggles with undo, media library (auto WebP via `sharp` when present), analytics, build log, one-click rollback, approval Inbox for pages sent from Obsidian, Studio tokens, audit log, settings backups, Ctrl+K palette.
- **Publishing** (`../vergo-mdx-studio`): an Obsidian plugin to write MDX, preview it with the site's own CSS, compile it and send the page + its images/videos. The server compiles the MDX again, stages the media, and puts the page in the dashboard **Inbox**; nothing goes live until you approve it.

## MDX components
Every `.mdx` page can use `<Callout type="tip|info|warning|danger|note" title>`, `<Card title href>`, `<Tabs><Tab label open>`, `<YouTube id|url title>` (click-to-open thumbnail, no YouTube script), `<AudioPlayer src title>`, `<VideoPlayer src poster title>` — no import needed (an `import … from "@/components/…"` line is allowed and ignored). Other imports, `export`, unknown components and server APIs (`process`, `require`, `fetch`, `import()`) in `{expressions}` are rejected by the admin service (`admin/lib/policy.mjs`), because MDX runs on the build machine. The site is static: no React, so `onClick` and other client-side interactivity are not supported.

## Content model
`src/content/{projects,journal}/{en,fa}/*.md|mdx`. Frontmatter: `title, date, lang, tags, summary, slug?, translationKey?, draft?` plus optional SEO fields (`seoTitle, seoDescription, keywords, image, imageAlt, schemaType, noindex, canonical, updated, faq[]`). Anything set in the dashboard wins over frontmatter (`content-meta/overrides.json`, key `collection/lang/slug` or `static/<lang>/<page>`).
Give the English and Persian version the same `translationKey` (or link them in the dashboard) to get hreflang + the language switcher pointing at the right page.

## Develop
```bash
npm ci
npm run dev            # site
npm run build          # type-check + build to dist/
npm test               # admin API tests
ADMIN_PASSWORD='…' npm run admin   # http://127.0.0.1:4322/admin/
```
First start without a password prints a one-time admin password (change it in Settings).

## Deploy (Ubuntu + nginx)
`deploy/install.sh` (one-time), `deploy/nginx.conf`, `deploy/arman-admin.service`. nginx serves `/opt/arman-hosseini/current`; the admin service runs `npm run build:site` into a new release dir and flips the symlink only on success (keeps the last 5).
Env: `SITE_DIR, RELEASES_DIR, CURRENT_LINK, DATA_DIR, ADMIN_HOST/PORT, ADMIN_PASSWORD_HASH (node admin/server.mjs --hash), BUILD_CMD, SITE_URL`.

## Troubleshooting: approved page shows 404
`bash deploy/doctor.sh /en/journal/<slug>/` on the server prints the live symlink, whether the page is inside it, the last build log, nginx's real `root`, and what nginx answers locally. In the dashboard use *Check if live* on the page. Typical causes: no build after approval, a failed build (see the log), or nginx still serving the old static folder instead of `…/current`.

## Security notes
scrypt password hash · HttpOnly+SameSite=Strict session · CSRF header on every write · login rate limit · plugin API only with a revocable bearer token (stored hashed), nothing goes live without approval, media must match its SHA-256 name · strict CSP on the dashboard · `X-Robots-Tag: noindex` · atomic file writes · only vault-origin files are ever deleted by ingest.
