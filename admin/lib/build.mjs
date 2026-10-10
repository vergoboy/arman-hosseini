import { spawn } from 'node:child_process';
import { appendFile, cp, mkdir, readdir, readFile, readlink, rename, rm, stat, symlink } from 'node:fs/promises';
import path from 'node:path';
import { BUILD_CMD, CURRENT_LINK, DATA_DIR, KEEP_RELEASES, RELEASES_DIR, SITE_DIR } from '../config.mjs';
import { audit, clearDirty } from './store.mjs';
import { HttpError, readJson, writeJson } from './util.mjs';

const logDir = path.join(DATA_DIR, 'builds');
/** Builds run inside the source tree: Astro moves files from <site>/.astro into the output dir with
 *  rename(), which fails with EXDEV when the output lives on another filesystem. */
const STAGE_DIR = path.join(SITE_DIR, '.build');
const metaFile = path.join(DATA_DIR, 'builds.json');
let running = null;
let pending = false;

export const isRunning = () => (running ? { id: running.id, startedAt: running.startedAt } : null);

async function loadMeta() { return readJson(metaFile, []); }
async function saveMeta(list) { await writeJson(metaFile, list.slice(0, 60)); }

export async function listBuilds() {
  const list = await loadMeta();
  const current = await currentRelease();
  return list.map((b) => ({ ...b, current: b.id === current }));
}

export async function currentRelease() {
  try { return path.basename(await readlink(CURRENT_LINK)); } catch { return null; }
}

export async function buildLog(id) {
  if (!/^\d{8}-\d{6}-?\w*$/.test(id)) throw new HttpError(400, 'bad id');
  try { return await readFile(path.join(logDir, `${id}.log`), 'utf8'); } catch { return ''; }
}

const stamp = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14).replace(/^(\d{8})(\d{6})$/, '$1-$2');

export async function startBuild(reason = 'manual') {
  if (running) { pending = true; return { id: running.id, queued: true }; }
  const id = stamp();
  const out = path.join(STAGE_DIR, id);
  const dest = path.join(RELEASES_DIR, id);
  await rm(STAGE_DIR, { recursive: true, force: true }); // leftovers of crashed builds
  await mkdir(logDir, { recursive: true }); await mkdir(RELEASES_DIR, { recursive: true });
  const startedAt = Date.now();
  running = { id, startedAt };
  const meta = { id, reason, status: 'running', startedAt, endedAt: null, pages: null, error: null };
  const list = await loadMeta(); list.unshift(meta); await saveMeta(list);
  const logFile = path.join(logDir, `${id}.log`);
  const log = (s) => appendFile(logFile, s).catch(() => {});
  await log(`$ ${BUILD_CMD}   (ASTRO_OUT_DIR=${out} → ${dest})\n`);

  const child = spawn('sh', ['-c', BUILD_CMD], { cwd: SITE_DIR, env: { ...process.env, ASTRO_OUT_DIR: out, NODE_ENV: 'production' } });
  const timer = setTimeout(() => child.kill('SIGKILL'), 15 * 60_000);
  child.stdout.on('data', (d) => log(d)); child.stderr.on('data', (d) => log(d));
  let spawnError = null;
  child.on('error', (e) => { spawnError = e.message; log(`spawn error: ${e.message}\n`); });
  child.on('close', async (code, signal) => {
    clearTimeout(timer);
    try {
      const ok = code === 0 && (await stat(path.join(out, 'index.html')).catch(() => null));
      meta.endedAt = Date.now();
      if (ok) {
        await moveToReleases(out, dest);
        await switchTo(id);
        meta.status = 'success'; meta.pages = await countPages(dest);
        await clearDirty(startedAt); await prune();
        await log(`\n✔ released ${id} (${meta.pages} pages)\n`);
      } else {
        meta.status = 'failed';
        meta.error = spawnError ? `could not start the build: ${spawnError}` : signal ? `killed by ${signal}${signal === 'SIGKILL' ? ' (out of memory or the 15-minute limit?)' : ''}` : code === 0 ? 'build finished but produced no index.html' : `exit code ${code}`;
        await rm(out, { recursive: true, force: true });
        const printed = (await readFile(logFile, 'utf8').catch(() => '')).split('\n').length > 3;
        if (!printed) await log('\n(the build command printed nothing — check `journalctl -u arman-admin -n 50` and that `npm run build:site` works in the site folder)\n');
        await log(`\n✖ build failed: ${meta.error}. The live site was not touched.\n`);
      }
      if (meta.status === 'failed') meta.tail = (await readFile(logFile, 'utf8').catch(() => '')).trim().split('\n').slice(-25).join('\n').slice(-3000);
      await audit('system', 'build', id, meta.status);
    } finally {
      const all = await loadMeta(); const i = all.findIndex((b) => b.id === id); if (i >= 0) all[i] = meta; await saveMeta(all);
      running = null;
      if (pending) { pending = false; startBuild('queued changes').catch(() => {}); }
    }
  });
  return { id, queued: false };
}

/** rename() when possible (same filesystem); otherwise copy next to the target and rename there. */
export async function moveToReleases(from, dest) {
  try { await rename(from, dest); return; } catch (e) { if (e.code !== 'EXDEV') throw e; }
  const tmp = `${dest}.partial`;
  await rm(tmp, { recursive: true, force: true });
  await cp(from, tmp, { recursive: true });
  await rename(tmp, dest);
  await rm(from, { recursive: true, force: true });
}

async function countPages(dir) {
  let n = 0;
  const walk = async (d) => { for (const e of await readdir(d, { withFileTypes: true })) { if (e.isDirectory()) await walk(path.join(d, e.name)); else if (e.name.endsWith('.html')) n++; } };
  await walk(dir).catch(() => {}); return n;
}

/** Atomic: create a new symlink beside the old one, then rename over it. */
export async function switchTo(id) {
  const target = path.join(RELEASES_DIR, id);
  await stat(target);
  const tmp = `${CURRENT_LINK}.next`;
  await rm(tmp, { force: true });
  await symlink(path.relative(path.dirname(CURRENT_LINK), target), tmp);
  await rename(tmp, CURRENT_LINK);
}

export async function rollback(id) {
  if (!/^\d{8}-\d{6}$/.test(id)) throw new HttpError(400, 'bad release id');
  await switchTo(id).catch(() => { throw new HttpError(404, 'release no longer exists'); });
  await audit('admin', 'rollback', id, '');
}

async function prune() {
  const keep = new Set([await currentRelease()]);
  const dirs = (await readdir(RELEASES_DIR).catch(() => [])).filter((n) => /^\d{8}-\d{6}$/.test(n)).sort().reverse();
  dirs.slice(0, KEEP_RELEASES).forEach((d) => keep.add(d));
  for (const d of dirs) if (!keep.has(d)) await rm(path.join(RELEASES_DIR, d), { recursive: true, force: true });
}
