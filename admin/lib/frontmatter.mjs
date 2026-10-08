/**
 * Tolerant top-level frontmatter reader/writer. It understands the subset vault notes use
 * (scalars, inline arrays, block lists of scalars) and keeps everything else as raw text, so
 * nothing the author wrote is lost. Writing emits JSON values, which are valid YAML.
 */
const FM = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export function splitFrontmatter(src) {
  const m = FM.exec(src);
  return m ? { raw: m[1], body: src.slice(m[0].length), has: true } : { raw: '', body: src, has: false };
}

function scalar(v) {
  const s = v.trim();
  if (s === '') return '';
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.startsWith('"') || s.startsWith('[') || s.startsWith('{')) {
    try { return JSON.parse(s); } catch { /* fall through */ }
  }
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (s.startsWith('[') && s.endsWith(']')) {
    return s.slice(1, -1).split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  return s;
}

export function parseFrontmatter(src) {
  const { raw, body, has } = splitFrontmatter(src);
  const data = {};
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const [, key, rest] = m;
    if (rest === '') {
      const items = [];
      let j = i + 1;
      while (j < lines.length && (/^\s*-\s/.test(lines[j]) || /^\s+\S/.test(lines[j]))) {
        const li = /^\s*-\s+(.*)$/.exec(lines[j]);
        if (li) items.push(scalar(li[1]));
        j++;
      }
      data[key] = items;
      i = j - 1;
    } else data[key] = scalar(rest);
  }
  return { data, body, has, raw };
}

function blockEnd(lines, idx) {
  let end = idx + 1;
  while (end < lines.length && (/^\s+\S/.test(lines[end]) || /^\s*-\s/.test(lines[end]))) end++;
  return end;
}

/** Set (or remove with `undefined`) top-level keys line by line, leaving the rest untouched. */
export function setKeys(src, updates) {
  const { raw, body, has } = splitFrontmatter(src);
  const lines = has ? raw.split(/\r?\n/) : [];
  for (const [key, value] of Object.entries(updates)) {
    const idx = lines.findIndex((l) => new RegExp(`^${key}\\s*:`).test(l));
    if (value === undefined) {
      if (idx !== -1) lines.splice(idx, blockEnd(lines, idx) - idx);
      continue;
    }
    const rendered = `${key}: ${JSON.stringify(value)}`;
    if (idx === -1) lines.push(rendered);
    else lines.splice(idx, blockEnd(lines, idx) - idx, rendered);
  }
  return `---\n${lines.join('\n')}\n---\n${has ? body : '\n' + body.replace(/^\s*\n/, '')}`;
}

export function buildDocument(data, body) {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\s+/, '')}${body.endsWith('\n') ? '' : '\n'}`;
}

export const slugify = (name) =>
  name.normalize('NFC').toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
