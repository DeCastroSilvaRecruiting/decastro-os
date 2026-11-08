import * as store from '../store.js';
import { esc, icon, money, compact, pct, fnum, num, tabsHTML, lineChart, fmtDate, daysUntil } from '../ui.js';
import { crudActions } from '../schemas.js';
import * as F from '../fin.js';

let tab = 'calculators';
const b = () => store.base();
const O = (l, v, cls = '') => `<div class="o"><div class="l">${l}</div><div class="v ${cls}">${v}</div></div>`;

// Each calculator: inputs [k, label, default], compute(values) -> html
const CALCS = [
  { k: 'compound', title: 'Compound growth', sub: 'The eighth wonder. See what consistency does over decades.',
    inputs: [['pv', 'Starting capital', 100000], ['contrib', 'Monthly contribution', 5000], ['rate', 'Annual return %', 8], ['years', 'Years', 20]],
    run: (v) => { const r = F.futureValue({ pv: v.pv, contrib: v.contrib, rate: v.rate / 100, years: v.years });
      return `<div class="calc-out">${O('Future value', compact(r.fv, b()))}${O('You invested', compact(r.invested, b()))}${O('Growth earned', compact(r.growth, b()), 'pos')}${O('Doubling time', fnum(F.exactDoubling(v.rate / 100), 1) + ' yrs')}</div>
        <div class="mt">${lineChart([{ name: 'Balance', points: r.series.map((x) => ({ x: 'Y' + x.year, y: x.balance })) }, { name: 'Invested', cls: 'b', points: r.series.map((x) => ({ x: '', y: x.invested })) }], { height: 180 })}</div>`; } },
  { k: 'loan', title: 'Loan & mortgage', sub: 'Payment, total interest and how fast equity builds.',
    inputs: [['principal', 'Loan amount', 1000000], ['rate', 'Interest rate %', 4.5], ['years', 'Term (years)', 25]],
    run: (v) => { const a = F.amortization(v.principal, v.rate / 100, v.years);
      return `<div class="calc-out">${O('Monthly payment', money(a.payment, b()))}${O('Total interest', compact(a.totalInterest, b()), 'neg')}${O('Total paid', compact(a.totalPaid, b()))}${O('Interest / principal', pct(a.totalInterest / v.principal, 0))}</div>
        <div class="mt">${lineChart([{ name: 'Balance', points: a.yearly.map((y) => ({ x: 'Y' + y.year, y: y.balance })) }], { height: 160 })}</div>`; } },
  { k: 'npv', title: 'NPV & IRR', sub: 'Is this investment worth more than it costs? Cash flows from year 0.',
    inputs: [['flows', 'Cash flows (comma separated)', '-500000, 80000, 120000, 150000, 180000, 250000', 'text'], ['rate', 'Discount rate % (hurdle)', 12]],
    run: (v) => { const fl = F.parseFlows(v.flows); const n = F.npv(v.rate / 100, fl), i = F.irr(fl), p = F.payback(fl);
      return `<div class="calc-out">${O('NPV', compact(n, b()), n >= 0 ? 'pos' : 'neg')}${O('IRR', pct(i))}${O('Payback', Number.isFinite(p) ? fnum(p, 1) + ' yrs' : 'never')}${O('Multiple', fnum(fl.filter((x) => x > 0).reduce((a, c) => a + c, 0) / -fl.filter((x) => x < 0).reduce((a, c) => a + c, 0), 2) + 'x')}</div>
        <div class="callout ${n >= 0 ? 'gold' : 'red'} small mt">${n >= 0 ? `Creates value at a ${v.rate}% hurdle — IRR beats your required return.` : `Destroys value at a ${v.rate}% hurdle. Renegotiate price or pass.`}</div>`; } },
  { k: 'dcf', title: 'DCF valuation', sub: 'What a business is worth from its future free cash flow.',
    inputs: [['fcf', 'Current free cash flow', 1000000], ['growth', 'Growth % (years 1–5)', 10], ['discount', 'Discount rate %', 14], ['terminal', 'Terminal growth %', 3], ['netDebt', 'Net debt', 0]],
    run: (v) => { const r = F.dcf({ fcf: v.fcf, growth: v.growth / 100, discount: v.discount / 100, terminalGrowth: v.terminal / 100, netDebt: v.netDebt });
      return `<div class="calc-out">${O('Enterprise value', compact(r.ev, b()))}${O('Equity value', compact(r.equity, b()))}${O('EV / FCF', fnum(r.ev / v.fcf, 1) + 'x')}${O('Terminal share', pct(r.tvShare, 0))}</div>
        <div class="small muted mt">${r.tvShare > 0.75 ? 'Over 75% of value sits in the terminal value — the answer is mostly an assumption. Be sceptical.' : 'Most value comes from the forecast period, which makes the estimate more grounded.'}</div>`; } },
  { k: 'kelly', title: 'Kelly position sizing', sub: 'How much to stake when you have an edge — and why to bet less.',
    inputs: [['p', 'Probability of winning %', 55], ['b', 'Win multiple (gain per 1 risked)', 1.5], ['loss', 'Fraction lost if wrong (0–1)', 1], ['capital', 'Capital at risk pool', 500000]],
    run: (v) => { const k = F.kelly(v.p / 100, v.b, v.loss || 1); const kc = Math.max(0, k);
      return `<div class="calc-out">${O('Full Kelly', pct(k))}${O('Half Kelly', pct(kc / 2))}${O('Quarter Kelly', pct(kc / 4))}${O('Half-Kelly stake', compact(v.capital * kc / 2, b()))}</div>
        <div class="callout ${k <= 0 ? 'red' : 'gold'} small mt">${k <= 0 ? 'No edge: the expected value is negative or zero. Do not bet.' : 'Practitioners usually stake half Kelly or less: your probability estimates are uncertain and full Kelly is brutally volatile.'}</div>`; } },
  { k: 'ev', title: 'Expected value', sub: 'Weigh outcomes by probability. One per line: probability% : value',
    inputs: [['outcomes', 'Outcomes', '20 : 2000000\n50 : 300000\n30 : -400000', 'textarea']],
    run: (v) => { const oc = String(v.outcomes).split('\n').map((l) => l.split(':')).filter((x) => x.length === 2).map(([p, val]) => ({ p: num(p) / 100, v: num(val) })); const r = F.expectedValue(oc);
      return `<div class="calc-out">${O('Expected value', compact(r.ev, b()), r.ev >= 0 ? 'pos' : 'neg')}${O('Std deviation', compact(r.sd, b()))}${O('Chance of loss', pct(r.pLoss, 0))}${O('Probabilities sum', pct(r.pSum, 0), Math.abs(r.pSum - 1) > 0.001 ? 'neg' : '')}</div>
        <div class="small muted mt">Positive EV is necessary, not sufficient: make sure the worst case cannot ruin you.</div>`; } },
  { k: 'breakeven', title: 'Break-even', sub: 'How many units before the business pays for itself.',
    inputs: [['fixed', 'Fixed costs per month', 45000], ['price', 'Price per unit', 2500], ['variable', 'Variable cost per unit', 900]],
    run: (v) => { const r = F.breakEven(v.fixed, v.price, v.variable);
      return `<div class="calc-out">${O('Break-even units / mo', fnum(Math.ceil(r.units), 0))}${O('Break-even revenue', compact(r.revenue, b()))}${O('Contribution margin', pct(r.cmRatio, 0))}${O('Margin per unit', money(r.cm, b()))}</div>`; } },
  { k: 'cagr', title: 'CAGR & rule of 72', sub: 'The true annual growth rate between two values.',
    inputs: [['start', 'Start value', 250000], ['end', 'End value', 600000], ['years', 'Years', 6]],
    run: (v) => { const c = F.cagr(v.start, v.end, v.years);
      return `<div class="calc-out">${O('CAGR', pct(c, 2))}${O('Rule of 72', fnum(F.rule72(c * 100), 1) + ' yrs to 2x')}${O('Exact doubling', fnum(F.exactDoubling(c), 1) + ' yrs')}${O('Total multiple', fnum(v.end / v.start, 2) + 'x')}</div>`; } },
];
const state = Object.fromEntries(CALCS.map((c) => [c.k, Object.fromEntries(c.inputs.map(([k, , d]) => [k, d]))]));
const values = (c) => Object.fromEntries(c.inputs.map(([k, , , t]) => [k, t ? state[c.k][k] : num(state[c.k][k])]));

function calculators() {
  return `<div class="grid g2">${CALCS.map((c) => `<div class="card"><div class="card-head"><h3>${esc(c.title)}</h3></div><p class="small muted" style="margin:-8px 0 12px">${esc(c.sub)}</p>
    <div class="form">${c.inputs.map(([k, l, , t]) => `<div class="field ${t ? 'full' : ''}"><label>${esc(l)}</label>${t === 'textarea' ? `<textarea data-input="calc" data-c="${c.k}" data-k="${k}" style="min-height:76px;font-family:var(--mono);font-size:12.5px">${esc(state[c.k][k])}</textarea>` : `<input ${t ? '' : 'type="number" step="any"'} data-input="calc" data-c="${c.k}" data-k="${k}" value="${esc(state[c.k][k])}">`}</div>`).join('')}</div>
    <div id="out-${c.k}">${safeRun(c)}</div></div>`).join('')}</div>`;
}
function safeRun(c) { try { return c.run(values(c)); } catch (e) { return `<div class="small muted">Check the inputs.</div>`; } }

function decisions(s) {
  const done = s.decisions.filter((d) => ['Success', 'Failure'].includes(d.outcome) && d.probability !== '' && d.probability != null);
  const br = F.brier(done.map((d) => ({ p: num(d.probability) / 100, o: d.outcome === 'Success' ? 1 : 0 })));
  const hit = done.length ? done.filter((d) => d.outcome === 'Success').length / done.length : NaN;
  const avgP = done.length ? done.reduce((t, d) => t + num(d.probability), 0) / done.length / 100 : NaN;
  const rows = s.decisions.slice().sort((a, c) => (c.date || '').localeCompare(a.date || ''));
  return `<div class="grid g4">
    <div class="card kpi hero"><div class="label">Decisions logged</div><div class="value gold">${s.decisions.length}</div><div class="delta">${done.length} resolved</div></div>
    <div class="card kpi"><div class="label">Brier score</div><div class="value">${Number.isFinite(br) ? fnum(br, 3) : '—'}</div><div class="delta">0 = perfect · 0.25 = coin flip</div></div>
    <div class="card kpi"><div class="label">Avg confidence</div><div class="value">${pct(avgP, 0)}</div></div>
    <div class="card kpi"><div class="label">Actual hit rate</div><div class="value">${pct(hit, 0)}</div><div class="delta">${Number.isFinite(hit) && Number.isFinite(avgP) ? (avgP - hit > 0.1 ? 'You are overconfident' : hit - avgP > 0.1 ? 'You are underconfident' : 'Well calibrated') : 'resolve decisions to measure'}</div></div>
  </div>
  <div class="card flush mt"><div class="card-head"><h3>Decision journal</h3><div class="right"><button class="btn sm primary" data-act="crudNew" data-coll="decisions" data-defaults='{"outcome":"Pending","date":"${new Date().toISOString().slice(0, 10)}"}'>${icon('plus')} Log decision</button></div></div>
    ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Decision</th><th>Date</th><th class="num">Forecast</th><th class="num">EV</th><th>Review</th><th>Outcome</th></tr></thead><tbody>
    ${rows.map((d) => `<tr class="click" data-act="crudEdit" data-coll="decisions" data-id="${d.id}"><td><b>${esc(d.title)}</b>${d.choice ? `<div class="small muted">→ ${esc(d.choice)}</div>` : ''}</td><td class="nowrap">${fmtDate(d.date)}</td>
      <td class="num">${d.probability !== '' && d.probability != null ? d.probability + '%' : '—'}</td><td class="num">${d.expected ? compact(num(d.expected), b()) : '—'}</td>
      <td class="nowrap">${d.reviewDate ? fmtDate(d.reviewDate) : '—'}${d.outcome === 'Pending' && daysUntil(d.reviewDate) < 0 ? ' <span class="badge red">due</span>' : ''}</td>
      <td><span class="badge ${d.outcome === 'Success' ? 'green' : d.outcome === 'Failure' ? 'red' : ''}">${esc(d.outcome || 'Pending')}</span></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><h3>Start the journal</h3><div>Write down important decisions <i>before</i> you know the outcome: what you knew, what you expected and how confident you were. Over time your Brier score shows how good your judgement really is — the foundation of a mathematical mindset.</div></div>`}
  </div>`;
}

const MODELS = [
  ['Avoid ruin first', 'No return justifies a risk of total loss. Survive to keep compounding — size positions so the worst case is a setback, never an ending.'],
  ['Expected value', 'Judge choices by probability × payoff summed over outcomes, not by the most likely outcome or the most vivid one.'],
  ['Margin of safety', 'Buy or commit only when the price leaves room for your estimates to be wrong. Your forecasts will be wrong.'],
  ['Compounding', 'Small, repeated edges grow exponentially. Protect the base, reinvest, and give it time; interruptions are the real cost.'],
  ['Inversion', 'Ask how this could fail and avoid those paths. It is often easier to avoid stupidity than to seek brilliance.'],
  ['Base rates', 'Start from how similar ventures usually turn out before adjusting for why yours is special.'],
  ['Opportunity cost', 'Every dirham and hour committed here is not available for the next best option. Compare against that, not against zero.'],
  ['Second-order effects', 'Ask “and then what?” The consequences of the consequences decide most outcomes.'],
  ['Asymmetric bets', 'Prefer situations with capped downside and open upside. Many small, cheap experiments beat one big unprotected bet.'],
  ['Circle of competence', 'Know the boundary of what you genuinely understand. Expand it deliberately — that is what the wiki is for.'],
  ['Leverage', 'Capital, people, code and media multiply effort. Build assets that work while you sleep; use debt only with ample cover.'],
  ['Pareto', 'A few customers, ideas and investments drive most results. Find them, feed them, and prune the rest.'],
];
const models = () => `<div class="grid g3">${MODELS.map(([t, d]) => `<div class="model"><b>${esc(t)}</b><span class="small muted">${esc(d)}</span></div>`).join('')}</div>
  <p class="small muted mt">Ask Claude to expand any of these into a full wiki article with sources and worked examples from your own ventures.</p>`;

export default {
  title: 'Mastermind Lab',
  render(s, params) {
    tab = params[0] || 'calculators';
    return `<div class="page-head"><div><div class="eyebrow">Govern</div><h1>Mastermind Lab</h1><p>Mathematics is the language of wealth. Model every decision, size every bet, and measure your own judgement over time.</p></div></div>
    ${tabsHTML([['calculators', 'Calculators'], ['decisions', 'Decision journal'], ['models', 'Mental models']], tab)}
    ${tab === 'decisions' ? decisions(s) : tab === 'models' ? models() : calculators()}`;
  },
  actions: {
    ...crudActions,
    tab(el) { location.hash = `#/math/${el.dataset.tab}`; },
    calc(el) { const c = CALCS.find((x) => x.k === el.dataset.c); state[c.k][el.dataset.k] = el.value; document.getElementById(`out-${c.k}`).innerHTML = safeRun(c); },
  },
};
