import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, money, num, fmtDate, daysUntil, tableHTML, tabsHTML, addMonths, toast } from '../ui.js';
import { crudActions, crudRows } from '../schemas.js';

let tab = 'entities';
const dueBadge = (d) => { const n = daysUntil(d); if (n == null) return '<span class="badge">set date</span>'; return `<span class="badge ${n < 0 ? 'red' : n <= 30 ? 'gold' : ''}">${n < 0 ? `${-n}d overdue` : n === 0 ? 'today' : `${n}d`}</span>`; };

function structureTree(s) {
  const kids = (name) => s.entities.filter((e) => (e.parent || '') === name);
  const roots = s.entities.filter((e) => !e.parent || !s.entities.some((p) => p.name === e.parent));
  const node = (e, depth) => `<div style="margin-left:${depth * 26}px;padding:8px 12px;border-left:2px solid var(--${depth ? 'line-2' : 'gold'});margin-top:6px;background:var(--panel-2);border-radius:0 8px 8px 0">
    <b>${esc(e.name)}</b> <span class="badge">${esc(e.type)}</span> <span class="badge ${e.status === 'Active' ? 'green' : e.status === 'Planned' ? 'violet' : ''}">${esc(e.status)}</span>
    <span class="small muted"> ${esc(e.jurisdiction || '')}${e.ownership !== '' && e.ownership != null ? ` · ${e.ownership}% owned` : ''}</span></div>${kids(e.name).map((k) => node(k, depth + 1)).join('')}`;
  return roots.map((r) => node(r, 0)).join('');
}

export default {
  title: 'Legal & Entities',
  render(s, params) {
    tab = params[0] || 'entities';
    const b = store.base();
    const overdue = s.compliance.filter((c) => c.status !== 'Done' && daysUntil(c.due) < 0).length;
    let body = '';
    if (tab === 'entities') body = `<div class="grid g-main">
      <div class="card flush"><div class="card-head"><h3>Entity register</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="entities" data-defaults='{"status":"Planned","type":"Holding company","ownership":100}'>${icon('plus')} Entity</button></div></div>
        ${crudRows(tableHTML([
          { k: 'name', label: 'Entity', fmt: (r) => `<b>${esc(r.name)}</b><div class="small muted">${esc(r.type)}${r.parent ? ` · under ${esc(r.parent)}` : ''}</div>` },
          { k: 'jurisdiction', label: 'Jurisdiction' }, { k: 'status', label: 'Status', fmt: (r) => `<span class="badge ${r.status === 'Active' ? 'green' : ''}">${esc(r.status)}</span>` },
          { k: 'licence', label: 'Licence no.', fmt: (r) => `<span class="mono">${esc(r.licence || '—')}</span>` },
          { k: 'expiry', label: 'Expiry', fmt: (r) => (r.expiry ? `${fmtDate(r.expiry)} ${dueBadge(r.expiry)}` : '—') },
        ], s.entities, { act: 'crudEdit' }), 'entities')}</div>
      <div class="card"><div class="card-head"><h3>Group structure</h3></div>${structureTree(s)}
        <p class="small muted mt">Set each entity's parent to draw the ownership tree. Holding structures (ADGM, DIFC, RAK ICC foundations and holdcos) are a strong research topic for Claude before you form anything.</p>
        <button class="btn sm" data-act="askStructure">${icon('spark')} Research holding structures</button></div></div>`;
    else if (tab === 'contracts') body = `<div class="card flush"><div class="card-head"><h3>Contract register</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="contracts" data-defaults='{"status":"Active","noticeDays":30}'>${icon('plus')} Contract</button></div></div>
      ${crudRows(tableHTML([
        { k: 'title', label: 'Contract', fmt: (r) => `<b>${esc(r.title)}</b><div class="small muted">${esc(r.counterparty || '')}</div>` },
        { k: 'type', label: 'Type' }, { k: 'entity', label: 'Entity' },
        { k: 'end', label: 'Ends', fmt: (r) => (r.end ? fmtDate(r.end) : 'Rolling') },
        { k: 'notice', label: 'Notice by', fmt: (r) => { if (!r.end) return '—'; const d = new Date(r.end + 'T00:00:00'); d.setDate(d.getDate() - num(r.noticeDays)); const iso = d.toISOString().slice(0, 10); return `${fmtDate(iso)} ${dueBadge(iso)}`; } },
        { k: 'value', label: 'Annual value', num: true, fmt: (r) => (r.value ? money(num(r.value), r.ccy || b) : '—') },
        { k: 'status', label: 'Status', fmt: (r) => `<span class="badge ${r.status === 'Active' ? 'green' : r.status === 'Terminated' ? 'red' : ''}">${esc(r.status)}</span>` },
      ], s.contracts.slice().sort((a, c) => (a.end || '9').localeCompare(c.end || '9')), { act: 'crudEdit', empty: 'Track leases, supplier and customer agreements, NDAs and shareholder agreements. Notice deadlines appear on your Command Centre.' }), 'contracts')}</div>`;
    else body = `<div class="card flush"><div class="card-head"><h3>Compliance calendar</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="compliance" data-defaults='{"status":"Open","recurrence":"Annual"}'>${icon('plus')} Obligation</button></div></div>
      ${s.compliance.length ? `<div class="table-wrap"><table><thead><tr><th>Obligation</th><th>Entity</th><th>Due</th><th>Recurs</th><th>Status</th><th></th></tr></thead><tbody>
      ${s.compliance.slice().sort((a, c) => (a.due || '9').localeCompare(c.due || '9')).map((c) => `<tr><td class="click" data-act="crudEdit" data-coll="compliance" data-id="${c.id}" style="cursor:pointer"><b>${esc(c.title)}</b>${c.notes ? `<div class="small muted">${esc(c.notes)}</div>` : ''}</td><td>${esc(c.entity)}</td>
        <td class="nowrap">${c.due ? fmtDate(c.due) : ''} ${c.status !== 'Done' ? dueBadge(c.due) : ''}</td><td>${esc(c.recurrence)}</td><td><span class="badge ${c.status === 'Done' ? 'green' : ''}">${esc(c.status)}</span></td>
        <td>${c.status !== 'Done' ? `<button class="btn sm" data-act="complete" data-id="${c.id}">Mark done</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No obligations yet.</div>'}
      </div><p class="small muted">Completing a recurring obligation rolls it forward to the next due date automatically.</p>`;
    return `<div class="page-head"><div><div class="eyebrow">Govern</div><h1>Legal & Entities</h1><p>Trust is built on clean structure: every entity registered, every contract tracked, every deadline met.</p></div></div>
      <div class="callout gold mb small">This module organises your legal affairs; it is not legal advice. Use the wiki to understand the landscape, then confirm decisions with a licensed UAE adviser.</div>
      ${tabsHTML([['entities', `Entities (${s.entities.length})`], ['contracts', `Contracts (${s.contracts.length})`], ['compliance', `Compliance${overdue ? ` · ${overdue} overdue` : ''}`]], tab)}${body}`;
  },
  actions: {
    ...crudActions,
    tab(el) { location.hash = `#/legal/${el.dataset.tab}`; },
    complete(el) {
      store.update((s) => {
        const c = s.compliance.find((x) => x.id === el.dataset.id);
        const step = { Monthly: 1, Quarterly: 3, Annual: 12 }[c.recurrence];
        if (step && c.due) { c.due = addMonths(c.due, step); c.status = 'Open'; c.lastDone = new Date().toISOString().slice(0, 10); }
        else c.status = 'Done';
      });
      toast('Done — rolled forward if recurring', 'ok');
    },
    askStructure() {
      K.addToQueue({ type: 'research', priority: 'High', domain: 'Legal & Structuring', title: 'UAE holding structures for a family wealth & venture group: ADGM vs DIFC vs RAK ICC vs mainland', question: 'Compare holding companies and foundations in ADGM, DIFC and RAK ICC (and mainland options) for holding ventures, property and investments: setup and annual costs, substance and audit requirements, corporate tax treatment (including qualifying free zone rules), property-holding eligibility in Dubai, banking practicality, succession/estate planning benefits, and privacy. Cite the official authority pages.' });
      toast('Queued for Claude', 'ok');
    },
  },
};
