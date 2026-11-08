import * as store from '../store.js';
import { esc, icon, money, compact, fnum, tableHTML, tabsHTML, lineChart, barsHTML, num, fmtDate, openForm, toast } from '../ui.js';
import { crudActions, crudRows } from '../schemas.js';

let tab = 'position';

function positionTab(s) {
  const w = store.wealth(), b = store.base();
  const burn = w.burn;
  const target = { Operating: burn * num(s.settings.operatingMonths || 3), Reserve: burn * num(s.settings.reserveMonths || 12) };
  const rows = s.cash.slice().sort((a, b2) => store.toBase(b2.balance, b2.ccy) - store.toBase(a.balance, a.ccy));
  return `
  <div class="grid g4">
    <div class="card kpi hero"><div class="label">Total cash</div><div class="value gold">${compact(w.cashTotal, b)}</div><div class="delta">${s.cash.length} accounts</div></div>
    <div class="card kpi"><div class="label">Monthly in</div><div class="value pos">${compact(w.monthlyIn, b)}</div></div>
    <div class="card kpi"><div class="label">Monthly out</div><div class="value neg">${compact(w.monthlyOut, b)}</div></div>
    <div class="card kpi"><div class="label">Runway</div><div class="value">${Number.isFinite(w.runway) ? fnum(w.runway, 1) + ' mo' : '∞'}</div><div class="delta">${burn ? `on ${compact(burn, b)}/mo burn` : 'add outflows to measure'}</div></div>
  </div>
  <div class="grid g-main mt">
    <div class="card flush"><div class="card-head"><h3>Accounts</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="cash">${icon('plus')} Account</button></div></div>
      ${crudRows(tableHTML([
        { k: 'name', label: 'Account', fmt: (r) => `<b>${esc(r.name)}</b><div class="small muted">${esc(r.institution || '')}</div>` },
        { k: 'tier', label: 'Tier', fmt: (r) => `<span class="badge ${r.tier === 'Reserve' ? 'blue' : r.tier === 'Strategic' ? 'gold' : ''}">${esc(r.tier || 'Operating')}</span>` },
        { k: 'entity', label: 'Entity' },
        { k: 'balance', label: 'Balance', num: true, fmt: (r) => money(num(r.balance), r.ccy) },
        { k: 'base', label: `In ${b}`, num: true, fmt: (r) => money(store.toBase(r.balance, r.ccy), b) },
      ], rows, { act: 'crudEdit', empty: 'Add your bank accounts, savings and cash. Tag each one with a liquidity tier.', foot: ['Total', '', '', '', money(w.cashTotal, b)] }), 'cash')}
    </div>
    <div class="card"><div class="card-head"><h3>Liquidity tiers vs target</h3></div>
      ${burn ? barsHTML([
        { label: 'Operating', value: w.byTier.Operating, targetValue: target.Operating, display: compact(w.byTier.Operating) },
        { label: 'Reserve', value: w.byTier.Reserve, targetValue: target.Reserve, display: compact(w.byTier.Reserve), color: 'var(--blue)' },
        { label: 'Strategic', value: w.byTier.Strategic, display: compact(w.byTier.Strategic), color: 'var(--green)' },
      ]) + `<p class="small muted">Targets: operating ${s.settings.operatingMonths} months and reserve ${s.settings.reserveMonths} months of burn (the white marker). Anything above that is strategic capital to deploy. Adjust in Settings.</p>
        ${w.byTier.Reserve < target.Reserve ? `<div class="callout red small">Reserve is ${compact(target.Reserve - w.byTier.Reserve, b)} below target. Fill it before taking new risk.</div>` : `<div class="callout gold small">Reserve is fully funded. Excess cash can be allocated deliberately.</div>`}`
      : '<div class="empty small">Add recurring outflows (or a monthly burn in Settings) to size your reserves.</div>'}
    </div>
  </div>`;
}

function flowsTab(s) {
  const b = store.base();
  const f = store.forecast(12);
  const rows = s.recurring.slice().sort((a, b2) => (a.direction === b2.direction ? store.toBase(b2.amount, b2.ccy) - store.toBase(a.amount, a.ccy) : a.direction === 'in' ? -1 : 1));
  const low = f.rows.reduce((m, r) => (r.balance < m.balance ? r : m), f.rows[0] || { balance: 0 });
  return `
  <div class="card"><div class="card-head"><h3>12-month cash forecast</h3><div class="right"><span class="muted small">Starts from today's cash of ${money(f.start, b)}</span></div></div>
    ${s.recurring.length ? lineChart([{ name: 'Cash balance', points: f.rows.map((r) => ({ x: r.label, y: r.balance })) }]) : '<div class="empty small">Add recurring inflows and outflows below to project your cash.</div>'}
    ${s.recurring.length && low.balance < 0 ? `<div class="callout red small mt">Cash goes negative in ${esc(low.label)} (${money(low.balance, b)}). Act now.</div>` : ''}
  </div>
  <div class="card flush mt"><div class="card-head"><h3>Recurring flows</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="recurring" data-defaults='{"direction":"in","frequency":"Monthly"}'>${icon('plus')} Inflow</button><button class="btn sm" data-act="crudNew" data-coll="recurring" data-defaults='{"direction":"out","frequency":"Monthly"}'>${icon('plus')} Outflow</button></div></div>
    ${crudRows(tableHTML([
      { k: 'name', label: 'Flow', fmt: (r) => `<b>${esc(r.name)}</b><div class="small muted">${esc(r.category || '')}</div>` },
      { k: 'direction', label: '', fmt: (r) => `<span class="badge ${r.direction === 'in' ? 'green' : 'red'}">${r.direction === 'in' ? 'In' : 'Out'}</span>` },
      { k: 'frequency', label: 'Frequency' },
      { k: 'amount', label: 'Amount', num: true, fmt: (r) => money(num(r.amount), r.ccy) },
      { k: 'period', label: 'Period', fmt: (r) => `<span class="small muted">${r.start ? fmtDate(r.start) : 'now'} → ${r.end ? fmtDate(r.end) : 'ongoing'}</span>` },
    ], rows, { act: 'crudEdit', empty: 'No recurring flows yet.' }), 'recurring')}
  </div>
  ${s.recurring.length ? `<div class="card flush mt"><div class="card-head"><h3>Monthly detail</h3></div>${tableHTML([
    { k: 'ym', label: 'Month' }, { k: 'inflow', label: 'In', num: true, fmt: (r) => money(r.inflow, b) }, { k: 'outflow', label: 'Out', num: true, fmt: (r) => money(r.outflow, b) },
    { k: 'net', label: 'Net', num: true, fmt: (r) => `<span class="${r.net >= 0 ? 'pos' : 'neg'}">${money(r.net, b)}</span>` }, { k: 'balance', label: 'Balance', num: true, fmt: (r) => money(r.balance, b) },
  ], f.rows.map((r) => ({ ...r, id: r.ym })))}</div>` : ''}`;
}

function othersTab(s) {
  const b = store.base();
  return `<div class="card flush"><div class="card-head"><h3>Other assets & liabilities</h3><div class="right"><button class="btn sm" data-act="crudNew" data-coll="others" data-defaults='{"kind":"asset"}'>${icon('plus')} Asset</button><button class="btn sm" data-act="crudNew" data-coll="others" data-defaults='{"kind":"liability"}'>${icon('plus')} Liability</button></div></div>
    ${crudRows(tableHTML([
      { k: 'name', label: 'Item', fmt: (r) => `<b>${esc(r.name)}</b>` }, { k: 'category', label: 'Category' },
      { k: 'kind', label: 'Kind', fmt: (r) => `<span class="badge ${r.kind === 'asset' ? 'green' : 'red'}">${esc(r.kind)}</span>` },
      { k: 'value', label: `Value (${b})`, num: true, fmt: (r) => money(store.toBase(r.value, r.ccy), b) },
    ], s.others, { act: 'crudEdit', empty: 'Vehicles, valuables, receivables, business stakes, credit cards and personal loans. Property, investments and cash have their own pages.' }), 'others')}</div>`;
}

function fxTab(s) {
  const b = store.base();
  return `<div class="grid g2"><div class="card flush"><div class="card-head"><h3>Exchange rates</h3><div class="right"><button class="btn sm" data-act="addFx">${icon('plus')} Currency</button></div></div>
    <div class="table-wrap"><table><thead><tr><th>Currency</th><th class="num">${esc(b)} per 1 unit</th><th></th></tr></thead><tbody>
    ${Object.entries(s.fx).map(([c, r]) => `<tr><td><b>${esc(c)}</b>${c === 'USD' && b === 'AED' ? ' <span class="badge gold">CBUAE peg</span>' : ''}</td><td class="num"><input class="inline-input" style="text-align:right;max-width:140px" type="number" step="any" value="${r}" data-change="fx" data-c="${esc(c)}" ${c === b ? 'disabled' : ''}></td>
      <td>${c !== b && c !== 'USD' ? `<button class="btn sm ghost icon-btn" data-act="delFx" data-c="${esc(c)}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="card"><div class="card-head"><h3>Notes</h3></div><p class="small muted" style="margin:0">Rates are entered by hand so every number in the system is one you have checked. The UAE dirham has been pegged to the US dollar at 3.6725 since 1997. Update other rates when you review your position — or queue a monthly FX check for Claude.</p></div></div>`;
}

export default {
  title: 'Treasury',
  render(s, params) {
    tab = params[0] || 'position';
    return `<div class="page-head"><div><div class="eyebrow">Wealth</div><h1>Treasury</h1><p>Cash is oxygen. Know your position, your runway and whether your reserves are funded — before you deploy a single dirham.</p></div></div>
    ${tabsHTML([['position', 'Cash position'], ['flows', 'Flows & forecast'], ['others', 'Other assets & liabilities'], ['fx', 'FX rates']], tab)}
    ${tab === 'flows' ? flowsTab(s) : tab === 'others' ? othersTab(s) : tab === 'fx' ? fxTab(s) : positionTab(s)}`;
  },
  actions: {
    ...crudActions,
    tab(el) { location.hash = `#/treasury/${el.dataset.tab}`; },
    fx(el) { store.update((s) => { s.fx[el.dataset.c] = num(el.value); }); },
    delFx(el) { store.update((s) => { delete s.fx[el.dataset.c]; }); },
    addFx() {
      openForm({ title: 'Add currency', fields: [{ k: 'code', label: 'ISO code', required: true, placeholder: 'GBP' }, { k: 'rate', label: `${store.base()} per 1 unit`, type: 'number', required: true }],
        onSave: (d) => { const c = d.code.toUpperCase().slice(0, 3); store.update((s) => { s.fx[c] = d.rate; }); toast(`${c} added`, 'ok'); } });
    },
  },
};
