// Procurement engine: one place for items, prices, quotes, purchase orders, suppliers and logistics across every venture.
import * as store from '../store.js';
import * as K from '../knowledge.js';
import * as M from '../procure-math.js';
import * as D from '../procure-data.js';
import { SUPPLIER_CHECKS } from '../ecom.js';
import { esc, icon, uid, openForm, toast, today, num, money, compact, pct, fnum, fmtDate, daysUntil, tabsHTML, lineChart, barsHTML, emptyState } from '../ui.js';
import { sourcingTab, ordersTab, flowActions } from './procure-flow.js';
import { logisticsTab, toolsTab, toolActions } from './procure-tools.js';

let tab = 'overview';
const itemFilter = { venture: '', cat: '', q: '' };
const back = (label, href) => `<a class="btn sm ghost" href="${href}">← ${esc(label)}</a>`;
const queueMsg = () => toast(K.mode() === 'connected' ? 'Sent to Claude' : 'Queued locally. Connect your vault so Claude can pick it up.', 'ok');
const isLive = (o) => !['Draft', 'Cancelled'].includes(o.status);

/** Count shown beside Procurement in the menu: open requests plus open orders. */
export const procureCount = (s) => s.rfqs.filter((r) => D.OPEN_RFQ.includes(r.status)).length + s.orders.filter((o) => D.OPEN_PO.includes(o.status)).length;

// ======================= OVERVIEW =======================
function overviewTab(s) {
  const b = store.base(); const t = today();
  const openR = s.rfqs.filter((r) => D.OPEN_RFQ.includes(r.status));
  const openO = s.orders.filter((o) => D.OPEN_PO.includes(o.status));
  const committed = openO.reduce((a, o) => a + D.orderCost(o), 0);
  const unpaid = [];
  s.orders.filter((o) => !['Closed', 'Cancelled', 'Draft'].includes(o.status)).forEach((o) => (o.payments || []).filter((p) => !p.paid).forEach((p) => unpaid.push({ o, p, amt: D.payAmount(o, p) })));
  const due30 = unpaid.filter((x) => x.p.due && daysUntil(x.p.due) <= 30);
  const overdue = unpaid.filter((x) => x.p.due && daysUntil(x.p.due) < 0);
  const transit = s.orders.filter((o) => ['Shipped', 'Customs'].includes(o.status));
  const recvd = s.orders.filter((o) => ['Received', 'Closed'].includes(o.status) && o.orderDate && o.receivedDate);
  const avgLead = recvd.length ? recvd.reduce((a, o) => a + (new Date(o.receivedDate) - new Date(o.orderDate)) / 86400000, 0) / recvd.length : NaN;
  const savings = s.rfqs.reduce((a, r) => a + D.rfqSavings(s, r), 0);
  const fx = D.fxWarning(s);

  const alerts = [];
  s.orders.filter(D.lateOrder).forEach((o) => alerts.push({ tone: 'red', text: `${o.number} from ${D.supName(s, o.supplier, o.supplierName)} is ${-daysUntil(o.eta)} days past its arrival date`, href: `#/procure/orders/${o.id}` }));
  overdue.forEach((x) => alerts.push({ tone: 'red', text: `Payment overdue: ${x.o.number} ${x.p.label}, ${money(x.amt, b)}, was due ${fmtDate(x.p.due)}`, href: `#/procure/orders/${x.o.id}` }));
  openR.forEach((r) => {
    if (r.need && daysUntil(r.need) < 0) alerts.push({ tone: 'gold', text: `Decision overdue on "${r.title}" (was due ${fmtDate(r.need)})`, href: `#/procure/sourcing/${r.id}` });
    (r.quotes || []).forEach((q) => { if (!q.validUntil) return; const d = daysUntil(q.validUntil); const nm = D.supName(s, q.supplier, q.supplierName); if (d < 0) alerts.push({ tone: 'gold', text: `Quote from ${nm} for "${r.title}" has expired`, href: `#/procure/sourcing/${r.id}` }); else if (d <= 7) alerts.push({ tone: 'gold', text: `Quote from ${nm} for "${r.title}" expires in ${d} day${d === 1 ? '' : 's'}`, href: `#/procure/sourcing/${r.id}` }); });
  });
  s.catalog.forEach((i) => {
    if (D.belowReorder(i)) alerts.push({ tone: 'gold', text: `${i.name} is at ${fnum(num(i.stock), 0)} against a reorder point of ${fnum(num(i.reorderPoint), 0)}`, href: `#/procure/items/${i.id}` });
    const st = D.itemStats(s, i.id);
    if (st.n >= 2 && st.changePct > 0.1) alerts.push({ tone: 'gold', text: `${i.name}: the latest price is ${pct(st.changePct, 0)} above the one before`, href: `#/procure/items/${i.id}` });
  });
  s.suppliers.forEach((x) => {
    const st = M.supplierStats(s.orders.filter((o) => o.supplier === x.id), t);
    if (st.received >= 2 && Number.isFinite(st.onTimePct) && st.onTimePct < 0.7) alerts.push({ tone: 'gold', text: `${x.name} delivered on time only ${pct(st.onTimePct, 0)} of the time`, href: '#/procure/suppliers' });
    if (Number.isFinite(st.quality) && st.quality < 6) alerts.push({ tone: 'gold', text: `${x.name} averages ${fnum(st.quality, 1)}/10 on quality`, href: '#/procure/suppliers' });
  });

  const spendBy = (key) => { const m = {}; s.orders.filter(isLive).forEach((o) => { const k = key(o); m[k] = (m[k] || 0) + D.orderCost(o); }); return Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 6); };
  const byVenture = spendBy((o) => D.ventureName(s, o.venture));
  const bySupplier = spendBy((o) => D.supName(s, o.supplier, o.supplierName));
  const upcoming = store.deadlines(30).filter((d) => d.href.startsWith('#/procure'));
  const empty = !s.catalog.length && !s.rfqs.length && !s.orders.length;

  return `
  ${fx ? `<div class="callout ${fx.level} small"><b>Check your exchange rates.</b> ${esc(fx.text)} <a href="#/treasury/fx">Open FX rates</a> <button class="btn sm" style="margin-left:8px" data-act="fxConfirm">I have checked them</button></div>` : ''}
  ${empty ? `<div class="card"><div class="card-head"><h3>How the procurement engine works</h3></div>
    <ol style="margin:0;padding-left:20px" class="small"><li style="margin-bottom:8px"><b>List what you buy.</b> Add items to the catalogue, or load a starter list for DCS Golf, the Ostrich Farm, Wednesday Circuit or the Amazon store. The lists carry no prices: prices must come from real quotes.</li>
      <li style="margin-bottom:8px"><b>Ask for quotes.</b> Open a request, add each supplier's offer, and the engine converts every quote to a like-for-like landed cost and scores them on what matters to you.</li>
      <li style="margin-bottom:8px"><b>Award and order.</b> The winning quote drafts a purchase order with its payment schedule. Payments and arrival dates reach your deadlines.</li>
      <li style="margin-bottom:8px"><b>Receive and learn.</b> Record what arrived: the true landed cost, the supplier's on-time record and the price history build up on their own.</li>
      <li><b>Use the tools.</b> Landed cost, freight mode, container fill, order quantity and payment-term maths are in the Logistics and Tools tabs.</li></ol>
    <div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="tab" data-tab="items">Load a starter list</button><button class="btn" data-act="newRfq">${icon('plus')} New request for quotes</button><button class="btn" data-act="newItem">${icon('plus')} Add an item</button></div></div>` : ''}
  <div class="grid g4 ${empty ? 'mt' : ''}">
    <div class="card kpi"><div class="label">Open requests</div><div class="value">${openR.length}</div><div class="delta">${openR.reduce((a, r) => a + (r.quotes || []).length, 0)} quotes in play</div></div>
    <div class="card kpi"><div class="label">Open orders</div><div class="value">${openO.length}</div><div class="delta">${transit.length} in transit</div></div>
    <div class="card kpi hero"><div class="label">Committed</div><div class="value gold">${compact(committed, b)}</div><div class="delta">landed cost of open orders, ex VAT</div></div>
    <div class="card kpi"><div class="label">Payable in 30 days</div><div class="value">${compact(due30.reduce((a, x) => a + x.amt, 0), b)}</div><div class="delta ${overdue.length ? 'down' : ''}">${overdue.length ? `${overdue.length} overdue` : `${due30.length} payment${due30.length === 1 ? '' : 's'}`}</div></div>
    <div class="card kpi"><div class="label">Average lead time</div><div class="value">${Number.isFinite(avgLead) ? `${Math.round(avgLead)} d` : '—'}</div><div class="delta">${recvd.length} received order${recvd.length === 1 ? '' : 's'}</div></div>
    <div class="card kpi"><div class="label">Saved by comparing</div><div class="value">${savings ? compact(savings, b) : '—'}</div><div class="delta">awarded quote vs the dearest quote</div></div>
    <div class="card kpi"><div class="label">Catalogue</div><div class="value">${s.catalog.length}</div><div class="delta">${s.prices.length} price points</div></div>
    <div class="card kpi"><div class="label">Suppliers</div><div class="value">${s.suppliers.length}</div><div class="delta">${s.suppliers.filter((x) => s.orders.some((o) => o.supplier === x.id && isLive(o))).length} with live orders</div></div></div>
  <div class="grid g2 mt" style="align-items:start">
    <div class="card"><div class="card-head"><h3>Needs attention</h3><div class="right">${alerts.length ? `<span class="badge ${alerts.some((a) => a.tone === 'red') ? 'red' : 'gold'}">${alerts.length}</span>` : ''}</div></div>
      ${alerts.length ? `<div class="list">${alerts.slice(0, 10).map((a) => `<a class="list-item" href="${esc(a.href)}" style="color:inherit;text-decoration:none"><span class="badge ${a.tone}">${a.tone === 'red' ? 'act' : 'check'}</span><div class="grow small">${esc(a.text)}</div></a>`).join('')}</div>${alerts.length > 10 ? `<div class="small muted mt">and ${alerts.length - 10} more</div>` : ''}` : '<div class="small muted">Nothing needs attention. Late orders, overdue payments, expiring quotes, low stock, price rises and weak suppliers show here.</div>'}</div>
    <div class="card"><div class="card-head"><h3>Next 30 days</h3></div>
      ${upcoming.length ? `<div class="list">${upcoming.slice(0, 8).map((d) => `<a class="list-item" href="${esc(d.href)}" style="color:inherit;text-decoration:none"><span class="badge ${d.days < 0 ? 'red' : d.days <= 7 ? 'gold' : ''}">${d.days < 0 ? `${-d.days}d late` : d.days === 0 ? 'today' : `${d.days}d`}</span><div class="grow small">${esc(d.title)}</div><span class="small muted">${fmtDate(d.date, { day: 'numeric', month: 'short' })}</span></a>`).join('')}</div>` : '<div class="small muted">No payments, deliveries or quote deadlines in the next 30 days.</div>'}</div></div>
  <div class="grid g2 mt" style="align-items:start">
    <div class="card"><div class="card-head"><h3>Spend by venture</h3></div>${byVenture.length ? barsHTML(byVenture.map(([l, v]) => ({ label: l, value: v, display: compact(v, b) }))) : '<div class="small muted">Spend appears once an order is sent.</div>'}</div>
    <div class="card"><div class="card-head"><h3>Spend by supplier</h3></div>${bySupplier.length ? barsHTML(bySupplier.map(([l, v]) => ({ label: l, value: v, display: compact(v, b) }))) : '<div class="small muted">Spend appears once an order is sent.</div>'}${bySupplier.length && bySupplier[0][1] / (bySupplier.reduce((a, x) => a + x[1], 0) || 1) > 0.6 ? '<div class="callout gold small mt">Over 60% of your spend sits with one supplier. Qualify a second source for the critical items.</div>' : ''}</div></div>
  <div class="card mt"><div class="card-head"><h3>Ask Claude</h3></div>
    <p class="small muted" style="margin-top:0">Claude researches in your vault from public sources and writes what it finds into the wiki. Nothing here is a quote or a live price.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap">${RESEARCH.map(([k, l]) => `<button class="btn sm" data-act="askTopic" data-k="${k}">${esc(l)}</button>`).join('')}</div></div>`;
}

const RESEARCH = [
  ['golf', 'DCS Golf: materials and component suppliers'],
  ['ostrich', 'Ostrich farm: equipment and import rules'],
  ['events', 'Event procurement benchmarks in Dubai'],
  ['freight', 'China to UAE freight and customs benchmarks'],
  ['negotiation', 'Supplier negotiation and payment-term practice'],
];
const TOPIC_Q = {
  golf: ['Procurement research: materials and component suppliers for hand-made leather golf bags', 'Find reputable sources for full-grain and vegetable-tanned leather, waxed canvas, heavy-duty zips and hardware, and rigid bag frames for a UAE luxury golf-bag maker. Give typical specification options, minimum orders, lead times, and indicative price ranges with dates and sources. Cover import duty and certification for leather into the UAE, and sustainability or traceability claims to ask for. Label anything unverified.', 'v_dcsgolf'],
  ostrich: ['Procurement research: ostrich farm equipment, feed and import rules for the UAE', 'Cover fencing, feeders, incubation, veterinary and handling equipment, and feed for a greenfield ostrich farm in Al Ain. Include which items are usually imported (South Africa and elsewhere), the permits and veterinary conditions for importing birds, eggs and equipment into the UAE, and typical suppliers. A licensed adviser and the relevant authorities must confirm the rules. Cite sources with dates.', 'v_ostrich'],
  events: ['Procurement research: event suppliers and cost benchmarks for corporate golf events in Dubai', 'Find typical per-head and per-item cost ranges for breakfast catering, branded gifts, signage, trophies, audio-visual hire and photography for a C-suite golf event in the UAE. Name the kinds of suppliers to approach and what to negotiate for recurring events. Cite sources and dates; say where figures are only indicative.', 'v_wedcircuit'],
  freight: ['Procurement research: China to UAE freight, customs and landed-cost benchmarks', 'Verify against official and carrier sources: current UAE customs duty and import VAT treatment, Dubai Customs importer-code requirements, typical sea LCL, FCL and air freight pricing structure and transit times from major Chinese ports to Jebel Ali, and common forwarder charges. Give ranges with dates and sources, and flag what the owner must confirm with a forwarder or customs broker.', ''],
  negotiation: ['Procurement research: supplier negotiation and payment-term practice', 'Summarise well-sourced practice on negotiating with overseas manufacturers: should-cost analysis, volume tiers, deposit and balance structures, escrow and documentary payment methods, inspection clauses, and how to protect tooling and designs. Cite credible sources and say what a lawyer should confirm.', ''],
};

// ======================= ITEMS & PRICE BOOK =======================
function itemsTab(s, params) {
  if (params[1]) return itemDetail(s, params[1]);
  const b = store.base(); const f = itemFilter;
  const cats = [...new Set(s.catalog.map((i) => i.category).filter(Boolean))].sort();
  const list = s.catalog.filter((i) => (!f.venture || i.venture === f.venture) && (!f.cat || i.category === f.cat) && (!f.q || `${i.name} ${i.sku || ''}`.toLowerCase().includes(f.q.toLowerCase())));
  const have = new Set(s.catalog.map((i) => i.name.toLowerCase()));
  return `
  <div class="row" style="margin-bottom:14px;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="newItem">${icon('plus')} Add an item</button><button class="btn" data-act="newPrice">${icon('plus')} Log a price</button>
    ${s.catalog.length ? `<select class="pill-select" data-change="itemFilter" data-k="venture" aria-label="Venture"><option value="">All ventures</option>${s.ventures.map((v) => `<option value="${esc(v.id)}" ${f.venture === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
    ${cats.length ? `<select class="pill-select" data-change="itemFilter" data-k="cat" aria-label="Category"><option value="">All categories</option>${cats.map((c) => `<option ${f.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : ''}
    <input class="pill-select" style="min-width:160px" type="search" placeholder="Search items" value="${esc(f.q)}" data-change="itemFilter" data-k="q" aria-label="Search items">` : ''}</div>
  ${list.length ? `<div class="card"><div class="table-wrap"><table><thead><tr><th>Item</th><th>Venture</th><th class="num">Target</th><th class="num">Latest</th><th class="num">Lowest</th><th class="num">Prices</th><th>Stock</th></tr></thead><tbody>
    ${list.map((i) => { const st = D.itemStats(s, i.id); const tgt = num(i.targetPrice);
      return `<tr class="click" data-act="openItem" data-id="${esc(i.id)}" style="cursor:pointer"><td><b>${esc(i.name)}</b><div class="small muted">${esc([i.category, i.sku].filter(Boolean).join(' · '))}</div></td><td class="small">${esc(D.ventureName(s, i.venture))}</td>
      <td class="num">${tgt ? `${fnum(tgt, 2)} ${esc(i.ccy || '')}` : '—'}</td><td class="num">${st.n ? `${fnum(st.last, 2)}${Number.isFinite(st.changePct) && Math.abs(st.changePct) >= 0.005 ? ` <span class="${st.changePct > 0 ? 'neg' : 'pos'} small">${st.changePct > 0 ? '▲' : '▼'}${pct(Math.abs(st.changePct), 0)}</span>` : ''}` : '—'}</td>
      <td class="num">${st.n ? fnum(st.min, 2) : '—'}</td><td class="num">${st.n}</td><td>${D.belowReorder(i) ? '<span class="badge red">reorder</span>' : i.stock !== '' && i.stock != null ? `${fnum(num(i.stock), 0)} ${esc(i.unit || '')}` : '<span class="muted">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="small muted" style="margin:10px 0 0">Prices are shown in ${b} per unit and are not like-for-like when quotes use different Incoterms: open an item to see each price's terms.</p></div>`
  : s.catalog.length ? '<div class="empty">No items match.</div>' : ''}
  <div class="card mt"><div class="card-head"><h3>Starter lists</h3></div>
    <p class="small muted" style="margin-top:0">Ready-made item lists for each venture. They hold specifications and notes only: <b>no prices</b>, because a price I could not source would be worse than none. Add the list, then ask for quotes.</p>
    <div class="grid g2">${D.KITS.map((k) => { const missing = k.items.filter((x) => !have.has(x[0].toLowerCase())).length; return `<div class="card" style="background:var(--bg-2)"><div class="card-head"><h3>${esc(k.title)}</h3></div><p class="small muted" style="margin:0 0 10px">${esc(k.blurb)}</p>
      <div class="row" style="gap:8px"><button class="btn sm ${missing ? 'primary' : ''}" data-act="addKit" data-kit="${k.id}" ${missing ? '' : 'disabled'}>${missing ? `Add ${missing} item${missing === 1 ? '' : 's'}` : 'All added'}</button><span class="small muted">${k.items.length} items</span></div></div>`; }).join('')}</div></div>`;
}

function itemDetail(s, id) {
  const it = D.itemById(s, id);
  if (!it) return `<div class="callout red">That item was not found. ${back('Back to items', '#/procure/items')}</div>`;
  const b = store.base();
  const prices = D.pricesFor(s, id); const st = D.itemStats(s, id);
  const target = store.toBase(num(it.targetPrice), it.ccy || b);
  const lbl = (p) => fmtDate(p.date, { day: 'numeric', month: 'short' });
  const series = [{ name: 'Price', cls: '', points: prices.map((p) => ({ x: lbl(p), y: D.unitBase(p) })) }];
  if (target > 0 && prices.length > 1) series.push({ name: 'Target', cls: 'g', points: prices.map((p) => ({ x: lbl(p), y: target })) });
  const rfqs = s.rfqs.filter((r) => r.item === id);
  const orders = s.orders.filter((o) => (o.lines || []).some((l) => l.item === id));
  const cover = num(it.annualDemand) > 0 && it.stock !== '' && it.stock != null ? num(it.stock) / (num(it.annualDemand) / 365) : NaN;
  return `
  <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:14px">${back('All items', '#/procure/items')}<div class="right row" style="gap:8px;flex-wrap:wrap">
    <button class="btn" data-act="editItem">Edit item</button><button class="btn" data-act="askItem">${icon('spark')} Ask Claude for benchmarks</button><button class="btn" data-act="newPrice" data-item="${esc(id)}">Log a price</button><button class="btn primary" data-act="newRfq" data-item="${esc(id)}">Request quotes</button></div></div>
  <div class="card"><div class="card-head"><h2 style="margin:0;font-size:20px">${esc(it.name)}</h2><div class="right">${it.category ? `<span class="badge">${esc(it.category)}</span>` : ''}<span class="badge">${esc(D.ventureName(s, it.venture))}</span></div></div>
    ${it.spec ? `<p class="small" style="margin:0 0 8px;white-space:pre-wrap"><span class="muted">Specification: </span>${esc(it.spec)}</p>` : '<p class="small muted" style="margin:0 0 8px">No specification yet. A clear specification is the first thing every supplier will ask for.</p>'}
    <div class="small muted">${[it.sku && `SKU ${esc(it.sku)}`, `per ${esc(it.unit || 'unit')}`, it.preferredSupplier && `preferred: ${esc(D.supName(s, it.preferredSupplier))}`, num(it.leadDays) && `lead time ${num(it.leadDays)} days`].filter(Boolean).join(' · ')}</div>${it.notes ? `<p class="small" style="margin:8px 0 0;white-space:pre-wrap">${esc(it.notes)}</p>` : ''}</div>
  <div class="grid g4 mt">
    <div class="card kpi hero"><div class="label">Latest price</div><div class="value gold">${st.n ? fnum(st.last, 2) : '—'}</div><div class="delta">${b} per ${esc(it.unit || 'unit')}${Number.isFinite(st.changePct) ? ` · ${st.changePct >= 0 ? '+' : ''}${pct(st.changePct, 1)} vs previous` : ''}</div></div>
    <div class="card kpi"><div class="label">Average</div><div class="value">${st.n ? fnum(st.avg, 2) : '—'}</div><div class="delta">${st.n ? `range ${fnum(st.min, 2)} to ${fnum(st.max, 2)}` : 'no prices yet'}</div></div>
    <div class="card kpi"><div class="label">Target</div><div class="value">${target ? fnum(target, 2) : '—'}</div><div class="delta ${st.n && target ? (st.last > target ? 'down' : 'up') : ''}">${st.n && target ? (st.last > target ? `latest is ${pct((st.last - target) / target, 0)} above target` : 'latest is at or below target') : 'set a target price'}</div></div>
    <div class="card kpi"><div class="label">Stock</div><div class="value">${it.stock !== '' && it.stock != null ? fnum(num(it.stock), 0) : '—'}</div><div class="delta ${D.belowReorder(it) ? 'down' : ''}">${D.belowReorder(it) ? 'at or below the reorder point' : num(it.reorderPoint) ? `reorder at ${fnum(num(it.reorderPoint), 0)}` : 'no reorder point'}</div></div></div>
  ${Number.isFinite(cover) && num(it.leadDays) > 0 && cover < num(it.leadDays) ? `<div class="callout red small mt">Stock covers about ${Math.round(cover)} days at the demand you entered, less than the ${num(it.leadDays)}-day lead time. Order now or expect a stock-out.</div>` : Number.isFinite(cover) ? `<div class="small muted mt">Stock covers about ${Math.round(cover)} days of demand. <a href="#/procure/tools">Work out the order quantity and reorder point</a>.</div>` : ''}
  <div class="card mt"><div class="card-head"><h3>Price history</h3></div>${prices.length > 1 ? lineChart(series, { fmtY: (v) => fnum(v, 2) }) : '<div class="empty small">Log at least two prices to see the trend. Quotes you add to a request are logged automatically.</div>'}</div>
  <div class="card mt"><div class="card-head"><h3>Price book</h3></div>
    ${prices.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Supplier</th><th class="num">Price</th><th class="num">In ${b}</th><th class="num">Qty</th><th>Terms</th><th>Source</th></tr></thead><tbody>
    ${prices.slice().reverse().map((p) => `<tr class="click" data-act="editPrice" data-id="${esc(p.id)}" style="cursor:pointer"><td>${fmtDate(p.date)}</td><td>${esc(D.supName(s, p.supplier, '—'))}</td><td class="num">${fnum(num(p.price), 2)} ${esc(p.ccy || '')}</td><td class="num">${fnum(D.unitBase(p), 2)}</td><td class="num">${p.qty ? fnum(num(p.qty), 0) : '—'}</td><td>${esc(p.incoterm || '—')}</td><td class="small muted">${esc(p.source || '')}${p.note ? ` · ${esc(p.note)}` : ''}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted" style="margin:10px 0 0">Compare prices only on the same terms: an ex-works price and a delivered price are different things. Prices at different quantities differ too.</p>` : '<div class="empty small">No prices yet. Log a price from a quote, an invoice, a catalogue or a market benchmark, and note its source.</div>'}</div>
  ${rfqs.length || orders.length ? `<div class="grid g2 mt" style="align-items:start">
    <div class="card"><div class="card-head"><h3>Requests</h3></div>${rfqs.length ? `<div class="list">${rfqs.map((r) => `<a class="list-item" href="#/procure/sourcing/${esc(r.id)}" style="color:inherit;text-decoration:none"><div class="grow small"><b>${esc(r.title)}</b></div><span class="badge ${D.rfqTone[r.status]}">${esc(r.status)}</span></a>`).join('')}</div>` : '<div class="small muted">None yet.</div>'}</div>
    <div class="card"><div class="card-head"><h3>Orders</h3></div>${orders.length ? `<div class="list">${orders.map((o) => `<a class="list-item" href="#/procure/orders/${esc(o.id)}" style="color:inherit;text-decoration:none"><div class="grow small"><b>${esc(o.number)}</b> ${esc(D.supName(s, o.supplier, o.supplierName))}</div><span class="badge ${D.poTone[o.status]}">${esc(o.status)}</span></a>`).join('')}</div>` : '<div class="small muted">None yet.</div>'}</div></div>` : ''}`;
}

function itemForm(it) {
  openForm({ title: it ? 'Edit item' : 'Add an item', wide: true, values: it || { ccy: 'USD', unit: 'unit' }, fields: [
    { k: 'name', label: 'Item', required: true, full: true }, { k: 'category', label: 'Category', placeholder: 'Raw materials, Equipment, Packaging…' }, { k: 'sku', label: 'Your reference or SKU' },
    { k: 'venture', label: 'Venture', type: 'select', options: () => D.ventureOpts(store.get()) }, { k: 'unit', label: 'Bought per', type: 'select', options: D.UNITS },
    { k: 'targetPrice', label: 'Target price per unit', type: 'number', hint: 'What you would be happy to pay' }, { k: 'ccy', label: 'Currency', type: 'select', options: () => store.currencies() },
    { k: 'preferredSupplier', label: 'Preferred supplier', type: 'select', options: () => D.supplierOpts(store.get()) }, { k: 'leadDays', label: 'Typical lead time (days)', type: 'number' },
    { k: 'stock', label: 'Stock on hand', type: 'number' }, { k: 'reorderPoint', label: 'Reorder when stock falls to', type: 'number' }, { k: 'annualDemand', label: 'Annual demand', type: 'number', hint: 'Used to estimate days of cover' },
    { k: 'spec', label: 'Specification', type: 'textarea' }, { k: 'notes', label: 'Notes', type: 'textarea' },
  ], onSave: (d) => {
    const id = it?.id || uid('itm');
    store.update((st) => { if (it) Object.assign(D.itemById(st, it.id), d); else st.catalog.push({ id, ...d, created: today() }); });
    if (!it) location.hash = `#/procure/items/${id}`;
  }, onDelete: it ? () => {
    const st = store.get(); const used = st.orders.some((o) => (o.lines || []).some((l) => l.item === it.id)) || st.rfqs.some((r) => r.item === it.id);
    if (used) { toast('This item is used by an order or request: close those first', 'error'); return; }
    store.update((x) => { x.catalog = x.catalog.filter((i) => i.id !== it.id); x.prices = x.prices.filter((p) => p.item !== it.id); });
    location.hash = '#/procure/items';
  } : null });
}

function priceForm(p, itemId) {
  const s0 = store.get();
  openForm({ title: p ? 'Edit price' : 'Log a price', wide: true, values: p || { item: itemId || '', date: today(), ccy: D.itemById(s0, itemId)?.ccy || 'USD', source: 'Supplier quote' }, fields: [
    { k: 'item', label: 'Item', type: 'select', required: true, options: () => store.get().catalog.map((i) => ({ v: i.id, l: i.name })) }, { k: 'supplier', label: 'Supplier', type: 'select', options: () => D.supplierOpts(store.get()) },
    { k: 'date', label: 'Date of the price', type: 'date', required: true }, { k: 'price', label: 'Price per unit', type: 'number', required: true },
    { k: 'ccy', label: 'Currency', type: 'select', options: () => store.currencies() }, { k: 'qty', label: 'Quantity it applied to', type: 'number' },
    { k: 'incoterm', label: 'Price basis (Incoterm)', type: 'select', options: [{ v: '', l: 'Not stated' }, ...D.INCOTERM_CODES] }, { k: 'source', label: 'Where it came from', type: 'select', options: D.PRICE_SOURCES },
    { k: 'note', label: 'Note', full: true, placeholder: 'Quote reference, link, what it covers' },
  ], onSave: (d) => { if (!store.get().catalog.length) { toast('Add an item first', 'error'); return false; } store.upsert('prices', { id: p?.id || uid('pr'), ...(p || {}), ...d }); },
  onDelete: p ? () => store.remove('prices', p.id) : null });
}

// ======================= SUPPLIERS =======================
function suppliersTab(s) {
  const t = today();
  const rows = s.suppliers.map((x) => ({ x, st: M.supplierStats(s.orders.filter((o) => o.supplier === x.id), t), vet: SUPPLIER_CHECKS.filter(([k]) => x.checks?.[k]).length })).sort((a, c) => c.st.spend - a.st.spend);
  const b = store.base();
  return `
  <div class="row" style="margin-bottom:14px;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="newSupplier">${icon('plus')} Add supplier</button><span class="muted small right">One register for every venture. The vetting checklist lives in the <a href="#/commerce/suppliers">Commerce Lab</a>.</span></div>
  ${rows.length ? `<div class="grid g2">${rows.map(({ x, st, vet }) => `<div class="card click" data-act="editSupplier" data-id="${esc(x.id)}" style="cursor:pointer">
    <div class="card-head"><h3>${esc(x.name)}</h3><div class="right">${vet ? `<span class="badge ${vet >= 8 ? 'green' : vet >= 6 ? 'gold' : 'red'}">${vet}/10 vetted</span>` : ''}</div></div>
    <div class="small muted">${esc([x.category, x.country, x.city].filter(Boolean).join(' · ') || 'Add a category and country')}${x.paymentTerms ? ` · ${esc(x.paymentTerms)}` : ''}</div>
    <div class="calc-out mt"><div class="o"><div class="l">Orders</div><div class="v">${st.orders}</div></div><div class="o"><div class="l">Spend</div><div class="v">${st.spend ? compact(st.spend, b) : '—'}</div></div><div class="o"><div class="l">On time</div><div class="v">${Number.isFinite(st.onTimePct) ? pct(st.onTimePct, 0) : '—'}</div></div><div class="o"><div class="l">Quality</div><div class="v">${Number.isFinite(st.quality) ? `${fnum(st.quality, 1)}/10` : '—'}</div></div></div>
    ${st.lateOpen ? `<div class="callout red small mt" style="margin-bottom:0">${st.lateOpen} open order${st.lateOpen === 1 ? ' is' : 's are'} late</div>` : st.openCount ? `<div class="small muted mt">${st.openCount} open order${st.openCount === 1 ? '' : 's'}</div>` : ''}
    ${x.contact ? `<div class="small muted mt">${esc(x.contact)}</div>` : ''}${x.notes ? `<p class="small muted" style="margin:8px 0 0">${esc(x.notes)}</p>` : ''}</div>`).join('')}</div>`
  : emptyState('No suppliers yet', 'Add every supplier you are talking to, even before you order. Performance builds up from received orders: on-time delivery and quality.', `<div class="mt"><button class="btn primary" data-act="newSupplier">${icon('plus')} Add the first supplier</button></div>`)}
  <div class="card mt"><div class="card-head"><h3>Good supplier practice</h3></div>
    <ul class="small" style="margin:0;padding-left:18px"><li style="margin-bottom:6px">Hold at least two qualified sources for anything that stops a venture if it runs out.</li><li style="margin-bottom:6px">Verify a supplier's legal identity and premises before paying a deposit, and keep the deposit small.</li><li style="margin-bottom:6px">Record every delivery: the on-time and quality scores here are the evidence for your next negotiation.</li><li>Put specifications, tolerances, inspection rights and ownership of tooling and designs in writing. Have a lawyer review any supply contract.</li></ul></div>`;
}
function supplierForm(x) {
  openForm({ title: x ? 'Edit supplier' : 'Add a supplier', wide: true, values: x || {}, fields: [
    { k: 'name', label: 'Supplier', required: true, full: true }, { k: 'category', label: 'What they supply', type: 'select', options: [{ v: '', l: 'Choose…' }, ...D.SUP_CATS] }, { k: 'country', label: 'Country' },
    { k: 'city', label: 'City or region' }, { k: 'paymentTerms', label: 'Usual payment terms', placeholder: 'e.g. 30% deposit, 70% before shipping' },
    { k: 'contact', label: 'Contact', full: true, placeholder: 'Name, email or phone' }, { k: 'url', label: 'Website or listing', full: true },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ], onSave: (d) => store.upsert('suppliers', { ...(x || { checks: {} }), id: x?.id || uid('sup'), ...d, updated: today() }),
  onDelete: x ? () => {
    const st = store.get(); const n = st.orders.filter((o) => o.supplier === x.id).length + st.rfqs.filter((r) => (r.quotes || []).some((q) => q.supplier === x.id)).length + st.prices.filter((p) => p.supplier === x.id).length;
    if (n) { toast(`${x.name} is used in ${n} record${n === 1 ? '' : 's'}: reassign them first`, 'error'); return; }
    store.remove('suppliers', x.id);
  } : null });
}

// ======================= VENTURE CARD (used on the venture page) =======================
export function ventureCard(s, vid) {
  const b = store.base();
  const rf = s.rfqs.filter((r) => r.venture === vid), po = s.orders.filter((o) => o.venture === vid), items = s.catalog.filter((i) => i.venture === vid);
  const openR = rf.filter((r) => D.OPEN_RFQ.includes(r.status)), openO = po.filter((o) => D.OPEN_PO.includes(o.status));
  const spend = po.filter(isLive).reduce((a, o) => a + D.orderCost(o), 0);
  return `<div class="card"><div class="card-head"><h3>Procurement</h3><div class="right"><a class="btn sm" href="#/procure">Open engine</a></div></div>
    ${items.length || rf.length || po.length ? `<div class="calc-out"><div class="o"><div class="l">Items</div><div class="v">${items.length}</div></div><div class="o"><div class="l">Open requests</div><div class="v">${openR.length}</div></div><div class="o"><div class="l">Open orders</div><div class="v">${openO.length}</div></div><div class="o"><div class="l">Ordered</div><div class="v">${spend ? compact(spend, b) : '—'}</div></div></div>
      ${[...openR.map((r) => `<a class="list-item" href="#/procure/sourcing/${esc(r.id)}" style="color:inherit;text-decoration:none"><div class="grow small">${esc(r.title)}</div><span class="badge ${D.rfqTone[r.status]}">${esc(r.status)}</span></a>`), ...openO.map((o) => `<a class="list-item" href="#/procure/orders/${esc(o.id)}" style="color:inherit;text-decoration:none"><div class="grow small">${esc(o.number)} · ${esc(D.supName(s, o.supplier, o.supplierName))}</div><span class="badge ${D.poTone[o.status]}">${esc(o.status)}</span></a>`)].slice(0, 5).join('')}`
    : `<p class="small muted" style="margin:0">Nothing sourced for this venture yet. Load its starter list of items, then ask suppliers for quotes.</p><div class="mt"><a class="btn sm primary" href="#/procure/items">Start in Procurement</a></div>`}</div>`;
}

// ======================= SHELL =======================
const mod = {
  title: 'Procurement',
  render(s, params) {
    tab = params[0] || 'overview';
    const openR = s.rfqs.filter((r) => D.OPEN_RFQ.includes(r.status)).length, openO = s.orders.filter((o) => D.OPEN_PO.includes(o.status)).length;
    const tabs = [['overview', 'Overview'], ['items', 'Items & prices'], ['sourcing', openR ? `Sourcing · ${openR}` : 'Sourcing'], ['orders', openO ? `Orders · ${openO}` : 'Orders'], ['suppliers', 'Suppliers'], ['logistics', 'Logistics'], ['tools', 'Tools']];
    const body = tab === 'items' ? itemsTab(s, params) : tab === 'sourcing' ? sourcingTab(s, params) : tab === 'orders' ? ordersTab(s, params) : tab === 'suppliers' ? suppliersTab(s) : tab === 'logistics' ? logisticsTab(s) : tab === 'tools' ? toolsTab(s) : overviewTab(s);
    return `
    <div class="page-head"><div><div class="eyebrow">Build</div><h1>Procurement</h1>
      <p>One engine for everything you buy, across every venture: what it costs delivered, who to buy it from, what you ordered, what is on the water, and what it will cost you tomorrow.</p></div>
      <div class="actions"><button class="btn" data-act="newRfq">${icon('plus')} Request quotes</button><button class="btn" data-act="newPO">${icon('plus')} Purchase order</button></div></div>
    ${tabsHTML(tabs, tab)}${body}`;
  },
  actions: {
    ...flowActions,
    ...toolActions,
    tab(el) { location.hash = `#/procure/${el.dataset.tab}`; },
    fxConfirm() { store.update((s) => { s.settings.procure.fxChecked = today(); }); toast('Rates marked as checked', 'ok'); },
    // items
    itemFilter(el) { itemFilter[el.dataset.k] = el.value; store.update(() => {}); },
    openItem(el) { location.hash = `#/procure/items/${el.dataset.id}`; },
    newItem() { itemForm(null); },
    editItem(el, _, params) { itemForm(D.itemById(store.get(), params[1])); },
    newPrice(el) { priceForm(null, el.dataset.item); },
    editPrice(el) { priceForm(store.byId('prices', el.dataset.id)); },
    addKit(el) {
      const kit = D.KITS.find((k) => k.id === el.dataset.kit); let n = 0;
      store.update((st) => {
        const have = new Set(st.catalog.map((i) => i.name.toLowerCase())); const vid = st.ventures.some((v) => v.id === kit.venture) ? kit.venture : '';
        kit.items.forEach(([name, category, unit, spec]) => { if (have.has(name.toLowerCase())) return; n++; st.catalog.push({ id: uid('itm'), name, sku: '', category, unit, venture: vid, spec, targetPrice: '', ccy: 'USD', preferredSupplier: '', stock: '', reorderPoint: '', annualDemand: '', leadDays: '', notes: '', created: today() }); });
      });
      toast(`Added ${n} item${n === 1 ? '' : 's'}`, 'ok');
    },
    askItem(el, _, params) {
      const s = store.get(); const it = D.itemById(s, params[1]);
      K.addToQueue({ type: 'research', priority: 'Normal', domain: 'Business & Ventures', venture: it.venture || '', title: `Procurement benchmark: ${it.name}`,
        question: `Find reputable suppliers and indicative prices for: ${it.name}${it.spec ? `\nSpecification: ${it.spec}` : ''}${num(it.targetPrice) ? `\nTarget: ${it.targetPrice} ${it.ccy} per ${it.unit}` : ''}\nVenture: ${D.ventureName(s, it.venture)}. Give 3 to 5 supplier types or named sources, indicative price ranges with dates and sources, usual minimum orders, lead times and Incoterms, UAE import duty, HS code and any certification needed, and quality risks. Say what is unverified. Update or create a wiki article and link it to [[Procurement Fundamentals: Landed Cost, Incoterms and Negotiation]].` });
      queueMsg();
    },
    askTopic(el) {
      const [title, question, venture] = TOPIC_Q[el.dataset.k];
      K.addToQueue({ type: 'research', priority: 'Normal', domain: 'Business & Ventures', venture, title, question: `${question} Link the result to [[Procurement Fundamentals: Landed Cost, Incoterms and Negotiation]].` });
      queueMsg();
    },
    // suppliers
    newSupplier() { supplierForm(null); },
    editSupplier(el) { supplierForm(store.byId('suppliers', el.dataset.id)); },
  },
};
export default mod;
