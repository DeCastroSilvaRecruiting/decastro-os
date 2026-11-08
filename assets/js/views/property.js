import * as store from '../store.js';
import { esc, icon, money, compact, pct, fnum, tableHTML, tabsHTML, num } from '../ui.js';
import { crudActions, crudRows } from '../schemas.js';
import { propertyMetrics, payment, irr } from '../fin.js';

let tab = 'portfolio';

function portfolioTab(s) {
  const b = store.base();
  const rows = s.properties.map((p) => ({ ...p, m: propertyMetrics(p) }));
  const owned = rows.filter((r) => r.status !== 'Target');
  const T = (f) => owned.reduce((t, r) => t + store.toBase(f(r), r.ccy), 0);
  const value = T((r) => r.m.value), debt = T((r) => num(r.mortgageBalance)), noi = T((r) => r.m.noi), cf = T((r) => r.m.cashFlowY), inv = T((r) => num(r.cashInvested));
  return `
  <div class="grid g4">
    <div class="card kpi hero"><div class="label">Portfolio value</div><div class="value gold">${compact(value, b)}</div><div class="delta">${owned.length} properties</div></div>
    <div class="card kpi"><div class="label">Equity</div><div class="value">${compact(value - debt, b)}</div><div class="delta">LTV ${value ? pct(debt / value) : '—'}</div></div>
    <div class="card kpi"><div class="label">Net operating income</div><div class="value">${compact(noi, b)}</div><div class="delta">Net yield ${value ? pct(noi / value) : '—'}</div></div>
    <div class="card kpi"><div class="label">Cash flow / year</div><div class="value ${cf >= 0 ? 'pos' : 'neg'}">${compact(cf, b)}</div><div class="delta">Cash-on-cash ${inv ? pct(cf / inv) : '—'}</div></div>
  </div>
  <div class="card flush mt"><div class="card-head"><h3>Properties</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="properties" data-defaults='{"status":"Owned","occupancy":100}'>${icon('plus')} Property</button></div></div>
    ${crudRows(tableHTML([
      { k: 'name', label: 'Property', fmt: (r) => `<b>${esc(r.name)}</b><div class="small muted">${esc([r.type, r.location].filter(Boolean).join(' · '))}</div>` },
      { k: 'status', label: 'Status', fmt: (r) => `<span class="badge ${r.status === 'Owned' ? 'green' : r.status === 'Target' ? 'violet' : 'blue'}">${esc(r.status)}</span>` },
      { k: 'value', label: 'Value', num: true, fmt: (r) => money(r.m.value, r.ccy) },
      { k: 'equity', label: 'Equity', num: true, fmt: (r) => money(r.m.equity, r.ccy) },
      { k: 'ltv', label: 'LTV', num: true, fmt: (r) => pct(r.m.ltv, 0) },
      { k: 'gy', label: 'Gross yld', num: true, fmt: (r) => pct(r.m.grossYield) },
      { k: 'ny', label: 'Net yld', num: true, fmt: (r) => pct(r.m.netYield) },
      { k: 'cf', label: 'Cash flow /mo', num: true, fmt: (r) => `<span class="${r.m.cashFlowM >= 0 ? 'pos' : 'neg'}">${money(r.m.cashFlowM, r.ccy)}</span>` },
      { k: 'coc', label: 'CoC', num: true, fmt: (r) => pct(r.m.coc) },
      { k: 'dscr', label: 'DSCR', num: true, fmt: (r) => (Number.isFinite(r.m.dscr) ? fnum(r.m.dscr, 2) + 'x' : '—') },
    ], rows, { act: 'crudEdit', empty: 'Add properties you own, have bought off-plan, or are targeting. Targets are tracked but excluded from net worth.' }), 'properties')}
  </div>
  <div class="card mt"><div class="card-head"><h3>Reading the numbers</h3></div><div class="grid g3 small">
    <div><b>Gross vs net yield</b><div class="muted">Annual rent ÷ value, before and after service charges, maintenance, management and vacancy. Net is what you actually earn.</div></div>
    <div><b>Cash-on-cash</b><div class="muted">Annual cash flow after debt service ÷ the cash you actually put in. The return on <i>your</i> money.</div></div>
    <div><b>DSCR</b><div class="muted">NOI ÷ annual debt payments. Below 1.0x the property needs feeding every month; lenders typically like 1.2x+.</div></div>
  </div></div>`;
}

const D = { price: 1500000, dldPct: 4, agentPct: 2, otherFees: 15000, ltvPct: 75, rate: 4.5, years: 25, rent: 110000, vacancyPct: 5, serviceCharge: 18000, otherCosts: 6000, growth: 3, hold: 7, sellPct: 2 };
let deal = { ...D };

function dealCalc(d) {
  const price = num(d.price), loan = price * num(d.ltvPct) / 100;
  const fees = price * (num(d.dldPct) + num(d.agentPct)) / 100 + num(d.otherFees);
  const cashIn = price - loan + fees;
  const pmtY = loan ? payment(loan, num(d.rate) / 100, num(d.years)) * 12 : 0;
  const effRent = num(d.rent) * (1 - num(d.vacancyPct) / 100);
  const noi = effRent - num(d.serviceCharge) - num(d.otherCosts);
  const cf = noi - pmtY;
  // IRR over hold period: annual cash flows + sale proceeds net of remaining loan
  const r = num(d.rate) / 100 / 12, n = num(d.years) * 12, k = Math.min(num(d.hold) * 12, n);
  const pm = loan ? payment(loan, num(d.rate) / 100, num(d.years)) : 0;
  const balAfter = loan ? (r === 0 ? loan - pm * k : loan * Math.pow(1 + r, k) - pm * ((Math.pow(1 + r, k) - 1) / r)) : 0;
  const saleValue = price * Math.pow(1 + num(d.growth) / 100, num(d.hold));
  const flows = [-cashIn];
  for (let y = 1; y <= num(d.hold); y++) {
    const g = Math.pow(1 + num(d.growth) / 100, y - 1);
    let f = effRent * g - (num(d.serviceCharge) + num(d.otherCosts)) * g - pmtY;
    if (y === num(d.hold)) f += saleValue * (1 - num(d.sellPct) / 100) - Math.max(balAfter, 0);
    flows.push(f);
  }
  return { loan, fees, cashIn, pmtY, noi, cf, grossYield: num(d.rent) / price, netYield: noi / price, coc: cf / cashIn, dscr: pmtY ? noi / pmtY : NaN, irr: irr(flows), saleValue, equityAtExit: saleValue - Math.max(balAfter, 0), breakEvenRent: (num(d.serviceCharge) + num(d.otherCosts) + pmtY) / (1 - num(d.vacancyPct) / 100) };
}

function dealTab() {
  const b = store.base();
  const F = (k, l, step = 'any') => `<div class="field"><label>${l}</label><input type="number" step="${step}" value="${deal[k]}" data-input="deal" data-k="${k}"></div>`;
  return `<div class="grid g-main">
    <div class="card"><div class="card-head"><h3>Deal analyser</h3><div class="right"><button class="btn sm ghost" data-act="resetDeal">Reset</button></div></div>
      <div class="form">
        ${F('price', `Purchase price (${b})`)}${F('ltvPct', 'Loan-to-value %')}${F('dldPct', 'Land Dept transfer fee %', '0.1')}${F('agentPct', 'Agent fee %', '0.1')}
        ${F('otherFees', 'Other fees (mortgage reg., trustee, valuation)')}${F('rate', 'Mortgage rate %', '0.05')}${F('years', 'Mortgage term (years)', '1')}
        ${F('rent', 'Annual rent')}${F('vacancyPct', 'Vacancy %')}${F('serviceCharge', 'Annual service charge')}${F('otherCosts', 'Other annual costs')}
        ${F('growth', 'Price & rent growth % p.a.', '0.1')}${F('hold', 'Hold period (years)', '1')}${F('sellPct', 'Selling costs %', '0.1')}
      </div>
      <p class="small muted">Fee defaults are illustrative starting points — confirm current fees with the Dubai Land Department or your agent. Ask Claude to verify them in the wiki.</p>
    </div>
    <div class="card" id="deal-out">${dealOut()}</div>
  </div>`;
}
function dealOut() {
  const b = store.base(), r = dealCalc(deal);
  const O = (l, v, cls = '') => `<div class="o"><div class="l">${l}</div><div class="v ${cls}">${v}</div></div>`;
  const verdict = r.cf < 0 ? ['red', 'Negative cash flow: you would fund this every month. Only works as a pure capital-growth bet.'] : r.dscr < 1.2 ? ['gold', 'Thin debt cover. Stress-test a rate rise and a vacancy before committing.'] : ['', 'Cash-flow positive with reasonable debt cover. Now verify rent and growth assumptions against DLD/RERA data.'];
  return `<div class="card-head"><h3>Result</h3></div>
    <div class="calc-out" style="margin-top:0">
      ${O('Cash required', compact(r.cashIn, b))}${O('Loan', compact(r.loan, b))}${O('Gross yield', pct(r.grossYield))}${O('Net yield', pct(r.netYield))}
      ${O('Cash flow / yr', compact(r.cf, b), r.cf >= 0 ? 'pos' : 'neg')}${O('Cash-on-cash', pct(r.coc))}${O('DSCR', Number.isFinite(r.dscr) ? fnum(r.dscr, 2) + 'x' : '—')}${O('IRR (hold)', pct(r.irr))}
      ${O('Exit value', compact(r.saleValue, b))}${O('Break-even rent', compact(r.breakEvenRent, b))}
    </div>
    <div class="callout ${verdict[0]} small mt">${verdict[1]}</div>
    <button class="btn sm mt" data-act="saveTarget">${icon('plus')} Save as target property</button>`;
}

export default {
  title: 'Property',
  render(s, params) {
    tab = params[0] || 'portfolio';
    return `<div class="page-head"><div><div class="eyebrow">Wealth</div><h1>Property Portfolio</h1><p>Every property judged on the same metrics: yield, cash-on-cash, debt cover and IRR. Buy on numbers, not on feeling.</p></div></div>
    ${tabsHTML([['portfolio', 'Portfolio'], ['deal', 'Deal analyser']], tab)}${tab === 'deal' ? dealTab() : portfolioTab(s)}`;
  },
  actions: {
    ...crudActions,
    tab(el) { location.hash = `#/property/${el.dataset.tab}`; },
    deal(el) { deal[el.dataset.k] = el.value; document.getElementById('deal-out').innerHTML = dealOut(); },
    resetDeal() { deal = { ...D }; store.update(() => {}); },
    saveTarget() {
      const r = dealCalc(deal);
      store.upsert('properties', { id: 'pr_' + Date.now().toString(36), name: 'Target deal', status: 'Target', ccy: store.base(), purchasePrice: num(deal.price), currentValue: num(deal.price), cashInvested: Math.round(r.cashIn), mortgageBalance: Math.round(r.loan), mortgageRate: num(deal.rate), monthlyPayment: Math.round(r.pmtY / 12), monthlyRent: Math.round(num(deal.rent) / 12), occupancy: 100 - num(deal.vacancyPct), annualCosts: num(deal.serviceCharge) + num(deal.otherCosts) });
      location.hash = '#/property/portfolio';
    },
  },
};
