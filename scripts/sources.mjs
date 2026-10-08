// ---------------------------------------------------------------------------
// Source definitions for the AI News Digest.
// Edit this file to add, remove, or tune sources. No other file needs changes.
// ---------------------------------------------------------------------------

// RSS / Atom feeds. `weight` ranks items for the lead story (higher = better).
// `aiOnly: true` filters items by AI keywords (for general-purpose feeds).
export const RSS_FEEDS = [
  { name: 'TechCrunch AI',        url: 'https://techcrunch.com/category/artificial-intelligence/feed/', weight: 7 },
  { name: 'The Verge AI',         url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', weight: 7 },
  { name: 'Ars Technica AI',      url: 'https://arstechnica.com/ai/feed/', weight: 7 },
  { name: 'Wired AI',             url: 'https://www.wired.com/feed/tag/ai/latest/rss', weight: 7 },
  { name: 'MIT Technology Review',url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', weight: 8 },
  { name: 'SiliconANGLE AI',      url: 'https://siliconangle.com/category/ai/feed/', weight: 6 },
  { name: 'Dataconomy',           url: 'https://dataconomy.com/feed/', weight: 5 },
  { name: 'The Decoder',          url: 'https://the-decoder.com/feed/', weight: 7 },
  { name: 'MarkTechPost',         url: 'https://www.marktechpost.com/feed/', weight: 5 },
  { name: 'ZDNet AI',             url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml', weight: 5 },
  { name: 'OpenAI News',          url: 'https://openai.com/news/rss.xml', weight: 8 },
  { name: 'Google DeepMind',      url: 'https://deepmind.google/blog/rss.xml', weight: 8 },
  { name: 'Hugging Face Blog',    url: 'https://huggingface.co/blog/feed.xml', weight: 6 },
  { name: 'BAIR Blog',            url: 'https://bair.berkeley.edu/blog/feed.xml', weight: 5 },
  { name: 'Import AI',            url: 'https://importai.substack.com/feed', weight: 5 },
  { name: 'Latent Space',         url: 'https://www.latent.space/feed', weight: 5 },
  { name: 'Interconnects',        url: 'https://www.interconnects.ai/feed', weight: 5 },
  { name: 'One Useful Thing',     url: 'https://www.oneusefulthing.org/feed', weight: 5, aiOnly: true },
  { name: 'Simon Willison',       url: 'https://simonwillison.net/atom/everything/', weight: 6, aiOnly: true },
  // AI developer tools: vendor blogs and GitHub release feeds.
  // `cap` limits items per run: release feeds publish many versions per day.
  // `prefixTitle` prefixes the repo name, because release titles are bare version numbers.
  { name: 'GitHub Blog',          url: 'https://github.blog/feed/', weight: 6, aiOnly: true, category: 'tools' },
  { name: 'GitHub Changelog',     url: 'https://github.blog/changelog/feed/', weight: 5, aiOnly: true, category: 'tools' },
  { name: 'JetBrains Blog',       url: 'https://blog.jetbrains.com/feed/', weight: 5, aiOnly: true, category: 'tools' },
  { name: 'Claude Code Releases', url: 'https://github.com/anthropics/claude-code/releases.atom', weight: 6, category: 'tools', cap: 2, prefixTitle: 'claude-code' },
  { name: 'Codex Releases',       url: 'https://github.com/openai/codex/releases.atom', weight: 6, category: 'tools', cap: 2, prefixTitle: 'codex' },
  { name: 'OpenCode Releases',    url: 'https://github.com/sst/opencode/releases.atom', weight: 5, category: 'tools', cap: 2, prefixTitle: 'opencode' },
  { name: 'Aider Releases',       url: 'https://github.com/Aider-AI/aider/releases.atom', weight: 5, category: 'tools', cap: 1, prefixTitle: 'aider' },
  { name: 'Cline Releases',       url: 'https://github.com/cline/cline/releases.atom', weight: 5, category: 'tools', cap: 1, prefixTitle: 'cline' },
];

// Pre-defined Exa search queries. Each query runs as a "news" category search
// restricted to the run window (since last run).
// Needs EXA_API_KEY in the environment. If missing, Exa is skipped.
export const EXA_QUERIES = [
  { query: 'new AI model release announcement', numResults: 8 },
  { query: 'OpenAI Anthropic Google DeepMind new model announcement', numResults: 8 },
  { query: 'open source LLM model release', numResults: 8 },
  { query: 'AI startup funding round raises millions', numResults: 6 },
  { query: 'AI company acquisition deal partnership', numResults: 6 },
  { query: 'AI regulation policy government', numResults: 6 },
  { query: 'AI research breakthrough benchmark study', numResults: 6 },
  { query: 'AI agent product launch tool', numResults: 6 },
  { query: 'AI coding agent tool news Claude Code Codex OpenCode', numResults: 8 },
  { query: 'AI developer tools launch update Cursor Windsurf Copilot', numResults: 6 },
];

// Hacker News (Algolia API). Stories must pass `minPoints` and match the query.
export const HN_QUERIES = [
  { query: 'openai', minPoints: 80 },
  { query: 'anthropic claude', minPoints: 60 },
  { query: 'google gemini deepmind', minPoints: 60 },
  { query: 'llm model released', minPoints: 60 },
  { query: 'ai agent', minPoints: 80 },
  { query: 'claude code', minPoints: 40 },
  { query: 'opencode aider', minPoints: 30 },
  { query: 'cursor windsurf', minPoints: 80 },
  { query: 'artificial intelligence', minPoints: 100 },
];

// GitHub trending. Repos must match AI keywords in name or description.
export const GITHUB = {
  periods: ['daily', 'weekly'],   // both are fetched, weekly items win dedupe
  keywords: /\b(ai|a\.i|llm|llms|gpt|agent|agents|transformer|diffusion|rag|mcp|machine.?learning|deep.?learning|neural|neural.?net|openai|anthropic|claude|gemini|llama|mistral|deepseek|qwen|kimi|gemma|phi-?[0-9]|embedding|inference|fine.?tun|multimodal|vision.?model|speech|tts|asr|ocr|whisper|stable.?diffusion|flux|vllm|ollama|langchain|autogen|copilot)\b/i,
};

// General AI keyword filter used for `aiOnly` feeds and HN noise control.
export const AI_KEYWORDS = /\b(ai|a\.i\.?|llm|llms|gpt|chatgpt|claude|gemini|llama|openai|anthropic|deepmind|mistral|deepseek|machine.?learning|deep.?learning|neural|transformer|diffusion|prompt|agent|rag|fine.?tun|multimodal|artificial.?intelligence|copilot|embedding)\b/i;

// Category keyword classifier. Checked in this order.
// Tools come first: tool names like "Claude Code" would also match the models rules.
export const CATEGORY_KEYWORDS = [
  ['tools', /\b(claude ?code|codex|opencode|cursor|windsurf|copilot|aider|cline|devin|herdr|gemini cli|amp code|coding agent|ai pair|agentic (ide|cli)|ai (coding|code) (agent|assistant|ide|tool)|code (editor|assistant)|developer tools?|devtools|mcp|vs ?code|jetbrains|neovim|emacs)\b/i],
  ['models', /\b(launch|launches|launched|release|releases|released|announc|announce|unveil|unveiled|introduc|debut|ships|ship|open.?sourc|weights|checkpoint|model|models|llm|llms|gpt-?\d|api|beta|preview|version|upgrade|tool)\b/i],
  ['business', /\b(funding|raises|raised|series [a-z]|acquisition|acquires|acquired|merger|ipo|valuation|billion|million|investment|invests|lawsuit|sue[sd]?|regulat|policy|ban|bans|privacy|copyright|license|deal|partnership|layoff|layoffs|hire[sd]?|ceo|executive|market|stocks?|earnings)\b/i],
  ['research', /\b(paper|arxiv|researchers|study|benchmark|evaluation|dataset|survey|ablation)\b/i],
];
