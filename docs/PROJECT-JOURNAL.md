# Project journal — arman-hosseini.ir

Condensed from the planning conversation (`chat-export-*.json`) and the v2 rebuild.

## Goal
Own the search results for **«آرمان حسینی» / "Arman Hosseini"** in classic search (SEO), AI answer engines (AEO/GEO) and on LinkedIn/GitHub, and present the work honestly: Rust, Linux, networking/VPN, reverse engineering, local AI.

## Identity facts (single source: `src/data/site.ts`)
- Persian spelling is **آرمان** (not آرمین — fixed in v2; it matters for the exact-match query).
- GitHub `vergoboy` (real history) → migrating to Codeberg `vergoboy` (both linked via `sameAs`).
- Telegram `@the_vergoboy` (primary), Discord `the_vergoboy`, Mastodon `@the_vergoboy` (inactive, linked only).
- Email `hi@arman-hosseini.ir`, fallback `the.arman.hosseini@gmail.com`. LinkedIn is still thin — completing it is a to-do (it feeds the same entity).
- Brand mark: the penguin in `assets/Vargo/Export.svg`; palette in `assets/Vargo/palette.svg` (#07090F #252732 #7D7C7A #F5FBEF #F08700 #81171B).

## Decisions
| Topic | Decision | Why |
|---|---|---|
| Rendering | Astro, static output, no UI framework | Lowest load, cleanest HTML for crawlers |
| Look | CLI/terminal inspired, penguin mark, dark default + light | Chosen in the planning chat, now on the brand palette |
| Languages | `/en/` + `/fa/`, root `/` = language picker (x-default) | hreflang pairs via `translationKey` |
| Content | Obsidian → Vergo MDX Studio → Inbox (approval) → build | Write once in the vault; every page needs a human OK before it goes live |
| SEO data | Overrides in `content-meta/overrides.json`, not in notes | Survives every re-publish |
| Admin | Zero-dependency Node service, session + CSRF, scrypt | Nothing to patch, tiny attack surface |
| Analytics | Cookie-less beacon, daily-salted visitor hash, DNT respected | Page views / uniques / referrers without consent banners |
| Releases | Build into `releases/<ts>`, atomic symlink flip, rollback | A failed build can't take the site down |

## Open to-dos (not automated)
1. Add the real `og.png` per project/post in the dashboard (Images tab) with alt text.
2. Write the real journal posts; two starter drafts exist (`how-this-site-works`, en+fa).
3. Complete LinkedIn headline/About with the same wording as the `Quick answer` block.
4. Search Console — see checklist below.

## Search Console / indexing checklist
1. Add the **domain property** `arman-hosseini.ir` (DNS TXT verification); also verify in Bing Webmaster Tools (feeds several AI search products).
2. Submit `https://arman-hosseini.ir/sitemap.xml` (contains hreflang alternates and `lastmod`).
3. URL-inspect `/en/`, `/fa/`, one project and one post → "Request indexing".
4. After ~1 week: *Pages* report (look for "Duplicate, Google chose different canonical" and "Crawled – not indexed"), *Enhancements* (breadcrumbs, FAQ), *Core Web Vitals*.
5. Search `site:arman-hosseini.ir` and `"آرمان حسینی"` weekly; track impressions for the two name variants in *Performance ▸ Queries*.
6. Check `/llms.txt` and `/robots.txt` after every deploy (the dashboard's SEO health shows per-page problems).
7. Backlinks that move the entity: GitHub/Codeberg profile README and website field, LinkedIn website field, Telegram/Discord bios, Mastodon bio — all pointing at the same URL and name spelling.
