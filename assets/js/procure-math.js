// Procurement mathematics. Pure functions — no DOM, no store.
// Money inputs are in a single currency per call unless stated; the views convert to the base currency first.

const n = (v) => { const x = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, '')); return Number.isFinite(x) ? x : 0; };
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const safeDiv = (a, b) => (b ? a / b : NaN);

// ---------- Incoterms 2020: who pays what ----------
// Columns: export clearance, origin handling, main carriage, insurance, destination handling, import duty & VAT, delivery to your door.
// S = seller, B = buyer. Check the ICC Incoterms 2020 rules and your contract: the named place and add-ons change this.
export const COST_STAGES = ['Export clearance', 'Origin handling', 'Main carriage', 'Insurance', 'Destination handling', 'Import duty & VAT', 'Delivery to your door'];
export const INCOTERMS = [
  { code: 'EXW', name: 'Ex Works', mode: 'Any', row: 'BBBBBBB', risk: 'Seller\'s premises', note: 'Cheapest headline price, most work for you. The buyer even handles export clearance, which is hard from China without a local agent.' },
  { code: 'FCA', name: 'Free Carrier', mode: 'Any', row: 'SSBBBBB', risk: 'Handover to your carrier', note: 'Seller clears export and hands goods to your forwarder. A good default when you control freight.' },
  { code: 'FAS', name: 'Free Alongside Ship', mode: 'Sea', row: 'SSBBBBB', risk: 'Alongside the ship', note: 'Bulk and break-bulk cargo. Rare for containers.' },
  { code: 'FOB', name: 'Free On Board', mode: 'Sea', row: 'SSBBBBB', risk: 'On board the vessel', note: 'Common for sea freight from China. Seller loads and clears export; you book the ship.' },
  { code: 'CFR', name: 'Cost and Freight', mode: 'Sea', row: 'SSSBBBB', risk: 'On board at origin', note: 'Seller pays sea freight but you carry the risk in transit, so insure it.' },
  { code: 'CIF', name: 'Cost, Insurance and Freight', mode: 'Sea', row: 'SSSSBBB', risk: 'On board at origin', note: 'Seller insures at a minimum level only. Risk still passes at origin.' },
  { code: 'CPT', name: 'Carriage Paid To', mode: 'Any', row: 'SSSBBBB', risk: 'Handover to first carrier', note: 'Like CFR for any transport mode.' },
  { code: 'CIP', name: 'Carriage and Insurance Paid To', mode: 'Any', row: 'SSSSBBB', risk: 'Handover to first carrier', note: 'Like CIF for any mode, with wider insurance cover in the 2020 rules.' },
  { code: 'DAP', name: 'Delivered at Place', mode: 'Any', row: 'SSSSBBS', risk: 'At the named place, ready to unload', note: 'Seller delivers to your door; you unload and clear import.' },
  { code: 'DPU', name: 'Delivered at Place Unloaded', mode: 'Any', row: 'SSSSSBS', risk: 'At the named place, unloaded', note: 'Seller also unloads. Replaced DAT in 2020.' },
  { code: 'DDP', name: 'Delivered Duty Paid', mode: 'Any', row: 'SSSSSSS', risk: 'At the named place, cleared for import', note: 'Highest price, least work. The seller is the importer, so check their duty and VAT handling is lawful and quote is all-in.' },
];

// ---------- Landed cost ----------
/**
 * Everything in one currency. `freight`, `insurance`, `origin`, `destination`, `inspection`, `other` are totals for the shipment.
 * Duty is charged on CIF value (goods + origin charges + freight + insurance). Import VAT is charged on CIF + duty and is excluded from
 * landed cost when recoverable, but included in `cashOut`.
 */
export function landedCost(p) {
  const goods = n(p.goods), qty = Math.max(1, n(p.qty));
  const cif = goods + n(p.origin) + n(p.freight) + n(p.insurance);
  const duty = cif * n(p.dutyRate);
  const vat = (cif + duty) * n(p.vatRate);
  const local = n(p.destination) + n(p.inspection) + n(p.other);
  const landed = cif + duty + local + (p.vatRecoverable ? 0 : vat);
  return {
    goods, cif, duty, vat, local, landed, cashOut: cif + duty + local + vat,
    perUnit: landed / qty, uplift: safeDiv(landed - goods, goods), goodsPerUnit: goods / qty,
  };
}

// ---------- Freight ----------
export const AIR_KG_PER_CBM = 167;      // IATA volumetric convention: 6,000 cm3 per kg
export const EXPRESS_KG_PER_CBM = 200;  // common express-courier convention: 5,000 cm3 per kg
export const chargeableKg = (weightKg, cbm, kgPerCbm = AIR_KG_PER_CBM) => Math.max(n(weightKg), n(cbm) * kgPerCbm);
/**
 * Compare transport modes on total cost of speed.
 * modes: [{name, basis: 'kg'|'wm'|'flat', rate, minCharge, kgPerCbm, days}]
 *  - 'kg': rate per chargeable kg (greater of actual and volumetric weight)
 *  - 'wm': rate per revenue tonne, the sea LCL convention: greater of CBM and metric tonnes
 *  - 'flat': rate for the whole shipment (for example a full container)
 * Holding cost is the interest on goods value while in transit.
 */
export function compareModes({ weightKg, cbm, goodsValue, capitalRate = 0.1, modes }) {
  const rows = modes.map((m) => {
    let units, cost;
    if (m.basis === 'wm') { units = Math.max(n(cbm), n(weightKg) / 1000); cost = units * n(m.rate); }
    else if (m.basis === 'flat') { units = 1; cost = n(m.rate); }
    else { units = chargeableKg(weightKg, cbm, m.kgPerCbm || AIR_KG_PER_CBM); cost = units * n(m.rate); }
    cost = Math.max(cost, n(m.minCharge));
    const holding = n(goodsValue) * n(capitalRate) * (n(m.days) / 365);
    return { ...m, units, freight: cost, holding, total: cost + holding, perKg: safeDiv(cost, n(weightKg)) };
  });
  const usable = rows.filter((r) => r.freight > 0);
  const cheapest = usable.length ? usable.reduce((a, b) => (b.total < a.total ? b : a)) : null;
  const fastest = usable.length ? usable.reduce((a, b) => (b.days < a.days ? b : a)) : null;
  return { rows, cheapest, fastest };
}

// ---------- Containers ----------
// Approximate internal dimensions and payloads of standard dry containers. Confirm with the carrier.
export const CONTAINERS = [
  { id: '20GP', name: "20' standard", vol: 33.2, payload: 28200 },
  { id: '40GP', name: "40' standard", vol: 67.7, payload: 26700 },
  { id: '40HC', name: "40' high cube", vol: 76.3, payload: 26500 },
];
/** How many cartons fit, and which limit binds: volume or weight. Dimensions in cm, weight in kg. */
export function containerFill({ l, w, h, cartonKg, unitsPerCarton = 1, container, fillPct = 0.85 }) {
  const c = CONTAINERS.find((x) => x.id === container) || CONTAINERS[1];
  const cartonCbm = (n(l) * n(w) * n(h)) / 1e6;
  if (cartonCbm <= 0 || n(cartonKg) <= 0) return { c, cartonCbm: 0, cartons: 0, units: 0, limit: '', cbm: 0, kg: 0, volUse: 0, weightUse: 0 };
  const byVolume = Math.floor((c.vol * fillPct) / cartonCbm);
  const byWeight = Math.floor(c.payload / n(cartonKg));
  const cartons = Math.min(byVolume, byWeight);
  return {
    c, cartonCbm, byVolume, byWeight, cartons, units: cartons * Math.max(1, n(unitsPerCarton)),
    limit: byVolume <= byWeight ? 'volume' : 'weight', cbm: cartons * cartonCbm, kg: cartons * n(cartonKg),
    volUse: (cartons * cartonCbm) / c.vol, weightUse: (cartons * n(cartonKg)) / c.payload,
  };
}

// ---------- Inventory: EOQ, safety stock, reorder point ----------
export const Z_SCORES = { 90: 1.2816, 95: 1.6449, 97.5: 1.96, 99: 2.3263, 99.5: 2.5758 };
/** D annual demand, S cost per order, c unit cost, h holding cost as a share of unit cost per year. */
export function eoq({ D, S, c, h }) {
  const H = n(c) * n(h);
  return H > 0 && n(D) > 0 && n(S) >= 0 ? Math.sqrt((2 * n(D) * n(S)) / H) : NaN;
}
export function inventoryPlan({ D, S, c, h, leadDays, sigmaDaily = 0, service = 95 }) {
  const Q = eoq({ D, S, c, h });
  const z = Z_SCORES[service] ?? Z_SCORES[95];
  const daily = n(D) / 365;
  const safety = z * n(sigmaDaily) * Math.sqrt(Math.max(0, n(leadDays)));
  const rop = daily * n(leadDays) + safety;
  const ordering = Number.isFinite(Q) && Q > 0 ? (n(D) / Q) * n(S) : NaN;
  const holding = Number.isFinite(Q) ? (Q / 2 + safety) * n(c) * n(h) : NaN;
  return { Q, z, daily, safety, rop, ordersPerYear: safeDiv(n(D), Q), cycleDays: safeDiv(365 * Q, n(D)), purchase: n(D) * n(c), ordering, holding, total: n(D) * n(c) + ordering + holding };
}

/**
 * Quantity-discount analysis. breaks: [{qty (minimum), price}] sorted ascending by qty.
 * For each tier the order quantity is the EOQ at that price, pushed into the tier's range; the tier with the lowest total annual cost wins.
 */
export function discountAnalysis({ D, S, h, breaks }) {
  const tiers = breaks.map((b) => ({ qty: n(b.qty), price: n(b.price) })).filter((b) => b.price > 0).sort((a, b) => a.qty - b.qty);
  const rows = tiers.map((t, i) => {
    const maxQ = i + 1 < tiers.length ? tiers[i + 1].qty - 1 : Infinity;
    let Q = eoq({ D, S, c: t.price, h });
    if (!Number.isFinite(Q)) Q = t.qty;
    Q = clamp(Q, Math.max(1, t.qty), maxQ);
    const purchase = n(D) * t.price, ordering = (n(D) / Q) * n(S), holding = (Q / 2) * t.price * n(h);
    return { ...t, Q, purchase, ordering, holding, total: purchase + ordering + holding };
  });
  const best = rows.length ? rows.reduce((a, b) => (b.total < a.total ? b : a)) : null;
  return { rows, best };
}

// ---------- Payment terms ----------
/** Annualised return from taking an early-payment discount such as 2/10 net 30. Rates as fractions. */
export const earlyPayReturn = ({ disc, discDays, netDays }) => (n(netDays) > n(discDays) && n(disc) < 1 ? (n(disc) / (1 - n(disc))) * (365 / (n(netDays) - n(discDays))) : NaN);
/** Cost of capital tied up in a deposit paid `days` before the goods ship, as a share of order value. */
export const depositCost = ({ depositPct, days, annualRate }) => n(depositPct) * n(annualRate) * (n(days) / 365);

// ---------- Make vs buy and should-cost ----------
export function makeVsBuy({ fixed, varCost, buyPrice, qty }) {
  const saving = n(buyPrice) - n(varCost);
  const breakeven = saving > 0 ? n(fixed) / saving : Infinity;
  return { breakeven, makeTotal: n(fixed) + n(varCost) * n(qty), buyTotal: n(buyPrice) * n(qty), prefer: n(qty) > breakeven ? 'make' : 'buy' };
}
/** What a product should cost: direct costs plus a fair margin. Compare to a quote to see negotiating headroom. */
export function shouldCost({ material, labour, overhead, marginPct, quote }) {
  const direct = n(material) + n(labour) + n(overhead);
  const should = direct * (1 + n(marginPct));
  return { direct, should, gap: n(quote) - should, gapPct: safeDiv(n(quote) - should, should), impliedMargin: safeDiv(n(quote) - direct, direct) };
}

// ---------- Quote comparison ----------
export const DEFAULT_WEIGHTS = { cost: 40, lead: 15, terms: 10, quality: 20, reliability: 15 };
export const CRITERIA = [['cost', 'Landed cost'], ['lead', 'Lead time'], ['terms', 'Payment terms'], ['quality', 'Quality'], ['reliability', 'Reliability']];
/**
 * Normalise quotes to a like-for-like landed cost and score them.
 * Each quote: {price, ccy, moq, leadDays, freightTotal, otherTotal, dutyRate?, depositPct, quality, reliability}
 * Freight and other costs are totals in the base currency. `convert(amount, ccy)` returns the base-currency value.
 */
export function evalQuotes(quotes, { qty, convert, dutyRate = 0.05, weights = DEFAULT_WEIGHTS, vatRate = 0, vatRecoverable = true }) {
  const rows = quotes.map((q) => {
    const goods = convert(n(q.price) * n(qty), q.ccy);
    const freight = n(q.freightTotal), other = n(q.otherTotal);
    const duty = (goods + freight) * (q.dutyRate === '' || q.dutyRate == null ? dutyRate : n(q.dutyRate));
    const vat = (goods + freight + duty) * vatRate;
    const landedTotal = goods + freight + duty + other + (vatRecoverable ? 0 : vat);
    return { q, goods, freight, other, duty, landedTotal, landedUnit: landedTotal / Math.max(1, n(qty)), moqShort: n(q.moq) > n(qty) };
  });
  const minLanded = Math.min(...rows.map((r) => r.landedTotal).filter((x) => x > 0));
  const leads = rows.map((r) => n(r.q.leadDays)).filter((x) => x > 0);
  const minLead = leads.length ? Math.min(...leads) : 0;
  const W = { ...DEFAULT_WEIGHTS, ...weights };
  const wsum = Object.values(W).reduce((t, x) => t + n(x), 0) || 1;
  rows.forEach((r) => {
    const s = {
      cost: r.landedTotal > 0 && Number.isFinite(minLanded) ? (10 * minLanded) / r.landedTotal : 0,
      lead: n(r.q.leadDays) > 0 && minLead ? (10 * minLead) / n(r.q.leadDays) : 5,
      terms: clamp(10 - n(r.q.depositPct) / 10, 0, 10),
      quality: r.q.quality === '' || r.q.quality == null ? 5 : clamp(n(r.q.quality), 0, 10),
      reliability: r.q.reliability === '' || r.q.reliability == null ? 5 : clamp(n(r.q.reliability), 0, 10),
    };
    r.scores = s;
    r.total = Math.round((Object.keys(W).reduce((t, k) => t + n(W[k]) * s[k], 0) / wsum) * 10);
  });
  const ranked = rows.slice().sort((a, b) => b.total - a.total);
  ranked.forEach((r, i) => { r.rank = i + 1; });
  return { rows, ranked, cheapest: rows.slice().filter((r) => r.landedTotal > 0).sort((a, b) => a.landedTotal - b.landedTotal)[0] || null, best: ranked[0] || null };
}

/** Plain-language levers to negotiate with, based on the comparison. */
export function negotiationLevers(evald, { qty, target, name = (r) => r.q.supplierName || 'supplier' }) {
  const out = [];
  if (!evald.rows.length) return out;
  const cheap = evald.cheapest, best = evald.best;
  if (cheap && best && cheap !== best) out.push(`The best overall offer (${name(best)}) is ${Math.round(((best.landedTotal - cheap.landedTotal) / cheap.landedTotal) * 100)}% dearer than the cheapest (${name(cheap)}). Ask ${name(best)} to close the gap, or ask ${name(cheap)} for stronger quality evidence.`);
  evald.rows.forEach((r) => {
    if (cheap && r !== cheap && r !== best && r.landedTotal > cheap.landedTotal * 1.1) out.push(`${name(r)} is ${Math.round(((r.landedTotal - cheap.landedTotal) / cheap.landedTotal) * 100)}% above the cheapest landed cost: ask for a revised price referencing a competing quote.`);
    if (n(r.q.depositPct) > 30) out.push(`${name(r)} wants a ${n(r.q.depositPct)}% deposit: negotiate 30% with the balance after inspection, or pay by escrow.`);
    if (r.moqShort) out.push(`${name(r)} has a minimum order of ${n(r.q.moq)} against your ${n(qty)}: ask for a trial order at your quantity, or consolidate with another item.`);
    if (r.q.validUntil) { const d = (new Date(r.q.validUntil) - new Date()) / 86400000; if (d >= 0 && d <= 7) out.push(`${name(r)}'s quote expires in ${Math.ceil(d)} day(s): decide or ask for an extension.`); if (d < 0) out.push(`${name(r)}'s quote has expired: reconfirm the price.`); }
  });
  if (target > 0 && cheap && cheap.landedUnit > target) out.push(`Even the cheapest landed price is above your target of ${target.toFixed(2)} per unit: renegotiate, change the specification, or change the source.`);
  return out;
}

// ---------- Price history ----------
/** log: [{date, price}] in one currency (convert first). */
export function priceStats(log) {
  const a = log.filter((x) => n(x.price) > 0).sort((x, y) => String(x.date).localeCompare(String(y.date)));
  if (!a.length) return { n: 0 };
  const ps = a.map((x) => n(x.price));
  const avg = ps.reduce((t, x) => t + x, 0) / ps.length;
  const sd = Math.sqrt(ps.reduce((t, x) => t + (x - avg) ** 2, 0) / ps.length);
  const last = ps[ps.length - 1], prev = ps.length > 1 ? ps[ps.length - 2] : NaN;
  return { n: ps.length, min: Math.min(...ps), max: Math.max(...ps), avg, last, prev, changePct: Number.isFinite(prev) ? (last - prev) / prev : NaN, vsAvg: (last - avg) / avg, volatility: avg ? sd / avg : 0, first: ps[0], sinceFirst: (last - ps[0]) / ps[0] };
}

// ---------- Supplier performance ----------
/** orders: POs for one supplier, each {status, eta, receivedDate, quality, valueBase}. */
export function supplierStats(orders, todayIso) {
  const done = orders.filter((o) => ['Received', 'Closed'].includes(o.status));
  const withDates = done.filter((o) => o.eta && o.receivedDate);
  const onTime = withDates.filter((o) => o.receivedDate <= o.eta).length;
  const rated = done.filter((o) => o.quality !== '' && o.quality != null);
  const open = orders.filter((o) => !['Received', 'Closed', 'Cancelled', 'Draft'].includes(o.status));
  return {
    orders: orders.filter((o) => o.status !== 'Cancelled').length, received: done.length, spend: orders.filter((o) => o.status !== 'Cancelled').reduce((t, o) => t + n(o.valueBase), 0),
    onTimePct: withDates.length ? onTime / withDates.length : NaN, quality: rated.length ? rated.reduce((t, o) => t + n(o.quality), 0) / rated.length : NaN,
    lateOpen: open.filter((o) => o.eta && o.eta < todayIso).length, openCount: open.length,
  };
}
