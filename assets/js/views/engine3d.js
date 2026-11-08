// Engine 3D — the Venture Engine as a living 3D machine, with every other module orbiting it
// and linked to the stages it feeds. Zero dependencies: a small perspective renderer on <canvas>.
import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, compact, fnum, toast, confirmBox, copyText, today } from '../ui.js';
import { RUBRIC } from '../seed.js';
import { FLOW, STAGE_INFO, gates, readiness, nextStage, prevStage } from '../gates.js';

// ---------- Model ----------
const TAU = Math.PI * 2;
const R = 3.8;                        // engine ring radius
const stageAngle = (i) => (i / FLOW.length) * TAU;
const STAGE_COLOR = { Idea: '#8f9bb0', Validate: '#6fa0d8', Plan: '#a18ad6', Build: '#c9a54c', Launch: '#e39a4f', Scale: '#4fb286', Parked: '#e0705c' };
const GROUPS = { knowledge: { label: 'Knowledge', color: '#6fa0d8' }, capital: { label: 'Capital', color: '#4fb286' }, governance: { label: 'Governance', color: '#a18ad6' } };

const MODULES = [
  { k: 'wiki', label: 'Knowledge Wiki', group: 'knowledge', href: '#/wiki', deg: 22, y: 2.1, r: 6.1, feeds: ['Idea', 'Validate', 'Plan'],
    role: 'The memory of the empire. Every idea starts by asking what we already know — market, regulation, benchmarks — and every finding is filed back here so the next idea starts smarter.' },
  { k: 'claude', label: 'Claude Desk', group: 'knowledge', href: '#/claude', deg: 72, y: 2.9, r: 6.1, feeds: ['Validate', 'Plan'], also: ['wiki'],
    role: 'Your research partner. Commission diligence on a venture at Validate; Claude researches it from primary sources overnight and files a dossier into the wiki.' },
  { k: 'math', label: 'Mastermind Lab', group: 'knowledge', href: '#/math', deg: 112, y: -1.9, r: 6.1, feeds: ['Validate', 'Plan', 'Launch'],
    role: 'The mathematics of the decision: expected value and Kelly sizing at Validate, NPV / DCF / break-even at Plan, and a logged forecast before you commit to scale.' },
  { k: 'legal', label: 'Legal & Entities', group: 'governance', href: '#/legal', deg: 150, y: 2.3, r: 6.1, feeds: ['Plan', 'Build', 'Scale'],
    role: 'Structure and trust. Choose the entity at Plan, make it active and register contracts at Build, and calendar the obligations that keep it in good standing.' },
  { k: 'treasury', label: 'Treasury', group: 'capital', href: '#/treasury', deg: 188, y: -1.7, r: 6.1, feeds: ['Plan', 'Build'],
    role: 'The capital gate. Only strategic cash — above your operating and reserve tiers — can fund a venture moving from Plan into Build.' },
  { k: 'finance', label: 'Accounting', group: 'capital', href: '#/finance', deg: 245, y: 2.2, r: 6.1, feeds: ['Build', 'Launch'],
    role: 'If it is not in the ledger it did not happen. Books open at Build; revenue booked in the ledger is what proves a Launch.' },
  { k: 'investments', label: 'Investments', group: 'capital', href: '#/investments', deg: 215, y: -3.4, r: 6.3, feeds: [], also: ['treasury'],
    role: 'The portfolio that compounds alongside the ventures. Liquid holdings top up strategic cash when the engine needs capital.' },
  { k: 'property', label: 'Property', group: 'capital', href: '#/property', deg: 165, y: -3.6, r: 6.3, feeds: [], also: ['treasury'],
    role: 'Income-producing assets. Net rental cash flow feeds Treasury, which funds the next venture.' },
];

let cam = { yaw: -0.55, pitch: 0.6, dist: 23, auto: true };
let selected = { kind: 'core', id: null };
let loop = null;
let wikiCount = 0;

// ---------- Math ----------
const v3 = (x, y, z) => ({ x, y, z });
const lerp3 = (a, b, t) => v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
const onRing = (ang, r = R, y = 0) => v3(Math.cos(ang) * r, y, Math.sin(ang) * r);
function arcPoint(a, b, t, lift) { const p = lerp3(a, b, t); p.y += Math.sin(Math.PI * t) * lift; return p; }

function buildScene(s) {
  const stations = FLOW.map((st, i) => ({ kind: 'stage', id: st, pos: onRing(stageAngle(i)), color: STAGE_COLOR[st] }));
  stations.push({ kind: 'stage', id: 'Parked', pos: v3(0, -3.1, 0), color: STAGE_COLOR.Parked });
  const stIdx = Object.fromEntries(stations.map((x) => [x.id, x]));
  const ventures = [];
  const perStage = {};
  for (const v of s.ventures) {
    const st = stIdx[v.stage] || stIdx.Idea;
    const n = (perStage[st.id] = (perStage[st.id] || 0) + 1) - 1;
    let pos;
    if (st.id === 'Parked') { const a = n * 1.3; pos = v3(Math.cos(a) * 1.1, -3.1 - 0.1 * n, Math.sin(a) * 1.1); }
    else { const i = FLOW.indexOf(st.id); const a = stageAngle(i) + (n % 2 ? 0.1 : -0.1) * Math.ceil(n / 2); pos = onRing(a, R + 0.35, 1.25 + 1.05 * n); }
    const rd = readiness(v);
    ventures.push({ kind: 'venture', id: v.id, v, pos, score: store.ventureScore(v, RUBRIC), ready: rd, color: STAGE_COLOR[v.stage] || STAGE_COLOR.Idea });
  }
  const modules = MODULES.map((m) => ({ ...m, kind: 'module', id: m.k, pos: onRing((m.deg * Math.PI) / 180, m.r, m.y), color: GROUPS[m.group].color }));
  const modIdx = Object.fromEntries(modules.map((m) => [m.k, m]));
  const links = [];
  for (const m of modules) {
    for (const st of m.feeds) links.push({ from: m, to: stIdx[st], color: m.color, kind: 'feed' });
    for (const o of m.also || []) links.push({ from: m, to: modIdx[o], color: m.color, kind: 'module' });
  }
  return { stations, stIdx, ventures, modules, modIdx, links, core: { kind: 'core', id: 'core', pos: v3(0, 0, 0) } };
}

/** Links specific to one venture: which modules it touches right now. */
function ventureLinks(sc, vn) {
  const v = vn.v, s = store.get(), out = [];
  const add = (k, why) => out.push({ from: vn, to: sc.modIdx[k], why });
  if (s.queue.some((q) => q.venture === v.id)) add('claude', 'Research commissioned');
  if (v.entity) add('legal', `Entity: ${v.entity}`);
  if (v.entity && s.journal.some((j) => j.entity === v.entity)) add('finance', 'Books open');
  if (s.decisions.some((d) => `${d.title} ${d.context || ''}`.toLowerCase().includes(v.name.toLowerCase()))) add('math', 'Decision logged');
  if (+v.capitalRequired > 0) add('treasury', `Needs ${compact(+v.capitalRequired, store.base())}`);
  return out;
}

// ---------- Renderer ----------
function start(canvas, panel) {
  if (loop) loop.stop();
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const C = (n) => css.getPropertyValue(n).trim();
  const theme = { text: C('--text'), muted: C('--muted'), gold: C('--gold'), bg: C('--bg'), panel: C('--panel'), line: C('--line-2'), light: document.documentElement.dataset.theme === 'light' };
  let sc = buildScene(store.get());
  let W = 0, H = 0, dpr = 1, f = 1, hits = [], hover = null, t0 = performance.now(), last = t0, lastInteract = 0, running = true;
  const drag = { on: false, x: 0, y: 0, moved: 0, pinch: 0 };
  const pointers = new Map();

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    f = Math.min(W, H * 1.35) * 1.25;
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement); resize();

  function project(p) {
    const ca = Math.cos(cam.yaw), sa = Math.sin(cam.yaw), cb = Math.cos(cam.pitch), sb = Math.sin(cam.pitch);
    const x1 = p.x * ca - p.z * sa, z1 = p.x * sa + p.z * ca;
    const y2 = p.y * cb - z1 * sb, z2 = p.y * sb + z1 * cb;
    const depth = z2 + cam.dist, k = f / Math.max(depth, 0.5);
    return { x: W / 2 + x1 * k, y: H * 0.5 - y2 * k, k, depth };
  }
  const fade = (depth) => Math.max(0.28, Math.min(1, 1.25 - (depth - cam.dist + 8) / 18));
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

  function sphere(p, r, color, alpha = 1, glow = 0) {
    if (glow) { const g = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * (2.2 + glow)); g.addColorStop(0, rgba(color, 0.35 * alpha)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * (2.2 + glow), 0, TAU); ctx.fill(); }
    const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, rgba('#ffffff', 0.85 * alpha)); g.addColorStop(0.25, rgba(color, alpha)); g.addColorStop(1, rgba(shade(color, -0.45), alpha));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  }
  function label(text, x, y, { size = 11, color = theme.text, alpha = 1, weight = 500, align = 'center', bg = false } = {}) {
    ctx.globalAlpha = alpha; ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (bg) { const w = ctx.measureText(text).width + 12; ctx.fillStyle = rgba(theme.light ? '#ffffff' : '#0b0e13', 0.72); roundRect(align === 'center' ? x - w / 2 : x - 6, y - size * 0.85, w, size * 1.7, 5); ctx.fill(); }
    ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function line3(a, b, color, width, alpha, lift = 0, dash = null) {
    const N = lift ? 18 : 1; ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = project(lift ? arcPoint(a, b, i / N, lift) : (i ? b : a)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function particle(p3, color, size, alpha) { const p = project(p3); const r = size * p.k * 0.05; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, TAU); ctx.fill(); }

  function frame(now) {
    if (!running) return;
    if (!canvas.isConnected) { stop(); return; }
    const dt = Math.max(0, Math.min(64, now - last)); last = now; const t = Math.max(0, now - t0) / 1000;
    if (cam.auto && !drag.on && now - lastInteract > 3500) cam.yaw += dt * 0.00009;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    hits = [];
    const sel = selected;
    const isSel = (o) => sel.kind === o.kind && sel.id === o.id;
    const selVenture = sel.kind === 'venture' ? sc.ventures.find((x) => x.id === sel.id) : null;
    const focusMod = sel.kind === 'module' ? sc.modIdx[sel.id] : null;
    const focusStage = sel.kind === 'stage' ? sel.id : null;

    // floor grid (subtle)
    for (let r = 2; r <= 9; r += 1.75) {
      ctx.strokeStyle = rgba(theme.light ? '#7a7466' : '#7f8896', 0.08); ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= 72; i++) { const p = project(onRing((i / 72) * TAU, r, -4.4)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }

    // engine ring: coloured arcs per stage, flowing direction Idea → Scale
    const SEG = 180;
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * TAU, a1 = ((i + 1) / SEG) * TAU;
      const si = Math.floor((a0 / TAU) * FLOW.length);
      const p0 = project(onRing(a0)), p1 = project(onRing(a1));
      const st = FLOW[si];
      const dim = focusStage && focusStage !== st ? 0.35 : 1;
      const back = si === FLOW.length - 1 && i > SEG - 8; // gap between Scale and Idea
      ctx.strokeStyle = rgba(STAGE_COLOR[st], (back ? 0.12 : 0.85) * fade(p0.depth) * dim);
      ctx.lineWidth = Math.max(2, 0.16 * p0.k); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    for (let i = 0; i < 30; i++) { const a = ((t * 0.05 + i / 30) % 1) * TAU * 0.96; const si = Math.min(FLOW.length - 1, Math.max(0, Math.floor((a / TAU) * FLOW.length))); particle(onRing(a), STAGE_COLOR[FLOW[si]], 1.6, 0.9); }

    // spokes core → stations
    for (const st of sc.stations) line3(sc.core.pos, st.pos, st.color, 1, focusStage === st.id ? 0.6 : 0.16, 0, [3, 5]);

    // module links (knowledge/capital feeding stages)
    for (const L of sc.links) {
      const on = (focusMod && (L.from === focusMod || L.to === focusMod)) || (focusStage && L.to.id === focusStage);
      const any = focusMod || focusStage || selVenture;
      const alpha = on ? 0.75 : any ? 0.07 : 0.22;
      line3(L.from.pos, L.to.pos, L.color, on ? 2 : 1.2, alpha, 1.2);
      const n = on ? 4 : 2;
      for (let k = 0; k < n; k++) particle(arcPoint(L.from.pos, L.to.pos, (t * 0.22 + k / n) % 1, 1.2), L.color, on ? 1.5 : 1.1, on ? 0.95 : any ? 0.15 : 0.55);
    }
    // venture-specific links when a venture is selected
    if (selVenture) for (const L of ventureLinks(sc, selVenture)) {
      line3(L.from.pos, L.to.pos, sc.modIdx[L.to.id].color, 2.2, 0.85, 0.8);
      for (let k = 0; k < 3; k++) particle(arcPoint(L.to.pos, L.from.pos, (t * 0.3 + k / 3) % 1, 0.8), L.to.color, 1.5, 0.95);
      const mid = project(arcPoint(L.from.pos, L.to.pos, 0.5, 0.8));
      label(L.why, mid.x, mid.y, { size: 10, color: theme.text, bg: true });
    }

    // collect solid objects and draw far → near
    const objs = [];
    objs.push({ o: sc.core, p: project(sc.core.pos) });
    for (const x of sc.stations) objs.push({ o: x, p: project(x.pos) });
    for (const x of sc.modules) objs.push({ o: x, p: project(x.pos) });
    for (const x of sc.ventures) objs.push({ o: x, p: project(x.pos) });
    objs.sort((a, b) => b.p.depth - a.p.depth);

    for (const { o, p } of objs) {
      const a = fade(p.depth);
      const hov = hover && hover.kind === o.kind && hover.id === o.id;
      if (o.kind === 'core') {
        const r = 0.95 * p.k * (1 + Math.sin(t * 2) * 0.03);
        sphere(p, r, theme.gold.startsWith('#') ? theme.gold : '#c9a54c', 1, 1.2);
        ctx.strokeStyle = rgba('#c9a54c', 0.5); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.6, r * 0.5, 0, 0, TAU); ctx.stroke();
        label('ENGINE', p.x, p.y - 2, { size: 11, weight: 700, color: '#17130a' });
        label(`${sc.ventures.filter((v) => v.v.stage !== 'Parked').length} live`, p.x, p.y + 11, { size: 9.5, color: '#17130a', alpha: 0.8 });
        hits.push({ o, x: p.x, y: p.y, r: r * 1.1, d: p.depth });
      } else if (o.kind === 'stage') {
        const r = 0.34 * p.k;
        const dim = (focusStage && focusStage !== o.id) || (focusMod && !focusMod.feeds.includes(o.id)) ? 0.4 : 1;
        sphere(p, r, o.color, a * dim, isSel(o) || hov ? 1 : 0.2);
        ctx.strokeStyle = rgba(o.color, 0.7 * a * dim); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.9, r * 0.65, 0, 0, TAU); ctx.stroke();
        const count = sc.ventures.filter((v) => v.v.stage === o.id).length;
        label(`${o.id.toUpperCase()}${count ? ' · ' + count : ''}`, p.x, p.y + r + 13, { size: 10.5, weight: 700, color: o.color, alpha: Math.max(0.5, a) * dim, bg: true });
        hits.push({ o, x: p.x, y: p.y, r: Math.max(r * 1.6, 14), d: p.depth });
      } else if (o.kind === 'module') {
        const r = 0.5 * p.k;
        const lit = !focusMod && !focusStage && !selVenture || (focusMod === o) || (focusStage && o.feeds.includes(focusStage)) || (selVenture && ventureLinks(sc, selVenture).some((L) => L.to === o));
        const al = a * (lit ? 1 : 0.35);
        // module as a faceted gem: sphere + orbit ring
        sphere(p, r, o.color, al, isSel(o) || hov ? 1.1 : 0.3);
        ctx.strokeStyle = rgba(o.color, 0.55 * al); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.55, r * 0.45, -0.3, 0, TAU); ctx.stroke();
        label(o.label, p.x, p.y - r - 12, { size: 12, weight: 600, color: theme.text, alpha: Math.max(0.45, al), bg: true });
        hits.push({ o, x: p.x, y: p.y, r: Math.max(r * 1.3, 16), d: p.depth });
      } else if (o.kind === 'venture') {
        const r = (0.3 + (o.score / 100) * 0.28) * p.k;
        const dim = (focusStage && o.v.stage !== focusStage) || focusMod ? 0.45 : 1;
        sphere(p, r, '#e2c477', a * dim, isSel(o) || hov ? 1.4 : 0.5);
        // readiness arc
        ctx.lineWidth = Math.max(2, r * 0.22); ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(theme.light ? '#000000' : '#ffffff', 0.12 * dim); ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.35, 0, TAU); ctx.stroke();
        if (o.ready.pct > 0) { ctx.strokeStyle = rgba(o.ready.pct >= 1 ? '#4fb286' : o.color, 0.95 * dim); ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * o.ready.pct); ctx.stroke(); }
        ctx.lineCap = 'butt';
        if (isSel(o)) { ctx.strokeStyle = rgba('#e2c477', 0.9); ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.85 + Math.sin(t * 3) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        label(o.v.name, p.x + r * 1.6 + 6, p.y - 4, { size: 12, weight: 600, align: 'left', color: theme.text, alpha: Math.max(0.55, a) * dim, bg: true });
        label(`${o.score} · ${o.ready.met}/${o.ready.total} gates`, p.x + r * 1.6 + 6, p.y + 12, { size: 9.5, align: 'left', color: theme.muted, alpha: Math.max(0.5, a) * dim });
        hits.push({ o, x: p.x, y: p.y, r: Math.max(r * 1.5, 14), d: p.depth });
      }
    }

    if (hover) { canvas.style.cursor = 'pointer'; } else canvas.style.cursor = drag.on ? 'grabbing' : 'grab';
    requestAnimationFrame(frame);
  }

  function pick(x, y) {
    let best = null;
    for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y); if (d <= h.r && (!best || h.d < best.d)) best = h; }
    return best?.o || null;
  }
  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, local(e)); drag.on = true; const p = local(e); drag.x = p.x; drag.y = p.y; drag.moved = 0; lastInteract = performance.now(); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag.pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (drag.on && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (drag.pinch) cam.dist = clampD(cam.dist * (drag.pinch / d)); drag.pinch = d; drag.moved += 10; return; }
    if (drag.on) { const dx = p.x - drag.x, dy = p.y - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); cam.yaw -= dx * 0.008; cam.pitch = Math.max(-0.15, Math.min(1.25, cam.pitch + dy * 0.006)); drag.x = p.x; drag.y = p.y; lastInteract = performance.now(); }
    else { const h = pick(p.x, p.y); hover = h ? { kind: h.kind, id: h.id } : null; }
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (!drag.on) return;
    if (pointers.size === 0) {
      drag.on = false;
      if (drag.moved < 6) { const h = pick(local(e).x, local(e).y); select(h ? { kind: h.kind, id: h.id } : { kind: 'core', id: null }); }
    }
    drag.pinch = 0;
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { hover = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = clampD(cam.dist * (1 + Math.sign(e.deltaY) * 0.08)); lastInteract = performance.now(); }, { passive: false });

  function select(s) { selected = s; panel.innerHTML = panelHTML(sc); }
  function refresh() { sc = buildScene(store.get()); panel.innerHTML = panelHTML(sc); }
  function stop() { running = false; ro.disconnect(); }
  loop = { stop, refresh, select };
  panel.innerHTML = panelHTML(sc);
  requestAnimationFrame(frame);
}
const clampD = (d) => Math.max(11, Math.min(40, d));
function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join(''); }

// ---------- Side panel ----------
const modLabel = (k) => (k === 'ventures' ? 'Venture Engine' : MODULES.find((m) => m.k === k)?.label || k);
const modColor = (k) => (k === 'ventures' ? '#c9a54c' : GROUPS[MODULES.find((m) => m.k === k)?.group]?.color || '#888');
const chip = (txt, color) => `<span class="badge" style="color:${color};border-color:${color}55;background:${color}18">${esc(txt)}</span>`;

function gateList(g) {
  return `<div class="eng-gates">${g.map((x) => `<a class="eng-gate ${x.ok ? 'ok' : ''}" href="${x.href}">
    <span class="tick">${x.ok ? '✓' : ''}</span><span class="grow"><span>${esc(x.label)}</span>${x.hint && !x.ok ? `<span class="small muted" style="display:block">${esc(x.hint)}</span>` : ''}</span>
    ${chip(modLabel(x.module), modColor(x.module))}</a>`).join('')}</div>`;
}

function moduleStats(k) {
  const s = store.get(), b = store.base(), w = store.wealth();
  switch (k) {
    case 'wiki': return `${wikiCount} articles in the knowledge base`;
    case 'claude': return `${s.queue.filter((q) => ['queued', 'in-progress'].includes(q.status)).length} in progress · ${s.queue.filter((q) => q.status === 'done').length} done · ${s.queue.filter((q) => q.status === 'proposed').length} proposed`;
    case 'math': return `${s.decisions.length} decisions logged · 8 calculators`;
    case 'legal': return `${s.entities.length} entities (${s.entities.filter((e) => e.status === 'Active').length} active) · ${s.contracts.length} contracts`;
    case 'treasury': return `Strategic cash ${compact(w.byTier.Strategic || 0, b)} · runway ${Number.isFinite(w.runway) ? fnum(w.runway, 1) + ' mo' : '—'}`;
    case 'finance': return `${s.journal.length} journal entries across ${new Set(s.journal.map((j) => j.entity)).size} entities`;
    case 'investments': return `${s.holdings.length} holdings · ${compact(w.invest, b)}`;
    case 'property': return `${s.properties.length} properties · equity ${compact(w.propEquity, b)}`;
    default: return '';
  }
}

function panelHTML(sc) {
  const sel = selected;
  if (sel.kind === 'venture') {
    const vn = sc.ventures.find((x) => x.id === sel.id);
    if (!vn) { selected = { kind: 'core', id: null }; return panelHTML(sc); }
    const v = vn.v, nxt = nextStage(v.stage), prv = prevStage(v.stage), rd = vn.ready;
    const links = ventureLinks(sc, vn);
    const hasDiligence = store.get().queue.some((q) => q.venture === v.id);
    return `<div class="eng-head"><div class="eyebrow" style="color:${STAGE_COLOR[v.stage]}">${esc(v.stage)}${nxt ? ` → ${nxt}` : ''}</div><h2>${esc(v.name)}</h2><p class="small muted">${esc(v.summary)}</p></div>
      <div class="row"><span class="score-ring" style="font-size:26px">${vn.score}</span><span class="muted small">/100 score</span>
        <span class="right badge ${rd.pct >= 1 ? 'green' : 'gold'}">${rd.met}/${rd.total} gates</span></div>
      ${v.stage === 'Parked' ? `<p class="small muted">${esc(STAGE_INFO.Parked)}</p>` : nxt ? `<h4 class="eng-sub">To move into ${nxt}</h4>${gateList(rd.gates)}` : `<h4 class="eng-sub">At full scale</h4>${gateList(rd.gates)}`}
      <div class="eng-actions">
        ${nxt && v.stage !== 'Parked' ? `<button class="btn ${rd.pct >= 1 ? 'primary' : ''}" data-act="advance" data-id="${v.id}">${icon('arrow')} Advance to ${nxt}</button>` : ''}
        ${v.stage === 'Parked' ? `<button class="btn primary" data-act="revive" data-id="${v.id}">Revive to Idea</button>` : ''}
        ${prv && v.stage !== 'Parked' ? `<button class="btn sm ghost" data-act="back" data-id="${v.id}">Back to ${prv}</button>` : ''}
        <a class="btn sm" href="#/ventures/${v.id}">Open venture</a>
        ${!hasDiligence ? `<button class="btn sm" data-act="diligence" data-id="${v.id}">${icon('spark')} Commission diligence</button>` : ''}
        ${v.stage !== 'Parked' ? `<button class="btn sm ghost danger" data-act="park" data-id="${v.id}">Park</button>` : ''}
      </div>
      <h4 class="eng-sub">Connected tools</h4>
      ${links.length ? `<div class="list">${links.map((L) => `<a class="list-item" href="${L.to.href}">${chip(L.to.label, L.to.color)}<span class="small grow">${esc(L.why)}</span></a>`).join('')}</div>` : '<p class="small muted">No modules connected yet. The gates above show which tools to use next.</p>'}
      ${(v.history || []).length ? `<h4 class="eng-sub">Journey</h4><div class="small muted">${v.history.slice(-6).reverse().map((h) => `<div>${esc(h.date)} · ${esc(h.from)} → <b style="color:var(--text)">${esc(h.to)}</b></div>`).join('')}</div>` : ''}`;
  }
  if (sel.kind === 'module') {
    const m = sc.modIdx[sel.id];
    const g = GROUPS[m.group];
    return `<div class="eng-head"><div class="eyebrow" style="color:${g.color}">${g.label} module</div><h2>${esc(m.label)}</h2></div>
      <p>${esc(m.role)}</p>
      <div class="callout small">${esc(moduleStats(m.k))}</div>
      ${m.feeds.length ? `<h4 class="eng-sub">Feeds these stages</h4><div class="row">${m.feeds.map((st) => `<button class="btn sm" data-act="pickStage" data-id="${st}" style="color:${STAGE_COLOR[st]}">${st}</button>`).join('')}</div>` : ''}
      ${(m.also || []).length ? `<h4 class="eng-sub">Feeds</h4><div class="row">${m.also.map((o) => `<button class="btn sm" data-act="pickModule" data-id="${o}">${esc(sc.modIdx[o].label)}</button>`).join('')}</div>` : ''}
      ${gateUses(sc, m.k)}
      <div class="eng-actions"><a class="btn primary" href="${m.href}">Open ${esc(m.label)} ${icon('arrow')}</a></div>`;
  }
  if (sel.kind === 'stage') {
    const st = sel.id;
    const vs = sc.ventures.filter((x) => x.v.stage === st);
    const feeders = sc.modules.filter((m) => m.feeds.includes(st));
    return `<div class="eng-head"><div class="eyebrow" style="color:${STAGE_COLOR[st]}">Stage ${st === 'Parked' ? '' : FLOW.indexOf(st) + 1 + ' of 6'}</div><h2>${esc(st)}</h2></div>
      <p>${esc(STAGE_INFO[st])}</p>
      ${feeders.length ? `<h4 class="eng-sub">Powered by</h4><div class="row">${feeders.map((m) => `<button class="btn sm" data-act="pickModule" data-id="${m.k}" style="color:${m.color}">${esc(m.label)}</button>`).join('')}</div>` : ''}
      <h4 class="eng-sub">Ventures here</h4>
      ${vs.length ? `<div class="list">${vs.map((x) => `<a class="list-item" data-act="pickVenture" data-id="${x.id}" style="cursor:pointer"><b class="grow">${esc(x.v.name)}</b><span class="badge ${x.ready.pct >= 1 ? 'green' : ''}">${x.ready.met}/${x.ready.total}</span></a>`).join('')}</div>` : '<p class="small muted">None yet.</p>'}
      ${st === 'Idea' ? `<div class="eng-actions"><a class="btn primary" href="#/ventures" data-act="newVenture">${icon('plus')} New idea</a></div>` : ''}`;
  }
  // core / overview
  const s = store.get();
  const live = sc.ventures.filter((x) => x.v.stage !== 'Parked');
  const readyNow = live.filter((x) => x.ready.pct >= 1 && nextStage(x.v.stage));
  const stuck = live.slice().sort((a, b) => a.ready.pct - b.ready.pct)[0];
  return `<div class="eng-head"><div class="eyebrow">The engine</div><h2>From idea to empire</h2></div>
    <p class="small">Ventures travel clockwise around the ring — <b style="color:${STAGE_COLOR.Idea}">Idea</b> → <b style="color:${STAGE_COLOR.Validate}">Validate</b> → <b style="color:${STAGE_COLOR.Plan}">Plan</b> → <b style="color:${STAGE_COLOR.Build}">Build</b> → <b style="color:${STAGE_COLOR.Launch}">Launch</b> → <b style="color:${STAGE_COLOR.Scale}">Scale</b>. Each move is earned by passing gates, and every gate is satisfied by one of the tools orbiting the engine.</p>
    <div class="calc-out" style="margin-top:8px"><div class="o"><div class="l">Live ventures</div><div class="v">${live.length}</div></div><div class="o"><div class="l">Ready to advance</div><div class="v">${readyNow.length}</div></div></div>
    ${readyNow.length ? `<h4 class="eng-sub">Ready to advance</h4><div class="list">${readyNow.map((x) => `<a class="list-item" data-act="pickVenture" data-id="${x.id}" style="cursor:pointer"><b class="grow">${esc(x.v.name)}</b>${chip(x.v.stage + ' → ' + nextStage(x.v.stage), STAGE_COLOR[nextStage(x.v.stage)])}</a>`).join('')}</div>` : ''}
    ${stuck ? `<h4 class="eng-sub">Most blocked</h4><a class="list-item" data-act="pickVenture" data-id="${stuck.id}" style="cursor:pointer"><b class="grow">${esc(stuck.v.name)}</b><span class="small muted">${stuck.ready.met}/${stuck.ready.total} gates at ${esc(stuck.v.stage)}</span></a>` : ''}
    <h4 class="eng-sub">Reading the model</h4>
    <div class="small muted eng-legend">
      <div><span class="lg-dot" style="background:#e2c477"></span>Gold orbs are ventures — size is score, the ring around each is readiness for the next stage.</div>
      ${Object.values(GROUPS).map((g) => `<div><span class="lg-dot" style="background:${g.color}"></span>${g.label} modules — lines and particles show what they feed.</div>`).join('')}
      <div><span class="lg-dot" style="background:${STAGE_COLOR.Parked}"></span>Parked ideas rest beneath the engine.</div>
      <div style="margin-top:6px">Drag to orbit · scroll or pinch to zoom · click anything.</div>
    </div>`;
}

function gateUses(sc, k) {
  const uses = sc.ventures.flatMap((x) => x.ready.gates.filter((g) => g.module === k && !g.ok).map((g) => ({ x, g })));
  if (!uses.length) return '';
  return `<h4 class="eng-sub">Blocking right now</h4><div class="list">${uses.slice(0, 6).map(({ x, g }) => `<a class="list-item" href="${g.href}"><span class="grow small"><b>${esc(x.v.name)}</b> — ${esc(g.label)}</span></a>`).join('')}</div>`;
}

// ---------- View ----------
function moveStage(id, to) {
  store.update((s) => {
    const v = s.ventures.find((x) => x.id === id); if (!v) return;
    (v.history ||= []).push({ date: today(), from: v.stage, to });
    v.stage = to; v.updated = today();
  });
}

export default {
  title: 'Engine 3D',
  async render(s) {
    try { wikiCount = (await K.loadIndex()).articles.length; } catch { wikiCount = 0; }
    const live = s.ventures.filter((v) => v.stage !== 'Parked');
    const rows = live.map((v) => ({ v, r: readiness(v) })).sort((a, b) => FLOW.indexOf(b.v.stage) - FLOW.indexOf(a.v.stage) || b.r.pct - a.r.pct);
    return `
    <div class="page-head"><div><div class="eyebrow">Build</div><h1>Engine 3D</h1>
      <p>Your pipeline as a machine. Ventures move round the ring from idea to scale; every other tool in the empire orbits it and powers a stage. Click an orb to see exactly what stands between it and the next stage.</p></div>
      <div class="actions"><button class="btn" data-act="resetCam">${icon('sync')} Reset view</button><button class="btn" data-act="toggleSpin">${cam.auto ? 'Pause rotation' : 'Rotate'}</button><a class="btn primary" href="#/ventures" data-act="newVenture">${icon('plus')} New idea</a></div></div>
    <div class="eng-wrap">
      <div class="eng-stage card flush"><canvas id="eng-canvas" aria-label="3D model of the venture engine and its connected modules"></canvas>
        <div class="eng-hint small">Drag to orbit · scroll to zoom · click to inspect</div></div>
      <aside class="eng-panel card" id="eng-panel"></aside>
    </div>
    <div class="card flush mt"><div class="card-head"><h3>Pipeline readiness</h3><div class="right small muted">Gates met for each venture's next move</div></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Venture</th><th>Stage</th><th>Next</th><th style="width:38%">Readiness</th><th class="num">Score</th></tr></thead><tbody>
      ${rows.map(({ v, r }) => `<tr class="click" data-act="pickVenture" data-id="${v.id}"><td><b>${esc(v.name)}</b></td><td><span class="badge" style="color:${STAGE_COLOR[v.stage]}">${esc(v.stage)}</span></td><td class="small muted">${esc(nextStage(v.stage) || '—')}</td>
        <td><div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.pct * 100)}%;background:${r.pct >= 1 ? 'var(--green)' : STAGE_COLOR[v.stage]}"></div></div><div class="small muted" style="margin-top:3px">${r.met}/${r.total} · ${esc(r.gates.find((g) => !g.ok)?.label || 'All gates met')}</div></td>
        <td class="num"><span class="score-ring" style="font-size:16px">${store.ventureScore(v, RUBRIC)}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No live ventures. Add an idea to start the engine.</div>'}
    </div>`;
  },
  mount(el) {
    const canvas = el.querySelector('#eng-canvas'), panel = el.querySelector('#eng-panel');
    if (canvas && panel) start(canvas, panel);
  },
  actions: {
    resetCam() { cam = { yaw: -0.55, pitch: 0.6, dist: 23, auto: cam.auto }; },
    toggleSpin(el) { cam.auto = !cam.auto; el.textContent = cam.auto ? 'Pause rotation' : 'Rotate'; },
    pickVenture(el) { loop?.select({ kind: 'venture', id: el.dataset.id }); if (window.innerWidth < 1100) document.getElementById('eng-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
    pickModule(el) { loop?.select({ kind: 'module', id: el.dataset.id }); },
    pickStage(el) { loop?.select({ kind: 'stage', id: el.dataset.id }); },
    newVenture(el, e) { e.preventDefault(); import('./ventures.js').then((m) => m.default.actions.new()); },
    async advance(el) {
      const v = store.byId('ventures', el.dataset.id); const nxt = nextStage(v.stage); if (!nxt) return;
      const r = readiness(v);
      if (r.pct < 1 && !(await confirmBox(`${v.name} has met ${r.met} of ${r.total} gates for ${nxt}. Advance anyway? Skipping gates is how capital gets lost.`, `Advance to ${nxt}`))) return;
      selected = { kind: 'venture', id: v.id }; moveStage(v.id, nxt); toast(`${v.name} moved to ${nxt}`, 'ok');
    },
    back(el) { const v = store.byId('ventures', el.dataset.id); const p = prevStage(v.stage); if (p) { selected = { kind: 'venture', id: v.id }; moveStage(v.id, p); } },
    async park(el) { const v = store.byId('ventures', el.dataset.id); if (await confirmBox(`Park ${v.name}? It will rest beneath the engine until you revive it.`, 'Park')) { selected = { kind: 'venture', id: v.id }; moveStage(v.id, 'Parked'); } },
    revive(el) { selected = { kind: 'venture', id: el.dataset.id }; moveStage(el.dataset.id, 'Idea'); },
    diligence(el) {
      const v = store.byId('ventures', el.dataset.id);
      const item = K.addToQueue({ type: 'diligence', title: `Due diligence: ${v.name}`, question: `Assess ${v.name} (${v.summary}). Cover market size and demand evidence in the UAE/GCC, competitors and pricing benchmarks, regulatory and licensing requirements, unit economics benchmarks, capital required and key risks. Recommend the three riskiest assumptions to test first and the cheapest test for each.`, domain: 'Business & Ventures', venture: v.id, priority: 'High' });
      if (K.mode() !== 'connected') copyText(K.promptFor(item, store.get().ventures));
      toast('Diligence sent to Claude', 'ok');
    },
  },
};
