import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, fmtDate, openForm, toast, copyText, tabsHTML, modal } from '../ui.js';
import { DOMAINS } from '../seed.js';
import { SCHEDULES } from '../prompts.js';

const STATUS = ['queued', 'in-progress', 'done', 'proposed', 'rejected'];
const sBadge = { queued: 'blue', 'in-progress': 'gold', done: 'green', proposed: 'violet', rejected: 'red' };
let statusFilter = 'open';

function queueTab(s) {
  const items = s.queue.filter((q) => statusFilter === 'all' ? true : statusFilter === 'open' ? ['queued', 'in-progress', 'proposed'].includes(q.status) : q.status === statusFilter);
  const proposed = s.queue.filter((q) => q.status === 'proposed');
  const vname = (id) => s.ventures.find((v) => v.id === id)?.name || '';
  return `
  ${proposed.length ? `<div class="callout gold mb">Claude has proposed <b>${proposed.length}</b> new research question${proposed.length > 1 ? 's' : ''} from its weekly review. Approve the ones worth pursuing.</div>` : ''}
  <div class="row mb">
    ${['open', 'queued', 'in-progress', 'proposed', 'done', 'all'].map((f) => `<button class="btn sm ${statusFilter === f ? 'primary' : ''}" data-act="filter" data-f="${f}">${f}</button>`).join('')}
    <span class="right"></span>
    <button class="btn" data-act="add">${icon('plus')} New request</button>
  </div>
  <div class="card flush">${items.length ? `<div class="table-wrap"><table><thead><tr><th>Request</th><th>Type</th><th>Domain</th><th>Priority</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>
    ${items.map((q) => `<tr><td><b class="click" data-act="edit" data-id="${q.id}" style="cursor:pointer">${esc(q.title)}</b>${q.venture ? `<div class="small muted">${esc(vname(q.venture))}</div>` : ''}${q.result?.summary ? `<div class="small muted">→ ${esc(q.result.summary)}</div>` : ''}</td>
      <td>${esc(q.type)}</td><td class="small">${esc(q.domain || '—')}</td><td><span class="badge ${q.priority === 'High' ? 'gold' : ''}">${esc(q.priority)}</span></td>
      <td><span class="badge ${sBadge[q.status] || ''}">${esc(q.status)}</span>${q.requestedBy === 'claude' ? ' <span class="badge violet">by Claude</span>' : ''}</td>
      <td class="nowrap small">${fmtDate(q.created)}</td>
      <td class="nowrap">${q.status === 'proposed' ? `<button class="btn sm primary" data-act="approve" data-id="${q.id}">Approve</button> <button class="btn sm" data-act="reject" data-id="${q.id}">Reject</button>` : ''}
        ${q.result?.article ? `<a class="btn sm" href="#/wiki/${q.result.article}">Read</a>` : ''}
        <button class="btn sm ghost icon-btn" data-act="prompt" data-id="${q.id}" title="Copy as a Claude prompt">${icon('copy')}</button></td></tr>`).join('')}
  </tbody></table></div>` : `<div class="empty"><h3>Queue is clear</h3><div>Ask a question from anywhere with “Ask the wiki”, or commission venture diligence.</div></div>`}</div>`;
}

function setupTab(s) {
  const g = s.settings.github;
  const connected = K.mode() === 'connected';
  return `
  <div class="grid g-main">
    <div class="card">
      <div class="card-head"><h3>How the research engine works</h3></div>
      <ol class="steps">
        <li><b>You ask</b>From any page: a question, a venture diligence request, or a review of an existing article. It lands in <code>queue/queue.json</code> in your private vault repo.</li>
        <li><b>Claude wakes up on schedule</b>Scheduled tasks in your Claude account run in the cloud — no API key, no server. Each run clones your vault, reads <code>CLAUDE.md</code> and follows the research protocol.</li>
        <li><b>It researches from the best sources</b>Regulators and government portals first, then filings, official statistics and academic work; quality press only as support. Every figure is dated and every claim cited.</li>
        <li><b>It writes and links</b>A Markdown article with confidence rating, key takeaways, decision implications and open questions — linked with <code>[[wiki links]]</code> to what you already know. It updates rather than duplicates.</li>
        <li><b>It compounds</b>Weekly it re-verifies stale articles, merges overlaps, distils principles and proposes new questions for your approval. Monthly it writes an empire briefing.</li>
        <li><b>You read it here</b>This app reads the vault through the GitHub API. Push the Sync button or reload.</li>
      </ol>
    </div>
    <div class="stack">
      <div class="card"><div class="card-head"><h3>Status</h3></div>
        <div class="row"><span class="sync-dot ${connected ? 'on' : ''}" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--${connected ? 'green' : 'muted'})"></span><b>${connected ? 'Connected' : 'Local mode'}</b></div>
        <p class="small muted">${connected ? `Vault <code>${esc(g.owner)}/${esc(g.repo)}</code> on <code>${esc(g.branch || 'main')}</code>. Last sync ${s.settings.lastSync ? fmtDate(s.settings.lastSync, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never'}.` : 'Questions stay in this browser. Use the copy button to paste a full research prompt into Claude, or connect your vault so it all runs automatically.'}</p>
        <a class="btn sm" href="#/settings">${icon('settings')} ${connected ? 'Manage connection' : 'Connect vault'}</a>
        ${connected ? `<button class="btn sm" data-act="sync">${icon('sync')} Sync now</button>` : ''}
      </div>
      <div class="card"><div class="card-head"><h3>No API needed</h3></div>
        <p class="small muted" style="margin:0">Scheduled tasks run on your Claude subscription. If you later get an API key you could add a GitHub Action for instant answers — but the scheduled model is cheaper and fits the “compound slowly, verify everything” philosophy.</p></div>
    </div>
  </div>`;
}

function schedulesTab() {
  return `
  <div class="callout mb">Create one scheduled task per block below. The easiest way: in a Claude chat with GitHub connected, say <i>“Set up the De Castro scheduled tasks for my decastro-vault repo”</i> — or paste each prompt into a new scheduled task yourself, pointing it at the vault repo.</div>
  <div class="stack">${SCHEDULES.map((sc) => `<div class="card"><div class="card-head"><h3>${esc(sc.name)}</h3><div class="right"><span class="badge gold">${esc(sc.when)}</span><button class="btn sm" data-act="copySchedule" data-k="${sc.key}">${icon('copy')} Copy prompt</button></div></div>
    <pre class="prompt">${esc(sc.prompt)}</pre><div class="small muted mt" style="margin-top:8px">Cron: <code>${esc(sc.cron)}</code></div></div>`).join('')}</div>`;
}

let tab = 'queue';
export default {
  title: 'Claude Desk',
  render(s, params) {
    tab = params[0] || 'queue';
    return `
    <div class="page-head"><div><div class="eyebrow">Build</div><h1>Claude Desk</h1>
      <p>Your research partner works on a schedule. Queue questions here; Claude researches them from primary sources, writes them into the wiki, and proposes what to learn next.</p></div>
      <div class="actions">${K.mode() === 'connected' ? `<button class="btn" data-act="sync">${icon('sync')} Sync</button>` : ''}<button class="btn primary" data-act="add">${icon('spark')} New request</button></div></div>
    ${tabsHTML([['queue', 'Queue'], ['setup', 'How it works'], ['schedules', 'Scheduled tasks']], tab)}
    ${tab === 'setup' ? setupTab(s) : tab === 'schedules' ? schedulesTab() : queueTab(s)}`;
  },
  actions: {
    tab(el) { location.hash = `#/claude/${el.dataset.tab}`; },
    filter(el) { statusFilter = el.dataset.f; store.update(() => {}); },
    add() { import('./wiki.js').then((m) => m.default.ask()); },
    async sync() { try { const r = await K.syncQueue(); toast(`Synced ${r.items} items`, 'ok'); } catch (e) { toast(e.message, 'error'); } },
    approve(el) { K.updateItem(el.dataset.id, { status: 'queued' }); if (K.mode() === 'connected') K.syncQueue().catch(() => {}); },
    reject(el) { K.updateItem(el.dataset.id, { status: 'rejected' }); if (K.mode() === 'connected') K.syncQueue().catch(() => {}); },
    prompt(el) { const q = store.get().queue.find((x) => x.id === el.dataset.id); copyText(K.promptFor(q, store.get().ventures)); },
    copySchedule(el) { copyText(SCHEDULES.find((x) => x.key === el.dataset.k).prompt); },
    edit(el) {
      const q = store.get().queue.find((x) => x.id === el.dataset.id);
      openForm({ title: 'Edit request', values: q, fields: [
        { k: 'title', label: 'Question', required: true, full: true }, { k: 'question', label: 'Detail', type: 'textarea' },
        { k: 'domain', label: 'Domain', type: 'select', options: ['', ...DOMAINS] }, { k: 'priority', label: 'Priority', type: 'select', options: ['High', 'Normal', 'Low'] },
        { k: 'type', label: 'Type', type: 'select', options: ['research', 'diligence', 'review', 'task'] }, { k: 'status', label: 'Status', type: 'select', options: STATUS },
      ], onSave: (d) => { K.updateItem(q.id, d); if (K.mode() === 'connected') K.syncQueue().catch(() => {}); },
      onDelete: () => { K.deleteItem(q.id); if (K.mode() === 'connected') K.syncQueue().catch(() => {}); } });
    },
  },
};
