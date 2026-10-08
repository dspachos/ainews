# AI News Digest

A daily AI news page, built with Node and published to GitHub Pages. It
collects AI news from RSS feeds, Exa search, Hacker News, GitHub Trending,
and Hugging Face papers, then renders one newspaper-style HTML page.

The page has six sections: Models & Releases, AI Tools & Agents, GitHub
Trending, Companies & Business, Research & Papers, and More AI News. Every
item links to its original source.

## Setup

1. Create the GitHub repository and push this repo to it.
2. Add the repository secret `EXA_API_KEY` (Settings, Secrets and variables,
   Actions). Without it the build still runs, but Exa stories are missing.
3. Enable Pages: Settings, Pages, Source "Deploy from a branch", branch
   `main`, folder `/docs`. The site is then at
   `https://<user>.github.io/<repo>/`.

## How it runs

A scheduled workflow (`.github/workflows/digest.yml`) runs on working days
at 05:30 UTC. It builds the page, keeps the dated file under `docs/archive/`,
copies it to `docs/index.html`, and commits everything back. Pages serves
the committed files, so every run stays in the repository as an archive.

The build reads `state.json` at the repository root. It stores the last run
time and the items already shown. The next run fetches news from the last
run to now, so a missed day extends the window automatically. The window is
capped at 7 days.

## Local run

```bash
node scripts/build.mjs --out=docs/archive
cp "docs/archive/ai-news-$(date -u +%F).html" docs/index.html
```

Options:

| Option | Effect |
| --- | --- |
| `--hours=N` | Override the window to the last N hours. |
| `--since=ISO` | Start the window at an ISO date-time. |
| `--no-state-update` | Do not change `state.json`. |
| `--out=DIR` | Write the HTML to another directory. |
| `--max=N` | Cap the total story count (default 90). |

## Sources

Edit `scripts/sources.mjs` to add or remove feeds, queries, or classifier
rules. No other file needs changes.

## Costs

GitHub Actions and Pages are free for a public repository. Exa usage is
about 10 requests and 140 content pages per run, roughly $0.20 per run,
which stays inside Exa's monthly free credits.
