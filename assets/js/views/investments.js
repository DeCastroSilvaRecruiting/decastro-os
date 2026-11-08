import * as store from '../store.js';
import { esc, icon, money, compact, pct, fnum, tableHTML, barsHTML, num, openForm } from '../ui.js';
import { crudActions, crudRows, SCHEMAS } from '../schemas.js';

const CLASSES = SCHEMAS.holdings.fields.find((f) => f.k === 'cls').options;

export default {
  title: 'Investments',
  render(s) {
    const b = store.base();
    const rows = s.holdings.map((h) => { const v = store.holdingValue(h), c = store.holdingCost(h); return { ...h, v, c, pl: c ? v - c : NaN }; }).sort((a, b2) => b2.v - a.v);
    const total = rows.reduce((t, r) => t + r.v, 0), cost = rows.filter((r) => r.c).reduce((t, r) => t + r.c, 0), costedV = rows.filter((r) => r.c).reduce((t, r) => t + r.v, 0);
    const targets = s.settings.allocTargets || {};
    const byCls = CLASSES.map((c) => ({ c, v: rows.filter((r) => r.cls === c).reduce((t, r) => t + r.v, 0), t: num(targets[c]) / 100 })).filter((x) => x.v > 0 || x.t > 0);
    const tSum = Object.values(targets).reduce((t, v) => t + num(v), 0);
    const drift = byCls.map((x) => ({ ...x, cur: total ? x.v / total : 0, gap: x.t * total - x.v })).filter((x) => x.t > 0 && Math.abs(x.gap) > total * 0.03);
    const top = rows[0];
    return `
    <div class="page-head"><div><div class="eyebrow">Wealth</div><h1>Investments</h1><p>Allocation decides most of your long-run return. Set targets, track drift, and rebalance with discipline rather than emotion.</p></div>
      <div class="actions"><button class="btn" data-act="targets">Set allocation targets</button><button class="btn primary" data-act="crudNew" data-coll="holdings" data-defaults='{"cls":"Fund / ETF"}'>${icon('plus')} Holding</button></div></div>
    <div class="grid g4">
      <div class="card kpi hero"><div class="label">Portfolio value</div><div class="value gold">${compact(total, b)}</div><div class="delta">${rows.length} holdings</div></div>
      <div class="card kpi"><div class="label">Unrealised P&L</div><div class="value ${costedV - cost >= 0 ? 'pos' : 'neg'}">${cost ? compact(costedV - cost, b) : '—'}</div><div class="delta">${cost ? pct((costedV - cost) / cost) + ' on cost' : 'enter cost basis'}</div></div>
      <div class="card kpi"><div class="label">Largest position</div><div class="value" style="font-size:22px">${top ? esc(top.name) : '—'}</div><div class="delta">${top && total ? pct(top.v / total) + ' of portfolio' : ''}</div></div>
      <div class="card kpi"><div class="label">Rebalance flags</div><div class="value">${drift.length}</div><div class="delta">classes >3% off target</div></div>
    </div>
    <div class="grid g-main mt">
      <div class="card flush"><div class="card-head"><h3>Holdings</h3></div>
        ${crudRows(tableHTML([
          { k: 'name', label: 'Holding', fmt: (r) => `<b>${esc(r.name)}</b><div class="small muted">${esc([r.ticker, r.platform].filter(Boolean).join(' · '))}</div>` },
          { k: 'cls', label: 'Class', fmt: (r) => `<span class="badge">${esc(r.cls)}</span>` },
          { k: 'qty', label: 'Qty', num: true, fmt: (r) => fnum(num(r.qty), 4) },
          { k: 'price', label: 'Price', num: true, fmt: (r) => money(num(r.price), r.ccy, 2) },
          { k: 'v', label: `Value (${b})`, num: true, fmt: (r) => money(r.v, b) },
          { k: 'w', label: 'Weight', num: true, fmt: (r) => (total ? pct(r.v / total) : '—') },
          { k: 'pl', label: 'P&L', num: true, fmt: (r) => (Number.isFinite(r.pl) ? `<span class="${r.pl >= 0 ? 'pos' : 'neg'}">${pct(r.pl / r.c)}</span>` : '—') },
        ], rows, { act: 'crudEdit', empty: 'Add equities, funds, bonds, gold, crypto or private stakes. Update prices when you review.' }), 'holdings')}
      </div>
      <div class="card"><div class="card-head"><h3>Allocation vs target</h3></div>
        ${byCls.length ? barsHTML(byCls.map((x) => ({ label: x.c, value: total ? x.v / total : 0, targetValue: x.t || null, display: `${pct(total ? x.v / total : 0, 0)}${x.t ? ` / ${pct(x.t, 0)}` : ''}` })), { max: 1 }) : '<div class="empty small">No holdings yet.</div>'}
        ${tSum && Math.round(tSum) !== 100 ? `<div class="callout red small mt">Targets add up to ${fnum(tSum, 1)}%, not 100%.</div>` : ''}
        ${drift.length ? `<hr><div class="small"><b>To rebalance</b>${drift.map((x) => `<div class="row" style="margin-top:6px"><span>${esc(x.c)}</span><span class="right ${x.gap > 0 ? 'pos' : 'neg'}">${x.gap > 0 ? 'Buy' : 'Sell'} ${compact(Math.abs(x.gap), b)}</span></div>`).join('')}</div>` : ''}
        <p class="small muted">This is arithmetic on your own targets, not investment advice.</p>
      </div>
    </div>`;
  },
  actions: {
    ...crudActions,
    targets() {
      const t = store.get().settings.allocTargets || {};
      openForm({ title: 'Allocation targets (%)', fields: CLASSES.map((c) => ({ k: c, label: c, type: 'number' })), values: t,
        intro: '<p class="muted small" style="margin-top:0">Set the share of your investment portfolio you want in each class. Should total 100.</p>',
        onSave: (d) => store.update((s) => { s.settings.allocTargets = Object.fromEntries(Object.entries(d).filter(([, v]) => v !== '')); }) });
    },
  },
};
