// Procurement: Logistics (landed cost, freight modes, containers) and Tools (reorder maths, volume discounts, payment terms, should-cost, make vs buy).
import * as store from '../store.js';
import { esc, num, fnum, pct } from '../ui.js';
import * as M from '../procure-math.js';

const P = (s) => s.settings.procure;
const grp = (s, g) => (P(s)[g] ||= {});
const v = (o, k, d = '') => (o[k] === undefined || o[k] === '' ? d : o[k]);
const n2 = (x) => (Number.isFinite(x) ? fnum(x, 2) : '—');
const n0 = (x) => (Number.isFinite(x) ? fnum(x, 0) : '—');

function inp(s, g, k, label, { unit = '', hint = '', d = '', full = false } = {}) {
  const val = v(grp(s, g), k, d);
  return `<div class="field ${full ? 'full' : ''}"><label>${esc(label)}${unit ? ` <span class="muted">(${esc(unit)})</span>` : ''}</label><input type="number" step="any" value="${esc(val)}" data-input="tool" data-g="${g}" data-k="${k}">${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;
}
function sel(s, g, k, label, options, { hint = '', d = '' } = {}) {
  const cur = String(v(grp(s, g), k, d));
  return `<div class="field"><label>${esc(label)}</label><select data-input="tool" data-g="${g}" data-k="${k}">${options.map((o) => { const ov = typeof o === 'object' ? o.v : o, ol = typeof o === 'object' ? o.l : o; return `<option value="${esc(ov)}" ${String(ov) === cur ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;
}
const row = (l, val, cls = '') => `<tr><td>${l}</td><td class="num ${cls}">${val}</td></tr>`;
const out = (g, html) => `<div id="out-${g}">${html}</div>`;

// ---------- Result renderers ----------
export const RESULTS = {
  landed(s) {
    const g = grp(s, 'landed'), b = store.base(), p = P(s);
    const goods = store.toBase(num(g.goods), g.ccy || b);
    const r = M.landedCost({ goods, qty: num(g.qty) || 1, origin: num(g.origin), freight: num(g.freight), insurance: num(g.insurance), destination: num(g.destination), inspection: num(g.inspection), other: num(g.other),
      dutyRate: num(v(g, 'dutyPct', p.dutyRate * 100)) / 100, vatRate: num(v(g, 'vatPct', p.vatRate * 100)) / 100, vatRecoverable: (g.vat || (p.vatRecoverable ? 'rec' : 'cost')) === 'rec' });
    const term = M.INCOTERMS.find((t) => t.code === (g.incoterm || 'FOB'));
    return `<div class="card"><div class="card-head"><h3>Landed cost</h3><div class="right"><span class="badge gold">+${Number.isFinite(r.uplift) ? Math.round(r.uplift * 100) : 0}% on goods</span></div></div>
      <div class="table-wrap"><table><tbody>
        ${row('Goods', `${b} ${n2(r.goods)}`)}${row('Origin charges, freight and insurance', `${b} ${n2(r.cif - r.goods)}`)}
        ${row('<b>CIF value (duty base)</b>', `<b>${b} ${n2(r.cif)}</b>`)}${row('Customs duty', `${b} ${n2(r.duty)}`)}
        ${row('Destination handling, inspection, other', `${b} ${n2(r.local)}`)}
        ${row(`Import VAT ${(g.vat || (p.vatRecoverable ? 'rec' : 'cost')) === 'rec' ? '<span class="muted small">(recoverable: cash only)</span>' : '<span class="muted small">(a cost)</span>'}`, `${b} ${n2(r.vat)}`)}
      </tbody><tfoot><tr><td>Landed cost</td><td class="num">${b} ${n2(r.landed)}</td></tr></tfoot></table></div>
      <div class="calc-out"><div class="o"><div class="l">Landed per unit</div><div class="v">${n2(r.perUnit)}</div></div><div class="o"><div class="l">Goods per unit</div><div class="v">${n2(r.goodsPerUnit)}</div></div><div class="o"><div class="l">Cash to find at the border</div><div class="v">${n0(r.cashOut)}</div></div></div>
      ${term ? `<div class="mt small"><b>${term.code}: ${esc(term.name)}</b> <span class="muted">· risk passes at ${esc(term.risk)}</span><div class="row" style="gap:4px;flex-wrap:wrap;margin:6px 0">${M.COST_STAGES.map((st, i) => `<span class="badge ${term.row[i] === 'S' ? 'green' : 'gold'}" title="${esc(st)}">${esc(st)}: ${term.row[i] === 'S' ? 'seller' : 'you'}</span>`).join('')}</div><div class="muted">${esc(term.note)}</div></div>` : ''}
    </div>`;
  },
  modes(s) {
    const g = grp(s, 'modes'), b = store.base(), p = P(s);
    const r = M.compareModes({ weightKg: num(g.weightKg), cbm: num(g.cbm), goodsValue: num(g.goodsValue), capitalRate: num(v(g, 'capPct', p.capitalRate * 100)) / 100, modes: [
      { name: 'Sea (LCL, per tonne or CBM)', basis: 'wm', rate: num(g.seaRate), minCharge: num(g.seaMin), days: num(v(g, 'seaDays', 30)) },
      { name: 'Sea (full container, flat)', basis: 'flat', rate: num(g.fclRate), days: num(v(g, 'fclDays', 28)) },
      { name: 'Air freight (per kg)', basis: 'kg', rate: num(g.airRate), kgPerCbm: M.AIR_KG_PER_CBM, days: num(v(g, 'airDays', 7)) },
      { name: 'Express courier (per kg)', basis: 'kg', rate: num(g.expRate), kgPerCbm: M.EXPRESS_KG_PER_CBM, days: num(v(g, 'expDays', 4)) },
    ] });
    const used = r.rows.filter((x) => x.freight > 0);
    if (!used.length) return `<div class="card"><div class="empty small">Enter weight, volume and at least one forwarder rate to compare modes.</div></div>`;
    const sea = r.rows[0].freight > 0 ? r.rows[0] : r.rows[1].freight > 0 ? r.rows[1] : null, air = r.rows[2].freight > 0 ? r.rows[2] : null;
    const speed = sea && air && sea.days > air.days ? `Air costs ${b} ${n0(air.total - sea.total)} ${air.total > sea.total ? 'more' : 'less'} in total than sea and arrives ${sea.days - air.days} days sooner: ${air.total > sea.total ? `${b} ${n0((air.total - sea.total) / (sea.days - air.days))} per day saved` : 'air wins outright'}.` : '';
    return `<div class="card"><div class="card-head"><h3>Total cost of each mode</h3></div>
      <div class="table-wrap"><table><thead><tr><th>Mode</th><th class="num">Chargeable</th><th class="num">Freight</th><th class="num">Capital in transit</th><th class="num">Total</th><th class="num">Days</th></tr></thead><tbody>
      ${r.rows.map((x) => (x.freight > 0 ? `<tr><td>${esc(x.name)} ${x === r.cheapest ? '<span class="badge green">cheapest</span>' : ''} ${x === r.fastest ? '<span class="badge blue">fastest</span>' : ''}</td><td class="num">${x.basis === 'flat' ? '1 container' : x.basis === 'wm' ? `${fnum(x.units, 2)} t/m³` : `${fnum(x.units, 0)} kg`}</td><td class="num">${n0(x.freight)}</td><td class="num">${n0(x.holding)}</td><td class="num"><b>${n0(x.total)}</b></td><td class="num">${x.days}</td></tr>` : '')).join('')}</tbody></table></div>
      ${speed ? `<p class="small" style="margin-bottom:0">${esc(speed)}</p>` : ''}
      <p class="small muted" style="margin-bottom:0">Volumetric weight: air at ${M.AIR_KG_PER_CBM} kg per m³, express at ${M.EXPRESS_KG_PER_CBM} kg per m³. Capital in transit is interest on the goods value for the days the stock is on the water or in the air. Rates are yours: enter forwarder quotes.</p></div>`;
  },
  cont(s) {
    const g = grp(s, 'cont');
    const r = M.containerFill({ l: num(g.l), w: num(g.w), h: num(g.h), cartonKg: num(g.kg), unitsPerCarton: num(g.units) || 1, container: g.container || '40HC', fillPct: num(v(g, 'fill', 85)) / 100 });
    if (!r.cartons) return `<div class="card"><div class="empty small">Enter the carton size and weight.</div></div>`;
    return `<div class="card"><div class="card-head"><h3>${esc(r.c.name)}</h3><div class="right"><span class="badge ${r.limit === 'weight' ? 'gold' : 'blue'}">${r.limit}-limited</span></div></div>
      <div class="calc-out"><div class="o"><div class="l">Cartons</div><div class="v">${fnum(r.cartons, 0)}</div></div><div class="o"><div class="l">Units</div><div class="v">${fnum(r.units, 0)}</div></div><div class="o"><div class="l">Volume used</div><div class="v">${pct(r.volUse, 0)}</div></div><div class="o"><div class="l">Weight used</div><div class="v">${pct(r.weightUse, 0)}</div></div></div>
      <p class="small muted" style="margin-bottom:0">${fnum(r.byVolume, 0)} cartons fit by volume and ${fnum(r.byWeight, 0)} by weight. ${r.limit === 'weight' ? 'The container fills by weight before it fills by space: dense goods suit a smaller box or an air shipment of part of the order.' : 'The container fills by space before the weight limit: consider smaller cartons or a different carton layout.'} Container figures are approximate (${fnum(r.c.vol, 1)} m³ internal, ${fnum(r.c.payload, 0)} kg payload); confirm with the carrier.</p></div>`;
  },
  eoq(s) {
    const g = grp(s, 'eoq');
    const r = M.inventoryPlan({ D: num(g.D), S: num(g.S), c: num(g.c), h: num(v(g, 'hPct', 20)) / 100, leadDays: num(g.leadDays), sigmaDaily: num(g.sigma), service: num(v(g, 'service', 95)) });
    if (!Number.isFinite(r.Q)) return `<div class="card"><div class="empty small">Enter annual demand, cost per order and unit cost.</div></div>`;
    return `<div class="card"><div class="card-head"><h3>Order plan</h3></div><div class="calc-out">
      <div class="o"><div class="l">Order quantity (EOQ)</div><div class="v">${n0(r.Q)}</div></div><div class="o"><div class="l">Orders per year</div><div class="v">${fnum(r.ordersPerYear, 1)}</div></div><div class="o"><div class="l">Every</div><div class="v">${n0(r.cycleDays)} days</div></div>
      <div class="o"><div class="l">Safety stock</div><div class="v">${n0(r.safety)}</div></div><div class="o"><div class="l">Reorder point</div><div class="v">${n0(r.rop)}</div></div><div class="o"><div class="l">Daily demand</div><div class="v">${fnum(r.daily, 1)}</div></div></div>
      <div class="table-wrap mt"><table><tbody>${row('Purchases per year', n0(r.purchase))}${row('Ordering cost per year', n0(r.ordering))}${row('Holding cost per year', n0(r.holding))}</tbody><tfoot><tr><td>Total annual cost</td><td class="num">${n0(r.total)}</td></tr></tfoot></table></div>
      <p class="small muted" style="margin-bottom:0">Reorder when stock falls to ${n0(r.rop)}: that covers demand during the ${num(g.leadDays) || 0}-day lead time plus a safety buffer for ${num(v(g, 'service', 95))}% service. EOQ assumes steady demand; round to your carton or pallet size.</p></div>`;
  },
  disc(s) {
    const g = grp(s, 'disc');
    const breaks = [1, 2, 3, 4].map((i) => ({ qty: num(g[`q${i}`]), price: num(g[`p${i}`]) })).filter((x) => x.price > 0);
    const r = M.discountAnalysis({ D: num(g.D), S: num(g.S), h: num(v(g, 'hPct', 20)) / 100, breaks });
    if (!r.rows.length || !num(g.D)) return `<div class="card"><div class="empty small">Enter annual demand and at least one price break.</div></div>`;
    return `<div class="card"><div class="card-head"><h3>Which price break is cheapest overall?</h3></div>
      <div class="table-wrap"><table><thead><tr><th>From qty</th><th class="num">Price</th><th class="num">Order qty</th><th class="num">Purchases</th><th class="num">Ordering</th><th class="num">Holding</th><th class="num">Total / year</th></tr></thead><tbody>
      ${r.rows.map((x) => `<tr><td>${n0(x.qty)} ${x === r.best ? '<span class="badge green">best</span>' : ''}</td><td class="num">${n2(x.price)}</td><td class="num">${n0(x.Q)}</td><td class="num">${n0(x.purchase)}</td><td class="num">${n0(x.ordering)}</td><td class="num">${n0(x.holding)}</td><td class="num"><b>${n0(x.total)}</b></td></tr>`).join('')}</tbody></table></div>
      <p class="small muted" style="margin-bottom:0">The lowest unit price is not always the cheapest total: a bigger order raises holding cost and ties up cash. Check storage space and shelf life before choosing a bigger break.</p></div>`;
  },
  terms(s) {
    const g = grp(s, 'terms');
    const ep = M.earlyPayReturn({ disc: num(g.disc) / 100, discDays: num(g.discDays), netDays: num(g.netDays) });
    const dc = M.depositCost({ depositPct: num(g.depositPct) / 100, days: num(g.depositDays), annualRate: num(v(g, 'rate', P(s).capitalRate * 100)) / 100 });
    return `<div class="card"><div class="card-head"><h3>What payment terms really cost</h3></div><div class="calc-out">
      <div class="o"><div class="l">Early-pay discount = annual return of</div><div class="v">${Number.isFinite(ep) ? pct(ep, 1) : '—'}</div></div><div class="o"><div class="l">Cost of the deposit, % of order</div><div class="v">${dc ? pct(dc, 2) : '—'}</div></div></div>
      <p class="small muted" style="margin-bottom:0">${Number.isFinite(ep) ? `Taking the discount earns ${pct(ep, 0)} a year on the cash. If that beats your cost of capital (${num(v(g, 'rate', P(s).capitalRate * 100))}%), pay early. ` : ''}A deposit paid long before shipment is an interest-free loan to the supplier: shorten the gap or trade it for a lower price.</p></div>`;
  },
  should(s) {
    const g = grp(s, 'should');
    const r = M.shouldCost({ material: num(g.material), labour: num(g.labour), overhead: num(g.overhead), marginPct: num(v(g, 'marginPct', 15)) / 100, quote: num(g.quote) });
    if (!r.direct) return `<div class="card"><div class="empty small">Enter material, labour and overhead per unit.</div></div>`;
    return `<div class="card"><div class="card-head"><h3>Should-cost</h3>${g.quote ? `<div class="right"><span class="badge ${r.gap > 0 ? 'gold' : 'green'}">${r.gap > 0 ? 'quote above' : 'quote at or below'} should-cost</span></div>` : ''}</div><div class="calc-out">
      <div class="o"><div class="l">Direct cost</div><div class="v">${n2(r.direct)}</div></div><div class="o"><div class="l">Should-cost with margin</div><div class="v">${n2(r.should)}</div></div>
      ${g.quote ? `<div class="o"><div class="l">Quote gap</div><div class="v">${n2(r.gap)} (${pct(r.gapPct, 0)})</div></div><div class="o"><div class="l">Supplier margin implied</div><div class="v">${pct(r.impliedMargin, 0)}</div></div>` : ''}</div>
      <p class="small muted" style="margin-bottom:0">Break the product into material, labour and overhead from a teardown or supplier quotes, then use the gap as your negotiating headroom. Your inputs are estimates: a wide gap is a question to ask, not proof of overcharging.</p></div>`;
  },
  mvb(s) {
    const g = grp(s, 'mvb');
    const r = M.makeVsBuy({ fixed: num(g.fixed), varCost: num(g.varCost), buyPrice: num(g.buyPrice), qty: num(g.qty) });
    if (!num(g.buyPrice)) return `<div class="card"><div class="empty small">Enter the buy price and the make costs.</div></div>`;
    return `<div class="card"><div class="card-head"><h3>Make or buy</h3><div class="right"><span class="badge ${r.prefer === 'make' ? 'green' : 'blue'}">${r.prefer} at ${n0(num(g.qty))} units</span></div></div><div class="calc-out">
      <div class="o"><div class="l">Break-even quantity</div><div class="v">${Number.isFinite(r.breakeven) ? n0(r.breakeven) : 'Never'}</div></div><div class="o"><div class="l">Make total</div><div class="v">${n0(r.makeTotal)}</div></div><div class="o"><div class="l">Buy total</div><div class="v">${n0(r.buyTotal)}</div></div></div>
      <p class="small muted" style="margin-bottom:0">Above the break-even quantity, making beats buying on cost alone. Consider capacity, quality, skills and the risk of being locked in.</p></div>`;
  },
};

// ---------- Tabs ----------
export function logisticsTab(s) {
  const b = store.base();
  const ccys = store.currencies();
  const incoterms = M.INCOTERMS.map((t) => ({ v: t.code, l: `${t.code}: ${t.name}` }));
  return `
  <div class="callout gold small">Logistics maths uses your own quotes: nothing here is a live rate. Ask two forwarders for door-to-door quotes and enter them below. Transit days are planning defaults you can change.</div>
  <h2 class="mt" style="font-size:18px">Landed cost calculator</h2>
  <div class="grid g2" style="align-items:start"><div class="card"><div class="form">
    ${inp(s, 'landed', 'goods', 'Goods value')}${sel(s, 'landed', 'ccy', 'Quoted in', ccys, { d: b })}
    ${inp(s, 'landed', 'qty', 'Quantity', { unit: 'units' })}${sel(s, 'landed', 'incoterm', 'Quote basis (Incoterm)', incoterms, { d: 'FOB', hint: 'What the supplier price includes' })}
    ${inp(s, 'landed', 'origin', 'Origin charges', { unit: b, hint: 'Pick-up, export clearance, port charges (if not in the price)' })}${inp(s, 'landed', 'freight', 'Main freight', { unit: b })}
    ${inp(s, 'landed', 'insurance', 'Insurance', { unit: b })}${inp(s, 'landed', 'destination', 'Destination handling and delivery', { unit: b, hint: 'Port or airport fees, customs broker, local trucking' })}
    ${inp(s, 'landed', 'inspection', 'Inspection and testing', { unit: b })}${inp(s, 'landed', 'other', 'Other', { unit: b })}
    ${inp(s, 'landed', 'dutyPct', 'Customs duty', { unit: '%', d: P(s).dutyRate * 100, hint: 'Most goods are 5% of CIF in the UAE. Some differ: check your HS code.' })}${inp(s, 'landed', 'vatPct', 'Import VAT', { unit: '%', d: P(s).vatRate * 100 })}
    ${sel(s, 'landed', 'vat', 'Import VAT', [{ v: 'rec', l: 'Recoverable (VAT-registered)' }, { v: 'cost', l: 'A cost (not registered)' }], { d: P(s).vatRecoverable ? 'rec' : 'cost' })}
  </div></div>${out('landed', RESULTS.landed(s))}</div>

  <h2 class="mt" style="font-size:18px">Freight: sea, air or express?</h2>
  <div class="grid g2" style="align-items:start"><div class="card"><div class="form">
    ${inp(s, 'modes', 'weightKg', 'Shipment weight', { unit: 'kg' })}${inp(s, 'modes', 'cbm', 'Shipment volume', { unit: 'm³' })}
    ${inp(s, 'modes', 'goodsValue', 'Goods value', { unit: b })}${inp(s, 'modes', 'capPct', 'Cost of capital', { unit: '% a year', d: P(s).capitalRate * 100 })}
    ${inp(s, 'modes', 'seaRate', 'Sea LCL rate', { unit: `${b} per tonne or m³` })}${inp(s, 'modes', 'seaDays', 'Sea LCL door-to-door', { unit: 'days', d: 30 })}
    ${inp(s, 'modes', 'seaMin', 'Sea LCL minimum charge', { unit: b })}${inp(s, 'modes', 'fclRate', 'Full container rate', { unit: `${b} flat` })}
    ${inp(s, 'modes', 'fclDays', 'Full container door-to-door', { unit: 'days', d: 28 })}${inp(s, 'modes', 'airRate', 'Air rate', { unit: `${b} per kg` })}
    ${inp(s, 'modes', 'airDays', 'Air door-to-door', { unit: 'days', d: 7 })}${inp(s, 'modes', 'expRate', 'Express rate', { unit: `${b} per kg` })}
    ${inp(s, 'modes', 'expDays', 'Express door-to-door', { unit: 'days', d: 4 })}
  </div></div>${out('modes', RESULTS.modes(s))}</div>

  <h2 class="mt" style="font-size:18px">Container fill</h2>
  <div class="grid g2" style="align-items:start"><div class="card"><div class="form">
    ${inp(s, 'cont', 'l', 'Carton length', { unit: 'cm' })}${inp(s, 'cont', 'w', 'Carton width', { unit: 'cm' })}${inp(s, 'cont', 'h', 'Carton height', { unit: 'cm' })}
    ${inp(s, 'cont', 'kg', 'Carton weight', { unit: 'kg' })}${inp(s, 'cont', 'units', 'Units per carton')}
    ${sel(s, 'cont', 'container', 'Container', M.CONTAINERS.map((c) => ({ v: c.id, l: c.name })), { d: '40HC' })}${inp(s, 'cont', 'fill', 'Practical fill', { unit: '%', d: 85, hint: 'Loading gaps and pallets' })}
  </div></div>${out('cont', RESULTS.cont(s))}</div>

  <div class="card mt"><div class="card-head"><h3>Incoterms 2020: who pays what</h3></div>
    <div class="table-wrap"><table><thead><tr><th>Term</th>${M.COST_STAGES.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>
    ${M.INCOTERMS.map((t) => `<tr><td><b>${t.code}</b> <span class="muted small">${esc(t.mode === 'Sea' ? 'sea only' : 'any mode')}</span></td>${[...t.row].map((c) => `<td style="color:var(--${c === 'S' ? 'green' : 'gold'})">${c === 'S' ? 'Seller' : 'You'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="small muted" style="margin-bottom:0">A simplification for planning. The named place, the contract and local rules change who pays; for the full rules read the ICC's Incoterms 2020. Under CFR, CIF, CPT and CIP, risk passes early even though the seller pays the freight: insure the goods.</p></div>`;
}

export function toolsTab(s) {
  const b = store.base();
  return `
  <div class="callout gold small">Procurement is a maths problem: the cheapest unit price is rarely the cheapest decision. Every calculator keeps your inputs.</div>
  <h2 class="mt" style="font-size:18px">How much to order, and when</h2>
  <div class="grid g2" style="align-items:start"><div class="card"><div class="form">
    ${inp(s, 'eoq', 'D', 'Annual demand', { unit: 'units' })}${inp(s, 'eoq', 'S', 'Cost of placing an order', { unit: b, hint: 'Admin, inspection, freight minimums' })}
    ${inp(s, 'eoq', 'c', 'Unit cost (landed)', { unit: b })}${inp(s, 'eoq', 'hPct', 'Holding cost', { unit: '% of cost a year', d: 20, hint: 'Capital, storage, insurance, spoilage' })}
    ${inp(s, 'eoq', 'leadDays', 'Lead time', { unit: 'days' })}${inp(s, 'eoq', 'sigma', 'Daily demand variation', { unit: 'units (std. dev.)', hint: 'Zero if demand is steady' })}
    ${sel(s, 'eoq', 'service', 'Service level', Object.keys(M.Z_SCORES).map((k) => ({ v: k, l: `${k}%` })), { d: '95' })}
  </div></div>${out('eoq', RESULTS.eoq(s))}</div>

  <h2 class="mt" style="font-size:18px">Volume discounts</h2>
  <div class="grid g2" style="align-items:start"><div class="card"><div class="form">
    ${inp(s, 'disc', 'D', 'Annual demand', { unit: 'units' })}${inp(s, 'disc', 'S', 'Cost of placing an order', { unit: b })}${inp(s, 'disc', 'hPct', 'Holding cost', { unit: '% a year', d: 20 })}<div></div>
    ${[1, 2, 3, 4].map((i) => `${inp(s, 'disc', `q${i}`, `Break ${i}: from quantity`)}${inp(s, 'disc', `p${i}`, `Break ${i}: unit price`, { unit: b })}`).join('')}
  </div></div>${out('disc', RESULTS.disc(s))}</div>

  <h2 class="mt" style="font-size:18px">Payment terms</h2>
  <div class="grid g2" style="align-items:start"><div class="card"><div class="form">
    ${inp(s, 'terms', 'disc', 'Early-payment discount', { unit: '%', hint: 'For example 2 in 2/10 net 30' })}${inp(s, 'terms', 'discDays', 'Discount if paid within', { unit: 'days' })}
    ${inp(s, 'terms', 'netDays', 'Otherwise due in', { unit: 'days' })}${inp(s, 'terms', 'rate', 'Your cost of capital', { unit: '% a year', d: P(s).capitalRate * 100 })}
    ${inp(s, 'terms', 'depositPct', 'Deposit', { unit: '% of order' })}${inp(s, 'terms', 'depositDays', 'Paid before shipping by', { unit: 'days' })}
  </div></div>${out('terms', RESULTS.terms(s))}</div>

  <h2 class="mt" style="font-size:18px">Should-cost and make vs buy</h2>
  <div class="grid g2" style="align-items:start"><div class="stack"><div class="card"><div class="card-head"><h3>Should-cost inputs</h3></div><div class="form">
    ${inp(s, 'should', 'material', 'Materials per unit', { unit: b })}${inp(s, 'should', 'labour', 'Labour per unit', { unit: b })}${inp(s, 'should', 'overhead', 'Overhead per unit', { unit: b })}
    ${inp(s, 'should', 'marginPct', 'Fair supplier margin', { unit: '%', d: 15 })}${inp(s, 'should', 'quote', 'Supplier quote per unit', { unit: b })}
  </div></div>${out('should', RESULTS.should(s))}</div>
  <div class="stack"><div class="card"><div class="card-head"><h3>Make vs buy inputs</h3></div><div class="form">
    ${inp(s, 'mvb', 'fixed', 'Fixed cost to make', { unit: b, hint: 'Tools, set-up, equipment' })}${inp(s, 'mvb', 'varCost', 'Variable cost per unit', { unit: b })}
    ${inp(s, 'mvb', 'buyPrice', 'Buy price per unit', { unit: b })}${inp(s, 'mvb', 'qty', 'Quantity', { unit: 'units' })}
  </div></div>${out('mvb', RESULTS.mvb(s))}</div></div>`;
}

export const toolActions = {
  tool(el) {
    const g = el.dataset.g, k = el.dataset.k;
    store.update((s) => { grp(s, g)[k] = el.value; }, { render: false });
    const box = document.getElementById(`out-${g}`);
    if (box && RESULTS[g]) box.innerHTML = RESULTS[g](store.get());
  },
};
