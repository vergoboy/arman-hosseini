# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-10-08

The current release: the site rebuilt as a bilingual Astro content project with
a zero-dependency admin dashboard and an Obsidian publishing pipeline.

### Added

- Bilingual static site (English + Persian with RTL), built with Astro 7 and
  Tailwind 4 and no client-side framework.
- Zero-dependency Node admin service (`admin/`) with pages table, SEO editor,
  media library, approval Inbox, tokens, audit log, backups and a Ctrl+K palette.
- Obsidian publishing pipeline (Vergo MDX Studio): MDX compiled on the server,
  media staged and SHA-256 checked, pages held in an inbox until approved.
- SEO/AEO layer (`src/lib/seo.ts`): per-page metadata, Open Graph + Twitter
  cards, JSON-LD `@graph`, quick-answer blocks, FAQ sections, reading time and TOC.
- Generated `sitemap.xml` (hreflang + lastmod), `robots.txt`, `llms.txt`,
  per-language RSS and a web manifest.
- Built-in MDX components: `Callout`, `Card`, `Tabs`/`Tab`, `YouTube`,
  `AudioPlayer`, `VideoPlayer`.
- Atomic release deploys: each build lands in `releases/<ts>` and the `current`
  symlink is flipped only on success (keeps the last 5).

### Security

- scrypt password hashing, HttpOnly + SameSite=Strict sessions, CSRF header on
  every write, login rate limiting and a strict dashboard CSP.
- Revocable bearer tokens for the plugin API (stored hashed); nothing goes live
  without approval and media must match its SHA-256 name.
- `deploy.config.json` is refused if it contains secrets; everything secret lives
  in the git-ignored `.env`.
