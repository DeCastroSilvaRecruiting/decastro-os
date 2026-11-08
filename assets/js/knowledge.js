// Knowledge engine client: wiki index/articles and the shared Claude queue.
// Two modes:
//   • Connected — reads/writes the private vault repo through the GitHub API.
//   • Local     — reads the bundled starter wiki; queue lives only in this browser.
import * as store from './store.js';
import { parseFrontmatter } from './md.js';
import { uid } from './ui.js';

let indexCache = null;
const articleCache = new Map();

export const mode = () => (store.ghConfigured() ? 'connected' : 'local');

export async function loadIndex(force = false) {
  if (indexCache && !force) return indexCache;
  try {
    if (mode() === 'connected') {
      const f = await store.gh().getFile('wiki/index.json');
      indexCache = f ? JSON.parse(f.text) : { articles: [] };
    } else {
      const r = await fetch('starter/wiki/index.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('Starter wiki not found');
      indexCache = await r.json();
    }
  } catch (e) {
    console.warn('Wiki index load failed', e);
    indexCache = { articles: [], error: String(e.message || e) };
  }
  indexCache.articles ||= [];
  return indexCache;
}
export const clearCache = () => { indexCache = null; articleCache.clear(); };

export async function loadArticle(entry) {
  if (articleCache.has(entry.slug)) return articleCache.get(entry.slug);
  let text;
  if (mode() === 'connected') { const f = await store.gh().getFile(entry.path); text = f?.text ?? ''; }
  else { const r = await fetch(`starter/${entry.path}`, { cache: 'no-store' }); text = r.ok ? await r.text() : ''; }
  const parsed = parseFrontmatter(text);
  articleCache.set(entry.slug, parsed);
  return parsed;
}

export async function backlinks(slug) {
  const idx = await loadIndex();
  return idx.articles.filter((a) => (a.links || []).includes(slug));
}

// ---------- Queue ----------
export function newItem(fields) {
  const now = new Date().toISOString();
  return { id: uid('q'), type: 'research', priority: 'Normal', status: 'queued', domain: '', venture: '', question: '', requestedBy: 'owner', created: now, updated: now, result: null, ...fields };
}
export function addToQueue(fields) {
  const item = newItem(fields);
  store.update((s) => { s.queue.unshift(item); });
  if (mode() === 'connected') syncQueue().catch((e) => console.warn(e));
  return item;
}
export function updateItem(id, patch) {
  store.update((s) => { const it = s.queue.find((q) => q.id === id); if (it) Object.assign(it, patch, { updated: new Date().toISOString() }); });
}

/** Two-way merge with queue/queue.json. Newest `updated` wins per item. */
export async function syncQueue() {
  const api = store.gh();
  const f = await api.getFile('queue/queue.json');
  const remote = f ? JSON.parse(f.text) : { items: [] };
  const map = new Map();
  for (const it of remote.items || []) map.set(it.id, it);
  for (const it of store.get().queue) {
    const r = map.get(it.id);
    if (!r || (it.updated || '') > (r.updated || '')) map.set(it.id, it);
  }
  const deleted = new Set(store.get().settings.deletedQueue || []);
  const items = [...map.values()].filter((x) => !deleted.has(x.id)).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  const out = { updated: new Date().toISOString(), items };
  const changed = JSON.stringify(items) !== JSON.stringify(remote.items || []);
  if (changed) await api.putFile('queue/queue.json', JSON.stringify(out, null, 2) + '\n', `queue: sync from De Castro OS (${items.length} items)`, f?.sha);
  store.update((s) => { s.queue = items; s.settings.lastSync = new Date().toISOString(); s.settings.deletedQueue = []; });
  return { items: items.length, pushed: changed };
}
export function deleteItem(id) {
  store.update((s) => { s.queue = s.queue.filter((q) => q.id !== id); s.settings.deletedQueue = [...(s.settings.deletedQueue || []), id]; });
}

// ---------- Prompts (manual mode / copy into claude.ai) ----------
export function promptFor(item, ventures = []) {
  const v = ventures.find((x) => x.id === item.venture);
  const ctx = v ? `\n\nVenture context — ${v.name} (stage: ${v.stage}): ${v.summary}${v.thesis ? `\nThesis: ${v.thesis}` : ''}${v.customer ? `\nCustomer: ${v.customer}` : ''}${v.revenueModel ? `\nRevenue model: ${v.revenueModel}` : ''}` : '';
  const kinds = {
    research: 'Research this question and write a wiki article.',
    diligence: 'Run a venture due-diligence pass and write a dossier article.',
    review: 'Review and upgrade the existing knowledge on this topic.',
    task: 'Complete this task and report back.',
  };
  return `You are the research partner for the De Castro Empire knowledge base (owner: ${store.settings().owner}, based in Dubai, UAE; base currency ${store.base()}).

${kinds[item.type] || kinds.research}

QUESTION: ${item.title}${item.question ? `\nDETAIL: ${item.question}` : ''}${item.domain ? `\nDOMAIN: ${item.domain}` : ''}${ctx}

Method:
1. Search widely, then prefer primary sources: regulators and government portals (UAE: u.ae, tax.gov.ae, mof.gov.ae, dubailand.gov.ae, centralbank.ae, adgm.com, difc.ae, sca.gov.ae), official statistics, company filings, peer-reviewed or working papers. Use quality press only as secondary support. Avoid SEO blogs and forums.
2. Verify every number against at least one primary source; give the date of each figure.
3. Separate facts, estimates and your own judgement. State confidence (high / medium / low) and what would change your mind.
4. Finish with: Key takeaways (5 bullets max), Decision implications for the empire, Open questions, Sources (title, publisher, URL, date accessed).

Format the answer as a Markdown article with this frontmatter:
---
title: <title>
domain: ${item.domain || '<domain>'}
tags: [<tags>]
confidence: <high|medium|low>
summary: <one sentence>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
queue_id: ${item.id}
---
Link related concepts with [[Wiki Links]].`;
}
