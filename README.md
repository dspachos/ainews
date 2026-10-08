# AI News Digest

[![Daily digest](https://github.com/dspachos/ainews/actions/workflows/digest.yml/badge.svg)](https://github.com/dspachos/ainews/actions/workflows/digest.yml)

**Read today's edition: <https://dspachos.github.io/ainews/>**

A daily AI newspaper, built with Node and published to GitHub Pages. Every
working day it collects AI news from RSS feeds, Exa search, Hacker News,
GitHub Trending, and Hugging Face papers, then renders one clean,
newspaper-style page.

The page has six sections: Models & Releases, AI Tools & Agents, GitHub
Trending, Companies & Business, Research & Papers, and More AI News. Every
item links to its original source. Each edition stays online in the
[archive](https://github.com/dspachos/ainews/tree/main/docs/archive).

## How it works

1. A scheduled GitHub Actions workflow runs on working days at 05:30 UTC.
2. `scripts/build.mjs` fetches news published since the last run, deduplicates
   and classifies it, and renders one self-contained HTML page.
3. The workflow stores the dated page under `docs/archive/`, copies it to
   `docs/index.html`, and commits everything back to `main`.
4. GitHub Pages publishes the `docs/` folder of the `main` branch.

`state.json` at the repository root stores the last run time and the items
already shown. The next run fetches only news from the last run to now, so a
missed day extends the window automatically. The window is capped at 7 days,
and no story appears twice across editions.

## Sources

| Type | Sources |
| --- | --- |
| RSS feeds | TechCrunch, The Verge, Ars Technica, Wired, MIT Technology Review, OpenAI, Google DeepMind, Hugging Face blog, The Decoder, MarkTechPost, ZDNet, SiliconANGLE, Dataconomy, practitioner blogs |
| Tool release feeds | Claude Code, Codex, OpenCode, Aider, Cline (GitHub releases), GitHub Blog, GitHub Changelog, JetBrains |
| Exa search | Pre-defined queries for model releases, funding, deals, regulation, research, and tools |
| Hacker News | Algolia searches with a minimum score |
| GitHub Trending | Daily and weekly, filtered by AI keywords |
| Papers | Hugging Face daily papers |

Edit `scripts/sources.mjs` to add or remove any of these. No other file
needs changes.

## Local run

```bash
node scripts/build.mjs --out=docs/archive
cp "docs/archive/ai-news-$(date -u +%F).html" docs/index.html
```

| Option | Effect |
| --- | --- |
| `--hours=N` | Override the window to the last N hours. |
| `--since=ISO` | Start the window at an ISO date-time. |
| `--no-state-update` | Do not change `state.json`. |
| `--out=DIR` | Write the HTML to another directory. |
| `--max=N` | Cap the total story count (default 90). |

## Setup

This repository is already configured. For reference, the pieces are:

- Repository secret `EXA_API_KEY` (Settings, Secrets and variables, Actions).
  Without it the build still runs, but Exa stories are missing.
- Pages enabled from the `main` branch, `/docs` folder.
- The workflow needs `contents: write` to commit the daily page.
