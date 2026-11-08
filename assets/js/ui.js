// UI helpers: formatting, icons, modals, forms, tables, charts. No dependencies.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const a = new Date(today() + 'T00:00:00'), b = new Date(dateStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
export function addMonths(dateStr, m) {
  const d = new Date(dateStr + 'T00:00:00'); d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
}
export function fmtDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '—';
  const x = new Date(String(d).length <= 10 ? d + 'T00:00:00' : d);
  return isNaN(x) ? esc(d) : x.toLocaleDateString('en-GB', opts);
}
export function money(n, ccy = 'AED', dp = 0) {
  if (!Number.isFinite(n)) return '—';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy, maximumFractionDigits: dp, minimumFractionDigits: dp }).format(n); }
  catch { return `${ccy} ${n.toLocaleString('en-US', { maximumFractionDigits: dp })}`; }
}
export function compact(n, ccy) {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  const f = a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? (a / 1e3).toFixed(1) + 'K' : a.toFixed(0);
  return (ccy ? ccy + ' ' : '') + s + f;
}
export const fnum = (n, dp = 2) => Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: dp, minimumFractionDigits: 0 }) : '—';
export const pct = (n, dp = 1) => Number.isFinite(n) ? (n * 100).toFixed(dp) + '%' : '—';
export const signCls = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');

// ---------- Icons (inline, stroke-based) ----------
const P = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  ventures: '<path d="M4 20 10 8l4 6 3-4 3 10z"/><circle cx="17" cy="5" r="2"/>',
  wiki: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  claude: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/>',
  finance: '<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 9v11"/>',
  treasury: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  property: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  investments: '<path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/><path d="M15 6h4v4"/>',
  legal: '<path d="M12 3v18M5 7h14"/><path d="M5 7 2.5 13a3 3 0 0 0 5 0z"/><path d="M19 7l-2.5 6a3 3 0 0 0 5 0z"/><path d="M8 21h8"/>',
  math: '<path d="M4 5h16M4 12h16M4 19h16" opacity=".35"/><path d="M7 3v4M5 5h4M15 12h4M6 17l3 3M9 17l-3 3M15 18h4M15 20h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  download: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  upload: '<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>',
  spark: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
};
export const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${P[name] || ''}</svg>`;

// ---------- Toast ----------
export function toast(msg, kind = '') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${kind}`; el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), kind === 'error' ? 6000 : 3200);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard', 'ok'); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copied to clipboard', 'ok'); } catch { toast('Copy failed — select and copy manually', 'error'); }
    ta.remove();
  }
}

// ---------- Modal ----------
export function modal({ title, body, foot = '', wide = false, onMount }) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-back"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="btn ghost icon-btn x" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div></div>`;
  const back = root.querySelector('.modal-back');
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  back.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  const m = back.querySelector('.modal');
  onMount?.(m, close);
  setTimeout(() => m.querySelector('input,select,textarea')?.focus(), 30);
  return { el: m, close };
}

export function confirmBox(message, okLabel = 'Delete') {
  return new Promise((resolve) => {
    const { el, close } = modal({
      title: 'Please confirm', body: `<p style="margin:0">${esc(message)}</p>`,
      foot: `<button class="btn" data-close>Cancel</button><button class="btn primary right" data-ok>${esc(okLabel)}</button>`,
    });
    el.querySelector('[data-ok]').addEventListener('click', () => { close(); resolve(true); });
    el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => resolve(false)));
  });
}

// ---------- Generic forms ----------
// field: {k, label, type: text|number|date|select|textarea|checkbox|tags, options:[v|{v,l}], full, hint, step, placeholder}
export function fieldHTML(f, value) {
  const id = `f_${f.k}`;
  const v = value ?? f.default ?? '';
  const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
  let input;
  switch (f.type) {
    case 'textarea': input = `<textarea id="${id}" name="${f.k}" ${ph}>${esc(v)}</textarea>`; break;
    case 'select': input = `<select id="${id}" name="${f.k}">${(typeof f.options === 'function' ? f.options() : f.options).map((o) => {
      const ov = typeof o === 'object' ? o.v : o, ol = typeof o === 'object' ? o.l : o;
      return `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`;
    }).join('')}</select>`; break;
    case 'checkbox': input = `<label class="row" style="margin-top:6px"><input type="checkbox" id="${id}" name="${f.k}" ${v ? 'checked' : ''}> <span>${esc(f.text || 'Yes')}</span></label>`; break;
    case 'tags': input = `<input id="${id}" name="${f.k}" value="${esc(Array.isArray(v) ? v.join(', ') : v)}" ${ph}>`; break;
    case 'number': input = `<input id="${id}" name="${f.k}" type="number" step="${f.step || 'any'}" value="${esc(v)}" ${ph}>`; break;
    case 'date': input = `<input id="${id}" name="${f.k}" type="date" value="${esc(v)}">`; break;
    default: input = `<input id="${id}" name="${f.k}" value="${esc(v)}" ${ph}>`;
  }
  return `<div class="field ${f.full || f.type === 'textarea' ? 'full' : ''}"><label for="${id}">${esc(f.label)}</label>${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
}
export const formHTML = (fields, values = {}) => `<form class="form" onsubmit="return false">${fields.map((f) => fieldHTML(f, values[f.k])).join('')}</form>`;
export function readForm(root, fields) {
  const out = {};
  for (const f of fields) {
    const el = root.querySelector(`[name="${f.k}"]`);
    if (!el) continue;
    if (f.type === 'checkbox') out[f.k] = el.checked;
    else if (f.type === 'number') out[f.k] = el.value === '' ? '' : num(el.value);
    else if (f.type === 'tags') out[f.k] = el.value.split(',').map((s) => s.trim()).filter(Boolean);
    else out[f.k] = el.value.trim();
  }
  return out;
}
export function openForm({ title, fields, values = {}, onSave, onDelete, wide, saveLabel = 'Save', intro = '' }) {
  const { el, close } = modal({
    title, wide,
    body: intro + formHTML(fields, values),
    foot: `${onDelete ? `<button class="btn danger left" data-del>${icon('trash')} Delete</button>` : ''}<button class="btn ${onDelete ? '' : 'right'}" data-close>Cancel</button><button class="btn primary" data-save>${esc(saveLabel)}</button>`,
  });
  const save = () => {
    const data = readForm(el, fields);
    const missing = fields.find((f) => f.required && (data[f.k] === '' || data[f.k] == null));
    if (missing) { toast(`${missing.label} is required`, 'error'); return; }
    if (onSave(data) !== false) close();
  };
  el.querySelector('[data-save]').addEventListener('click', save);
  el.querySelector('form').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); } });
  el.querySelector('[data-del]')?.addEventListener('click', async () => { close(); if (await confirmBox('Delete this item? This cannot be undone.')) onDelete(); });
  return { el, close };
}

// ---------- Generic table ----------
// cols: [{k, label, num, fmt(row)}]
export function tableHTML(cols, rows, { act, empty = 'Nothing here yet.', foot } = {}) {
  if (!rows.length) return `<div class="empty">${empty}</div>`;
  return `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr ${act ? `class="click" data-act="${act}" data-id="${esc(r.id)}"` : ''}>${cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.fmt ? c.fmt(r) : esc(r[c.k])}</td>`).join('')}</tr>`).join('')}</tbody>
  ${foot ? `<tfoot><tr>${foot.map((f, i) => `<td class="${cols[i]?.num ? 'num' : ''}">${f ?? ''}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
}

export const emptyState = (title, text, btn = '') => `<div class="empty"><h3>${esc(title)}</h3><div>${text}</div>${btn}</div>`;
export const tabsHTML = (tabs, active, act = 'tab') => `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab ${k === active ? 'active' : ''}" role="tab" data-act="${act}" data-tab="${k}">${esc(l)}</button>`).join('')}</div>`;

// ---------- Charts ----------
// series: [{name, cls, points:[{x:label, y:number}]}]
export function lineChart(series, { height = 220, fmtY = (v) => compact(v), area = true } = {}) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return `<div class="empty small">Not enough data points yet to draw a chart.</div>`;
  const W = 720, H = height, pl = 56, pr = 14, pt = 12, pb = 26;
  const labels = series[0].points.map((p) => p.x);
  const ys = all.map((p) => p.y);
  let min = Math.min(0, ...ys), max = Math.max(...ys);
  if (max === min) max = min + 1;
  const pad = (max - min) * 0.08; max += pad; if (min < 0) min -= pad;
  const n = labels.length;
  const X = (i) => pl + (n === 1 ? 0 : (i * (W - pl - pr)) / (n - 1));
  const Y = (v) => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
  const ticks = 4;
  let g = '';
  for (let i = 0; i <= ticks; i++) {
    const v = min + ((max - min) * i) / ticks, y = Y(v);
    g += `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 8}" y="${y + 3}" text-anchor="end">${esc(fmtY(v))}</text>`;
  }
  const step = Math.max(1, Math.ceil(n / 8));
  labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) g += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`; });
  const paths = series.map((s, si) => {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
    const a = area && si === 0 ? `<path class="area" d="${d} L${X(s.points.length - 1)},${Y(Math.max(min, 0))} L${X(0)},${Y(Math.max(min, 0))} Z"/>` : '';
    return `${a}<path class="line ${s.cls || ''}" d="${d}"/>`;
  }).join('');
  const zero = min < 0 ? `<line class="axis" x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}"/>` : '';
  const legend = series.length > 1 ? `<div class="legend">${series.map((s) => `<span style="--c:var(--${s.cls === 'b' ? 'blue' : s.cls === 'g' ? 'green' : s.cls === 'r' ? 'red' : 'gold'})">${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${g}${zero}${paths}</svg>${legend}</div>`;
}

// items: [{label, value, target (0-1 share), display, color}]
export function barsHTML(items, { max } = {}) {
  if (!items.length) return '';
  const m = max ?? Math.max(...items.map((i) => Math.max(i.value, i.targetValue || 0)), 1e-9);
  return items.map((i) => `<div class="bar-row"><div class="lbl" title="${esc(i.label)}">${esc(i.label)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${clamp((i.value / m) * 100, 0, 100)}%;${i.color ? `background:${i.color}` : ''}"></div>
    ${i.targetValue != null ? `<div class="bar-target" style="left:${clamp((i.targetValue / m) * 100, 0, 100)}%" title="Target"></div>` : ''}</div>
    <div class="v">${i.display ?? fnum(i.value)}</div></div>`).join('');
}
