// E-commerce mathematics for the China-to-Amazon store. Pure functions — no DOM, no store.
// Every monetary input is in the BASE currency (the view converts supplier prices first).
// Fee defaults are starting points only: Amazon changes them, so the UI labels them "verify".

export const AMAZON_AE = {
  asOf: 'July 2026',
  vat: 0.05,
  duty: 0.05,
  storagePerCuFtMonth: 2, // AED, standard-size
  referral: [
    { cat: 'Home, kitchen, apparel, shoes, luggage, books', pct: 0.15 },
    { cat: 'Most other categories (sports & outdoors, tools, toys, office)', pct: 0.10 },
    { cat: 'Beauty, health, baby, pet (above AED 50)', pct: 0.15 },
    { cat: 'Electronics & accessories', pct: 0.07 },
    { cat: 'Computers & major appliances', pct: 0.06 },
  ],
  fba: 'AED 5.5 (small envelope) to about AED 7.2–19.5 for standard size up to 12 kg; oversize AED 10.5–39.5',
};

const n = (v) => { const x = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, '')); return Number.isFinite(x) ? x : 0; };
const safe = (a, b) => (b ? a / b : NaN);

/**
 * Per-unit economics of one product on Amazon.
 * p: { price (shelf price, VAT-inclusive if the market shows VAT-inclusive prices), unitCost, freightUnit, qcUnit,
 *      dutyRate, vatRate, vatRegistered, referralPct, fbaFee, cubicFt, storageMonths, returnRate, acos, otherUnit, qty, salesPerMonth }
 */
export function amazonEconomics(p) {
  const vatRate = p.vatRate ?? 0.05;
  const dutyRate = p.dutyRate ?? 0.05;
  const price = n(p.price);
  const cost = n(p.unitCost), freight = n(p.freightUnit), qc = n(p.qcUnit);
  const cif = cost + freight;
  const duty = cif * dutyRate;
  const importVat = (cif + duty) * vatRate;
  const vatReg = !!p.vatRegistered;
  const landed = cost + freight + qc + duty + (vatReg ? 0 : importVat);
  const netRevenue = vatReg ? price / (1 + vatRate) : price;
  const referral = price * n(p.referralPct);
  const fba = n(p.fbaFee);
  const storage = n(p.cubicFt) * n(p.storageMonths) * (p.storageRate ?? AMAZON_AE.storagePerCuFtMonth);
  const returns = n(p.returnRate) * (fba + landed * 0.5); // refunded units: lose the return-handling fee and half the stock value
  const other = n(p.otherUnit);
  const ppc = price * n(p.acos);
  const contribution = netRevenue - landed - referral - fba - storage - returns - other; // before advertising
  const profit = contribution - ppc;
  const complete = price > 0 && cost > 0 && fba > 0 && n(p.referralPct) > 0 && freight > 0;
  const qty = n(p.qty), sales = n(p.salesPerMonth);
  const firstOrder = qty * landed + (vatReg ? qty * importVat : 0); // import VAT is recoverable but must be paid up front
  const monthlyProfit = sales * profit;
  return {
    landed, duty, importVat, netRevenue, referral, fba, storage, returns, other, ppc, contribution, profit,
    margin: safe(profit, netRevenue),                 // profit as share of net revenue
    roi: safe(profit, landed),                        // profit per AED of stock
    breakevenAcos: safe(contribution, price),         // highest ad spend share that still breaks even
    priceMultiple: safe(netRevenue, landed),          // net revenue / landed cost (rule of thumb: 3x or more)
    firstOrder, monthlyProfit,
    paybackMonths: monthlyProfit > 0 ? firstOrder / monthlyProfit : Infinity,
    daysOfStock: sales > 0 ? (qty / sales) * 30 : NaN,
    complete,
  };
}

export function verdict(e) {
  if (!e.complete) return { label: 'Incomplete', tone: '', why: 'Enter price, supplier cost, freight, referral % and FBA fee to see a real result.' };
  if (e.profit <= 0) return { label: 'Loses money', tone: 'red', why: 'Negative profit after fees and advertising. Re-price, re-source or drop it.' };
  if (e.margin >= 0.25 && e.roi >= 1 && e.priceMultiple >= 3) return { label: 'Strong', tone: 'green', why: 'Margin, return on stock and price-to-cost multiple all clear the usual bars.' };
  if (e.margin >= 0.15 && e.roi >= 0.5) return { label: 'Workable', tone: 'gold', why: 'Profitable, but advertising or a price cut could erase it. Test small.' };
  return { label: 'Thin', tone: 'red', why: 'Margin is too thin to survive returns, price wars and ad costs.' };
}

// ---------- Opportunity scorecard ----------
export const PRODUCT_RUBRIC = [
  { k: 'demand', label: 'Proven demand', w: 18, hint: 'Steady sales for several competing listings, not one viral spike' },
  { k: 'competition', label: 'Beatable competition', w: 16, hint: '10 = top listings have weak images, few reviews or poor ratings' },
  { k: 'margin', label: 'Margin headroom', w: 16, hint: 'From the calculator: strong net margin after fees and ads' },
  { k: 'simple', label: 'Simple to ship & support', w: 14, hint: 'Small, light, durable, no sizes, no assembly, low return rate' },
  { k: 'edge', label: 'Room to differentiate', w: 12, hint: 'Better bundle, material, design or packaging you can specify to the factory' },
  { k: 'year', label: 'Year-round demand', w: 8, hint: 'Low seasonality; Ramadan, back-to-school and winter swings noted' },
  { k: 'repeat', label: 'Repeat or add-on potential', w: 8, hint: 'Consumable, refillable or a family of related products' },
  { k: 'cert', label: 'Compliance ease', w: 8, hint: '10 = no safety certification, battery, children or cosmetics rules' },
];
export const KILL_FLAGS = [
  { k: 'ip', label: 'Branded, patented or design-protected', why: 'IP complaints get listings and accounts suspended.' },
  { k: 'gated', label: 'Gated or restricted category', why: 'Needs Amazon approval or documents you may not obtain.' },
  { k: 'safety', label: 'Needs safety certification', why: 'Lithium batteries, electrical, children\'s, cosmetics, food-contact: cost and liability.' },
  { k: 'fragile', label: 'Fragile, oversize or heavy', why: 'Breakage, returns and FBA fees erase the margin.' },
  { k: 'seasonal', label: 'One-season product', why: 'Dead stock after the season ties up cash.' },
];
export function productScore(p) {
  const s = p.scores || {};
  const total = Math.round(PRODUCT_RUBRIC.reduce((t, r) => t + (n(s[r.k]) / 10) * r.w, 0));
  const flags = KILL_FLAGS.filter((f) => (p.flags || {})[f.k]);
  return { total, flags, killed: flags.length > 0 };
}

// ---------- Portfolio simulation (expected value per launch) ----------
/**
 * Month-by-month cash simulation for a launch programme.
 * a: { months, launchEvery (months between launches), launches (max), firstOrderCost, launchAds, hitRate, unitsPerMonth (for a hit at maturity),
 *      contributionUnit (cash per unit sold before COGS: net revenue - fees - ads), landedUnit, rampMonths, leadMonths, flopRecovery (0-1 of first-order cost recovered), overhead (monthly fixed costs), reinvest (0-1) }
 */
export function simulate(a) {
  const months = a.months || 24;
  const rows = []; let cash = 0, minCash = 0, cumProfit = 0;
  const launches = [];
  for (let m = 1; m <= months; m++) {
    if ((m - 1) % Math.max(1, a.launchEvery) === 0 && launches.length < a.launches) launches.push(m);
  }
  const unitsAt = (launchM, m) => {
    const t = m - launchM - a.leadMonths;
    if (t < 0) return 0;
    const ramp = Math.min(1, (t + 1) / Math.max(1, a.rampMonths));
    return a.hitRate * a.unitsPerMonth * ramp;
  };
  for (let m = 1; m <= months; m++) {
    let units = 0, buyUnits = 0, launchCost = 0;
    for (const L of launches) {
      units += unitsAt(L, m);
      buyUnits += unitsAt(L, m + a.leadMonths); // stock is bought `leadMonths` before it sells
      if (L === m) launchCost += a.launchAds + (1 - a.hitRate) * a.firstOrderCost * (1 - a.flopRecovery);
    }
    const cashIn = units * a.contributionUnit;
    const net = cashIn - buyUnits * a.landedUnit - launchCost - a.overhead;
    const profit = units * (a.contributionUnit - a.landedUnit) - launchCost - a.overhead;
    cash += net; cumProfit += profit;
    minCash = Math.min(minCash, cash);
    rows.push({ m, units, profit, net, cash, cumProfit });
  }
  return { rows, capitalNeeded: -minCash, breakEvenMonth: (rows.find((r) => r.cumProfit > 0) || {}).m || null, endMonthlyProfit: rows[rows.length - 1].profit };
}
