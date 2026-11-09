// State store (localStorage), derived metrics, GitHub client and vault encryption.
import { SEED, ECOM_VENTURE } from './seed.js';
import { num, today } from './ui.js';
import { propertyMetrics } from './fin.js';

const KEY = 'dcos.state.v1';
let state = null;
const subs = new Set();

const clone = (o) => JSON.parse(JSON.stringify(o));

export function load() {
  try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { state = null; }
  if (!state) state = clone(SEED);
  // forward-compatible: add any new top-level keys from SEED
  for (const k of Object.keys(SEED)) if (state[k] === undefined) state[k] = clone(SEED[k]);
  for (const k of Object.keys(SEED.settings)) if (state.settings[k] === undefined) state.settings[k] = clone(SEED.settings[k]);
  runMigrations();
  return state;
}
// One-time upgrades for existing installs. Each runs once, recorded in settings.migrated, so deleting what it added sticks.
const MIGRATIONS = [
  { id: 'ecom-store-v1', run(s) {
    if (!s.ventures.some((v) => v.id === ECOM_VENTURE.id)) s.ventures.push(clone(ECOM_VENTURE));
    if (s.fx.CNY === undefined) s.fx.CNY = 0.52;
  } },
  // Procurement buys from many countries. These rates are rough placeholders: update them in Treasury.
  { id: 'procure-fx-v1', run(s) {
    for (const [c, r] of Object.entries({ EUR: 4.2, GBP: 4.85, ZAR: 0.21, INR: 0.043 })) if (s.fx[c] === undefined) s.fx[c] = r;
  } },
];
function runMigrations() {
  state.settings.migrated ||= [];
  let changed = false;
  for (const m of MIGRATIONS) if (!state.settings.migrated.includes(m.id)) { m.run(state); state.settings.migrated.push(m.id); changed = true; }
  if (changed) persist();
}
export const get = () => state;
export const settings = () => state.settings;

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.error(e); }
}
export function update(fn, { render = true } = {}) {
  fn(state);
  state.meta.updated = new Date().toISOString();
  persist();
  if (render) subs.forEach((f) => f(state));
}
export const subscribe = (f) => (subs.add(f), () => subs.delete(f));
export function replaceState(next) {
  for (const k of Object.keys(SEED)) if (next[k] === undefined) next[k] = clone(SEED[k]);
  next.settings = { ...clone(SEED.settings), ...next.settings };
  const keepGh = state?.settings?.github;
  if (keepGh?.token && !next.settings.github?.token) next.settings.github = { ...next.settings.github, token: keepGh.token };
  state = next; persist(); subs.forEach((f) => f(state));
}
export function resetAll() { localStorage.removeItem(KEY); state = clone(SEED); persist(); subs.forEach((f) => f(state)); }

export function upsert(coll, item, opts) {
  update((s) => {
    const a = s[coll]; const i = a.findIndex((x) => x.id === item.id);
    if (i >= 0) a[i] = { ...a[i], ...item }; else a.push(item);
  }, opts);
}
export const remove = (coll, id) => update((s) => { s[coll] = s[coll].filter((x) => x.id !== id); });
export const byId = (coll, id) => state[coll].find((x) => x.id === id);

// ---------- Currency ----------
export const base = () => state.settings.baseCcy || 'AED';
export function toBase(amount, ccy) {
  const b = base(); const r = state.fx[ccy || b]; const rb = state.fx[b] || 1;
  return num(amount) * (r ?? 1) / rb;
}
export const currencies = () => Object.keys(state.fx);

// ---------- Derived wealth metrics ----------
export function holdingValue(h) { return toBase(num(h.qty) * num(h.price), h.ccy); }
export function holdingCost(h) { return toBase(num(h.costBasis), h.ccy); }

export function wealth() {
  const s = state;
  const cashTotal = s.cash.reduce((t, c) => t + toBase(c.balance, c.ccy), 0);
  const byTier = { Operating: 0, Reserve: 0, Strategic: 0 };
  s.cash.forEach((c) => { byTier[c.tier || 'Operating'] = (byTier[c.tier || 'Operating'] || 0) + toBase(c.balance, c.ccy); });
  const invest = s.holdings.reduce((t, h) => t + holdingValue(h), 0);
  const owned = s.properties.filter((p) => p.status !== 'Target');
  const propValue = owned.reduce((t, p) => t + toBase(propertyMetrics(p).value, p.ccy), 0);
  const propDebt = owned.reduce((t, p) => t + toBase(p.mortgageBalance, p.ccy), 0);
  const otherAssets = s.others.filter((o) => o.kind === 'asset').reduce((t, o) => t + toBase(o.value, o.ccy), 0);
  const otherLiab = s.others.filter((o) => o.kind === 'liability').reduce((t, o) => t + toBase(o.value, o.ccy), 0);
  const assets = cashTotal + invest + propValue + otherAssets;
  const liabilities = propDebt + otherLiab;
  const liquid = cashTotal + s.holdings.filter((h) => !['Private', 'Property fund'].includes(h.cls)).reduce((t, h) => t + holdingValue(h), 0);
  const burn = num(s.settings.monthlyBurn) || monthlyOutflow();
  return {
    cashTotal, byTier, invest, propValue, propDebt, propEquity: propValue - propDebt,
    otherAssets, otherLiab, assets, liabilities, netWorth: assets - liabilities,
    liquid, burn, runway: burn > 0 ? cashTotal / burn : Infinity,
    monthlyIn: monthlyInflow(), monthlyOut: monthlyOutflow(),
  };
}
const perMonth = (r) => { const a = toBase(r.amount, r.ccy); return r.frequency === 'Annual' ? a / 12 : r.frequency === 'Quarterly' ? a / 3 : r.frequency === 'Weekly' ? (a * 52) / 12 : a; };
const activeNow = (r) => (!r.start || r.start <= today()) && (!r.end || r.end >= today());
export const monthlyInflow = () => state.recurring.filter((r) => r.direction === 'in' && activeNow(r)).reduce((t, r) => t + perMonth(r), 0);
export const monthlyOutflow = () => state.recurring.filter((r) => r.direction === 'out' && activeNow(r)).reduce((t, r) => t + perMonth(r), 0);

/** 12-month cash forecast from current cash + recurring flows. */
export function forecast(months = 12) {
  const start = wealth().cashTotal; let bal = start; const rows = [];
  const now = new Date(); now.setDate(1);
  for (let m = 1; m <= months; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let inflow = 0, outflow = 0;
    for (const r of state.recurring) {
      if (r.start && r.start.slice(0, 7) > ym) continue;
      if (r.end && r.end.slice(0, 7) < ym) continue;
      const a = toBase(r.amount, r.ccy);
      const startM = r.start ? new Date(r.start + 'T00:00:00').getMonth() : 0;
      let hit = 0;
      if (r.frequency === 'Monthly' || !r.frequency) hit = a;
      else if (r.frequency === 'Weekly') hit = (a * 52) / 12;
      else if (r.frequency === 'Quarterly') hit = (d.getMonth() - startM + 12) % 3 === 0 ? a : 0;
      else if (r.frequency === 'Annual') hit = d.getMonth() === startM ? a : 0;
      else if (r.frequency === 'One-off') hit = r.start && r.start.slice(0, 7) === ym ? a : 0;
      if (r.direction === 'in') inflow += hit; else outflow += hit;
    }
    bal += inflow - outflow;
    rows.push({ ym, label: d.toLocaleDateString('en-GB', { month: 'short' }), inflow, outflow, net: inflow - outflow, balance: bal });
  }
  return { start, rows };
}

export function maybeSnapshot(force = false) {
  const w = wealth(); const ym = today().slice(0, 7);
  const has = state.snapshots.find((s) => s.date.slice(0, 7) === ym);
  if (!force && (has || (w.assets === 0 && w.liabilities === 0))) return false;
  update((s) => {
    s.snapshots = s.snapshots.filter((x) => x.date.slice(0, 7) !== ym);
    s.snapshots.push({ date: today(), netWorth: Math.round(w.netWorth), liquid: Math.round(w.liquid), assets: Math.round(w.assets), liabilities: Math.round(w.liabilities) });
    s.snapshots.sort((a, b) => a.date.localeCompare(b.date));
  }, { render: force });
  return true;
}

// ---------- Accounting ----------
export function accountBalances(entity, { from, to } = {}) {
  const bal = {};
  for (const a of state.coa) bal[a.code] = { ...a, debit: 0, credit: 0 };
  for (const j of state.journal) {
    if (entity && entity !== 'All' && j.entity !== entity) continue;
    if (from && j.date < from) continue;
    if (to && j.date > to) continue;
    for (const l of j.lines) {
      if (!bal[l.account]) bal[l.account] = { code: l.account, name: l.account, type: 'asset', debit: 0, credit: 0 };
      bal[l.account].debit += num(l.debit); bal[l.account].credit += num(l.credit);
    }
  }
  for (const b of Object.values(bal)) b.balance = ['asset', 'expense'].includes(b.type) ? b.debit - b.credit : b.credit - b.debit;
  return Object.values(bal).sort((a, b) => a.code.localeCompare(b.code));
}

// ---------- Upcoming deadlines (legal + ventures) ----------
export function deadlines(withinDays = 60) {
  const out = [];
  const push = (date, title, kind, href) => { if (!date) return; const d = (new Date(date + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000; if (d <= withinDays) out.push({ date, title, kind, href, days: Math.round(d) }); };
  state.compliance.filter((c) => c.status !== 'Done').forEach((c) => push(c.due, c.title, 'Compliance', '#/legal/compliance'));
  state.contracts.filter((c) => c.status !== 'Terminated').forEach((c) => {
    if (c.end) { const notice = new Date(c.end + 'T00:00:00'); notice.setDate(notice.getDate() - num(c.noticeDays)); push(notice.toISOString().slice(0, 10), `Notice deadline: ${c.title}`, 'Contract', '#/legal/contracts'); }
  });
  state.entities.forEach((e) => push(e.expiry, `Licence renewal: ${e.name}`, 'Entity', '#/legal/entities'));
  state.ventures.forEach((v) => v.tasks.filter((t) => !t.done).forEach((t) => push(t.due, `${v.name}: ${t.text}`, 'Venture', `#/ventures/${v.id}`)));
  // Procurement: payments, deliveries, quote expiry and need-by dates
  const supName = (id) => state.suppliers.find((x) => x.id === id)?.name || 'supplier';
  state.orders.filter((o) => !['Received', 'Closed', 'Cancelled', 'Draft'].includes(o.status)).forEach((o) => {
    (o.payments || []).filter((p) => !p.paid).forEach((p) => push(p.due, `Pay ${supName(o.supplier)}: ${p.label} (${o.number})`, 'Payment', '#/procure/orders'));
    if (['Shipped', 'Customs', 'In production', 'Confirmed'].includes(o.status)) push(o.eta, `Delivery due: ${o.number} from ${supName(o.supplier)}`, 'Delivery', '#/procure/orders');
  });
  state.rfqs.filter((r) => ['Open', 'Comparing'].includes(r.status)).forEach((r) => {
    push(r.need, `Decide supplier: ${r.title}`, 'Sourcing', '#/procure/sourcing');
    (r.quotes || []).forEach((q) => push(q.validUntil, `Quote expires: ${r.title} (${state.suppliers.find((x) => x.id === q.supplier)?.name || q.supplierName || 'supplier'})`, 'Sourcing', '#/procure/sourcing'));
  });
  state.decisions.filter((d) => !d.outcome || d.outcome === 'Pending').forEach((d) => push(d.reviewDate, `Review decision: ${d.title}`, 'Decision', '#/math/decisions'));
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- Venture scoring ----------
export function ventureScore(v, rubric) {
  return Math.round(rubric.reduce((t, r) => t + (num(v.scores?.[r.k]) / 10) * r.w, 0));
}

// ---------- GitHub client ----------
const b64e = (str) => { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin); };
const b64d = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

export function ghConfigured() { const g = state.settings.github; return !!(g.owner && g.repo && g.token); }
export function gh() {
  const g = state.settings.github;
  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(g.owner)}/${encodeURIComponent(g.repo)}`;
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${g.token}`, 'X-GitHub-Api-Version': '2022-11-28' };
  const ref = g.branch || 'main';
  return {
    async getFile(path) {
      const r = await fetch(`${baseUrl}/contents/${path}?ref=${encodeURIComponent(ref)}&t=${Date.now()}`, { headers, cache: 'no-store' });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.json().catch(() => ({}))).message || r.statusText}`);
      const j = await r.json();
      if (j.content === '' && j.size > 0 && j.download_url) { // >1MB files
        const raw = await fetch(j.git_url, { headers: { ...headers, Accept: 'application/vnd.github.raw' } });
        return { text: await raw.text(), sha: j.sha };
      }
      return { text: b64d(j.content || ''), sha: j.sha };
    },
    async putFile(path, text, message, sha) {
      const body = { message, content: b64e(text), branch: ref };
      if (sha) body.sha = sha;
      const r = await fetch(`${baseUrl}/contents/${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.json().catch(() => ({}))).message || r.statusText}`);
      return r.json();
    },
    async repoInfo() {
      const r = await fetch(baseUrl, { headers });
      if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.json().catch(() => ({}))).message || r.statusText}`);
      return r.json();
    },
  };
}

// ---------- Vault encryption (AES-GCM 256, PBKDF2-SHA256) ----------
const ITER = 310000;
const bufToB64 = (buf) => { let s = ''; new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b))); return btoa(s); };
const b64ToBuf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
async function deriveKey(pass, salt) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptVault(obj, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return { format: 'dcos-vault', v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, cipher: 'AES-256-GCM', salt: bufToB64(salt), iv: bufToB64(iv), data: bufToB64(ct), saved: new Date().toISOString() };
}
export async function decryptVault(env, pass) {
  const key = await deriveKey(pass, b64ToBuf(env.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(env.iv) }, key, b64ToBuf(env.data));
  return JSON.parse(new TextDecoder().decode(pt));
}
/** The private part of state that goes into the encrypted vault (everything except the GitHub token). */
export function vaultPayload() {
  const s = clone(state); s.settings.github = { ...s.settings.github, token: '' }; return s;
}
