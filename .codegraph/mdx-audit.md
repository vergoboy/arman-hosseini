# MDX Audit — how-this-site-works + zero-js-mdx-components

Audit dates: 2026-10-09. Scope: `src/content/journal/{en,fa}/how-this-site-works.mdx`
(update pass) and `src/content/journal/{en,fa}/zero-js-mdx-components.mdx` (new standalone
article published 2026-10-09), against the working tree that includes the built-in MDX
components and the admin policy validator.

Legend: ERROR = must fix before publish · WARNING = should review · INFO = note.

## SEO

| Check | Result | Evidence |
| --- | --- | --- |
| H1 count (rendered) | INFO — 1 | `rg -c "<h1" dist/en/journal/how-this-site-works/index.html` = 1 |
| H2 hierarchy | OK — 12 per page, no empty H2 | `rg -c "^## .*$"` = 12 on en, 12 on fa |
| Title | OK | `<title>` in built HTML matches frontmatter `seoTitle` |
| Description | OK | `<meta name="description">` present, non-repeating, topic-led |
| Canonical | OK | `https://arman-hosseini.ir/en/journal/how-this-site-works/` — matches the `/ {lang}/journal/{slug}/` route rule |
| Slug / URL | OK | file key `how-this-site-works` → `lang`-aware URL, verified 200 on dev server and present in `dist/` |
| Tags | OK — 5 relevant | Astro, SEO, AEO, Obsidian, Architecture (en); Persian equivalents (fa) |
| Author / E-E-A-T | INFO | Author is the site owner "Arman Hosseini" (person entity in JSON-LD); no invented credentials |
| Dates | OK/review | `date` 2026-10-08, `updated` 2026-10-09 (today, matches this update) |
| OpenGraph | OK | `property="og:image"` present; image is the site OG asset (appropriate for a site-architecture article) |
| Structured data | OK | `application/ld+json` present; article uses `TechArticle`; FAQ visible + `acceptedAnswer` present |
| Internal links | OK | live `<Card href="/en/projects">`; targets `dist//en/projects`, `/en/journal`, `/en/about` all exist |
| External references | OK — 4 | Astro docs, Tailwind CSS, Schema.org, Node.js — all primary/official; none fabricated |
| Image alt text | OK | both images have specific, non-duplicated descriptive alt |
| Image references | OK | paths `/images/docs/*.webp` exist in `public/` and `dist/` |

## AEO / Content

| Check | Result | Evidence |
| --- | --- | --- |
| Question-based H2s | OK | 8 question H2s (What is…, Why is…, How does…, How are…) |
| Direct answers | OK | every question H2 opens with a direct answer sentence |
| Definition blocks | OK | "It is a personal portfolio and journal…" defines the site up front |
| FAQ | OK — 6 real, answerable | added "Can MDX pages use arbitrary React or JSX components?"; rendered visibly + in JSON-LD |
| Entity consistency | OK | "arman-hosseini.ir" used consistently; "Vergo MDX Studio" named once |
| Accuracy gate | OK | every claim about the admin/Studio pipeline re-verified against `admin/server.mjs`, `submissions.mjs`, `policy.mjs`, `astro.config.mjs` (see gate evidence) |
| Media placeholders | OK | `{/* MEDIA: … */}` markers in both language pages, matching `.codegraph/mdx-media-plan.md` IDs |

## MDX / Build validation

| Check | Result | Evidence |
| --- | --- | --- |
| Frontmatter schema | OK | `astro check` = 0 errors |
| Compiles (admin gate) | OK | `checkMdx` compile — run via `npm test` fixtures and full `npm run build` |
| Policy (admin gate) | OK | direct run of `checkPolicy` on both sources = 0 errors each |
| JSX/组件 syntax | OK | live `<Callout>/<Card>/<Tabs>/<Tab>` render in `dist/` (`role="note"`, `details`/`summary`, "Publishing pipeline") |
| MDX comment syntax | INFO — fixed during pass | HTML `<!-- … -->` comments were rejected by the MDX compiler at 36:1; replaced with `{/* … */}` |
| Build | OK | `npm run build` exit 0; `astro check` 0 errors; dist contains both article pages |
| Tests | OK | `npm test` 9/9 pass |

## Not applicable / omitted with reason

- **Benchmarks / performance numbers**: no benchmark evidence exists; none claimed.
- **Video embedding**: recommended in media plan; no fabricated file referenced.
- **Testimonials / comparisons**: none.
- **Roadmap**: no authoritative roadmap file; omitted.

## zero-js-mdx-components — new standalone article (2026-10-09)

New files: `src/content/journal/en/zero-js-mdx-components.mdx` and
`src/content/journal/fa/zero-js-mdx-components.mdx` (shared `translationKey`,
slug `zero-js-mdx-components`, URL `/{lang}/journal/zero-js-mdx-components/`).
Topic: the six built-in zero-JS MDX components (Callout, Card, Tabs/Tab, YouTube,
AudioPlayer, VideoPlayer) — implementation and authoring rules, grounded in
`src/lib/mdx-components.ts`, the component sources, `admin/lib/policy.mjs` and
the `astro.config.mjs` import-strip plugin.

| Check | Result | Evidence |
| --- | --- | --- |
| New standalone file (not an update) | OK | both files added, untouched pre-existing pages |
| H1 count (rendered) | OK — 1 | `rg -c "<h1"` on `dist/en/journal/zero-js-mdx-components/index.html` = 1 |
| Heading hierarchy | OK — 10 H2 per page, no empty H2 | `rg -c "^## "` = 10 en, 10 fa |
| Question-based H2 | OK — 7 of 10 H2s are real user questions | "How do tabs work without JavaScript?", "How can a static site play audio and video?", etc. |
| Direct answers | OK | every question H2 opens with a direct answer sentence |
| Title / description / canonical | OK | `<title>` = seoTitle; canonical `https://arman-hosseini.ir/en/journal/zero-js-mdx-components/` matches the route rule |
| FAQ (visible + schema) | OK — 3 | rendered visibly; `application/ld+json` present with `acceptedAnswer` |
| Tags | OK — 4 relevant | MDX, Astro, HTML, Media (fa: رسانه) |
| Internal links | OK | `<Card href="/en/journal/how-this-site-works">`; target exists in `dist/` (en + fa) |
| External references | OK — 6 | MDX docs, Astro guide, MDN details/audio/video, plus an internal related-page link; all primary sources |
| Image identity | OK | alt "The Tabs, Callout and Card components rendered inside an MDX article"; asset `public/images/docs/zerojs-demo.webp` exists and is copied into `dist/images/docs/` |
| Media markers match plan | OK | `{/* MEDIA: screenshot-zerojs-demo */}` in both pages matches `.codegraph/mdx-media-plan.md` ID |
| Compiles (admin gate) | OK | `checkPolicy` direct run: en 0 errors, fa 0 errors |
| Build | OK | `npm run build` exit 0, `astro check` 0 errors; both pages in `dist/` |
| Tests | OK | `npm test` 9/9 pass |
| Audit mode | INFO | output is a full article, not a template/placeholder; audio/video shown as code examples (no `public/media/` files exist) — tracked in the media plan as an optional live-demo task |

## Final verdict

PASS (update + new article). All ERROR-level checks pass for both articles. The
WARNING-class observations — review `updated` freshness policy, capture an authenticated
admin Inbox screenshot, and optionally add license-clean sample audio/video for live
`AudioPlayer`/`VideoPlayer` demos — are tracked in `mdx-media-plan.md`.