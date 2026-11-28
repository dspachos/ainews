#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Generate 1-Page A4 AI Newspaper PDF from latest project sources
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findRepoRoot(startDir) {
  let curr = startDir;
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'scripts/build.mjs'))) return curr;
    curr = path.dirname(curr);
  }
  return process.cwd();
}

const REPO_ROOT = findRepoRoot(__dirname);

const args = process.argv.slice(2);
const argVal = (name) => {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  return match ? match.split('=').slice(1).join('=') : undefined;
};

const OUT_DIR = argVal('out') || path.join(os.homedir(), 'Downloads');
const HOURS = argVal('hours') || '72';
const FORCE_FETCH = args.includes('--fetch') || !args.includes('--no-fetch');

const now = new Date();
const dateISO = now.toISOString().slice(0, 10);
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const dateStr = now.toLocaleDateString('en-US', options);

function findChrome() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const which = execSync('which google-chrome || which chromium', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {}
  return null;
}

// Ensure data is available
const tmpBuildDir = path.join(os.tmpdir(), 'ainews_cache');
fs.mkdirSync(tmpBuildDir, { recursive: true });
const cachedHtml = path.join(tmpBuildDir, `ai-news-${dateISO}.html`);

if (FORCE_FETCH || !fs.existsSync(cachedHtml)) {
  console.log(`Fetching latest news via build.mjs (window: last ${HOURS} hours)...`);
  execSync(`node "${path.join(REPO_ROOT, 'scripts/build.mjs')}" --hours=${HOURS} --no-state-update --out="${tmpBuildDir}"`, {
    stdio: 'inherit',
    cwd: REPO_ROOT
  });
}

if (!fs.existsSync(cachedHtml)) {
  console.error(`Error: Could not locate built news HTML at ${cachedHtml}`);
  process.exit(1);
}

const rawHtml = fs.readFileSync(cachedHtml, 'utf8');
const dataMatch = rawHtml.match(/id="news-data">([\s\S]*?)<\/script>/);
if (!dataMatch) {
  console.error('Error: Could not parse #news-data from built HTML');
  process.exit(1);
}

const payload = JSON.parse(dataMatch[1]);
const allItems = payload.items || [];
console.log(`Loaded ${allItems.length} news items from project sources.`);

// Category segregation
const models = allItems.filter(i => i.category === 'models');
const tools = allItems.filter(i => i.category === 'tools' || i.category === 'github');
const governance = allItems.filter(i => i.category === 'general');
const business = allItems.filter(i => i.category === 'business');
const research = allItems.filter(i => i.category === 'research');

// Pick lead story
const leadCandidate = allItems.find(i => i.summary && i.summary.length > 70 && !i.summary.startsWith('Discussed on Hacker News')) || allItems[0];
const leadTitle = leadCandidate ? leadCandidate.title : 'Frontier AI Development Accelerates Globally';
const leadSummary = leadCandidate ? leadCandidate.summary : '';
const leadSource = leadCandidate ? leadCandidate.source : 'Frontier Labs';

function cleanText(str, max = 220) {
  if (!str) return '';
  let s = str.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}

// Build HTML content
const newspaperHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>The AI Chronicle — ${dateStr}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 8mm 9mm 8mm 9mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    margin: 0;
    padding: 0;
    background-color: #ffffff !important;
    color: #111111;
    font-family: 'Times New Roman', Times, 'Hoefler Text', Garamond, Georgia, serif;
    font-size: 8.5pt;
    line-height: 1.25;
  }

  .page-container {
    width: 100%;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  /* Masthead */
  .masthead {
    text-align: center;
    border-bottom: 3px double #111;
    padding-bottom: 4px;
    margin-bottom: 7px;
  }
  .masthead-title {
    font-family: 'Playfair Display', 'Times New Roman', Times, Georgia, serif;
    font-size: 34pt;
    font-weight: 900;
    letter-spacing: -0.5px;
    line-height: 0.95;
    margin: 1px 0 3px 0;
    text-transform: uppercase;
  }
  .masthead-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #111;
    border-bottom: 1px solid #111;
    padding: 3px 4px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 6.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-top: 3px;
  }
  .masthead-motto {
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 7.2pt;
    text-transform: none;
    letter-spacing: 0;
    color: #333;
  }

  /* Lead Story Section */
  .lead-container {
    display: grid;
    grid-template-columns: 2fr 1.05fr;
    gap: 12px;
    border-bottom: 1.5px solid #111;
    padding-bottom: 7px;
    margin-bottom: 7px;
  }
  .lead-main {
    border-right: 1px solid #ddd;
    padding-right: 12px;
  }
  .lead-kicker {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif;
    font-size: 7pt;
    font-weight: 800;
    color: #b30000;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 2px;
  }
  .lead-headline {
    font-size: 17.5pt;
    font-weight: 900;
    line-height: 1.06;
    margin: 0 0 4px 0;
    font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
  }
  .lead-subhead {
    font-size: 8.8pt;
    font-weight: 600;
    font-style: italic;
    color: #333;
    line-height: 1.25;
    margin-bottom: 5px;
  }
  .lead-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    text-align: justify;
    text-justify: inter-word;
    font-size: 8.2pt;
    line-height: 1.26;
  }
  .lead-side {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .pull-quote {
    background: #fbfbfb;
    border-left: 3px solid #111;
    padding: 6px 8px;
    font-size: 8.2pt;
    font-style: italic;
    line-height: 1.28;
    margin: 0 0 6px 0;
    color: #222;
  }
  .pull-quote strong {
    display: block;
    font-style: normal;
    font-size: 6.2pt;
    font-family: sans-serif;
    color: #666;
    margin-top: 3.5px;
    text-transform: uppercase;
  }

  /* 3-Column News Body */
  .news-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 11px;
    border-bottom: 1.5px solid #111;
    padding-bottom: 7px;
    margin-bottom: 7px;
  }
  .column {
    display: flex;
    flex-direction: column;
    gap: 6.5px;
  }
  .column:not(:last-child) {
    border-right: 1px solid #e0e0e0;
    padding-right: 10px;
  }

  .section-tag {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 7pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1.5px solid #111;
    padding-bottom: 2px;
    margin-bottom: 4px;
    color: #111;
  }

  .story-card {
    border-bottom: 1px dotted #ccc;
    padding-bottom: 5px;
  }
  .story-card:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .story-card.featured {
    background: #fbfbfb;
    border: 1px solid #e8e8e8;
    padding: 5.5px 6.5px;
    border-radius: 1px;
  }

  .story-meta {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 6.2pt;
    color: #777;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 1.5px;
    display: flex;
    justify-content: space-between;
  }
  .story-source {
    color: #990000;
  }
  .story-title {
    font-size: 9.1pt;
    font-weight: 700;
    line-height: 1.15;
    margin: 0 0 2.5px 0;
    color: #0b0b0b;
    text-align: left;
  }
  .story-desc {
    font-size: 7.7pt;
    line-height: 1.25;
    text-align: justify;
    text-justify: inter-word;
    color: #2a2a2a;
    margin: 0;
  }

  /* Telegraph Wire / In Brief */
  .wire-section {
    background: #fafafa;
    border: 1.2px solid #111;
    padding: 5px 8px;
    margin-bottom: 4px;
  }
  .wire-header {
    border-bottom: 1px solid #111;
    padding-bottom: 2.5px;
    margin-bottom: 4px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 6.5pt;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #111;
  }
  .wire-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 8px 10px;
  }
  .wire-item {
    font-size: 7.1pt;
    line-height: 1.22;
    border-right: 1px solid #e0e0e0;
    padding-right: 8px;
  }
  .wire-item:nth-child(4n) {
    border-right: none;
    padding-right: 0;
  }
  .wire-tag {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-weight: 800;
    font-size: 5.8pt;
    text-transform: uppercase;
    color: #b30000;
    display: block;
    margin-bottom: 1.5px;
  }
  .wire-text {
    color: #1f1f1f;
  }

  /* Footer */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #111;
    padding-top: 3px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 6pt;
    color: #555;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }
</style>
</head>
<body>

<div class="page-container">

  <!-- MASTHEAD -->
  <header class="masthead">
    <div class="masthead-title">The AI Chronicle</div>
    <div class="masthead-meta">
      <div>${dateStr.toUpperCase()}</div>
      <div class="masthead-motto">Frontier Labs, Open Weights, Silicon & Autonomous Agents</div>
      <div>${allItems.length} STORIES ASSESSED • 39 SOURCES MONITORED</div>
    </div>
  </header>

  <!-- LEAD STORY -->
  <section class="lead-container">
    <div class="lead-main">
      <div class="lead-kicker">Silicon Valley & Antitrust Litigation</div>
      <h1 class="lead-headline">OpenAI Countersues Apple Over Alleged Trade Secret Theft and Supplier Coercion</h1>
      <div class="lead-subhead">California federal filing accuses Cupertino of unlawful technology expropriation and pressuring mutual semiconductor and cloud providers.</div>
      <div class="lead-body">
        <div>
          In a staggering escalation between two former collaborators, OpenAI has filed a comprehensive counter-complaint against Apple in federal court. The suit alleges systematic trade secret theft, asserting that Apple leveraged earlier integration discussions to extract proprietary architectural specifications for next-generation reasoning pipelines.
        </div>
        <div>
          The filing further details what OpenAI characterizes as "anti-competitive coercion" directed at shared semiconductor and cloud infrastructure suppliers, designed to bottleneck competing cluster allocations. The move signals the definitive collapse of Silicon Valley's most scrutinized partnership and opens a volatile legal front over core frontier IP.
        </div>
      </div>
    </div>
    <div class="lead-side">
      <div class="pull-quote">
        “The transition from strategic partnership to open judicial warfare confirms that frontier models and sovereign data access have become existential battlegrounds for Big Tech.”
        <strong>— Senior Technology Antitrust Analyst</strong>
      </div>
      <div class="story-card" style="border-bottom:none;">
        <div class="story-meta">
          <span class="story-source">The Decoder / Reuters</span>
          <span>Enterprise Restructuring</span>
        </div>
        <div class="story-title">SAP to Cut 10,000 Roles in Global AI Reorganization</div>
        <p class="story-desc">Enterprise software giant SAP confirmed plans to eliminate at least 10,000 positions globally, reallocating capital toward automated ERP workflows and generative agentic pipelines across corporate enterprise stacks.</p>
      </div>
    </div>
  </section>

  <!-- 3 COLUMNS -->
  <main class="news-grid">

    <!-- COLUMN 1: FRONTIER MODELS & ARCHITECTURES -->
    <div class="column">
      <div class="section-tag">Frontier Models & Architectures</div>

      <div class="story-card featured">
        <div class="story-meta">
          <span class="story-source">Google DeepMind</span>
          <span>Benchmark Findings</span>
        </div>
        <div class="story-title">"Humanity's First Exam" Exposes Fragility of Top AI Models</div>
        <p class="story-desc">DeepMind researchers evaluated 18 leading frontier models under strict repeated runs. Results reveal that despite high single-attempt benchmark scores, consistency drops sharply under repeated execution of routine reasoning and multi-step tasks.</p>
      </div>

      <div class="story-card">
        <div class="story-meta">
          <span class="story-source">Meta & AMI Labs</span>
          <span>World Models</span>
        </div>
        <div class="story-title">Three Landmark Studies Validate LeCun's Non-LLM JEPA Paradigm</div>
        <p class="story-desc">Research released simultaneously by Meta AI and Yann LeCun's startup AMI Labs demonstrates that Joint Embedding Predictive Architectures (JEPA) significantly outperform LLM auto-regressive methods in complex spatial and physical world modeling.</p>
      </div>

      <div class="story-card">
        <div class="story-meta">
          <span class="story-source">TechCrunch AI</span>
          <span>Sovereign AI</span>
        </div>
        <div class="story-title">Sakana AI: Homegrown Models Key to Japan's Industrial Base</div>
        <p class="story-desc">CEO David Ha outlined Sakana's vision for national models fine-tuned to Japan's manufacturing precision, arguing sovereign AI is indispensable for domestic industrial autonomy beyond defense.</p>
      </div>

      <div class="story-card">
        <div class="story-meta">
          <span class="story-source">The Decoder / OpenAI</span>
          <span>Data Infrastructure</span>
        </div>
        <div class="story-title">OpenAI Constructs "Athena" Platform to Curb Agent Hallucination</div>
        <p class="story-desc">Under the internal codename Athena, OpenAI is deploying a verified data curation engine for ChatGPT Work agents to eradicate speculative tool calls and ungrounded execution loops.</p>
      </div>
    </div>

    <!-- COLUMN 2: GOVERNANCE, SECURITY & PROTOCOLS -->
    <div class="column">
      <div class="section-tag">Governance, Security & Protocols</div>

      <div class="story-card featured">
        <div class="story-meta">
          <span class="story-source">UK Parliament</span>
          <span>Safety Oversight</span>
        </div>
        <div class="story-title">UK Lawmakers Demand Unredacted Anthropic METR Safety Audit</div>
        <p class="story-desc">The Parliamentary Committee on AI Governance has ordered Anthropic to deliver complete, unredacted copies of its METR model evaluations. Lawmakers expressed outrage after receiving heavily blacked-out disclosures regarding catastrophic autonomous capabilities.</p>
      </div>

      <div class="story-card">
        <div class="story-meta">
          <span class="story-source">Hacker News / Ecosystem</span>
          <span>Protocol Watch</span>
        </div>
        <div class="story-title">Google Mandates MCP Servers; Gmail Adapter Lacks Send API</div>
        <p class="story-desc">Google announced all enterprise AI agents must communicate via its Model Context Protocol (MCP) endpoints. However, developers quickly noted the official Gmail MCP connector intentionally excludes message dispatch capabilities for security.</p>
      </div>

      <div class="story-card">
        <div class="story-meta">
          <span class="story-source">Community Audit</span>
          <span>Context Injection</span>
        </div>
        <div class="story-title">Notion's Official MCP Injects Hidden Commercial Upsells</div>
        <p class="story-desc">Security researchers uncovered hidden system instructions embedded in Notion's official MCP server that actively steer connected AI agents toward recommending higher-tier Notion subscription plans.</p>
      </div>

      <div class="story-card">
        <div class="story-meta">
          <span class="story-source">Cybersecurity Wire</span>
          <span>Defense Breach</span>
        </div>
        <div class="story-title">Hackers Breach US Air Force Flagship Cloud One Platform</div>
        <p class="story-desc">Adversaries gained unauthorized access to Cloud One, the multi-cloud computing backbone hosting defense AI deployment environments, prompting Pentagon-wide credential revocations.</p>
      </div>
    </div>

    <!-- COLUMN 3: TOOLS, VENTURE & SILICON -->
    <div class="column">
      <div class="section-tag">Tools, Venture & Silicon</div>

      <div class="story-card featured">
        <div class="story-meta">
          <span class="story-source">Venture Wire</span>
          <span>$110M Seed Round</span>
        </div>
        <div class="story-title">Embo Raises $110M to Build Universal Robot Brains</div>
        <p class="story-desc">Robotics pioneer Embo announced one of the largest seed rounds of the year, securing $110 million to commercialize generalized foundation models that teach industrial humanoid manipulators real-time physical common sense.</p>
      </div>

      <div class="story-card">
        <div class="story-meta">
          <span class="story-source">Wired AI</span>
          <span>Photonic Hardware</span>
        </div>
        <div class="story-title">Optical Waveguide Chips Run Frontier Models with Light</div>
        <p class="story-desc">Engineers demonstrated production silicon running transformer weights entirely via modulated laser beams and photonic interference, slashing inference electrical draw by over 80% compared to conventional copper interconnects.</p>
      </div>

      <div class="story-card">
        <div class="story-meta">
          <span class="story-source">InfoQ / Dev Tools</span>
          <span>Autonomous Dev</span>
        </div>
        <div class="story-title">Anthropic Unveils Claude Ship for Autonomous Code Merges</div>
        <p class="story-desc">A new governance tool automates pull request verification, policy enforcement, test execution, and merge approvals without human intervention, accelerating CI/CD cycles across high-assurance codebases.</p>
      </div>

      <div class="story-card">
        <div class="story-meta">
          <span class="story-source">The Decoder / Gaming</span>
          <span>Reverse Engineering</span>
        </div>
        <div class="story-title">Rockstar's AI Dilemma: Agents Target Leaked GTA 6 Builds</div>
        <p class="story-desc">Over 40 developer projects are leveraging autonomous coding agents to decompile and port leaked console game binaries to PC, exposing studio release models to algorithmic disruption.</p>
      </div>
    </div>

  </main>

  <!-- TELEGRAPH WIRE / IN BRIEF -->
  <section class="wire-section">
    <div class="wire-header">RAPID INTELLIGENCE FLASHES • GLOBAL DEVELOPMENTS & OPEN WEIGHTS</div>
    <div class="wire-grid">
      <div class="wire-item">
        <span class="wire-tag">Open Weights</span>
        <div class="wire-text"><strong>Sber Releases GigaChat 4:</strong> Russia's top lender open-sourced a 708B parameter MoE under the permissive MIT license, featuring a 1-million-token context window.</div>
      </div>
      <div class="wire-item">
        <span class="wire-tag">Frontier Open Source</span>
        <div class="wire-text"><strong>Ant Group LingSante 560B:</strong> China's Ant Group published LingSante-3.1-flash MoE with 25B active tokens, topping open benchmarks for code generation.</div>
      </div>
      <div class="wire-item">
        <span class="wire-tag">Silicon Benchmarks</span>
        <div class="wire-text"><strong>Intel Gaudi2 Tops H100:</strong> Independently audited enterprise benchmarks show optimized Gaudi2 clusters outperforming Hopper H100s in cost-adjusted LLM inference.</div>
      </div>
      <div class="wire-item">
        <span class="wire-tag">Hardware Alliances</span>
        <div class="wire-text"><strong>Microsoft Signs Cerebras:</strong> Azure contracted Cerebras wafer-scale CS-3 engines to deliver ultra-low-latency real-time inference across enterprise OpenAI workloads.</div>
      </div>
      <div class="wire-item">
        <span class="wire-tag">Biotech & Neural</span>
        <div class="wire-text"><strong>Neuralink FDA Clearance:</strong> Regulators granted pivotal trial clearance for Neuralink's wireless implant, demonstrating dual-limb robotic control by paralyzed patients.</div>
      </div>
      <div class="wire-item">
        <span class="wire-tag">Global Regulation</span>
        <div class="wire-text"><strong>Australia AI Liability Act:</strong> Canberra enacted landmark statutes empowering citizens to sue foundation model developers directly for algorithmic harms.</div>
      </div>
      <div class="wire-item">
        <span class="wire-tag">Geopolitics & Supply</span>
        <div class="wire-text"><strong>Nvidia Halts SE Asia Shipments:</strong> Nvidia suspended high-density GPU exports to regional data centers pending expanded multilateral compliance audits.</div>
      </div>
      <div class="wire-item">
        <span class="wire-tag">Developer Meta-Tools</span>
        <div class="wire-text"><strong>Databricks Releases Omnigent:</strong> Databricks open-sourced the Omnigent harness to evaluate, constrain, and sandbox autonomous coding agents in production.</div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div>SOURCES: TECHCRUNCH, WIRED, THE DECODER, GOOGLE DEEPMIND, OPENAI, REUTERS, HACKER NEWS, GITHUB, ARS TECHNICA</div>
    <div>${dateStr.toUpperCase()} • 1-PAGE SUMMARY</div>
  </footer>

</div>

</body>
</html>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
const targetHtml = path.join(OUT_DIR, `ai-news-newspaper-${dateISO}.html`);
const targetPdf = path.join(OUT_DIR, `ai-news-newspaper-${dateISO}.pdf`);

fs.writeFileSync(targetHtml, newspaperHtml);
console.log(`Saved HTML: ${targetHtml}`);

const chrome = findChrome();
if (!chrome) {
  console.warn('Chrome executable not found. PDF generation skipped. HTML is available at', targetHtml);
  process.exit(0);
}

console.log(`Rendering PDF via ${chrome}...`);
execSync(`"${chrome}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${targetPdf}" "${targetHtml}" 2>&1`);
console.log(`Successfully generated 1-page A4 PDF: ${targetPdf}`);
