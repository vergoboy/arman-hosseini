/**
 * What MDX pages may contain. MDX can import modules and run JavaScript at build time, and this
 * service builds on the server — so only the site's own components are allowed. Line-preserving.
 * (Defence in depth, not a sandbox: every page still passes through a human approval.)
 */
export const BUILTIN_COMPONENTS = ['Callout', 'Card', 'Tabs', 'Tab', 'YouTube', 'AudioPlayer', 'VideoPlayer'];

/** Blank out code (fences + inline) but keep every newline so line numbers stay valid. */
function maskCode(text) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, blank).replace(/`[^`\n]*`/g, blank);
}

export function checkPolicy(source) {
  const fm = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
  const offset = fm ? fm[0].split('\n').length - 1 : 0;
  const body = maskCode(fm ? source.slice(fm[0].length) : source);
  const errors = [];
  const at = (index, message) => {
    const before = body.slice(0, index); const line = before.split('\n').length + offset;
    errors.push({ line, column: index - before.lastIndexOf('\n'), message });
  };

  const importRe = /^import\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm;
  for (const m of body.matchAll(importRe)) {
    if (!m[1].startsWith('@/components/')) at(m.index, `Imports are not allowed: "${m[1]}". Only the built-in components (${BUILTIN_COMPONENTS.join(', ')}) can be used, and they need no import.`);
  }
  for (const m of body.matchAll(/^export\s+(?:const|let|var|function|class|async|default|\{|\*)/gm)) at(m.index, '`export` is not allowed in site pages.');
  for (const m of body.matchAll(/<([A-Z][\w]*)(?:\.[\w.]+)?(?=[\s/>])/g)) {
    if (!BUILTIN_COMPONENTS.includes(m[1])) at(m.index, `Unknown component <${m[1]}>. Available: ${BUILTIN_COMPONENTS.map((c) => `<${c}>`).join(' ')}.`);
  }
  for (const m of body.matchAll(/\{[^}\n]*\b(process|require|globalThis|eval|fetch|Deno|Bun)\b[^}\n]*\}|\{[^}\n]*\bimport\s*\(/g)) at(m.index, 'This expression uses a server-side API (process / require / import() / fetch …), which is not allowed.');
  return errors.sort((a, b) => a.line - b.line || a.column - b.column);
}
