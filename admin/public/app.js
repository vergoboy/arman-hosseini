import { S, ISSUES } from './i18n.js';

/* ---------- tiny helpers ---------- */
let L = localStorage.getItem('adm-lang') || 'fa';
const t = (k) => S[L][k] ?? S.en[k] ?? k;
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(9)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
};
const _append = Element.prototype.append;
Element.prototype.append = function (...n) { return _append.apply(this, n.flat(9).filter((x) => x != null && x !== false)); };
const $app = document.getElementById('app');
let csrf = '', me = null;

async function api(method, path, body, raw) {
  const res = await fetch(path, { method, headers: { ...(raw ? {} : { 'content-type': 'application/json' }), 'x-csrf': csrf }, body: raw ? body : body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login' && path !== '/api/me') { me = null; renderRoot(); throw new Error('login'); }
  if (!res.ok) { const e = new Error(data.error || res.statusText); e.data = data; throw e; }
  return data;
}
function toast(msg, err) {
  let box = document.querySelector('.toasts'); if (!box) { box = h('div', { class: 'toasts' }); document.body.append(box); }
  const el = h('div', { class: 'toast' + (err ? ' err' : '') }, msg); box.append(el); setTimeout(() => el.remove(), 3800);
}
const fail = (e) => e.message !== 'login' && toast(e.message + (e.data?.errors ? ' — ' + e.data.errors.map((x) => `${x.path}${x.line ? ':' + x.line : ''} ${x.message}`).join(' | ') : ''), true);
const num = (n) => new Intl.NumberFormat(L === 'fa' ? 'fa-IR' : 'en').format(n);
const when = (ms) => new Date(ms).toLocaleString(L === 'fa' ? 'fa-IR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const scoreCls = (n) => (n >= 85 ? 'g' : n >= 60 ? 'y' : 'r');
const Score = (n) => h('span', { class: 'score ' + scoreCls(n) }, num(n));
const Badge = (txt, cls = '') => h('span', { class: 'badge ' + cls }, txt);
const statusBadge = (s) => Badge(t(s), s === 'published' ? 'ok' : s === 'draft' ? 'warn' : 'err');

/* ---------- state ---------- */
const st = { view: 'pages', overview: null, entries: [], q: '', fCol: '', fLang: '', fStatus: '', sel: new Set(), drawer: null, builds: null };
const NAV = [['overview', '◧'], ['pages', '▤'], ['inbox', '✉'], ['media', '▣'], ['analytics', '◔'], ['builds', '⇪'], ['settings', '⚙']];

async function load(force = true) {
  const [entries, overview] = await Promise.all([api('GET', '/api/entries'), api('GET', '/api/overview')]);
  st.entries = entries; st.overview = overview; if (force) renderMain();
  renderTop();
}

/* ---------- root / login ---------- */
async function renderRoot() {
  $app.replaceChildren();
  document.documentElement.lang = L; document.documentElement.dir = L === 'fa' ? 'rtl' : 'ltr';
  if (!me) {
    try { me = await api('GET', '/api/me'); csrf = me.csrf; } catch { me = null; }
  }
  if (!me) return renderLogin();
  $app.append(h('div', { class: 'shell' },
    h('aside', { class: 'side' },
      h('div', { class: 'brand' }, h('img', { src: '/admin/favicon.svg', alt: '' }), h('span', {}, 'Vergo Admin')),
      NAV.map(([k, ic]) => h('button', { class: 'nav' + (st.view === k ? ' on' : ''), 'data-v': k, onclick: () => go(k) }, h('span', {}, ic), t(k), k === 'builds' ? h('span', { class: 'badge ac pending', id: 'navpend' }) : null, k === 'inbox' ? h('span', { class: 'badge ac pending', id: 'navinbox' }) : null)),
      h('div', { class: 'sp' }),
      h('button', { class: 'nav', onclick: () => { document.documentElement.classList.toggle('light'); localStorage.setItem('adm-theme', document.documentElement.classList.contains('light') ? 'light' : 'dark'); } }, h('span', {}, '◐'), t('theme')),
      h('button', { class: 'nav', onclick: () => { L = L === 'fa' ? 'en' : 'fa'; localStorage.setItem('adm-lang', L); renderRoot(); } }, h('span', {}, '文'), L === 'fa' ? 'English' : 'فارسی'),
      h('button', { class: 'nav', onclick: async () => { await api('POST', '/api/logout'); me = null; renderRoot(); } }, h('span', {}, '⏻'), t('logout'))),
    h('div', { class: 'main' }, h('div', { class: 'top', id: 'top' }), h('div', { class: 'page', id: 'page' }))));
  await load();
}

function renderLogin() {
  const pw = h('input', { type: 'password', placeholder: t('password'), autocomplete: 'current-password', autofocus: true });
  const err = h('div', { class: 'hint', style: 'color:var(--red);min-height:20px' });
  const go = async (e) => {
    e.preventDefault();
    try { await api('POST', '/api/login', { password: pw.value }); me = null; renderRoot(); } catch (x) { err.textContent = x.message; }
  };
  $app.append(h('div', { class: 'login' }, h('form', { onsubmit: go }, h('img', { src: '/admin/favicon.svg', alt: '' }), h('h1', { style: 'margin:0;font-size:20px' }, t('login')), pw, err, h('button', { class: 'btn pri', style: 'justify-content:center' }, t('enter')))));
}

function go(v) { st.view = v; document.querySelectorAll('.nav[data-v]').forEach((n) => n.classList.toggle('on', n.dataset.v === v)); renderMain(); renderTop(); }

/* ---------- top bar ---------- */
function renderTop() {
  const top = document.getElementById('top'); if (!top || !st.overview) return;
  const { state, running } = st.overview;
  const dirty = state.dirty;
  const ib = document.getElementById('navinbox'); if (ib) { ib.textContent = num(st.overview.pending || 0); ib.classList.toggle('on', (st.overview.pending || 0) > 0); }
  const nav = document.getElementById('navpend'); if (nav) { nav.textContent = num(dirty); nav.classList.toggle('on', dirty > 0); }
  top.replaceChildren(
    h('h1', {}, t(st.view)),
    h('span', { class: 'hint' }, running ? t('publishing') : dirty ? `${num(dirty)} ${t('pending')}` : t('allPublished')),
    h('button', { class: 'btn', onclick: openCmdk, title: 'Ctrl+K' }, '⌕ ', h('kbd', {}, 'Ctrl K')),
    h('button', { class: 'btn pri', disabled: !!running, onclick: publish }, running ? '⟳ ' + t('publishing') : '⇪ ' + t('publish')));
}
async function publish() {
  try { await api('POST', '/api/build'); toast(t('publishing')); pollBuild(); } catch (e) { fail(e); }
}
let polling = false;
async function pollBuild() {
  if (polling) return; polling = true;
  try {
    for (let i = 0; i < 400; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const o = await api('GET', '/api/overview'); st.overview = o; renderTop();
      if (st.view === 'builds') renderMain();
      if (!o.running) { toast(o.builds[0]?.status === 'success' ? '✔ ' + t('success') : '✖ ' + t('failed'), o.builds[0]?.status !== 'success'); await load(); break; }
    }
  } finally { polling = false; }
}

function renderMain() {
  const page = document.getElementById('page'); if (!page) return;
  const fn = { overview: vOverview, pages: vPages, inbox: vInbox, media: vMedia, analytics: vAnalytics, builds: vBuilds, settings: vSettings }[st.view];
  page.replaceChildren(); Promise.resolve(fn(page)).catch(fail);
}

/* ---------- overview ---------- */
function vOverview(page) {
  const o = st.overview; if (!o) return;
  const s = o.stats;
  page.append(
    o.pending ? h('div', { class: 'card', style: 'margin-bottom:14px;border-color:var(--ac);cursor:pointer;display:flex;gap:10px;align-items:center', onclick: () => go('inbox') }, '✉', h('b', {}, t('needsReview')), Badge(num(o.pending), 'ac')) : null,
    h('div', { class: 'grid g4' },
      stat(num(o.counts.published) + ' / ' + num(o.counts.total), t('total')),
      stat(num(s.totals.views), t('last30').replace('۳۰', '۱۴').replace('30', '14')),
      stat(num(s.totals.visitors), t('visitors')),
      h('div', { class: 'card stat' }, h('b', { style: `color:var(--${o.seo.average >= 85 ? 'grn' : o.seo.average >= 60 ? 'yel' : 'red'})` }, num(o.seo.average)), h('span', {}, t('health')))),
    h('div', { class: 'grid g2', style: 'margin-top:14px' },
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, t('worst')),
        o.seo.worst.length ? o.seo.worst.map((w) => h('div', { class: 'issue', style: 'cursor:pointer;align-items:center', onclick: () => openEditor(w.key) }, Score(w.score), h('span', {}, w.title), Badge(w.lang.toUpperCase()))) : h('div', { class: 'empty' }, t('noIssues'))),
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, t('health')),
        Object.entries(o.seo.issues).sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([code, v]) => h('div', { class: 'issue' }, h('span', { class: 'dot ' + v.level }), h('span', {}, ISSUES[L][code] ?? code), h('span', { style: 'margin-inline-start:auto' }, Badge(num(v.count))))))),
    h('div', { class: 'card', style: 'margin-top:14px' }, h('h3', { style: 'margin-top:0' }, t('last30')), spark(s.series)));
}
const stat = (v, l) => h('div', { class: 'card stat' }, h('b', {}, v), h('span', {}, l));
const spark = (series) => { const max = Math.max(1, ...series.map((x) => x.views)); return h('div', { class: 'spark' }, series.map((x) => h('i', { style: `height:${(x.views / max) * 100}%`, title: `${x.date}: ${x.views}` }))); };

/* ---------- pages list ---------- */
function filtered() {
  const q = st.q.trim().toLowerCase();
  return st.entries.filter((e) => (!st.fCol || e.collection === st.fCol) && (!st.fLang || e.lang === st.fLang) && (!st.fStatus || e.status === st.fStatus)
    && (!q || `${e.title} ${e.slug} ${e.tags.join(' ')}`.toLowerCase().includes(q)));
}
function vPages(page) {
  const sel = (key, opts, label) => h('select', { onchange: (e) => { st[key] = e.target.value; renderMain(); }, 'aria-label': label },
    h('option', { value: '' }, `${label}: ${t('all')}`), opts.map(([v, l]) => h('option', { value: v, selected: st[key] === v }, l)));
  const list = filtered();
  const search = h('input', { type: 'search', placeholder: t('search'), value: st.q, oninput: (e) => { st.q = e.target.value; clearTimeout(search._t); search._t = setTimeout(() => { renderMain(); document.querySelector('#page input[type=search]')?.focus(); }, 180); } });
  const bulk = () => st.sel.size ? h('div', { class: 'bar card', style: 'padding:8px 14px' }, h('b', {}, `${num(st.sel.size)} ${t('selected')}`),
    h('button', { class: 'btn sm', onclick: () => bulkPatch({ status: 'published' }) }, t('enable')),
    h('button', { class: 'btn sm', onclick: () => bulkPatch({ status: 'disabled' }) }, t('disable')),
    h('button', { class: 'btn sm', onclick: () => bulkPatch({ noindex: true }) }, 'noindex'),
    h('button', { class: 'btn sm', onclick: () => { st.sel.clear(); renderMain(); } }, t('cancel'))) : null;
  page.append(
    h('div', { class: 'bar' }, search,
      sel('fCol', [['projects', t('projects')], ['journal', t('journal')], ['static', t('static')]], t('type')),
      sel('fLang', [['en', 'EN'], ['fa', 'FA']], t('lang')),
      sel('fStatus', [['published', t('published')], ['draft', t('draft')], ['disabled', t('disabled')]], t('status')),
      h('span', { style: 'margin-inline-start:auto' }), h('button', { class: 'btn pri', onclick: newPageDialog }, '+ ' + t('newPage'))),
    bulk(),
    h('div', { class: 'card', style: 'padding:0;overflow:auto' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { style: 'width:34px' }, h('input', { type: 'checkbox', checked: list.length > 0 && list.every((e) => st.sel.has(e.key)), onchange: (e) => { list.forEach((x) => (e.target.checked ? st.sel.add(x.key) : st.sel.delete(x.key))); renderMain(); } })),
        ['title', 'type', 'lang', 'status', 'views', 'seo'].map((k) => h('th', {}, t(k))), h('th', {}, ''))),
      h('tbody', {}, list.map(row)))),
    list.length ? null : h('div', { class: 'empty' }, '—'));
}
function row(e) {
  const toggle = h('button', { class: 'sw' + (e.status === 'published' ? ' on' : ''), title: t(e.status === 'published' ? 'disable' : 'enable'), disabled: e.kind === 'static',
    onclick: async (ev) => { ev.stopPropagation(); await setStatus(e, e.status === 'published' ? 'disabled' : 'published'); } });
  return h('tr', { class: 'row', onclick: () => openEditor(e.key) },
    h('td', { onclick: (ev) => ev.stopPropagation() }, h('input', { type: 'checkbox', checked: st.sel.has(e.key), onchange: (ev) => { ev.target.checked ? st.sel.add(e.key) : st.sel.delete(e.key); renderMain(); } })),
    h('td', {}, h('span', { class: 't-title', dir: 'auto' }, e.title), h('span', { class: 'hint mono' }, e.url)),
    h('td', {}, Badge(t(e.collection === 'static' ? 'static' : e.collection)), ' ', e.origin === 'studio' ? Badge(t('studio')) : null),
    h('td', {}, Badge(e.lang.toUpperCase())),
    h('td', {}, statusBadge(e.status), e.seo.noindex ? Badge('noindex', 'warn') : null),
    h('td', {}, num(e.views ?? 0)),
    h('td', {}, Score(e.health.score)),
    h('td', { onclick: (ev) => ev.stopPropagation() }, toggle));
}
async function setStatus(e, status) {
  const prev = e.status;
  try {
    await api('PATCH', `/api/entry?key=${encodeURIComponent(e.key)}`, { status });
    await load();
    toastUndo(`${e.title}: ${t(status)}`, async () => { await api('PATCH', `/api/entry?key=${encodeURIComponent(e.key)}`, { status: prev }); await load(); });
  } catch (x) { fail(x); }
}
function toastUndo(msg, fn) {
  let box = document.querySelector('.toasts'); if (!box) { box = h('div', { class: 'toasts' }); document.body.append(box); }
  const el = h('div', { class: 'toast' }, msg, ' ', h('button', { class: 'btn sm', onclick: () => { el.remove(); fn(); } }, t('undo'))); box.append(el); setTimeout(() => el.remove(), 6000);
}
async function bulkPatch(patch) {
  try { await api('POST', '/api/entries/bulk', { keys: [...st.sel], patch }); st.sel.clear(); toast(t('saved')); await load(); } catch (e) { fail(e); }
}

/* ---------- new page dialog ---------- */
function newPageDialog() {
  const f = { collection: 'journal', lang: L === 'fa' ? 'fa' : 'en', title: '', mdx: false };
  const title = h('input', { type: 'text', oninput: (e) => (f.title = e.target.value) });
  const dlg = h('div', { class: 'cmdk', onclick: (e) => e.target === dlg && dlg.remove() }, h('div', { style: 'padding:20px' },
    h('h3', { style: 'margin-top:0' }, t('newPage')),
    h('label', { class: 'f' }, h('span', {}, t('title')), title),
    h('div', { class: 'grid g4' },
      h('label', { class: 'f' }, h('span', {}, t('collection')), h('select', { onchange: (e) => (f.collection = e.target.value) }, h('option', { value: 'journal' }, t('journal')), h('option', { value: 'projects' }, t('projects')))),
      h('label', { class: 'f' }, h('span', {}, t('lang')), h('select', { onchange: (e) => (f.lang = e.target.value) }, h('option', { value: 'fa', selected: f.lang === 'fa' }, 'فارسی'), h('option', { value: 'en', selected: f.lang === 'en' }, 'English')))),
    h('label', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px' }, h('input', { type: 'checkbox', onchange: (e) => (f.mdx = e.target.checked) }), t('mdx')),
    h('div', { style: 'display:flex;gap:8px' },
      h('button', { class: 'btn pri', onclick: async () => { try { const e = await api('POST', '/api/entries', f); dlg.remove(); await load(); openEditor(e.key); } catch (x) { fail(x); } } }, t('create')),
      h('button', { class: 'btn', onclick: () => dlg.remove() }, t('cancel')))));
  document.body.append(dlg); title.focus();
}

/* ---------- editor drawer ---------- */
async function openEditor(key) {
  closeDrawer(true);
  let e; try { e = await api('GET', `/api/entry?key=${encodeURIComponent(key)}`); } catch (x) { return fail(x); }
  const o = e.override;
  const f = { // working copy, `undefined` = untouched
    status: e.status, title: e.title, summary: e.summary, tags: [...e.tags], featured: e.featured,
    seoTitle: e.seo.title, seoDescription: e.seo.description, keywords: [...e.seo.keywords], canonical: e.seo.canonical, noindex: e.seo.noindex, schemaType: e.seo.schemaType,
    image: e.seo.image, imageAlt: e.seo.imageAlt, published: e.date, updated: e.updated, faq: [...(o.faq ?? [])].map((x) => ({ ...x })),
  };
  const orig = JSON.stringify(f); let body = e.body ?? ''; const origBody = body; let tab = 'general';
  const isStatic = e.kind === 'static';
  const dirty = () => JSON.stringify(f) !== orig || body !== origBody;
  const panel = h('div', { class: 'body' });
  const tabs = h('div', { class: 'tabs' });
  const saveBtn = h('button', { class: 'btn pri', onclick: save }, t('save'));
  const hint = h('span', { class: 'hint' });
  const bg = h('div', { class: 'drawer-bg', onclick: () => tryClose() });
  const drawer = h('div', { class: 'drawer', role: 'dialog' },
    h('header', {}, h('h2', { dir: 'auto' }, e.title), Badge(e.lang.toUpperCase()), h('a', { class: 'btn sm', href: e.url, target: '_blank', rel: 'noopener' }, '↗ ' + t('open')), h('button', { class: 'btn sm', onclick: () => tryClose() }, '✕')),
    tabs, panel, h('footer', {}, saveBtn, hint, h('span', { style: 'margin-inline-start:auto' }),
      e.origin === 'native' ? h('button', { class: 'btn danger', onclick: async () => { if (!confirm(t('confirmDel'))) return; try { await api('DELETE', `/api/entry?key=${encodeURIComponent(key)}`); closeDrawer(true); await load(); } catch (x) { fail(x); } } }, t('del')) : null));
  st.drawer = { el: [bg, drawer], dirty };
  document.body.append(bg, drawer);

  const field = (label, input, extra) => h('label', { class: 'f' }, h('span', {}, label, extra || ''), input);
  const counter = (val, min, max) => { const n = val.length; const ok = n >= min && n <= max; return h('span', { dir: 'ltr', style: `color:var(--${ok ? 'grn' : n ? 'yel' : 'mut'})` }, `${num(n)} / ${min}–${max}`); };
  const text = (k, ph) => h('input', { type: 'text', value: f[k] ?? '', placeholder: ph || '', dir: 'auto', oninput: (ev) => { f[k] = ev.target.value; refresh(); } });
  const chipsInput = (k) => {
    const wrap = h('div', { class: 'chips' }); const inp = h('input', { type: 'text', placeholder: t('tagsHint'), dir: 'auto' });
    const draw = () => { wrap.replaceChildren(...f[k].map((c, i) => h('span', { class: 'chip' }, c, h('button', { onclick: () => { f[k].splice(i, 1); draw(); refresh(); } }, '×'))), inp); };
    const add = () => { const v = inp.value.trim().replace(/,$/, ''); if (v && !f[k].includes(v)) f[k].push(v); inp.value = ''; draw(); inp.focus(); refresh(); };
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); add(); } else if (ev.key === 'Backspace' && !inp.value && f[k].length) { f[k].pop(); draw(); inp.focus(); } });
    inp.addEventListener('blur', () => inp.value && add()); draw(); return wrap;
  };

  function serp() {
    const fa = e.lang === 'fa';
    const title = (f.seoTitle || '').slice(0, 70) || e.title; const desc = (f.seoDescription || f.summary || '').slice(0, 170);
    return h('div', { class: 'serp' + (fa ? ' rtl' : '') }, h('div', { class: 'u' }, (me.siteUrl || '') + e.url), h('div', { class: 't', dir: 'auto' }, title), h('div', { class: 'd', dir: 'auto' }, desc));
  }
  function ogCard() {
    return h('div', { class: 'og' }, h('img', { src: f.image || '/admin/favicon.svg', alt: '', style: f.image ? '' : 'object-fit:contain;padding:20px' }), h('div', {}, h('div', { class: 'hint mono' }, new URL(me.siteUrl).host), h('b', { dir: 'auto' }, f.seoTitle || e.title), h('div', { class: 'hint', dir: 'auto' }, (f.seoDescription || '').slice(0, 110))));
  }
  function refresh() { hint.textContent = dirty() ? '● ' + t('unsaved').split('.')[0] : ''; saveBtn.disabled = !dirty(); const s = panel.querySelector('[data-serp]'); if (s) s.replaceChildren(serp()); const o2 = panel.querySelector('[data-og]'); if (o2) o2.replaceChildren(ogCard()); }

  const tabsDef = isStatic ? ['seoTab', 'imageTab'] : ['general', 'seoTab', 'imageTab', 'datesTab', 'translations', 'faq', ...(e.origin === 'native' ? ['content'] : [])];
  tab = tabsDef[0];
  const drawTabs = () => tabs.replaceChildren(...tabsDef.map((k) => h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { tab = k; drawTabs(); drawPanel(); } }, t(k))));

  function drawPanel() {
    panel.replaceChildren();
    if (tab === 'general') {
      panel.append(
        e.origin === 'studio' ? h('div', { class: 'card hint', style: 'margin-bottom:14px' }, '🔒 ' + t('fromVault')) : null,
        field(t('status'), h('select', { onchange: (ev) => { f.status = ev.target.value; refresh(); } }, ['published', 'draft', 'disabled'].map((s) => h('option', { value: s, selected: f.status === s }, t(s))))),
        field(t('title'), text('title')),
        field(t('summary'), h('textarea', { dir: 'auto', oninput: (ev) => { f.summary = ev.target.value; refresh(); } }, f.summary)),
        field(t('tags'), chipsInput('tags')),
        e.collection === 'projects' ? h('label', { style: 'display:flex;gap:8px;align-items:center' }, h('input', { type: 'checkbox', checked: f.featured, onchange: (ev) => { f.featured = ev.target.checked; refresh(); } }), t('featured')) : null);
    } else if (tab === 'seoTab') {
      panel.append(
        h('div', { 'data-serp': '', style: 'margin-bottom:6px' }, serp()), h('div', { class: 'hint', style: 'margin-bottom:16px' }, t('serp')),
        field(t('seoTitle'), h('input', { type: 'text', value: f.seoTitle, dir: 'auto', oninput: (ev) => { f.seoTitle = ev.target.value; ev.target.parentNode.querySelector('.cnt').replaceWith(Object.assign(counter(f.seoTitle, 30, 60), { className: 'cnt' })); refresh(); } }), Object.assign(counter(f.seoTitle, 30, 60), { className: 'cnt' })),
        field(t('seoDesc'), h('textarea', { dir: 'auto', oninput: (ev) => { f.seoDescription = ev.target.value; ev.target.parentNode.querySelector('.cnt').replaceWith(Object.assign(counter(f.seoDescription, 70, 160), { className: 'cnt' })); refresh(); } }, f.seoDescription), Object.assign(counter(f.seoDescription, 70, 160), { className: 'cnt' })),
        field(t('keywords'), chipsInput('keywords')),
        field(t('schema'), h('select', { onchange: (ev) => { f.schemaType = ev.target.value; refresh(); } }, me.schemaTypes.map((s) => h('option', { value: s, selected: f.schemaType === s }, s === 'auto' ? t('schemaAuto') : s)))),
        field(t('canonical'), h('input', { type: 'url', class: 'mono', value: f.canonical, placeholder: 'https://…', oninput: (ev) => { f.canonical = ev.target.value; refresh(); } })),
        h('label', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:18px' }, h('input', { type: 'checkbox', checked: f.noindex, onchange: (ev) => { f.noindex = ev.target.checked; refresh(); } }), t('noindex')),
        h('h4', {}, t('health')), e.health.issues.length ? e.health.issues.map((i) => h('div', { class: 'issue' }, h('span', { class: 'dot ' + i.level }), ISSUES[L][i.code] ?? i.code)) : h('div', { class: 'hint' }, t('noIssues')));
    } else if (tab === 'imageTab') {
      panel.append(
        h('div', { 'data-og': '' }, ogCard()), h('div', { class: 'hint', style: 'margin:6px 0 16px' }, t('og')),
        h('div', { style: 'display:flex;gap:8px;margin-bottom:16px' },
          h('button', { class: 'btn', onclick: () => pickMedia((url) => { f.image = url; drawPanel(); refresh(); }) }, '▣ ' + t('pickImage')),
          f.image ? h('button', { class: 'btn danger', onclick: () => { f.image = ''; f.imageAlt = ''; drawPanel(); refresh(); } }, t('removeImage')) : null),
        field(t('image'), h('input', { type: 'text', class: 'mono', value: f.image, placeholder: '/media/…', oninput: (ev) => { f.image = ev.target.value; refresh(); } })),
        field(t('alt'), text('imageAlt')));
    } else if (tab === 'datesTab') {
      const d = (k, label) => field(label, h('div', { style: 'display:flex;gap:8px' }, h('input', { type: 'date', value: f[k] || '', oninput: (ev) => { f[k] = ev.target.value; refresh(); } }), h('button', { class: 'btn', onclick: () => { f[k] = new Date().toISOString().slice(0, 10); drawPanel(); refresh(); } }, t('today'))));
      panel.append(d('published', t('pubDate')), d('updated', t('updDate')));
    } else if (tab === 'translations') {
      panel.append(translationsPanel(e, drawPanel));
    } else if (tab === 'faq') {
      panel.append(h('p', { class: 'hint' }, t('faqHint')),
        f.faq.map((q, i) => h('div', { class: 'card', style: 'margin-bottom:10px' },
          field(t('question'), h('input', { type: 'text', dir: 'auto', value: q.q, oninput: (ev) => { q.q = ev.target.value; refresh(); } })),
          field(t('answer'), h('textarea', { dir: 'auto', oninput: (ev) => { q.a = ev.target.value; refresh(); } }, q.a)),
          h('button', { class: 'btn sm danger', onclick: () => { f.faq.splice(i, 1); drawPanel(); refresh(); } }, t('del')))),
        h('button', { class: 'btn', onclick: () => { f.faq.push({ q: '', a: '' }); drawPanel(); refresh(); } }, '+ ' + t('addFaq')));
    } else if (tab === 'content') {
      panel.append(h('textarea', { class: 'mono', style: 'min-height:60vh;width:100%;direction:ltr', spellcheck: 'false', oninput: (ev) => { body = ev.target.value; refresh(); } }, body), h('div', { class: 'hint' }, `${num(body.split(/\s+/).filter(Boolean).length)} ${t('words')}`));
    }
  }

  async function save() {
    const patch = {};
    const clean = (v) => (typeof v === 'string' ? v.trim() : v);
    const o0 = JSON.parse(orig);
    const map = { status: 'status', title: 'title', summary: 'summary', tags: 'tags', featured: 'featured', seoTitle: 'seoTitle', seoDescription: 'seoDescription', keywords: 'keywords', canonical: 'canonical', noindex: 'noindex', schemaType: 'schemaType', image: 'image', imageAlt: 'imageAlt', published: 'published', updated: 'updated', faq: 'faq' };
    for (const k of Object.keys(map)) if (JSON.stringify(f[k]) !== JSON.stringify(o0[k])) patch[k] = k === 'faq' ? f.faq.filter((x) => x.q.trim() && x.a.trim()) : clean(f[k]) === '' ? null : clean(f[k]);
    if (isStatic) delete patch.title;
    try {
      if (Object.keys(patch).length) await api('PATCH', `/api/entry?key=${encodeURIComponent(key)}`, patch);
      if (body !== origBody) await api('PUT', `/api/entry/body?key=${encodeURIComponent(key)}`, { body });
      toast(t('saved')); closeDrawer(true); await load(); openEditor(key);
    } catch (x) { fail(x); }
  }
  async function tryClose() { if (!dirty() || confirm(t('unsaved'))) closeDrawer(true); }
  st.drawer.tryClose = tryClose;
  drawTabs(); drawPanel(); refresh();
}
function closeDrawer() { st.drawer?.el.forEach((x) => x.remove()); st.drawer = null; }

function translationsPanel(e, redraw) {
  const wrap = h('div', {});
  const others = st.entries.filter((x) => x.kind === 'content' && x.collection === e.collection && x.lang !== e.lang);
  const pick = h('select', {}, h('option', { value: '' }, t('linkTo')), others.map((x) => h('option', { value: x.key }, `${x.title} (${x.slug})`)));
  wrap.append(e.translations.length ? e.translations.map((x) => h('div', { class: 'card', style: 'display:flex;gap:10px;align-items:center;margin-bottom:10px' }, Badge(x.lang.toUpperCase()), h('b', { dir: 'auto' }, x.title), h('span', { class: 'hint mono' }, x.url),
    e.kind === 'content' ? h('button', { class: 'btn sm danger', style: 'margin-inline-start:auto', onclick: async () => { try { await api('POST', '/api/translations/unlink', { key: e.key }); toast(t('saved')); await load(); openEditor(e.key); } catch (z) { fail(z); } } }, t('unlink')) : null)) : h('div', { class: 'hint', style: 'margin-bottom:12px' }, t('noLinked')),
    e.kind === 'content' ? h('div', { style: 'display:flex;gap:8px' }, pick, h('button', { class: 'btn pri', onclick: async () => { if (!pick.value) return; try { await api('POST', '/api/translations/link', { a: e.key, b: pick.value }); toast(t('saved')); await load(); openEditor(e.key); } catch (z) { fail(z); } } }, t('link'))) : null);
  return wrap;
}


/* ---------- inbox (submissions from the Obsidian plugin) ---------- */
async function vInbox(page) {
  const all = await api('GET', '/api/submissions');
  const pend = all.filter((x) => x.status === 'pending'), done = all.filter((x) => x.status !== 'pending').slice(0, 20);
  const rowOf = (x) => h('tr', { class: 'row', onclick: () => openSubmission(x.id) },
    h('td', {}, h('span', { class: 't-title', dir: 'auto' }, x.title), h('span', { class: 'hint mono' }, x.key)),
    h('td', {}, Badge(t(x.collection)), ' ', Badge(x.lang.toUpperCase())),
    h('td', {}, x.media.length ? `▣ ${num(x.media.length)}` : '—'),
    h('td', { class: 'hint' }, x.by, ' · ', when(x.createdAt)),
    h('td', {}, Badge(t(x.status === 'pending' ? 'pendingS' : x.status), x.status === 'approved' ? 'ok' : x.status === 'rejected' ? 'err' : 'warn')));
  const table = (rows) => h('div', { class: 'card', style: 'padding:0;overflow:auto;margin-bottom:18px' }, h('table', {}, h('tbody', {}, rows.map(rowOf))));
  page.append(pend.length ? table(pend) : h('div', { class: 'card empty' }, t('inboxEmpty')), done.length ? h('h3', {}, t('history')) : null, done.length ? table(done) : null);
}
async function openSubmission(id) {
  closeDrawer();
  let x; try { x = await api('GET', `/api/submissions/item?id=${id}`); } catch (e) { return fail(e); }
  const bg = h('div', { class: 'drawer-bg', onclick: closeDrawer });
  const isMedia = (n) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(n), isVideo = (n) => /\.(mp4|webm|mov|m4v|ogv)$/i.test(n);
  const conflict = x.existing?.origin === 'dashboard';
  let overwrite = false;
  const act = async (build) => {
    try { await api('POST', '/api/submissions/approve', { id, build, overwrite }); toast(t('approved')); closeDrawer(); await load(false); renderMain(); if (build) pollBuild(); }
    catch (e) { if (e.data?.conflict) { overwrite = true; toast(t('conflictNative'), true); drawer.querySelector('[data-ow]').style.display = 'flex'; } else fail(e); }
  };
  const drawer = h('div', { class: 'drawer' },
    h('header', {}, h('h2', { dir: 'auto' }, x.title), Badge(t(x.collection)), Badge(x.lang.toUpperCase()), h('button', { class: 'btn sm', onclick: closeDrawer }, '✕')),
    h('div', { class: 'body' },
      h('p', { class: 'hint' }, `${t('sentBy')} ${x.by} · ${when(x.createdAt)} · `, h('span', { class: 'mono' }, x.key), x.vaultPath ? [' · ', h('span', { class: 'mono' }, x.vaultPath)] : null),
      h('div', { class: 'bar' }, x.existing ? Badge(t('isUpdate'), 'warn') : Badge(t('isNew'), 'ok')),
      h('div', { 'data-ow': '', class: 'card', style: 'display:none;gap:8px;align-items:center;border-color:var(--red);margin-bottom:12px' }, t('conflictNative')),
      x.media.length ? [h('h4', {}, `${t('mediaFiles')} (${num(x.media.length)})`), h('div', { class: 'media', style: 'margin-bottom:16px' }, x.media.map((m) => h('figure', {},
        isMedia(m.name) ? h('img', { src: `/api/submissions/media?name=${m.name}`, alt: '', loading: 'lazy' }) : isVideo(m.name) ? h('video', { src: `/api/submissions/media?name=${m.name}`, controls: true, preload: 'metadata', style: 'width:100%;aspect-ratio:4/3;background:#000' }) : h('div', { class: 'empty' }, m.name.split('.').pop()),
        h('figcaption', { class: 'mono' }, `${m.name} · ${m.bytes > 1048576 ? (m.bytes / 1048576).toFixed(1) + ' MB' : Math.round(m.bytes / 1024) + ' KB'}${m.missing ? ' ⚠' : ''}`))))] : null,
      h('h4', {}, t('source')), h('pre', { class: 'log', style: 'max-height:50vh' }, x.content),
      x.existing ? [h('h4', {}, t('current2')), h('pre', { class: 'log', style: 'max-height:30vh;opacity:.7' }, x.existing.body)] : null),
    x.status === 'pending' ? h('footer', {},
      h('button', { class: 'btn pri', onclick: () => act(true) }, '⇪ ' + t('approveBuild')),
      h('button', { class: 'btn', onclick: () => act(false) }, '✓ ' + t('approve')),
      h('span', { style: 'margin-inline-start:auto' }),
      h('button', { class: 'btn danger', onclick: async () => { const reason = prompt(t('rejectReason')) ?? null; if (reason === null) return; try { await api('POST', '/api/submissions/reject', { id, reason }); toast(t('rejected')); closeDrawer(); await load(false); renderMain(); } catch (e) { fail(e); } } }, t('reject'))) : h('footer', {}, Badge(t(x.status), x.status === 'approved' ? 'ok' : 'err'), x.reason ? h('span', { class: 'hint' }, x.reason) : null));
  st.drawer = { el: [bg, drawer], dirty: () => false, tryClose: closeDrawer };
  document.body.append(bg, drawer);
}

/* ---------- media ---------- */
async function pickMedia(onPick) {
  const list = await api('GET', '/api/media');
  const dlg = h('div', { class: 'cmdk', style: 'z-index:120', onclick: (e) => e.target === dlg && dlg.remove() }, h('div', { style: 'padding:18px;width:min(760px,94vw)' }, h('div', { class: 'media', style: 'max-height:60vh;overflow:auto' },
    list.map((m) => h('figure', { onclick: () => { onPick(m.url); dlg.remove(); } }, h('img', { src: m.url, loading: 'lazy', alt: '' }), h('figcaption', { class: 'mono' }, m.url.split('/').pop()))))));
  document.body.append(dlg);
}
async function uploadFile(file) {
  try { const r = await api('POST', `/api/media?name=${encodeURIComponent(file.name)}`, file, true); toast(`${t('saved')} · ${Math.round(r.bytes / 1024)} KB${r.width ? ` · ${r.width}×${r.height}` : ''}`); return r; } catch (x) { fail(x); }
}
async function vMedia(page) {
  const list = await api('GET', '/api/media');
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none', onchange: async () => { for (const f of input.files) await uploadFile(f); renderMain(); } });
  const drop = h('div', { class: 'drop', onclick: () => input.click(),
    ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'),
    ondrop: async (e) => { e.preventDefault(); for (const f of e.dataTransfer.files) await uploadFile(f); renderMain(); } }, '⇪ ' + t('dropHere'), input);
  page.append(drop, h('div', { class: 'media', style: 'margin-top:16px' }, list.map((m) => h('figure', { title: m.url, onclick: async () => { await navigator.clipboard?.writeText(location.origin + m.url).catch(() => {}); toast(t('copied')); } },
    h('img', { src: m.url, loading: 'lazy', alt: '' }), h('figcaption', { class: 'mono', style: 'display:flex;justify-content:space-between;gap:6px' }, h('span', {}, `${Math.round(m.bytes / 1024)} KB`), h('button', { class: 'btn sm danger', onclick: async (e) => { e.stopPropagation(); if (confirm(t('confirmDel'))) { await api('DELETE', `/api/media?url=${encodeURIComponent(m.url)}`); renderMain(); } } }, '✕'))))));
}

/* ---------- analytics ---------- */
async function vAnalytics(page) {
  const s = await api('GET', '/api/stats?days=30');
  const bar = (items, total) => items.map((x) => h('div', { class: 'issue', style: 'align-items:center' }, h('span', { class: 'mono', style: 'flex:1;overflow:hidden;text-overflow:ellipsis' }, x.path || x.key), h('b', {}, num(x.views ?? x.value)), h('div', { class: 'meter', style: 'width:80px' }, h('i', { style: `width:${((x.views ?? x.value) / Math.max(1, total)) * 100}%` }))));
  page.append(h('div', { class: 'grid g4' }, stat(num(s.totals.views), t('last30')), stat(num(s.totals.visitors), t('visitors')), stat(num(s.totals.today), t('today2')),
    h('div', { class: 'card stat' }, h('b', {}, Object.entries(s.langs).map(([k, v]) => `${k.toUpperCase()} ${num(v)}`).join(' · ') || '—'), h('span', {}, t('byLang')))),
    h('div', { class: 'card', style: 'margin-top:14px' }, spark(s.series)),
    h('div', { class: 'grid g2', style: 'margin-top:14px' }, h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, t('topPages')), bar(s.topPages, s.topPages[0]?.views ?? 1)),
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, t('referrers')), bar(s.referrers, s.referrers[0]?.value ?? 1))));
}

/* ---------- builds ---------- */
async function vBuilds(page) {
  const { running, builds } = await api('GET', '/api/builds');
  let logId = builds[0]?.id; const logBox = h('pre', { class: 'log' }, '');
  const loadLog = async (id) => { logId = id; const r = await api('GET', `/api/builds/log?id=${id}`); logBox.textContent = r.log || '—'; logBox.scrollTop = logBox.scrollHeight; };
  page.append(h('div', { class: 'card', style: 'padding:0;overflow:auto' }, h('table', {}, h('thead', {}, h('tr', {}, ['ID', t('status'), '', ''].map((x) => h('th', {}, x)))),
    h('tbody', {}, builds.map((b) => h('tr', { class: 'row', onclick: () => loadLog(b.id) }, h('td', { class: 'mono' }, b.id, ' ', b.current ? Badge(t('live'), 'ok') : null), h('td', {}, Badge(t(b.status === 'running' ? 'running' : b.status), b.status === 'success' ? 'ok' : b.status === 'failed' ? 'err' : 'warn'), ' ', b.pages ? h('span', { class: 'hint' }, `${num(b.pages)} pages`) : null),
      h('td', { class: 'hint' }, b.reason, ' · ', when(b.startedAt)), h('td', { onclick: (e) => e.stopPropagation() }, b.status === 'success' && !b.current ? h('button', { class: 'btn sm', onclick: async () => { if (!confirm(t('rollback') + '?')) return; try { await api('POST', '/api/rollback', { id: b.id }); toast(t('saved')); renderMain(); } catch (x) { fail(x); } } }, '↩ ' + t('rollback')) : null)))))),
    h('h3', {}, t('buildLog')), logBox);
  if (logId) loadLog(logId);
  if (running) { const iv = setInterval(() => { if (st.view !== 'builds' || !logId) return clearInterval(iv); loadLog(logId); }, 2000); }
}

/* ---------- settings ---------- */
async function vSettings(page) {
  const [tokens, backups, audit] = await Promise.all([api('GET', '/api/tokens'), api('GET', '/api/backups'), api('GET', '/api/audit')]);
  const name = h('input', { type: 'text', placeholder: t('tokenName'), value: 'Obsidian' }); const out = h('div', {});
  const cur = h('input', { type: 'password', autocomplete: 'current-password' }), nxt = h('input', { type: 'password', autocomplete: 'new-password' });
  page.append(h('div', { class: 'grid g2' },
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, t('tokens')), h('p', { class: 'hint' }, t('tokenHint')),
      tokens.map((k) => h('div', { class: 'issue', style: 'align-items:center' }, h('b', {}, k.name), h('span', { class: 'hint mono' }, k.lastUsed ? when(k.lastUsed) : '—'), h('button', { class: 'btn sm danger', style: 'margin-inline-start:auto', onclick: async () => { await api('DELETE', `/api/tokens?id=${k.id}`); renderMain(); } }, t('del')))),
      h('div', { style: 'display:flex;gap:8px;margin-top:10px' }, name, h('button', { class: 'btn pri', onclick: async () => { const r = await api('POST', '/api/tokens', { name: name.value }); out.replaceChildren(h('p', {}, t('tokenShow')), h('code', { class: 'mono', style: 'display:block;padding:10px;background:var(--bg);border:1px solid var(--ac);border-radius:8px;word-break:break-all;user-select:all' }, r.token)); } }, t('tokenNew'))), out),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, t('changePw')), h('label', { class: 'f' }, h('span', {}, t('current')), cur), h('label', { class: 'f' }, h('span', {}, t('next')), nxt),
      h('button', { class: 'btn pri', onclick: async () => { try { await api('POST', '/api/password', { current: cur.value, next: nxt.value }); toast(t('saved')); cur.value = nxt.value = ''; } catch (x) { fail(x); } } }, t('save')))),
    h('div', { class: 'grid g2', style: 'margin-top:14px' },
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, t('backups')), backups.slice(0, 8).map((b) => h('div', { class: 'issue', style: 'align-items:center' }, h('span', { class: 'mono' }, when(b.at)), h('button', { class: 'btn sm', style: 'margin-inline-start:auto', onclick: async () => { if (confirm(t('restore') + '?')) { await api('POST', '/api/backups/restore', { name: b.name }); toast(t('saved')); await load(); } } }, t('restore')))) , backups.length ? null : h('div', { class: 'hint' }, '—')),
      h('div', { class: 'card', style: 'max-height:420px;overflow:auto' }, h('h3', { style: 'margin-top:0' }, t('audit')), audit.map((a) => h('div', { class: 'issue', style: 'font-size:12px' }, h('span', { class: 'mono hint' }, a.t.slice(5, 16).replace('T', ' ')), h('span', {}, `${a.actor} · ${a.action} · `), h('span', { class: 'mono' }, a.target))))));
}

/* ---------- command palette ---------- */
function openCmdk() {
  const items = [...NAV.map(([k]) => ({ label: t(k), run: () => go(k) })), { label: '+ ' + t('newPage'), run: newPageDialog }, { label: t('publish'), run: publish },
    ...st.entries.map((e) => ({ label: `${e.title}  ·  ${e.lang.toUpperCase()}`, run: () => openEditor(e.key) }))];
  let idx = 0, shown = items.slice(0, 9);
  const ul = h('ul', {}); const inp = h('input', { type: 'text', placeholder: t('cmdk'), dir: 'auto' });
  const draw = () => ul.replaceChildren(...shown.map((x, i) => h('li', { class: i === idx ? 'on' : '', onclick: () => { dlg.remove(); x.run(); } }, x.label)));
  const dlg = h('div', { class: 'cmdk', onclick: (e) => e.target === dlg && dlg.remove() }, h('div', {}, inp, ul));
  inp.addEventListener('input', () => { const q = inp.value.toLowerCase(); shown = items.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 9); idx = 0; draw(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { idx = Math.min(shown.length - 1, idx + 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && shown[idx]) { dlg.remove(); shown[idx].run(); } else if (e.key === 'Escape') dlg.remove();
  });
  document.body.append(dlg); draw(); inp.focus();
}
document.addEventListener('keydown', (e) => {
  if (!me) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && st.drawer) { e.preventDefault(); document.querySelector('.drawer footer .btn.pri')?.click(); }
  else if (e.key === 'Escape' && st.drawer && !document.querySelector('.cmdk')) st.drawer.tryClose?.();
});
window.addEventListener('beforeunload', (e) => { if (st.drawer?.dirty()) { e.preventDefault(); e.returnValue = ''; } });
if (localStorage.getItem('adm-theme') === 'light') document.documentElement.classList.add('light');
renderRoot();
