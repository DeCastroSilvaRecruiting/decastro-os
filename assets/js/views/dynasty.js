// Dynasty — the family wealth structure: foundation, holding company, life policies, family bank and governance.
// Built from the "De Castro Family Wealth Structure — Waterfall Method Blueprint". Organises the structure; not legal or tax advice.
import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, money, compact, num, fmtDate, daysUntil, tableHTML, tabsHTML, lineChart, openForm, toast, uid, today } from '../ui.js';
import { crudActions, crudRows, SCHEMAS } from '../schemas.js';
import * as D from '../dynasty.js';

let tab = 'overview';
const B = () => store.base();
const tb = (a, c) => store.toBase(a, c);
const pctTxt = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—');
const dueBadge = (d) => { const n = daysUntil(d); if (n == null) return '<span class="badge">set date</span>'; return `<span class="badge ${n < 0 ? 'red' : n <= 30 ? 'gold' : ''}">${n < 0 ? `${-n}d overdue` : n === 0 ? 'today' : `${n}d`}</span>`; };
const sevCls = (n) => (n >= 3 ? 'red' : n === 2 ? 'gold' : '');

export const dynastyCount = (s) => D.dynastyAlerts(s, tb).filter((a) => a.sev >= 2).length;

// ---------------------------------------------------------------- structure map
function mapHTML(s) {
  const f = D.foundation(s), top = f || D.holdco(s);
  if (!top) return `<div class="dy-ghost">
      <div class="dy-node apex ghost"><b>Family foundation</b><span>ADGM or DIFC · owns everything below</span></div>
      <div class="dy-row"><div class="dy-node ghost"><b>Holding company</b><span>100% owned by the foundation</span></div><div class="dy-node ghost pol"><b>Life policies</b><span>owned by and paying to the foundation</span></div><div class="dy-node ghost bank"><b>Family bank</b><span>funded by payouts and profit</span></div></div>
      <div class="dy-row">${(s.ventures || []).filter((v) => v.stage !== 'Parked').map((v) => `<div class="dy-node ghost op"><b>${esc(v.name)}</b><span>own company</span></div>`).join('')}</div></div>
    <p class="small muted">Nothing is registered yet. This is the blueprint: add it to your entity register as planned entities, then work through the setup phases.</p>
    <button class="btn primary sm" data-act="blueprint">${icon('plus')} Add the blueprint to my entities</button>`;
  const pol = (s.policies || []).filter((p) => !['Lapsed'].includes(p.status) && p.owner === top.name);
  const pool = D.bankPool(s, tb);
  const node = (e) => {
    const kids = (s.entities || []).filter((k) => k.parent === e.name);
    const v = e.venture && s.ventures.find((x) => x.id === e.venture);
    const cls = /foundation|trust/i.test(e.type) ? 'apex' : e.type === 'Holding company' ? '' : 'op';
    const extra = e === top ? [
      ...pol.map((p) => `<li><div class="dy-node pol"><b>${esc(p.kind)} · ${esc(p.lifeInsured || 'life insured?')}</b><span>${esc(p.insurer)} · ${compact(tb(p.sumAssured, p.ccy), B())} cover · ${esc(p.status)}</span></div></li>`),
      `<li><div class="dy-node bank"><b>Family bank</b><span>${money(pool.available, B())} available${pool.outstanding ? ` · ${compact(pool.outstanding, B())} owed back` : ''}</span></div></li>`,
    ] : [];
    const items = [...kids.map((k) => `<li>${node(k)}</li>`), ...extra];
    return `<div class="dy-node ${cls}" data-act="crudEdit" data-coll="entities" data-id="${e.id}"><b>${esc(e.name)}</b>
      <span>${esc(e.type)}${e.jurisdiction ? ` · ${esc(e.jurisdiction)}` : ''}${e.parent && e.ownership !== '' && e.ownership != null ? ` · ${e.ownership}%` : ''}</span>
      <span class="dy-tags"><i class="badge ${e.status === 'Active' ? 'green' : e.status === 'Planned' ? 'violet' : ''}">${esc(e.status)}</i>${e.taxStatus ? `<i class="badge blue">${esc(e.taxStatus)}</i>` : ''}${v ? `<i class="badge gold">${esc(v.name)}</i>` : ''}</span></div>
      ${items.length ? `<ul>${items.join('')}</ul>` : ''}`;
  };
  const rf = D.ringFence(s);
  return `<div class="dy-tree"><ul><li>${node(top)}</li></ul></div>
    ${rf.holdco && rf.missing.length ? `<div class="callout gold small mt">Not yet ring-fenced: ${rf.missing.map((v) => `<b>${esc(v.name)}</b>`).join(', ')}. <button class="btn sm" data-act="ringFence">${icon('plus')} Add a planned company for each</button></div>` : ''}
    <p class="small muted mt">Tap any box to edit it. The map is drawn from Legal &amp; Entities (each entity's parent) and from your policies.</p>`;
}

function overviewTab(s) {
  const prog = D.setupProgress(s), alerts = D.dynastyAlerts(s, tb), pool = D.bankPool(s, tb);
  const live = D.livePolicies(s), cover = live.reduce((t, p) => t + tb(p.sumAssured, p.ccy), 0);
  const fam = (s.family || []).slice().sort((a, b) => (+a.generation || 9) - (+b.generation || 9));
  return `
  <div class="grid g4">
    <div class="card kpi hero"><div class="label">Setup</div><div class="value gold">${Math.round(prog.pct * 100)}%</div><div class="delta">${prog.current ? `Now: ${esc(prog.current.title)}` : 'All six phases complete'}</div></div>
    <div class="card kpi"><div class="label">Entities in the structure</div><div class="value">${D.structureEntities(s).length}</div><div class="delta">${D.foundation(s) ? esc(D.foundation(s).status) : 'no foundation yet'}</div></div>
    <div class="card kpi"><div class="label">Life cover</div><div class="value">${compact(cover, B())}</div><div class="delta">${live.length} polic${live.length === 1 ? 'y' : 'ies'} in force or underwriting</div></div>
    <div class="card kpi"><div class="label">Family bank</div><div class="value">${compact(pool.available, B())}</div><div class="delta">available to lend</div></div>
  </div>
  <div class="grid g-main mt">
    <div class="card"><div class="card-head"><h3>Structure map</h3></div>${mapHTML(s)}</div>
    <div>
      <div class="card"><div class="card-head"><h3>Needs attention</h3><div class="right"><span class="badge ${alerts.some((a) => a.sev >= 3) ? 'red' : alerts.length ? 'gold' : 'green'}">${alerts.length || 'clear'}</span></div></div>
        ${alerts.length ? `<div class="dy-alerts">${alerts.slice(0, 8).map((a) => `<a href="${a.href}" class="dy-alert"><span class="badge ${sevCls(a.sev)}">${a.sev >= 3 ? 'Urgent' : a.sev === 2 ? 'Soon' : 'Next'}</span><span>${esc(a.text)}</span></a>`).join('')}</div>` : '<p class="small muted" style="margin:0">Nothing outstanding. The structure is being run properly.</p>'}</div>
      <div class="card mt"><div class="card-head"><h3>Setup phases</h3><div class="right"><a class="btn sm" href="#/dynasty/setup">Open</a></div></div>
        ${prog.phases.map((p, i) => `<div class="dy-phase-row"><span class="dy-num ${p.complete ? 'done' : ''}">${p.complete ? '✓' : i + 1}</span><span>${esc(p.title)}</span><span class="small muted">${p.done}/${p.total}</span></div>`).join('')}</div>
      <div class="card mt"><div class="card-head"><h3>The blueprint</h3></div>
        <p class="small" style="margin:0 0 10px">Foundation at the top, a holding company under it owning each business and property in its own company, and permanent life policies owned by the foundation that pay back into it and fund the next generation's cover and the family bank.</p>
        <div class="row" style="gap:6px;flex-wrap:wrap"><a class="btn sm" href="${D.BLUEPRINT_DOC}" target="_blank" rel="noopener">Blueprint doc ${icon('arrow')}</a><a class="btn sm" href="#/wiki/${D.WIKI_SLUG}">Wiki article</a></div></div>
    </div>
  </div>
  <div class="card flush mt"><div class="card-head"><h3>Family and roles</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="family" data-defaults='{"generation":"1","residency":"UAE"}'>${icon('plus')} Person</button></div></div>
    ${crudRows(tableHTML([
      { k: 'name', label: 'Name', fmt: (r) => `<b>${esc(r.name)}</b><div class="small muted">${esc(r.relation || '')}</div>` },
      { k: 'generation', label: 'Generation', fmt: (r) => (+r.generation ? `Gen ${esc(r.generation)}` : 'Adviser') },
      { k: 'birthDate', label: 'Born', fmt: (r) => (r.birthDate ? fmtDate(r.birthDate) : '—') },
      { k: 'roles', label: 'Roles', fmt: (r) => String(r.roles || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => `<span class="badge">${esc(x)}</span>`).join(' ') || '<span class="muted small">none yet</span>' },
      { k: 'residency', label: 'Tax residency' },
    ], fam, { act: 'crudEdit', empty: 'Add yourself, your spouse and future generations, plus anyone who will sit on the council. Roles: founder, councillor, guardian, beneficiary, director, shareholder.' }), 'family')}</div>
  <p class="small muted mt">This module organises your family wealth structure from the research blueprint. It is not legal or tax advice: confirm every structure with a UAE structuring lawyer and an independent, fee-based adviser before you sign anything.</p>`;
}

// ---------------------------------------------------------------- setup wizard
function setupTab(s) {
  const prog = D.setupProgress(s);
  return `<div class="callout gold small mb">Six phases. Phases 1 to 4 cost little and can be done in about three months. Phase 5, the life policies, is the expensive long-term commitment: it stays locked until the will, foundation and holding company are in place. <b>Will first; insurance last.</b></div>
  <div class="dy-phases">${D.PHASES.map((p, i) => {
    const pr = prog.phases[i], unlocked = D.phaseUnlocked(s, p);
    return `<div class="card dy-phase ${pr.complete ? 'complete' : ''} ${unlocked ? '' : 'locked'}">
      <div class="card-head"><h3><span class="dy-num ${pr.complete ? 'done' : ''}">${pr.complete ? '✓' : i + 1}</span> ${esc(p.title)}</h3><div class="right"><span class="badge ${pr.complete ? 'green' : ''}">${pr.done}/${pr.total}</span></div></div>
      <p class="small muted" style="margin:0 0 8px">${esc(p.why)}</p>
      ${unlocked ? '' : `<div class="callout red small" style="margin-bottom:8px">${icon('lock', 'width="14" height="14" style="vertical-align:-2px"')} Locked until phases ${p.gate.map((g) => D.PHASES.findIndex((x) => x.id === g) + 1).join(', ')} are complete.</div>`}
      <div class="dy-steps">${p.steps.map((st) => {
        const manual = !!s.settings.dynasty?.setup?.[`${p.id}.${st.id}`], auto = !manual && D.stepDone(s, p, st);
        return `<label class="dy-step ${manual || auto ? 'done' : ''}"><input type="checkbox" ${manual || auto ? 'checked' : ''} ${auto ? 'disabled' : ''} data-change="step" data-key="${p.id}.${st.id}"><span>${esc(st.text)}${auto ? ' <span class="badge green">detected</span>' : ''}${st.auto && !auto && !manual ? ' <span class="small muted">· ticks itself when recorded</span>' : ''}</span></label>`;
      }).join('')}</div>
      <div class="small mt"><b>Cost:</b> ${esc(p.cost)}</div>
      ${p.questions.length ? `<div class="small mt"><b>Ask your adviser:</b><ul style="margin:4px 0 0;padding-left:18px">${p.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>` : ''}
    </div>`;
  }).join('')}</div>
  <div class="card mt"><div class="card-head"><h3>Who you need</h3></div>${tableHTML([{ k: 'r', label: 'Role' }, { k: 'w', label: 'What they do' }, { k: 'when', label: 'When' }], [
    { id: 1, r: 'UAE structuring lawyer', w: 'Designs the foundation, drafts the charter, by-laws and will', when: 'Phases 1 to 3' },
    { id: 2, r: 'Corporate service provider', w: 'Registers the foundation and companies, registered office, annual filings', when: 'Phases 3 to 4, then yearly' },
    { id: 3, r: 'UAE tax adviser', w: 'Qualifying Family Foundation election, Corporate Tax registrations, treatment of policy payouts', when: 'Phases 3 to 5' },
    { id: 4, r: 'Independent, fee-based insurance broker', w: 'Compares insurers, structures policy ownership, no commission bias', when: 'Phase 5' },
    { id: 5, r: 'South African tax adviser', w: 'Confirms non-residency and plans for any assets still in South Africa', when: 'Phase 1, then as needed' },
  ])}</div>`;
}

// ---------------------------------------------------------------- policies and affordability
function policiesTab(s) {
  const a = D.affordability(s, tb), issues = D.policyIssues(s), f = D.foundation(s);
  const rows = (s.policies || []).slice().sort((x, y) => D.POLICY_STATUS.indexOf(x.status) - D.POLICY_STATUS.indexOf(y.status));
  const live = D.livePolicies(s), cover = live.reduce((t, p) => t + tb(p.sumAssured, p.ccy), 0);
  const over = a.premiums > 0 && a.share > a.cap;
  const withSched = rows.filter((p) => D.parseSurrender(p.surrender).length);
  return `
  <div class="grid g4">
    <div class="card kpi hero"><div class="label">Life cover</div><div class="value gold">${compact(cover, B())}</div><div class="delta">${live.length} live</div></div>
    <div class="card kpi"><div class="label">Annual premiums</div><div class="value">${compact(a.premiums, B())}</div><div class="delta">family policies, live</div></div>
    <div class="card kpi"><div class="label">Share of profit</div><div class="value ${over ? 'neg' : ''}">${a.premiums ? pctTxt(a.share) : '—'}</div><div class="delta">your cap: ${Math.round(a.cap * 100)}%</div></div>
    <div class="card kpi"><div class="label">Holding-company profit</div><div class="value">${compact(a.profit, B())}</div><div class="delta">${a.source === 'manual' ? 'entered by you' : 'last 12 months, from the books'}</div></div>
  </div>
  ${over ? `<div class="callout red mt">Premiums are above your cap. Never commit to premiums the holding company cannot pay from profit for 10+ years: reduce cover, switch part to term, or wait.</div>` : ''}
  <div class="grid g-main mt">
    <div class="card flush"><div class="card-head"><h3>Policies</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="policies" data-defaults='${esc(JSON.stringify({ status: 'Quoted', kind: 'Whole life', frequency: 'Annual', regulator: 'CBUAE', owner: f?.name || '', beneficiary: f?.name || '' }))}'>${icon('plus')} Policy or quote</button></div></div>
      ${crudRows(tableHTML([
        { k: 'insurer', label: 'Policy', fmt: (r) => `<b>${esc(r.insurer)}</b><div class="small muted">${esc(r.kind)} · ${esc(r.regulator || '')}</div>` },
        { k: 'lifeInsured', label: 'Life insured' },
        { k: 'owner', label: 'Owner → beneficiary', fmt: (r) => `<span class="small">${esc(r.owner || '?')} → ${esc(r.beneficiary || '?')}</span>${issues.some((i) => i.id === r.id && i.rule === 'ownership') ? ' <span class="badge red">check</span>' : ''}` },
        { k: 'sumAssured', label: 'Cover', num: true, fmt: (r) => (r.sumAssured ? money(num(r.sumAssured), r.ccy) : '—') },
        { k: 'premium', label: 'Premium a year', num: true, fmt: (r) => (r.premium ? money(D.annualPremium(r), r.ccy) : '—') },
        { k: 'status', label: 'Status', fmt: (r) => `<span class="badge ${r.status === 'In force' ? 'green' : r.status === 'Lapsed' ? 'red' : r.status === 'Paid out' ? 'blue' : ''}">${esc(r.status)}</span>` },
      ], rows, { act: 'crudEdit', empty: 'Log broker quotes here as they arrive. Ask for whole life, universal life and term at the same cover, each with a year-by-year surrender schedule, so they can be compared like for like.' }), 'policies')}</div>
    <div>
      <div class="card"><div class="card-head"><h3>Affordability check</h3></div>
        <div class="form" style="grid-template-columns:1fr 1fr">
          <div class="field"><label>Cap: premiums as % of profit</label><input type="number" step="1" value="${Math.round(a.cap * 100)}" data-change="cap"></div>
          <div class="field"><label>Annual profit (${esc(B())})</label><input type="number" step="any" value="${esc(s.settings.dynasty?.profit ?? '')}" placeholder="${a.booked ? Math.round(a.booked) : 'from the books'}" data-change="profit"></div>
        </div>
        <p class="small muted" style="margin:6px 0 0">Profit comes from the last 12 months of journal entries for the entities in the structure${a.booked ? ` (${money(a.booked, B())})` : ' (none booked yet)'}. Type a figure to override it. The cap is your own rule.</p></div>
      <div class="card mt"><div class="card-head"><h3>Rules checked</h3></div>
        ${issues.length ? issues.map((i) => `<div class="dy-alert"><span class="badge ${sevCls(i.sev)}">${i.rule}</span><span>${esc(i.text)}</span></div>`).join('') : '<p class="small muted" style="margin:0">Every policy is owned by and pays to the foundation, has a surrender schedule and an in-date nomination review.</p>'}
        <p class="small muted" style="margin:8px 0 0">Family policies: owner and beneficiary are the foundation, the life insured is the family member. Key-person cover is owned by the business instead.</p></div>
    </div>
  </div>
  ${withSched.length ? `<div class="card mt"><div class="card-head"><h3>Surrender value vs premiums paid</h3></div><p class="small muted" style="margin:0 0 8px">Surrendering early usually returns less than you paid. These come from the insurer illustrations you entered.</p>
    ${withSched.map((p) => { const sc = D.parseSurrender(p.surrender), ap = D.annualPremium(p); return `<details><summary><b>${esc(p.insurer)}</b> · ${esc(p.kind)} on ${esc(p.lifeInsured || '?')}</summary>${tableHTML([
      { k: 'year', label: 'Year' }, { k: 'paid', label: 'Premiums paid', num: true, fmt: (r) => money(r.paid, p.ccy) }, { k: 'value', label: 'Surrender value', num: true, fmt: (r) => money(r.value, p.ccy) },
      { k: 'gap', label: 'Value vs paid', num: true, fmt: (r) => `<span class="${r.value >= r.paid ? 'pos' : 'neg'}">${r.paid ? pctTxt(r.value / r.paid) : '—'}</span>` },
    ], sc.map((x) => ({ id: x.year, year: x.year, value: x.value, paid: ap * x.year })))}</details>`; }).join('')}</div>` : ''}`;
}

// ---------------------------------------------------------------- waterfall simulator
const sim = (s) => s.settings.dynasty?.sim || D.SIM_DEFAULT;
const simIn = (path, v, label, step = 'any') => `<div class="field"><label>${esc(label)}</label><input type="number" step="${step}" value="${esc(v)}" data-change="simSet" data-path="${path}"></div>`;
function waterfallTab(s) {
  const inp = sim(s), sc = D.scenarios(inp), b = B(), y0 = new Date().getFullYear();
  const step = 5;
  const series = sc.map((x) => ({ name: x.name, cls: x.cls, points: x.rows.filter((r) => r.y % step === 0).map((r) => ({ x: String(y0 + r.y), y: r.total })) }));
  const marks = [10, 20, 30, 40, 50, 60, 70, 80].filter((m) => m <= num(inp.years));
  const at = (k, m) => sc.find((x) => x.key === k).rows[m];
  const end = (k) => sc.find((x) => x.key === k).rows.at(-1);
  return `
  ${s.settings.dynasty?.sim ? '' : '<div class="callout gold small mb"><b>Example inputs, not quotes.</b> Replace them with your broker\'s illustrations, or tap "Use my policies" once quotes are logged.</div>'}
  <div class="card"><div class="card-head"><h3>Foundation value over time</h3><div class="right"><span class="small muted">premium reserve + family bank, ${esc(b)}</span></div></div>
      ${lineChart(series, { height: 260, area: false })}
      <p class="small muted" style="margin:8px 0 0">A range, never one promised number. Nominal, before tax, fees and inflation; payouts assumed at age ${esc(inp.lifeAge)} (cautious case: five years later). Family bank lending and policy cash values are left out.</p></div>
  <div class="card flush mt"><div class="card-head"><h3>What it costs and returns, over ${esc(inp.years)} years</h3></div>
      ${tableHTML([{ k: 'n', label: '' }, { k: 'c', label: 'Cautious', num: true }, { k: 'b', label: 'Base', num: true }, { k: 's', label: 'Strong', num: true }], [
        { id: 1, n: 'Premiums paid by the businesses', c: compact(end('cautious').fromBusiness, b), b: compact(end('base').fromBusiness, b), s: compact(end('strong').fromBusiness, b) },
        { id: 2, n: 'Premiums paid from payouts', c: compact(end('cautious').fromReserve, b), b: compact(end('base').fromReserve, b), s: compact(end('strong').fromReserve, b) },
        { id: 3, n: 'Payouts received', c: compact(end('cautious').payouts, b), b: compact(end('base').payouts, b), s: compact(end('strong').payouts, b) },
        { id: 4, n: `Foundation value, year ${inp.years}`, c: compact(end('cautious').total, b), b: compact(end('base').total, b), s: compact(end('strong').total, b) },
      ])}
      <p class="small muted" style="margin:0;padding:10px 16px 14px">The waterfall works when payouts arrive before the businesses tire of paying premiums. Watch the first row against your affordability cap.</p></div>
  <div class="card mt"><div class="card-head"><h3>Assumptions</h3><div class="right"><button class="btn sm" data-act="simFromPolicies">${icon('sync')} Use my policies</button><button class="btn sm ghost" data-act="simReset">Reset</button></div></div>
    <div class="form" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      ${simIn('years', inp.years, 'Years to project', 1)}${simIn('lifeAge', inp.lifeAge, 'Payout at age', 1)}${simIn('recycle', inp.recycle, '% of payout to premium reserve', 1)}
      ${simIn('rates.0', inp.rates[0], 'Growth % (cautious)')}${simIn('rates.1', inp.rates[1], 'Growth % (base)')}${simIn('rates.2', inp.rates[2], 'Growth % (strong)')}
    </div>
    ${inp.gens.map((g, i) => `<h4 class="mt" style="margin-bottom:6px">Generation ${i + 1}: ${esc(g.label)}</h4><div class="form" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">
      ${simIn(`gens.${i}.n`, g.n, 'Lives insured', 1)}${simIn(`gens.${i}.age`, g.age, 'Age at start', 1)}${simIn(`gens.${i}.start`, g.start, 'Starts in year', 1)}
      ${simIn(`gens.${i}.cover`, g.cover, `Cover each (${b})`)}${simIn(`gens.${i}.premium`, g.premium, `Premium each a year (${b})`)}${simIn(`gens.${i}.term`, g.term, 'Premium years', 1)}</div>`).join('')}
    <p class="small muted" style="margin:10px 0 0">Recycling rule: when a policy pays out, ${esc(inp.recycle)}% goes to a premium reserve that pays the next generation's premiums first; the rest goes to the family bank. Both earn the growth rate.</p></div>
  <div class="card flush mt"><div class="card-head"><h3>Milestones (base case, with the range)</h3></div>${tableHTML([
    { k: 'y', label: 'Year' }, { k: 'prem', label: 'Premiums due that year', num: true }, { k: 'reserve', label: 'Premium reserve', num: true }, { k: 'bank', label: 'Family bank', num: true }, { k: 'range', label: 'Total (cautious – strong)', num: true },
  ], marks.map((m) => ({ id: m, y: `${y0 + m} (yr ${m})`, prem: compact(at('base', m).prem, b), reserve: compact(at('base', m).reserve, b), bank: compact(at('base', m).bank, b), range: `${compact(at('cautious', m).total, b)} – ${compact(at('strong', m).total, b)}` })))}</div>`;
}

// ---------------------------------------------------------------- family bank
function bankTab(s) {
  const pool = D.bankPool(s, tb), loans = (s.familyLoans || []).slice().sort((a, c) => D.LOAN_STATUS.indexOf(a.status) - D.LOAN_STATUS.indexOf(c.status));
  const cap = s.settings.dynasty?.bankCapital || [];
  return `<div class="grid g4">
    <div class="card kpi hero"><div class="label">Available to lend</div><div class="value gold">${compact(pool.available, B())}</div></div>
    <div class="card kpi"><div class="label">Capital put in</div><div class="value">${compact(pool.capital, B())}</div></div>
    <div class="card kpi"><div class="label">Owed back (with interest)</div><div class="value">${compact(pool.outstanding, B())}</div></div>
    <div class="card kpi"><div class="label">Repaid so far</div><div class="value pos">${compact(pool.back, B())}</div></div></div>
  <div class="callout small mt">A family member pitches a venture to the council like an investor pitch. The council lends from the foundation at an agreed rate; repayments refill the pool, so each generation's ventures fund the next. <b>No loan is approved without council minutes.</b></div>
  <div class="card flush mt"><div class="card-head"><h3>Loans</h3><div class="right"><button class="btn sm" data-act="loanNew">${icon('plus')} Pitch</button></div></div>
    ${loans.length ? `<div class="table-wrap"><table><thead><tr><th>Borrower</th><th>Status</th><th class="num">Amount</th><th class="num">Monthly</th><th class="num">Repaid / scheduled</th><th>Minutes</th><th></th></tr></thead><tbody>
    ${loans.map((l) => { const st = D.loanState(l), m = (s.governance || []).find((g) => g.id === l.minutes); return `<tr><td class="click" data-act="loanEdit" data-id="${l.id}" style="cursor:pointer"><b>${esc(l.borrower)}</b><div class="small muted">${esc(l.venture || '')}</div></td>
      <td><span class="badge ${l.status === 'Active' ? 'green' : l.status === 'Default' ? 'red' : l.status === 'Repaid' ? 'blue' : ''}">${esc(l.status)}</span>${st.arrears > 1 && l.status === 'Active' ? ' <span class="badge red">behind</span>' : ''}</td>
      <td class="num">${money(num(l.principal), l.ccy)}<div class="small muted">${num(l.rate)}% · ${num(l.termMonths)} mo</div></td><td class="num">${money(st.payment, l.ccy)}</td>
      <td class="num">${money(st.repaid, l.ccy)} / ${money(st.scheduled, l.ccy)}</td>
      <td>${m ? `<span class="badge green">${esc(m.title || 'Minutes')}</span>` : D.needsMinutes(l) ? '<span class="badge red">missing</span>' : '<span class="small muted">needed to approve</span>'}</td>
      <td>${['Active', 'Default'].includes(l.status) ? `<button class="btn sm" data-act="repay" data-id="${l.id}">Log repayment</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">No pitches yet. The family bank becomes real once the policies have cash value or the businesses retain profit, usually year 5 or later.</div>'}</div>
  <div class="card flush mt"><div class="card-head"><h3>Capital into the pool</h3><div class="right"><button class="btn sm" data-act="capitalAdd">${icon('plus')} Capital</button></div></div>
    ${tableHTML([{ k: 'date', label: 'Date', fmt: (r) => fmtDate(r.date) }, { k: 'source', label: 'Source' }, { k: 'amount', label: 'Amount', num: true, fmt: (r) => money(num(r.amount), r.ccy) }, { k: 'x', label: '', fmt: (r) => `<button class="btn sm ghost icon-btn" data-act="capitalDel" data-id="${r.id}">${icon('trash')}</button>` }], cap, { empty: 'Record retained profit, policy cash value or payouts placed in the family bank.' })}</div>`;
}

// ---------------------------------------------------------------- governance
function governanceTab(s) {
  const names = new Set(D.structureEntities(s).map((e) => e.name));
  const comp = (s.compliance || []).filter((c) => c.dynasty || names.has(c.entity)).sort((a, c) => (a.due || '9').localeCompare(c.due || '9'));
  const evs = (s.lifeEvents || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `<div class="grid g2">
    <div class="card flush"><div class="card-head"><h3>Documents and minutes</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="governance" data-defaults='${esc(JSON.stringify({ kind: 'Minutes', entity: D.foundation(s)?.name || 'Personal', signedOn: today() }))}'>${icon('plus')} Record</button></div></div>
      ${crudRows(tableHTML([
        { k: 'kind', label: 'Record', fmt: (r) => `<b>${esc(r.title || r.kind)}</b><div class="small muted">${esc(r.kind)} · ${esc(r.entity || '')}</div>` },
        { k: 'signedOn', label: 'Signed / held', fmt: (r) => (r.signedOn ? fmtDate(r.signedOn) : '<span class="badge">draft</span>') },
        { k: 'reviewDue', label: 'Review', fmt: (r) => (r.reviewDue ? `${fmtDate(r.reviewDue)} ${dueBadge(r.reviewDue)}` : '—') },
        { k: 'fileUrl', label: '', fmt: (r) => (r.fileUrl && /^https?:\/\//.test(r.fileUrl) ? `<a href="${esc(r.fileUrl)}" target="_blank" rel="noopener" class="small">Open</a>` : '') },
      ], (s.governance || []).slice().sort((a, b) => (b.signedOn || '').localeCompare(a.signedOn || '')), { act: 'crudEdit', empty: 'Log the will, charter, by-laws, letter of wishes, family constitution and every council meeting. A structure that is not run on paper is easy to challenge.' }), 'governance')}</div>
    <div class="card"><div class="card-head"><h3>Life-event reviews</h3><div class="right"><button class="btn sm" data-act="lifeEvent">${icon('plus')} Life event</button></div></div>
      <p class="small muted" style="margin:0 0 8px">A birth, marriage, move or business sale opens a checklist. Nothing changes without a logged review.</p>
      ${evs.length ? evs.map((e) => { const done = D.LIFE_CHECKLIST.filter((c) => e.checks?.[c.id]).length; return `<details class="dy-event" ${done < D.LIFE_CHECKLIST.length ? 'open' : ''}><summary><b>${esc(e.kind)}</b>${e.who ? ` · ${esc(e.who)}` : ''} <span class="small muted">${e.date ? fmtDate(e.date) : ''}</span> <span class="badge ${done === D.LIFE_CHECKLIST.length ? 'green' : 'gold'}">${done}/${D.LIFE_CHECKLIST.length}</span></summary>
        ${D.LIFE_CHECKLIST.map((c) => `<label class="dy-step ${e.checks?.[c.id] ? 'done' : ''}"><input type="checkbox" ${e.checks?.[c.id] ? 'checked' : ''} data-change="lifeCheck" data-id="${e.id}" data-c="${c.id}"><span>${esc(c.text)}</span></label>`).join('')}
        ${e.notes ? `<p class="small muted">${esc(e.notes)}</p>` : ''}<button class="btn sm ghost" data-act="lifeDel" data-id="${e.id}">${icon('trash')} Remove</button></details>`; }).join('') : '<div class="empty small">No life events logged.</div>'}</div>
  </div>
  <div class="card flush mt"><div class="card-head"><h3>Compliance calendar</h3><div class="right">${(s.compliance || []).some((c) => c.dynasty) ? '' : `<button class="btn sm primary" data-act="addObligations">${icon('plus')} Add the standard obligations</button>`}<a class="btn sm" href="#/legal/compliance">All obligations</a></div></div>
    ${comp.length ? tableHTML([
      { k: 'title', label: 'Obligation', fmt: (r) => `<b>${esc(r.title)}</b>${r.notes ? `<div class="small muted">${esc(r.notes)}</div>` : ''}` },
      { k: 'entity', label: 'Entity' }, { k: 'recurrence', label: 'Recurs' },
      { k: 'due', label: 'Due', fmt: (r) => `${r.due ? fmtDate(r.due) : ''} ${r.status !== 'Done' ? dueBadge(r.due) : '<span class="badge green">done</span>'}` },
    ], comp) : '<div class="empty small">Registry renewals, Corporate Tax filings, council meetings and beneficiary reviews appear here. Overdue items flag your Command Centre.</div>'}
    ${comp.some((c) => !c.due) ? '<p class="small muted" style="padding:0 16px 12px;margin:0">Set the due dates in Legal &amp; Entities once each entity is formed.</p>' : ''}</div>
  <div class="card mt"><div class="card-head"><h3>Research for Claude</h3></div>
    <p class="small muted" style="margin:0 0 8px">Rules and fees change. Queue these for the knowledge vault so the module stays current.</p>
    <div class="row" style="gap:6px;flex-wrap:wrap">
      <button class="btn sm" data-act="research" data-r="foundations">${icon('spark')} Quarterly: ADGM, DIFC and FTA foundation updates</button>
      <button class="btn sm" data-act="research" data-r="za">${icon('spark')} Yearly: South African estate duty and UAE wills law</button>
      <button class="btn sm" data-act="research" data-r="insurers">${icon('spark')} Compare insurer illustrations</button></div></div>`;
}

const RESEARCH = {
  foundations: { title: 'Dynasty check: ADGM, DIFC and Federal Tax Authority updates on foundations and Qualifying Family Foundation rules', question: 'Check the ADGM and DIFC registries and the Federal Tax Authority for any changes to foundation regulations, registry fees, registered office requirements, and the Qualifying Family Foundation (tax-transparent) rules, including how life policy payouts received by a foundation are treated. Update the wiki article on the UAE family wealth structure (Waterfall Method) with dated figures and sources. Informs the Dynasty module setup phases 2 to 5.' },
  za: { title: 'Dynasty check: South African estate duty for non-residents and UAE wills law', question: 'Refresh South African estate duty rates, abatement and the rules for non-residents and ordinarily-resident individuals (SARS), and any changes to UAE wills law for non-Muslim expatriates (DIFC Wills Service, Abu Dhabi Judicial Department, Federal Decree-Law No. 41 of 2022 on civil personal status). Update the wiki article on the UAE family wealth structure with dated figures.' },
  insurers: { title: 'Dynasty: compare life insurance illustrations for the family foundation', question: 'Compare the whole life, universal life and term illustrations in the Dynasty module at the same cover level: total premiums, year-by-year surrender values, guarantees, insurer regulator (CBUAE, DFSA, FSRA) and whether a UAE foundation can own and be the beneficiary of each policy. Flag sales bias and surrender charges.' },
};

// ---------------------------------------------------------------- loans with the "no approval without minutes" rule
function loanForm(row) {
  const sc = SCHEMAS.familyLoans;
  openForm({ title: row ? 'Edit family bank loan' : 'New pitch to the family bank', fields: sc.fields, values: row || { status: 'Pitched', ccy: B(), termMonths: 36, rate: 5 },
    intro: '<p class="small muted" style="margin:0 0 10px">Record the pitch first. The council approves it at a minuted meeting; link those minutes before setting it to Approved or Active.</p>',
    onSave: (d) => {
      if (D.needsMinutes(d) && !(store.get().governance || []).some((g) => g.id === d.minutes && g.kind === 'Minutes')) { toast('No loan without approval minutes: log the council meeting under Governance and link it', 'error'); return false; }
      if (d.status === 'Active' && !d.start) { toast('Set the date the loan starts', 'error'); return false; }
      store.upsert('familyLoans', { ...(row || { id: uid('fl'), repayments: [] }), ...d });
    },
    onDelete: row ? () => store.remove('familyLoans', row.id) : undefined });
}

export default {
  title: 'Dynasty',
  render(s, params) {
    tab = params[0] || 'overview';
    const alerts = D.dynastyAlerts(s, tb).filter((a) => a.sev >= 2).length;
    const body = tab === 'setup' ? setupTab(s) : tab === 'policies' ? policiesTab(s) : tab === 'waterfall' ? waterfallTab(s) : tab === 'bank' ? bankTab(s) : tab === 'governance' ? governanceTab(s) : overviewTab(s);
    return `<div class="page-head"><div><div class="eyebrow">Wealth</div><h1>Dynasty</h1><p>The family wealth structure: a foundation at the top, every business ring-fenced beneath it, life policies that pay back in and fund the next generation, and the governance that keeps it real.</p></div></div>
      ${tabsHTML([['overview', `Structure${alerts ? ` · ${alerts}` : ''}`], ['setup', 'Setup'], ['policies', 'Policies'], ['waterfall', 'Waterfall'], ['bank', 'Family bank'], ['governance', 'Governance']], tab)}${body}`;
  },
  actions: {
    ...crudActions,
    tab(el) { location.hash = `#/dynasty/${el.dataset.tab}`; },
    step(el) { store.update((s) => { s.settings.dynasty.setup ||= {}; if (el.checked) s.settings.dynasty.setup[el.dataset.key] = today(); else delete s.settings.dynasty.setup[el.dataset.key]; }); },
    cap(el) { store.update((s) => { s.settings.dynasty.premiumCap = Math.max(1, num(el.value)) / 100; }); },
    profit(el) { store.update((s) => { s.settings.dynasty.profit = el.value === '' ? '' : num(el.value); }); },
    blueprint() {
      const vs = store.get().ventures.filter((v) => v.stage !== 'Parked');
      const fields = [
        { k: 'jur', label: 'Jurisdiction', type: 'select', options: ['ADGM', 'DIFC'], hint: 'ADGM is cheaper and keeps council details private; DIFC has the bigger family-office ecosystem' },
        { k: 'fname', label: 'Foundation name', default: `${store.get().settings.empire} Family Foundation` },
        { k: 'hname', label: 'Holding company name', default: `${store.get().settings.empire} Holdings` },
        { k: 'ops', label: `Add a planned company for each venture (${vs.length})`, type: 'checkbox', default: true, text: vs.map((v) => v.name).join(', ') },
      ];
      openForm({ title: 'Add the blueprint structure', fields, saveLabel: 'Add as planned', intro: '<p class="small muted" style="margin:0 0 10px">Adds planned entities to Legal &amp; Entities. Nothing is registered: you set each to Active once it is formed.</p>',
        onSave: (d) => { store.update((s) => {
          const has = (n) => s.entities.some((e) => e.name === n);
          if (!has(d.fname)) s.entities.push({ id: uid('en'), name: d.fname, type: 'Foundation', jurisdiction: d.jur, status: 'Planned', ownership: '', parent: '', taxStatus: 'Pending', notes: 'Apex of the family structure. Founder, council, guardian and beneficiaries in Dynasty.' });
          if (!has(d.hname)) s.entities.push({ id: uid('en'), name: d.hname, type: 'Holding company', jurisdiction: d.jur, status: 'Planned', ownership: 100, parent: d.fname, taxStatus: 'Pending', notes: d.jur === 'ADGM' ? 'ADGM SPV' : 'DIFC Prescribed Company' });
          if (d.ops) for (const v of vs) { const n = `${v.name} Ltd`; if (!has(n) && !s.entities.some((e) => e.venture === v.id)) s.entities.push({ id: uid('en'), name: n, type: 'Operating company', jurisdiction: '', status: 'Planned', ownership: 100, parent: d.hname, venture: v.id, taxStatus: '', notes: 'Ring-fenced: one company per business.' }); }
        }); toast('Blueprint added as planned entities', 'ok'); } });
    },
    ringFence() {
      store.update((s) => { const h = D.holdco(s); for (const v of D.ringFence(s).missing) { const n = `${v.name} Ltd`; if (!s.entities.some((e) => e.name === n)) s.entities.push({ id: uid('en'), name: n, type: 'Operating company', jurisdiction: '', status: 'Planned', ownership: 100, parent: h.name, venture: v.id, taxStatus: '', notes: 'Ring-fenced: one company per business.' }); else s.entities.find((e) => e.name === n).venture = v.id; } });
      toast('Planned companies added', 'ok');
    },
    simSet(el) {
      store.update((s) => {
        const cur = JSON.parse(JSON.stringify(sim(s))); const p = el.dataset.path.split('.'); let o = cur;
        for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
        o[p.at(-1)] = num(el.value); s.settings.dynasty.sim = cur;
      });
    },
    simReset() { store.update((s) => { s.settings.dynasty.sim = null; }); },
    simFromPolicies() {
      const s = store.get(), gen = (name) => +((s.family || []).find((p) => p.name === name)?.generation || 0);
      const fam = (s.policies || []).filter((p) => !['Lapsed', 'Paid out'].includes(p.status) && !['Key person', 'Term (business)', 'Term'].includes(p.kind));
      const g1 = fam.filter((p) => gen(p.lifeInsured) === 1 || !gen(p.lifeInsured));
      if (!g1.length) { toast('Log quotes or policies on generation-1 family members first (Policies tab)', 'error'); return; }
      const age = (name) => { const b = (s.family || []).find((p) => p.name === name)?.birthDate; return b ? Math.floor((new Date() - new Date(`${b}T00:00:00`)) / 3.15576e10) : null; };
      const ages = g1.map((p) => age(p.lifeInsured)).filter((x) => x != null);
      store.update((st) => {
        const cur = JSON.parse(JSON.stringify(sim(st)));
        cur.gens[0] = { ...cur.gens[0], n: g1.length, cover: Math.round(g1.reduce((t, p) => t + tb(p.sumAssured, p.ccy), 0) / g1.length), premium: Math.round(g1.reduce((t, p) => t + tb(D.annualPremium(p), p.ccy), 0) / g1.length), ...(ages.length ? { age: Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) } : {}) };
        st.settings.dynasty.sim = cur;
      });
      toast(`Generation 1 set from ${g1.length} polic${g1.length === 1 ? 'y' : 'ies'}`, 'ok');
    },
    loanNew() { loanForm(null); },
    loanEdit(el) { loanForm(store.byId('familyLoans', el.dataset.id)); },
    repay(el) {
      const l = store.byId('familyLoans', el.dataset.id);
      openForm({ title: `Repayment from ${l.borrower}`, fields: [{ k: 'date', label: 'Date', type: 'date', default: today() }, { k: 'amount', label: `Amount (${l.ccy})`, type: 'number', required: true, default: Math.round(D.loanPayment(l)) }],
        onSave: (d) => store.update((s) => { const x = s.familyLoans.find((y) => y.id === l.id); (x.repayments ||= []).push({ date: d.date, amount: d.amount }); if (D.loanState(x).outstanding <= 1) x.status = 'Repaid'; }) });
    },
    capitalAdd() {
      openForm({ title: 'Capital into the family bank', fields: [{ k: 'date', label: 'Date', type: 'date', default: today() }, { k: 'source', label: 'Source', type: 'select', options: ['Retained profit', 'Policy cash value', 'Policy payout', 'Founder contribution', 'Other'] }, { k: 'amount', label: 'Amount', type: 'number', required: true }, { k: 'ccy', label: 'Currency', type: 'select', options: store.currencies(), default: B() }],
        onSave: (d) => store.update((s) => { (s.settings.dynasty.bankCapital ||= []).push({ id: uid('bc'), ...d }); }) });
    },
    capitalDel(el) { store.update((s) => { s.settings.dynasty.bankCapital = (s.settings.dynasty.bankCapital || []).filter((c) => c.id !== el.dataset.id); }); },
    lifeEvent() {
      openForm({ title: 'Log a life event', fields: [{ k: 'kind', label: 'What happened', type: 'select', options: D.LIFE_EVENTS }, { k: 'who', label: 'Who', placeholder: 'Name' }, { k: 'date', label: 'Date', type: 'date', default: today() }, { k: 'notes', label: 'Notes', type: 'textarea' }],
        onSave: (d) => store.update((s) => { s.lifeEvents.push({ id: uid('le'), ...d, checks: {} }); }) });
    },
    lifeCheck(el) { store.update((s) => { const e = s.lifeEvents.find((x) => x.id === el.dataset.id); e.checks ||= {}; if (el.checked) e.checks[el.dataset.c] = today(); else delete e.checks[el.dataset.c]; if (D.LIFE_CHECKLIST.every((c) => e.checks[c.id])) e.closed = today(); else delete e.closed; }); },
    lifeDel(el) { store.update((s) => { s.lifeEvents = s.lifeEvents.filter((x) => x.id !== el.dataset.id); }); },
    addObligations() {
      store.update((s) => { for (const o of D.standardObligations(s)) if (!s.compliance.some((c) => c.title === o.title)) s.compliance.push({ id: uid('c'), due: '', status: 'Open', dynasty: true, ...o }); });
      toast('Added to the compliance calendar: set the due dates as each entity is formed', 'ok');
    },
    research(el) { const r = RESEARCH[el.dataset.r]; K.addToQueue({ type: 'research', priority: 'Normal', domain: 'Legal & Structuring', ...r }); toast('Queued for Claude', 'ok'); },
  },
};
