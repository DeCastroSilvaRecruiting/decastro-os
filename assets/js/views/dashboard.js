import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, money, compact, pct, fmtDate, lineChart, barsHTML, icon, today } from '../ui.js';
import { RUBRIC, STAGES } from '../seed.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default {
  title: 'Command Centre',
  async render(s) {
    const w = store.wealth();
    const b = store.base();
    const idx = await K.loadIndex();
    const first = s.settings.owner.split(' ')[0];
    const dl = store.deadlines(45);
    const openQ = s.queue.filter((q) => ['queued', 'in-progress', 'proposed'].includes(q.status));
    const doneQ = s.queue.filter((q) => q.status === 'done').slice(0, 4);
    const snaps = s.snapshots.slice(-24);
    const prev = snaps.length > 1 ? snaps[snaps.length - 2].netWorth : null;
    const delta = prev != null ? w.netWorth - prev : null;
    const nextTasks = s.ventures.flatMap((v) => v.tasks.filter((t) => !t.done).map((t) => ({ ...t, v }))).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 6);
    const isEmpty = !s.cash.length && !s.holdings.length && !s.properties.length;

    const setup = [
      [s.cash.length > 0, 'Add your bank and cash accounts', '#/treasury'],
      [s.recurring.length > 0, 'Add recurring income & expenses (sets your runway)', '#/treasury/flows'],
      [s.ventures.some((v) => v.thesis), 'Write the thesis for your first venture', '#/ventures'],
      [K.mode() === 'connected', 'Connect your private knowledge vault on GitHub', '#/settings'],
      [s.queue.length > 0, 'Send Claude your first research question', '#/claude'],
      [s.decisions.length > 0, 'Log a decision in the Mastermind Lab', '#/math/decisions'],
    ];
    const setupLeft = setup.filter((x) => !x[0]).length;

    const stageCounts = STAGES.filter((st) => st !== 'Parked').map((st) => ({ label: st, value: s.ventures.filter((v) => v.stage === st).length }));

    return `
    <div class="page-head">
      <div><div class="eyebrow">${fmtDate(today(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <h1>${greeting()}, ${esc(first)}.</h1>
      <p>Every decision either compounds or erodes the empire. Here is where things stand.</p></div>
    </div>

    <div class="grid g4">
      <div class="card kpi hero"><div class="label">Net worth</div><div class="value gold">${compact(w.netWorth, b)}</div>
        <div class="delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta != null ? `${delta >= 0 ? '▲' : '▼'} ${compact(Math.abs(delta), b)} since last snapshot` : 'Snapshots record monthly'}</div></div>
      <div class="card kpi"><div class="label">Liquid capital</div><div class="value">${compact(w.liquid, b)}</div><div class="delta">Cash ${compact(w.cashTotal, b)}</div></div>
      <div class="card kpi"><div class="label">Runway</div><div class="value">${Number.isFinite(w.runway) ? w.runway.toFixed(1) + ' mo' : '—'}</div><div class="delta">${w.burn ? `Burn ${compact(w.burn, b)}/mo` : 'Set burn or recurring costs'}</div></div>
      <div class="card kpi"><div class="label">Knowledge</div><div class="value">${idx.articles.length}</div><div class="delta">${openQ.length} questions with Claude</div></div>
    </div>

    ${setupLeft ? `<div class="card mt"><div class="card-head"><h3>Foundation checklist</h3><div class="right"><span class="badge gold">${setup.length - setupLeft}/${setup.length}</span></div></div>
      <div class="grid g3">${setup.map(([done, label, href]) => `<a href="${href}" class="row" style="flex-wrap:nowrap;align-items:flex-start;color:${done ? 'var(--muted)' : 'var(--text)'}"><span class="badge ${done ? 'green' : ''}">${done ? '✓' : '○'}</span><span style="${done ? 'text-decoration:line-through' : ''}">${label}</span></a>`).join('')}</div></div>` : ''}

    <div class="grid g-main mt">
      <div class="card"><div class="card-head"><h3>Net worth trajectory</h3><div class="right"><button class="btn sm" data-act="snap">Record snapshot</button></div></div>
        ${snaps.length >= 2 ? lineChart([{ name: 'Net worth', points: snaps.map((x) => ({ x: fmtDate(x.date, { month: 'short', year: '2-digit' }), y: x.netWorth })) }, { name: 'Liquid', cls: 'b', points: snaps.map((x) => ({ x: '', y: x.liquid })) }], { fmtY: (v) => compact(v) })
          : `<div class="empty small">${isEmpty ? 'Add accounts, holdings or property and the system records a snapshot each month.' : 'A snapshot is saved each month. The chart appears from the second one.'}</div>`}
      </div>
      <div class="card"><div class="card-head"><h3>Balance sheet</h3></div>
        ${barsHTML([
          { label: 'Cash', value: w.cashTotal, display: compact(w.cashTotal) },
          { label: 'Investments', value: w.invest, display: compact(w.invest) },
          { label: 'Property', value: w.propValue, display: compact(w.propValue) },
          { label: 'Other assets', value: w.otherAssets, display: compact(w.otherAssets) },
          { label: 'Liabilities', value: w.liabilities, display: compact(-w.liabilities), color: 'var(--red)' },
        ])}
        <hr><div class="row"><span class="muted">Assets</span><b class="right">${money(w.assets, b)}</b></div>
        <div class="row mt" style="margin-top:6px"><span class="muted">Liabilities</span><b class="right">${money(w.liabilities, b)}</b></div>
      </div>
    </div>

    <div class="grid g3 mt">
      <div class="card"><div class="card-head"><h3>Deadlines · 45 days</h3><div class="right"><a href="#/legal/compliance" class="small">All</a></div></div>
        ${dl.length ? `<div class="list">${dl.slice(0, 7).map((d) => `<a class="list-item" href="${d.href}" style="color:var(--text)"><span class="badge ${d.days < 0 ? 'red' : d.days <= 7 ? 'gold' : ''}">${d.days < 0 ? `${-d.days}d late` : d.days === 0 ? 'Today' : `${d.days}d`}</span><div class="grow"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.title)}</div><div class="sub">${d.kind} · ${fmtDate(d.date)}</div></div></a>`).join('')}</div>` : `<div class="empty small">Nothing due. Add due dates in Legal, venture tasks or decisions.</div>`}
      </div>
      <div class="card"><div class="card-head"><h3>Next venture actions</h3><div class="right"><a href="#/ventures" class="small">Engine</a></div></div>
        ${nextTasks.length ? `<div class="list">${nextTasks.map((t) => `<a class="list-item" href="#/ventures/${t.v.id}" style="color:var(--text)"><div class="grow"><div>${esc(t.text)}</div><div class="sub">${esc(t.v.name)}${t.due ? ' · ' + fmtDate(t.due) : ''}</div></div></a>`).join('')}</div>` : `<div class="empty small">No open tasks. Open a venture and break the next milestone into actions.</div>`}
      </div>
      <div class="card"><div class="card-head"><h3>From Claude</h3><div class="right"><a href="#/claude" class="small">Desk</a></div></div>
        ${doneQ.length ? `<div class="list">${doneQ.map((q) => `<a class="list-item" href="${q.result?.article ? `#/wiki/${q.result.article}` : '#/claude'}" style="color:var(--text)"><span class="badge green">Done</span><div class="grow"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(q.title)}</div><div class="sub">${esc(q.result?.summary || q.domain || '')}</div></div></a>`).join('')}</div>`
          : openQ.length ? `<div class="list">${openQ.slice(0, 5).map((q) => `<div class="list-item"><span class="badge ${q.status === 'proposed' ? 'violet' : 'blue'}">${q.status}</span><div class="grow">${esc(q.title)}</div></div>`).join('')}</div>`
          : `<div class="empty small">Ask a question and Claude researches it on its next scheduled run.<br><button class="btn sm" data-act="ask">${icon('spark')} Ask the wiki</button></div>`}
      </div>
    </div>

    <div class="grid g2 mt">
      <div class="card"><div class="card-head"><h3>Venture pipeline</h3></div>
        ${barsHTML(stageCounts.map((x) => ({ ...x, display: String(x.value) })), { max: Math.max(3, ...stageCounts.map((x) => x.value)) })}
        <div class="list mt">${s.ventures.filter((v) => v.stage !== 'Parked').sort((a, b) => store.ventureScore(b, RUBRIC) - store.ventureScore(a, RUBRIC)).slice(0, 4).map((v) => `<a class="list-item" href="#/ventures/${v.id}" style="color:var(--text)"><div class="grow"><b>${esc(v.name)}</b><div class="sub">${esc(v.stage)}</div></div><span class="score-ring">${store.ventureScore(v, RUBRIC)}</span></a>`).join('')}</div>
      </div>
      <div class="card"><div class="card-head"><h3>Latest knowledge</h3><div class="right"><a href="#/wiki" class="small">Wiki</a></div></div>
        <div class="list">${idx.articles.slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 6).map((a) => `<a class="list-item" href="#/wiki/${a.slug}" style="color:var(--text)"><div class="grow"><div>${esc(a.title)}</div><div class="sub">${esc(a.domain)} · ${fmtDate(a.updated)}</div></div><span class="badge ${a.confidence === 'high' ? 'green' : a.confidence === 'low' ? 'red' : 'gold'}">${esc(a.confidence || '—')}</span></a>`).join('') || '<div class="empty small">No articles yet.</div>'}</div>
      </div>
    </div>`;
  },
  actions: {
    snap() { store.maybeSnapshot(true); },
    ask() { import('./wiki.js').then((m) => m.default.ask()); },
  },
};
