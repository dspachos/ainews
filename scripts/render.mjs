// Renders the digest page. NYT-inspired: serif masthead and headlines,
// thin rules, generous whitespace, light theme. Tailwind CSS + vanilla JS.

const CAT_META = {
  models:   { label: 'Models & Releases', tab: 'Models',   anchor: 'models' },
  tools:    { label: 'AI Tools & Agents', tab: 'Tools',    anchor: 'tools' },
  github:   { label: 'GitHub Trending',   tab: 'GitHub',   anchor: 'github' },
  business: { label: 'Companies & Business', tab: 'Companies', anchor: 'business' },
  research: { label: 'Research & Papers', tab: 'Research', anchor: 'research' },
  general:  { label: 'More AI News',      tab: 'More',     anchor: 'general' },
};
const CAT_ORDER = ['models', 'tools', 'github', 'business', 'research', 'general'];

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderPage(payload, dateStr) {
  const json = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const prettyDate = new Date(payload.generatedAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const windowLabel = `${new Date(payload.windowStart).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} \u2014 ${new Date(payload.windowEnd).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;

  // Page script must avoid template literals: it is embedded as a plain string.
  const pageScript = [
    "function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}",
    "function timeAgo(iso){if(!iso)return'';var s=(Date.now()-new Date(iso).getTime())/1e3;if(s<0)s=0;if(s<3600)return Math.max(1,Math.round(s/60))+' min ago';if(s<86400)return Math.round(s/3600)+'h ago';var d=Math.round(s/86400);return d===1?'1 day ago':d+' days ago';}",
    "function favicon(host){return host?'https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=64':'';}",
    "var CATS={models:'Models & Releases',tools:'AI Tools & Agents',github:'GitHub Trending',business:'Companies & Business',research:'Research & Papers',general:'More AI News'};",
    "var CAT_ORDER=['models','tools','github','business','research','general'];",
    "var DATA=JSON.parse(document.getElementById('news-data').textContent);",
    "var state={cat:'all',q:''};",
    "function kicker(it,cls){var t=it.badge?it.badge:timeAgo(it.publishedAt);var h='';",
    "  h+='<div class=\"flex items-center gap-2 '+cls+'\">';",
    "  if(it.sourceHost)h+='<img src=\"'+favicon(it.sourceHost)+'\" alt=\"\" width=\"14\" height=\"14\" class=\"w-3.5 h-3.5 rounded-sm\" loading=\"lazy\" onerror=\"this.style.display=\\'none\\'\">';",
    "  h+='<span class=\"text-[11px] font-sans font-semibold uppercase tracking-[0.14em] text-stone-500\">'+esc(it.source)+'</span>';",
    "  h+='<span class=\"text-stone-300\">&#183;</span>';",
    "  h+='<span class=\"text-[11px] font-sans uppercase tracking-[0.08em] text-stone-400\">'+esc(t)+'</span>';",
    "  h+='</div>';return h;}",
    "function card(it){var h='<article class=\"border-t border-stone-200 pt-4\">';",
    "  h+=kicker(it);",
    "  h+='<h3 class=\"font-serif text-[1.2rem] leading-snug mt-2\"><a href=\"'+esc(it.url)+'\" target=\"_blank\" rel=\"noopener\" class=\"hover:underline decoration-stone-300 underline-offset-2\">'+esc(it.title)+'</a></h3>';",
    "  if(it.summary)h+='<p class=\"text-[13.5px] leading-relaxed text-stone-600 mt-2 line-clamp-4\">'+esc(it.summary)+'</p>';",
    "  if(it.metaNote)h+='<p class=\"text-[11px] text-stone-400 mt-2\">'+esc(it.metaNote)+'</p>';",
    "  if(it.hnUrl)h+='<a href=\"'+esc(it.hnUrl)+'\" target=\"_blank\" rel=\"noopener\" class=\"inline-block text-[11px] text-stone-500 hover:text-stone-900 mt-1 underline underline-offset-2\">HN discussion &#8599;</a>';",
    "  h+='</article>';return h;}",
    "function filtered(){var q=state.q.toLowerCase();return DATA.items.filter(function(it){",
    "  if(state.cat!=='all'&&it.category!==state.cat)return false;",
    "  if(q&&(it.title+' '+it.summary+' '+it.source).toLowerCase().indexOf(q)<0)return false;",
    "  return true;});}",
    "function render(){var list=filtered();var host=document.getElementById('content');var h='';",
    "  var showingAll=state.cat==='all'&&!state.q;",
    "  if(!list.length){h='<div class=\"py-24 text-center\"><p class=\"font-serif text-2xl text-stone-500\">No stories match.</p><p class=\"text-sm text-stone-400 mt-2\">Try another tab or clear the search.</p></div>';host.innerHTML=h;return;}",
    "  if(showingAll&&list.length){",
    "    var lead=list[0],second=list.slice(1,3);var rest=list.slice(3);",
    "    h+='<section class=\"pb-10 border-b border-stone-200\">';",
    "    h+='<div class=\"grid grid-cols-1 lg:grid-cols-3 gap-10\">';",
    "    h+='<article class=\"lg:col-span-2\">';",
    "    h+=kicker(lead,'mb-3');",
    "    h+='<h1 class=\"font-serif font-semibold text-3xl md:text-[2.6rem] leading-[1.15] tracking-tight\"><a href=\"'+esc(lead.url)+'\" target=\"_blank\" rel=\"noopener\" class=\"hover:underline decoration-stone-300 underline-offset-4\">'+esc(lead.title)+'</a></h1>';",
    "    if(lead.summary)h+='<p class=\"font-serif text-lg leading-relaxed text-stone-600 mt-4\">'+esc(lead.summary)+'</p>';",
    "    if(lead.metaNote)h+='<p class=\"text-[11px] text-stone-400 mt-3\">'+esc(lead.metaNote)+'</p>';",
    "    h+='<p class=\"text-xs text-stone-400 mt-4\"><a href=\"'+esc(lead.url)+'\" target=\"_blank\" rel=\"noopener\" class=\"underline underline-offset-2 hover:text-stone-900\">Continue on '+esc(lead.sourceHost||lead.source)+' &#8599;</a>'+(lead.hnUrl?' &nbsp;&#183;&nbsp; <a href=\"'+esc(lead.hnUrl)+'\" target=\"_blank\" rel=\"noopener\" class=\"underline underline-offset-2 hover:text-stone-900\">HN discussion &#8599;</a>':'')+'</p>';",
    "    h+='</article>';",
    "    h+='<aside class=\"lg:border-l lg:border-stone-200 lg:pl-10 space-y-8\">';",
    "    for(var i=0;i<second.length;i++){var it=second[i];",
    "      h+='<article>';h+=kicker(it,'mb-2');",
    "      h+='<h2 class=\"font-serif text-xl leading-snug\"><a href=\"'+esc(it.url)+'\" target=\"_blank\" rel=\"noopener\" class=\"hover:underline decoration-stone-300 underline-offset-2\">'+esc(it.title)+'</a></h2>';",
    "      if(it.summary)h+='<p class=\"text-[13px] leading-relaxed text-stone-600 mt-2 line-clamp-3\">'+esc(it.summary)+'</p>';",
    "      h+='</article>';}",
    "    h+='</aside></div></section>';}",
    "  else{var rest=list;}",
    "  var skipIds={};if(showingAll&&list.length){skipIds[list[0].id]=1;for(var j=0;j<list.slice(1,3).length;j++)skipIds[list.slice(1,3)[j].id]=1;}",
    "  var cats=state.cat==='all'?CAT_ORDER:[state.cat];",
    "  for(var c=0;c<cats.length;c++){var cat=cats[c];var sec=rest.filter(function(it){return it.category===cat&&!skipIds[it.id];});",
    "    if(!sec.length)continue;",
    "    h+='<section id=\"'+cat+'\" class=\"py-8 border-b border-stone-200\">';",
    "    h+='<div class=\"flex items-baseline justify-between border-t-2 border-stone-900 pt-3 mb-6\">';",
    "    h+='<h2 class=\"font-serif font-semibold text-[1.35rem] tracking-tight\">'+CATS[cat]+'</h2>';",
    "    h+='<span class=\"text-[11px] font-sans uppercase tracking-[0.14em] text-stone-400\">'+sec.length+' stories</span>';",
    "    h+='</div>';",
    "    h+='<div class=\"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-8\">';",
    "    for(var k=0;k<sec.length;k++)h+=card(sec[k]);",
    "    h+='</div></section>';}",
    "  host.innerHTML=h;}",
    "function syncTabs(){var tabs=document.querySelectorAll('[data-cat]');for(var i=0;i<tabs.length;i++){var c=tabs[i].getAttribute('data-cat');tabs[i].className='px-3 py-1.5 text-[12px] font-sans font-semibold uppercase tracking-[0.08em] transition-colors '+(c===state.cat?'text-stone-900 border-b-2 border-stone-900':'text-stone-500 hover:text-stone-900');}}",
    "document.addEventListener('click',function(e){var b=e.target.closest('[data-cat]');if(!b)return;",
    "  state.cat=b.getAttribute('data-cat');",
    "  syncTabs();",
    "  window.scrollTo({top:0,behavior:'smooth'});render();});",
    "var search=document.getElementById('search');",
    "search.addEventListener('input',function(){state.q=search.value.trim();render();});",
    "render();",
  ].join('\n');

  const tabs = ['all', ...CAT_ORDER]
    .map((c) => {
      const label = c === 'all' ? 'All' : CAT_META[c].tab;
      const base = 'px-3 py-1.5 text-[12px] font-sans font-semibold uppercase tracking-[0.08em] transition-colors';
      const active = c === 'all' ? `${base} text-stone-900 border-b-2 border-stone-900` : `${base} text-stone-500 hover:text-stone-900`;
      return `<button data-cat="${c}" class="${active}">${label}</button>`;
    })
    .join('');

  const failedNote = payload.failedSources.length
    ? `<div class="mt-2 text-stone-400">Failed sources: ${escapeHtml(payload.failedSources.map((f) => f.name).join(', '))}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI News Digest \u2014 ${escapeHtml(dateStr)}</title>
<link rel="icon" href="data:,">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
};
</script>
<style>
  html { scroll-behavior: smooth; }
  body { background: #fffdfa; color: #1c1917; }
  ::selection { background: #fde68a; }
  a { color: inherit; }
</style>
</head>
<body class="font-sans antialiased">

  <!-- Masthead -->
  <header class="max-w-6xl mx-auto px-6 pt-6 pb-4">
    <div class="text-center border-b-2 border-stone-900 pb-5">
      <p class="text-[11px] uppercase tracking-[0.2em] text-stone-500">${escapeHtml(prettyDate)}</p>
      <h1 class="font-serif font-bold text-4xl md:text-5xl tracking-tight mt-2">AI News Digest</h1>
      <p class="text-[12px] text-stone-500 mt-2 tracking-wide">Covering ${escapeHtml(windowLabel)} \u00b7 ${payload.items.length} stories \u00b7 ${payload.okSources.length} sources</p>
    </div>
  </header>

  <!-- Sticky nav: tabs + search -->
  <nav class="sticky top-0 z-10 bg-[#fffdfa]/95 backdrop-blur border-b border-stone-200">
    <div class="max-w-6xl mx-auto px-6 flex items-center justify-between h-11">
      <div class="flex items-center gap-0.5 overflow-x-auto">
        ${tabs}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <input id="search" type="search" placeholder="Search stories\u2026"
          class="w-40 md:w-56 text-[13px] px-3 py-1.5 bg-white border border-stone-300 rounded-full focus:outline-none focus:border-stone-900 placeholder:text-stone-400">
      </div>
    </div>
  </nav>

  <main id="content" class="max-w-6xl mx-auto px-6 pt-8"></main>

  <!-- Footer -->
  <footer class="max-w-6xl mx-auto px-6 py-12 mt-4 border-t border-stone-200 text-[12px] text-stone-400 leading-relaxed">
    <p>Generated ${escapeHtml(new Date(payload.generatedAt).toLocaleString('en-US'))} \u00b7 window ${escapeHtml(payload.windowHours + 'h')} \u00b7 ${payload.items.length} stories.</p>
    <p class="mt-1">Sources: RSS feeds \u00b7 ${payload.exaUsed ? 'Exa search' : 'Exa search (skipped: no API key)'} \u00b7 Hacker News \u00b7 GitHub Trending \u00b7 Hugging Face Papers.</p>
    <p class="mt-1">OK: ${escapeHtml(payload.okSources.join(', '))}</p>
    ${failedNote}
  </footer>

<script type="application/json" id="news-data">${json}</script>
<script>
${pageScript}
</script>
</body>
</html>`;
}

export { renderPage };
