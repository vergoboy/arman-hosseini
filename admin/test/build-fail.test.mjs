import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(tmpdir(), 'build-fail-'));
process.env.SITE_DIR = root;
process.env.BUILD_CMD = 'if [ -n "$SILENT" ]; then exit 1; fi; echo "boom: cannot resolve @/x" >&2; exit 3';
const build = await import('../lib/build.mjs');

const waitDone = async () => { for (let i = 0; i < 100; i++) { if (!build.isRunning()) return; await new Promise((r) => setTimeout(r, 50)); } };

test('a failing build records the exit code and the output tail, and leaves the live site alone', async () => {
  await build.startBuild('test'); await waitDone();
  const b = (await build.listBuilds())[0];
  assert.equal(b.status, 'failed'); assert.equal(b.error, 'exit code 3'); assert.match(b.tail, /boom: cannot resolve/);
  assert.match(await build.buildLog(b.id), /build failed: exit code 3/);
  await assert.rejects(lstat(path.join(root, 'current')), 'no symlink was created');
});

test('a build that prints nothing says so instead of leaving an empty log', async () => {
  process.env.SILENT = '1';
  await new Promise((r) => setTimeout(r, 1100)); // distinct release id (seconds resolution)
  await build.startBuild('silent'); await waitDone();
  const b = (await build.listBuilds())[0];
  assert.equal(b.error, 'exit code 1');
  assert.match(await build.buildLog(b.id), /printed nothing/);
});
