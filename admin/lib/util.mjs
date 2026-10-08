import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, rename, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const scrypt = promisify(_scrypt);

export const sha256 = (data) => createHash('sha256').update(data).digest('hex');
export const rand = (n = 24) => randomBytes(n).toString('base64url');

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const key = await scrypt(password, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt}$${key.toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, n, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const key = await scrypt(password, salt, 32, { N: Number(n), r: 8, p: 1 });
  const want = Buffer.from(hash, 'base64url');
  return key.length === want.length && timingSafeEqual(key, want);
}

export const hmac = (secret, data) => createHmac('sha256', secret).update(data).digest('base64url');
export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Write via temp file + rename so a crash never leaves a half-written file. */
export async function writeAtomic(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

export async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}
export const writeJson = (file, value) => writeAtomic(file, JSON.stringify(value, null, 2) + '\n');

export class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

/** Tiny fixed-window rate limiter keyed by string. */
export function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const rec = hits.get(key);
    if (!rec || now - rec.t > windowMs) { hits.set(key, { t: now, n: 1 }); return true; }
    rec.n += 1;
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > windowMs) hits.delete(k);
    return rec.n <= max;
  };
}
