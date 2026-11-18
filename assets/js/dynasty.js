// dynasty.js — the family wealth structure ("Waterfall Method", UAE version).
// A foundation at the top, a holding company under it owning every business and property in its own company,
// and permanent life policies owned by the foundation whose payouts fund the next generation and a family bank.
// Pure functions of state (no DOM), shared by the Dynasty view, deadlines, the game and tests.
// Research blueprint, not legal or tax advice: every rule here is checked with a UAE lawyer and tax adviser.

const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const days = (a, b) => Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000);
const addDaysIso = (d, n) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

export const BLUEPRINT_DOC = 'https://claude.ai/artifact/S6RkSrafUrSw9mZXeMx1cS';
export const WIKI_SLUG = 'uae-family-wealth-structure-the-waterfall-method';

// ---------------------------------------------------------------- structure helpers
export const foundation = (s) => (s.entities || []).find((e) => /foundation|trust/i.test(e.type || ''));
export const holdco = (s) => { const f = foundation(s); return (s.entities || []).find((e) => e.type === 'Holding company' && (!f || e.parent === f.name)) || (s.entities || []).find((e) => e.type === 'Holding company'); };
/** Every entity at or below the foundation (or the holding company if there is no foundation yet). */
export function structureEntities(s) {
  const top = foundation(s) || holdco(s); if (!top) return [];
  const out = [top]; const walk = (name) => (s.entities || []).filter((e) => e.parent === name).forEach((e) => { out.push(e); walk(e.name); });
  walk(top.name); return out;
}
export const entityByName = (s, name) => (s.entities || []).find((e) => e.name === name);

// ---------------------------------------------------------------- the six setup phases
// auto(s) marks a step done from records elsewhere in the app; the owner can also tick any step by hand.
const signed = (s, kind) => (s.governance || []).some((g) => g.kind === kind && g.signedOn);
const active = (e) => e && ['Active'].includes(e.status);
export const PHASES = [
  { id: 'will', title: 'Register a UAE will', cost: 'DIFC Wills Service about AED 10,000; Abu Dhabi Judicial Department about AED 950 (as of Nov 2026)',
    why: 'Protects what exists today. Without a registered will, UAE default inheritance rules apply to your UAE assets.',
    steps: [
      { id: 'registry', text: 'Choose the registry: DIFC Wills Service (common law) or the Abu Dhabi Judicial Department' },
      { id: 'executor', text: 'Name an executor' },
      { id: 'guardians', text: 'Name guardians for any children' },
      { id: 'residuary', text: 'Make the foundation the residuary beneficiary once it exists' },
      { id: 'signed', text: 'Sign and register the will, and log it under Governance', auto: (s) => signed(s, 'Will') },
      { id: 'za', text: 'South African tax adviser confirms your non-residency and what is left in South Africa' },
    ],
    questions: ['Can the will pour UAE assets into the foundation, and which registry fits?', 'Am I clearly non-resident for South African tax, and what is left in South Africa?'] },
  { id: 'design', title: 'Design the foundation', cost: 'Professional fees for the charter and by-laws: quoted per case',
    why: 'Decide its purpose, what goes in, and who governs it before anything is registered.',
    steps: [
      { id: 'purpose', text: 'Purpose agreed: family wealth and succession' },
      { id: 'founder', text: 'Founder: you. Decide which reserved powers you keep' },
      { id: 'council', text: 'Council chosen: you plus one or two people you trust, or a professional councillor', auto: (s) => (s.family || []).some((p) => /councillor/i.test(p.roles || '')) },
      { id: 'guardian', text: 'Guardian decided (optional watchdog; worth having once real assets are inside)' },
      { id: 'beneficiaries', text: 'Beneficiaries defined by class so new generations join automatically', auto: (s) => (s.family || []).some((p) => /beneficiary/i.test(p.roles || '')) },
      { id: 'charter', text: 'Charter and by-laws drafted, including the waterfall recycling rule and the family bank rules' },
    ],
    questions: ['ADGM or DIFC foundation for our assets and privacy needs?'] },
  { id: 'register', title: 'Register the foundation', cost: 'Registry fees: ADGM USD 1,000 then 500 a year; DIFC USD 350 then 650 a year; ADGM registered office from about USD 6,000 a year (as of Nov 2026, confirm with the registry)',
    why: 'ADGM is cheaper and keeps council details private; DIFC puts the council on the public register but has the deeper family-office ecosystem.',
    steps: [
      { id: 'csp', text: 'Appoint a corporate service provider' },
      { id: 'formed', text: 'Foundation registered (4 to 8 weeks including drafting) and set to Active in Legal & Entities', auto: (s) => active(foundation(s)) },
      { id: 'qff', text: 'Federal Tax Authority grants Qualifying Family Foundation (tax-transparent) status', auto: (s) => /QFF/.test(foundation(s)?.taxStatus || '') },
      { id: 'bank', text: 'Foundation bank account opened' },
      { id: 'charterLogged', text: 'Signed charter logged under Governance', auto: (s) => signed(s, 'Charter') },
    ],
    questions: ['Does Qualifying Family Foundation status cover life policy payouts received by the foundation?'] },
  { id: 'holdco', title: 'Form the holding company', cost: 'ADGM SPV from about AED 25,000 (as of Nov 2026); per-company fees quoted per case',
    why: 'One holding company, 100% owned by the foundation, owns each business and property in its own company so a problem in one cannot reach the others.',
    steps: [
      { id: 'formed', text: 'ADGM SPV or DIFC Prescribed Company formed, 100% owned by the foundation, and Active', auto: (s) => { const h = holdco(s), f = foundation(s); return active(h) && f && h.parent === f.name; } },
      { id: 'ringfence', text: 'Every venture and property sits in its own company under the holding company', auto: (s) => { const r = ringFence(s); const cos = (s.entities || []).filter((e) => e.venture); return r.holdco && r.ventures > 0 && r.missing.length === 0 && cos.length > 0 && cos.every((e) => e.status === 'Active'); } },
      { id: 'ct', text: 'Each company registered for Corporate Tax', auto: (s) => { const e = structureEntities(s).filter((x) => /company|SPV/i.test(x.type)); return e.length > 0 && e.every((x) => /CT|QFF|Exempt/i.test(x.taxStatus || '')); } },
      { id: 'banks', text: 'Separate bank account for every company' },
    ],
    questions: [] },
  { id: 'policies', title: 'Add the life policies', cost: 'Premiums are quote-based: they depend on age, health, cover and policy type',
    why: 'The expensive, long commitment. Wait until the businesses produce cash, then size the cover to what profit can carry for 10+ years.',
    gate: ['will', 'design', 'register', 'holdco'],
    steps: [
      { id: 'broker', text: 'Engage an independent, fee-based broker (no commission bias)' },
      { id: 'illustrations', text: 'Illustrations for whole life, universal life and term at the same cover, with year-by-year surrender values', auto: (s) => (s.policies || []).some((p) => (p.surrender || '').trim()) },
      { id: 'ownership', text: 'Policy owner and beneficiary are both the foundation; the life insured is the family member', auto: (s) => { const ps = livePolicies(s).filter((p) => p.kind !== 'Key person' && p.kind !== 'Term (business)'); return ps.length > 0 && policyIssues(s).filter((i) => i.rule === 'ownership').length === 0; } },
      { id: 'afford', text: 'Premiums pass the affordability check against holding-company profit', auto: (s) => { const a = affordability(s); return a.premiums > 0 && a.profit > 0 && a.share <= a.cap; } },
      { id: 'inforce', text: 'First policy in force', auto: (s) => (s.policies || []).some((p) => p.status === 'In force') },
      { id: 'recycle', text: 'Charter states the recycling rule: part of each payout funds next-generation policies, the rest goes to the family bank' },
    ],
    questions: ['Should policies sit in the foundation or the holding company, and what is the tax difference?'] },
  { id: 'governance', title: 'Write the family governance layer', cost: 'Mostly your time; legal review quoted per case',
    why: 'Banks, courts and tax authorities test whether a foundation is really run. Paper-only structures fail.',
    steps: [
      { id: 'constitution', text: 'Family constitution written and signed', auto: (s) => signed(s, 'Family constitution') },
      { id: 'wishes', text: 'Letter of wishes to the council', auto: (s) => signed(s, 'Letter of wishes') },
      { id: 'meeting', text: 'First annual family meeting held and minuted', auto: (s) => signed(s, 'Minutes') },
      { id: 'calendar', text: 'Annual review and the standard obligations on the compliance calendar', auto: (s) => (s.compliance || []).some((c) => c.dynasty) },
    ],
    questions: [] },
];

export function stepDone(s, phase, step) {
  const manual = s.settings?.dynasty?.setup?.[`${phase.id}.${step.id}`];
  return !!manual || !!(step.auto && safe(() => step.auto(s)));
}
const safe = (f) => { try { return f(); } catch { return false; } };
export function setupProgress(s) {
  const phases = PHASES.map((p) => { const done = p.steps.filter((st) => stepDone(s, p, st)).length; return { id: p.id, title: p.title, done, total: p.steps.length, complete: done === p.steps.length }; });
  const done = phases.reduce((t, p) => t + p.done, 0), total = phases.reduce((t, p) => t + p.total, 0);
  const current = phases.find((p) => !p.complete);
  return { phases, done, total, pct: total ? done / total : 0, current };
}
export const phaseUnlocked = (s, phase) => !phase.gate || phase.gate.every((id) => setupProgress(s).phases.find((p) => p.id === id)?.complete);

// ---------------------------------------------------------------- ring-fencing: one company per venture
export function ringFence(s) {
  const h = holdco(s);
  const under = new Set(structureEntities(s).map((e) => e.name));
  const ventures = (s.ventures || []).filter((v) => v.stage !== 'Parked');
  const missing = ventures.filter((v) => !(s.entities || []).some((e) => (e.venture === v.id || (v.entity && e.name === v.entity)) && under.has(e.name) && e !== h && e !== foundation(s)));
  return { holdco: h, ventures: ventures.length, missing };
}

// ---------------------------------------------------------------- policies
export const POLICY_KINDS = ['Whole life', 'Universal life', 'Indexed universal life', 'Unit-linked', 'Term', 'PPLI', 'Key person', 'Term (business)'];
export const POLICY_STATUS = ['Quoted', 'Underwriting', 'In force', 'Paid out', 'Lapsed'];
export const livePolicies = (s) => (s.policies || []).filter((p) => ['Underwriting', 'In force'].includes(p.status));
const annual = (p) => num(p.premium) * (p.frequency === 'Monthly' ? 12 : p.frequency === 'Quarterly' ? 4 : 1);
export const annualPremium = annual;

/** Surrender schedule typed as "year: value" lines → [{year, value}]. */
export function parseSurrender(text) {
  return String(text || '').split(/\n|;/).map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(?:y(?:ea)?r?\s*)?(\d+)\s*[:=,\s]\s*([\d.,]+)/i); return m ? { year: +m[1], value: num(m[2]) } : null; }).filter(Boolean).sort((a, b) => a.year - b.year);
}

/** Rule checks on each policy. rule: ownership | review | surrender. */
export function policyIssues(s) {
  const f = foundation(s), out = [], t = isoToday();
  for (const p of s.policies || []) {
    if (['Paid out', 'Lapsed'].includes(p.status)) continue;
    const business = ['Key person', 'Term (business)'].includes(p.kind);
    if (!business && f && (p.owner !== f.name || p.beneficiary !== f.name)) out.push({ id: p.id, rule: 'ownership', sev: 2, text: `${p.insurer || 'Policy'} on ${p.lifeInsured || 'a family member'}: owner and beneficiary should both be ${f.name}` });
    if (!business && !f) out.push({ id: p.id, rule: 'ownership', sev: 1, text: `${p.insurer || 'Policy'} on ${p.lifeInsured || 'a family member'}: no foundation yet to own it. Insurance is the last piece, not the first` });
    if (!parseSurrender(p.surrender).length && p.kind !== 'Term' && p.kind !== 'Term (business)') out.push({ id: p.id, rule: 'surrender', sev: 1, text: `${p.insurer || 'Policy'}: ask the insurer for the year-by-year surrender schedule` });
    if (p.nominationReview && days(p.nominationReview, t) < 0) out.push({ id: p.id, rule: 'review', sev: 2, text: `${p.insurer || 'Policy'}: beneficiary nomination review is overdue` });
  }
  return out;
}

/** Premium affordability: annual premiums of live policies vs holding-company profit over the last 12 months. */
export function affordability(s, toBase = (a) => num(a)) {
  const d = s.settings?.dynasty || {};
  const premiums = livePolicies(s).filter((p) => !['Key person', 'Term (business)'].includes(p.kind)).reduce((t, p) => t + toBase(annual(p), p.ccy), 0);
  const names = new Set(structureEntities(s).map((e) => e.name));
  const from = addDaysIso(isoToday(), -365);
  let inc = 0, exp = 0;
  const type = Object.fromEntries((s.coa || []).map((a) => [a.code, a.type]));
  for (const j of s.journal || []) {
    if (!names.has(j.entity) || j.date < from) continue;
    for (const l of j.lines || []) { if (type[l.account] === 'income') inc += num(l.credit) - num(l.debit); if (type[l.account] === 'expense') exp += num(l.debit) - num(l.credit); }
  }
  const booked = inc - exp;
  const manual = num(d.profit);
  const profit = manual > 0 ? manual : booked;
  const cap = num(d.premiumCap) || 0.2;
  return { premiums, profit, booked, manual, source: manual > 0 ? 'manual' : 'books', share: profit > 0 ? premiums / profit : premiums > 0 ? Infinity : 0, cap };
}

// ---------------------------------------------------------------- the family bank
export const LOAN_STATUS = ['Pitched', 'Approved', 'Active', 'Repaid', 'Default', 'Declined'];
const funded = (l) => ['Active', 'Repaid', 'Default'].includes(l.status);
export const needsMinutes = (l) => ['Approved', 'Active', 'Repaid', 'Default'].includes(l.status);
export function loanPayment(l) {
  const P = num(l.principal), n = Math.max(1, Math.round(num(l.termMonths) || 1)), r = num(l.rate) / 100 / 12;
  return r ? (P * r) / (1 - (1 + r) ** -n) : P / n;
}
export function loanState(l) {
  const pay = loanPayment(l), n = Math.max(1, Math.round(num(l.termMonths) || 1));
  const repaid = (l.repayments || []).reduce((t, x) => t + num(x.amount), 0);
  const scheduled = pay * n;
  let due = 0;
  if (l.start && funded(l)) { const m = Math.floor(days(isoToday(), l.start) / 30.44); due = Math.min(n, Math.max(0, m)) * pay; }
  return { payment: pay, scheduled, repaid, outstanding: Math.max(0, scheduled - repaid), arrears: Math.max(0, due - repaid) };
}
export function bankPool(s, toBase = (a) => num(a)) {
  const capital = (s.settings?.dynasty?.bankCapital || []).reduce((t, c) => t + toBase(c.amount, c.ccy), 0);
  const lent = (s.familyLoans || []).filter(funded).reduce((t, l) => t + toBase(l.principal, l.ccy), 0);
  const back = (s.familyLoans || []).reduce((t, l) => t + toBase((l.repayments || []).reduce((a, x) => a + num(x.amount), 0), l.ccy), 0);
  const out = (s.familyLoans || []).filter((l) => ['Active', 'Default'].includes(l.status)).reduce((t, l) => t + toBase(loanState(l).outstanding, l.ccy), 0);
  return { capital, lent, back, available: capital - lent + back, outstanding: out };
}

// ---------------------------------------------------------------- governance and life events
export const GOV_KINDS = ['Charter', 'By-laws', 'Will', 'Letter of wishes', 'Minutes', 'Family constitution', 'Policy document', 'Other'];
export const LIFE_EVENTS = ['Birth', 'Marriage', 'Divorce', 'Death', 'Move country', 'Business sale', 'Property bought or sold'];
export const LIFE_CHECKLIST = [
  { id: 'will', text: 'Will reviewed and updated if needed' },
  { id: 'nominations', text: 'Every policy beneficiary nomination checked' },
  { id: 'beneficiaries', text: 'Foundation beneficiary register and council updated' },
  { id: 'residency', text: 'Tax residency checked for everyone affected (UAE, South Africa, any new country)' },
  { id: 'wishes', text: 'Letter of wishes still says what you want' },
  { id: 'minutes', text: 'Council minutes record the review' },
];
export const openReviews = (s) => (s.lifeEvents || []).filter((e) => !LIFE_CHECKLIST.every((c) => e.checks?.[c.id]));

/** Standard obligations for the structure; added once to the compliance calendar (flagged dynasty:true). */
export function standardObligations(s) {
  const f = foundation(s)?.name || 'Personal', h = holdco(s)?.name || f;
  return [
    { title: 'Foundation registry renewal and annual filings', entity: f, recurrence: 'Annual', notes: 'ADGM or DIFC registry, via your corporate service provider.' },
    { title: 'Council meeting with minutes', entity: f, recurrence: 'Quarterly', notes: 'Banks, courts and tax authorities test whether the foundation is really run.' },
    { title: 'Annual family meeting', entity: f, recurrence: 'Annual', notes: 'Review the structure, the family bank and the letter of wishes.' },
    { title: 'Beneficiary and policy nomination review', entity: f, recurrence: 'Annual', notes: 'A policy pays whoever is named in the contract, even if the will says otherwise.' },
    { title: 'Will review', entity: 'Personal', recurrence: 'Annual', notes: 'Also after every birth, marriage, move or business sale.' },
    { title: 'Corporate Tax returns for the holding company and each company', entity: h, recurrence: 'Annual', notes: 'Confirm deadlines on tax.gov.ae with your tax adviser.' },
    { title: 'Qualifying Family Foundation status still met', entity: f, recurrence: 'Annual', notes: 'Federal Tax Authority conditions; confirm with your tax adviser.' },
  ];
}

// ---------------------------------------------------------------- alerts (Dynasty overview, dashboard, Tower)
export function dynastyAlerts(s, toBase) {
  const out = [];
  const t = isoToday();
  const prog = setupProgress(s);
  const polPhase = PHASES.find((p) => p.id === 'policies');
  if ((s.policies || []).some((p) => ['Underwriting', 'In force'].includes(p.status) && !['Key person', 'Term (business)'].includes(p.kind)) && !phaseUnlocked(s, polPhase)) out.push({ sev: 2, text: 'Life cover is being bought before the will, foundation and holding company are in place: insurance is the last piece, not the first', href: '#/dynasty/setup' });
  for (const i of policyIssues(s)) out.push({ sev: i.sev, text: i.text, href: '#/dynasty/policies' });
  const a = affordability(s, toBase);
  if (a.premiums > 0 && a.share > a.cap) out.push({ sev: 3, text: `Premiums take ${Number.isFinite(a.share) ? Math.round(a.share * 100) + '%' : 'all'} of holding-company profit, above your ${Math.round(a.cap * 100)}% cap`, href: '#/dynasty/policies' });
  const rf = ringFence(s);
  if (rf.holdco && rf.missing.length) out.push({ sev: 1, text: `${rf.missing.length} venture${rf.missing.length === 1 ? '' : 's'} not yet in its own company under ${rf.holdco.name}: ${rf.missing.map((v) => v.name).join(', ')}`, href: '#/dynasty' });
  for (const l of s.familyLoans || []) {
    if (needsMinutes(l) && !(s.governance || []).some((g) => g.id === l.minutes)) out.push({ sev: 3, text: `Family bank loan to ${l.borrower || 'a family member'} has no approval minutes`, href: '#/dynasty/bank' });
    if (l.status === 'Active' && loanState(l).arrears > 1) out.push({ sev: 2, text: `Family bank loan to ${l.borrower || 'a family member'} is behind schedule`, href: '#/dynasty/bank' });
  }
  const pool = bankPool(s, toBase);
  if (pool.available < -1) out.push({ sev: 2, text: 'The family bank has lent more than it holds: record the capital that funded the loans', href: '#/dynasty/bank' });
  for (const e of openReviews(s)) out.push({ sev: days(t, e.date || t) > 30 ? 2 : 1, text: `Life-event review open: ${e.kind}${e.who ? ` (${e.who})` : ''}`, href: '#/dynasty/governance' });
  for (const g of s.governance || []) if (g.reviewDue && days(g.reviewDue, t) < 0) out.push({ sev: 2, text: `${g.kind} review overdue: ${g.title || g.kind}`, href: '#/dynasty/governance' });
  if (!prog.phases[0].complete) out.push({ sev: 1, text: 'Phase 1: register a UAE will. It protects what exists today', href: '#/dynasty/setup' });
  return out.sort((x, y) => y.sev - x.sev);
}

/** Dated items for store.deadlines(). */
export function dynastyDeadlines(s) {
  const out = [];
  for (const g of s.governance || []) if (g.reviewDue) out.push({ date: g.reviewDue, title: `Review ${g.kind.toLowerCase()}: ${g.title || g.kind}`, kind: 'Dynasty', href: '#/dynasty/governance' });
  for (const p of s.policies || []) if (p.nominationReview && !['Paid out', 'Lapsed'].includes(p.status)) out.push({ date: p.nominationReview, title: `Check beneficiary nomination: ${p.insurer || 'policy'} on ${p.lifeInsured || 'family member'}`, kind: 'Dynasty', href: '#/dynasty/policies' });
  for (const e of openReviews(s)) if (e.date) out.push({ date: addDaysIso(e.date, 30), title: `Finish the life-event review: ${e.kind}`, kind: 'Dynasty', href: '#/dynasty/governance' });
  return out;
}

// ---------------------------------------------------------------- the waterfall simulator
// Deterministic, nominal, before tax and fees. Each generation: n insured lives, age at policy start, start year,
// cover and annual premium each, premium term. Payout at the assumed age. A share of each payout goes to a premium
// reserve that pays later premiums; the rest goes to the family bank pool. Both earn the growth rate.
export const SIM_DEFAULT = {
  years: 80, lifeAge: 85, recycle: 40, rates: [3, 5, 7],
  gens: [
    { label: 'You and your spouse', n: 2, age: 36, start: 0, cover: 2000000, premium: 40000, term: 20 },
    { label: 'Children', n: 2, age: 5, start: 8, cover: 2000000, premium: 9000, term: 20 },
    { label: 'Grandchildren', n: 2, age: 5, start: 38, cover: 2000000, premium: 9000, term: 20 },
  ],
};
export function simulate(inp, { rate, delay = 0 } = {}) {
  const g = rate / 100, Y = Math.max(10, Math.min(120, Math.round(num(inp.years) || 80)));
  const rec = Math.min(100, Math.max(0, num(inp.recycle))) / 100;
  const life = num(inp.lifeAge) + delay;
  let reserve = 0, bank = 0, fromBusiness = 0, fromReserve = 0, payouts = 0;
  const rows = [];
  for (let y = 0; y <= Y; y++) {
    reserve *= 1 + g; bank *= 1 + g;
    let prem = 0, pay = 0;
    for (const gen of inp.gens || []) {
      const n = Math.max(0, Math.round(num(gen.n))); if (!n || !num(gen.cover)) continue;
      const start = num(gen.start), payYear = start + Math.max(1, life - num(gen.age));
      if (y >= start && y < payYear && y < start + Math.max(1, num(gen.term) || 99)) prem += n * num(gen.premium);
      if (y === Math.round(payYear)) pay += n * num(gen.cover);
    }
    const r = Math.min(reserve, prem); reserve -= r; fromReserve += r; fromBusiness += prem - r;
    if (pay) { payouts += pay; reserve += pay * rec; bank += pay * (1 - rec); }
    rows.push({ y, prem, fromBusiness, fromReserve, payouts, reserve, bank, total: reserve + bank });
  }
  return rows;
}
/** Three scenarios: cautious (low growth, payouts 5 years later), base, strong (high growth). A range, never one promised number. */
export function scenarios(inp) {
  const [lo, mid, hi] = (inp.rates || [3, 5, 7]).map(num);
  return [
    { key: 'cautious', name: `Cautious (${lo}% growth, payouts 5 years later)`, cls: 'r', rows: simulate(inp, { rate: lo, delay: 5 }) },
    { key: 'base', name: `Base (${mid}% growth)`, cls: '', rows: simulate(inp, { rate: mid }) },
    { key: 'strong', name: `Strong (${hi}% growth)`, cls: 'g', rows: simulate(inp, { rate: hi }) },
  ];
}
