import * as store from '../store.js';
import * as K from '../knowledge.js';
import { renderMarkdown, slugify } from '../md.js';
import { esc, icon, fmtDate, openForm, toast, emptyState, daysUntil, copyText } from '../ui.js';
import { DOMAINS } from '../seed.js';

let filter = { domain: 'All', q: '' };
const STALE_DAYS = 120;
const confBadge = (c) => `<span class="badge ${c === 'high' ? 'green' : c === 'low' ? 'red' : 'gold'}">${esc(c || 'unrated')} confidence</span>`;
const isStale = (a) => a.updated && -daysUntil(a.updated.slice(0, 10)) > STALE_DAYS;

function askForm(prefill = {}) {
  openForm({
    title: 'Ask the wiki', saveLabel: 'Send to Claude',
    intro: `<p class="muted small" style="margin-top:0">${K.mode() === 'connected' ? 'Your question goes to the queue in your private vault. Claude researches it on the next scheduled run, writes a sourced article and links it into the wiki.' : 'You are in local mode: the question is saved in this browser and you can copy a ready-made prompt into Claude. Connect your vault in Settings to make this automatic.'}</p>`,
    values: { priority: 'Normal', type: 'research', ...prefill },
    fields: [
      { k: 'title', label: 'Question', required: true, full: true, placeholder: 'e.g. What are the trade-offs between an ADGM and a DIFC holding company for a family wealth structure?' },
      { k: 'question', label: 'Context — what decision will this inform?', type: 'textarea' },
      { k: 'domain', label: 'Domain', type: 'select', options: DOMAINS },
      { k: 'type', label: 'Type', type: 'select', options: [{ v: 'research', l: 'Research → new article' }, { v: 'review', l: 'Review → upgrade existing knowledge' }, { v: 'task', l: 'Task → analysis or deliverable' }] },
      { k: 'priority', label: 'Priority', type: 'select', options: ['High', 'Normal', 'Low'] },
      { k: 'venture', label: 'Linked venture', type: 'select', options: () => [{ v: '', l: '—' }, ...store.get().ventures.map((v) => ({ v: v.id, l: v.name }))] },
    ],
    onSave: (d) => {
      const it = K.addToQueue(d);
      if (K.mode() === 'connected') toast('Queued. Claude will research it on the next run.', 'ok');
      else { copyText(K.promptFor(it, store.get().ventures)); toast('Saved locally and prompt copied — paste it into Claude.', 'ok'); }
    },
  });
}

async function listView(s) {
  const idx = await K.loadIndex();
  const arts = idx.articles;
  const q = filter.q.toLowerCase();
  const shown = arts.filter((a) => (filter.domain === 'All' || a.domain === filter.domain) && (!q || `${a.title} ${a.summary} ${(a.tags || []).join(' ')}`.toLowerCase().includes(q)))
    .sort((a, b) => (a.pinned ? -1 : 0) - (b.pinned ? -1 : 0) || (b.updated || '').localeCompare(a.updated || ''));
  const counts = Object.fromEntries(DOMAINS.map((d) => [d, arts.filter((a) => a.domain === d).length]));
  const sources = arts.reduce((t, a) => t + (a.sources || 0), 0);
  const links = arts.reduce((t, a) => t + (a.links || []).length, 0);
  const stale = arts.filter(isStale).length;
  return `
  <div class="page-head"><div><div class="eyebrow">Build</div><h1>Knowledge Wiki</h1>
    <p>A compounding body of knowledge. Every article is researched from primary sources, rated for confidence, dated, and linked to what you already know. It gets more valuable every week.</p></div>
    <div class="actions"><button class="btn" data-act="refresh">${icon('sync')} Refresh</button></div></div>

  <div class="ask-bar"><input id="askq" placeholder="Ask anything — Claude researches it, writes it up, and files it here…" aria-label="Research question"><button class="btn primary" data-act="askQuick">${icon('send')} Ask</button></div>
  ${idx.error ? `<div class="callout red mb">Could not load the wiki: ${esc(idx.error)}. ${K.mode() === 'local' ? 'If you opened index.html directly from disk, serve the folder instead (see README) or connect your vault.' : 'Check your GitHub settings.'}</div>` : ''}

  <div class="grid g4 mb">
    <div class="card kpi"><div class="label">Articles</div><div class="value">${arts.length}</div></div>
    <div class="card kpi"><div class="label">Sources cited</div><div class="value">${sources}</div></div>
    <div class="card kpi"><div class="label">Cross-links</div><div class="value">${links}</div></div>
    <div class="card kpi"><div class="label">Due for review</div><div class="value">${stale}</div><div class="delta">older than ${STALE_DAYS} days</div></div>
  </div>

  <div class="wiki-layout">
    <div class="wiki-side">
      <div class="search mb">${icon('search')}<input data-input="search" value="${esc(filter.q)}" placeholder="Search" aria-label="Search wiki"></div>
      <div class="dom ${filter.domain === 'All' ? 'active' : ''}" data-act="domain" data-d="All"><span>All domains</span><span>${arts.length}</span></div>
      ${DOMAINS.map((d) => `<div class="dom ${filter.domain === d ? 'active' : ''}" data-act="domain" data-d="${esc(d)}"><span>${esc(d)}</span><span>${counts[d] || 0}</span></div>`).join('')}
      <hr><div class="small muted">Mode: <b>${K.mode() === 'connected' ? 'Connected vault' : 'Local starter wiki'}</b>${idx.updated ? `<br>Index updated ${fmtDate(idx.updated)}` : ''}</div>
    </div>
    <div id="wiki-results" class="grid g2" style="align-content:start">
      ${shown.map((a) => `<a class="article-card" href="#/wiki/${a.slug}"><div class="t">${a.pinned ? '★ ' : ''}${esc(a.title)}</div><div class="s">${esc(a.summary || '')}</div>
        <div class="m"><span class="badge">${esc(a.domain)}</span>${confBadge(a.confidence)}${isStale(a) ? '<span class="badge red">review due</span>' : ''}<span class="badge">${fmtDate(a.updated)}</span></div></a>`).join('') || `<div class="card">${emptyState('No matches', 'Try another search — or ask Claude to research it.')}</div>`}
    </div>
  </div>`;
}

async function articleView(s, slug) {
  const idx = await K.loadIndex();
  const entry = idx.articles.find((a) => a.slug === slug);
  if (!entry) {
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return `<div class="page-head"><div><div class="eyebrow"><a href="#/wiki">${icon('back', 'style="width:12px;vertical-align:-1px"')} Wiki</a></div><h1>${esc(title)}</h1><p>This article has not been written yet.</p></div></div>
      <div class="card">${emptyState('Not in the wiki yet', 'Ask Claude to research it and it will appear here after the next run.', `<button class="btn primary" data-act="askTitle" data-title="${esc(title)}">${icon('spark')} Request research</button>`)}</div>`;
  }
  const art = await K.loadArticle(entry);
  const known = new Set(idx.articles.map((a) => a.slug));
  const back = await K.backlinks(slug);
  const m = art.meta;
  const srcList = Array.isArray(m.sources) ? m.sources : [];
  return `
  <div class="page-head"><div><div class="eyebrow"><a href="#/wiki">${icon('back', 'style="width:12px;vertical-align:-1px"')} Wiki</a> · ${esc(entry.domain)}</div></div>
    <div class="actions"><button class="btn" data-act="followup" data-title="${esc(entry.title)}">${icon('spark')} Ask a follow-up</button><button class="btn" data-act="review" data-title="${esc(entry.title)}" data-slug="${esc(slug)}">${icon('sync')} Request review</button></div></div>
  <div class="grid g-main">
    <article class="card" style="padding:28px 32px">
      <div class="article-meta">${confBadge(m.confidence || entry.confidence)}${isStale(entry) ? '<span class="badge red">review due</span>' : ''}<span class="badge">Updated ${fmtDate(m.updated || entry.updated)}</span>${(m.tags || entry.tags || []).map((t) => `<span class="badge">#${esc(t)}</span>`).join('')}</div>
      <div class="prose">${art.body.trim().startsWith('# ') ? '' : `<h1>${esc(m.title || entry.title)}</h1>`}${renderMarkdown(art.body, { known })}</div>
    </article>
    <div class="stack">
      <div class="card"><div class="card-head"><h3>About this article</h3></div>
        <div class="small"><div class="row"><span class="muted">Domain</span><span class="right">${esc(entry.domain)}</span></div>
        <div class="row" style="margin-top:6px"><span class="muted">Created</span><span class="right">${fmtDate(m.created)}</span></div>
        <div class="row" style="margin-top:6px"><span class="muted">Updated</span><span class="right">${fmtDate(m.updated)}</span></div>
        <div class="row" style="margin-top:6px"><span class="muted">Sources</span><span class="right">${entry.sources ?? srcList.length}</span></div>
        ${m.summary ? `<hr><div class="muted">${esc(m.summary)}</div>` : ''}</div></div>
      <div class="card"><div class="card-head"><h3>Linked from</h3></div>
        ${back.length ? `<div class="list">${back.map((b) => `<a class="list-item" href="#/wiki/${b.slug}">${esc(b.title)}</a>`).join('')}</div>` : '<div class="muted small">No other article links here yet.</div>'}</div>
      <div class="card"><div class="card-head"><h3>Links to</h3></div>
        ${(entry.links || []).length ? `<div class="list">${entry.links.map((l) => { const t = idx.articles.find((a) => a.slug === l); return `<a class="list-item" href="#/wiki/${l}" style="${t ? '' : 'color:var(--red)'}">${esc(t ? t.title : l)}${t ? '' : ' <span class="small">(not written)</span>'}</a>`; }).join('')}</div>` : '<div class="muted small">No outgoing links.</div>'}</div>
    </div>
  </div>`;
}

const view = {
  title: 'Knowledge Wiki',
  ask: askForm,
  async render(s, params) { return params[0] ? articleView(s, params[0]) : listView(s); },
  actions: {
    domain(el) { filter.domain = el.dataset.d; window.dispatchEvent(new HashChangeEvent('hashchange')); },
    search(el) {
      filter.q = el.value;
      clearTimeout(view._t);
      view._t = setTimeout(async () => {
        const html = await listView(store.get());
        const tmp = document.createElement('div'); tmp.innerHTML = html;
        document.getElementById('wiki-results')?.replaceWith(tmp.querySelector('#wiki-results'));
      }, 150);
    },
    askQuick() { const v = document.getElementById('askq').value.trim(); askForm(v ? { title: v } : {}); },
    askTitle(el) { askForm({ title: `Research: ${el.dataset.title}` }); },
    followup(el) { askForm({ question: `Follow-up to the article "${el.dataset.title}".` }); },
    review(el) { askForm({ type: 'review', title: `Review and upgrade: ${el.dataset.title}`, question: `Re-verify facts and figures in [[${el.dataset.title}]] against current primary sources, fix anything outdated, raise or lower confidence, and add new links. Article slug: ${el.dataset.slug}` }); },
    refresh() { K.clearCache(); window.dispatchEvent(new HashChangeEvent('hashchange')); toast('Wiki refreshed', 'ok'); },
  },
  mount(el) {
    el.querySelector('#askq')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') view.actions.askQuick(); });
  },
};
export default view;
export { slugify };
