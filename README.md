# arman-hosseini.ir

Personal site of **Arman Hosseini (آرمان حسینی)** — static Astro site (EN + FA, RTL), built for SEO/AEO and tiny page weight, with a zero-dependency admin dashboard and an Obsidian publishing pipeline.

```
Obsidian ─FIT─► POST /api/ingest ─► validate MDX ─► src/content ─► astro build ─► releases/<ts> ─► current (symlink)
Dashboard (/admin) ─► content-meta/overrides.json (SEO, status, translations) ─► same build
```

## What's in the box
- **Site** (`src/`): Astro 7 + Tailwind 4, no client framework. Pages: home, about, projects, journal, tags, contact, language-aware 404, root language picker. Output also includes `sitemap.xml` (hreflang + lastmod), `robots.txt` (AI crawlers allowed), `llms.txt`, per-language RSS, web manifest.
- **SEO/AEO** (`src/lib/seo.ts`): per-page title/description/keywords/canonical/noindex, OG + Twitter cards, JSON-LD `@graph` (Person, WebSite, ProfilePage, Article types, SoftwareApplication, BreadcrumbList, FAQPage), "Quick answer" blocks and FAQ sections, reading time, TOC.
- **Admin** (`admin/`): Node ≥ 20, no npm dependencies. Pages table with filters/bulk actions, SEO editor with live Google + social preview and health score, featured image + alt, publish/updated dates, schema type override, FAQ editor, translation linking, draft/disabled toggles with undo, media library (auto WebP via `sharp` when present), analytics, build log, one-click rollback, FIT tokens, audit log, settings backups, Ctrl+K palette.
- **Publishing** (`../fit`): Obsidian plugin sends notes over HTTPS; the server compiles every MDX file first and refuses the whole bundle on any error.

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

## Security notes
scrypt password hash · HttpOnly+SameSite=Strict session · CSRF header on every write · login rate limit · ingest only with a revocable bearer token (stored hashed) · strict CSP on the dashboard · `X-Robots-Tag: noindex` · atomic file writes · only vault-origin files are ever deleted by ingest.
