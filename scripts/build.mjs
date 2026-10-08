#!/usr/bin/env node
// ---------------------------------------------------------------------------
// AI News Digest — fetch + build.
//
//   node build.mjs [--hours=N] [--since=ISO] [--out=DIR] [--max=N] [--no-state-update]
//
// Default window: from the last run (state.json) to now, capped at 7 days,
// minimum 24 hours for a first run. State updates only after a successful write.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { RSS_FEEDS, EXA_QUERIES, HN_QUERIES, GITHUB, AI_KEYWORDS, CATEGORY_KEYWORDS } from './sources.mjs';
import { renderPage } from './render.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(SCRIPT_DIR, '..', 'state.json');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const args = process.argv.slice(2);
const argValue = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : undefined;
};
const OUT_DIR = argValue('out') || path.join(os.homedir(), 'Downloads');
const MAX_ITEMS = parseInt(argValue('max') || '90', 10);
const NO_STATE_UPDATE = args.includes('--no-state-update');
const MAX_WINDOW_HOURS = 7 * 24;

// --- state -----------------------------------------------------------------
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch { return null; }
}
function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

const now = new Date();
const state = loadState();
let windowStart;
if (argValue('since')) {
  windowStart = new Date(argValue('since'));
} else if (argValue('hours')) {
  windowStart = new Date(now.getTime() - parseFloat(argValue('hours')) * 3600e3);
} else if (state?.lastRun) {
  const capped = new Date(now.getTime() - MAX_WINDOW_HOURS * 3600e3);
  windowStart = new Date(Math.max(new Date(state.lastRun).getTime(), capped.getTime()));
} else {
  windowStart = new Date(now.getTime() - 24 * 3600e3);
}
if (isNaN(windowStart)) { console.error('Invalid --since value'); process.exit(1); }
const windowMs = now.getTime() - windowStart.getTime();
console.log(`Window: ${windowStart.toISOString()} -> ${now.toISOString()} (${(windowMs / 3600e3).toFixed(1)}h)`);

// --- helpers ----------------------------------------------------------------
async function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '\u2013').replace(/&mdash;/g, '\u2014')
    .replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201d').replace(/&ldquo;/g, '\u201c')
    .replace(/&hellip;/g, '\u2026').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function stripHtml(s) {
  // decode first: atom content is entity-encoded HTML, so tags appear only after decoding
  return decodeEntities(String(s || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s, n = 240) {
  s = (s || '').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.!?-]+$/, '') + '\u2026';
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function normUrl(url) {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|ref|source|share|fbclid|gclid|mc_)/i.test(k)) u.searchParams.delete(k);
    u.hash = '';
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch { return url; }
}

function titleKey(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70);
}

function classify(title, summary) {
  const text = `${title} ${summary}`;
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(text)) return cat;
  return 'general';
}

// --- RSS / Atom -------------------------------------------------------------
function parseFeed(xml) {
  const items = [];
  const isAtom = /<feed[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    const pick = (re) => {
      const m = b.match(re);
      if (!m) return '';
      let v = m[1] || '';
      if (v.startsWith('<![CDATA[')) v = v.slice(9, -3);
      return v.trim();
    };
    const title = stripHtml(pick(/<title[^>]*>([\s\S]*?)<\/title>/i));
    let link = '';
    if (isAtom) {
      link = pick(/<link[^>]*href="([^"]+)"[^>]*rel="alternate"[^>]*>/i)
        || pick(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*>/i)
        || pick(/<link[^>]*href="([^"]+)"[^>]*>/i)
        || pick(/<link[^>]*>([\s\S]*?)<\/link>/i);
    } else {
      link = pick(/<link[^>]*>([\s\S]*?)<\/link>/i);
    }
    const dateStr = pick(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)
      || pick(/<published[^>]*>([\s\S]*?)<\/published>/i)
      || pick(/<updated[^>]*>([\s\S]*?)<\/updated>/i)
      || pick(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
    const desc = stripHtml(pick(/<description[^>]*>([\s\S]*?)<\/description>/i)
      || pick(/<summary[^>]*>([\s\S]*?)<\/summary>/i)
      || pick(/<content[^>]*>([\s\S]*?)<\/content>/i));
    if (!title || !/^https?:\/\//.test(link)) continue;
    const publishedAt = dateStr ? new Date(dateStr) : null;
    items.push({ title, link, publishedAt: publishedAt && !isNaN(publishedAt) ? publishedAt.toISOString() : null, summary: desc });
  }
  return items;
}

async function fetchRssOnce(feed) {
  const res = await fetchWithTimeout(feed.url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' } }, 15000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const parsed = parseFeed(xml);
  if (!parsed.length) throw new Error('no items parsed');
  return parsed;
}

async function fetchRssFeed(feed, okList, failList) {
  try {
    let parsed;
    try {
      parsed = await fetchRssOnce(feed);
    } catch {
      // one retry: rate limits and dropped connections are often transient
      await new Promise((r) => setTimeout(r, 2500));
      parsed = await fetchRssOnce(feed);
    }
    okList.push(feed.name);
    // release feeds publish many entries per day: prefer stable versions, keep the newest `cap`
    let chosen = parsed.slice(0, feed.cap || 50);
    if (feed.prefixTitle) {
      const stable = parsed.filter((p) => !/[-.](alpha|beta|rc|pre)[-.\w]*$/i.test(p.title));
      if (stable.length) chosen = stable.slice(0, feed.cap || 2);
    }
    return chosen.map((p) => makeItem({
      title: feed.prefixTitle ? `${feed.prefixTitle} ${p.title}` : p.title,
      url: p.link, source: feed.name, publishedAt: p.publishedAt,
      summary: truncate(p.summary, 240), weight: feed.weight, aiOnly: feed.aiOnly,
      category: feed.category,
    }));
  } catch (e) {
    failList.push({ name: feed.name, error: String(e.message || e) });
    return [];
  }
}

// --- Exa --------------------------------------------------------------------
async function exaSearch(q, okList, failList) {
  const key = process.env.EXA_API_KEY;
  if (!key) return [];
  try {
    const res = await fetchWithTimeout('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: q.query,
        numResults: q.numResults ?? 8,
        category: 'news',
        startPublishedDate: windowStart.toISOString(),
        contents: { summary: true, text: { maxCharacters: 700 } },
      }),
    }, 20000);
    if (!res.ok) throw new Error(`Exa HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 120)}`);
    const json = await res.json();
    if (!okList.includes('Exa Search')) okList.push('Exa Search');
    return (json.results || []).map((r) => {
      const d = r.publishedDate ? new Date(r.publishedDate) : null;
      return makeItem({
        title: stripHtml(r.title), url: r.url, source: hostOf(r.url) || 'web',
        publishedAt: d && !isNaN(d) ? d.toISOString() : null,
        summary: truncate(String(r.summary || '').replace(/^Summary:?\s*/i, '').replace(/^Here'?s a concise summary[^:]*:\s*/i, '') || stripHtml(r.text), 240), weight: 5,
      });
    });
  } catch (e) {
    failList.push({ name: `Exa: ${q.query.slice(0, 40)}`, error: String(e.message || e).slice(0, 120) });
    return [];
  }
}

// --- Hacker News (Algolia) ---------------------------------------------------
async function hnSearch(q, okList, failList) {
  try {
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q.query)}&tags=story&numericFilters=created_at_i>${Math.floor(windowStart.getTime() / 1000)},points>${q.minPoints}&hitsPerPage=20`;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': UA } }, 15000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!okList.includes('Hacker News')) okList.push('Hacker News');
    return (json.hits || [])
      .filter((h) => h.title && AI_KEYWORDS.test(h.title))
      .map((h) => makeItem({
        title: stripHtml(h.title),
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: h.url ? hostOf(h.url) : 'news.ycombinator.com',
        publishedAt: h.created_at,
        summary: `Discussed on Hacker News: ${h.points} points, ${h.num_comments || 0} comments.`,
        weight: 6, hnPoints: h.points,
        hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
      }));
  } catch (e) {
    failList.push({ name: `HN: ${q.query}`, error: String(e.message || e) });
    return [];
  }
}

// --- GitHub trending ----------------------------------------------------------
async function fetchGithubTrending(period, okList, failList) {
  try {
    const res = await fetchWithTimeout(`https://github.com/trending?since=${period}`, { headers: { 'User-Agent': UA } }, 20000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const articles = html.split('<article class="Box-row">').slice(1);
    if (!articles.length) throw new Error('no trending articles parsed');
    if (!okList.includes('GitHub Trending')) okList.push('GitHub Trending');
    const out = [];
    for (const art of articles) {
      // the repo link is the first two-segment href inside the h2 heading;
      // sponsor buttons appear earlier in the article and must not match
      const repo = art.match(/<h2[^>]*>\s*<a[^>]*href="\/([\w.\-]+\/[\w.\-]+)"/);
      if (!repo) continue;
      const name = repo[1];
      if (/^(sponsors|topics|explore|login|features|collections)\//i.test(name)) continue;
      const desc = stripHtml((art.match(/<p class="col-9[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '');
      if (!GITHUB.keywords.test(`${name} ${desc}`)) continue;
      const lang = stripHtml((art.match(/itemprop="programmingLanguage">([^<]+)</) || [])[1] || '');
      const starsMatch = art.match(/([\d,.]+)\s+stars\s+(today|this week)/);
      const periodLabel = period === 'daily' ? 'today' : 'this week';
      const metaNote = [
        starsMatch ? `${starsMatch[1]} stars ${periodLabel}` : `trending ${periodLabel}`,
        lang || null,
      ].filter(Boolean).join(' \u00b7 ');
      out.push(makeItem({
        title: name, url: `https://github.com/${name}`, source: 'GitHub Trending',
        publishedAt: null, summary: truncate(desc || 'No description provided.', 200),
        weight: 6, category: 'github', badge: `Trending ${periodLabel}`, metaNote,
      }));
    }
    return out;
  } catch (e) {
    failList.push({ name: `GitHub Trending (${period})`, error: String(e.message || e) });
    return [];
  }
}

// --- Hugging Face daily papers -------------------------------------------------
async function fetchHfPapers(okList, failList) {
  try {
    const res = await fetchWithTimeout('https://huggingface.co/api/daily_papers', { headers: { 'User-Agent': UA } }, 15000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!okList.includes('Hugging Face Papers')) okList.push('Hugging Face Papers');
    const inWindow = (json || []).filter((p) => {
      const d = p.publishedAt ? new Date(p.publishedAt) : null;
      return d && !isNaN(d) && d >= windowStart && d <= now;
    });
    return inWindow
      .sort((a, b) => (b.paper?.upvotes || 0) - (a.paper?.upvotes || 0))
      .slice(0, 10)
      .map((p) => makeItem({
        title: stripHtml(p.paper?.title || 'Untitled paper'),
        url: `https://huggingface.co/papers/${p.paper?.id}`,
        source: 'Hugging Face Papers', publishedAt: p.publishedAt,
        summary: truncate(p.paper?.summary || '', 220), weight: 5, category: 'research',
        metaNote: `${p.paper?.upvotes || 0} upvotes \u00b7 paper`,
      }));
  } catch (e) {
    failList.push({ name: 'Hugging Face Papers', error: String(e.message || e) });
    return [];
  }
}

// --- item assembly -------------------------------------------------------------
function makeItem({ title, url, source, publishedAt, summary, weight = 5, category, aiOnly, hnPoints, hnUrl, badge, metaNote }) {
  const ageH = publishedAt ? (now.getTime() - new Date(publishedAt).getTime()) / 3600e3 : null;
  const inWindow = publishedAt ? new Date(publishedAt) >= windowStart && new Date(publishedAt) <= new Date(now.getTime() + 3600e3) : true;
  const aiRelevant = aiOnly ? AI_KEYWORDS.test(`${title} ${summary}`) : true;
  const score = weight
    + (ageH != null ? Math.max(0, 5 * (1 - ageH / Math.max(windowMs / 3600e3, 1))) : 2)
    + (hnPoints ? Math.min(hnPoints / 25, 6) : 0);
  return {
    id: '', title, url, source, sourceHost: hostOf(url), publishedAt: publishedAt || null,
    summary: summary || '', category: category || classify(title, summary),
    score, badge: badge || null, metaNote: metaNote || null, hnUrl: hnUrl || null,
    _keep: inWindow && aiRelevant && title && /^https?:\/\//.test(url),
  };
}

// --- main -----------------------------------------------------------------------
const okSources = [], failedSources = [];
const jobs = [
  ...RSS_FEEDS.map((f) => fetchRssFeed(f, okSources, failedSources)),
  ...EXA_QUERIES.map((q) => exaSearch(q, okSources, failedSources)),
  ...HN_QUERIES.map((q) => hnSearch(q, okSources, failedSources)),
  ...GITHUB.periods.map((p) => fetchGithubTrending(p, okSources, failedSources)),
  fetchHfPapers(okSources, failedSources),
];
const results = await Promise.all(jobs);
let items = results.flat().filter((i) => i._keep);

// dedupe by url and title key, keeping the higher-scoring item
items.sort((a, b) => b.score - a.score);
const claimed = new Set();
const deduped = [];
for (const it of items) {
  const u = normUrl(it.url);
  const t = titleKey(it.title);
  if (claimed.has(u) || (t && claimed.has(t))) continue;
  claimed.add(u);
  if (t) claimed.add(t);
  deduped.push(it);
}
items = deduped;

// drop items seen on a previous run
const seen = new Set(state?.seen || []);
items = items.filter((i) => !seen.has(normUrl(i.url)) && !seen.has(titleKey(i.title)));
items.sort((a, b) => b.score - a.score);

// cap per category, then total
const perCat = { models: 16, tools: 12, github: 12, business: 14, research: 12, general: 14 };
const catCount = {};
items = items.filter((i) => {
  catCount[i.category] = (catCount[i.category] || 0) + 1;
  if (catCount[i.category] > (perCat[i.category] ?? 12)) return false;
  return true;
}).slice(0, MAX_ITEMS);
items.forEach((i, idx) => { i.id = `n${idx}`; delete i._keep; });

// the lead story needs a real summary: skip items whose only text is the HN meta line
const leadCandidate = items.slice(0, 8).find((i) => i.summary && i.summary.length > 80 && !/^Discussed on Hacker News/.test(i.summary));
if (leadCandidate) {
  const leadIdx = items.indexOf(leadCandidate);
  items.splice(leadIdx, 1);
  items.unshift(leadCandidate);
}

// render
const dateStr = now.toISOString().slice(0, 10);
const payload = {
  generatedAt: now.toISOString(),
  windowStart: windowStart.toISOString(),
  windowEnd: now.toISOString(),
  windowHours: +(windowMs / 3600e3).toFixed(1),
  items, okSources, failedSources,
  exaUsed: Boolean(process.env.EXA_API_KEY),
};
const html = renderPage(payload, dateStr);

const outPath = path.join(OUT_DIR, `ai-news-${dateStr}.html`);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(outPath, html);

// update state only after a successful write
if (!NO_STATE_UPDATE) {
  const newSeen = [...new Set([...(state?.seen || []), ...items.map((i) => normUrl(i.url)), ...items.map((i) => titleKey(i.title))])].slice(-3000);
  saveState({ lastRun: now.toISOString(), runCount: (state?.runCount || 0) + 1, seen: newSeen, lastOutput: outPath });
}

// console report
console.log(`\nItems: ${items.length}`);
for (const c of ['models', 'tools', 'github', 'business', 'research', 'general']) {
  console.log(`  ${c.padEnd(9)} ${items.filter((i) => i.category === c).length}`);
}
console.log(`\nSources OK (${okSources.length}): ${okSources.join(', ')}`);
if (failedSources.length) {
  console.log(`Sources failed (${failedSources.length}):`);
  for (const f of failedSources) console.log(`  - ${f.name}: ${f.error}`);
}
console.log(`\nWrote: ${outPath}`);
