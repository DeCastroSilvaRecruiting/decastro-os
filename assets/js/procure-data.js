// Procurement: shared constants and data helpers (no DOM). Used by the Procurement views and the venture page.
import * as store from './store.js';
import * as M from './procure-math.js';
import { num, today, daysUntil } from './ui.js';

export const UNITS = ['unit', 'pair', 'set', 'kg', 'metre', 'm²', 'litre', 'carton', 'pallet', 'container', 'hour', 'day', 'event'];
export const PO_STATUS = ['Draft', 'Sent', 'Confirmed', 'In production', 'Shipped', 'Customs', 'Received', 'Closed', 'Cancelled'];
export const OPEN_PO = ['Sent', 'Confirmed', 'In production', 'Shipped', 'Customs'];
export const RFQ_STATUS = ['Draft', 'Open', 'Comparing', 'Awarded', 'Cancelled'];
export const OPEN_RFQ = ['Draft', 'Open', 'Comparing'];
export const SUP_CATS = ['Raw materials', 'Components', 'Finished goods', 'Equipment', 'Packaging', 'Services', 'Freight & logistics', 'Events & hospitality', 'Other'];
export const PRICE_SOURCES = ['Supplier quote', 'Invoice', 'Catalogue or website', 'Market benchmark', 'Awarded quote'];
export const INCOTERM_CODES = M.INCOTERMS.map((t) => t.code);
export const poTone = { Draft: '', Sent: 'blue', Confirmed: 'blue', 'In production': 'violet', Shipped: 'gold', Customs: 'gold', Received: 'green', Closed: 'green', Cancelled: 'red' };
export const rfqTone = { Draft: '', Open: 'blue', Comparing: 'gold', Awarded: 'green', Cancelled: 'red' };

export const P = (s) => s.settings.procure;
export const ventureName = (s, id) => s.ventures.find((v) => v.id === id)?.name || 'Shared';
export const supName = (s, id, fallback) => s.suppliers.find((x) => x.id === id)?.name || fallback || '—';
export const itemById = (s, id) => s.catalog.find((i) => i.id === id);
export const itemName = (s, id, fallback) => itemById(s, id)?.name || fallback || '—';
export const ventureOpts = (s) => [{ v: '', l: 'Shared / not tied to a venture' }, ...s.ventures.map((v) => ({ v: v.id, l: v.name }))];
export const supplierOpts = (s) => [{ v: '', l: 'Not chosen' }, ...s.suppliers.map((x) => ({ v: x.id, l: x.name }))];
export const itemOpts = (s) => [{ v: '', l: 'Not in the catalogue' }, ...s.catalog.map((i) => ({ v: i.id, l: i.name }))];

// ----- Orders -----
export const goodsCcy = (o) => (o.lines || []).reduce((t, l) => t + num(l.qty) * num(l.unitPrice), 0);
export const goodsBase = (o) => store.toBase(goodsCcy(o), o.ccy || store.base());
/** Landed cost excluding VAT: goods + freight + duty + other (extras are entered in the base currency). */
export const orderCost = (o) => goodsBase(o) + num(o.freight) + num(o.duty) + num(o.otherCosts);
export const payAmount = (o, p) => store.toBase((goodsCcy(o) * num(p.pct)) / 100, o.ccy || store.base());
export const paidPct = (o) => (o.payments || []).filter((p) => p.paid).reduce((t, p) => t + num(p.pct), 0);
export const setValue = (o) => { o.valueBase = Math.round(goodsBase(o) * 100) / 100; return o; };
export function nextPO(s) {
  const y = new Date().getFullYear();
  const n = s.orders.map((o) => parseInt(String(o.number || '').split('-').pop(), 10)).filter(Number.isFinite);
  return `PO-${y}-${String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0')}`;
}
/** Landed cost by line: freight, duty and other costs are shared out by each line's share of the goods value. */
export function allocateLanded(o) {
  const lines = (o.lines || []).map((l) => ({ l, goods: store.toBase(num(l.qty) * num(l.unitPrice), o.ccy || store.base()) }));
  const total = lines.reduce((t, x) => t + x.goods, 0) || 1;
  const extras = num(o.freight) + num(o.duty) + num(o.otherCosts);
  return lines.map(({ l, goods }) => {
    const extra = (extras * goods) / total;
    const qty = Math.max(1, num(l.received) || num(l.qty));
    return { line: l, goods, extra, landed: goods + extra, perUnit: (goods + extra) / qty, qty };
  });
}
export const lateOrder = (o) => OPEN_PO.includes(o.status) && o.eta && o.eta < today();

// ----- Quotes -----
/** Reliability defaults to the supplier's on-time record (x10) when the quote leaves it blank and history exists. */
export function evaluateRfq(s, r, weightsOverride) {
  const stats = {};
  const quotes = (r.quotes || []).map((q) => {
    let rel = q.reliability, fromHistory = false;
    if ((rel === '' || rel == null) && q.supplier) {
      stats[q.supplier] ||= M.supplierStats(s.orders.filter((o) => o.supplier === q.supplier), today());
      const ot = stats[q.supplier].onTimePct;
      if (Number.isFinite(ot)) { rel = Math.round(ot * 100) / 10; fromHistory = true; }
    }
    return { ...q, reliability: rel, supplierName: supName(s, q.supplier, q.supplierName), _hist: fromHistory };
  });
  if (!quotes.length) return { rows: [], ranked: [], cheapest: null, best: null, levers: [] };
  const p = P(s);
  const ev = M.evalQuotes(quotes, { qty: num(r.qty), convert: (a, c) => store.toBase(a, c || store.base()), dutyRate: p.dutyRate, vatRate: p.vatRate, vatRecoverable: p.vatRecoverable, weights: weightsOverride || r.weights || M.DEFAULT_WEIGHTS });
  const target = store.toBase(num(itemById(s, r.item)?.targetPrice), itemById(s, r.item)?.ccy || store.base());
  ev.levers = M.negotiationLevers(ev, { qty: num(r.qty), target, name: (x) => x.q.supplierName || 'supplier' });
  return ev;
}
export function rfqSavings(s, r) {
  if (r.status !== 'Awarded' || !r.awarded || (r.quotes || []).length < 2) return 0;
  const ev = evaluateRfq(s, r);
  const won = ev.rows.find((x) => x.q.id === r.awarded);
  if (!won) return 0;
  const high = Math.max(...ev.rows.map((x) => x.landedTotal));
  return Math.max(0, high - won.landedTotal);
}

// ----- Price book -----
export const pricesFor = (s, itemId) => s.prices.filter((p) => p.item === itemId).sort((a, b) => String(a.date).localeCompare(String(b.date)));
export const unitBase = (p) => store.toBase(num(p.price), p.ccy || store.base());
export const itemStats = (s, itemId) => M.priceStats(pricesFor(s, itemId).map((p) => ({ date: p.date, price: unitBase(p) })));
export const belowReorder = (i) => num(i.reorderPoint) > 0 && i.stock !== '' && i.stock != null && num(i.stock) <= num(i.reorderPoint);

// ----- Currencies in use (to warn about placeholder FX rates) -----
export function currenciesInUse(s) {
  const set = new Set();
  s.catalog.forEach((i) => i.ccy && set.add(i.ccy));
  s.prices.forEach((p) => p.ccy && set.add(p.ccy));
  s.rfqs.forEach((r) => (r.quotes || []).forEach((q) => q.ccy && set.add(q.ccy)));
  s.orders.forEach((o) => o.ccy && set.add(o.ccy));
  return [...set];
}
export function fxWarning(s) {
  const b = store.base();
  const exempt = new Set([b]); if (b === 'AED') exempt.add('USD'); // AED is pegged to USD
  const odd = currenciesInUse(s).filter((c) => !exempt.has(c));
  if (!odd.length) return null;
  const checked = P(s).fxChecked;
  const age = checked ? -daysUntil(checked) : null;
  if (!checked) return { level: 'red', ccys: odd, text: `These rates are placeholders you have not confirmed: ${odd.join(', ')}. Every converted figure below depends on them.` };
  if (age > 30) return { level: 'gold', ccys: odd, text: `FX rates were last confirmed ${age} days ago (${checked}). Check ${odd.join(', ')} before relying on converted figures.` };
  return null;
}

// ----- Starter kits: bills of materials and shopping lists with no prices (prices must come from real quotes) -----
export const KITS = [
  { id: 'golf', venture: 'v_dcsgolf', title: 'DCS Golf: bag bill of materials', blurb: 'The components of a hand-made leather and canvas golf bag. Quote each from two or three suppliers.', items: [
    ['Full-grain leather (body panels)', 'Raw materials', 'm²', 'Thickness, finish, colour-fastness; ask for tannery source and swatches'],
    ['Leather for trim and handles', 'Raw materials', 'm²', 'Matching or contrast; vegetable or chrome tanned'],
    ['Waxed or heavy canvas', 'Raw materials', 'metre', 'Weight per m², water resistance, colour'],
    ['Lining fabric', 'Raw materials', 'metre', 'Durable, light, easy to clean'],
    ['Heavy-duty zips', 'Components', 'unit', 'Length, tooth size, pull style; check smooth running under load'],
    ['Buckles, D-rings and clasps', 'Components', 'unit', 'Finish (brass, nickel), load rating'],
    ['Webbing and strap hardware', 'Components', 'metre', 'Width, strength, stitch-ability'],
    ['Foam or EVA padding', 'Components', 'm²', 'Density and thickness for shoulder strap and base'],
    ['Base and frame (rigid support)', 'Components', 'unit', 'Material and weight; the structure of the bag'],
    ['Thread (bonded nylon or polyester)', 'Raw materials', 'unit', 'Weight and colour; match the leather'],
    ['Rivets and studs', 'Components', 'unit', 'Finish and size'],
    ['Brand plate, emboss or foil stamp', 'Services', 'unit', 'Tooling cost is one-off; ask for set-up fee and minimum'],
    ['Dust bag', 'Packaging', 'unit', 'Cotton or microfibre, printed logo'],
    ['Gift box and tissue', 'Packaging', 'unit', 'Rigid box for luxury unboxing'],
    ['Shipping cartons', 'Packaging', 'carton', 'Size to protect structure without crushing'],
  ] },
  { id: 'ostrich', venture: 'v_ostrich', title: 'Al Ain Ostrich Farm: start-up list', blurb: 'The equipment and supplies a greenfield farm and visitor site needs. Animal import, licences and veterinary rules need advice first.', items: [
    ['Perimeter fencing for ostriches', 'Equipment', 'metre', 'Height, mesh and strength; specialist supplier knowledge needed'],
    ['Water troughs and plumbing', 'Equipment', 'set', 'Capacity for the climate; shade and cooling'],
    ['Feeders', 'Equipment', 'unit', 'Design to limit waste'],
    ['Chick feed and breeder feed', 'Raw materials', 'kg', 'Local mills versus imported; nutritionist specification'],
    ['Incubators and hatchers', 'Equipment', 'unit', 'Capacity and controls'],
    ['Brooders and chick housing', 'Equipment', 'unit', 'Temperature control'],
    ['Veterinary supplies and handling equipment', 'Equipment', 'set', 'Specified by the farm vet'],
    ['Shade structures and shelters', 'Equipment', 'unit', 'Heat management in Al Ain summers'],
    ['Cold room and butchery equipment', 'Equipment', 'set', 'Food-safety approval and licensing needed'],
    ['Restaurant kitchen equipment', 'Equipment', 'set', 'Municipality approval and capacity'],
    ['Visitor furniture, signage and viewing areas', 'Equipment', 'set', 'Safety and accessibility'],
    ['Craft store stock (leather and feather goods)', 'Finished goods', 'unit', 'Check permits for animal products before buying or selling'],
  ] },
  { id: 'circuit', venture: 'v_wedcircuit', title: 'Wednesday Circuit: event kit', blurb: 'What each networking morning needs. Recurring items are where a good supplier saves the most.', items: [
    ['Branded golf towels', 'Finished goods', 'unit', 'Embroidered logo, size, colour'],
    ['Player gifts', 'Finished goods', 'unit', 'Ball markers, pitch repairers, ball sleeves'],
    ['Tee and course signage', 'Services', 'set', 'Print on rigid boards, banners and flags'],
    ['Scorecards and printed programmes', 'Services', 'unit', 'Print runs and paper stock'],
    ['Trophies and prizes', 'Finished goods', 'unit', 'Engraving lead time'],
    ['Breakfast and refreshments', 'Events & hospitality', 'event', 'Per head, dietary options, setup'],
    ['Audio-visual and sound hire', 'Events & hospitality', 'event', 'For prize-givings'],
    ['Photographer and content', 'Services', 'event', 'Per event or retainer'],
    ['Buggy and course hire', 'Events & hospitality', 'event', 'Group rate from the club'],
  ] },
  { id: 'amazon', venture: 'v_amazon', title: 'Global Trend Store: launch services', blurb: 'The services around each product launch. Price products themselves from real factory quotes.', items: [
    ['Product samples (per product)', 'Finished goods', 'unit', 'Order from two or three factories; compare'],
    ['Third-party inspection', 'Services', 'event', 'Pre-shipment check per order'],
    ['Freight forwarder: door to Amazon warehouse', 'Freight & logistics', 'container', 'Get two quotes; ask what is and is not included'],
    ['Customs broker and import clearance', 'Freight & logistics', 'event', 'Importer code needed'],
    ['Labels and barcodes (FNSKU)', 'Packaging', 'unit', 'Compliance with Amazon rules'],
    ['Retail packaging and inserts', 'Packaging', 'unit', 'Your brand and instructions; no supplier names'],
    ['Product photography', 'Services', 'event', 'Main images and lifestyle images'],
  ] },
];

/** Procurement problems that are not dated deadlines: low stock, price rises, weak suppliers. */
export function procureAlerts(s) {
  const out = [];
  s.catalog.forEach((i) => {
    if (belowReorder(i)) out.push({ tone: 'gold', text: `${i.name} is at or below its reorder point`, href: `#/procure/items/${i.id}` });
    const st = itemStats(s, i.id);
    if (st.n >= 2 && st.changePct > 0.1) out.push({ tone: 'gold', text: `${i.name}: latest price up ${Math.round(st.changePct * 100)}% on the one before`, href: `#/procure/items/${i.id}` });
  });
  s.suppliers.forEach((x) => {
    const st = M.supplierStats(s.orders.filter((o) => o.supplier === x.id), today());
    if (st.received >= 2 && Number.isFinite(st.onTimePct) && st.onTimePct < 0.7) out.push({ tone: 'gold', text: `${x.name} is on time only ${Math.round(st.onTimePct * 100)}% of the time`, href: '#/procure/suppliers' });
    if (st.lateOpen) out.push({ tone: 'red', text: `${x.name} has ${st.lateOpen} late open order${st.lateOpen === 1 ? '' : 's'}`, href: '#/procure/orders' });
  });
  return out;
}
