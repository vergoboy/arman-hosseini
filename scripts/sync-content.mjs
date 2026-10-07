#!/usr/bin/env node
/**
 * Mirror the publishable folders of the Obsidian vault into Astro content collections.
 *
 *   vault `project/{en,fa}`  →  src/content/projects/{en,fa}
 *   vault `journal/{en,fa}`  →  src/content/journal/{en,fa}
 *
 * Why a copy rather than symlinks or a custom loader: Astro's content layer keys its cache
 * off file paths and content hashes, symlinks confuse watch/bundler resolution, and a plain
 * copy keeps the vault (git-synced by FIT) and the site independently buildable.
 *
 * Extension is preserved — `.mdx` stays `.mdx` and gets the MDX pipeline, while `.md`
 * stays `.md` so a plain note containing `{` or `<Tag>` cannot be misparsed as MDX.
 *
 * Frontmatter is normalised by *editing lines in place*, never by a YAML round-trip, so an
 * author's own formatting, comments and key order survive untouched. Only four keys are
 * managed, all required by the Zod schemas in src/content.config.ts:
 *
 *   title  from frontmatter, else the file name
 *   date   from frontmatter, else the file's mtime
 *   lang   forced to the folder it lives in (a note filed under the wrong language is fixed,
 *          not silently mis-labelled)
 *   slug   derived from the file name so URLs are stable and visible in the note itself
 *
 * Usage:
 *   node scripts/sync-content.mjs [--vault <path>] [--check] [--quiet]
 *
 *   --vault <path>  Vault root (default: $OBSIDIAN_VAULT, else the path below)
 *   --check         Report drift and exit non-zero without writing (CI-friendly)
 *   --quiet         Only log warnings and the final summary
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Vault root. Override with `--vault` or `OBSIDIAN_VAULT` — see README ▸ Editing content. */
const DEFAULT_VAULT = '/home/arman/Documents/obsidian/arman/arman-hosseini';

const LANGUAGES = ['en', 'fa'];

/** vault subfolder → collection directory, relative to the project root. */
const MAPPINGS = [
  { source: 'project', target: 'src/content/projects' },
  { source: 'journal', target: 'src/content/journal' },
];

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);

const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const log = (...args) => console.log(...args);

/**
 * URL-safe slug: lowercase, whitespace and punctuation collapsed to single hyphens, with
 * Unicode letters and digits kept so Persian file names (`برنامه هفتگی`) survive instead of
 * collapsing to nothing. Returns `''` for a name with no letters or digits at all.
 */
export function slugify(name) {
  const slug = name
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug;
}

/** `2026-10-07` in local time — the `date` frontmatter format Obsidian users expect. */
function formatDate(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Stable fallback for a file whose name yields no usable slug. */
function hashSlug(relativePath) {
  return `note-${createHash('sha1').update(relativePath).digest('hex').slice(0, 8)}`;
}

/**
 * Ensure the managed frontmatter keys are present and correct.
 *
 * Existing top-level keys are rewritten in place and missing ones are appended at the end
 * of the block, so an author's own key order is never disturbed; a file with no
 * frontmatter block at all gets one built in the canonical order. Everything else in the
 * note — body, other keys, comments, ordering — is returned untouched.
 *
 * @returns {{ content: string, changed: boolean, title: string, slug: string }}
 */
function ensureFrontmatter(source, { lang, fileSlug, fileTitle, fileDate }) {
  const match = FRONTMATTER_RE.exec(source);
  const body = match ? source.slice(match[0].length) : source;
  const lines = match ? match[1].split(/\r?\n/) : [];

  // Values as they should end up, in the order a newly-added key lands at the top.
  const desired = [
    ['title', JSON.stringify(readExisting(lines, 'title')?.replace(/^["']|["']$/g, '') || fileTitle)],
    ['date', readExisting(lines, 'date') || formatDate(fileDate)],
    ['lang', lang],
    ['tags', readExisting(lines, 'tags') || '[]'],
    ['slug', readExisting(lines, 'slug') || fileSlug],
  ];

  const next = [...lines];
  const toInsert = [];
  let changed = !match;

  for (const [key, value] of desired) {
    const rendered = `${key}: ${value}`;
    const index = next.findIndex((line) => new RegExp(`^${key}\\s*:`).test(line));
    if (index === -1) {
      toInsert.push(rendered);
      changed = true;
    } else if (next[index] !== rendered) {
      next[index] = rendered;
      changed = true;
    }
  }

  const block = [...next, ...toInsert].join('\n');
  const content = `---\n${block}\n---\n${match ? body : `\n${body.replace(/^\s*\n/, '')}`}`;

  return {
    content,
    changed: changed || !match,
    title: desired[0][1],
    slug: desired[4][1],
  };
}

/** Raw value of a top-level `key:` line, or null when the key is absent or empty. */
function readExisting(lines, key) {
  const re = new RegExp(`^${key}\\s*:\\s*(.*)$`);
  for (const line of lines) {
    const found = re.exec(line);
    if (found) return found[1].trim() || null;
  }
  return null;
}

/** Every markdown file under `dir`, recursively, skipping dotfiles and Obsidian internals. */
async function collectMarkdownFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectMarkdownFiles(full)));
    } else if (entry.isFile() && MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Planned target state for one mapping + language pair.
 *
 * Targets keep the language as a path segment (`src/content/projects/en/vegord.mdx`), which
 * is what makes the collection id `<lang>/<slug>` and keeps the two languages from
 * colliding on the same file name.
 */
async function planLanguage(vaultDir, targetDir, lang) {
  const sourceDir = path.join(vaultDir, lang);
  const languageDir = path.join(targetDir, lang);
  if (!existsSync(sourceDir)) return { files: new Map(), languageDir, missing: sourceDir };

  const files = new Map();
  for (const sourcePath of await collectMarkdownFiles(sourceDir)) {
    const relative = path.join(lang, path.relative(sourceDir, sourcePath));
    const info = await stat(sourcePath);
    const extension = path.extname(sourcePath).toLowerCase();
    const baseName = path.basename(sourcePath, extension);
    let slug = slugify(baseName) || hashSlug(path.relative(vaultDir, sourcePath));

    const raw = await readFile(sourcePath, 'utf8');
    const normalised = ensureFrontmatter(raw, {
      lang,
      fileSlug: slug,
      fileTitle: baseName,
      fileDate: info.mtime,
    });
    slug = normalised.slug;

    const targetPath = path.join(targetDir, relative);
    files.set(targetPath, { content: normalised.content, sourcePath, slug });
  }
  return { files, languageDir, missing: null };
}

async function writeTargets(files, languageDir, { check, quiet }) {
  let written = 0;
  let unchanged = 0;
  const stale = [];

  for (const [targetPath, { content, slug }] of files) {
    const existing = existsSync(targetPath) ? await readFile(targetPath, 'utf8') : null;
    if (existing === content) {
      unchanged += 1;
      continue;
    }
    if (!check) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, content, 'utf8');
    }
    written += 1;
    if (!quiet) {
      const rel = path.relative(PROJECT_ROOT, targetPath);
      log(`  ${existing === null ? 'add   ' : 'update'} ${rel}  (/${slug}/)`);
    }
  }

  // Prune files this run did not produce — a note deleted (or renamed) in the vault must
  // stop being published. Scoped to the language directory being synced, so only markdown
  // is ever removed and .gitkeep survives.
  if (existsSync(languageDir)) {
    for (const file of await collectMarkdownFiles(languageDir)) {
      if (files.has(file)) continue;
      stale.push(file);
      if (!check) await rm(file);
    }
  }

  return { written, unchanged, stale };
}

function parseArgs(argv) {
  const options = {
    vault: process.env.OBSIDIAN_VAULT || DEFAULT_VAULT,
    check: false,
    quiet: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--vault') {
      options.vault = argv[index + 1];
      index += 1;
    } else if (arg === '--check') {
      options.check = true;
    } else if (arg === '--quiet') {
      options.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      log(readFileSyncHelp());
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg} (try --help)`);
    }
  }
  if (!options.vault) throw new Error('--vault requires a path');
  return options;
}

function readFileSyncHelp() {
  return [
    'Usage: node scripts/sync-content.mjs [--vault <path>] [--check] [--quiet]',
    '',
    `  --vault <path>  Vault root (default: $OBSIDIAN_VAULT, else ${DEFAULT_VAULT})`,
    '  --check         Report drift and exit non-zero without writing',
    '  --quiet         Only log warnings and the final summary',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const vaultDir = path.resolve(options.vault);

  if (!existsSync(vaultDir)) {
    throw new Error(
      `Vault not found at ${vaultDir}. Set --vault or $OBSIDIAN_VAULT to the folder that ` +
        'contains project/ and journal/.'
    );
  }

  if (!options.quiet) log(`Syncing content from ${vaultDir}`);

  let written = 0;
  let unchanged = 0;
  let staleCount = 0;
  const missingFolders = [];

  for (const mapping of MAPPINGS) {
    const targetDir = path.join(PROJECT_ROOT, mapping.target);
    for (const lang of LANGUAGES) {
      const { files, languageDir, missing } = await planLanguage(
        path.join(vaultDir, mapping.source),
        targetDir,
        lang
      );
      if (missing) {
        missingFolders.push(path.relative(vaultDir, missing));
        continue;
      }
      if (!options.quiet) log(`${mapping.source}/${lang} → ${mapping.target}/${lang} (${files.size} file(s))`);
      const result = await writeTargets(files, languageDir, options);
      written += result.written;
      unchanged += result.unchanged;
      staleCount += result.stale.length;
    }
  }

  // Every mapped folder lives under the vault root, so the directories exist as soon as the
  // vault is created. A missing one is almost always a typo'd --vault, not an empty vault.
  if (missingFolders.length > 0) {
    throw new Error(
      `No such folder(s) under the vault: ${missingFolders.join(', ')}. ` +
        'Expected project/{en,fa} and journal/{en,fa} inside the vault root.'
    );
  }

  const summary = `${written} file(s) to ${options.check ? 'sync (not written)' : 'write'}, ${unchanged} unchanged, ${staleCount} stale`;
  if (options.check && written > 0) {
    log(`Content is out of date: ${summary}. Run: npm run sync:content`);
    process.exit(1);
  }
  log(`OK — ${summary}.`);
}

// Only run when invoked directly, so the slug/frontmatter helpers stay importable in tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`sync-content failed: ${error.message}`);
    process.exit(1);
  });
}

export { ensureFrontmatter, planLanguage };
