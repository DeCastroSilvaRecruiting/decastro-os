// empire-game.js — turns real, recorded activity into progress: XP, levels, streaks, milestones and quests.
// Nothing here is self-reported: every point comes from something dated or verifiable in the app's data.
// Pure functions of state (no DOM), shared by The Tower, the Command Centre and tests.
import { FLOW, readiness, nextStage } from './gates.js';

const num = (x) => (Number.isFinite(+x) ? +x : 0);
const dayDiff = (a, b) => Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000);
const d10 = (x) => (x ? String(x).slice(0, 10) : '');

export const LEVELS = [
  { at: 0, title: 'Founder', perk: 'The site is surveyed. Every floor of the tower is yours to earn.' },
  { at: 250, title: 'Operator', perk: 'The first towers rise on the skyline.' },
  { at: 700, title: 'Builder', perk: 'Aviation lights on every pavilion: the site is live.' },
  { at: 1500, title: 'Owner', perk: 'A second ring of towers fills the skyline.' },
  { at: 3000, title: 'Investor', perk: 'A supertall landmark crowns your skyline.' },
  { at: 5500, title: 'Tycoon', perk: 'The skyline stays lit through the night.' },
  { at: 9000, title: 'Magnate', perk: 'A city of your own on the horizon.' },
  { at: 15000, title: 'Dynasty', perk: 'The crane comes down. The tower is complete.' },
];

/** Where each kind of activity lives in the tower: a pavilion key, 'ventures' or a stage. */
export const MOD_OF = { research: 'claude', decision: 'math', ledger: 'finance', legal: 'legal', treasury: 'treasury', invest: 'investments', property: 'property', procure: 'procure', commerce: 'commerce', idea: 'wiki' };

// ---------------------------------------------------------------- events: what has actually been done
export function events(s) {
  const out = [];
  const add = (date, xp, text, k, href, extra = {}) => out.push({ date: d10(date), xp, text, k, href, ...extra });
  for (const v of s.ventures || []) {
    for (const h of v.history || []) {
      const i = FLOW.indexOf(h.to), j = FLOW.indexOf(h.from);
      if (h.to === 'Parked') add(h.date, 20, `Parked ${v.name}: discipline over sunk cost`, 'ventures', `#/ventures/${v.id}`, { venture: v.id, stage: 'Parked' });
      else if (i > j) add(h.date, 100 * (i + 1), `${v.name} rose to ${h.to}`, 'ventures', `#/ventures/${v.id}`, { venture: v.id, stage: h.to });
    }
    for (const [, st] of Object.entries(v.steps || {})) if (st?.done) add(st.on, 15, `${v.name}: playbook step done`, 'ventures', `#/ventures/${v.id}`, { venture: v.id, stage: v.stage });
    for (const [name, kp] of Object.entries(v.kpis || {})) if (kp?.on) add(kp.on, 5, `${v.name}: ${name} updated`, 'ventures', `#/ventures/${v.id}`, { venture: v.id });
    for (const t of v.tasks || []) if (t.done) add(t.doneOn || '', 10, `${v.name}: ${t.text}`, 'ventures', `#/ventures/${v.id}`, { venture: v.id });
    for (const a of v.assumptions || []) if (a.status === 'Validated' || a.status === 'Invalidated') add('', 30, `${v.name}: assumption ${a.status.toLowerCase()}`, 'ventures', `#/ventures/${v.id}`, { venture: v.id });
  }
  for (const q of s.queue || []) if (q.status === 'done') add(q.updated, 40, `Research done: ${q.title}`, 'claude', '#/claude', { venture: q.venture });
  for (const d of s.decisions || []) {
    add(d.date, 25, `Decision logged: ${d.title}`, 'math', '#/math/decisions');
    if (d.outcome && d.outcome !== 'Pending') add(d.reviewDate || d.date, 40, `Decision reviewed: ${d.title}`, 'math', '#/math/decisions');
  }
  for (const j of s.journal || []) add(j.date, 5, `Booked: ${j.memo || 'journal entry'}`, 'finance', '#/finance');
  for (const c of s.compliance || []) { if (c.lastDone) add(c.lastDone, 30, `Obligation met: ${c.title}`, 'legal', '#/legal/compliance'); else if (c.status === 'Done') add('', 30, `Obligation met: ${c.title}`, 'legal', '#/legal/compliance'); }
  for (const e of s.entities || []) if (e.status === 'Active' && e.type !== 'Individual') add('', 150, `Entity active: ${e.name}`, 'legal', '#/legal/entities');
  for (const c of s.contracts || []) add(c.start || '', 20, `Contract registered: ${c.title}`, 'legal', '#/legal/contracts');
  for (const n of s.snapshots || []) add(n.date, 20, 'Net-worth snapshot recorded', 'treasury', '#/treasury');
  for (const h of s.holdings || []) add(h.date || '', 20, `Holding tracked: ${h.name || h.ticker || 'investment'}`, 'investments', '#/investments');
  for (const p of s.properties || []) if (p.status !== 'Target') add(p.purchaseDate || '', 100, `Property owned: ${p.name}`, 'property', '#/property');
  for (const i of s.ideas || []) {
    if (i.status === 'promoted') add(i.updated, 60, `Idea promoted to a venture: ${i.title}`, 'claude', '#/ideas');
    else if (i.status === 'dismissed') add(i.updated, 10, `Idea reviewed and dismissed: ${i.title}`, 'claude', '#/ideas');
  }
  for (const r of s.rfqs || []) {
    for (const q of r.quotes || []) add(q.received, 5, `Quote logged: ${r.title}`, 'procure', `#/procure/sourcing/${r.id}`, { venture: r.venture });
    if (r.status === 'Awarded') add(r.updated || r.created, 30, `Supplier chosen: ${r.title}`, 'procure', `#/procure/sourcing/${r.id}`, { venture: r.venture });
  }
  for (const o of s.orders || []) if (['Received', 'Closed'].includes(o.status)) add(o.receivedDate, 50, `Goods received: ${o.number}`, 'procure', `#/procure/orders/${o.id}`, { venture: o.venture });
  for (const x of s.suppliers || []) add(x.updated || '', 10, `Supplier on file: ${x.name}`, 'procure', '#/procure/suppliers');
  for (const p of s.products || []) if (p.status && !['Lead', 'New'].includes(p.status)) add(p.updated || '', 15, `Product researched: ${p.name || p.title || 'lead'}`, 'commerce', '#/commerce');
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// ---------------------------------------------------------------- streak: consecutive weeks with real activity
const weekKey = (date) => { const d = new Date(`${date}T00:00:00`); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function streak(evts, todayStr) {
  const weeks = new Set(evts.filter((e) => e.date && e.date <= todayStr).map((e) => weekKey(e.date)));
  const thisWeek = weekKey(todayStr);
  let cur = new Date(`${thisWeek}T00:00:00`), n = 0, live = weeks.has(thisWeek);
  if (!live) cur.setDate(cur.getDate() - 7);              // this week isn't over: the streak survives until Sunday
  for (;;) { const k = weekKey(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`); if (!weeks.has(k)) break; n++; cur.setDate(cur.getDate() - 7); }
  return { weeks: n, activeThisWeek: live };
}

// ---------------------------------------------------------------- milestones: real-world achievements
export function milestones(s, ctx = {}) {
  const live = (s.ventures || []).filter((v) => v.stage !== 'Parked');
  const atLeast = (st) => (s.ventures || []).some((v) => FLOW.indexOf(v.stage) >= FLOW.indexOf(st)) || (s.ventures || []).some((v) => (v.history || []).some((h) => FLOW.indexOf(h.to) >= FLOW.indexOf(st)));
  const incomeIds = new Set((s.coa || []).filter((a) => a.type === 'income').map((a) => a.id));
  const revenue = (s.journal || []).some((j) => (j.lines || []).some((l) => incomeIds.has(l.account) && num(l.credit) > 0));
  const itemsMulti = (s.catalog || []).some((it) => new Set((s.prices || []).filter((p) => p.item === it.id && p.supplier).map((p) => p.supplier)).size >= 2);
  const w = ctx.wealth || {};
  const doneQ = (s.queue || []).filter((q) => q.status === 'done').length;
  const list = [
    { id: 'plant', title: 'Three in the ground', desc: 'Three live ventures in the pipeline.', k: 'ventures', xp: 100, p: live.length / 3 },
    { id: 'validate', title: 'First gate', desc: 'A venture reaches Validate.', k: 'ventures', xp: 150, p: atLeast('Validate') ? 1 : 0 },
    { id: 'build', title: 'Breaking ground', desc: 'A venture reaches Build: capital committed on evidence.', k: 'ventures', xp: 300, p: atLeast('Build') ? 1 : 0 },
    { id: 'launch', title: 'Open for business', desc: 'A venture reaches Launch.', k: 'ventures', xp: 500, p: atLeast('Launch') ? 1 : 0 },
    { id: 'scale', title: 'Canopy', desc: 'A venture reaches Scale.', k: 'ventures', xp: 1000, p: atLeast('Scale') ? 1 : 0 },
    { id: 'kill', title: 'Kill discipline', desc: 'Park a venture that failed its gates.', k: 'ventures', xp: 50, p: (s.ventures || []).some((v) => v.stage === 'Parked' || (v.history || []).some((h) => h.to === 'Parked')) ? 1 : 0 },
    { id: 'entity', title: 'Incorporated', desc: 'A company or free-zone entity is active.', k: 'legal', xp: 250, p: (s.entities || []).some((e) => e.status === 'Active' && e.type !== 'Individual') ? 1 : 0 },
    { id: 'books', title: 'Books open', desc: 'Ten entries in the ledger.', k: 'finance', xp: 100, p: Math.min(1, (s.journal || []).length / 10) },
    { id: 'revenue', title: 'First revenue', desc: 'Income booked in the ledger.', k: 'finance', xp: 400, p: revenue ? 1 : 0 },
    { id: 'runway', title: 'Six months of runway', desc: 'Liquid cash covers six months of outgoings.', k: 'treasury', xp: 200, p: Number.isFinite(w.runway) ? Math.min(1, w.runway / 6) : 0 },
    { id: 'warchest', title: 'War chest', desc: 'Cash set aside in the strategic tier.', k: 'treasury', xp: 150, p: (w.byTier?.Strategic || 0) > 0 ? 1 : 0 },
    { id: 'research', title: 'Research engine', desc: 'Ten research questions answered by Claude.', k: 'claude', xp: 150, p: Math.min(1, doneQ / 10) },
    { id: 'wiki', title: 'Compounding knowledge', desc: 'Twenty-five articles in the wiki.', k: 'wiki', xp: 150, p: Math.min(1, num(ctx.wikiCount) / 25) },
    { id: 'decide', title: 'Decision discipline', desc: 'Five decisions logged, one reviewed against its outcome.', k: 'math', xp: 150, p: Math.min(1, ((s.decisions || []).length / 5) * 0.8 + ((s.decisions || []).some((d) => d.outcome && d.outcome !== 'Pending') ? 0.2 : 0)) },
    { id: 'supply', title: 'Supply chain live', desc: 'A purchase order received in full.', k: 'procure', xp: 200, p: (s.orders || []).some((o) => ['Received', 'Closed'].includes(o.status)) ? 1 : 0 },
    { id: 'second', title: 'Second source', desc: 'An item quoted by two or more suppliers.', k: 'procure', xp: 100, p: itemsMulti ? 1 : 0 },
    { id: 'property', title: 'Landlord', desc: 'An income property owned.', k: 'property', xp: 400, p: (s.properties || []).some((p) => p.status !== 'Target') ? 1 : 0 },
    { id: 'invest', title: 'Compounder', desc: 'An investment holding tracked.', k: 'investments', xp: 100, p: (s.holdings || []).length ? 1 : 0 },
    { id: 'streak', title: 'Four-week streak', desc: 'Real activity recorded in four weeks running.', k: 'core', xp: 200, p: Math.min(1, num(ctx.streakWeeks) / 4) },
  ];
  return list.map((m) => ({ ...m, p: Math.max(0, Math.min(1, m.p || 0)), done: (m.p || 0) >= 1 }));
}

// ---------------------------------------------------------------- attention: what needs the owner, per tower element
/** sev: 3 overdue / blocking, 2 due soon, 1 worth doing */
export function attention(s, ctx = {}) {
  const t = ctx.today, need = [];
  const add = (k, sev, text, href, extra = {}) => need.push({ k, sev, text, href, ...extra });
  for (const d of ctx.deadlines || []) {
    const k = d.href.startsWith('#/procure') ? 'procure' : d.href.startsWith('#/legal') ? 'legal' : d.href.startsWith('#/math') ? 'math' : d.href.startsWith('#/ventures') ? 'ventures' : 'core';
    const venture = d.href.startsWith('#/ventures/') ? d.href.split('/')[2] : undefined;
    add(k, d.days < 0 ? 3 : d.days <= 7 ? 2 : 1, `${d.days < 0 ? `Overdue by ${-d.days} day${d.days === -1 ? '' : 's'}` : d.days === 0 ? 'Due today' : `Due in ${d.days} day${d.days === 1 ? '' : 's'}`}: ${d.title}`, d.href, { venture, xp: k === 'procure' ? 30 : 25 });
  }
  for (const v of s.ventures || []) {
    if (v.stage === 'Parked') continue;
    const r = readiness(v), nx = nextStage(v.stage), open = r.gates.filter((g) => !g.ok);
    if (nx && open.length === 1) add('ventures', 2, `${v.name} is one gate from ${nx}: ${open[0].label}`, open[0].href, { venture: v.id, stage: v.stage, xp: 100 * (FLOW.indexOf(nx) + 1) });
    else if (nx && r.pct >= 1) add('ventures', 2, `${v.name} has met every gate: advance it to ${nx}`, '#/engine', { venture: v.id, stage: v.stage, xp: 100 * (FLOW.indexOf(nx) + 1) });
    else if (nx) open.slice(0, 2).forEach((g) => add(g.module && g.module !== 'ventures' ? g.module : 'ventures', 1, `${v.name}: ${g.label}`, g.href, { venture: v.id, stage: v.stage, xp: 10 }));
    const stale = v.updated ? dayDiff(t, d10(v.updated)) : 0;
    if (stale > 21) add('ventures', 1, `${v.name} untouched for ${stale} days: move it or park it`, `#/ventures/${v.id}`, { venture: v.id, stage: v.stage, xp: 20 });
  }
  const proposed = (s.queue || []).filter((q) => q.status === 'proposed');
  if (proposed.length) add('claude', 1, `${proposed.length} research proposal${proposed.length === 1 ? '' : 's'} from Claude awaiting your approval`, '#/claude', { xp: 10 });
  const w = ctx.wealth || {};
  if (!(s.cash || []).length) add('treasury', 2, 'No bank or cash accounts recorded: runway is unknown', '#/treasury', { xp: 20 });
  else if (Number.isFinite(w.runway) && w.runway < 6) add('treasury', w.runway < 3 ? 3 : 2, `Runway is ${w.runway.toFixed(1)} months, under the six-month target`, '#/treasury', { xp: 20 });
  const lastSnap = (s.snapshots || []).map((x) => x.date).sort().pop();
  if ((s.cash || []).length && (!lastSnap || dayDiff(t, lastSnap) > 90)) add('treasury', 1, 'No net-worth snapshot in 90 days', '#/treasury', { xp: 20 });
  if (ctx.fxWarning) add('treasury', ctx.fxWarning.level === 'red' ? 2 : 1, `Exchange rates unconfirmed: ${ctx.fxWarning.ccys.join(', ')}`, '#/treasury/fx', { xp: 5 });
  (s.compliance || []).filter((c) => c.status !== 'Done' && !c.due).forEach((c) => add('legal', 1, `Set a due date: ${c.title}`, '#/legal/compliance', { xp: 5 }));
  const building = (s.ventures || []).filter((v) => ['Build', 'Launch', 'Scale'].includes(v.stage));
  for (const v of building) if (!v.entity || !(s.journal || []).some((j) => j.entity === v.entity)) add('finance', 2, `${v.name} is at ${v.stage} with no books open`, '#/finance', { venture: v.id, xp: 30 });
  for (const a of ctx.procureAlerts || []) add('procure', a.tone === 'red' ? 3 : 2, a.text, a.href, { xp: 30 });
  // de-duplicate on text
  const seen = new Set();
  return need.filter((n) => (seen.has(n.text) ? false : seen.add(n.text))).sort((a, b) => b.sev - a.sev);
}

// ---------------------------------------------------------------- the whole game state
export function levelOf(xp) {
  let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].at) i++;
  const cur = LEVELS[i], nxt = LEVELS[i + 1];
  return { n: i + 1, title: cur.title, perk: cur.perk, at: cur.at, next: nxt ? nxt.at : null, nextTitle: nxt ? nxt.title : null, nextPerk: nxt ? nxt.perk : null, p: nxt ? (xp - cur.at) / (nxt.at - cur.at) : 1 };
}

export function game(s, ctx) {
  const evts = events(s);
  const st = streak(evts, ctx.today);
  const ms = milestones(s, { ...ctx, streakWeeks: st.weeks });
  const baseXP = evts.reduce((a, e) => a + e.xp, 0);
  const msXP = ms.filter((m) => m.done).reduce((a, m) => a + m.xp, 0);
  const xp = baseXP + msXP;
  const lv = levelOf(xp);
  const need = attention(s, ctx);
  const week = evts.filter((e) => e.date && dayDiff(ctx.today, e.date) <= 6 && e.date <= ctx.today);
  const quests = need.slice(0, 6);
  const by = (k) => ({ needs: need.filter((n) => n.k === k), done: evts.filter((e) => e.k === k), xp: evts.filter((e) => e.k === k).reduce((a, e) => a + e.xp, 0) });
  return {
    xp, baseXP, msXP, level: lv, streak: st, events: evts, milestones: ms, attention: need, quests,
    weekXP: week.reduce((a, e) => a + e.xp, 0), weekCount: week.length,
    module: (k) => by(k),
    venture: (id) => ({ needs: need.filter((n) => n.venture === id), done: evts.filter((e) => e.venture === id), xp: evts.filter((e) => e.venture === id).reduce((a, e) => a + e.xp, 0) }),
    stage: (stName, ventureIds) => ({ needs: need.filter((n) => n.stage === stName || (n.venture && ventureIds.includes(n.venture))), done: evts.filter((e) => e.stage === stName), xp: evts.filter((e) => e.stage === stName).reduce((a, e) => a + e.xp, 0) }),
  };
}
