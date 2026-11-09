# PWA Plan — AI News Digest App

A progressive web app under `https://dspachos.github.io/ainews/pwa/`. The repo
is public, so GitHub Pages serves it on the free plan. The look and feel
follows the Apple News app: a Today feed, card stacks, serif headlines, a
bottom tab bar, and a clean reader view. The app is a port of the working
prototype built in the private `ai-brief` repo, adapted to this repo's data.

## Goal and constraints

- The PWA is a read-only consumer of the daily digest. The workflow, the
  build script, and the archive stay as they are.
- No build pipeline for the app itself. Plain HTML, CSS, and JavaScript in
  `docs/pwa/`, served by the existing Pages setup (`docs/` folder).
- All asset paths stay relative, so the app works under the `/ainews/`
  subpath.

## Data layer

Every edition HTML embeds its structured payload in a
`<script id="news-data">` block (items with title, url, source, sourceHost,
summary, category, hnUrl). The site has no JSON index today.

- New `scripts/build-index.mjs`: reads `docs/archive/*.html`, extracts each
  `#news-data` payload, and writes `docs/data.json` — editions newest-first,
  capped at the last 30 editions, each with `{date, file, lead, items}` and
  compact item fields.
- `build.mjs` calls the index builder after a successful edition write, so
  the daily workflow keeps `data.json` fresh with no workflow edits.
- `data.json` is generated, never hand-edited. The first run backfills the
  23 existing editions.

## Screens

| Screen | Route | Content |
|---|---|---|
| Today | `#/today` | Latest edition: date header, hero card for the lead story, market of news grouped by section, story cards. |
| Editions | `#/editions` | Edition list from `data.json`, 12 per page like the site's approach. |
| Edition | `#/edition/:date` | All six sections with cards and rows, straight from `data.json`. |
| Reader | `#/story/:date/:idx` | Serif summary, "Continue on source", HN discussion link when present, save action. |
| Search | `#/search` | Client-side search over all indexed editions, capped at 30 results. |
| Saved | `#/saved` | Saved stories in `localStorage`, kept as full copies. |

Navigation: bottom tab bar on phones (Today, Editions, Search, Saved) and a
sidebar on wide screens. Section names follow the renderer: Models &
Releases, AI Tools & Agents, GitHub Trending, Companies & Business, Research
& Papers, More AI News.

## PWA plumbing

- `manifest.webmanifest` with relative `start_url` and `scope`, icons at 192
  and 512 px plus maskable and apple-touch variants (new mark: navy square,
  white serif "N").
- `sw.js` registered with scope `./pwa/`, so it never intercepts the digest
  site. Precached shell and `data.json`, stale-while-revalidate for
  `data.json`, offline banner with the cache date.
- Bump the cache `VERSION` in `sw.js` whenever a shell file changes.

## Steps

One concern per commit:

1. `docs: add PWA plan tailored to this repo`
2. `feat(data): build docs/data.json index from archive editions`
3. `feat(pwa): scaffold app shell`
4. `feat(pwa): today and edition screens`
5. `feat(pwa): offline caching`
6. `feat(pwa): search and saved screens`
7. `feat(pwa): reader, dark mode, polish`
8. `docs: describe the app in the README`

## Invariants

- The PWA never writes repo data.
- Every item links its source. The app does not fabricate content.
- `data.json` is generated, never hand-edited.
- The daily digest page and archive keep their current shape.

## Testing

- `python3 -m http.server 8080` from the repo root, then open
  `http://localhost:8080/docs/pwa/`.
- After push: `https://dspachos.github.io/ainews/pwa/` on a real iPhone —
  Add to Home Screen, then airplane-mode reload.
