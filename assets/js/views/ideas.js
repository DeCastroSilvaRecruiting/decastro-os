import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, uid, openForm, toast, today, num, fmtDate } from '../ui.js';
import { BANK, EDGE, DEFAULT_EDGE, scoreIdea } from '../ideabank.js';
import { RUBRIC } from '../seed.js';

const edgeOf = (s) => s.settings.edge || DEFAULT_EDGE;

/** Bank ideas merged with whatever the owner or Claude has done to them, plus ideas Claude added. */
export function allIdeas(s) {
  const rec = new Map(s.ideas.map((i) => [i.id, i]));
  const bank = BANK.map((b) => ({ source: 'bank', status: 'new', ...b, ...(rec.get(b.id) || {}), ...{ kind: 'business' } }));
  const extra = s.ideas.filter((i) => !BANK.some((b) => b.id === i.id));
  return [...bank, ...extra].map((i) => ({ ...i, calc: scoreIdea(i, { edge: edgeOf(s), ventures: s.ventures }) }));
}
const patchIdea = (idea, patch) => store.update((s) => {
  const base = { ...idea }; delete base.calc;
  const i = s.ideas.findIndex((x) => x.id === idea.id);
  const next = { ...(i >= 0 ? s.ideas[i] : base), ...patch, updated: new Date().toISOString() };
  if (!next.created) next.created = new Date().toISOString();
  if (i >= 0) s.ideas[i] = next; else s.ideas.push(next);
});

const meter = (label, v) => `<span class="small muted" title="${label}">${label} <b style="color:var(--text)">${num(v)}</b>/10</span>`;

function card(i, s) {
  const claude = i.source === 'claude';
  return `<div class="card idea">
    <div class="card-head"><h3 style="white-space:normal">${esc(i.title)}</h3><div class="right"><span class="score-ring" title="Fit score">${i.calc.total}</span></div></div>
    <p style="margin-top:0">${esc(i.pitch)}</p>
    <div class="row small" style="gap:12px;flex-wrap:wrap">${meter('Passive', i.passive)}${meter('Capital-light', i.capitalLight)}${meter('Speed', i.speed)}${claude ? '<span class="badge violet">From Claude</span>' : '<span class="badge">Idea bank</span>'}${i.playbook === 'ecom' ? '<span class="badge green">E-commerce playbook</span>' : ''}</div>
    ${i.calc.notes.length ? `<div class="callout small mt">${i.calc.notes.map(esc).join('<br>')}</div>` : ''}
    ${i.why ? `<div class="mb mt"><div class="muted small" style="text-transform:uppercase;letter-spacing:.8px">Why it fits you</div><div>${esc(i.why)}</div></div>` : ''}
    ${i.firstTest ? `<div class="mb"><div class="muted small" style="text-transform:uppercase;letter-spacing:.8px">Cheapest first test</div><div>${esc(i.firstTest)}</div></div>` : ''}
    ${i.risks ? `<div class="mb"><div class="muted small" style="text-transform:uppercase;letter-spacing:.8px">Watch out for</div><div class="muted">${esc(i.risks)}</div></div>` : ''}
    ${(i.sources || []).length ? `<div class="small muted">Sources: ${i.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || x.url)}</a>`).join(' · ')}</div>` : ''}
    <div class="row mt" style="gap:8px;flex-wrap:wrap">
      ${i.status === 'new' ? `<button class="btn primary sm" data-act="promote" data-id="${esc(i.id)}">${icon('plus')} Turn into a venture</button>
        <button class="btn sm" data-act="research" data-id="${esc(i.id)}">${icon('spark')} Ask Claude to dig deeper</button>
        <button class="btn sm ghost right" data-act="dismiss" data-id="${esc(i.id)}">Dismiss</button>`
      : i.status === 'promoted' ? `<a class="btn sm" href="#/ventures/${esc(i.venture || '')}">Open the venture</a>`
      : `<button class="btn sm" data-act="restore" data-id="${esc(i.id)}">Restore</button>`}
    </div></div>`;
}

export default {
  title: 'Idea Scout',
  render(s) {
    const edge = edgeOf(s);
    const biz = allIdeas(s).filter((i) => i.kind !== 'product');
    const fresh = biz.filter((i) => i.status === 'new').sort((a, b) => b.calc.total - a.calc.total);
    const live = biz.filter((i) => i.status === 'promoted');
    const gone = biz.filter((i) => i.status === 'dismissed');
    const claudeNew = fresh.filter((i) => i.source === 'claude').length;
    return `
    <div class="page-head"><div><div class="eyebrow">Build</div><h1>Idea Scout</h1>
      <p>Ideas ranked by how well they use what you already have: your skills, your network and the ventures you run. Claude's scout adds new, sourced ideas every week. Anything you like becomes a venture with its own playbook.</p></div>
      <div class="actions"><button class="btn primary" data-act="brief">${icon('spark')} Brief the scout</button></div></div>

    <div class="card"><div class="card-head"><h3>Your edge</h3><div class="right small muted">Tap to switch on or off. Scores update instantly.</div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap">${EDGE.map(([k, l]) => `<button class="badge ${edge.includes(k) ? 'gold' : ''}" style="cursor:pointer;border:1px solid var(--line)" data-act="edge" data-k="${k}" aria-pressed="${edge.includes(k)}">${esc(l)}</button>`).join('')}</div>
      <p class="small muted" style="margin-bottom:0">${K.mode() === 'connected' ? `${claudeNew} new idea${claudeNew === 1 ? '' : 's'} from Claude. The scout reads a brief of your ventures from the vault.` : 'Local mode: connect your vault in Settings to receive Claude\'s weekly scouted ideas and product leads.'}</p></div>

    <div class="callout gold mt small">A reality check before you start anything new: read your employment contract for outside-business and non-compete clauses, and get written permission if needed. Idea scores are a guide to focus, not a forecast.</div>

    <h2 class="mt" style="font-size:18px">Ranked for you <span class="muted small">${fresh.length}</span></h2>
    <div class="grid g2">${fresh.map((i) => card(i, s)).join('') || '<div class="empty small">No open ideas. Brief the scout for more.</div>'}</div>

    ${live.length ? `<h2 class="mt" style="font-size:18px">In motion <span class="muted small">${live.length}</span></h2><div class="grid g2">${live.map((i) => card(i, s)).join('')}</div>` : ''}
    ${gone.length ? `<details class="mt"><summary class="muted">Dismissed (${gone.length})</summary><div class="grid g2 mt">${gone.map((i) => card(i, s)).join('')}</div></details>` : ''}`;
  },
  actions: {
    edge(el) { const k = el.dataset.k; store.update((s) => { const e = new Set(s.settings.edge || DEFAULT_EDGE); e.has(k) ? e.delete(k) : e.add(k); s.settings.edge = [...e]; }); },
    dismiss(el) { patchIdea(allIdeas(store.get()).find((i) => i.id === el.dataset.id), { status: 'dismissed' }); },
    restore(el) { patchIdea(allIdeas(store.get()).find((i) => i.id === el.dataset.id), { status: 'new' }); },
    research(el) {
      const i = allIdeas(store.get()).find((x) => x.id === el.dataset.id);
      const item = K.addToQueue({ type: 'research', priority: 'Normal', domain: 'Business & Ventures', title: `Idea deep-dive: ${i.title}`, question: `${i.pitch}\nTest the idea: size the market in the UAE/GCC with sources, name the closest competitors and their prices, list licences and regulations, estimate capital and margins with benchmarks, and say what would make this a clear yes or no. Known risks: ${i.risks || 'none listed'}.` });
      toast(K.mode() === 'connected' ? 'Sent to Claude' : 'Queued locally. Connect your vault so Claude can pick it up.', 'ok');
      return item;
    },
    brief() {
      openForm({ title: 'Brief the Idea Scout', saveLabel: 'Queue the brief', intro: '<p class="muted small" style="margin-top:0">Claude proposes new business ideas and product leads, scored against your ventures and edge. Leave blank for an open scan.</p>', fields: [
        { k: 'focus', label: 'Focus or constraint', type: 'textarea', placeholder: 'e.g. low-capital, runs without me, uses my South African contacts, under AED 50k to start' },
      ], onSave: (d) => {
        K.addToQueue({ type: 'task', priority: 'Normal', domain: 'Business & Ventures', title: `Idea scout: ${d.focus ? d.focus.slice(0, 70) : 'open scan'}`, question: `Follow claude/IDEA_SCOUT.md. Add 3 new business ideas and 5 product leads to ideas/ideas.json.${d.focus ? ` Owner brief: ${d.focus}` : ''}` });
        toast(K.mode() === 'connected' ? 'Queued. Claude picks it up on the next run.' : 'Queued locally. Connect your vault so Claude can pick it up.', 'ok');
      } });
    },
    promote(el) {
      const s = store.get();
      const i = allIdeas(s).find((x) => x.id === el.dataset.id);
      const id = uid('v');
      const n = (x) => Math.max(0, Math.min(10, Math.round(num(x))));
      const assumptions = (i.assumptions?.length ? i.assumptions : [{ text: `The idea works: ${i.title}`, test: i.firstTest || 'Define the cheapest test', risk: 4 }])
        .map((a) => ({ id: uid('as'), text: a.text, test: a.test || '', risk: a.risk || 3, status: 'Untested', evidence: '' }));
      const tasks = (i.tasks || (i.firstTest ? [i.firstTest] : [])).map((t) => ({ id: uid('t'), text: t, done: false, due: '', owner: '' }));
      const v = {
        id, name: i.title.replace(/:.*$/, '').slice(0, 60), stage: 'Idea', playbook: i.playbook || 'generic', summary: i.pitch,
        tags: (i.tags && i.tags.length ? i.tags : i.leverage || []).slice(0, 5),
        problem: '', customer: '', thesis: i.why || '', revenueModel: '', capitalRequired: '', entity: '',
        scores: Object.fromEntries(RUBRIC.map((r) => [r.k, 5])), assumptions, tasks,
        notes: `Origin: Idea Scout (${i.source === 'claude' ? 'Claude' : 'idea bank'}).\nFirst cheap test: ${i.firstTest || '-'}\nRisks: ${i.risks || '-'}`,
        unit: {}, steps: {}, kpis: {}, automation: {}, automationCost: {}, created: today(), updated: today(),
      };
      Object.assign(v.scores, { fit: n(i.calc.fit * 10 || 5), edge: n(i.calc.fit * 10 || 5), speed: n(i.speed), capital: n(i.capitalLight), scale: n(i.passive) });
      store.update((st) => st.ventures.push(v));
      patchIdea(i, { status: 'promoted', venture: id });
      K.addToQueue({ type: 'diligence', priority: 'High', domain: 'Business & Ventures', venture: id, title: `Due diligence: ${v.name}`, question: `Assess ${v.name}: ${i.pitch} Cover market and demand evidence in the UAE/GCC, competitors and pricing, licensing, unit economics benchmarks, capital needed, and the three riskiest assumptions with the cheapest test for each.` });
      toast('Venture created. Its playbook and diligence are ready.', 'ok');
      location.hash = `#/ventures/${id}`;
    },
  },
};
