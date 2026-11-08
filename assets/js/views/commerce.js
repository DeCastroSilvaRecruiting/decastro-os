import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, uid, openForm, toast, today, num, money, compact, pct, fnum, tabsHTML, lineChart } from '../ui.js';
import { amazonEconomics, verdict, productScore, simulate, PRODUCT_RUBRIC, KILL_FLAGS, AMAZON_AE } from '../ecom.js';
import { AUTOMATION, LEVELS, weeklyHours } from '../playbooks.js';
import { allIdeas } from './ideas.js';

export const STAGES = ['Lead', 'Scored', 'Quoting', 'Sampling', 'Ordered', 'Live', 'Winner', 'Dropped'];
const stageTone = { Lead: '', Scored: 'blue', Quoting: 'blue', Sampling: 'violet', Ordered: 'gold', Live: 'green', Winner: 'green', Dropped: 'red' };
const CATEGORIES = [
  { v: '', l: 'Choose a category preset…' },
  { v: '15', l: 'Home, kitchen, apparel, shoes, luggage (15%)' },
  { v: '10', l: 'Sports & outdoors, tools, toys, office, most others (10%)' },
  { v: '15b', l: 'Beauty, health, baby, pet above AED 50 (15%)' },
  { v: '7', l: 'Electronics & accessories (7%)' },
  { v: '6', l: 'Computers & major appliances (6%)' },
];
const SUPPLIER_CHECKS = [
  ['licence', 'Business licence verified and the name matches the factory'],
  ['factory', 'A factory, or a trading company that says so openly'],
  ['escrow', 'Escrow or Trade Assurance payment is available'],
  ['audit', 'Factory audit or live video tour completed'],
  ['samples', 'Samples received and inspected'],
  ['refs', 'References or past export clients to the Gulf, Europe or US'],
  ['terms', 'Deposit of 30% or less, balance after inspection'],
  ['ip', 'No-copy, tooling and packaging ownership agreed in writing'],
  ['inspect', 'Third-party inspection accepted before shipment'],
  ['comms', 'Answers in English within 24 hours'],
];
let tab = 'pipeline';

const ecomVenture = (s) => s.ventures.find((v) => v.playbook === 'ecom');
const E = (s) => s.settings.ecom;
const scratch = (s) => (E(s).scratch ||= { name: 'Scratchpad', stage: 'Lead', costCcy: 'USD', storageMonths: 2, returnRate: 5, acos: 15, scores: {}, flags: {} });
const productById = (s, id) => (id === 'scratch' || !id ? scratch(s) : s.products.find((p) => p.id === id));

export function calc(p, s) {
  const e = E(s);
  return amazonEconomics({
    price: num(p.price), unitCost: store.toBase(p.unitCost, p.costCcy || 'USD'), freightUnit: num(p.freightUnit), qcUnit: num(p.qcUnit),
    dutyRate: e.dutyRate, vatRate: e.vatRate, vatRegistered: e.vatRegistered, referralPct: num(p.referralPct) / 100,
    fbaFee: num(p.fbaFee), cubicFt: num(p.cubicFt), storageMonths: num(p.storageMonths), storageRate: e.storageRate,
    returnRate: num(p.returnRate) / 100, acos: num(p.acos) / 100, otherUnit: num(p.otherUnit), qty: num(p.qty), salesPerMonth: num(p.salesPerMonth),
  });
}

// ---------- Results panel (re-rendered live as inputs change) ----------
function resultsHTML(p, s) {
  const b = store.base(), e = calc(p, s), v = verdict(e), sc = productScore(p);
  const row = (l, val, cls = '') => `<tr><td>${l}</td><td class="num ${cls}">${Number.isFinite(val) ? money(val, b, 2) : '—'}</td></tr>`;
  const factory = store.toBase(p.unitCost, p.costCcy || 'USD');
  return `
  <div class="card"><div class="card-head"><h3>Result per unit</h3><div class="right"><span class="badge ${v.tone}">${v.label}</span></div></div>
    <p class="muted small" style="margin-top:0">${esc(v.why)}</p>
    <div class="table-wrap"><table><tbody>
      ${row('Net revenue' + (E(s).vatRegistered ? ' (after 5% VAT)' : ''), e.netRevenue)}
      ${row(`Landed cost <span class="muted small">(factory ${fnum(factory, 2)} + freight + QC + duty${E(s).vatRegistered ? '' : ' + import VAT'})</span>`, -e.landed, 'neg')}
      ${row('Amazon referral fee', -e.referral, 'neg')}${row('FBA fulfilment fee', -e.fba, 'neg')}${row('Storage', -e.storage, 'neg')}
      ${row('Returns allowance', -e.returns, 'neg')}${e.other ? row('Other costs', -e.other, 'neg') : ''}
      <tr><td><b>Contribution before ads</b></td><td class="num"><b>${Number.isFinite(e.contribution) ? money(e.contribution, b, 2) : '—'}</b></td></tr>
      ${row('Advertising', -e.ppc, 'neg')}
    </tbody><tfoot><tr><td>Net profit per unit</td><td class="num ${e.profit >= 0 ? 'pos' : 'neg'}">${money(e.profit, b, 2)}</td></tr></tfoot></table></div>
    <div class="calc-out">
      <div class="o"><div class="l">Net margin</div><div class="v">${pct(e.margin, 0)}</div></div>
      <div class="o"><div class="l">Return on stock</div><div class="v">${pct(e.roi, 0)}</div></div>
      <div class="o"><div class="l">Revenue ÷ landed cost</div><div class="v">${Number.isFinite(e.priceMultiple) ? fnum(e.priceMultiple, 1) + 'x' : '—'}</div></div>
      <div class="o"><div class="l">Break-even ad cost</div><div class="v">${pct(e.breakevenAcos, 0)}</div></div>
      <div class="o"><div class="l">First order cash</div><div class="v">${e.firstOrder ? money(e.firstOrder, b) : '—'}</div></div>
      <div class="o"><div class="l">Profit per month</div><div class="v">${e.monthlyProfit ? money(e.monthlyProfit, b) : '—'}</div></div>
      <div class="o"><div class="l">Payback on first order</div><div class="v">${Number.isFinite(e.paybackMonths) ? fnum(e.paybackMonths, 1) + ' mo' : '—'}</div></div>
      <div class="o"><div class="l">Stock cover</div><div class="v">${Number.isFinite(e.daysOfStock) ? fnum(e.daysOfStock, 0) + ' days' : '—'}</div></div>
    </div>
    ${E(s).vatRegistered && e.importVat ? `<p class="small muted">Import VAT of ${money(e.importVat, b, 2)} per unit is paid at the border and recovered on your VAT return: a cash-flow cost, not a profit cost.</p>` : ''}
    <p class="small muted" style="margin-bottom:0">Referral fee is applied to the shelf price including VAT, the cautious reading. Fee levels and the duty rate are editable defaults: check Amazon's live fee page before ordering.</p>
  </div>
  <div class="card"><div class="card-head"><h3>Opportunity score</h3><div class="right"><span class="score-ring" style="font-size:28px">${sc.total}</span><span class="muted">/100</span></div></div>
    ${sc.killed ? `<div class="callout red small">Red flag${sc.flags.length > 1 ? 's' : ''}: ${sc.flags.map((f) => `<b>${esc(f.label)}</b> (${esc(f.why)})`).join(' ')} Drop it unless the flag is resolved.</div>` : sc.total >= 70 ? '<div class="callout green small">Strong lead. Move to quotes and samples.</div>' : '<div class="muted small">Rate the criteria below. A lead needs 70 or more, no red flags and a Strong or Workable margin.</div>'}
  </div>`;
}

function field(label, k, p, { type = 'number', hint = '', unit = '' } = {}) {
  return `<div class="field"><label>${esc(label)}${unit ? ` <span class="muted">(${unit})</span>` : ''}</label><input type="${type}" step="any" value="${esc(p[k] ?? '')}" data-input="calc" data-k="${k}">${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;
}

function calcTab(s, params) {
  const id = params[1] || 'scratch';
  const p = productById(s, id);
  if (!p) return `<div class="empty"><h3>Product not found</h3><a href="#/commerce/pipeline">Back to the pipeline</a></div>`;
  const e = E(s);
  const isScratch = id === 'scratch';
  const sel = [['scratch', 'Scratchpad (quick what-if)'], ...s.products.map((x) => [x.id, x.name])];
  return `
  <div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:12px">
    <select class="pill-select" data-change="pick" aria-label="Product">${sel.map(([k, l]) => `<option value="${esc(k)}" ${k === id ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
    ${isScratch ? `<button class="btn sm" data-act="saveScratch">${icon('plus')} Save to the pipeline</button>` : `<button class="btn sm" data-act="editProduct" data-id="${esc(p.id)}">${icon('edit')} Details</button><span class="badge ${stageTone[p.stage]}">${esc(p.stage)}</span>${p.url ? `<a class="small" href="${esc(p.url)}" target="_blank" rel="noopener">Supplier listing</a>` : ''}`}
  </div>
  <div class="grid g2" style="align-items:start">
    <div class="stack">
      <div class="card"><div class="card-head"><h3>Selling</h3></div><div class="form">
        ${field('Shelf price', 'price', p, { unit: store.base(), hint: 'The price shoppers see (VAT-inclusive on Amazon.ae)' })}
        <div class="field"><label>Amazon category</label><select data-change="preset">${CATEGORIES.map((c) => `<option value="${c.v}">${esc(c.l)}</option>`).join('')}</select><div class="hint">Sets the referral fee. Verify on Amazon's fee page. As of ${AMAZON_AE.asOf}.</div></div>
        ${field('Referral fee', 'referralPct', p, { unit: '%' })}${field('Expected sales per month', 'salesPerMonth', p, { unit: 'units', hint: 'At maturity, from competitor data' })}
      </div></div>
      <div class="card"><div class="card-head"><h3>Sourcing</h3></div><div class="form">
        ${field('Factory price per unit', 'unitCost', p)}
        <div class="field"><label>Quoted in</label><select data-input="calcSel" data-k="costCcy">${['USD', 'CNY', 'AED'].map((c) => `<option ${c === (p.costCcy || 'USD') ? 'selected' : ''}>${c}</option>`).join('')}</select><div class="hint">Rates come from Settings. CNY rate is an approximation.</div></div>
        ${field('Freight to FBA per unit', 'freightUnit', p, { unit: store.base(), hint: 'Forwarder quote divided by units' })}${field('Inspection per unit', 'qcUnit', p, { unit: store.base(), hint: 'Inspection fee divided by units' })}
        ${field('First order quantity', 'qty', p, { unit: 'units' })}
      </div></div>
      <div class="card"><div class="card-head"><h3>Amazon costs</h3></div><div class="form">
        ${field('FBA fulfilment fee', 'fbaFee', p, { unit: store.base(), hint: `Check the rate card. ${AMAZON_AE.fba} (${AMAZON_AE.asOf}).` })}
        ${field('Size', 'cubicFt', p, { unit: 'cubic feet' })}${field('Months in stock', 'storageMonths', p)}
        ${field('Returns', 'returnRate', p, { unit: '% of units' })}${field('Advertising', 'acos', p, { unit: '% of price' })}
        ${field('Other cost per unit', 'otherUnit', p, { unit: store.base(), hint: 'Packaging, inserts, certification per unit' })}
      </div></div>
      <div class="card"><div class="card-head"><h3>Tax settings</h3></div><div class="form">
        <div class="field"><label>VAT registered?</label><select data-input="taxSel" data-k="vatRegistered"><option value="0" ${e.vatRegistered ? '' : 'selected'}>No: VAT is a cost</option><option value="1" ${e.vatRegistered ? 'selected' : ''}>Yes: VAT is recovered</option></select><div class="hint">Mandatory above AED 375,000 of taxable supplies in 12 months (as of July 2026).</div></div>
        <div class="field"><label>Customs duty <span class="muted">(%)</span></label><input type="number" step="any" value="${num(e.dutyRate) * 100}" data-input="taxNum" data-k="dutyRate"></div>
        <div class="field"><label>VAT rate <span class="muted">(%)</span></label><input type="number" step="any" value="${num(e.vatRate) * 100}" data-input="taxNum" data-k="vatRate"></div>
        <div class="field"><label>Storage rate <span class="muted">(${store.base()} per cu ft per month)</span></label><input type="number" step="any" value="${num(e.storageRate)}" data-input="taxNum" data-k="storageRate" data-raw="1"></div>
      </div></div>
    </div>
    <div class="stack" style="position:sticky;top:12px">
      <div id="calc-out" class="stack">${resultsHTML(p, s)}</div>
      <div class="card"><div class="card-head"><h3>Score this product</h3></div>
        ${PRODUCT_RUBRIC.map((r) => `<div class="rubric-row" title="${esc(r.hint)}"><span>${esc(r.label)}</span><input type="range" min="0" max="10" step="1" value="${num(p.scores?.[r.k])}" data-input="score" data-k="${r.k}" aria-label="${esc(r.label)}"><b>${num(p.scores?.[r.k])}</b><span class="w">×${r.w}%</span></div>`).join('')}
        <hr><div class="muted small" style="margin-bottom:6px">Red flags (any one is a stop)</div>
        ${KILL_FLAGS.map((f) => `<label class="row" style="margin-bottom:4px"><input type="checkbox" data-input="flag" data-k="${f.k}" ${p.flags?.[f.k] ? 'checked' : ''}> <span class="small">${esc(f.label)}</span></label>`).join('')}
      </div>
    </div>
  </div>`;
}

// ---------- Pipeline ----------
function pipelineTab(s) {
  const b = store.base();
  const rows = s.products.map((p) => ({ p, e: calc(p, s), sc: productScore(p) }));
  const by = (st) => rows.filter((r) => r.p.stage === st);
  const live = rows.filter((r) => ['Live', 'Winner'].includes(r.p.stage));
  const runRate = live.reduce((t, r) => t + (r.e.monthlyProfit || 0), 0);
  const cashIn = rows.filter((r) => ['Ordered'].includes(r.p.stage)).reduce((t, r) => t + (r.e.firstOrder || 0), 0);
  const leads = allIdeas(s).filter((i) => i.kind === 'product' && i.status === 'new');
  return `
  <div class="grid g4">
    <div class="card kpi"><div class="label">In the pipeline</div><div class="value">${rows.filter((r) => r.p.stage !== 'Dropped').length}</div><div class="delta">${by('Lead').length} leads · ${by('Dropped').length} dropped</div></div>
    <div class="card kpi"><div class="label">Live products</div><div class="value">${live.length}</div><div class="delta">${by('Winner').length} winners</div></div>
    <div class="card kpi hero"><div class="label">Profit run-rate</div><div class="value gold">${runRate ? compact(runRate, b) : '—'}</div><div class="delta">per month, from live products' own numbers</div></div>
    <div class="card kpi"><div class="label">Cash in orders</div><div class="value">${cashIn ? compact(cashIn, b) : '—'}</div><div class="delta">first orders on the water</div></div>
  </div>
  ${leads.length ? `<div class="card mt"><div class="card-head"><h3>Claude's scouted leads</h3><div class="right"><span class="badge violet">${leads.length} new</span></div></div>
    <div class="list">${leads.map((i) => `<div class="list-item"><div class="grow"><b>${esc(i.title)}</b><div class="small muted">${esc(i.pitch)}</div>${i.risks ? `<div class="small muted">Watch: ${esc(i.risks)}</div>` : ''}${(i.sources || []).length ? `<div class="small">${i.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || 'source')}</a>`).join(' · ')}</div>` : ''}</div>
      <button class="btn sm" data-act="leadAdd" data-id="${esc(i.id)}">Add to pipeline</button><button class="btn sm ghost" data-act="leadDismiss" data-id="${esc(i.id)}">Dismiss</button></div>`).join('')}</div></div>` : ''}
  <div class="row mt" style="gap:8px"><button class="btn primary" data-act="newProduct">${icon('plus')} Add product lead</button><a class="btn" href="#/commerce/calc/scratch">Open the calculator</a></div>
  ${s.products.length ? `<div class="kanban mt">${STAGES.map((st) => `<div class="lane"><div class="lane-head"><span class="dot"></span>${st}<span class="n">${by(st).length}</span></div>
    ${by(st).sort((a, c) => c.sc.total - a.sc.total).map(({ p, e, sc }) => `<a class="vcard" href="#/commerce/calc/${esc(p.id)}"><div class="row"><div class="t">${esc(p.name)}</div><span class="score-ring">${sc.total}</span></div>
      <div class="meta">${sc.killed ? '<span class="badge red">red flag</span>' : ''}${e.complete ? `<span class="badge ${verdict(e).tone}">${pct(e.margin, 0)} margin</span>` : '<span class="badge">incomplete</span>'}${p.category ? `<span class="badge">${esc(p.category)}</span>` : ''}</div></a>`).join('')}</div>`).join('')}</div>`
    : `<div class="empty mt"><h3>No products yet</h3><div>Add the first 10 leads. Use the scout's weekly leads or browse Amazon.ae best-sellers and new releases, then let the scorecard and calculator kill the weak ones.</div></div>`}`;
}

// ---------- Suppliers ----------
const supScore = (x) => SUPPLIER_CHECKS.filter(([k]) => x.checks?.[k]).length;
function suppliersTab(s) {
  return `
  <div class="row" style="margin-bottom:12px"><button class="btn primary" data-act="newSupplier">${icon('plus')} Add supplier</button><span class="muted small right">Never pay a deposit to a supplier scoring under 6.</span></div>
  ${s.suppliers.length ? `<div class="grid g2">${s.suppliers.map((x) => { const sc = supScore(x); return `<div class="card click" data-act="editSupplier" data-id="${esc(x.id)}" style="cursor:pointer"><div class="card-head"><h3>${esc(x.name)}</h3><div class="right"><span class="badge ${sc >= 8 ? 'green' : sc >= 6 ? 'gold' : 'red'}">${sc}/10 vetted</span></div></div>
    <div class="small muted">${esc([x.platform, x.kind, x.city].filter(Boolean).join(' · '))}</div>
    <div class="mt">${SUPPLIER_CHECKS.map(([k, l]) => `<div class="small" style="color:${x.checks?.[k] ? 'var(--text)' : 'var(--muted)'}">${x.checks?.[k] ? '✓' : '○'} ${esc(l)}</div>`).join('')}</div>
    ${x.notes ? `<p class="small muted" style="margin-bottom:0">${esc(x.notes)}</p>` : ''}</div>`; }).join('')}</div>`
  : `<div class="empty"><h3>No suppliers yet</h3><div>Shortlist three per finalist product from Alibaba, 1688, Global Sources or Made-in-China, then tick the checklist as you verify each point.</div></div>`}
  <div class="card mt"><div class="card-head"><h3>How to vet a Chinese supplier</h3></div>
    <ol class="small" style="margin:0;padding-left:18px"><li>Ask for the business licence and check the name and registration with an independent verification service.</li><li>Prefer a factory; if it is a trading company, know the real factory.</li><li>Pay through escrow or Trade Assurance; keep the deposit small and the balance after inspection.</li><li>Order samples from two or three suppliers and compare.</li><li>Specify your improvements, packaging and labels in writing, with a no-copy and tooling clause.</li><li>Hire a third-party inspector before every shipment.</li></ol></div>`;
}
function supplierForm(x) {
  openForm({ title: x ? 'Edit supplier' : 'New supplier', wide: true, values: { ...(x || {}), ...(x?.checks || {}) }, fields: [
    { k: 'name', label: 'Supplier', required: true }, { k: 'platform', label: 'Found on', type: 'select', options: ['Alibaba', '1688', 'Global Sources', 'Made-in-China', 'Trade fair', 'Referral', 'Other'] },
    { k: 'kind', label: 'Type', type: 'select', options: ['Unknown', 'Factory', 'Trading company'] }, { k: 'city', label: 'City / province' },
    { k: 'url', label: 'Link', full: true }, ...SUPPLIER_CHECKS.map(([k, l]) => ({ k, label: l, type: 'checkbox', text: 'Done', full: true })),
    { k: 'notes', label: 'Notes, contact, MOQ, lead time', type: 'textarea' },
  ], onSave: (d) => {
    const checks = Object.fromEntries(SUPPLIER_CHECKS.map(([k]) => [k, !!d[k]]));
    const rec = { id: x?.id || uid('sup'), name: d.name, platform: d.platform, kind: d.kind, city: d.city, url: d.url, notes: d.notes, checks, updated: today() };
    store.upsert('suppliers', rec);
  }, onDelete: x ? () => store.remove('suppliers', x.id) : null });
}

// ---------- Automation ----------
function automationTab(s) {
  const v = ecomVenture(s);
  if (!v) return `<div class="empty"><h3>No e-commerce venture yet</h3><div>Create one from the <a href="#/ideas">Idea Scout</a>.</div></div>`;
  const lv = v.automation || {}, cost = v.automationCost || {}, b = store.base();
  const mine = weeklyHours(lv), diy = AUTOMATION.reduce((t, f) => t + f.hours, 0);
  const monthly = AUTOMATION.reduce((t, f) => t + num(cost[f.id]), 0);
  return `
  <div class="grid g3">
    <div class="card kpi hero"><div class="label">Your weekly hours (steady state)</div><div class="value gold">${fnum(mine, 1)} h</div><div class="delta">vs ${fnum(diy, 0)} h if you did everything yourself</div></div>
    <div class="card kpi"><div class="label">Monthly running costs you entered</div><div class="value">${monthly ? compact(monthly, b) : '—'}</div><div class="delta">agents, agencies, accountant</div></div>
    <div class="card kpi"><div class="label">Automated or delegated</div><div class="value">${AUTOMATION.filter((f) => (lv[f.id] || f.level) !== 'You').length}/${AUTOMATION.length}</div><div class="delta">functions off your desk</div></div>
  </div>
  <div class="callout gold mt small">Honest note: hours here are a model. Delegated work still needs about 15% of your time to review and Automated about 5%. Setup and each product launch take far more, often several weeks of focused effort per launch before the system runs. Passive here means low-input, not no-input.</div>
  <div class="card flush mt"><div class="table-wrap"><table><thead><tr><th>Function</th><th>Who does it</th><th>How</th><th class="num">Hours if DIY</th><th class="num">Your hours</th><th class="num">Monthly cost (${b})</th></tr></thead><tbody>
    ${AUTOMATION.map((f) => { const l = lv[f.id] || f.level; return `<tr><td><b>${esc(f.name)}</b></td>
      <td><select data-change="level" data-id="${f.id}">${Object.keys(LEVELS).map((k) => `<option ${k === l ? 'selected' : ''}>${k}</option>`).join('')}</select></td>
      <td class="small muted">${esc(f.how)}<div>${esc(f.cost)}</div></td><td class="num">${f.hours}</td><td class="num">${fnum(f.hours * LEVELS[l], 2)}</td>
      <td class="num"><input type="number" step="any" style="width:90px;text-align:right" value="${esc(cost[f.id] ?? '')}" data-input="autoCost" data-id="${f.id}" aria-label="Monthly cost"></td></tr>`; }).join('')}</tbody></table></div></div>`;
}

// ---------- Forecast ----------
const SIM_DEFAULT = { launches: 8, launchEvery: 2, launchAds: 2000, hitRate: 30, unitsPerMonth: 150, rampMonths: 4, leadMonths: 2, flopRecovery: 40, overhead: '', firstOrderCost: '', ref: 'scratch' };
function forecastTab(s) {
  const sim = { ...SIM_DEFAULT, ...(E(s).sim || {}) };
  const ref = productById(s, sim.ref) || scratch(s);
  const e = calc(ref, s), b = store.base(), v = ecomVenture(s);
  const overhead = sim.overhead !== '' ? num(sim.overhead) : (v ? AUTOMATION.reduce((t, f) => t + num(v.automationCost?.[f.id]), 0) : 0);
  const out = runSim(sim, e, overhead);
  const hours = v ? weeklyHours(v.automation) : NaN;
  const ok = e.complete;
  const rows = out.rows;
  const f = (k, label, hint, unit) => `<div class="field"><label>${label}${unit ? ` <span class="muted">(${unit})</span>` : ''}</label><input type="number" step="any" value="${esc(sim[k])}" data-change="sim" data-k="${k}">${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;
  return `
  <div class="callout gold small">This is a what-if model on <b>your own assumptions</b>, not a forecast. The default hit rate assumes most launches fail. Change the inputs and watch the capital you need, the dip in cash, and when the programme breaks even.</div>
  <div class="grid g-main mt" style="align-items:start">
    <div class="stack">
      ${ok ? '' : '<div class="callout red small">The reference product is incomplete, so unit numbers are zero. Complete it in the calculator first.</div>'}
      <div class="grid g4">
        <div class="card kpi hero"><div class="label">Peak cash you need</div><div class="value gold">${compact(out.capitalNeeded, b)}</div><div class="delta">lowest point of cumulative cash</div></div>
        <div class="card kpi"><div class="label">Break-even month</div><div class="value">${out.breakEvenMonth ? 'Month ' + out.breakEvenMonth : 'Not in 24 mo'}</div><div class="delta">cumulative profit turns positive</div></div>
        <div class="card kpi"><div class="label">Monthly profit, month 24</div><div class="value ${out.endMonthlyProfit >= 0 ? 'pos' : 'neg'}">${compact(out.endMonthlyProfit, b)}</div><div class="delta">after overhead</div></div>
        <div class="card kpi"><div class="label">Profit per hour you spend</div><div class="value">${Number.isFinite(hours) && hours > 0 && out.endMonthlyProfit > 0 ? compact(out.endMonthlyProfit / (hours * 4.33), b) : '—'}</div><div class="delta">${Number.isFinite(hours) ? fnum(hours, 1) + ' h/week (Automation tab)' : ''}</div></div>
      </div>
      <div class="card"><div class="card-head"><h3>Cash and cumulative profit</h3></div>
        ${lineChart([{ name: 'Cash balance', points: rows.map((r) => ({ x: 'M' + r.m, y: r.cash })) }, { name: 'Cumulative profit', cls: 'g', points: rows.map((r) => ({ x: '', y: r.cumProfit })) }], { fmtY: (x) => fnum(x / 1000, 0) + 'k' })}</div>
      <div class="card flush"><div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Units sold</th><th class="num">Profit</th><th class="num">Net cash</th><th class="num">Cash balance</th></tr></thead><tbody>
        ${rows.filter((r) => r.m % 3 === 0 || r.m === 1).map((r) => `<tr><td>${r.m}</td><td class="num">${fnum(r.units, 0)}</td><td class="num ${r.profit >= 0 ? 'pos' : 'neg'}">${money(r.profit, b)}</td><td class="num ${r.net >= 0 ? 'pos' : 'neg'}">${money(r.net, b)}</td><td class="num ${r.cash >= 0 ? 'pos' : 'neg'}">${money(r.cash, b)}</td></tr>`).join('')}</tbody></table></div></div>
    </div>
    <div class="card"><div class="card-head"><h3>Assumptions</h3></div><div class="form">
      <div class="field full"><label>Reference product (unit economics come from it)</label><select data-change="sim" data-k="ref">${[['scratch', 'Scratchpad'], ...s.products.map((x) => [x.id, x.name])].map(([k, l]) => `<option value="${esc(k)}" ${k === sim.ref ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      ${f('launches', 'Products launched in total', '', 'count')}${f('launchEvery', 'A new launch every', '', 'months')}
      ${f('hitRate', 'Share of launches that work', 'Assumption. Most fail: stay cautious.', '%')}${f('unitsPerMonth', 'Units per month for a winner', '', 'units')}
      ${f('rampMonths', 'Months to reach full sales', '', 'months')}${f('leadMonths', 'Order-to-shelf lead time', 'Factory + shipping + FBA check-in', 'months')}
      ${f('firstOrderCost', 'First order cost per launch', ok ? `Blank uses the reference first order: ${money(e.firstOrder, b)}` : '', b)}${f('launchAds', 'Launch advertising per product', '', b)}
      ${f('flopRecovery', 'Share of a failed first order recovered', 'Liquidation or removal', '%')}${f('overhead', 'Monthly overhead', 'Blank uses your Automation tab costs', b)}
      <div class="row full" style="gap:6px"><button class="btn sm" data-act="scenario" data-hit="15">Cautious (15%)</button><button class="btn sm" data-act="scenario" data-hit="30">Base (30%)</button><button class="btn sm" data-act="scenario" data-hit="45">Strong (45%)</button></div>
    </div></div>
  </div>`;
}
function runSim(sim, e, overhead) {
  const first = sim.firstOrderCost !== '' ? num(sim.firstOrderCost) : (e.firstOrder || 0);
  return simulate({ months: 24, launchEvery: num(sim.launchEvery) || 1, launches: num(sim.launches), firstOrderCost: first, launchAds: num(sim.launchAds),
    hitRate: num(sim.hitRate) / 100, unitsPerMonth: num(sim.unitsPerMonth), contributionUnit: (e.profit || 0) + (e.landed || 0), landedUnit: e.landed || 0,
    rampMonths: num(sim.rampMonths) || 1, leadMonths: num(sim.leadMonths), flopRecovery: num(sim.flopRecovery) / 100, overhead });
}

// ---------- Rules & fees ----------
function rulesTab(s) {
  const src = [
    ['Amazon Global Selling: cost to sell in the Middle East', 'https://sell.amazon.in/grow-your-business/amazon-global-selling/cost-to-sell-in-middle-east', 'Amazon (official)'],
    ['BusinessDubai.ae: How to sell on Amazon UAE (2026 guide, snapshot of Amazon fees July 2026)', 'https://www.businessdubai.ae/blogs/amazon-fba-business-dubai', 'Setup-services firm: one interpretation'],
    ['SellerSprite: Amazon dropshipping policy, seller-of-record guide', 'https://www.sellersprite.com/en/blog/amazon-dropshipping-policy', 'Secondary summary: read Amazon\'s own policy in Seller Central'],
    ['Epic Sourcing: Import duty and customs from China to the UAE (2026)', 'https://www.epicsourcing.co/post/import-duty-customs-china-to-uae-dubai-2026', 'Freight firm: confirm with Dubai Customs'],
  ];
  return `
  <div class="callout gold small">Rules and fees below are a dated snapshot compiled from the sources at the bottom. Several are vendor articles, so treat them as medium confidence and confirm with Amazon Seller Central, Dubai Customs, the Federal Tax Authority and a licensed adviser before you commit money. This is research, not legal or tax advice.</div>
  <div class="grid g2 mt">
    <div class="card"><div class="card-head"><h3>Amazon.ae fees <span class="badge">${AMAZON_AE.asOf}</span></h3></div>
      <div class="table-wrap"><table><tbody>${AMAZON_AE.referral.map((r) => `<tr><td>${esc(r.cat)}</td><td class="num">${pct(r.pct, 0)}</td></tr>`).join('')}</tbody></table></div>
      <p class="small">FBA fulfilment: ${esc(AMAZON_AE.fba)}. Storage about AED ${AMAZON_AE.storagePerCuFtMonth} per cubic foot per month. Professional plan reported at AED 184 a month, currently waived on Amazon's page as a limited-time offer. Advertising is pay-per-click.</p></div>
    <div class="card"><div class="card-head"><h3>UAE import and tax <span class="badge">${AMAZON_AE.asOf}</span></h3></div>
      <ul class="small" style="margin:0;padding-left:18px"><li>Customs duty: 5% of CIF value for most goods (GCC common tariff).</li><li>Import VAT: 5% on CIF plus duty, recoverable if you are VAT-registered, so about 10.25% of landed value up front.</li><li>VAT registration: mandatory at AED 375,000 of taxable supplies in 12 months; voluntary from AED 187,500.</li><li>Corporate tax: 9% above AED 375,000 of taxable income; free zone 0% applies to qualifying income only and consumer sales may not qualify. Small Business Relief may apply below AED 3 million revenue.</li><li>Importer: Amazon is not the importer of record; you need an importer code with customs.</li></ul></div>
    <div class="card"><div class="card-head"><h3>Seller-of-record rule</h3></div>
      <p class="small" style="margin-top:0">You must be the seller of record. Buying from a supplier who ships a branded parcel or invoice directly to your Amazon customer is prohibited drop shipping and can restrict or end your account. The compliant routes are private label (your brand, FBA) or wholesale and arbitrage from authorised sources. If you use a supplier to ship, their name must not appear anywhere on the parcel or paperwork.</p></div>
    <div class="card"><div class="card-head"><h3>Account-killers to design out</h3></div>
      <ul class="small" style="margin:0;padding-left:18px"><li>Selling branded, patented or design-protected products.</li><li>Gated categories and missing certifications (batteries, electrical, children's, cosmetics, food-contact).</li><li>Incentivised, fake or swapped reviews. Use only Amazon-approved programmes.</li><li>Listing hijackers: register the brand and trademark.</li><li>Inventory stock-outs and inbound errors: use a door-to-FBA forwarder.</li><li>Paying a supplier in full before inspection.</li></ul></div>
  </div>
  <div class="card mt"><div class="card-head"><h3>Sources</h3><div class="right"><button class="btn sm" data-act="verifyRules">${icon('spark')} Ask Claude to verify and extend</button></div></div>
    <ul class="small" style="margin:0;padding-left:18px">${src.map(([t, u, n]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a> <span class="muted">· ${esc(n)} · accessed 8 Nov 2026</span></li>`).join('')}</ul>
    <p class="small muted" style="margin-bottom:0">The wiki article <a href="#/wiki/amazon-fba-from-china-model-rules-and-economics">Amazon FBA from China: model, rules and economics</a> holds the full write-up and is upgraded by Claude each week.</p></div>`;
}

export default {
  title: 'Commerce Lab',
  render(s, params) {
    tab = params[0] || 'pipeline';
    const v = ecomVenture(s);
    return `
    <div class="page-head"><div><div class="eyebrow">Build</div><h1>Commerce Lab</h1>
      <p>The workbench for the China-to-Amazon store: find trending products, kill the weak ones with maths, vet factories, see what runs without you, and model the cash before you spend it.</p></div>
      <div class="actions">${v ? `<a class="btn" href="#/ventures/${esc(v.id)}">${icon('ventures')} Open the venture</a>` : ''}</div></div>
    ${tabsHTML([['pipeline', 'Pipeline'], ['calc', 'Calculator'], ['suppliers', 'Suppliers'], ['automation', 'Automation'], ['forecast', 'Cash forecast'], ['rules', 'Rules & fees']], tab)}
    ${tab === 'calc' ? calcTab(s, params) : tab === 'suppliers' ? suppliersTab(s) : tab === 'automation' ? automationTab(s) : tab === 'forecast' ? forecastTab(s) : tab === 'rules' ? rulesTab(s) : pipelineTab(s)}`;
  },
  actions: {
    tab(el) { location.hash = `#/commerce/${el.dataset.tab}`; },
    pick(el) { location.hash = `#/commerce/calc/${el.value}`; },
    calc: calcAct,
    calcSel: calcAct,
    preset(el, _, params) {
      if (!el.value) return;
      const p = productById(store.get(), params[1]); const pctv = parseFloat(el.value);
      store.update(() => { p.referralPct = pctv; }); // full re-render so the field shows it
    },
    taxSel(el, _, params) { store.update((s) => { E(s).vatRegistered = el.value === '1'; }, { render: false }); refresh(params); },
    taxNum(el, _, params) { store.update((s) => { E(s)[el.dataset.k] = el.dataset.raw ? num(el.value) : num(el.value) / 100; }, { render: false }); refresh(params); },
    score(el, _, params) {
      const p = productById(store.get(), params[1]);
      store.update(() => { (p.scores ||= {})[el.dataset.k] = num(el.value); }, { render: false });
      const bEl = el.parentElement.querySelector('b'); if (bEl) bEl.textContent = el.value;
      refresh(params);
    },
    flag(el, _, params) { const p = productById(store.get(), params[1]); store.update(() => { (p.flags ||= {})[el.dataset.k] = el.checked; }, { render: false }); refresh(params); },
    saveScratch() {
      const s = store.get(); const sc = scratch(s);
      openForm({ title: 'Save to the pipeline', fields: [{ k: 'name', label: 'Product name', required: true, full: true }, { k: 'category', label: 'Category' }], onSave: (d) => {
        const id = uid('prd'); store.update((st) => { st.products.push({ ...JSON.parse(JSON.stringify(sc)), id, name: d.name, category: d.category, stage: 'Scored', venture: ecomVenture(st)?.id || '', created: today(), updated: today() }); });
        location.hash = `#/commerce/calc/${id}`;
      } });
    },
    newProduct() {
      openForm({ title: 'New product lead', fields: [
        { k: 'name', label: 'Product', required: true, full: true, placeholder: 'e.g. Quick-dry golf towel with magnetic clip' }, { k: 'category', label: 'Category' },
        { k: 'url', label: 'Supplier listing or Amazon link', full: true }, { k: 'stage', label: 'Stage', type: 'select', options: STAGES, default: 'Lead' },
        { k: 'notes', label: 'Why it might work', type: 'textarea' },
      ], onSave: (d) => { const id = uid('prd'); store.update((s) => s.products.push({ id, ...d, costCcy: 'USD', storageMonths: 2, returnRate: 5, acos: 15, scores: {}, flags: {}, venture: ecomVenture(s)?.id || '', created: today(), updated: today() })); } });
    },
    editProduct(el) {
      const p = store.byId('products', el.dataset.id);
      openForm({ title: 'Product details', values: p, fields: [
        { k: 'name', label: 'Product', required: true, full: true }, { k: 'category', label: 'Category' }, { k: 'stage', label: 'Stage', type: 'select', options: STAGES },
        { k: 'supplier', label: 'Supplier', type: 'select', options: () => [{ v: '', l: 'Not chosen' }, ...store.get().suppliers.map((x) => ({ v: x.id, l: x.name }))] },
        { k: 'url', label: 'Link', full: true }, { k: 'notes', label: 'Notes', type: 'textarea' },
      ], onSave: (d) => store.upsert('products', { ...p, ...d, updated: today() }), onDelete: () => { store.remove('products', p.id); location.hash = '#/commerce/pipeline'; } });
    },
    leadAdd(el) {
      const s = store.get(); const i = allIdeas(s).find((x) => x.id === el.dataset.id);
      store.update((st) => {
        st.products.push({ id: uid('prd'), name: i.title, category: i.category || '', url: (i.sources || [])[0]?.url || '', stage: 'Lead', notes: `${i.pitch}${i.risks ? `\nWatch: ${i.risks}` : ''}`, costCcy: 'USD', storageMonths: 2, returnRate: 5, acos: 15, scores: {}, flags: {}, venture: ecomVenture(st)?.id || '', lead: i.id, created: today(), updated: today() });
        const k = st.ideas.findIndex((x) => x.id === i.id);
        const base = { ...i }; delete base.calc;
        const next = { ...(k >= 0 ? st.ideas[k] : base), status: 'promoted', updated: new Date().toISOString() };
        if (k >= 0) st.ideas[k] = next; else st.ideas.push(next);
      });
      toast('Added to the pipeline', 'ok');
    },
    leadDismiss(el) {
      const i = allIdeas(store.get()).find((x) => x.id === el.dataset.id);
      store.update((st) => { const k = st.ideas.findIndex((x) => x.id === i.id); if (k >= 0) st.ideas[k] = { ...st.ideas[k], status: 'dismissed', updated: new Date().toISOString() }; });
    },
    newSupplier() { supplierForm(); }, editSupplier(el) { supplierForm(store.byId('suppliers', el.dataset.id)); },
    level(el) { store.update((s) => { const v = ecomVenture(s); (v.automation ||= {})[el.dataset.id] = el.value; }); },
    autoCost(el) { store.update((s) => { const v = ecomVenture(s); (v.automationCost ||= {})[el.dataset.id] = el.value; }, { render: false }); },
    sim(el) { store.update((s) => { E(s).sim = { ...(E(s).sim || {}), [el.dataset.k]: el.tagName === 'SELECT' ? el.value : (el.value === '' ? '' : num(el.value)) }; }); },
    scenario(el) { store.update((s) => { E(s).sim = { ...(E(s).sim || {}), hitRate: num(el.dataset.hit) }; }); },
    verifyRules() {
      K.addToQueue({ type: 'review', priority: 'High', domain: 'Business & Ventures', title: 'Verify and extend the Amazon.ae seller rules, fees and UAE import rules', question: 'Re-verify against Amazon Seller Central pages, Dubai Customs, the Federal Tax Authority and the Ministry of Finance. Update [[Amazon FBA from China: model, rules and economics]], note anything that changed, and flag conformity certification (ECAS or similar) requirements by product type.' });
      toast(K.mode() === 'connected' ? 'Sent to Claude' : 'Queued locally. Connect your vault so Claude can pick it up.', 'ok');
    },
  },
};

function calcAct(el, _, params) {
  const p = productById(store.get(), params[1]);
  store.update(() => { p[el.dataset.k] = el.value; if (!el.value) delete p[el.dataset.k]; if (p.id) p.updated = today(); }, { render: false });
  refresh(params);
}
function refresh(params) {
  const out = document.getElementById('calc-out'); if (!out) return;
  const s = store.get(); const p = productById(s, params[1]); if (p) out.innerHTML = resultsHTML(p, s);
}
