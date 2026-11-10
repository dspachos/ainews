#!/usr/bin/env node
// ---------------------------------------------------------------------------
// AI News Digest — build docs/data.json from the archive editions.
//
// Every edition page embeds its structured payload in a
// <script id="news-data"> block. This script collects those payloads into
// one JSON index for the PWA (docs/pwa/), newest-first, capped at the last
// MAX_EDITIONS editions. Deterministic: the same archive produces the same
// bytes. Run by build.mjs after each edition; also runnable by hand.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE = path.join(SCRIPT_DIR, '..', 'docs', 'archive');
const OUT = path.join(SCRIPT_DIR, '..', 'docs', 'data.json');
const MAX_EDITIONS = 20;
const MAX_SUMMARY = 400;

const ITEM_FIELDS = [
  'category',
  'title',
  'url',
  'source',
  'sourceHost',
  'publishedAt',
  'badge',
  'summary',
  'hnUrl',
  'metaNote',
];

function payloadOf(file) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/id="news-data">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function compact(item) {
  const out = {};
  for (const key of ITEM_FIELDS) {
    const v = item[key];
    if (v == null || v === '') continue;
    out[key] = key === 'summary' && v.length > MAX_SUMMARY ? v.slice(0, MAX_SUMMARY - 1).trimEnd() + '…' : v;
  }
  return out;
}

export function buildIndex() {
  if (!fs.existsSync(ARCHIVE)) return;
  const files = fs.readdirSync(ARCHIVE)
    .filter((f) => /^ai-news-\d{4}-\d{2}-\d{2}\.html$/.test(f))
    .sort()
    .reverse();
  const editions = [];
  for (const f of files.slice(0, MAX_EDITIONS)) {
    const payload = payloadOf(path.join(ARCHIVE, f));
    if (!payload?.items?.length) continue;
    const items = payload.items.map(compact);
    editions.push({
      date: f.slice('ai-news-'.length, -'.html'.length),
      file: `archive/${f}`,
      lead: items[0] || null,
      items,
    });
  }
  if (!editions.length) return;
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: editions[0].date, editions }));
  const itemCount = editions.reduce((n, e) => n + e.items.length, 0);
  console.log(`Index: ${editions.length} edition(s), ${itemCount} item(s) -> docs/data.json`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  buildIndex();
}
