// Stage gates: what must be true for a venture to move to the next stage.
// Each gate names the module that satisfies it, so the 3D engine can show how the tools feed the pipeline.
import * as store from './store.js';
import { num } from './ui.js';
import { unitEconomics } from './fin.js';
import { RUBRIC } from './seed.js';

export const FLOW = ['Idea', 'Validate', 'Plan', 'Build', 'Launch', 'Scale'];

export const STAGE_INFO = {
  Idea: 'Capture the idea, define the problem and the customer, map what must be true, and score it against the rest of the pipeline.',
  Validate: 'Prove demand and price with real buyers. Test the riskiest assumption first, cheaply. Commission Claude diligence.',
  Plan: 'Prove the model on paper: unit economics, capital required, the legal entity, and whether strategic cash can fund it.',
  Build: 'Form the entity, open the books, and build the minimum version that a paying customer can use.',
  Launch: 'Repeatable sales at a known acquisition cost. Revenue booked in the ledger.',
  Scale: 'Grow the engine with healthy unit economics, deliberate capital and decisions written down.',
  Parked: 'On hold. Kept for reference — revive it when conditions change.',
};

const ue = (v) => unitEconomics({ price: num(v.unit?.price), cogs: num(v.unit?.cogs), cac: num(v.unit?.cac), lifetimeMonths: num(v.unit?.lifetimeMonths) || 12, purchasesPerMonth: num(v.unit?.purchasesPerMonth) || 1 });
const entityOf = (v) => store.get().entities.find((e) => e.name === v.entity);
const revenueFor = (v) => {
  if (!v.entity) return 0;
  return store.accountBalances(v.entity).filter((a) => a.type === 'income').reduce((t, a) => t + a.balance, 0);
};

/** Gates to EXIT the venture's current stage. Each: {label, ok, module, href, hint} */
export function gates(v) {
  const s = store.get();
  const score = store.ventureScore(v, RUBRIC);
  const A = v.assumptions || [];
  const validated = A.filter((a) => a.status === 'Validated').length;
  const riskiest = A.slice().sort((a, b) => num(b.risk) - num(a.risk))[0];
  const diligence = s.queue.some((q) => q.venture === v.id && q.status === 'done');
  const u = ue(v);
  const cap = num(v.capitalRequired);
  const strategic = store.wealth().byTier.Strategic || 0;
  const ent = entityOf(v);
  const vHref = `#/ventures/${v.id}`;
  switch (v.stage) {
    case 'Idea': return [
      { label: 'Problem and customer defined', ok: !!(v.problem && v.customer), module: 'ventures', href: vHref },
      { label: 'At least 3 assumptions mapped', ok: A.length >= 3, module: 'ventures', href: vHref },
      { label: 'Scores 50 or more out of 100', ok: score >= 50, module: 'ventures', href: vHref, hint: `Currently ${score}` },
      { label: 'Background researched in the wiki', ok: s.queue.some((q) => q.venture === v.id), module: 'wiki', href: '#/wiki' },
    ];
    case 'Validate': return [
      { label: 'Riskiest assumption validated', ok: !!riskiest && riskiest.status === 'Validated', module: 'ventures', href: vHref, hint: riskiest ? riskiest.text : 'No assumptions yet' },
      { label: 'Half of assumptions validated', ok: A.length > 0 && validated / A.length >= 0.5, module: 'ventures', href: vHref, hint: `${validated}/${A.length}` },
      { label: 'Claude diligence complete', ok: diligence, module: 'claude', href: '#/claude' },
      { label: 'Expected value modelled', ok: s.decisions.some((d) => mentions(d, v) && d.expected !== '' && d.expected != null), module: 'math', href: '#/math/decisions', hint: 'Log a decision naming this venture, with expected value' },
    ];
    case 'Plan': return [
      { label: 'Thesis and revenue model written', ok: !!(v.thesis && v.revenueModel), module: 'ventures', href: vHref },
      { label: 'Unit economics: LTV:CAC of 3x or more', ok: Number.isFinite(u.ltvCac) && u.ltvCac >= 3, module: 'ventures', href: vHref, hint: Number.isFinite(u.ltvCac) ? `${u.ltvCac.toFixed(1)}x` : 'Not set' },
      { label: 'Capital required set', ok: cap > 0, module: 'ventures', href: vHref },
      { label: 'Fundable from strategic cash', ok: cap > 0 && strategic >= cap, module: 'treasury', href: '#/treasury', hint: 'Strategic tier must cover the capital required' },
      { label: 'Legal entity chosen', ok: !!v.entity, module: 'legal', href: '#/legal/entities' },
    ];
    case 'Build': return [
      { label: 'Entity active', ok: !!ent && ent.status === 'Active', module: 'legal', href: '#/legal/entities' },
      { label: 'Books opened for the entity', ok: !!v.entity && s.journal.some((j) => j.entity === v.entity), module: 'finance', href: '#/finance' },
      { label: 'Build tasks moving, none overdue', ok: (v.tasks || []).some((t) => t.done) && !(v.tasks || []).some((t) => !t.done && t.due && t.due < new Date().toISOString().slice(0, 10)), module: 'ventures', href: vHref },
      { label: 'Key contracts registered', ok: s.contracts.some((c) => c.entity === v.entity), module: 'legal', href: '#/legal/contracts' },
    ];
    case 'Launch': return [
      { label: 'Revenue booked in the ledger', ok: revenueFor(v) > 0, module: 'finance', href: '#/finance/statements' },
      { label: 'LTV:CAC of 3x or more', ok: Number.isFinite(u.ltvCac) && u.ltvCac >= 3, module: 'ventures', href: vHref },
      { label: 'Scale decision logged with a forecast', ok: s.decisions.some((d) => mentions(d, v) && d.probability !== '' && d.probability != null), module: 'math', href: '#/math/decisions' },
    ];
    case 'Scale': return [
      { label: 'Reviewed quarterly in the compliance calendar', ok: s.compliance.some((c) => c.title.toLowerCase().includes(v.name.toLowerCase())), module: 'legal', href: '#/legal/compliance' },
    ];
    default: return [];
  }
}
const mentions = (d, v) => `${d.title} ${d.context || ''} ${d.choice || ''}`.toLowerCase().includes(v.name.toLowerCase());

export function readiness(v) {
  const g = gates(v);
  if (!g.length) return { met: 0, total: 0, pct: v.stage === 'Scale' ? 1 : 0, gates: g };
  const met = g.filter((x) => x.ok).length;
  return { met, total: g.length, pct: met / g.length, gates: g };
}
export const nextStage = (stage) => { const i = FLOW.indexOf(stage); return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null; };
export const prevStage = (stage) => { const i = FLOW.indexOf(stage); return i > 0 ? FLOW[i - 1] : null; };
