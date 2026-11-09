// game-world.js — the playable layer of The Tower: places to walk to, routes around the island,
// the Venture HQ footbridge, workshop lessons, quick actions and the business-plan sections.
import { Mesh, box, tube, card, circlePts, lathe, sphere, V, TAU, hex, mt } from './gl.js';
import { ALL_DEFS, OUTPOST_DEFS, polar } from './tower-scene.js';

// ---------------------------------------------------------------- places and routes
export const RING = 7.62;
export const HQ = { k: 'hq', label: 'Venture HQ', deg: 85.7, doorR: 3.78, faceIn: true };
export function ringR(deg) {
  let r = RING;
  for (const o of OUTPOST_DEFS) { const d = Math.abs(deg - o.deg); if (d < 16) r = Math.min(r, 6.5 + ((RING - 6.5) * (1 - Math.cos((Math.PI * d) / 16))) / 2); }
  return r;
}
export const PLACES = [HQ, ...ALL_DEFS.map((m) => ({ k: m.k, label: m.label, deg: m.deg, doorR: m.group === 'operations' ? 6.3 : 7.36, group: m.group }))];
export const placeOf = (k) => PLACES.find((p) => p.k === k);
const clampDeg = (d) => Math.max(62, Math.min(298, d));
export const yAt = (r) => (r <= 5.12 && r >= 3.45 ? 0.125 : 0.02);
export const toXYZ = (deg, r) => { const p = polar(deg, r); return [p[0], yAt(r), p[2]]; };
export const toPolar = (p) => { let deg = (Math.atan2(p[2], p[0]) * 180) / Math.PI; if (deg < 0) deg += 360; return { deg, r: Math.hypot(p[0], p[2]) }; };

/** Waypoints from a position to a place (or to a free spot { deg, r } on the walkway). */
export function route(fromPos, to) {
  const f = toPolar(fromPos), pts = [];
  const fd = clampDeg(f.deg), td = clampDeg(to.deg);
  if (f.r < 5.15) pts.push(toXYZ(fd, 5.2));                               // step off the HQ footbridge first
  pts.push(toXYZ(fd, ringR(fd)));
  const steps = Math.max(1, Math.ceil(Math.abs(td - fd) / 3));
  for (let i = 1; i <= steps; i++) { const d = fd + ((td - fd) * i) / steps; pts.push(toXYZ(d, ringR(d))); }
  const door = to.doorR ?? to.r;
  if (to.k === 'hq') { pts.push(toXYZ(td, 5.2)); pts.push(toXYZ(td, door)); }
  else if (Math.abs(door - ringR(td)) > 0.02) pts.push(toXYZ(td, door));
  return pts;
}
/** Free roam: a clicked ground point becomes a walkable spot on the garden ring. */
export function spotFromGround(p) {
  const q = toPolar(p);
  if (q.deg < 60 || q.deg > 300 || q.r < 5.3 || q.r > 8.25) return null;
  return { deg: q.deg, r: Math.max(5.35, Math.min(8.05, q.r)) };
}

// ---------------------------------------------------------------- HQ footbridge and portal (static scene)
export function buildHQ(R) {
  const m = new Mesh(), glow = new Mesh(), gold = { col: hex('#e2c477'), mat: mt(0.35, 0.6, 1.6, 11) };
  const d = (HQ.deg * Math.PI) / 180, c = Math.cos(d), s = Math.sin(d), side = [-s, 0, c];
  const at = (r, y, o = 0) => [c * r + side[0] * o, y, s * r + side[2] * o];
  box(m, at(4.35, 0.07, 0), 1.75, 0.1, 0.62, d, { col: hex('#c9b99a'), mat: mt(0.75, 0, 0, 2) });
  for (let k = 0; k < 7; k++) box(m, at(3.65 + k * 0.24, 0.125, 0), 0.02, 0.012, 0.6, d, { col: hex('#8a7a5e'), mat: mt(0.9, 0, 0, 0) });   // planks
  for (const o of [-0.3, 0.3]) { tube(m, [at(3.5, 0.32, o), at(5.15, 0.32, o)], 0.014, 5, gold); for (let k = 0; k <= 4; k++) tube(m, [at(3.5 + k * 0.41, 0.12, o), at(3.5 + k * 0.41, 0.32, o)], 0.01, 4, { col: hex('#3a3f46'), mat: mt(0.4, 0.8, 0, 0) }); }
  // portal arch at the plinth edge
  const arch = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI; arch.push(at(3.42, 0.12 + Math.sin(a) * 0.62 + 0.0, Math.cos(a) * 0.3)); }
  tube(m, [at(3.42, 0.12, 0.3), ...arch.reverse(), at(3.42, 0.12, -0.3)], 0.035, 8, gold);
  card(glow, at(3.43, 0.44, 0), [-s * 0.27, 0, c * 0.27], [0, 0.3, 0], { col: [1.0, 0.85, 0.5, 0.55], mat: mt(0.1, 0, 1.8, 3) }, [c, 0, s]);
  sphere(m, at(3.42, 0.86, 0), 0.05, 8, gold);
  R.addGroup(m, { pass: 'opaque', shadow: true, tag: 'static' });
  R.addGroup(glow, { pass: 'glass', center: at(3.43, 0.44, 0), tag: 'static' });
}

// ---------------------------------------------------------------- workshops
/** Domains used to pull matching wiki articles into each workshop's learning shelf. */
export const WORKSHOPS = {
  hq: { title: 'Venture HQ · Plan Studio', theme: 'Where business plans are written, tested and promoted up the tower.', domain: 'Business & Ventures', mod: 'ventures',
    lessons: [
      ['bets', 'A plan is a set of bets', 'Every plan rests on a few assumptions: someone has this problem, will pay this price, and can be reached at this cost. Write them down, rank them by risk, and test the riskiest one first with the cheapest possible experiment.'],
      ['onepage', 'Write the one-page plan first', 'Problem, customer, offer and price, how you reach them, and the unit economics fit on one page. If they do not, the idea is not clear yet. Detail comes after the one page survives a conversation with real customers.'],
      ['gates', 'Release capital at gates, not on hope', 'Each floor of the tower is a gate. Money moves to the next stage only when the evidence for that stage is in. Skipping gates is how founders lose capital they cannot get back.'],
    ],
    actions: [['#/ventures', 'All ventures'], ['#/ideas', 'Idea Scout'], ['#/engine', 'Readiness table']] },
  wiki: { title: 'Knowledge Wiki · Learning Centre', theme: 'The library of the empire. Every article Claude researches lands here and compounds.', domain: '',
    lessons: [
      ['tiers', 'Trust sources in tiers', 'Official and primary sources (laws, regulators, company filings) come first, then reputable research and press, and only then blogs and vendors. A number from a seller of the service is a lead to verify, not a fact.'],
      ['date', 'Date every figure', 'Fees, rates, prices and laws change. A figure without a date and a source quietly goes stale; the wiki labels both so you can see what needs refreshing.'],
      ['compound', 'Update, do not duplicate', 'Knowledge compounds when each new finding improves an existing article. Ten scattered notes on one topic are worth less than one article kept current.'],
    ],
    actions: [['#/wiki', 'Open the wiki'], ['#/claude', 'Research queue']] },
  claude: { title: 'Claude Desk', theme: 'Commission research, diligence and reviews. Claude works the queue on a schedule and writes to the wiki.', domain: '',
    lessons: [
      ['decision', 'Ask decision-shaped questions', 'Say what decision the research informs: "Should DCS Golf source leather from Italy or Pakistan for the first 50 bags?" gets a far better answer than "Tell me about leather".'],
      ['approve', 'Approve proposals weekly', 'Claude proposes research it thinks you need. A weekly five-minute review keeps the queue pointed at your real priorities.'],
      ['bottom', 'Read the bottom line, then the sources', 'Every article starts with its conclusion and ends with its sources and their tiers. Check the confidence label before you act on a number.'],
    ],
    actions: [['#/claude', 'Open the Claude Desk']] },
  math: { title: 'Mastermind Lab', theme: 'Decision mathematics: expected value, sensitivity, compounding and the decision journal.', domain: 'Mathematics & Decisions',
    lessons: [
      ['ev', 'Expected value beats gut feel', 'Multiply each outcome by its probability and add them up. A bet with a small chance of a large win can be worth more than a sure small gain, if you can afford to lose.'],
      ['journal', 'Log the decision before the outcome', 'Write down what you decided, why, and what you expect, then review it later. It is the only defence against hindsight bias: judging a good decision by a bad outcome.'],
      ['sens', 'Find the assumption that flips the answer', 'Change one input at a time. The input that turns a yes into a no is the one to research before you commit.'],
    ],
    actions: [['#/math/decisions', 'Decision journal'], ['#/math', 'Calculators']] },
  legal: { title: 'Legal & Entities', theme: 'Companies, contracts and compliance: the walls that protect everything else.', domain: 'Legal & Structuring',
    lessons: [
      ['entity', 'Entity before contracts', 'Sign supplier, customer and lease contracts in the name of the company that will carry the business, not personally. Moving a contract later is slower and sometimes impossible.'],
      ['diary', 'Diary every obligation', 'Licence renewals, tax filings and notice periods are cheap to meet and expensive to miss. Each one belongs in the compliance list with a due date.'],
      ['exit', 'Read the exit clause first', 'Before the price, read how the contract ends: notice period, termination rights and who owns what afterwards. A licensed lawyer should review anything material.'],
    ],
    actions: [['#/legal/entities', 'Entities'], ['#/legal/compliance', 'Compliance'], ['#/legal/contracts', 'Contracts']] },
  treasury: { title: 'Treasury', theme: 'Cash, runway, currency and the liquidity tiers that keep the empire solvent.', domain: 'Treasury',
    lessons: [
      ['tiers', 'Tier your cash', 'Operating cash pays the month, a reserve covers emergencies, and strategic cash funds opportunities. Ventures draw from the strategic tier only, never from the reserve.'],
      ['runway', 'Know your runway', 'Runway is liquid cash divided by monthly outgoings. Below six months, new commitments should wait.'],
      ['fx', 'Match currency to commitments', 'Hold the currency you will spend. The dirham is pegged to the US dollar; other currencies move, so a supplier quote in euros or yuan can change cost before you pay.'],
    ],
    actions: [['#/treasury', 'Open Treasury'], ['#/treasury/fx', 'FX rates']] },
  finance: { title: 'Finance & Accounting', theme: 'Double-entry books per entity: the truth about every venture.', domain: 'Finance & Accounting',
    lessons: [
      ['double', 'Every transaction has two sides', 'Money comes from somewhere and goes somewhere. Double entry records both, so the books always balance and errors show up.'],
      ['separate', 'Separate books for each entity', 'Mixing personal and business money hides whether a venture works and complicates tax. One entity, one set of books.'],
      ['cash', 'Profit is not cash', 'A profitable month can still empty the bank if stock was paid for upfront or customers pay late. Watch both the ledger and the cash forecast.'],
    ],
    actions: [['#/finance', 'Open Finance']] },
  investments: { title: 'Investments', theme: 'Holdings, allocation and the compounding engine.', domain: 'Investing',
    lessons: [
      ['fees', 'Costs compound against you', 'A one per cent yearly fee takes a large share of long-run returns because it compounds too. Know the total cost of every holding.'],
      ['diversify', 'Diversify what moves differently', 'Owning many things that fall together is not diversification. Spread across assets that respond differently to the same news.'],
      ['thesis', 'Write the thesis and the sell rule first', 'Before buying, write why, what would prove you wrong, and when you would sell. This is research to inform your own decision, not advice.'],
    ],
    actions: [['#/investments', 'Open Investments']] },
  property: { title: 'Property', theme: 'Portfolio, yields and the bricks that anchor wealth.', domain: 'Property',
    lessons: [
      ['yield', 'Net yield is what counts', 'Gross yield is rent divided by price. Net yield subtracts service charges, maintenance, management, vacancy and fees. Compare properties on net.'],
      ['demand', 'Tenant demand drives value', 'Transport, schools, jobs and supply in the area decide rent and resale. A cheap unit in a weak location stays cheap.'],
      ['vacancy', 'Model the empty months', 'Assume some vacancy and repairs every year. A plan that only works at full occupancy is fragile.'],
    ],
    actions: [['#/property', 'Open Property']] },
  procure: { title: 'Procurement Yard', theme: 'Items, quotes, purchase orders and shipments, costed to the door.', domain: 'Business & Ventures',
    lessons: [
      ['landed', 'Compare landed cost, not unit price', 'Freight, insurance, duty and handling can add a fifth or more to the goods price. The cheapest quote often loses once it is landed.'],
      ['three', 'Three quotes, one specification', 'Send the same written specification to at least three suppliers. Different specs make quotes impossible to compare.'],
      ['deposit', 'Small deposit, balance after inspection', 'Tie the balance to an independent inspection and keep the deposit small. That keeps the risk with the party able to fix a bad batch.'],
    ],
    actions: [['#/procure', 'Open Procurement'], ['#/procure/sourcing', 'Requests for quotes'], ['#/procure/logistics', 'Landed cost']] },
  commerce: { title: 'Commerce Hub', theme: 'Product leads, Amazon economics and the online store pipeline.', domain: 'Business & Ventures',
    lessons: [
      ['seller', 'Be the seller of record', 'On Amazon your company must be the seller of record; a supplier shipping its own branded parcels breaks the rules. Private label through Amazon fulfilment is the compliant route.'],
      ['maths', 'Kill on the maths', 'If the price is not about three times landed cost, with a healthy margin after fees and ads, the product does not pay. Decide with the calculator, not the hype.'],
      ['fail', 'Budget for failed launches', 'Most product launches do not work. Treat each as a small, killable bet and keep enough cash for several attempts.'],
    ],
    actions: [['#/commerce', 'Open Commerce Lab']] },
};
export const LESSON_XP = 15, PLAN_XP = 25;

// ---------------------------------------------------------------- business plan sections (Plan Studio)
export const PLAN = [
  ['problem', 'The problem', 'Who has the problem, how painful is it, and how do they solve it today?'],
  ['customer', 'The customer', 'Who exactly pays? Describe one real buyer: role, budget, where they are.'],
  ['offer', 'Offer and price', 'What do you sell, at what price, and why is it better than the alternative?'],
  ['market', 'Market and competition', 'How big is the reachable market, and who else serves it? Cite sources.'],
  ['channels', 'Reaching customers', 'How will the first 10 and the first 100 customers find you, and at what cost?'],
  ['economics', 'Unit economics', 'Price, cost to deliver, margin, cost to acquire a customer, payback. Use the calculators.'],
  ['operations', 'Operations and suppliers', 'What do you need to buy or build, from whom, and with what lead times?'],
  ['team', 'Team and partners', 'Who does what? Which skills are missing?'],
  ['capital', 'Capital and funding', 'How much cash until break-even, from which tier or which investor?'],
  ['risks', 'Riskiest assumptions', 'List the three bets most likely to be wrong and the cheapest test for each.'],
  ['milestones', 'Next 90 days', 'Three to five milestones with dates that would prove the plan is working.'],
];
export const planProgress = (v) => { const p = v.plan || {}; const done = PLAN.filter(([k]) => (p[k]?.text || '').trim().length >= 20).length; return { done, total: PLAN.length, pct: done / PLAN.length }; };
export function planMarkdown(v) {
  const p = v.plan || {};
  return `# Business plan: ${v.name}\n\n${v.summary || ''}\n\n${PLAN.map(([k, t]) => `## ${t}\n\n${(p[k]?.text || '_Not written yet._').trim()}\n`).join('\n')}`;
}
