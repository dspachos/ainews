'use strict';

/* ---------- paths and categories ---------- */

const PATHS = {
  data: '../data.json',
  edition: (date) => `../archive/ai-news-${date}.html`,
};

const CATS = {
  models: 'Models & Releases',
  tools: 'AI Tools & Agents',
  github: 'GitHub Trending',
  business: 'Companies & Business',
  research: 'Research & Papers',
  general: 'More AI News',
};
const CAT_ORDER = ['models', 'tools', 'github', 'business', 'research', 'general'];

/* Mirror the site's display limits: 12 rows per page, 30 search results. */
const PER_PAGE = 12;
const MAX_SEARCH_RESULTS = 30;

/* ---------- state ---------- */

const state = {
  editions: [], // data.json editions, newest-first
  byDate: new Map(), // date -> edition
  items: [], // flat items, newest-first, each with date and idx
  saved: load('ainews.saved', []),
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: saving is best-effort */
  }
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} failed with HTTP ${res.status}`);
  return res.text();
}

async function fetchJSON(url) {
  return JSON.parse(await fetchText(url));
}

async function initData() {
  if (state.editions.length) return;
  const doc = await fetchJSON(PATHS.data);
  state.editions = doc.editions;
  state.byDate = new Map(doc.editions.map((e) => [e.date, e]));
  state.items = [];
  for (const e of doc.editions) {
    e.items.forEach((it, idx) => state.items.push({ ...it, date: e.date, idx }));
  }
  store('ainews.updated', new Date().toISOString());
}

/* ---------- helpers ---------- */

const $ = (sel) => document.querySelector(sel);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

function fmtLong(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function fmtShort(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function srcName(it) {
  if (it.source) return it.source;
  try {
    return new URL(it.url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

/* ---------- navigation ---------- */

const ICONS = {
  today:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h11.5a1 1 0 0 1 1 1V18a1.5 1.5 0 0 0 1.5 1.5h-13A1.5 1.5 0 0 1 3.5 18V6a.5.5 0 0 1 .5-.5z"/><path d="M16.5 8.5H20a.5.5 0 0 1 .5.5v9a1.5 1.5 0 0 1-1.5 1.5"/><path d="M6.5 8.5h7M6.5 11.5h7M6.5 14.5h4.5"/></svg>',
  editions:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4M16 3v4M3.5 10.5h17M8 14.5h3"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  saved:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3.5h10a1 1 0 0 1 1 1V20a.8.8 0 0 1-1.23.67L12 17.2l-4.77 3.47A.8.8 0 0 1 6 20V4.5a1 1 0 0 1 1-1z"/></svg>',
};

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'editions', label: 'Editions' },
  { id: 'search', label: 'Search' },
  { id: 'saved', label: 'Saved' },
];

function buildNav() {
  $('#tabbar').innerHTML = TABS.map(
    (t) =>
      `<a class="tab" data-route="${t.id}" href="#/${t.id}">${ICONS[t.id]}<span>${t.label}</span></a>`,
  ).join('');
  $('#sidebar').innerHTML =
    `<a class="side-brand" href="#/today">AI News Digest</a>` +
    TABS.map(
      (t) =>
        `<a class="side-link" data-route="${t.id}" href="#/${t.id}">${ICONS[t.id]}<span>${t.label}</span></a>`,
    ).join('');
}

function route() {
  const parts = (location.hash || '#/today').replace(/^#\/?/, '').split('/');
  switch (parts[0]) {
    case 'today':
    case '':
      return { screen: 'today' };
    case 'editions':
      return { screen: 'editions', page: Math.max(1, Number(parts[1]) || 1) };
    case 'edition':
      return { screen: 'edition', date: parts[1] };
    case 'story':
      return { screen: 'story', date: parts[1], idx: Number(parts[2]) };
    case 'search':
      return { screen: 'search' };
    case 'saved':
      return { screen: 'saved' };
    default:
      return { screen: 'today' };
  }
}

function errorHTML(err) {
  return `
    <div class="error-card">
      <h2>Could not load the digest</h2>
      <p>${esc(err && err.message ? err.message : err)}</p>
      <button class="btn" data-action="retry">Try again</button>
    </div>`;
}

function bindViewActions(root) {
  root.querySelector('[data-action="retry"]')?.addEventListener('click', () => render());
}

/* ---------- screens: shared pieces ---------- */

function groupsOf(items) {
  const groups = new Map();
  for (const cat of CAT_ORDER) {
    const list = items.filter((it) => it.category === cat);
    if (list.length) groups.set(cat, list);
  }
  const known = new Set(CAT_ORDER);
  const rest = items.filter((it) => !known.has(it.category));
  if (rest.length) groups.set('general', [...(groups.get('general') || []), ...rest]);
  return groups;
}

function groupHTML(cat, inner) {
  return `<section class="group"><h2 class="group-title">${esc(CATS[cat] || 'More')}</h2>${inner}</section>`;
}

function metaText(it) {
  return esc(srcName(it)) + (it.metaNote ? ` · ${esc(it.metaNote)}` : '');
}

function storyCard(it, date, idx, variant = '') {
  return `
    <a class="card story-card ${variant}" href="#/story/${date}/${idx}">
      <span class="kicker">${esc(CATS[it.category] || 'More AI News')}</span>
      <span class="headline">${esc(it.title)}</span>
      ${it.summary ? `<span class="dek">${esc(it.summary)}</span>` : ''}
      <span class="meta">${metaText(it)}</span>
    </a>`;
}

function storyRow(it, date, idx) {
  return `
    <a class="row" href="#/story/${date}/${idx}">
      <span class="row-main">
        <span class="headline">${esc(it.title)}</span>
        ${it.summary ? `<span class="dek">${esc(it.summary)}</span>` : ''}
      </span>
      <span class="meta">${esc(srcName(it))}</span>
    </a>`;
}

function notFoundHTML(msg) {
  return `<div class="placeholder"><h1 class="large-title">Not found</h1><p>${esc(msg)}</p><p><a class="btn" href="#/today">Go to Today</a></p></div>`;
}

/* ---------- screens: today ---------- */

function todayScreen() {
  const e = state.editions[0];
  if (!e) throw new Error('data.json contains no editions');
  const lead = e.lead || e.items[0];
  const rest = e.items.filter((it) => it !== lead);
  const idxOf = (it) => e.items.indexOf(it);

  let body = '';
  let first = true;
  for (const [cat, list] of groupsOf(rest)) {
    if (first) {
      first = false;
      const cards = list.slice(0, 6).map((it) => storyCard(it, e.date, idxOf(it))).join('');
      const more = list.slice(6).map((it) => storyRow(it, e.date, idxOf(it))).join('');
      body += groupHTML(
        cat,
        `<div class="card-grid">${cards}</div>` +
          (more ? `<div class="rows group-rows">${more}</div>` : ''),
      );
    } else {
      const rows = list.map((it) => storyRow(it, e.date, idxOf(it))).join('');
      body += groupHTML(cat, `<div class="rows">${rows}</div>`);
    }
  }

  return `
    <header class="screen-head">
      <p class="date-line">${esc(fmtLong(e.date))}</p>
      <h1 class="large-title">Today</h1>
    </header>
    ${storyCard(lead, e.date, idxOf(lead), 'hero')}
    ${body}`;
}

/* ---------- screens: edition ---------- */

function editionScreen(r) {
  const e = state.byDate.get(r.date);
  if (!e) return notFoundHTML('That edition does not exist.');
  const body = [...groupsOf(e.items)]
    .map(
      ([cat, list]) =>
        groupHTML(
          cat,
          `<div class="rows">${list
            .map((it) => storyRow(it, e.date, e.items.indexOf(it)))
            .join('')}</div>`,
        ),
    )
    .join('');
  return `
    <header class="screen-head">
      <a class="back" href="#/editions">\u2190 Editions</a>
      <p class="date-line">${esc(fmtLong(e.date))}</p>
      <h1 class="large-title">AI News Digest</h1>
      <p class="screen-summary">${e.items.length} stories · led by ${esc(srcName(e.lead || e.items[0]))}</p>
    </header>
    ${body}
    <p class="reader-foot"><a href="${esc(PATHS.edition(e.date))}">Open the web edition \u2197</a></p>`;
}

/* ---------- screens: editions list ---------- */

function editionsScreen(r) {
  const maxPage = Math.max(1, Math.ceil(state.editions.length / PER_PAGE));
  const page = Math.min(Math.max(1, r.page || 1), maxPage);
  const rows = state.editions
    .slice((page - 1) * PER_PAGE, page * PER_PAGE)
    .map(
      (e) => `
      <a class="row edition-row" href="#/edition/${e.date}">
        <span class="row-main">
          <span class="kicker">${esc(fmtLong(e.date))}</span>
          <span class="headline">${esc(e.lead ? e.lead.title : 'AI News Digest')}</span>
          <span class="dek">${e.items.length} stories</span>
        </span>
        <span class="meta" aria-hidden="true">\u203a</span>
      </a>`,
    )
    .join('');
  const newer = page > 1
    ? `<a class="btn ghost" href="#/editions/${page - 1}">\u2190 Newer</a>`
    : '<span class="btn ghost" aria-hidden="true"></span>';
  const older = page < maxPage
    ? `<a class="btn ghost" href="#/editions/${page + 1}">Older \u2192</a>`
    : '<span class="btn ghost" aria-hidden="true"></span>';
  return `
    <header class="screen-head">
      <p class="date-line">Every edition</p>
      <h1 class="large-title">Editions</h1>
    </header>
    <div class="rows">${rows}</div>
    <nav class="archive-nav" aria-label="Edition pages">
      ${newer}
      <span class="archive-count">Page ${page} of ${maxPage}</span>
      ${older}
    </nav>`;
}

/* ---------- screens (placeholder until the next build steps) ---------- */

function placeholder(title) {
  return `<div class="placeholder"><h1 class="large-title">${esc(title)}</h1><p>Coming in the next build step.</p></div>`;
}

const screens = {
  today: todayScreen,
  editions: editionsScreen,
  edition: editionScreen,
  story: async () => placeholder('Story'),
  search: async () => placeholder('Search'),
  saved: async () => placeholder('Saved'),
};

const afterRender = {};

/* ---------- render loop ---------- */

let renderSeq = 0;

async function render() {
  const seq = ++renderSeq;
  const r = route();
  document.querySelectorAll('[data-route]').forEach((el) => {
    el.classList.toggle('active', el.dataset.route === r.screen);
  });
  const view = $('#view');
  $('#headerTitle').textContent = r.screen.charAt(0).toUpperCase() + r.screen.slice(1);
  view.innerHTML = '<div class="loading">Loading…</div>';
  try {
    await initData();
    if (seq !== renderSeq) return;
    view.innerHTML = await screens[r.screen](r);
    if (afterRender[r.screen]) afterRender[r.screen](r, view);
    bindViewActions(view);
  } catch (err) {
    if (seq !== renderSeq) return;
    view.innerHTML = errorHTML(err);
    bindViewActions(view);
  }
  window.scrollTo(0, 0);
}

/* ---------- header compact title on scroll ---------- */

function wireHeader() {
  const header = $('#appHeader');
  const onScroll = () => header.classList.toggle('compact', window.scrollY > 48);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- offline banner ---------- */

function wireOffline() {
  const banner = $('#offline');
  const update = () => {
    const ts = load('ainews.updated', null);
    const when = ts
      ? ` · cached ${new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : '';
    banner.textContent = `Offline · showing cached editions${when}`;
    banner.hidden = navigator.onLine;
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

/* ---------- theme ---------- */

const THEME_ORDER = ['auto', 'light', 'dark'];
let themeBtn = null;

function applyTheme() {
  const pref = load('ainews.theme', 'auto');
  const dark =
    pref === 'dark' ||
    (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if (themeBtn) themeBtn.textContent = pref;
}

function buildThemeToggle() {
  themeBtn = document.createElement('button');
  themeBtn.className = 'theme-btn';
  themeBtn.setAttribute('aria-label', 'Color theme: auto, light, or dark');
  themeBtn.addEventListener('click', () => {
    const cur = load('ainews.theme', 'auto');
    store('ainews.theme', THEME_ORDER[(THEME_ORDER.indexOf(cur) + 1) % THEME_ORDER.length]);
    applyTheme();
  });
  $('#headerActions').appendChild(themeBtn);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}

/* ---------- boot ---------- */

function boot() {
  buildNav();
  buildThemeToggle();
  applyTheme();
  wireHeader();
  wireOffline();
  window.addEventListener('hashchange', render);
  render();
}

boot();

if ('serviceWorker' in navigator) {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (location.protocol === 'https:' || local) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* offline support is unavailable until the next visit */
      });
    });
  }
}
