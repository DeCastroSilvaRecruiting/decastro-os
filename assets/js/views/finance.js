import * as store from '../store.js';
import { esc, icon, money, num, uid, fmtDate, today, tabsHTML, modal, toast, confirmBox, openForm } from '../ui.js';

let tab = 'journal';
let entity = 'All';
let period = { from: `${new Date().getFullYear()}-01-01`, to: today() };

const accName = (code) => { const a = store.get().coa.find((x) => x.code === code); return a ? `${a.code} · ${a.name}` : code; };
const accOptions = (sel) => store.get().coa.map((a) => `<option value="${a.code}" ${a.code === sel ? 'selected' : ''}>${a.code} · ${esc(a.name)}</option>`).join('');

function entryModal(j) {
  const s = store.get();
  const e = j ? JSON.parse(JSON.stringify(j)) : { id: uid('je'), date: today(), entity: entity === 'All' ? 'Personal' : entity, memo: '', ref: '', lines: [{ account: '6000', debit: '', credit: '' }, { account: '1100', debit: '', credit: '' }] };
  const lineRow = (l, i) => `<tr data-i="${i}"><td><select data-f="account">${accOptions(l.account)}</select></td><td><input type="number" step="any" data-f="debit" value="${l.debit}" style="text-align:right"></td><td><input type="number" step="any" data-f="credit" value="${l.credit}" style="text-align:right"></td><td><button class="btn sm ghost icon-btn" data-rm="${i}">${icon('x')}</button></td></tr>`;
  const body = () => `<div class="form"><div class="field"><label>Date</label><input type="date" id="je-date" value="${e.date}"></div>
    <div class="field"><label>Entity</label><select id="je-entity">${s.entities.map((x) => `<option ${x.name === e.entity ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
    <div class="field full"><label>Description</label><input id="je-memo" value="${esc(e.memo)}" placeholder="e.g. Paid trade licence renewal"></div>
    <div class="field"><label>Reference</label><input id="je-ref" value="${esc(e.ref || '')}" placeholder="Invoice / receipt no."></div></div>
    <div class="table-wrap mt"><table><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th><th></th></tr></thead><tbody id="je-lines">${e.lines.map(lineRow).join('')}</tbody></table></div>
    <div class="row mt"><button class="btn sm" id="je-add">${icon('plus')} Line</button><span class="right small" id="je-bal"></span></div>
    <div class="callout small mt">Every entry must balance: total debits = total credits. Debit increases assets and expenses; credit increases liabilities, equity and income.</div>`;
  const { el, close } = modal({ title: j ? 'Edit journal entry' : 'New journal entry', wide: true, body: body(),
    foot: `${j ? `<button class="btn danger left" data-del>${icon('trash')} Delete</button>` : ''}<button class="btn ${j ? '' : 'right'}" data-close>Cancel</button><button class="btn primary" data-save>Post entry</button>` });
  const readLines = () => { e.lines = [...el.querySelectorAll('#je-lines tr')].map((tr) => ({ account: tr.querySelector('[data-f=account]').value, debit: tr.querySelector('[data-f=debit]').value, credit: tr.querySelector('[data-f=credit]').value })); };
  const bal = () => { readLines(); const d = e.lines.reduce((t, l) => t + num(l.debit), 0), c = e.lines.reduce((t, l) => t + num(l.credit), 0); el.querySelector('#je-bal').innerHTML = `Debits <b>${money(d, store.base(), 2)}</b> · Credits <b>${money(c, store.base(), 2)}</b> ${Math.abs(d - c) < 0.005 && d > 0 ? '<span class="badge green">Balanced</span>' : '<span class="badge red">Out of balance</span>'}`; return { d, c }; };
  const redraw = () => { el.querySelector('#je-lines').innerHTML = e.lines.map(lineRow).join(''); bal(); };
  el.addEventListener('input', bal);
  el.querySelector('#je-add').addEventListener('click', () => { readLines(); e.lines.push({ account: '1100', debit: '', credit: '' }); redraw(); });
  el.querySelector('#je-lines').addEventListener('click', (ev) => { const b = ev.target.closest('[data-rm]'); if (!b) return; readLines(); if (e.lines.length > 2) { e.lines.splice(+b.dataset.rm, 1); redraw(); } });
  bal();
  el.querySelector('[data-save]').addEventListener('click', () => {
    const { d, c } = bal();
    if (!(d > 0) || Math.abs(d - c) > 0.005) { toast('Entry must balance and be non-zero', 'error'); return; }
    e.date = el.querySelector('#je-date').value; e.entity = el.querySelector('#je-entity').value; e.memo = el.querySelector('#je-memo').value.trim(); e.ref = el.querySelector('#je-ref').value.trim();
    e.lines = e.lines.filter((l) => num(l.debit) || num(l.credit)).map((l) => ({ account: l.account, debit: num(l.debit), credit: num(l.credit) }));
    store.upsert('journal', e); close(); toast('Entry posted', 'ok');
  });
  el.querySelector('[data-del]')?.addEventListener('click', async () => { close(); if (await confirmBox('Delete this journal entry?')) store.remove('journal', e.id); });
}

function journalTab(s) {
  const rows = s.journal.filter((j) => entity === 'All' || j.entity === entity).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="card flush"><div class="card-head"><h3>General journal</h3><div class="right"><button class="btn sm" data-act="quick">Quick entry</button><button class="btn sm primary" data-act="newEntry">${icon('plus')} Journal entry</button></div></div>
    ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Entity</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>
    ${rows.map((j) => j.lines.map((l, i) => `<tr class="click" data-act="editEntry" data-id="${j.id}">${i === 0 ? `<td rowspan="${j.lines.length}" class="nowrap">${fmtDate(j.date)}</td><td rowspan="${j.lines.length}"><b>${esc(j.memo)}</b>${j.ref ? `<div class="small muted">${esc(j.ref)}</div>` : ''}</td><td rowspan="${j.lines.length}" class="small">${esc(j.entity)}</td>` : ''}
      <td class="small" style="${l.credit ? 'padding-left:30px' : ''}">${esc(accName(l.account))}</td><td class="num">${l.debit ? money(l.debit, store.base(), 2) : ''}</td><td class="num">${l.credit ? money(l.credit, store.base(), 2) : ''}</td></tr>`).join('')).join('')}
    </tbody></table></div>` : `<div class="empty"><h3>No entries yet</h3><div>Record transactions for each entity. Use <b>Quick entry</b> for simple money-in / money-out, or a full journal entry for anything else.</div></div>`}</div>`;
}

function statementsTab(s) {
  const b = store.base();
  const pl = store.accountBalances(entity, period);
  const bs = store.accountBalances(entity, { to: period.to });
  const inc = pl.filter((a) => a.type === 'income' && a.balance), exp = pl.filter((a) => a.type === 'expense' && a.balance);
  const tInc = inc.reduce((t, a) => t + a.balance, 0), tExp = exp.reduce((t, a) => t + a.balance, 0);
  const net = tInc - tExp;
  const lifetimeNet = bs.filter((a) => a.type === 'income').reduce((t, a) => t + a.balance, 0) - bs.filter((a) => a.type === 'expense').reduce((t, a) => t + a.balance, 0);
  const sec = (type) => bs.filter((a) => a.type === type && Math.abs(a.balance) > 0.004);
  const A = sec('asset'), L = sec('liability'), E = sec('equity');
  const tA = A.reduce((t, a) => t + a.balance, 0), tL = L.reduce((t, a) => t + a.balance, 0), tE = E.reduce((t, a) => t + a.balance, 0) + lifetimeNet;
  const tb = store.accountBalances(entity, { to: period.to }).filter((a) => a.debit || a.credit);
  const tbD = tb.reduce((t, a) => t + a.debit, 0), tbC = tb.reduce((t, a) => t + a.credit, 0);
  const line = (a) => `<tr><td>${esc(a.code)} · ${esc(a.name)}</td><td class="num">${money(a.balance, b, 2)}</td></tr>`;
  return `
  <div class="row mb"><label class="small muted">From</label><input type="date" value="${period.from}" data-change="from" style="width:auto"><label class="small muted">To</label><input type="date" value="${period.to}" data-change="to" style="width:auto"></div>
  <div class="grid g2">
    <div class="card flush"><div class="card-head"><h3>Profit & loss</h3><div class="right small muted">${fmtDate(period.from)} – ${fmtDate(period.to)}</div></div>
      <div class="table-wrap"><table><tbody>
      <tr><th colspan="2">Income</th></tr>${inc.map(line).join('') || '<tr><td class="muted" colspan="2">—</td></tr>'}<tr><td><b>Total income</b></td><td class="num"><b>${money(tInc, b, 2)}</b></td></tr>
      <tr><th colspan="2">Expenses</th></tr>${exp.map(line).join('') || '<tr><td class="muted" colspan="2">—</td></tr>'}<tr><td><b>Total expenses</b></td><td class="num"><b>${money(tExp, b, 2)}</b></td></tr>
      </tbody><tfoot><tr><td>Net profit</td><td class="num ${net >= 0 ? 'pos' : 'neg'}">${money(net, b, 2)}</td></tr></tfoot></table></div>
      ${tInc ? `<div class="small muted" style="padding:10px 18px">Net margin ${(net / tInc * 100).toFixed(1)}%</div>` : ''}
    </div>
    <div class="card flush"><div class="card-head"><h3>Balance sheet</h3><div class="right small muted">as at ${fmtDate(period.to)}</div></div>
      <div class="table-wrap"><table><tbody>
      <tr><th colspan="2">Assets</th></tr>${A.map(line).join('') || '<tr><td class="muted" colspan="2">—</td></tr>'}<tr><td><b>Total assets</b></td><td class="num"><b>${money(tA, b, 2)}</b></td></tr>
      <tr><th colspan="2">Liabilities</th></tr>${L.map(line).join('') || '<tr><td class="muted" colspan="2">—</td></tr>'}<tr><td><b>Total liabilities</b></td><td class="num"><b>${money(tL, b, 2)}</b></td></tr>
      <tr><th colspan="2">Equity</th></tr>${E.map(line).join('')}<tr><td>Current earnings</td><td class="num">${money(lifetimeNet, b, 2)}</td></tr><tr><td><b>Total equity</b></td><td class="num"><b>${money(tE, b, 2)}</b></td></tr>
      </tbody><tfoot><tr><td>Liabilities + equity</td><td class="num">${money(tL + tE, b, 2)}</td></tr></tfoot></table></div>
      <div style="padding:10px 18px">${Math.abs(tA - tL - tE) < 0.01 ? '<span class="badge green">Balances</span>' : `<span class="badge red">Out by ${money(tA - tL - tE, b, 2)}</span>`}</div>
    </div>
  </div>
  <div class="card flush mt"><div class="card-head"><h3>Trial balance</h3><div class="right">${Math.abs(tbD - tbC) < 0.01 ? '<span class="badge green">Debits = credits</span>' : '<span class="badge red">Unbalanced</span>'}</div></div>
    <div class="table-wrap"><table><thead><tr><th>Account</th><th class="num">Debits</th><th class="num">Credits</th><th class="num">Balance</th></tr></thead><tbody>
    ${tb.map((a) => `<tr><td>${esc(a.code)} · ${esc(a.name)}</td><td class="num">${money(a.debit, b, 2)}</td><td class="num">${money(a.credit, b, 2)}</td><td class="num">${money(a.balance, b, 2)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No activity.</td></tr>'}
    </tbody><tfoot><tr><td>Total</td><td class="num">${money(tbD, b, 2)}</td><td class="num">${money(tbC, b, 2)}</td><td></td></tr></tfoot></table></div></div>`;
}

function coaTab(s) {
  const types = ['asset', 'liability', 'equity', 'income', 'expense'];
  return `<div class="card flush"><div class="card-head"><h3>Chart of accounts</h3><div class="right"><button class="btn sm" data-act="newAcc">${icon('plus')} Account</button></div></div>
    <div class="table-wrap"><table><thead><tr><th>Code</th><th>Name</th><th>Type</th></tr></thead><tbody>
    ${types.map((t) => s.coa.filter((a) => a.type === t).sort((a, b) => a.code.localeCompare(b.code)).map((a) => `<tr class="click" data-act="editAcc" data-id="${a.id}"><td class="mono">${esc(a.code)}</td><td>${esc(a.name)}</td><td><span class="badge">${t}</span></td></tr>`).join('')).join('')}
    </tbody></table></div></div>`;
}

const ACC_FIELDS = [{ k: 'code', label: 'Code', required: true }, { k: 'name', label: 'Name', required: true }, { k: 'type', label: 'Type', type: 'select', options: ['asset', 'liability', 'equity', 'income', 'expense'] }];

export default {
  title: 'Accounting',
  render(s, params) {
    tab = params[0] || 'journal';
    return `<div class="page-head"><div><div class="eyebrow">Wealth</div><h1>Accounting</h1><p>Double-entry books for every entity in the empire. If it is not in the ledger, it did not happen.</p></div>
      <div class="actions"><select class="pill-select" data-change="entity" aria-label="Entity"><option ${entity === 'All' ? 'selected' : ''}>All</option>${s.entities.map((e) => `<option ${e.name === entity ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></div></div>
    ${tabsHTML([['journal', 'Journal'], ['statements', 'Statements'], ['coa', 'Chart of accounts']], tab)}
    ${tab === 'statements' ? statementsTab(s) : tab === 'coa' ? coaTab(s) : journalTab(s)}`;
  },
  actions: {
    tab(el) { location.hash = `#/finance/${el.dataset.tab}`; },
    entity(el) { entity = el.value; store.update(() => {}); },
    from(el) { period.from = el.value; store.update(() => {}); },
    to(el) { period.to = el.value; store.update(() => {}); },
    newEntry() { entryModal(); },
    editEntry(el) { entryModal(store.byId('journal', el.dataset.id)); },
    quick() {
      const s = store.get();
      const accs = s.coa.map((a) => ({ v: a.code, l: `${a.code} · ${a.name}` }));
      openForm({ title: 'Quick entry', values: { kind: 'out', date: today(), entity: entity === 'All' ? 'Personal' : entity, bank: '1100', account: '6000' }, fields: [
        { k: 'kind', label: 'Type', type: 'select', options: [{ v: 'out', l: 'Money out (expense / purchase)' }, { v: 'in', l: 'Money in (revenue / income)' }, { v: 'capital', l: 'Owner puts capital in' }] },
        { k: 'date', label: 'Date', type: 'date' }, { k: 'entity', label: 'Entity', type: 'select', options: s.entities.map((e) => e.name) },
        { k: 'amount', label: 'Amount', type: 'number', required: true }, { k: 'memo', label: 'Description', required: true, full: true },
        { k: 'account', label: 'Category account', type: 'select', options: accs, hint: 'Expense or income account (ignored for capital)' },
        { k: 'bank', label: 'Paid from / into', type: 'select', options: accs },
      ], onSave: (d) => {
        const amt = num(d.amount); if (!(amt > 0)) { toast('Amount must be positive', 'error'); return false; }
        const lines = d.kind === 'out' ? [{ account: d.account, debit: amt, credit: 0 }, { account: d.bank, debit: 0, credit: amt }]
          : d.kind === 'in' ? [{ account: d.bank, debit: amt, credit: 0 }, { account: d.account, debit: 0, credit: amt }]
          : [{ account: d.bank, debit: amt, credit: 0 }, { account: '3000', debit: 0, credit: amt }];
        store.upsert('journal', { id: uid('je'), date: d.date, entity: d.entity, memo: d.memo, ref: '', lines }); toast('Posted', 'ok');
      } });
    },
    newAcc() { openForm({ title: 'New account', fields: ACC_FIELDS, values: { type: 'expense' }, onSave: (d) => { if (store.get().coa.some((a) => a.code === d.code)) { toast('Code already exists', 'error'); return false; } store.upsert('coa', { id: 'a_' + d.code, ...d }); } }); },
    editAcc(el) {
      const a = store.byId('coa', el.dataset.id);
      const used = store.get().journal.some((j) => j.lines.some((l) => l.account === a.code));
      openForm({ title: 'Edit account', fields: ACC_FIELDS.map((f) => (f.k === 'code' && used ? { ...f, hint: 'Code is in use and cannot be changed' } : f)), values: a,
        onSave: (d) => { if (used) d.code = a.code; store.upsert('coa', { ...a, ...d }); },
        onDelete: used ? null : () => store.remove('coa', a.id) });
    },
  },
};
