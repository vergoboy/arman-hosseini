# arman-hosseini.ir

Personal site of **Arman Hosseini (آرمان حسینی)** — a bilingual static site
(English + Persian, RTL) built with Astro for SEO/AEO and tiny page weight, with
a zero-dependency Node admin dashboard and an Obsidian publishing pipeline.

```
Obsidian ─Vergo MDX Studio─► /api/studio (media staged, MDX compiled) ─► Inbox ─(you approve)─► src/content ─► astro build ─► releases/<ts> ─► current (symlink)
Dashboard (/admin) ─► content-meta/overrides.json (SEO, status, translations) ─► same build
```

## Features

- **Site** (`src/`): Astro 7 + Tailwind 4, no client framework. Pages: home,
  about, projects, journal, tags, contact, language-aware 404 and a root language
  picker. Output also includes `sitemap.xml` (hreflang + lastmod), `robots.txt`
  (AI crawlers allowed), `llms.txt`, per-language RSS and a web manifest.
- **SEO/AEO** (`src/lib/seo.ts`): per-page title/description/keywords/canonical/
  noindex, Open Graph + Twitter cards, JSON-LD `@graph` (Person, WebSite,
  ProfilePage, Article types, SoftwareApplication, BreadcrumbList, FAQPage),
  "Quick answer" blocks and FAQ sections, reading time and a table of contents.
- **Admin** (`admin/`): Node ≥ 20, no npm dependencies. Pages table with
  filters/bulk actions, SEO editor with live Google + social preview and health
  score, featured image + alt, publish/updated dates, schema type override, FAQ
  editor, translation linking, draft/disabled toggles with undo, media library
  (auto WebP via `sharp` when present), analytics, build log, one-click rollback,
  approval Inbox for pages sent from Obsidian, Studio tokens, audit log, settings
  backups and a Ctrl+K palette.
- **Publishing** (`../vergo-mdx-studio`): an Obsidian plugin to write MDX,
  preview it with the site's own CSS, compile it and send the page plus its
  images/videos. The server compiles the MDX again, stages the media and puts the
  page in the dashboard **Inbox**; nothing goes live until you approve it.

## Requirements

- **Node.js ≥ 20** and npm (the admin service only uses the Node standard library).
- Optional: `sharp` for automatic WebP generation in the media library.
- Optional for deploys: SSH access to the target host; `sshpass` only if the
  server does not accept key auth.

## Installation

```bash
git clone https://github.com/vergoboy/arman-hosseini.git
cd arman-hosseini
npm ci
```

## Quick start

```bash
npm run dev            # site at http://localhost:4321
npm test               # admin API tests
ADMIN_PASSWORD='…' npm run admin   # dashboard at http://127.0.0.1:4322/admin/
```

The first admin start without a password prints a one-time password; change it in
Settings.

## Usage

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Astro dev server. |
| `npm run build` | Type-check (`astro check`) and build to `dist/`. |
| `npm run build:site` | Build only (`astro build`), used by the admin releases. |
| `npm run preview` | Preview the production build locally. |
| `npm test` | Run the admin API test suite (`node --test`). |
| `npm run admin` | Start the admin service. |
| `npm run admin:hash` | Print a password hash for `ADMIN_PASSWORD_HASH`. |
| `npm run deploy` / `npm run deploy:dry` | Deploy `dist/` via `scripts/deploy.sh`. |

## Development

- `npm run dev` while editing `src/`; content lives in `src/content/`.
- `npm test` covers the admin API; the deployment tests in `tests/` run with
  `python3 -m pytest`.
- Type-check with `npm run build` (which runs `astro check` first). If the
  check cannot resolve `node:fs`/`node:path`/`process`, make sure `@types/node`
  is present in `devDependencies`.
- There is no dedicated linter or formatter configured; the project relies on
  `astro check` and the existing code style.

## Configuration

Copy `.env.example` to `.env` (git-ignored) and fill in what you need. Secret
values never belong in `deploy.config.json` — `scripts/deploy.sh` refuses to run
if it finds password/passphrase/key fields there.

| Variable | Purpose | Default |
| --- | --- | --- |
| `SITE_URL` | Canonical site URL (also used by the admin live check). | `https://arman-hosseini.ir` |
| `SITE_DIR` | Site root for the admin service. | directory above `admin/` |
| `RELEASES_DIR` | Build output for releases. | `<SITE_DIR>/releases` |
| `CURRENT_LINK` | nginx `root` symlink flipped on a successful build. | `<SITE_DIR>/current` |
| `DATA_DIR` | Admin data (overrides backup, sessions, stats). | `<SITE_DIR>/.admin-data` |
| `ADMIN_HOST` | Admin bind address. | `127.0.0.1` |
| `ADMIN_PORT` | Admin port. | `4322` |
| `ADMIN_PASSWORD_HASH` | scrypt hash from `node admin/server.mjs --hash`. | — |
| `BUILD_CMD` | Build command the admin service runs per release. | `npm run build:site` |
| `KEEP_RELEASES` | Release directories kept before pruning. | `5` |
| `DEPLOY_SSH_PASSWORD` | Only if the server cannot use key auth (needs `sshpass`). | — |
| `OBSIDIAN_VAULT`, `DEPLOY_CONFIG` | Optional overrides for the sync/deploy scripts. | — |

## Architecture

The project has four layers:

- **Presentation** — static Astro pages in `src/pages/` rendered from content
  collections, plus the admin dashboard in `admin/public/`.
- **Content** — Markdown/MDX in `src/content/{projects,journal}/{en,fa}` with a
  schema in `src/content.config.ts`; dashboard overrides live next to the content
  in `content-meta/overrides.json`.
- **SEO/AEO** — `src/lib/seo.ts` turns each entry into metadata, JSON-LD and
  feed/sitemap output.
- **Publishing & deploy** — the admin service (`admin/server.mjs`) accepts Studio
  submissions, rebuilds into `releases/<ts>` and flips the `current` symlink only
  on success.

Main flow: `Obsidian → /api/studio → Inbox → approve → src/content → astro build → releases/<ts> → current`.

### Core components

- **Site** renders pages and feeds from the content collections.
- **SEO/AEO** (`src/lib/seo.ts`) produces meta tags, Open Graph, JSON-LD,
  sitemap, RSS, `robots.txt` and `llms.txt`.
- **Admin service** (`admin/server.mjs`) provides a route table for content,
  media, submissions, builds and tokens; the browser UI is served at `/admin/`.
- **Publishing pipeline** moves approved submissions into `src/content` and
  triggers atomic builds.

## Project structure

```
admin/            Zero-dependency Node admin service (server, lib/, public/, test/)
content-meta/     Dashboard overrides (SEO, status, translations)
deploy/           Ubuntu + nginx install script, nginx config, systemd unit
docs/             Project notes
public/           Static assets (icons, Open Graph image)
scripts/          deploy.sh
src/
├─ components/    Astro + MDX components
├─ content/       projects & journal, per language (en/fa)
├─ data/          Site constants
├─ i18n/          UI translations
├─ layouts/       Base layout
├─ lib/           content, seo, overrides and i18n helpers
└─ pages/         Routes (home, about, projects, journal, tags, 404, rss, sitemap, llms.txt, robots, manifest)
tests/            Python deployment tests
```

## API & CLI

The admin service exposes a small REST API on `ADMIN_HOST:ADMIN_PORT`. Routes
outside the ones marked **public** require a session cookie and a CSRF header;
the `/api/studio/*` routes use a revocable bearer token instead.

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` (public) | Service health and current release. |
| `POST /api/login`, `POST /api/logout` (public) | Session login/logout. |
| `POST /api/v` (public) | Privacy-friendly page-view beacon. |
| `GET /api/overview`, `GET /api/me` | Dashboard state, user, CSRF token. |
| `GET /api/entries` · `GET/PATCH/DELETE /api/entry?key=` · `POST /api/entries` | List, read/edit/delete entries. |
| `PUT /api/entry/body?key=` · `POST /api/entries/bulk` | Body edits, bulk status/SEO patches. |
| `GET /api/entry/live?key=` | Live-release and public-URL status of a page. |
| `POST /api/translations/link` / `unlink` | Manage `translationKey` pairs. |
| `GET /api/media` · `POST /api/media` · `DELETE /api/media?url=` | Media library. |
| `GET /api/submissions` · `POST /api/submissions/approve\|reject` | Obsidian inbox workflow. |
| `GET /api/stats?days=` | View statistics. |
| `POST /api/build` · `GET /api/builds` · `POST /api/rollback` | Build, list, rollback releases. |
| `GET /api/audit` · `GET /api/backups` · `POST /api/backups/restore` | Audit log and settings backups. |
| `GET/POST /api/tokens` · `DELETE /api/tokens?id=` | Plugin bearer tokens. |
| `POST /api/password` | Change the admin password. |
| `GET /api/studio/ping` · `POST /api/studio/media/check` · `PUT /api/studio/media` · `POST /api/studio/submissions` | Obsidian Studio plugin endpoints (bearer token). |

The **CLI** is the npm script table in [Usage](#usage) plus `node admin/server.mjs --hash`
for generating an `ADMIN_PASSWORD_HASH`.

## Content model

`src/content/{projects,journal}/{en,fa}/*.md|mdx`. Frontmatter: `title, date,
lang, tags, summary, slug?, translationKey?, draft?` plus optional SEO fields
(`seoTitle, seoDescription, keywords, image, imageAlt, schemaType, noindex,
canonical, updated, faq[]`). Anything set in the dashboard wins over frontmatter
(`content-meta/overrides.json`, key `collection/lang/slug` or `static/<lang>/<page>`).
Give the English and Persian version the same `translationKey` (or link them in
the dashboard) to get hreflang plus the language switcher pointing at the right page.

### MDX components (work in progress)

`src/lib/mdx-components.ts` registers components every MDX page can use without
importing — `Callout`, `Card`, `Tabs`/`Tab`, `YouTube`, `AudioPlayer`,
`VideoPlayer`. Explicit imports of `@/components/…` are stripped at build time;
use the component names directly in the MDX body.

## Testing

- `npm test` runs the admin API tests (`admin/test/api.test.mjs`) with the Node
  built-in test runner.
- `python3 -m pytest` runs the deployment tests in `tests/test_deployment.py`.

## Build & Release

- `npm run build` type-checks and produces `dist/`; `npm run build:site` builds
  without type-checking (used by the admin release pipeline).
- Each admin build lands in `releases/<ts>` and is activated by flipping the
  `current` symlink only on success (see `deploy/`).
- Versioning follows `package.json` (`version`) and git tags (`v<version>`). The
  site ships no compiled binaries; release binaries are out of scope for this
  project.

## Deploy (Ubuntu + nginx)

`deploy/install.sh` (one-time), `deploy/nginx.conf`, `deploy/arman-admin.service`.
nginx serves `/opt/arman-hosseini/current`; the admin service runs
`npm run build:site` into a new release directory and flips the symlink only on
success (keeping the last 5).

## Troubleshooting

- **`astro check` can't find `node:fs`/`node:path`/`process`** — `@types/node` is
  missing from `devDependencies`; add it and reinstall.
- **Admin prints a password at first start** — that is the one-time bootstrap
  password; set `ADMIN_PASSWORD_HASH` afterwards to stop the prompt.
- **`deploy.sh` refuses to run** — `deploy.config.json` must not contain keys
  named `password`, `passphrase`, `privateKey`, `token` or `secret`; move them to
  `.env`.
- **`DEPLOY_SSH_PASSWORD` set but deployment fails** — `sshpass` must be on
  `PATH`, or switch to key auth via `identityFile`.
- **"Refusing to deploy an empty site"** — `dist/` is empty; build first.
- **A page is missing from the live site** — pages marked `draft` are skipped by
  the build unless a dashboard override changes their status.

## Security

scrypt password hashing · HttpOnly + SameSite=Strict session · CSRF header on
every write · login rate limit · plugin API only with a revocable bearer token
(stored hashed) · nothing goes live without approval · media must match its
SHA-256 name · strict CSP on the dashboard · `X-Robots-Tag: noindex` · atomic
file writes · only vault-origin files are ever deleted by ingest.

## Limitations

- The site is static: MDX has no client-side framework, so `onClick` and other
  runtime interactivity are not supported.
- A page and its translation share a `translationKey`; without one there is no
  language switcher or hreflang pair for that page.
- The admin service targets a single operator (one password, local data dir), not
  multi-user hosting.

## License

GPL-3.0-or-later — see [LICENSE](LICENSE).