import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, uid, openForm, fmtDate, money, fnum, pct, num, today, toast, confirmBox, emptyState, copyText } from '../ui.js';
import { STAGES, RUBRIC, DOMAINS } from '../seed.js';
import { unitEconomics } from '../fin.js';
import { readiness, nextStage, STAGE_INFO, FLOW } from '../gates.js';
import { playbookOf, stepsFor, playbookProgress, MODES, PLAYBOOKS } from '../playbooks.js';

const BASIC = [
  { k: 'name', label: 'Venture name', required: true },
  { k: 'stage', label: 'Stage', type: 'select', options: STAGES },
  { k: 'playbook', label: 'Playbook (guides each stage)', type: 'select', options: Object.entries(PLAYBOOKS).map(([v, p]) => ({ v, l: p.name })) },
  { k: 'summary', label: 'One-line description', full: true },
  { k: 'tags', label: 'Tags', type: 'tags', placeholder: 'golf, luxury, b2b' },
  { k: 'capitalRequired', label: 'Capital required (base ccy)', type: 'number' },
];
const THESIS = [
  { k: 'problem', label: 'Problem — what pain, for whom, how often?', type: 'textarea' },
  { k: 'customer', label: 'Customer — who pays, and who decides?', type: 'textarea' },
  { k: 'thesis', label: 'Thesis — why this wins, why now, why us', type: 'textarea' },
  { k: 'revenueModel', label: 'Revenue model — how money comes in', type: 'textarea' },
  { k: 'entity', label: 'Legal entity', type: 'select', options: () => ['', ...store.get().entities.map((e) => e.name)] },
];
const stageColor = { Idea: '', Validate: 'blue', Plan: 'violet', Build: 'gold', Launch: 'gold', Scale: 'green', Parked: 'red' };

function listView(s) {
  const lanes = STAGES.map((st) => {
    const vs = s.ventures.filter((v) => v.stage === st).sort((a, b) => store.ventureScore(b, RUBRIC) - store.ventureScore(a, RUBRIC));
    return `<div class="lane"><div class="lane-head"><span class="dot" style="color:var(--${stageColor[st] || 'muted'})"></span>${st}<span class="n">${vs.length}</span></div>
      ${vs.map((v) => {
        const open = v.tasks.filter((t) => !t.done).length, val = v.assumptions.filter((a) => a.status === 'Validated').length;
        return `<a class="vcard" href="#/ventures/${v.id}"><div class="row"><div class="t">${esc(v.name)}</div><span class="score-ring">${store.ventureScore(v, RUBRIC)}</span></div>
          <div class="d">${esc(v.summary)}</div>
          <div class="meta">${v.tags.slice(0, 3).map((t) => `<span class="badge">${esc(t)}</span>`).join('')}${open ? `<span class="badge blue">${open} tasks</span>` : ''}${v.assumptions.length ? `<span class="badge ${val === v.assumptions.length ? 'green' : ''}">${val}/${v.assumptions.length} validated</span>` : ''}</div></a>`;
      }).join('')}</div>`;
  }).join('');
  return `
  <div class="page-head"><div><div class="eyebrow">Build</div><h1>Venture Engine</h1>
    <p>Every idea moves through the same discipline: score it, state the assumptions that must be true, test the riskiest one first, and only then commit capital.</p></div>
    <div class="actions"><a class="btn" href="#/engine">${icon('tower')} View in the Tower</a><button class="btn primary" data-act="new">${icon('plus')} New venture</button></div></div>
  <div class="kanban">${lanes}</div>
  <div class="card mt"><div class="card-head"><h3>How scoring works</h3></div>
    <div class="grid g4">${RUBRIC.map((r) => `<div><b>${esc(r.label)}</b><div class="muted small">Weight ${r.w}%</div></div>`).join('')}</div>
    <p class="muted small" style="margin-bottom:0">Each criterion is rated 0–10 where 10 is always best (high market demand, low capital need, strong downside protection). The score out of 100 is the weighted sum. Use it to rank ideas against each other — not as a verdict.</p></div>`;
}


// ---------- Venture workspace: every venture gets its own guided life ----------
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'store', 'china', 'venture', 'business', 'company']);
async function relatedKnowledge(v) {
  const idx = await K.loadIndex();
  const words = [...(v.tags || []), ...v.name.split(/\W+/), v.playbook === 'ecom' ? 'amazon' : ''].map((x) => String(x).toLowerCase()).filter((x) => x.length > 3 && !STOP.has(x));
  const uniq = [...new Set(words)];
  return idx.articles.map((a) => {
    const hay = `${a.title} ${(a.tags || []).join(' ')} ${a.summary || ''} ${a.slug}`.toLowerCase();
    const hits = uniq.filter((w) => hay.includes(w)).length + (a.slug.includes(v.id.replace(/^v_/, '')) ? 3 : 0);
    return { a, hits };
  }).filter((x) => x.hits > 0).sort((x, y) => y.hits - x.hits).slice(0, 5).map((x) => x.a);
}

function stepRow(v, st) {
  const done = !!v.steps?.[st.id]?.done;
  const m = MODES[st.mode] || MODES.You;
  const act = st.research ? `<button class="btn sm" data-act="stepResearch" data-id="${st.id}">${icon('spark')} Ask Claude</button>`
    : st.href ? `<a class="btn sm" href="${st.href}">Open ${icon('arrow', 'style="width:12px;vertical-align:-1px"')}</a>`
    : st.link ? `<button class="btn sm" data-act="stepLink" data-link="${st.link}">Do it here</button>` : '';
  return `<div class="check-item ${done ? 'done' : ''}"><input type="checkbox" data-change="toggleStep" data-id="${st.id}" ${done ? 'checked' : ''} aria-label="Done">
    <div class="txt"><div>${esc(st.title)} <span class="badge ${m.cls}">${m.label}</span></div><div class="small muted">${esc(st.why)}</div></div>${done ? '' : act}</div>`;
}
function guideHTML(v) {
  const pb = playbookOf(v), prog = playbookProgress(v), rd = readiness(v), next = nextStage(v.stage);
  const steps = stepsFor(v, v.stage);
  const open = steps.filter((x) => !v.steps?.[x.id]?.done);
  const others = FLOW.filter((st) => st !== v.stage && (pb.steps[st] || []).length);
  return `<div class="card"><div class="card-head"><h3>Your next moves · ${esc(v.stage)}</h3><div class="right"><span class="badge gold">${pb.name}</span><span class="badge">${prog.done}/${prog.total} steps</span></div></div>
    <p class="muted small" style="margin-top:0">${esc(STAGE_INFO[v.stage] || '')}</p>
    ${steps.length ? (open.length ? `<div class="callout gold small">Do this next: <b>${esc(open[0].title)}</b></div>` : '<div class="callout green small">Every step for this stage is done.</div>') : ''}
    ${steps.map((x) => stepRow(v, x)).join('')}
    ${rd.total ? `<hr><div class="row"><b class="small">Gate to ${next ? esc(next) : 'the next level'}</b><span class="right small muted">${rd.met}/${rd.total} met</span></div>
      <div class="bar-track" style="margin:6px 0 10px"><div class="bar-fill" style="width:${Math.round(rd.pct * 100)}%"></div></div>
      ${rd.gates.map((g) => `<a class="row small" href="${g.href}" style="color:${g.ok ? 'var(--muted)' : 'var(--text)'};margin-bottom:4px"><span class="badge ${g.ok ? 'green' : ''}">${g.ok ? '✓' : '○'}</span><span>${esc(g.label)}${g.hint ? ` <span class="muted">· ${esc(g.hint)}</span>` : ''}</span></a>`).join('')}` : ''}
    ${next ? `<button class="btn ${rd.pct === 1 ? 'primary' : ''} sm mt" data-act="advance">${rd.pct === 1 ? 'Advance to' : 'Advance anyway to'} ${esc(next)}</button>` : ''}
    ${others.length ? `<details class="mt"><summary class="muted small">All stages of this playbook</summary>${others.map((st) => `<div class="mt"><div class="small"><b>${st}</b></div>${pb.steps[st].map((x) => stepRow(v, x)).join('')}</div>`).join('')}</details>` : ''}
  </div>`;
}
function kpiCard(v) {
  const pb = playbookOf(v);
  return `<div class="card"><div class="card-head"><h3>Venture dashboard</h3></div>
    <div class="form">${pb.kpis.map(([name, unit], i) => `<div class="field"><label>${esc(name)}${unit ? ` <span class="muted">(${esc(unit)})</span>` : ''}</label><input type="number" step="any" value="${esc(v.kpis?.[name]?.v ?? '')}" data-change="kpi" data-name="${esc(name)}">${v.kpis?.[name]?.on ? `<div class="hint">Updated ${fmtDate(v.kpis[name].on)}</div>` : ''}</div>`).join('')}</div>
    <p class="small muted" style="margin-bottom:0">Update these in your weekly review. They are yours alone: nothing is shared with Claude.</p></div>`;
}

async function detailView(s, v) {
  const score = store.ventureScore(v, RUBRIC);
  const ue = unitEconomics({ price: num(v.unit.price), cogs: num(v.unit.cogs), cac: num(v.unit.cac), lifetimeMonths: num(v.unit.lifetimeMonths) || 12, purchasesPerMonth: num(v.unit.purchasesPerMonth) || 1 });
  const hasUE = num(v.unit.price) > 0;
  const b = store.base();
  const qs = s.queue.filter((q) => q.venture === v.id);
  const related = await relatedKnowledge(v);
  const prog = playbookProgress(v), rd = readiness(v);
  const riskiest = v.assumptions.filter((a) => a.status !== 'Validated' && a.status !== 'Invalidated').sort((a, b) => (b.risk || 0) - (a.risk || 0))[0];

  return `
  <div class="page-head"><div><div class="eyebrow"><a href="#/ventures">${icon('back', 'style="width:12px;vertical-align:-1px"')} Venture Engine</a></div>
    <h1>${esc(v.name)}</h1><p>${esc(v.summary)}</p></div>
    <div class="actions">
      <select class="pill-select" data-change="stage" aria-label="Stage">${STAGES.map((st) => `<option ${st === v.stage ? 'selected' : ''}>${st}</option>`).join('')}</select>
      <button class="btn" data-act="edit">${icon('edit')} Edit</button>
      <button class="btn primary" data-act="diligence">${icon('spark')} Commission diligence</button>
    </div></div>

  <div class="grid g4" style="margin-bottom:14px">
    <div class="card kpi"><div class="label">Stage gate</div><div class="value">${rd.total ? `${rd.met}/${rd.total}` : '—'}</div><div class="delta">${rd.total ? 'conditions met to advance' : 'no gate at this stage'}</div></div>
    <div class="card kpi"><div class="label">Playbook</div><div class="value">${Math.round(prog.pct * 100)}%</div><div class="delta">${prog.done} of ${prog.total} steps done</div></div>
    <div class="card kpi"><div class="label">Open tasks</div><div class="value">${v.tasks.filter((t) => !t.done).length}</div><div class="delta">${v.assumptions.filter((a) => a.status === 'Validated').length}/${v.assumptions.length} assumptions validated</div></div>
    <div class="card kpi"><div class="label">Claude research</div><div class="value">${qs.filter((q) => q.status === 'done').length}/${qs.length}</div><div class="delta">${related.length} related wiki articles</div></div>
  </div>
  <div class="grid g-main">
    <div class="stack">
      ${guideHTML(v)}
      <div class="card"><div class="card-head"><h3>Thesis</h3><div class="right"><button class="btn sm ghost" data-act="thesis">${icon('edit')} Edit</button></div></div>
        ${[['Problem', v.problem], ['Customer', v.customer], ['Why this wins', v.thesis], ['Revenue model', v.revenueModel]].map(([l, t]) => `<div class="mb"><div class="muted small" style="text-transform:uppercase;letter-spacing:.8px">${l}</div><div style="white-space:pre-wrap">${t ? esc(t) : '<span class="muted">Not written yet.</span>'}</div></div>`).join('')}
        <div class="row small muted">${v.entity ? `Entity: <b style="color:var(--text)">${esc(v.entity)}</b>` : 'No entity linked'} · Capital required: <b style="color:var(--text)">${v.capitalRequired ? money(num(v.capitalRequired), b) : '—'}</b></div>
      </div>

      <div class="card flush"><div class="card-head"><h3>Assumptions to validate</h3><div class="right"><button class="btn sm" data-act="addAssumption">${icon('plus')} Add</button></div></div>
        ${riskiest ? `<div class="callout gold" style="margin:12px 18px 0">Test next: <b>${esc(riskiest.text)}</b> — the riskiest open assumption.</div>` : ''}
        ${v.assumptions.length ? `<div class="table-wrap"><table><thead><tr><th>Assumption</th><th>Test</th><th class="num">Risk</th><th>Status</th></tr></thead><tbody>
          ${v.assumptions.map((a) => `<tr class="click" data-act="editAssumption" data-id="${a.id}"><td>${esc(a.text)}</td><td class="muted">${esc(a.test || '')}</td><td class="num">${a.risk || '—'}</td>
          <td><span class="badge ${a.status === 'Validated' ? 'green' : a.status === 'Invalidated' ? 'red' : a.status === 'Testing' ? 'blue' : ''}">${esc(a.status || 'Untested')}</span></td></tr>`).join('')}</tbody></table></div>`
          : `<div class="empty small">List the things that must be true for this to work — demand, price, cost, channel, regulation. Rank by risk.</div>`}
      </div>

      <div class="card"><div class="card-head"><h3>Execution</h3><div class="right"><button class="btn sm" data-act="addTask">${icon('plus')} Task</button></div></div>
        ${v.tasks.length ? v.tasks.map((t) => `<div class="check-item ${t.done ? 'done' : ''}"><input type="checkbox" data-change="toggleTask" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Done">
          <div class="txt">${esc(t.text)}${t.due ? `<div class="small muted">Due ${fmtDate(t.due)}</div>` : ''}</div><button class="btn sm ghost icon-btn" data-act="editTask" data-id="${t.id}" aria-label="Edit">${icon('edit')}</button></div>`).join('')
          : `<div class="empty small">Break the next milestone into actions with dates. They appear on your Command Centre.</div>`}
      </div>

      <div class="card"><div class="card-head"><h3>Notes & log</h3></div>
        <textarea data-change="notes" placeholder="Meeting notes, conversations, insights…" style="min-height:140px">${esc(v.notes)}</textarea></div>
    </div>

    <div class="stack">
      <div class="card"><div class="card-head"><h3>Score</h3><div class="right"><span class="score-ring" style="font-size:30px">${score}</span><span class="muted">/100</span></div></div>
        ${RUBRIC.map((r) => `<div class="rubric-row"><span>${esc(r.label)}</span><input type="range" min="0" max="10" step="1" value="${num(v.scores[r.k])}" data-change="score" data-k="${r.k}" aria-label="${esc(r.label)}"><b>${num(v.scores[r.k])}</b><span class="w">×${r.w}%</span></div>`).join('')}
      </div>

      <div class="card"><div class="card-head"><h3>Unit economics</h3><div class="right"><button class="btn sm ghost" data-act="unit">${icon('edit')}</button></div></div>
        ${hasUE ? `<div class="calc-out" style="margin-top:0">
          <div class="o"><div class="l">Margin / unit</div><div class="v">${money(ue.margin, b)}</div></div>
          <div class="o"><div class="l">Margin %</div><div class="v">${pct(ue.marginPct, 0)}</div></div>
          <div class="o"><div class="l">Customer LTV</div><div class="v">${money(ue.ltv, b)}</div></div>
          <div class="o"><div class="l">LTV : CAC</div><div class="v">${Number.isFinite(ue.ltvCac) ? fnum(ue.ltvCac, 1) + 'x' : '—'}</div></div>
          <div class="o"><div class="l">CAC payback</div><div class="v">${Number.isFinite(ue.paybackMonths) ? fnum(ue.paybackMonths, 1) + ' mo' : '—'}</div></div></div>
          <p class="small muted" style="margin-bottom:0">${Number.isFinite(ue.ltvCac) ? (ue.ltvCac >= 3 ? 'LTV:CAC of 3x or more is a commonly used healthy benchmark.' : 'Below the common 3x benchmark — fix price, cost or acquisition before scaling.') : ''}</p>`
          : `<div class="empty small">Enter price, unit cost, acquisition cost and customer lifetime.<br><button class="btn sm" data-act="unit">Set unit economics</button></div>`}
      </div>

      ${v.playbook === 'ecom' ? `<div class="card"><div class="card-head"><h3>Commerce Lab</h3></div><div class="row" style="gap:6px;flex-wrap:wrap"><a class="btn sm" href="#/commerce/pipeline">Product pipeline</a><a class="btn sm" href="#/commerce/calc/scratch">Margin calculator</a><a class="btn sm" href="#/commerce/suppliers">Suppliers</a><a class="btn sm" href="#/commerce/automation">Automation map</a><a class="btn sm" href="#/commerce/forecast">Cash forecast</a></div></div>` : ''}
      ${kpiCard(v)}
      <div class="card"><div class="card-head"><h3>Related knowledge</h3><div class="right"><a href="#/wiki" class="small">Wiki</a></div></div>
        ${related.length ? `<div class="list">${related.map((a) => `<a class="list-item" href="#/wiki/${a.slug}" style="color:var(--text)"><div class="grow small">${esc(a.title)}</div><span class="badge ${a.confidence === 'high' ? 'green' : a.confidence === 'low' ? 'red' : 'gold'}">${esc(a.confidence || '—')}</span></a>`).join('')}</div>` : '<div class="muted small">No articles match yet. Ask Claude a research question and the wiki grows with this venture.</div>'}
      </div>
      <div class="card"><div class="card-head"><h3>Claude research</h3></div>
        ${qs.length ? `<div class="list">${qs.map((q) => `<a class="list-item" href="${q.result?.article ? `#/wiki/${q.result.article}` : '#/claude'}" style="color:var(--text)"><span class="badge ${q.status === 'done' ? 'green' : 'blue'}">${esc(q.status)}</span><div class="grow small">${esc(q.title)}</div></a>`).join('')}</div>` : '<div class="muted small">Nothing commissioned yet.</div>'}
        <button class="btn sm mt" data-act="askVenture">${icon('plus')} Research question</button>
      </div>
      <button class="btn danger sm" data-act="delete">${icon('trash')} Delete venture</button>
    </div>
  </div>`;
}

const V = (params) => store.byId('ventures', params[0]);
const touch = (id, fn) => store.update((s) => { const v = s.ventures.find((x) => x.id === id); fn(v); v.updated = today(); });

const mod = {
  title: 'Venture Engine',
  render(s, params) {
    if (params[0]) { const v = V(params); return v ? detailView(s, v) : emptyState('Venture not found', '<a href="#/ventures">Back to the engine</a>'); }
    return listView(s);
  },
  actions: {
    new() {
      openForm({ title: 'New venture', fields: [...BASIC, THESIS[0], THESIS[1]], values: { stage: 'Idea', playbook: 'generic' }, onSave: (d) => {
        const id = uid('v');
        store.update((s) => s.ventures.push({ id, ...d, thesis: '', revenueModel: '', entity: '', scores: Object.fromEntries(RUBRIC.map((r) => [r.k, 5])), assumptions: [], tasks: [], notes: '', unit: {}, steps: {}, kpis: {}, automation: {}, automationCost: {}, created: today(), updated: today() }));
        location.hash = `#/ventures/${id}`;
      } });
    },
    edit(_, __, p) { const v = V(p); openForm({ title: 'Edit venture', fields: BASIC, values: v, onSave: (d) => touch(v.id, (x) => Object.assign(x, d)) }); },
    thesis(_, __, p) { const v = V(p); openForm({ title: 'Venture thesis', fields: THESIS, values: v, wide: true, onSave: (d) => touch(v.id, (x) => Object.assign(x, d)) }); },
    stage(el, _, p) { touch(p[0], (x) => { x.stage = el.value; }); },
    score(el, _, p) { touch(p[0], (x) => { x.scores[el.dataset.k] = num(el.value); }); },
    notes(el, _, p) { store.update((s) => { s.ventures.find((x) => x.id === p[0]).notes = el.value; }, { render: false }); toast('Notes saved', 'ok'); },
    unit(_, __, p) {
      const v = V(p);
      openForm({ title: 'Unit economics', values: v.unit, intro: '<p class="muted small" style="margin-top:0">Per unit or per customer transaction, in your base currency.</p>', fields: [
        { k: 'price', label: 'Price per unit / transaction', type: 'number' }, { k: 'cogs', label: 'Variable cost per unit', type: 'number' },
        { k: 'cac', label: 'Customer acquisition cost', type: 'number' }, { k: 'purchasesPerMonth', label: 'Purchases per customer per month', type: 'number', hint: 'e.g. 0.08 ≈ once a year' },
        { k: 'lifetimeMonths', label: 'Customer lifetime (months)', type: 'number' },
      ], onSave: (d) => touch(v.id, (x) => { x.unit = d; }) });
    },
    addAssumption(_, __, p) { assumptionForm(p[0]); },
    editAssumption(el, _, p) { assumptionForm(p[0], V(p).assumptions.find((a) => a.id === el.dataset.id)); },
    addTask(_, __, p) { taskForm(p[0]); },
    editTask(el, _, p) { taskForm(p[0], V(p).tasks.find((t) => t.id === el.dataset.id)); },
    toggleTask(el, _, p) { touch(p[0], (x) => { const t = x.tasks.find((t) => t.id === el.dataset.id); t.done = el.checked; t.doneOn = el.checked ? today() : ''; }); },
    toggleStep(el, _, p) { touch(p[0], (x) => { (x.steps ||= {})[el.dataset.id] = { done: el.checked, on: today() }; }); },
    kpi(el, _, p) { touch(p[0], (x) => { (x.kpis ||= {})[el.dataset.name] = el.value === '' ? undefined : { v: num(el.value), on: today() }; if (el.value === '') delete x.kpis[el.dataset.name]; }); },
    advance(_, __, p) { const v = V(p); const n = nextStage(v.stage); if (n) { touch(v.id, (x) => { x.stage = n; }); toast(`Moved to ${n}`, 'ok'); } },
    stepLink(el, e, p) { const m = { thesis: 'thesis', unit: 'unit', tasks: 'addTask', assumptions: 'addAssumption' }[el.dataset.link]; if (m) mod.actions[m](el, e, p); },
    stepResearch(el, _, p) {
      const v = V(p); const st = Object.values(playbookOf(v).steps).flat().find((x) => x.id === el.dataset.id); if (!st?.research) return;
      const item = K.addToQueue({ type: 'research', title: `${st.research.title}: ${v.name}`, question: `${st.research.question}\nVenture: ${v.name}. ${v.summary}`, domain: st.research.domain, venture: v.id, priority: 'High' });
      touch(v.id, (x) => { (x.steps ||= {})[st.id] = { ...(x.steps[st.id] || {}), asked: today() }; });
      toast(K.mode() === 'connected' ? 'Sent to Claude. The answer appears in the wiki and under this venture.' : 'Queued locally. Copy the prompt from the Claude Desk, or connect your vault.', 'ok');
      if (K.mode() !== 'connected') copyText(K.promptFor(item, store.get().ventures));
    },
    diligence(_, __, p) {
      const v = V(p);
      const item = K.addToQueue({ type: 'diligence', title: `Due diligence: ${v.name}`, question: `Assess ${v.name} (${v.summary}). Cover market size and demand evidence in the UAE/GCC, competitors and pricing benchmarks, regulatory and licensing requirements, unit economics benchmarks, capital required and key risks. Recommend the three riskiest assumptions to test first and the cheapest test for each.`, domain: 'Business & Ventures', venture: v.id, priority: 'High' });
      toast(K.mode() === 'connected' ? 'Diligence queued — Claude picks it up on the next run' : 'Queued locally. Copy the prompt from the Claude Desk, or connect your vault.', 'ok');
      if (K.mode() !== 'connected') copyText(K.promptFor(item, store.get().ventures));
    },
    askVenture(_, __, p) {
      const v = V(p);
      openForm({ title: `Research for ${v.name}`, saveLabel: 'Send to Claude', fields: [
        { k: 'title', label: 'Question', required: true, full: true, placeholder: 'e.g. What does a premium leather golf bag sell for in the GCC?' },
        { k: 'question', label: 'Detail / what decision this informs', type: 'textarea' },
        { k: 'domain', label: 'Domain', type: 'select', options: DOMAINS, default: 'Business & Ventures' },
        { k: 'priority', label: 'Priority', type: 'select', options: ['High', 'Normal', 'Low'], default: 'Normal' },
      ], onSave: (d) => { K.addToQueue({ ...d, venture: v.id }); toast('Sent to the Claude queue', 'ok'); } });
    },
    async delete(_, __, p) { if (await confirmBox('Delete this venture and all its assumptions, tasks and notes?')) { store.remove('ventures', p[0]); location.hash = '#/ventures'; } },
  },
};
export default mod;

function assumptionForm(vid, a) {
  openForm({ title: a ? 'Edit assumption' : 'New assumption', values: a || { status: 'Untested', risk: 3 }, fields: [
    { k: 'text', label: 'Assumption (must be true)', required: true, full: true, placeholder: 'Corporate clients will pay AED X per head for a tee-time event' },
    { k: 'test', label: 'Cheapest test', full: true, placeholder: '10 conversations with HR / events heads; pre-sell 2 events' },
    { k: 'risk', label: 'Risk if wrong (1–5)', type: 'number' }, { k: 'status', label: 'Status', type: 'select', options: ['Untested', 'Testing', 'Validated', 'Invalidated'] },
    { k: 'evidence', label: 'Evidence / result', type: 'textarea' },
  ], onSave: (d) => touch(vid, (v) => { if (a) Object.assign(v.assumptions.find((x) => x.id === a.id), d); else v.assumptions.push({ id: uid('as'), ...d }); }),
  onDelete: a ? () => touch(vid, (v) => { v.assumptions = v.assumptions.filter((x) => x.id !== a.id); }) : null });
}
function taskForm(vid, t) {
  openForm({ title: t ? 'Edit task' : 'New task', values: t || {}, fields: [
    { k: 'text', label: 'Action', required: true, full: true }, { k: 'due', label: 'Due date', type: 'date' }, { k: 'owner', label: 'Owner' },
  ], onSave: (d) => touch(vid, (v) => { if (t) Object.assign(v.tasks.find((x) => x.id === t.id), d); else v.tasks.push({ id: uid('t'), done: false, ...d }); }),
  onDelete: t ? () => touch(vid, (v) => { v.tasks = v.tasks.filter((x) => x.id !== t.id); }) : null });
}
