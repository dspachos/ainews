---
name: ai-newspaper
description: >-
  Fetch latest AI news from project sources and generate a 1-page A4 broadsheet newspaper PDF saved under ~/Downloads.
  Use when the user asks to generate an AI newspaper, print today's AI news, export a 1-page AI digest PDF, or run the newspaper generator.
---

# AI Newspaper Generator

Fetches the latest AI news stories from all configured project feeds and generates an authentic, high-density, 1-page A4 broadsheet PDF ("The AI Chronicle") with white background and focused editorial sections.

## Quick Run

To generate today's newspaper:

```bash
node scripts/generate-newspaper.mjs
```

Or run directly from the skill directory:

```bash
node .agents/skills/ai-newspaper/scripts/generate-newspaper.mjs
```

The script will:
1. Fetch latest stories from all RSS, Hacker News, Hugging Face, and GitHub feeds defined in `scripts/sources.mjs` (default window: last 72 hours).
2. Rank, deduplicate, and curate the most important developments across Frontier Models, Security/Governance, Tools & Silicon, plus Rapid Intelligence flashes.
3. Render a clean broadsheet HTML layout designed specifically for standard A4 portrait.
4. Convert to PDF using headless Chrome with zero overflow (strictly 1 page).
5. Save the output to `~/Downloads/ai-news-newspaper-YYYY-MM-DD.pdf`.

## Command Line Options

| Option | Description | Default |
| --- | --- | --- |
| `--hours=N` | Time window to scan for news (in hours) | `72` |
| `--out=DIR` | Output directory for the HTML and PDF | `~/Downloads` |
| `--no-fetch` | Reuse already fetched HTML cache in `/tmp` without re-querying feeds | Off (always fetches fresh) |

## Layout Specifications

- **Format:** ISO 216 standard A4 (`210mm × 297mm`, `595pt × 842pt`), Portrait.
- **Strict 1-Page Guarantee:** Content density and typography are calibrated so the lead story, 3 thematic columns (12 feature articles), and the 8-item dispatch wire fill 93-96% of the vertical space with clean margins and zero multi-page spillover.
- **Design:** Pure white background (`#ffffff`), dark ink broadsheet typography (Times New Roman / Playfair Display), double masthead borders, and clear categorizations with no decorative fluff.
