import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Source tree on one filesystem, releases on another (/tmp vs /dev/shm) — the production layout
// that broke with "EXDEV: cross-device link not permitted".
const site = await mkdtemp(path.join(tmpdir(), 'exdev-site-'));
const releases = await mkdtemp('/dev/shm/exdev-rel-');
const sameFs = (await stat(site)).dev === (await stat(releases)).dev;

await writeFile(path.join(site, 'fake-astro.mjs'), `
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
const out = process.env.ASTRO_OUT_DIR;
mkdirSync('.astro/.prerender/_astro', { recursive: true });
writeFileSync('.astro/.prerender/_astro/a.css', 'body{}');
mkdirSync(out + '/_astro', { recursive: true });
renameSync('.astro/.prerender/_astro/a.css', out + '/_astro/a.css'); // what Astro's ssrMoveAssets does
writeFileSync(out + '/index.html', '<html>ok</html>');
console.log('fake astro done');
`);
process.env.SITE_DIR = site; process.env.RELEASES_DIR = releases; process.env.CURRENT_LINK = path.join(site, 'current');
process.env.BUILD_CMD = 'node fake-astro.mjs';
const build = await import('../lib/build.mjs');

test('the sandbox really has two filesystems, and a plain rename between them fails', { skip: sameFs && 'same filesystem here' }, async () => {
  await writeFile(path.join(site, 'probe'), 'x');
  await assert.rejects(rename(path.join(site, 'probe'), path.join(releases, 'probe')), { code: 'EXDEV' });
});

test('a build whose releases directory is on another filesystem succeeds and goes live', async () => {
  await build.startBuild('exdev');
  for (let i = 0; i < 100 && build.isRunning(); i++) await new Promise((r) => setTimeout(r, 100));
  const b = (await build.listBuilds())[0];
  assert.equal(b.status, 'success', b.error + '\n' + (await build.buildLog(b.id)));
  const live = await realpath(path.join(site, 'current'));
  assert.ok(live.startsWith(await realpath(releases)), `symlink resolves into the releases dir (${live})`);
  assert.equal(await readFile(path.join(live, 'index.html'), 'utf8'), '<html>ok</html>');
  assert.equal(await readFile(path.join(live, '_astro/a.css'), 'utf8'), 'body{}');
  await assert.rejects(stat(path.join(site, '.build', b.id)), 'staging dir was cleaned up');
});

test('cleanup', async () => { await rm(releases, { recursive: true, force: true }); });
