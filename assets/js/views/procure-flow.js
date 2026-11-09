// Procurement: Sourcing (requests for quotation and quote comparison) and Orders (purchase orders from draft to received).
import * as store from '../store.js';
import * as K from '../knowledge.js';
import * as M from '../procure-math.js';
import * as D from '../procure-data.js';
import { esc, icon, uid, openForm, toast, today, num, money, compact, pct, fnum, fmtDate, daysUntil, addDays, barsHTML, confirmBox, emptyState } from '../ui.js';

let rfqFilter = 'open';
const FLOW = ['Draft', 'Sent', 'Confirmed', 'In production', 'Shipped', 'Customs', 'Received', 'Closed'];
const back = (label, href) => `<a class="btn sm ghost" href="${href}">← ${esc(label)}</a>`;
const rfqOf = (s, id) => s.rfqs.find((x) => x.id === id);
const poOf = (s, id) => s.orders.find((x) => x.id === id);
const dueBadge = (date, done) => {
  if (!date) return '';
  const d = daysUntil(date);
  if (done) return '';
  return d < 0 ? `<span class="badge red">${-d} day${d === -1 ? '' : 's'} late</span>` : d === 0 ? '<span class="badge gold">today</span>' : d <= 7 ? `<span class="badge gold">in ${d} day${d === 1 ? '' : 's'}</span>` : '';
};
const queueMsg = () => toast(K.mode() === 'connected' ? 'Sent to Claude' : 'Queued locally. Connect your vault so Claude can pick it up.', 'ok');

// ======================= SOURCING =======================
export function sourcingTab(s, params) {
  if (params[1]) return rfqDetail(s, params[1]);
  const b = store.base();
  const list = s.rfqs.filter((r) => (rfqFilter === 'all' ? true : rfqFilter === 'open' ? D.OPEN_RFQ.includes(r.status) : r.status === rfqFilter))
    .sort((a, c) => String(c.created || '').localeCompare(String(a.created || '')));
  return `
  <div class="row" style="margin-bottom:14px;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="newRfq">${icon('plus')} New request for quotes</button>
    <select class="pill-select" data-change="rfqFilter" aria-label="Filter requests">${[['open', 'Open requests'], ['Awarded', 'Awarded'], ['Cancelled', 'Cancelled'], ['all', 'All']].map(([v, l]) => `<option value="${v}" ${rfqFilter === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <span class="muted small right">Get at least three quotes. Compare them on landed cost, not unit price.</span></div>
  ${list.length ? `<div class="grid g2">${list.map((r) => {
    const ev = D.evaluateRfq(s, r);
    const cheap = ev.cheapest;
    return `<div class="card click" data-act="openRfq" data-id="${esc(r.id)}" style="cursor:pointer">
      <div class="card-head"><h3>${esc(r.title)}</h3><div class="right"><span class="badge ${D.rfqTone[r.status] || ''}">${esc(r.status)}</span></div></div>
      <div class="small muted">${esc(D.itemName(s, r.item, 'Item not in catalogue'))} · ${fnum(num(r.qty), 0)} ${esc(r.unit || 'unit')} · ${esc(D.ventureName(s, r.venture))}</div>
      <div class="row mt" style="gap:6px;flex-wrap:wrap"><span class="badge">${(r.quotes || []).length} quote${(r.quotes || []).length === 1 ? '' : 's'}</span>${r.need ? `<span class="badge">need by ${fmtDate(r.need)}</span>${D.OPEN_RFQ.includes(r.status) ? dueBadge(r.need) : ''}` : ''}</div>
      ${cheap ? `<p class="small" style="margin:10px 0 0">Cheapest landed: <b>${esc(cheap.q.supplierName)}</b> at ${b} ${fnum(cheap.landedUnit, 2)} per ${esc(r.unit || 'unit')}${ev.best && ev.best !== cheap ? `; best overall: <b>${esc(ev.best.q.supplierName)}</b>` : ''}</p>` : `<p class="small muted" style="margin:10px 0 0">No quotes yet.</p>`}</div>`;
  }).join('')}</div>`
  : s.rfqs.length ? `<div class="empty">Nothing under this filter.</div>`
  : emptyState('No requests yet', 'A request for quotes describes what you need and how many. Add each supplier\'s offer to it and the engine puts them on a like-for-like landed cost and scores them against what matters to you.', `<div class="mt"><button class="btn primary" data-act="newRfq">${icon('plus')} Start the first request</button></div>`)}`;
}

function cmpHTML(s, r) {
  const b = store.base();
  const ev = D.evaluateRfq(s, r);
  if (!ev.rows.length) return emptyState('No quotes yet', 'Add each supplier\'s offer. Include freight and other costs for the whole order so the totals compare.', `<div class="mt"><button class="btn primary" data-act="newQuote">${icon('plus')} Add a quote</button></div>`);
  const awarded = r.status === 'Awarded';
  const incoterms = new Set(ev.rows.map((x) => x.q.incoterm).filter(Boolean));
  const histUsed = ev.rows.some((x) => x.q._hist);
  const rows = ev.ranked;
  const po = s.orders.find((o) => o.rfq === r.id);
  return `
  ${awarded ? `<div class="callout green small">Awarded${r.awarded ? ` to <b>${esc(ev.rows.find((x) => x.q.id === r.awarded)?.q.supplierName || 'a supplier')}</b>` : ''}.${po ? ` <a href="#/procure/orders/${esc(po.id)}">Open ${esc(po.number)}</a>` : ''}</div>` : ''}
  ${incoterms.size > 1 ? `<div class="callout gold small">These quotes use different Incoterms (${[...incoterms].join(', ')}). The comparison only holds if each quote's freight and other costs cover everything the supplier's price leaves out.</div>` : ''}
  <div class="card"><div class="card-head"><h3>Landed-cost comparison</h3><div class="right"><span class="small muted">${b}, for ${fnum(num(r.qty), 0)} ${esc(r.unit || 'unit')}</span></div></div>
    <div class="table-wrap"><table><thead><tr><th>Supplier</th><th class="num">Unit price</th><th class="num">MOQ</th><th class="num">Lead</th><th class="num">Goods</th><th class="num">Freight</th><th class="num">Duty</th><th class="num">Other</th><th class="num">Landed</th><th class="num">Per unit</th><th class="num">Score</th><th></th></tr></thead><tbody>
    ${rows.map((x) => `<tr class="click" data-act="editQuote" data-id="${esc(x.q.id)}" style="cursor:pointer">
      <td><b>${esc(x.q.supplierName)}</b> ${x === ev.best ? '<span class="badge green">best overall</span>' : ''} ${x === ev.cheapest ? '<span class="badge blue">cheapest</span>' : ''}<div class="small muted">${esc(x.q.incoterm || '')}${x.q.paymentTerms ? ` · ${esc(x.q.paymentTerms)}` : ''}</div></td>
      <td class="num">${fnum(num(x.q.price), 2)} ${esc(x.q.ccy || '')}</td><td class="num ${x.moqShort ? 'neg' : ''}">${x.q.moq ? fnum(num(x.q.moq), 0) : '—'}</td><td class="num">${x.q.leadDays ? `${fnum(num(x.q.leadDays), 0)} d` : '—'}</td>
      <td class="num">${fnum(x.goods, 0)}</td><td class="num">${fnum(x.freight, 0)}</td><td class="num">${fnum(x.duty, 0)}</td><td class="num">${fnum(x.other, 0)}</td>
      <td class="num"><b>${fnum(x.landedTotal, 0)}</b></td><td class="num">${fnum(x.landedUnit, 2)}</td><td class="num"><b>${x.total}</b></td>
      <td class="num">${awarded ? (r.awarded === x.q.id ? '<span class="badge green">awarded</span>' : '') : `<button class="btn sm" data-act="awardQuote" data-id="${esc(x.q.id)}">Award</button>`}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted" style="margin-bottom:0">Duty is ${pct(D.P(s).dutyRate, 1)} of goods plus freight unless a quote overrides it. Import VAT is ${D.P(s).vatRecoverable ? 'left out (recoverable)' : `included at ${pct(D.P(s).vatRate, 1)}`}. Each quote's freight and other costs are the figures you entered, in ${b}. ${histUsed ? 'Where a quote left reliability blank, the supplier\'s on-time record from past orders was used.' : ''}</p></div>
  <div class="grid g2 mt" style="align-items:start">
    <div class="card"><div class="card-head"><h3>Scores out of 100</h3></div>${barsHTML(rows.map((x) => ({ label: x.q.supplierName, value: x.total, display: String(x.total) })), { max: 100 })}
      <p class="small muted" style="margin-bottom:0">Weighted by the sliders above: ${M.CRITERIA.map(([k, l]) => `${l.toLowerCase()} ${num((r.weights || M.DEFAULT_WEIGHTS)[k] ?? M.DEFAULT_WEIGHTS[k])}`).join(', ')}. A score is a way to think, not a verdict: check the supplier's vetting before awarding.</p></div>
    <div class="card"><div class="card-head"><h3>Negotiation levers</h3></div>
      ${ev.levers.length ? `<ul class="small" style="margin:0;padding-left:18px">${ev.levers.map((l) => `<li style="margin-bottom:6px">${esc(l)}</li>`).join('')}</ul>` : '<div class="small muted">No obvious levers. Ask every supplier for their best and final price and their payment-term flexibility.</div>'}</div>
  </div>`;
}

function rfqDetail(s, id) {
  const r = rfqOf(s, id);
  if (!r) return `<div class="callout red">That request was not found. ${back('Back to sourcing', '#/procure/sourcing')}</div>`;
  const w = { ...M.DEFAULT_WEIGHTS, ...(r.weights || {}) };
  const it = D.itemById(s, r.item);
  return `
  <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:14px">${back('All requests', '#/procure/sourcing')}<div class="right row" style="gap:8px;flex-wrap:wrap">
    <select class="pill-select" data-change="rfqStatus" aria-label="Status">${D.RFQ_STATUS.map((x) => `<option ${x === r.status ? 'selected' : ''}>${x}</option>`).join('')}</select>
    <button class="btn" data-act="editRfq">Edit request</button><button class="btn" data-act="askRfq">${icon('spark')} Ask Claude to sense-check</button><button class="btn primary" data-act="newQuote">${icon('plus')} Add a quote</button></div></div>
  <div class="card"><div class="card-head"><h2 style="margin:0;font-size:20px">${esc(r.title)}</h2><div class="right"><span class="badge ${D.rfqTone[r.status] || ''}">${esc(r.status)}</span></div></div>
    <div class="grid g4" style="margin:0"><div><div class="small muted">Item</div><b>${it ? `<a href="#/procure/items/${esc(it.id)}">${esc(it.name)}</a>` : 'Not in the catalogue'}</b></div>
      <div><div class="small muted">Quantity</div><b>${fnum(num(r.qty), 0)} ${esc(r.unit || 'unit')}</b></div><div><div class="small muted">Venture</div><b>${esc(D.ventureName(s, r.venture))}</b></div>
      <div><div class="small muted">Decide by</div><b>${r.need ? fmtDate(r.need) : '—'}</b> ${D.OPEN_RFQ.includes(r.status) ? dueBadge(r.need) : ''}</div></div>
    ${r.specs ? `<p class="small" style="margin:12px 0 0;white-space:pre-wrap"><span class="muted">Specification: </span>${esc(r.specs)}</p>` : ''}</div>
  <div class="card mt"><div class="card-head"><h3>What matters most</h3><div class="right"><button class="btn sm ghost" data-act="resetWeights">Reset</button></div></div>
    <div class="grid g3" id="rfq-weights" style="margin:0">${M.CRITERIA.map(([k, l]) => `<div class="field"><label>${esc(l)} <b>${w[k]}</b></label><input type="range" min="0" max="60" step="5" value="${w[k]}" data-input="weight" data-k="${k}"></div>`).join('')}</div></div>
  <div class="mt" id="rfq-cmp">${cmpHTML(s, r)}</div>`;
}

function rfqForm(r, preset = {}) {
  openForm({ title: r ? 'Edit request' : 'New request for quotes', wide: true, values: { ...(r || {}), ...preset }, fields: [
    { k: 'title', label: 'What are you buying?', full: true, placeholder: 'e.g. Full-grain leather for the first 50 bags' },
    { k: 'item', label: 'Catalogue item', type: 'select', options: () => D.itemOpts(store.get()), hint: 'Quotes then feed this item\'s price book' },
    { k: 'venture', label: 'Venture', type: 'select', options: () => D.ventureOpts(store.get()) },
    { k: 'qty', label: 'Quantity', type: 'number', required: true }, { k: 'unit', label: 'Unit', type: 'select', options: D.UNITS, default: 'unit' },
    { k: 'need', label: 'Decide by', type: 'date', hint: 'Shows on your deadlines' }, { k: 'status', label: 'Status', type: 'select', options: D.RFQ_STATUS, default: 'Open' },
    { k: 'specs', label: 'Specification, delivery point and anything the supplier must meet', type: 'textarea' },
  ], onSave: (d) => {
    const it = D.itemById(store.get(), d.item);
    const title = d.title || (it ? `RFQ: ${it.name}` : '');
    if (!title) { toast('Add a title or choose a catalogue item', 'error'); return false; }
    const id = r?.id || uid('rfq');
    store.update((st) => {
      if (r) Object.assign(st.rfqs.find((x) => x.id === r.id), { ...d, title, updated: today() });
      else st.rfqs.push({ id, title, item: d.item, venture: d.venture || it?.venture || '', qty: d.qty, unit: d.unit || it?.unit || 'unit', need: d.need, status: d.status, specs: d.specs || it?.spec || '', quotes: [], weights: { ...M.DEFAULT_WEIGHTS }, awarded: '', created: today(), updated: today() });
    });
    if (!r) location.hash = `#/procure/sourcing/${id}`;
  }, onDelete: r ? () => { store.remove('rfqs', r.id); location.hash = '#/procure/sourcing'; } : null });
}

function quoteForm(r, q) {
  const s = store.get(); const b = store.base();
  const it = D.itemById(s, r.item);
  openForm({ title: q ? 'Edit quote' : 'Add a quote', wide: true, values: { ...(q || {}), dutyPct: q && q.dutyRate !== '' && q.dutyRate != null ? Math.round(q.dutyRate * 10000) / 100 : '' }, fields: [
    { k: 'supplier', label: 'Supplier', type: 'select', options: () => D.supplierOpts(store.get()), hint: 'Add suppliers in the Suppliers tab' }, { k: 'supplierName', label: 'Or type a name', hint: 'If not in the register yet' },
    { k: 'price', label: 'Unit price', type: 'number', required: true }, { k: 'ccy', label: 'Currency', type: 'select', options: () => store.currencies(), default: it?.ccy || 'USD' },
    { k: 'incoterm', label: 'Price basis (Incoterm)', type: 'select', options: D.INCOTERM_CODES, default: 'FOB' }, { k: 'moq', label: 'Minimum order quantity', type: 'number' },
    { k: 'leadDays', label: 'Lead time (days)', type: 'number', hint: 'Order to ready for shipment' }, { k: 'validUntil', label: 'Quote valid until', type: 'date' },
    { k: 'freightTotal', label: `Freight for this order (${b})`, type: 'number', hint: 'Whole quantity, to where you need it' }, { k: 'otherTotal', label: `Other costs (${b})`, type: 'number', hint: 'Tooling, packaging, inspection, origin charges not in the price' },
    { k: 'dutyPct', label: 'Customs duty override (%)', type: 'number', hint: `Blank uses your default of ${pct(D.P(s).dutyRate, 1)}` }, { k: 'depositPct', label: 'Deposit (% upfront)', type: 'number' },
    { k: 'paymentTerms', label: 'Payment terms', full: true, placeholder: 'e.g. 30% deposit, 70% before shipping' },
    { k: 'quality', label: 'Quality, 0 to 10', type: 'number', hint: 'From samples, audit, references' }, { k: 'reliability', label: 'Reliability, 0 to 10', type: 'number', hint: 'Blank uses on-time history, else 5' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ], onSave: (d) => {
    if (!d.supplier && !d.supplierName) { toast('Choose a supplier or type a name', 'error'); return false; }
    const rec = { id: q?.id || uid('qt'), supplier: d.supplier, supplierName: d.supplier ? '' : d.supplierName, price: d.price, ccy: d.ccy, incoterm: d.incoterm, moq: d.moq, leadDays: d.leadDays, freightTotal: d.freightTotal, otherTotal: d.otherTotal,
      dutyRate: d.dutyPct === '' ? '' : d.dutyPct / 100, depositPct: d.depositPct, paymentTerms: d.paymentTerms, validUntil: d.validUntil, quality: d.quality, reliability: d.reliability, notes: d.notes, received: q?.received || today() };
    store.update((st) => {
      const rr = rfqOf(st, r.id);
      const i = rr.quotes.findIndex((x) => x.id === rec.id);
      if (i >= 0) rr.quotes[i] = rec; else rr.quotes.push(rec);
      if (rr.status === 'Draft') rr.status = 'Open';
      if (rr.item) { // every quote is also a data point in the item's price book
        const entry = { item: rr.item, supplier: rec.supplier, date: rec.received, price: rec.price, ccy: rec.ccy, qty: rr.qty, incoterm: rec.incoterm, source: 'Supplier quote', note: `Request: ${rr.title}${rec.supplier ? '' : ` (${rec.supplierName})`}`, quote: rec.id };
        const k = st.prices.findIndex((p) => p.quote === rec.id);
        if (k >= 0) st.prices[k] = { ...st.prices[k], ...entry, source: st.prices[k].source === 'Awarded quote' ? 'Awarded quote' : 'Supplier quote' }; else st.prices.push({ id: uid('pr'), ...entry });
      }
    });
  }, onDelete: q ? () => store.update((st) => { const rr = rfqOf(st, r.id); rr.quotes = rr.quotes.filter((x) => x.id !== q.id); if (rr.awarded === q.id) { rr.awarded = ''; if (rr.status === 'Awarded') rr.status = 'Comparing'; } st.prices = st.prices.filter((p) => p.quote !== q.id); }) : null });
}

// ======================= ORDERS =======================
export function ordersTab(s, params) {
  if (params[1]) return orderDetail(s, params[1]);
  const b = store.base();
  const lanes = ['Draft', 'Sent', 'Confirmed', 'In production', 'Shipped', 'Customs', 'Received'];
  const by = (st) => s.orders.filter((o) => o.status === st);
  const done = s.orders.filter((o) => ['Closed', 'Cancelled'].includes(o.status));
  return `
  <div class="row" style="margin-bottom:14px;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="newPO">${icon('plus')} New purchase order</button><span class="muted small right">Payments and arrival dates on open orders appear on your Command Centre deadlines.</span></div>
  ${s.orders.length ? `<div class="kanban">${lanes.map((st) => `<div class="lane"><div class="lane-head"><span class="dot"></span>${st}<span class="n">${by(st).length}</span></div>
    ${by(st).map((o) => `<div class="vcard" data-act="openPO" data-id="${esc(o.id)}" style="cursor:pointer"><div class="row"><div class="t">${esc(o.number)}</div></div>
      <div class="small muted">${esc(D.supName(s, o.supplier, o.supplierName))}</div>
      <div class="meta"><span class="badge">${compact(D.goodsBase(o), b)}</span>${D.lateOrder(o) ? '<span class="badge red">late</span>' : ''}${o.eta && ['Shipped', 'Customs'].includes(o.status) ? `<span class="badge">ETA ${fmtDate(o.eta, { day: 'numeric', month: 'short' })}</span>` : ''}${D.paidPct(o) ? `<span class="badge green">${Math.round(D.paidPct(o))}% paid</span>` : ''}</div></div>`).join('')}</div>`).join('')}</div>
    ${done.length ? `<div class="card mt"><div class="card-head"><h3>Closed and cancelled</h3></div><div class="list">${done.map((o) => `<div class="list-item click" data-act="openPO" data-id="${esc(o.id)}" style="cursor:pointer"><div class="grow"><b>${esc(o.number)}</b> <span class="muted small">${esc(D.supName(s, o.supplier, o.supplierName))}</span></div><span class="badge ${D.poTone[o.status]}">${esc(o.status)}</span><span class="small">${compact(D.goodsBase(o), b)}</span></div>`).join('')}</div></div>` : ''}`
  : emptyState('No purchase orders yet', 'Award a quote and the engine drafts the order with its payment schedule, or start one by hand. An order tracks payments, shipping, receipt and the true landed cost.', `<div class="mt"><button class="btn primary" data-act="newPO">${icon('plus')} New purchase order</button></div>`)}`;
}

function orderDetail(s, id) {
  const o = poOf(s, id);
  if (!o) return `<div class="callout red">That order was not found. ${back('Back to orders', '#/procure/orders')}</div>`;
  const b = store.base(); const ccy = o.ccy || b;
  const goodsB = D.goodsBase(o), cost = D.orderCost(o);
  const pays = o.payments || [];
  const paid = pays.filter((p) => p.paid).reduce((t, p) => t + D.payAmount(o, p), 0);
  const totalPct = pays.reduce((t, p) => t + num(p.pct), 0);
  const idx = FLOW.indexOf(o.status);
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
  const alloc = D.allocateLanded(o);
  const receivedAny = (o.lines || []).some((l) => num(l.received) > 0);
  const rfq = o.rfq ? rfqOf(s, o.rfq) : null;
  return `
  <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:14px">${back('All orders', '#/procure/orders')}<div class="right row" style="gap:8px;flex-wrap:wrap">
    ${o.status === 'Cancelled' ? `<button class="btn" data-act="reopenPO">Reopen as draft</button>` : `${next ? `<button class="btn primary" data-act="advancePO">${next === 'Received' ? 'Receive goods' : `Mark as ${esc(next.toLowerCase())}`}</button>` : ''}`}
    <button class="btn" data-act="editPO">Edit order</button>${!['Cancelled', 'Closed', 'Received'].includes(o.status) ? `<button class="btn ghost" data-act="cancelPO">Cancel order</button>` : ''}</div></div>
  <div class="card"><div class="card-head"><h2 style="margin:0;font-size:20px">${esc(o.number)} · ${esc(D.supName(s, o.supplier, o.supplierName))}</h2><div class="right"><span class="badge ${D.poTone[o.status] || ''}">${esc(o.status)}</span>${D.lateOrder(o) ? '<span class="badge red">late</span>' : ''}</div></div>
    <div class="small muted">${esc(D.ventureName(s, o.venture))} · ordered ${fmtDate(o.orderDate)} · ${esc(o.incoterm || '')}${rfq ? ` · from <a href="#/procure/sourcing/${esc(rfq.id)}">${esc(rfq.title)}</a>` : ''}</div></div>
  <div class="grid g4 mt">
    <div class="card kpi"><div class="label">Goods</div><div class="value">${compact(goodsB, b)}</div><div class="delta">${ccy === b ? '&nbsp;' : `${money(D.goodsCcy(o), ccy)} at today's rate`}</div></div>
    <div class="card kpi hero"><div class="label">Landed cost</div><div class="value gold">${compact(cost, b)}</div><div class="delta">goods, freight, duty and other, ex VAT</div></div>
    <div class="card kpi"><div class="label">Paid</div><div class="value">${compact(paid, b)}</div><div class="delta">${Math.round(D.paidPct(o))}% of the order</div></div>
    <div class="card kpi"><div class="label">Arrival</div><div class="value">${o.eta ? fmtDate(o.eta, { day: 'numeric', month: 'short' }) : '—'}</div><div class="delta ${D.lateOrder(o) ? 'down' : ''}">${o.receivedDate ? `received ${fmtDate(o.receivedDate)}` : o.eta ? (daysUntil(o.eta) < 0 ? `${-daysUntil(o.eta)} days past ETA` : `in ${daysUntil(o.eta)} days`) : 'no ETA set'}${o.tracking ? ` · ${esc(o.tracking)}` : ''}</div></div></div>
  <div class="grid g2 mt" style="align-items:start">
    <div class="card"><div class="card-head"><h3>Order lines</h3><div class="right"><button class="btn sm" data-act="newLine">${icon('plus')} Add line</button></div></div>
      ${(o.lines || []).length ? `<div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Total</th><th class="num">Received</th></tr></thead><tbody>
      ${o.lines.map((l, i) => `<tr class="click" data-act="editLine" data-i="${i}" style="cursor:pointer"><td>${esc(l.desc || D.itemName(s, l.item))}</td><td class="num">${fnum(num(l.qty), 0)}</td><td class="num">${fnum(num(l.unitPrice), 2)}</td><td class="num">${fnum(num(l.qty) * num(l.unitPrice), 0)}</td><td class="num ${num(l.received) && num(l.received) < num(l.qty) ? 'neg' : ''}">${num(l.received) ? fnum(num(l.received), 0) : '—'}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3">Goods (${esc(ccy)})</td><td class="num">${fnum(D.goodsCcy(o), 0)}</td><td></td></tr></tfoot></table></div>` : '<div class="empty small">Add what you are buying.</div>'}</div>
    <div class="card"><div class="card-head"><h3>Payment schedule</h3><div class="right"><button class="btn sm" data-act="newPay">${icon('plus')} Add</button></div></div>
      ${pays.length ? pays.map((p, i) => `<div class="check-item ${p.paid ? 'done' : ''}"><input type="checkbox" ${p.paid ? 'checked' : ''} data-change="togglePay" data-i="${i}" aria-label="Paid"><div class="txt"><b>${esc(p.label)}</b> · ${num(p.pct)}% · ${money(D.payAmount(o, p), b)}<div class="small muted">${p.paid ? `paid ${p.paidDate ? fmtDate(p.paidDate) : ''}` : p.due ? `due ${fmtDate(p.due)}` : 'no due date: add one so it reaches your deadlines'} ${!p.paid ? dueBadge(p.due) : ''}</div></div><button class="btn sm ghost" data-act="editPay" data-i="${i}">Edit</button></div>`).join('') : '<div class="empty small">No payments scheduled.</div>'}
      ${pays.length && Math.round(totalPct) !== 100 ? `<div class="callout gold small mt">The payments add up to ${fnum(totalPct, 0)}%, not 100%.</div>` : ''}
      <p class="small muted" style="margin:10px 0 0">Prefer a small deposit and the balance after inspection. Pay through escrow or a documentary method where you can.</p></div></div>
  <div class="card mt"><div class="card-head"><h3>True landed cost</h3><div class="right"><button class="btn sm" data-act="editPO">Enter freight and duty</button></div></div>
    ${alloc.length ? `<div class="table-wrap"><table><thead><tr><th>Line</th><th class="num">Goods</th><th class="num">Freight, duty and other (share)</th><th class="num">Landed</th><th class="num">Per unit${receivedAny ? ' (received)' : ''}</th></tr></thead><tbody>
    ${alloc.map((a) => `<tr><td>${esc(a.line.desc || D.itemName(s, a.line.item))}</td><td class="num">${fnum(a.goods, 0)}</td><td class="num">${fnum(a.extra, 0)}</td><td class="num">${fnum(a.landed, 0)}</td><td class="num"><b>${fnum(a.perUnit, 2)}</b></td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total (${b})</td><td class="num">${fnum(goodsB, 0)}</td><td class="num">${fnum(num(o.freight) + num(o.duty) + num(o.otherCosts), 0)}</td><td class="num">${fnum(cost, 0)}</td><td></td></tr></tfoot></table></div>
    <p class="small muted" style="margin-bottom:0">Freight ${fnum(num(o.freight), 0)}, duty ${fnum(num(o.duty), 0)}, other ${fnum(num(o.otherCosts), 0)} (${b}), shared out by each line's share of the goods value. Import VAT is left out: ${D.P(s).vatRecoverable ? 'it is recoverable on your return' : 'add it to Other if you cannot recover it'}.${num(o.freight) + num(o.duty) + num(o.otherCosts) === 0 ? ' No freight or duty entered yet, so this is the goods cost alone.' : ''}</p>` : '<div class="empty small">Add lines to see the landed cost.</div>'}</div>
  ${o.notes ? `<div class="card mt"><div class="card-head"><h3>Notes</h3></div><p class="small" style="margin:0;white-space:pre-wrap">${esc(o.notes)}</p></div>` : ''}
  ${o.status === 'Received' || o.status === 'Closed' ? `<div class="card mt"><div class="card-head"><h3>Delivery record</h3><div class="right"><button class="btn sm" data-act="receivePO">Edit receipt</button></div></div><div class="small">Received ${o.receivedDate ? fmtDate(o.receivedDate) : '—'}${o.eta && o.receivedDate ? ` against an ETA of ${fmtDate(o.eta)} (${o.receivedDate <= o.eta ? 'on time' : `${Math.round((new Date(o.receivedDate) - new Date(o.eta)) / 86400000)} days late`})` : ''}. Quality ${o.quality !== '' && o.quality != null ? `${num(o.quality)}/10` : 'not rated'}. This feeds the supplier's scorecard.</div></div>` : ''}`;
}

function poForm(o) {
  openForm({ title: o ? `Edit ${o.number}` : 'New purchase order', wide: true, values: o || { number: D.nextPO(store.get()), status: 'Draft', orderDate: today(), ccy: 'USD', incoterm: 'FOB' }, fields: [
    { k: 'number', label: 'PO number', required: true }, { k: 'status', label: 'Status', type: 'select', options: D.PO_STATUS },
    { k: 'supplier', label: 'Supplier', type: 'select', options: () => D.supplierOpts(store.get()) }, { k: 'venture', label: 'Venture', type: 'select', options: () => D.ventureOpts(store.get()) },
    { k: 'orderDate', label: 'Order date', type: 'date' }, { k: 'ccy', label: 'Currency of unit prices', type: 'select', options: () => store.currencies() },
    { k: 'incoterm', label: 'Price basis (Incoterm)', type: 'select', options: D.INCOTERM_CODES },
    { k: 'freight', label: `Freight (${store.base()})`, type: 'number', hint: 'Actual or estimated, whole order' }, { k: 'duty', label: `Customs duty (${store.base()})`, type: 'number' }, { k: 'otherCosts', label: `Other costs (${store.base()})`, type: 'number', hint: 'Inspection, handling, brokerage' },
    { k: 'etd', label: 'Departure date (ETD)', type: 'date' }, { k: 'eta', label: 'Arrival date (ETA)', type: 'date' },
    { k: 'tracking', label: 'Tracking or container number', full: true }, { k: 'notes', label: 'Notes', type: 'textarea' },
  ], onSave: (d) => {
    const id = o?.id || uid('po');
    store.update((st) => {
      if (o) { const t = poOf(st, o.id); Object.assign(t, d, { supplierName: d.supplier ? '' : t.supplierName }); D.setValue(t); }
      else st.orders.push(D.setValue({ id, ...d, rfq: '', supplierName: '', lines: [], payments: [], receivedDate: '', quality: '', created: today() }));
    });
    if (!o) location.hash = `#/procure/orders/${id}`;
  }, onDelete: o ? () => { store.remove('orders', o.id); location.hash = '#/procure/orders'; } : null });
}

function lineForm(o, i) {
  const l = i != null ? o.lines[i] : null;
  openForm({ title: l ? 'Edit line' : 'Add a line', values: l || {}, fields: [
    { k: 'item', label: 'Catalogue item', type: 'select', options: () => D.itemOpts(store.get()) }, { k: 'desc', label: 'Description', full: true, hint: 'Leave blank to use the catalogue name' },
    { k: 'qty', label: 'Quantity', type: 'number', required: true }, { k: 'unitPrice', label: `Unit price (${o.ccy || store.base()})`, type: 'number', required: true },
    ...(l ? [{ k: 'received', label: 'Received so far', type: 'number' }] : []),
  ], onSave: (d) => {
    store.update((st) => {
      const t = poOf(st, o.id);
      const rec = { item: d.item, desc: d.desc || D.itemName(st, d.item, ''), qty: d.qty, unitPrice: d.unitPrice, received: l ? num(d.received) : 0 };
      if (l) t.lines[i] = rec; else t.lines.push(rec);
      D.setValue(t);
    });
  }, onDelete: l ? () => store.update((st) => { const t = poOf(st, o.id); t.lines.splice(i, 1); D.setValue(t); }) : null });
}

function payForm(o, i) {
  const p = i != null ? o.payments[i] : null;
  const used = (o.payments || []).reduce((t, x, k) => t + (k === i ? 0 : num(x.pct)), 0);
  openForm({ title: p ? 'Edit payment' : 'Add a payment', values: p || { label: used ? 'Balance' : 'Deposit', pct: Math.max(0, 100 - used), due: o.eta || '' }, fields: [
    { k: 'label', label: 'What is it for?', required: true, full: true, placeholder: 'Deposit, balance before shipping, freight…' }, { k: 'pct', label: '% of goods value', type: 'number', required: true },
    { k: 'due', label: 'Due date', type: 'date', hint: 'Shows on your deadlines until paid' }, { k: 'paid', label: 'Paid', type: 'checkbox', text: 'Already paid' },
  ], onSave: (d) => store.update((st) => {
    const t = poOf(st, o.id); const rec = { label: d.label, pct: d.pct, due: d.due, paid: !!d.paid, paidDate: d.paid ? (p?.paidDate || today()) : '' };
    t.payments ||= []; if (p) t.payments[i] = rec; else t.payments.push(rec);
  }), onDelete: p ? () => store.update((st) => { poOf(st, o.id).payments.splice(i, 1); }) : null });
}

function receiveForm(o) {
  const lines = o.lines || [];
  openForm({ title: `Receive goods: ${o.number}`, wide: true, saveLabel: 'Record receipt', intro: '<p class="small muted" style="margin-top:0">Enter what actually arrived. A short delivery stays visible on the order, and the on-time and quality results feed the supplier\'s scorecard.</p>',
    values: { receivedDate: o.receivedDate || today(), quality: o.quality, logPrices: true, updateStock: true, ...Object.fromEntries(lines.map((l, i) => [`r${i}`, num(l.received) || num(l.qty)])) }, fields: [
      { k: 'receivedDate', label: 'Date received', type: 'date', required: true }, { k: 'quality', label: 'Quality of the goods, 0 to 10', type: 'number', hint: 'Against specification and samples' },
      ...lines.map((l, i) => ({ k: `r${i}`, label: `Received: ${l.desc || D.itemName(store.get(), l.item)} (ordered ${fnum(num(l.qty), 0)})`, type: 'number', full: true })),
      { k: 'updateStock', label: 'Stock levels', type: 'checkbox', text: 'Add received quantities to catalogue stock', full: true },
      { k: 'logPrices', label: 'Price book', type: 'checkbox', text: 'Record the invoiced unit prices', full: true },
    ], onSave: (d) => {
      store.update((st) => {
        const t = poOf(st, o.id);
        t.lines.forEach((l, i) => {
          const qty = num(d[`r${i}`]); const delta = qty - num(l.received);
          l.received = qty;
          const it = D.itemById(st, l.item);
          if (d.updateStock && it && delta) it.stock = Math.max(0, num(it.stock) + delta);
          if (d.logPrices && it && !st.prices.some((p) => p.po === `${t.id}:${i}`)) st.prices.push({ id: uid('pr'), item: l.item, supplier: t.supplier, date: d.receivedDate, price: l.unitPrice, ccy: t.ccy, qty: l.qty, incoterm: t.incoterm, source: 'Invoice', note: `${t.number}`, po: `${t.id}:${i}` });
        });
        t.receivedDate = d.receivedDate; t.quality = d.quality;
        if (['Draft', 'Sent', 'Confirmed', 'In production', 'Shipped', 'Customs'].includes(t.status)) t.status = 'Received';
        D.setValue(t);
        const short = t.lines.filter((l) => num(l.received) < num(l.qty)).length;
        if (short) setTimeout(() => toast(`${short} line${short === 1 ? '' : 's'} delivered short`, 'error'), 50);
      });
    } });
}

// ======================= ACTIONS =======================
const rfqId = (params) => params[1];
export const flowActions = {
  // sourcing
  rfqFilter(el) { rfqFilter = el.value; store.update(() => {}); },
  openRfq(el) { location.hash = `#/procure/sourcing/${el.dataset.id}`; },
  newRfq(el) {
    const it = el.dataset.item ? D.itemById(store.get(), el.dataset.item) : null;
    rfqForm(null, it ? { item: it.id, title: `RFQ: ${it.name}`, unit: it.unit, venture: it.venture, specs: it.spec } : {});
  },
  editRfq(el, _, params) { rfqForm(rfqOf(store.get(), rfqId(params))); },
  rfqStatus(el, _, params) { store.update((st) => { const r = rfqOf(st, rfqId(params)); r.status = el.value; if (el.value !== 'Awarded') r.awarded = ''; }); },
  newQuote(el, _, params) { quoteForm(rfqOf(store.get(), rfqId(params))); },
  editQuote(el, _, params) { const r = rfqOf(store.get(), rfqId(params)); quoteForm(r, r.quotes.find((x) => x.id === el.dataset.id)); },
  weight(el, _, params) {
    store.update((st) => { const r = rfqOf(st, rfqId(params)); r.weights = { ...M.DEFAULT_WEIGHTS, ...(r.weights || {}), [el.dataset.k]: num(el.value) }; }, { render: false });
    el.closest('.field').querySelector('b').textContent = el.value;
    const s = store.get(); const box = document.getElementById('rfq-cmp'); if (box) box.innerHTML = cmpHTML(s, rfqOf(s, rfqId(params)));
  },
  resetWeights(el, _, params) { store.update((st) => { rfqOf(st, rfqId(params)).weights = { ...M.DEFAULT_WEIGHTS }; }); },
  async awardQuote(el, _, params) {
    const s = store.get(); const r = rfqOf(s, rfqId(params)); const q = r.quotes.find((x) => x.id === el.dataset.id);
    const row = D.evaluateRfq(s, r).rows.find((x) => x.q.id === q.id);
    const name = D.supName(s, q.supplier, q.supplierName);
    if (!(await confirmBox(`Award this request to ${name}? This drafts a purchase order you can edit. Nothing is sent to the supplier.`, 'Award and draft the order'))) return;
    const dep = num(q.depositPct); const eta = q.leadDays ? addDays(today(), num(q.leadDays)) : '';
    const payments = dep > 0 && dep < 100 ? [{ label: 'Deposit', pct: dep, due: today(), paid: false }, { label: 'Balance', pct: 100 - dep, due: eta, paid: false }] : [{ label: 'Full payment', pct: 100, due: eta, paid: false }];
    const id = uid('po');
    store.update((st) => {
      const rr = rfqOf(st, r.id); rr.status = 'Awarded'; rr.awarded = q.id;
      let sid = q.supplier || '';
      if (!sid && q.supplierName) { // a typed name joins the register so the order feeds a supplier scorecard
        const nm = q.supplierName.trim();
        const found = st.suppliers.find((x) => x.name.toLowerCase() === nm.toLowerCase());
        sid = found ? found.id : uid('sup');
        if (!found) st.suppliers.push({ id: sid, name: nm, category: '', country: '', checks: {}, notes: `Added when awarding "${r.title}". Complete the details and vet them before paying a deposit.`, updated: today() });
        const qq = rr.quotes.find((x) => x.id === q.id); qq.supplier = sid; qq.supplierName = '';
        st.prices.forEach((p) => { if (p.quote === q.id) p.supplier = sid; });
      }
      st.orders.push(D.setValue({ id, number: D.nextPO(st), supplier: sid, supplierName: '', rfq: r.id, venture: r.venture || '', status: 'Draft', orderDate: today(), ccy: q.ccy, incoterm: q.incoterm,
        lines: [{ item: r.item || '', desc: D.itemName(st, r.item, r.title), qty: num(r.qty), unitPrice: num(q.price), received: 0 }], freight: num(q.freightTotal), duty: Math.round(row?.duty || 0), otherCosts: num(q.otherTotal), payments,
        etd: '', eta, receivedDate: '', quality: '', tracking: '', notes: `Drafted from the awarded quote in "${r.title}". Duty is an estimate and payment dates are planning dates: confirm them.`, created: today() }));
      const k = st.prices.findIndex((p) => p.quote === q.id); if (k >= 0) st.prices[k].source = 'Awarded quote';
    });
    toast('Order drafted: check the dates and duty', 'ok');
    location.hash = `#/procure/orders/${id}`;
  },
  askRfq(el, _, params) {
    const s = store.get(); const r = rfqOf(s, rfqId(params)); const ev = D.evaluateRfq(s, r); const b = store.base();
    const lines = ev.rows.map((x) => `- ${x.q.supplierName}: ${x.q.price} ${x.q.ccy} per ${r.unit || 'unit'} (${x.q.incoterm}), MOQ ${x.q.moq || 'unknown'}, lead ${x.q.leadDays || 'unknown'} days, deposit ${x.q.depositPct || 0}%, landed about ${b} ${fnum(x.landedUnit, 2)} per unit`).join('\n');
    K.addToQueue({ type: 'research', priority: 'Normal', domain: 'Business & Ventures', venture: r.venture || '', title: `Procurement check: ${r.title}`,
      question: `Sense-check these supplier quotes before the owner awards the order.\nItem: ${D.itemName(s, r.item, r.title)}; quantity ${r.qty} ${r.unit || 'unit'}.\nSpecification: ${r.specs || 'not given'}\nQuotes (unverified, entered by the owner):\n${lines || '(none yet)'}\nBenchmark the unit price against public sources with dates, flag anything unusual, list due-diligence checks for each supplier type and country, and note UAE import requirements (HS code, duty, certification). Cite sources, and say what is unverified. Update or create a wiki article and link it to [[Procurement Fundamentals: Landed Cost, Incoterms and Negotiation]].` });
    queueMsg();
  },
  // orders
  openPO(el) { location.hash = `#/procure/orders/${el.dataset.id}`; },
  newPO() { poForm(null); },
  editPO(el, _, params) { poForm(poOf(store.get(), params[1])); },
  newLine(el, _, params) { lineForm(poOf(store.get(), params[1])); },
  editLine(el, _, params) { lineForm(poOf(store.get(), params[1]), +el.dataset.i); },
  newPay(el, _, params) { payForm(poOf(store.get(), params[1])); },
  editPay(el, _, params) { payForm(poOf(store.get(), params[1]), +el.dataset.i); },
  togglePay(el, _, params) { store.update((st) => { const p = poOf(st, params[1]).payments[+el.dataset.i]; p.paid = el.checked; p.paidDate = el.checked ? today() : ''; }); },
  receivePO(el, _, params) { receiveForm(poOf(store.get(), params[1])); },
  advancePO(el, _, params) {
    const o = poOf(store.get(), params[1]);
    const nx = FLOW[FLOW.indexOf(o.status) + 1];
    if (nx === 'Received') { receiveForm(o); return; }
    store.update((st) => { const t = poOf(st, o.id); t.status = nx; if (nx === 'Sent' && !t.orderDate) t.orderDate = today(); });
  },
  async cancelPO(el, _, params) { if (await confirmBox('Cancel this order? Scheduled payments will stop appearing on your deadlines.', 'Cancel order')) store.update((st) => { poOf(st, params[1]).status = 'Cancelled'; }); },
  reopenPO(el, _, params) { store.update((st) => { poOf(st, params[1]).status = 'Draft'; }); },
};
