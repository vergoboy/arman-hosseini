import path from 'node:path';
import { DATA_DIR } from '../config.mjs';
import { readJson, sha256, writeJson } from './util.mjs';

const file = path.join(DATA_DIR, 'stats.json');
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|python-requests|curl|wget|monitor|lighthouse/i;
const today = () => new Date().toISOString().slice(0, 10);

let days = {};      // date -> { views, uv, visitors:{hash:1}, paths:{p:{v,u}}, refs:{host:n}, langs:{} }
let dirty = false;
let salt = '';

export async function initStats(secret) {
  salt = secret;
  days = await readJson(file, {});
  for (const [d, rec] of Object.entries(days)) if (d !== today() && rec.visitors) { rec.uv = Object.keys(rec.visitors).length; delete rec.visitors; }
  setInterval(flush, 30_000).unref();
}
export async function flush() { if (dirty) { dirty = false; await writeJson(file, days); } }

function cleanPath(p) {
  if (typeof p !== 'string' || p[0] !== '/' || p.length > 200) return null;
  const clean = p.split(/[?#]/)[0].replace(/\/+/g, '/');
  if (/^\/(admin|api)(\/|$)/.test(clean)) return null;
  return clean.endsWith('/') || clean.includes('.') ? clean : `${clean}/`;
}
function refHost(r, selfHost) {
  try { const h = new URL(r).hostname.replace(/^www\./, ''); return h === selfHost ? '' : h.slice(0, 80); } catch { return ''; }
}

export function record({ p, r }, ip, ua, selfHost = 'arman-hosseini.ir') {
  if (BOT.test(ua || '')) return false;
  const pathname = cleanPath(p); if (!pathname) return false;
  const day = (days[today()] ??= { views: 0, uv: 0, visitors: {}, paths: {}, refs: {}, langs: {} });
  day.visitors ??= {};
  const vid = sha256(`${salt}|${today()}|${ip}|${ua}`).slice(0, 12);
  const newVisitor = !day.visitors[vid]; day.visitors[vid] = 1;
  day.views += 1; if (newVisitor) day.uv += 1;
  const rec = (day.paths[pathname] ??= { v: 0, u: 0, seen: {} });
  rec.v += 1; if (!rec.seen[vid]) { rec.seen[vid] = 1; rec.u += 1; }
  const host = refHost(r || '', selfHost); if (host) day.refs[host] = (day.refs[host] ?? 0) + 1;
  const lang = /^\/(en|fa)\//.exec(pathname)?.[1]; if (lang) day.langs[lang] = (day.langs[lang] ?? 0) + 1;
  dirty = true; return true;
}

export function summary(rangeDays = 30) {
  const dates = [...Array(rangeDays)].map((_, i) => new Date(Date.now() - (rangeDays - 1 - i) * 864e5).toISOString().slice(0, 10));
  const series = dates.map((d) => ({ date: d, views: days[d]?.views ?? 0, visitors: days[d]?.uv ?? 0 }));
  const paths = {}, refs = {}, langs = {};
  for (const d of dates) {
    const rec = days[d]; if (!rec) continue;
    for (const [p, v] of Object.entries(rec.paths)) { paths[p] ??= { views: 0, visitors: 0 }; paths[p].views += v.v; paths[p].visitors += v.u; }
    for (const [h, n] of Object.entries(rec.refs)) refs[h] = (refs[h] ?? 0) + n;
    for (const [l, n] of Object.entries(rec.langs)) langs[l] = (langs[l] ?? 0) + n;
  }
  const top = (o, n = 10, f = (k, v) => ({ key: k, value: v })) => Object.entries(o).sort((a, b) => (b[1].views ?? b[1]) - (a[1].views ?? a[1])).slice(0, n).map(([k, v]) => f(k, v));
  return {
    totals: { views: series.reduce((n, s) => n + s.views, 0), visitors: series.reduce((n, s) => n + s.visitors, 0), today: days[today()]?.views ?? 0 },
    series, langs, pathViews: Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, v.views])),
    topPages: top(paths, 15, (k, v) => ({ path: k, ...v })),
    referrers: top(refs, 10),
  };
}
export const viewsByPath = (rangeDays = 30) => summary(rangeDays).pathViews;
