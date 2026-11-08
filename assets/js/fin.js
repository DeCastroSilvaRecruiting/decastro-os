// Financial mathematics library. Pure functions, no DOM.
// Rates are decimals (0.08 = 8%) unless noted.

/** Future value with periodic contributions. */
export function futureValue({ pv = 0, rate = 0, years = 0, contrib = 0, perYear = 12, contribAtStart = false }) {
  const r = rate / perYear, n = Math.round(years * perYear);
  const series = [];
  let bal = pv, invested = pv;
  for (let i = 1; i <= n; i++) {
    if (contribAtStart) { bal += contrib; invested += contrib; }
    bal *= 1 + r;
    if (!contribAtStart) { bal += contrib; invested += contrib; }
    if (i % perYear === 0) series.push({ year: i / perYear, balance: bal, invested });
  }
  return { fv: bal, invested, growth: bal - invested, series };
}

export const cagr = (start, end, years) => (start > 0 && years > 0 ? Math.pow(end / start, 1 / years) - 1 : NaN);
export const rule72 = (ratePct) => (ratePct > 0 ? 72 / ratePct : NaN);
export const exactDoubling = (rate) => (rate > 0 ? Math.log(2) / Math.log(1 + rate) : NaN);

/** Net present value; flows[0] occurs at t=0. */
export const npv = (rate, flows) => flows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);

/** Internal rate of return. Newton-Raphson with bisection fallback. */
export function irr(flows, guess = 0.1) {
  if (!flows.some((f) => f > 0) || !flows.some((f) => f < 0)) return NaN;
  let r = guess;
  for (let i = 0; i < 100; i++) {
    let f = 0, df = 0;
    for (let t = 0; t < flows.length; t++) { const d = Math.pow(1 + r, t); f += flows[t] / d; df -= (t * flows[t]) / (d * (1 + r)); }
    if (Math.abs(f) < 1e-9) return r;
    if (df === 0) break;
    const nr = r - f / df;
    if (!Number.isFinite(nr) || nr <= -0.9999) break;
    if (Math.abs(nr - r) < 1e-10) return nr;
    r = nr;
  }
  let lo = -0.9999, hi = 10, flo = npv(lo, flows);
  if (flo * npv(hi, flows) > 0) return NaN;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2, fm = npv(mid, flows);
    if (Math.abs(fm) < 1e-9) return mid;
    if (flo * fm < 0) hi = mid; else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

/** Payback period in periods (fractional), NaN if never. */
export function payback(flows) {
  let cum = 0;
  for (let t = 0; t < flows.length; t++) {
    const prev = cum; cum += flows[t];
    if (t > 0 && prev < 0 && cum >= 0) return t - 1 + -prev / flows[t];
  }
  return NaN;
}

/** Level payment for an amortising loan. rate = annual, years, perYear periods. */
export function payment(principal, rate, years, perYear = 12) {
  const r = rate / perYear, n = Math.round(years * perYear);
  if (n <= 0) return NaN;
  return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
}
export function amortization(principal, rate, years, perYear = 12) {
  const pmt = payment(principal, rate, years, perYear), r = rate / perYear, n = Math.round(years * perYear);
  let bal = principal, totalInterest = 0; const yearly = [];
  let yI = 0, yP = 0;
  for (let i = 1; i <= n; i++) {
    const int = bal * r, prin = Math.min(pmt - int, bal);
    bal -= prin; totalInterest += int; yI += int; yP += prin;
    if (i % perYear === 0 || i === n) { yearly.push({ year: Math.ceil(i / perYear), interest: yI, principal: yP, balance: Math.max(bal, 0) }); yI = 0; yP = 0; }
  }
  return { payment: pmt, totalInterest, totalPaid: pmt * n, yearly };
}

/** Kelly criterion: p = win probability, b = net odds (win b per 1 staked), q loss fraction of stake (default 1). */
export function kelly(p, b, lossFrac = 1) {
  if (b <= 0) return NaN;
  return p / lossFrac - (1 - p) / b;
}

/** Expected value of outcomes [{p, v}] with probabilities that should sum to 1. */
export function expectedValue(outcomes) {
  const ps = outcomes.reduce((s, o) => s + o.p, 0);
  const ev = outcomes.reduce((s, o) => s + o.p * o.v, 0);
  const variance = outcomes.reduce((s, o) => s + o.p * Math.pow(o.v - ev, 2), 0);
  return { ev, sd: Math.sqrt(variance), pSum: ps, pLoss: outcomes.filter((o) => o.v < 0).reduce((s, o) => s + o.p, 0) };
}

export function breakEven(fixed, price, varCost) {
  const cm = price - varCost;
  return cm > 0 ? { units: fixed / cm, revenue: (fixed / cm) * price, cmRatio: cm / price, cm } : { units: NaN, revenue: NaN, cmRatio: NaN, cm };
}

/** Simple DCF: base FCF grows at g for N years, then Gordon terminal value. */
export function dcf({ fcf, growth, discount, terminalGrowth, years = 5, netDebt = 0, shares = 1 }) {
  const rows = []; let pv = 0, f = fcf;
  for (let t = 1; t <= years; t++) { f *= 1 + growth; const d = f / Math.pow(1 + discount, t); pv += d; rows.push({ t, fcf: f, pv: d }); }
  const tv = discount > terminalGrowth ? (f * (1 + terminalGrowth)) / (discount - terminalGrowth) : NaN;
  const pvTv = tv / Math.pow(1 + discount, years);
  const ev = pv + pvTv, equity = ev - netDebt;
  return { rows, pvFcf: pv, tv, pvTv, ev, equity, perShare: equity / (shares || 1), tvShare: pvTv / ev };
}

/** Unit economics. churn = monthly churn decimal, or lifetimeMonths given directly. */
export function unitEconomics({ price = 0, cogs = 0, cac = 0, lifetimeMonths = 12, purchasesPerMonth = 1 }) {
  const margin = price - cogs;
  const monthly = margin * purchasesPerMonth;
  const ltv = monthly * lifetimeMonths;
  return { margin, marginPct: price ? margin / price : NaN, ltv, ltvCac: cac ? ltv / cac : NaN, paybackMonths: monthly > 0 ? cac / monthly : NaN };
}

/** Property metrics. All annual unless stated. */
export function propertyMetrics(p) {
  const value = +p.currentValue || +p.purchasePrice || 0;
  const rentY = (+p.monthlyRent || 0) * 12 * ((p.occupancy === '' || p.occupancy == null ? 100 : +p.occupancy) / 100);
  const costsY = +p.annualCosts || 0;
  const debtY = (+p.monthlyPayment || 0) * 12;
  const noi = rentY - costsY;
  const cashFlowY = noi - debtY;
  const mortgage = +p.mortgageBalance || 0;
  const invested = +p.cashInvested || 0;
  return {
    value, equity: value - mortgage, ltv: value ? mortgage / value : NaN,
    grossYield: value ? ((+p.monthlyRent || 0) * 12) / value : NaN,
    netYield: value ? noi / value : NaN, noi, capRate: +p.purchasePrice ? noi / +p.purchasePrice : NaN,
    cashFlowY, cashFlowM: cashFlowY / 12, coc: invested ? cashFlowY / invested : NaN,
    dscr: debtY ? noi / debtY : NaN, gain: value - (+p.purchasePrice || value),
  };
}

/** Brier score for a set of forecasts [{p (0-1), o (0|1)}]. Lower is better; 0.25 = coin flip. */
export function brier(forecasts) {
  if (!forecasts.length) return NaN;
  return forecasts.reduce((s, f) => s + Math.pow(f.p - f.o, 2), 0) / forecasts.length;
}

/** Parse "a, b, c" or newline lists into numbers. */
export const parseFlows = (s) => String(s).split(/[,\n;]+/).map((x) => parseFloat(x.replace(/[^\d.\-eE]/g, ''))).filter(Number.isFinite);
