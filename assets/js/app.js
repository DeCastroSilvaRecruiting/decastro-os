// De Castro OS — shell, router and event delegation.
import * as store from './store.js';
import { icon, esc, toast } from './ui.js';
import * as K from './knowledge.js';

import dashboard from './views/dashboard.js';
import ventures from './views/ventures.js';
import engine from './views/engine3d.js';
import wiki from './views/wiki.js';
import claude from './views/claude.js';
import finance from './views/finance.js';
import treasury from './views/treasury.js';
import property from './views/property.js';
import investments from './views/investments.js';
import legal from './views/legal.js';
import mathlab from './views/mathlab.js';
import settings from './views/settings.js';

const ROUTES = { dashboard, ventures, engine, wiki, claude, finance, treasury, property, investments, legal, math: mathlab, settings };
const NAV = [
  ['Command', [['dashboard', 'Command Centre', 'dashboard']]],
  ['Build', [['ventures', 'Venture Engine', 'ventures'], ['engine', 'Engine 3D', 'cube'], ['wiki', 'Knowledge Wiki', 'wiki'], ['claude', 'Claude Desk', 'claude']]],
  ['Wealth', [['treasury', 'Treasury', 'treasury'], ['investments', 'Investments', 'investments'], ['property', 'Property', 'property'], ['finance', 'Accounting', 'finance']]],
  ['Govern', [['legal', 'Legal & Entities', 'legal'], ['math', 'Mastermind Lab', 'math']]],
];

const $nav = document.getElementById('nav');
const $top = document.getElementById('top');
const $view = document.getElementById('view');
let current = { mod: null, name: '', params: [] };
let renderToken = 0;

function parseHash() {
  const h = decodeURI(location.hash.replace(/^#\/?/, '')) || 'dashboard';
  const [name, ...params] = h.split('/');
  return { name: ROUTES[name] ? name : 'dashboard', params };
}

function renderNav(active) {
  const s = store.get();
  const counts = { ventures: s.ventures.filter((v) => !['Parked'].includes(v.stage)).length, claude: s.queue.filter((q) => ['queued', 'proposed', 'in-progress'].includes(q.status)).length };
  $nav.innerHTML = `
    <div class="brand"><div class="mark">DC</div><div><div class="name">${esc(s.settings.empire)} OS</div><div class="sub">Wealth · Trust · Legacy</div></div></div>
    ${NAV.map(([group, items]) => `<div class="nav-group">${group}</div>${items.map(([k, label, ic]) => `
      <a class="nav-link ${k === active ? 'active' : ''}" href="#/${k}">${icon(ic)}<span>${label}</span>${counts[k] ? `<span class="count">${counts[k]}</span>` : ''}</a>`).join('')}`).join('')}
    <div class="nav-group">System</div>
    <a class="nav-link ${active === 'settings' ? 'active' : ''}" href="#/settings">${icon('settings')}<span>Settings & Sync</span></a>
    <div class="nav-foot"><span class="sync-dot ${K.mode() === 'connected' ? 'on' : ''}"></span>${K.mode() === 'connected' ? `Vault: ${esc(s.settings.github.owner)}/${esc(s.settings.github.repo)}` : 'Local mode — connect your vault in Settings'}</div>`;
}

function renderTop(title) {
  const theme = store.get().settings.theme;
  $top.innerHTML = `
    <button class="btn ghost icon-btn menu-btn" data-shell="menu" aria-label="Menu">${icon('menu')}</button>
    <div class="crumb">${esc(store.get().settings.empire)} OS / <b>${esc(title)}</b></div>
    <div class="spacer"></div>
    <button class="btn sm" data-shell="ask">${icon('spark')} Ask the wiki</button>
    ${K.mode() === 'connected' ? `<button class="btn sm ghost" data-shell="sync" title="Sync queue with your vault">${icon('sync')} Sync</button>` : ''}
    <button class="btn ghost icon-btn" data-shell="theme" aria-label="Toggle theme">${icon(theme === 'light' ? 'moon' : 'sun')}</button>`;
}

async function render() {
  const token = ++renderToken;
  const { name, params } = parseHash();
  const mod = ROUTES[name];
  const same = current.name === name && JSON.stringify(current.params) === JSON.stringify(params);
  const scroll = same ? window.scrollY : 0;
  current = { mod, name, params };
  document.body.classList.remove('nav-open');
  renderNav(name);
  renderTop(mod.title);
  try {
    const html = await mod.render(store.get(), params);
    if (token !== renderToken) return;
    $view.innerHTML = html;
    mod.mount?.($view, params);
    window.scrollTo(0, scroll);
  } catch (e) {
    console.error(e);
    $view.innerHTML = `<div class="callout red">Something went wrong rendering this page: ${esc(e.message)}</div>`;
  }
}
export const rerender = render;

// ---------- Event delegation ----------
function dispatch(kind, e) {
  const attr = kind === 'click' ? 'act' : kind;
  const el = e.target.closest(`[data-${attr}]`);
  if (!el || !$view.contains(el)) return;
  const fn = current.mod?.actions?.[el.dataset[attr]];
  if (fn) { if (kind === 'click' && el.tagName === 'A' && !el.getAttribute('href')?.startsWith('#/')) e.preventDefault(); fn(el, e, current.params); }
}
$view.addEventListener('click', (e) => dispatch('click', e));
$view.addEventListener('change', (e) => dispatch('change', e));
$view.addEventListener('input', (e) => dispatch('input', e));

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-shell]');
  if (!b) { if (document.body.classList.contains('nav-open') && !e.target.closest('#nav')) document.body.classList.remove('nav-open'); return; }
  const a = b.dataset.shell;
  if (a === 'menu') { e.stopPropagation(); document.body.classList.toggle('nav-open'); }
  if (a === 'theme') { store.update((s) => { s.settings.theme = s.settings.theme === 'light' ? 'dark' : 'light'; }); applyTheme(); }
  if (a === 'ask') wiki.ask();
  if (a === 'sync') {
    try { const r = await K.syncQueue(); K.clearCache(); toast(`Synced ${r.items} queue items${r.pushed ? ' and pushed changes' : ''}`, 'ok'); render(); }
    catch (err) { toast(err.message, 'error'); }
  }
});

function applyTheme() { document.documentElement.dataset.theme = store.get().settings.theme === 'light' ? 'light' : 'dark'; }

// ---------- Boot ----------
store.load();
applyTheme();
store.subscribe(() => render());
window.addEventListener('hashchange', render);
store.maybeSnapshot();
render();
if (K.mode() === 'connected') K.syncQueue().catch((e) => console.warn('Initial sync failed', e));
else if (!store.get().settings.starterQueueLoaded) {
  // First run in local mode: load the starter research questions so the Claude Desk isn't empty.
  fetch('starter/queue/queue.json').then((r) => (r.ok ? r.json() : null)).then((q) => {
    store.update((s) => { s.settings.starterQueueLoaded = true; if (q?.items && !s.queue.length) s.queue = q.items; });
  }).catch(() => {});
}
