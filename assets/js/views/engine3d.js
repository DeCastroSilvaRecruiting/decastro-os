// The Tower — the venture pipeline as a high-tech living building.
// Six stage floors rise from a seed vault in the soil to a canopy crown; every other module of the
// empire is a pavilion around the base, joined to the floors it powers by glowing sky-bridges.
// Zero dependencies: a small perspective renderer with lit polygons on <canvas>.
import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, compact, fnum, toast, confirmBox, copyText, today } from '../ui.js';
import { RUBRIC } from '../seed.js';
import { FLOW, STAGE_INFO, gates, readiness, nextStage, prevStage } from '../gates.js';

// ---------- Model ----------
const TAU = Math.PI * 2;
const STAGE_COLOR = { Idea: '#8f9bb0', Validate: '#6fa0d8', Plan: '#a18ad6', Build: '#c9a54c', Launch: '#e39a4f', Scale: '#4fb286', Parked: '#e0705c' };
const STAGE_NAME = { Idea: 'Seed', Validate: 'Sprout', Plan: 'Sapling', Build: 'Growth', Launch: 'Bloom', Scale: 'Canopy', Parked: 'Seed Vault' };
const GROUPS = { knowledge: { label: 'Knowledge', color: '#6fa0d8' }, capital: { label: 'Capital', color: '#4fb286' }, governance: { label: 'Governance', color: '#a18ad6' } };

const MODULES = [
  { k: 'wiki', label: 'Knowledge Wiki', group: 'knowledge', href: '#/wiki', deg: 20, feeds: ['Idea', 'Validate', 'Plan'],
    role: 'The memory of the empire. Every idea starts by asking what we already know — market, regulation, benchmarks — and every finding is filed back here so the next idea starts smarter.' },
  { k: 'claude', label: 'Claude Desk', group: 'knowledge', href: '#/claude', deg: 65, feeds: ['Validate', 'Plan'], also: ['wiki'],
    role: 'Your research partner. Commission diligence on a venture at Validate; Claude researches it from primary sources overnight and files a dossier into the wiki.' },
  { k: 'math', label: 'Mastermind Lab', group: 'knowledge', href: '#/math', deg: 110, feeds: ['Validate', 'Plan', 'Launch'],
    role: 'The mathematics of the decision: expected value and Kelly sizing at Validate, NPV / DCF / break-even at Plan, and a logged forecast before you commit to scale.' },
  { k: 'legal', label: 'Legal & Entities', group: 'governance', href: '#/legal', deg: 155, feeds: ['Plan', 'Build', 'Scale'],
    role: 'Structure and trust. Choose the entity at Plan, make it active and register contracts at Build, and calendar the obligations that keep it in good standing.' },
  { k: 'treasury', label: 'Treasury', group: 'capital', href: '#/treasury', deg: 200, feeds: ['Plan', 'Build'],
    role: 'The capital gate. Only strategic cash — above your operating and reserve tiers — can fund a venture moving from Plan into Build.' },
  { k: 'finance', label: 'Accounting', group: 'capital', href: '#/finance', deg: 245, feeds: ['Build', 'Launch'],
    role: 'If it is not in the ledger it did not happen. Books open at Build; revenue booked in the ledger is what proves a Launch.' },
  { k: 'investments', label: 'Investments', group: 'capital', href: '#/investments', deg: 290, feeds: [], also: ['treasury'],
    role: 'The portfolio that compounds alongside the ventures. Liquid holdings top up strategic cash when the tower needs capital.' },
  { k: 'property', label: 'Property', group: 'capital', href: '#/property', deg: 335, feeds: [], also: ['treasury'],
    role: 'Income-producing assets. Net rental cash flow feeds Treasury, which funds the next venture.' },
];

// ---------- Architecture ----------
const FH = 1.55, NF = FLOW.length, B = 0.35, SIDES = 8, TOP = B + NF * FH;
const TY = 4.4;                         // camera target height
const SITE = 8.2, DEPTH = 3.4, MOD_R = 6.0, VAULT_R = 1.5;
const rad = (y) => 2.15 + 0.42 * Math.sin(y * 0.5 + 0.5) - y * 0.035;
const twist = (y) => y * 0.085;
const floorY = (i) => B + i * FH;
const stageMidY = (st) => (st === 'Parked' ? -1.9 : floorY(FLOW.indexOf(st)) + FH / 2);

const CAM0 = { yaw: 0.6, pitch: 0.34, dist: 30 };
let cam = { ...CAM0, auto: true };
let selected = { kind: 'core', id: null };
let loop = null;
let wikiCount = 0;

// ---------- Math ----------
const v3 = (x, y, z) => ({ x, y, z });
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const neg = (a) => v3(-a.x, -a.y, -a.z);
const nrm = (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1; return v3(a.x / l, a.y / l, a.z / l); };
const lerp3 = (a, b, t) => v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
const polar = (deg, r, y = 0) => v3(Math.cos((deg * Math.PI) / 180) * r, y, Math.sin((deg * Math.PI) / 180) * r);
const frac = (x) => x - Math.floor(x);
const hash = (a, b, c) => frac(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453);
const LV = nrm(v3(-0.45, 0.75, 0.5));

const _rgb = new Map();
const hex2rgb = (h) => { let c = _rgb.get(h); if (!c) { const n = parseInt(h.slice(1), 16); c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; _rgb.set(h, c); } return c; };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scalec = (a, k) => [Math.min(255, a[0] * k), Math.min(255, a[1] * k), Math.min(255, a[2] * k)];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const rgba = (hex, a) => css(hex2rgb(hex), a);
const pip = (P, x, y) => { let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if ((P[i].y > y) !== (P[j].y > y) && x < ((P[j].x - P[i].x) * (y - P[i].y)) / (P[j].y - P[i].y) + P[i].x) inside = !inside; } return inside; };

function palette(light) {
  return light
    ? { concrete: '#d2cbbb', slab: '#e8e2d3', ground: '#cfdcc3', soil: ['#b79f7a', '#a38a64', '#8f7753'], leaf: '#3f8f5a', leaf2: '#5cae78', trunk: '#8a6c44', water: '#4aa6a8', ink: '#0b0e13', edge: '#8a7a45', sky: ['#cfe3ea', '#efe9d8', '#f6e3c0'], hills: ['#c4d0b3', '#b2c19f'] }
    : { concrete: '#3a4753', slab: '#26313b', ground: '#10211c', soil: ['#2f2419', '#271d14', '#1d150e'], leaf: '#2f8f5b', leaf2: '#49b57d', trunk: '#7b6240', water: '#2ea6a0', ink: '#0b0e13', edge: '#c9a54c', sky: ['#050a12', '#0b1c26', '#15352f'], hills: ['#0a1816', '#081210'] };
}

function buildScene(s) {
  const ventures = [];
  const perStage = {};
  for (const v of s.ventures) {
    const st = FLOW.includes(v.stage) ? v.stage : 'Parked';
    const n = (perStage[st] = (perStage[st] || 0) + 1) - 1;
    let pos;
    if (st === 'Parked') { const a = n * 1.25; pos = v3(Math.cos(a) * 0.7, -2.3 + (n > 4 ? 0.45 : 0), Math.sin(a) * 0.7); }
    else {
      const i = FLOW.indexOf(st), ring = n % 6, tier = Math.floor(n / 6);
      const a = i * 0.9 + ring * (TAU / 6) + twist(floorY(i));
      pos = v3(Math.cos(a) * 1.05, floorY(i) + 0.36 + tier * 0.55, Math.sin(a) * 1.05);
    }
    const rd = readiness(v);
    ventures.push({ kind: 'venture', id: v.id, v, stage: st, pos, score: store.ventureScore(v, RUBRIC), ready: rd, color: STAGE_COLOR[st] });
  }
  const modules = MODULES.map((m) => ({ ...m, kind: 'module', id: m.k, color: GROUPS[m.group].color, base: polar(m.deg, MOD_R, 0), also: m.also || [] }));
  const modIdx = Object.fromEntries(modules.map((m) => [m.k, m]));
  return { ventures, modules, modIdx, core: { kind: 'core', id: 'core' } };
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

// deterministic scatter of palms and ghaf trees around the site
function buildTrees() {
  const out = []; let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const mods = MODULES.map((m) => polar(m.deg, MOD_R));
  let guard = 0;
  while (out.length < 17 && guard++ < 400) {
    const a = rnd() * 360, r = 4.5 + rnd() * 3.2, p = polar(a, r);
    if (Math.abs(p.x) > SITE - 0.5 || Math.abs(p.z) > SITE - 0.5) continue;
    if (mods.some((m) => Math.hypot(m.x - p.x, m.z - p.z) < 2.1)) continue;
    if (out.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < 1.3)) continue;
    out.push({ x: p.x, z: p.z, kind: rnd() < 0.55 ? 'palm' : 'ghaf', h: 1.5 + rnd() * 1.1, ph: rnd() * TAU, lean: (rnd() - 0.5) * 0.5 });
  }
  return out;
}
const TREES = buildTrees();
const STARS = Array.from({ length: 80 }, (_, i) => ({ x: hash(i, 1, 2), y: hash(i, 3, 4) * 0.62, s: 0.5 + hash(i, 5, 6) * 1.3, ph: hash(i, 7, 8) * TAU }));
const FLIES = Array.from({ length: 34 }, (_, i) => ({ a: hash(i, 9, 1) * TAU, r: 2.5 + hash(i, 2, 3) * 5, h: 0.4 + hash(i, 4, 5) * 5, sp: 0.04 + hash(i, 6, 7) * 0.08, ph: hash(i, 8, 9) * TAU }));

// ---------- Renderer ----------
function start(canvas, panel) {
  if (loop) loop.stop();
  const ctx = canvas.getContext('2d');
  const root = document.documentElement;
  let light = false, P = palette(false), theme = { text: '#e8e6e0', muted: '#8b93a0' };
  function readTheme() {
    light = root.dataset.theme === 'light'; P = palette(light);
    const cs = getComputedStyle(root);
    theme = { text: cs.getPropertyValue('--text').trim() || (light ? '#1a1a1a' : '#e8e6e0'), muted: cs.getPropertyValue('--muted').trim() || '#8b93a0' };
  }
  readTheme();
  let sc = buildScene(store.get());
  let W = 0, H = 0, dpr = 1, f = 1, cx = 0, cy = 0, colW = 150, hits = [], hover = null, t0 = performance.now(), last = t0, lastInteract = 0, running = true;
  let ca = 1, sa = 0, cb = 1, sb = 0, camPos = v3(0, 0, 0);
  const drag = { on: false, x: 0, y: 0, moved: 0, pinch: 0 };
  const pointers = new Map();

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    colW = W < 620 ? 112 : 168;
    f = Math.min(((W - colW) * 30) / 21, (H * 30) / 19);
    cx = (W - colW) / 2 + 4; cy = H * 0.53;
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement); resize();

  function project(p) {
    const y = p.y - TY;
    const x1 = p.x * ca - p.z * sa, z1 = p.x * sa + p.z * ca;
    const y2 = y * cb + z1 * sb, z2 = -y * sb + z1 * cb;
    const depth = z2 + cam.dist, k = f / Math.max(depth, 0.5);
    return { x: cx + x1 * k, y: cy - y2 * k, k, depth };
  }

  // ---- draw queue (painter's algorithm with layers) ----
  let Q = [], overlay = [];
  const add = (l, d, fn) => Q.push({ l, d, fn });
  const pri = { pod: 0, mod: 0, label: 0, floor: 1 };
  const hit = (o, p, test, d) => hits.push({ o: { kind: o.kind, id: o.id }, p, test, d });

  function poly(pts, o = {}) {
    let sx = 0, sy = 0, sz = 0;
    for (const p of pts) { sx += p.x; sy += p.y; sz += p.z; }
    const c = v3(sx / pts.length, sy / pts.length, sz / pts.length);
    let n = nrm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    const toCam = sub(camPos, c);
    if (o.center) { if (dot(n, sub(c, o.center)) < 0) n = neg(n); if (o.cull && dot(n, toCam) <= 0) return null; }
    else if (dot(n, toCam) < 0) n = neg(n);
    const lit = light ? 0.58 + 0.42 * Math.max(0, dot(n, LV)) : 0.38 + 0.62 * Math.max(0, dot(n, LV));
    const base = hex2rgb(o.color || P.concrete);
    const col = mixc(scalec(base, lit), base, o.emis || 0);
    const Pp = pts.map(project);
    let d = 0; for (const p of Pp) d += p.depth; d = d / Pp.length + (o.bias || 0);
    add(o.layer ?? 3, d, () => {
      ctx.beginPath(); ctx.moveTo(Pp[0].x, Pp[0].y); for (let i = 1; i < Pp.length; i++) ctx.lineTo(Pp[i].x, Pp[i].y); ctx.closePath();
      if (o.alpha !== 0) { ctx.fillStyle = css(col, o.alpha ?? 1); ctx.fill(); }
      if (o.stroke) { ctx.strokeStyle = rgba(o.stroke, o.strokeA ?? 0.6); ctx.lineWidth = o.lw ?? 1; ctx.stroke(); }
      if (o.draw) o.draw(Pp);
    });
    return Pp;
  }
  function seg(a, b, color, wWorld, alpha, layer = 3, bias = 0) {
    const pa = project(a), pb = project(b), d = (pa.depth + pb.depth) / 2 + bias, w = Math.max(0.6, wWorld * (pa.k + pb.k) / 2);
    add(layer, d, () => { ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.lineCap = 'butt'; });
  }
  function glow(p, color, size, alpha) {
    const r = Math.max(1.5, size * p.k * 0.05);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, TAU); ctx.fill();
  }
  function bezier(a, b, lift) { const m = lerp3(a, b, 0.5); m.y += lift; return (u) => { const w = 1 - u; return v3(w * w * a.x + 2 * w * u * m.x + u * u * b.x, w * w * a.y + 2 * w * u * m.y + u * u * b.y, w * w * a.z + 2 * w * u * m.z + u * u * b.z); }; }
  function cable(a, b, lift, color, wWorld, alpha, np, speed, t, o = {}) {
    const bz = bezier(a, b, lift), pts = []; for (let i = 0; i <= 14; i++) pts.push(project(bz(i / 14)));
    const mid = pts[7], w = Math.max(1, wWorld * mid.k);
    add(o.layer ?? 3, mid.depth + (o.bias ?? 0), () => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = rgba(color, alpha * 0.22); ctx.lineWidth = w * 3.2; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.lineCap = 'butt';
      for (let k = 0; k < np; k++) { const u = (t * speed + k / np) % 1; glow(project(bz(u)), color, 1.8, Math.min(1, alpha * 1.3)); }
    });
    return bz;
  }
  function prism(cxw, czw, r, n, y0, y1, rot, o = {}) {
    const ring = (y) => Array.from({ length: n }, (_, i) => { const a = rot + (i * TAU) / n; return v3(cxw + Math.cos(a) * r, y, czw + Math.sin(a) * r); });
    const A = ring(y0), Bv = ring(y1), center = v3(cxw, (y0 + y1) / 2, czw);
    for (let i = 0; i < n; i++) poly([A[i], A[(i + 1) % n], Bv[(i + 1) % n], Bv[i]], { ...o, center });
    if (o.top !== false) poly(Bv, { ...o, ...(o.topOpts || {}), center });
    return Bv;
  }
  function cone(cxw, czw, r, n, y0, apexY, rot, o = {}) {
    const A = Array.from({ length: n }, (_, i) => { const a = rot + (i * TAU) / n; return v3(cxw + Math.cos(a) * r, y0, czw + Math.sin(a) * r); });
    const apex = v3(cxw, apexY, czw), center = v3(cxw, y0 - 0.05, czw);
    for (let i = 0; i < n; i++) poly([A[i], A[(i + 1) % n], apex], { ...o, center });
  }
  function dome(cxw, czw, cyw, r, hs, rings, n, o = {}) {
    const ring = (j) => { const ph = (j / rings) * (Math.PI / 2); return Array.from({ length: n }, (_, i) => { const a = (i * TAU) / n; return v3(cxw + Math.cos(a) * r * Math.cos(ph), cyw + hs * Math.sin(ph), czw + Math.sin(a) * r * Math.cos(ph)); }); };
    const center = v3(cxw, cyw - 0.1, czw); let prev = ring(0);
    for (let j = 1; j <= rings; j++) {
      const cur = ring(j);
      for (let i = 0; i < n; i++) { const i2 = (i + 1) % n; poly(j === rings ? [prev[i], prev[i2], cur[0]] : [prev[i], prev[i2], cur[i2], cur[i]], { ...o, center }); }
      prev = cur;
    }
  }
  const ringPt = (y, k, dr = 0, rr = 1) => { const a = twist(y) + (k / SIDES) * TAU + TAU / 16; const r = (rad(y) + dr) * rr; return v3(Math.cos(a) * r, y, Math.sin(a) * r); };

  // ---- sky ----
  function drawSky(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.sky[0]); g.addColorStop(0.55, P.sky[1]); g.addColorStop(1, P.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!light) {
      for (const s of STARS) { const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.ph)); ctx.fillStyle = `rgba(220,235,255,${a})`; ctx.fillRect(((s.x + cam.yaw * 0.015) % 1 + 1) % 1 * W, s.y * H, s.s, s.s); }
      const mx = W * 0.14, my = H * 0.15, mg = ctx.createRadialGradient(mx, my, 4, mx, my, 70); mg.addColorStop(0, 'rgba(255,244,214,0.5)'); mg.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 70, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f6efd8'; ctx.beginPath(); ctx.arc(mx, my, 15, 0, TAU); ctx.fill();
    } else {
      const sx = W * 0.14, sy = H * 0.17, sg = ctx.createRadialGradient(sx, sy, 6, sx, sy, 110); sg.addColorStop(0, 'rgba(255,214,140,0.7)'); sg.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 110, 0, TAU); ctx.fill();
    }
    // distant dunes and Hajar ridges, with a little parallax
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = P.hills[j]; ctx.beginPath(); ctx.moveTo(0, H);
      const base = H * (0.8 - j * 0.05);
      for (let x = 0; x <= W; x += 12) { const u = x / W; ctx.lineTo(x, base - (Math.sin(u * 3.1 + cam.yaw * (0.5 + j * 0.3) + j) * 0.5 + Math.sin(u * 8.3 + cam.yaw * (0.9 + j * 0.4) + 2 * j) * 0.22 + 0.4) * H * (0.07 + j * 0.03)); }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
  }

  function frame(now) {
    if (!running) return;
    if (!canvas.isConnected) { stop(); return; }
    const dt = Math.max(0, Math.min(64, now - last)); last = now; const t = Math.max(0, now - t0) / 1000;
    if ((root.dataset.theme === 'light') !== light) readTheme();
    if (cam.auto && !drag.on && now - lastInteract > 3500) cam.yaw += dt * 0.00007;
    ca = Math.cos(cam.yaw); sa = Math.sin(cam.yaw); cb = Math.cos(cam.pitch); sb = Math.sin(cam.pitch);
    camPos = v3(-cam.dist * cb * sa, cam.dist * sb + TY, -cam.dist * cb * ca);
    const right = v3(ca, 0, -sa);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky(t);
    Q = []; overlay = []; hits = [];

    // focus state
    const sel = selected;
    const selVenture = sel.kind === 'venture' ? sc.ventures.find((x) => x.id === sel.id) : null;
    const focusMod = sel.kind === 'module' ? sc.modIdx[sel.id] : null;
    const focusStage = sel.kind === 'stage' ? sel.id : null;
    const vlinks = selVenture ? ventureLinks(sc, selVenture) : [];
    const any = !!(focusMod || focusStage || selVenture);
    const isSel = (o) => sel.kind === o.kind && sel.id === o.id;
    const isHov = (o) => hover && hover.kind === o.kind && hover.id === o.id;
    const floorFocus = (st) => (focusStage ? (focusStage === st ? 1 : 0.38) : focusMod ? (focusMod.feeds.includes(st) ? 1 : 0.38) : selVenture ? (selVenture.stage === st ? 1 : 0.42) : 1);
    const modLit = (m) => !any || focusMod === m || (focusStage && m.feeds.includes(focusStage)) || (selVenture && vlinks.some((L) => L.to === m));
    const count = (st) => sc.ventures.filter((x) => x.stage === st).length;
    const gold = '#e2c477';

    // ---------- site block (cutaway): far faces, underground, near faces ----------
    const S = SITE, D = DEPTH, bandY = [0, -0.7, -2.0, -D];
    const corner = [[-S, -S], [S, -S], [S, S], [-S, S]];
    const blockCenter = v3(0, -D / 2, 0);
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = corner[i], [x1, z1] = corner[(i + 1) % 4];
      const mid = v3((x0 + x1) / 2, -D / 2, (z0 + z1) / 2), out = sub(mid, blockCenter);
      const near = dot(out, sub(camPos, mid)) > 0;
      for (let b = 0; b < 3; b++) {
        poly([v3(x0, bandY[b], z0), v3(x1, bandY[b], z1), v3(x1, bandY[b + 1], z1), v3(x0, bandY[b + 1], z0)],
          { color: P.soil[b], center: blockCenter, alpha: near ? 0.62 : 0.95, layer: near ? 2 : 0, emis: 0.25 });
      }
    }
    poly(corner.map(([x, z]) => v3(x, -D, z)), { color: P.soil[2], alpha: 1, layer: 0, center: v3(0, 0, 0) });
    // top plane of the site: translucent so the underground reads through it
    poly(corner.map(([x, z]) => v3(x, 0, z)), { color: P.ground, alpha: light ? 0.55 : 0.5, layer: 2, center: blockCenter, emis: 0.2, stroke: P.edge, strokeA: 0.5, lw: 1.2, bias: 100 });

    // ---------- underground: seed vault, roots ----------
    prism(0, 0, VAULT_R, 12, -2.6, -1.5, 0, { color: '#e0705c', alpha: 0.2, emis: 0.7, layer: 1, stroke: '#e0705c', strokeA: 0.4, top: false });
    dome(0, 0, -1.5, VAULT_R, 1.25, 4, 12, { color: '#e0705c', alpha: 0.22, emis: 0.7, layer: 1, stroke: '#e8a27c', strokeA: 0.3 });
    poly(Array.from({ length: 12 }, (_, i) => polar(i * 30, VAULT_R, -2.6)), { color: '#e0705c', alpha: 0.28, emis: 0.8, layer: 1 });
    const vp = project(v3(0, -1.6, 0));
    {
      const o = { kind: 'stage', id: 'Parked' };
      hit(o, 0, (x, y) => Math.hypot(x - vp.x, y - vp.y) < 1.15 * vp.k, vp.depth);
      const fv = floorFocus('Parked');
      add(1, vp.depth - 0.5, () => { glow(vp, '#e0705c', isSel(o) || isHov(o) ? 9 : 5, 0.5 * fv); });
    }
    for (let i = 0; i < 8; i++) { // roots: outward feeders and short roots into the vault
      const a = i * 45 + 12;
      const p0 = polar(a, 1.5, -0.02), p1 = polar(a + 8, 3.0, -1.0), p2 = polar(a + 14, 4.6, -2.3);
      const bz = (u) => { const w = 1 - u; return v3(w * w * p0.x + 2 * w * u * p1.x + u * u * p2.x, w * w * p0.y + 2 * w * u * p1.y + u * u * p2.y, w * w * p0.z + 2 * w * u * p1.z + u * u * p2.z); };
      const pts = []; for (let k = 0; k <= 10; k++) pts.push(project(bz(k / 10)));
      add(1, pts[5].depth, () => {
        ctx.strokeStyle = rgba(light ? '#8a6c44' : '#b78a52', 0.6); ctx.lineWidth = Math.max(1, 0.07 * pts[5].k); ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.lineCap = 'butt';
        glow(project(bz(1 - ((t * 0.12 + i / 8) % 1))), '#e2c477', 1.5, 0.8);
      });
    }
    for (let i = 0; i < 6; i++) { const a = i * 60 + 30; seg(polar(a, 1.1, -0.02), polar(a, 0.95, -0.35), '#e2c477', 0.05, 0.5, 1); }

    // spine: a light shaft from the seed vault up to the crown
    const crownApex = TOP + 2.7;
    seg(v3(0, -2.5, 0), v3(0, crownApex, 0), gold, 0.05, 0.55, 3, -3);
    seg(v3(0, -2.5, 0), v3(0, crownApex, 0), gold, 0.16, 0.12, 3, -3);

    // ---------- ground details: grid, pool, stone paths, mycelium ----------
    {
      for (let g = -6; g <= 6; g += 2) {
        for (const [a, b] of [[v3(g, 0.01, -S), v3(g, 0.01, S)], [v3(-S, 0.01, g), v3(S, 0.01, g)]]) {
          const pa = project(a), pb = project(b);
          add(2, 200, () => { ctx.strokeStyle = rgba(light ? '#7a8a6a' : '#7fa89a', 0.09); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); });
        }
      }
      const N = 56, oRing = [], iRing = [];
      for (let i = 0; i < N; i++) { const a = (i / N) * TAU; oRing.push(project(v3(Math.cos(a) * 4.0, 0.02, Math.sin(a) * 4.0))); iRing.push(project(v3(Math.cos(a) * 3.05, 0.02, Math.sin(a) * 3.05))); }
      add(2, 201, () => {
        ctx.beginPath(); oRing.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
        for (let i = N - 1; i >= 0; i--) { const p = iRing[i]; i === N - 1 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); } ctx.closePath();
        ctx.fillStyle = rgba(P.water, light ? 0.38 : 0.3); ctx.fill('evenodd');
        for (let r = 0; r < 2; r++) {
          const u = (t * 0.18 + r * 0.5) % 1, rr = 3.15 + u * 0.8; ctx.strokeStyle = rgba('#bff3ee', 0.35 * (1 - u)); ctx.lineWidth = 1; ctx.beginPath();
          for (let i = 0; i <= N; i++) { const a = (i / N) * TAU, p = project(v3(Math.cos(a) * rr, 0.02, Math.sin(a) * rr)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
          ctx.stroke();
        }
      });
      for (const m of sc.modules) { // stone paths from each pavilion to the plaza
        const a = polar(m.deg, MOD_R - 1.0, 0.03), b = polar(m.deg, 3.2, 0.03), pa = project(a), pb = project(b), w = Math.max(2, 0.3 * (pa.k + pb.k) / 2);
        add(2, 202, () => { ctx.strokeStyle = rgba(light ? '#b9b19c' : '#53606a', 0.45); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.lineCap = 'butt'; });
      }
      for (const m of sc.modules) for (const o of m.also) { // mycelium between modules
        const to = sc.modIdx[o], a = polar(m.deg, MOD_R, 0.08), b = polar(to.deg, MOD_R, 0.08), mc = lerp3(a, b, 0.5); mc.x *= 0.55; mc.z *= 0.55;
        const bz = (u) => { const w = 1 - u; return v3(w * w * a.x + 2 * w * u * mc.x + u * u * b.x, 0.08, w * w * a.z + 2 * w * u * mc.z + u * u * b.z); };
        const pts = []; for (let i = 0; i <= 16; i++) pts.push(project(bz(i / 16)));
        const al = !any ? 0.55 : focusMod && (focusMod === m || focusMod === to) ? 0.9 : 0.15;
        add(2, 203, () => { ctx.strokeStyle = rgba(m.color, al); ctx.lineWidth = Math.max(1.2, 0.07 * pts[8].k); ctx.setLineDash([5, 4]); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]); for (let k = 0; k < 3; k++) glow(project(bz((t * 0.18 + k / 3) % 1)), m.color, 1.4, al); });
      }
    }

    // ---------- plinth ----------
    prism(0, 0, 3.0, SIDES, 0, B, TAU / 16, { color: P.concrete, alpha: 1, cull: true, topOpts: { color: P.slab, emis: 0.1 }, stroke: P.edge, strokeA: 0.45 });

    // ---------- the tower ----------
    const r0 = project(v3(0, 0, 0));
    for (let i = 0; i < NF; i++) {
      const st = FLOW[i], col = STAGE_COLOR[st], ff = floorFocus(st), y0 = floorY(i), y1 = y0 + FH, occ = count(st) > 0;
      const hovF = isHov({ kind: 'stage', id: st }), selF = focusStage === st;
      const o = { kind: 'stage', id: st };
      const boost = selF || hovF ? 1 : 0;
      // floor slab
      const slab = Array.from({ length: SIDES }, (_, k) => ringPt(y0, k, 0.04));
      poly(slab, { color: col, alpha: (0.26 + 0.2 * occ + 0.25 * boost) * ff, emis: 0.55, stroke: col, strokeA: (0.8 + 0.2 * boost) * ff, lw: 1.6 + boost });
      // terrace garden ring with shrubs and hanging vines
      const terr = Array.from({ length: SIDES }, (_, k) => ringPt(y0, k, 0.38));
      const tp = terr.map(project);
      add(3, tp[0].depth - 5, () => {}); // keeps ordering stable for the ring below
      for (let k = 0; k < SIDES; k++) {
        const a = terr[k], b = terr[(k + 1) % SIDES];
        seg(a, b, P.leaf2, 0.07, 0.7 * ff, 3, -0.2);
        const pa = tp[k];
        add(3, pa.depth - 0.3, () => { const rr = 0.2 * pa.k; const gg = ctx.createRadialGradient(pa.x - rr * 0.3, pa.y - rr * 0.4, rr * 0.1, pa.x, pa.y, rr); gg.addColorStop(0, rgba(P.leaf2, 0.95 * ff)); gg.addColorStop(1, rgba(P.leaf, 0.95 * ff)); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(pa.x, pa.y, rr, 0, TAU); ctx.fill(); });
        if ((k + i) % 2 === 0) seg(a, v3(a.x, a.y - 0.45 - hash(i, k, 1) * 0.35, a.z), P.leaf, 0.035, 0.7 * ff, 3, -0.2);
      }
      // facade: two bands per floor, glass + structural diagrid + lit windows
      for (let s = 0; s < 2; s++) {
        const ya = y0 + (s * FH) / 2, yb = y0 + ((s + 1) * FH) / 2;
        for (let k = 0; k < SIDES; k++) {
          const A = ringPt(ya, k), Bv = ringPt(ya, k + 1), Cc = ringPt(yb, k + 1), Dd = ringPt(yb, k);
          const Pp = poly([A, Bv, Cc, Dd], {
            color: col, alpha: (0.13 + 0.12 * occ + 0.18 * boost) * ff + 0.02, emis: 0.45 + 0.3 * boost, stroke: light ? '#5b6a73' : '#cfe3ee', strokeA: 0.5 * ff, lw: 1.1,
            draw: (Q4) => {
              // diagrid brace + lit window inset
              ctx.strokeStyle = rgba(col, 0.7 * ff); ctx.lineWidth = 1; ctx.beginPath();
              if ((k + s) % 2) { ctx.moveTo(Q4[0].x, Q4[0].y); ctx.lineTo(Q4[2].x, Q4[2].y); } else { ctx.moveTo(Q4[1].x, Q4[1].y); ctx.lineTo(Q4[3].x, Q4[3].y); }
              ctx.stroke();
              const cxp = (Q4[0].x + Q4[1].x + Q4[2].x + Q4[3].x) / 4, cyp = (Q4[0].y + Q4[1].y + Q4[2].y + Q4[3].y) / 4;
              const h = hash(k, i, s), fl = 0.5 + 0.5 * Math.sin(t * (0.6 + h) + h * 9);
              ctx.beginPath(); Q4.forEach((p, j) => { const px = cxp + (p.x - cxp) * 0.62, py = cyp + (p.y - cyp) * 0.62; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
              ctx.fillStyle = rgba(light ? '#fff2c8' : '#ffe9a8', (0.04 + (occ ? 0.22 : 0.1) * h * (0.6 + 0.4 * fl)) * ff * (light ? 0.9 : 1)); ctx.fill();
            },
          });
          if (Pp) hit(o, 1, (x, y) => pip(Pp, x, y), (Pp[0].depth + Pp[2].depth) / 2);
        }
      }
      // hovered or selected floor gets a bright rim
      if (boost) for (let k = 0; k < SIDES; k++) seg(ringPt(y1, k), ringPt(y1, k + 1), col, 0.06, 0.95, 3, -0.1);
    }
    // roof slab
    poly(Array.from({ length: SIDES }, (_, k) => ringPt(TOP, k, 0.04)), { color: P.slab, alpha: 0.7, emis: 0.2, stroke: gold, strokeA: 0.7, lw: 1.5 });

    // atrium core (light well)
    prism(0, 0, 0.42, 8, B, TOP, 0, { color: gold, alpha: 0.17, emis: 0.9, stroke: gold, strokeA: 0.4, top: false });
    for (let i = 0; i < 22; i++) { const u = (t * 0.07 + i / 22) % 1, y = -2.3 + u * (TOP + 2.2), a = i * 2.4 + t * 0.6, r = 0.22 + 0.08 * Math.sin(i + t); const p = project(v3(Math.cos(a) * r, y, Math.sin(a) * r)); add(3, p.depth, () => glow(p, gold, 1.4, 0.85 * Math.sin(u * Math.PI))); }

    // crown: a lotus bud of petals
    {
      const open = 1 + 0.04 * Math.sin(t * 0.8), ff = floorFocus('Scale');
      const apex = v3(0, crownApex, 0);
      for (let k = 0; k < SIDES; k++) {
        const a = ringPt(TOP, k), b = ringPt(TOP, k + 1);
        const m1 = v3(a.x * 0.8 * open, TOP + 1.15, a.z * 0.8 * open), m2 = v3(b.x * 0.8 * open, TOP + 1.15, b.z * 0.8 * open);
        const c = k % 2 ? '#c9a54c' : '#4fb286';
        poly([a, b, m2, m1], { color: c, alpha: 0.5 * ff + 0.1, emis: 0.55, stroke: c, strokeA: 0.8 * ff, lw: 1.1 });
        poly([m1, m2, apex], { color: c, alpha: 0.55 * ff + 0.1, emis: 0.6, stroke: '#e8d9a0', strokeA: 0.7 * ff, lw: 1.1 });
      }
      const ap = project(apex);
      add(3, ap.depth - 1, () => { const pulse = 1 + 0.18 * Math.sin(t * 2.2); glow(ap, '#fff1b8', 10 * pulse, 0.9); glow(ap, '#4fb286', 18, 0.35); });
      for (let b = 0; b < 3; b++) seg(apex, v3(0, apex.y + 2.4 + b * 1.6, 0), '#fff1b8', 0.03, 0.3 - b * 0.09, 3, -4);
    }

    // ---------- ventures: glowing pods on their floors ----------
    for (const vn of sc.ventures) {
      const p = project(vn.pos), r = (0.2 + (vn.score / 100) * 0.16) * p.k, ff = vn.stage === 'Parked' ? 1 : floorFocus(vn.stage);
      const dim = focusMod || (focusStage && vn.stage !== focusStage) ? 0.55 : 1;
      const o = { kind: 'venture', id: vn.id };
      hit(o, 0, (x, y) => Math.hypot(x - p.x, y - p.y) < Math.max(r * 1.7, 13), p.depth - 1);
      add(3, p.depth - 0.4, () => {
        const sg = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, r * 3.2); sg.addColorStop(0, rgba(gold, (isSel(vn) || isHov(vn) ? 0.6 : 0.3) * dim)); sg.addColorStop(1, rgba(gold, 0)); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.2, 0, TAU); ctx.fill();
        const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r); g.addColorStop(0, rgba('#ffffff', 0.9 * dim)); g.addColorStop(0.3, rgba(gold, dim)); g.addColorStop(1, rgba('#8d6f22', dim));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        ctx.lineWidth = Math.max(2, r * 0.24); ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(light ? '#000000' : '#ffffff', 0.14 * dim); ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.4, 0, TAU); ctx.stroke();
        if (vn.ready.pct > 0) { ctx.strokeStyle = rgba(vn.ready.pct >= 1 ? '#4fb286' : vn.color, 0.95 * dim); ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.4, -Math.PI / 2, -Math.PI / 2 + TAU * vn.ready.pct); ctx.stroke(); }
        ctx.lineCap = 'butt';
        if (isSel(vn)) { ctx.strokeStyle = rgba(gold, 0.9); ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.95 + Math.sin(t * 3) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      });
    }

    // ---------- module pavilions + sky-bridges ----------
    for (const m of sc.modules) {
      const lit = modLit(m), al = lit ? 1 : 0.4, sel2 = isSel(m) || isHov(m), em = sel2 ? 0.75 : 0.4;
      const bx = m.base.x, bz = m.base.z, face = Math.atan2(bz, bx);
      let topY, o = { color: m.color, emis: em, alpha: 0.82 * al, cull: true, stroke: '#eaf4ff', strokeA: 0.45 * al };
      if (m.group === 'knowledge') { // crystal tower
        topY = 2.0; prism(bx, bz, 0.58, 6, 0, topY, face, o); cone(bx, bz, 0.58, 6, topY, topY + 0.95, face, { ...o, alpha: 0.8 * al, emis: em + 0.15 });
        for (let k = 1; k < 4; k++) { const ring = Array.from({ length: 6 }, (_, i) => v3(bx + Math.cos(face + (i * TAU) / 6) * 0.59, k * 0.5, bz + Math.sin(face + (i * TAU) / 6) * 0.59)); for (let i = 0; i < 6; i++) seg(ring[i], ring[(i + 1) % 6], '#eaf4ff', 0.02, 0.3 * al, 3, -0.3); }
        topY = 2.95;
      } else if (m.group === 'capital') { // domed vault
        prism(bx, bz, 0.95, 8, 0, 0.8, face, { ...o, top: false });
        dome(bx, bz, 0.8, 0.95, 0.85, 3, 8, { ...o, alpha: 0.7 * al, emis: em + 0.1 });
        topY = 1.7;
      } else { // civic block with a green roof
        prism(bx, bz, 0.9, 4, 0, 1.3, face + Math.PI / 4, { ...o, top: false });
        prism(bx, bz, 1.15, 4, 1.3, 1.42, face + Math.PI / 4, { color: P.leaf, alpha: al, emis: 0.2, cull: true, stroke: P.leaf2, strokeA: 0.6 * al, topOpts: { color: P.leaf2, emis: 0.3 } });
        for (let k = 0; k < 3; k++) { const q = project(v3(bx + (k - 1) * 0.5, 1.5, bz + (k % 2 ? 0.3 : -0.3))); add(3, q.depth - 0.5, () => { glow(q, P.leaf2, 2.2, 0.9 * al); }); }
        topY = 1.5;
      }
      const lp = project(v3(bx, topY + 0.55, bz)), cp = project(v3(bx, 0.9, bz));
      hit(m, 0, (x, y) => Math.hypot(x - cp.x, y - cp.y) < Math.max(1.15 * cp.k, 16), cp.depth - 1);
      const beacon = project(v3(bx, topY + 0.1, bz));
      add(3, beacon.depth - 1, () => { glow(beacon, m.color, sel2 ? 7 : 4, 0.8 * al); });
      overlay.push(() => label(m.label, lp.x, lp.y - 6, { size: W < 620 ? 10 : 12, weight: 600, color: theme.text, alpha: Math.max(0.5, al), bg: true, hit: m }));

      // sky-bridges to the floors this module powers
      m.feeds.forEach((st, fi) => {
        const on = (focusMod && focusMod === m) || (focusStage && focusStage === st);
        const al2 = on ? 0.95 : any ? 0.1 : 0.42;
        const ymid = stageMidY(st), ang = (m.deg * Math.PI) / 180 + (fi - (m.feeds.length - 1) / 2) * 0.09;
        const end = v3(Math.cos(ang) * rad(ymid) * 0.93, ymid, Math.sin(ang) * rad(ymid) * 0.93);
        const start = v3(bx * 0.82, Math.min(topY, 1.7) - 0.15, bz * 0.82);
        cable(start, end, 0.9 + fi * 0.2, m.color, on ? 0.075 : 0.05, al2, on ? 4 : 2, 0.2, t, { bias: -0.5 });
        const ep = project(end); add(3, ep.depth - 0.6, () => glow(ep, m.color, on ? 3.5 : 2.2, al2 + 0.1));
      });
    }
    // venture-specific bridges
    for (const L of vlinks) {
      const from = L.from.pos, to = v3(L.to.base.x * 0.82, 1.4, L.to.base.z * 0.82);
      cable(to, from, 1.0, L.to.color, 0.085, 0.95, 4, 0.28, t, { bias: -2 });
      const mid = project(lerp3(from, to, 0.5)); overlay.push(() => label(L.why, mid.x, mid.y - 8, { size: 10, color: theme.text, bg: true }));
    }

    // ---------- trees ----------
    for (const tr of TREES) {
      const b = project(v3(tr.x, 0, tr.z)), sway = Math.sin(t * 0.8 + tr.ph) * 0.07;
      if (tr.kind === 'palm') {
        const top = v3(tr.x + tr.lean + sway, tr.h + 0.9, tr.z - tr.lean * 0.5), ctrl = v3(tr.x + tr.lean * 0.2, tr.h * 0.55, tr.z), tp2 = project(top), cp2 = project(ctrl);
        const fr = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU + tr.ph; const dx = Math.cos(a), dz = Math.sin(a); return [project(v3(top.x + dx * 0.5, top.y + 0.28, top.z + dz * 0.5)), project(v3(top.x + dx * 1.0, top.y - 0.3 + sway, top.z + dz * 1.0))]; });
        add(3, b.depth, () => {
          ctx.strokeStyle = rgba(P.trunk, 0.95); ctx.lineWidth = Math.max(1.5, 0.09 * b.k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(cp2.x, cp2.y, tp2.x, tp2.y); ctx.stroke();
          ctx.strokeStyle = rgba(P.leaf2, 0.95); ctx.lineWidth = Math.max(1.2, 0.05 * b.k);
          for (const [m1, e] of fr) { ctx.beginPath(); ctx.moveTo(tp2.x, tp2.y); ctx.quadraticCurveTo(m1.x, m1.y, e.x, e.y); ctx.stroke(); }
          ctx.lineCap = 'butt';
        });
      } else {
        const top = v3(tr.x + sway * 0.6, tr.h * 0.85, tr.z), tp2 = project(top);
        const cr = (r, y) => Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return project(v3(tr.x + Math.cos(a) * r + sway, y, tr.z + Math.sin(a) * r)); });
        const c1 = cr(0.85, top.y), c2 = cr(0.55, top.y + 0.2);
        add(3, b.depth, () => {
          ctx.strokeStyle = rgba(P.trunk, 0.95); ctx.lineWidth = Math.max(1.5, 0.1 * b.k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tp2.x, tp2.y); ctx.stroke(); ctx.lineCap = 'butt';
          for (const [c, col, a] of [[c1, P.leaf, 0.9], [c2, P.leaf2, 0.9]]) { ctx.beginPath(); c.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fillStyle = rgba(col, a); ctx.fill(); }
        });
      }
    }

    // ---------- scan ring sweeping up the tower ----------
    {
      const y = B + ((t * 0.55) % 1) * (TOP - B);
      for (let k = 0; k < SIDES; k++) seg(ringPt(y, k, 0.06), ringPt(y, k + 1, 0.06), '#9ff0e0', 0.045, 0.55 * Math.sin(Math.PI * ((y - B) / (TOP - B))), 3, -0.6);
    }

    // ---------- render queue ----------
    Q.sort((a, b2) => a.l - b2.l || b2.d - a.d);
    for (const q of Q) q.fn();

    // fireflies / pollen
    ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
    for (const fl of FLIES) {
      const a = fl.a + t * fl.sp, p = project(v3(Math.cos(a) * fl.r, fl.h + Math.sin(t * 0.7 + fl.ph) * 0.4, Math.sin(a) * fl.r));
      glow(p, light ? '#d6a93a' : '#d8ff9a', 1.1, (light ? 0.5 : 0.75) * (0.35 + 0.65 * Math.max(0, Math.sin(t * 1.6 + fl.ph))));
    }
    ctx.globalCompositeOperation = 'source-over';

    // ---------- stage column (labels, ventures) ----------
    {
      const order = ['Parked', ...FLOW];
      const colX = W - colW + 4, rows = [];
      for (const st of order) {
        const vs = sc.ventures.filter((x) => x.stage === st);
        const mid = st === 'Parked' ? v3(0, -1.9, 0) : v3(0, stageMidY(st), 0);
        const edge = lerp3(mid, v3(right.x * rad(mid.y) * 1.02, mid.y, right.z * rad(mid.y) * 1.02), 1);
        rows.push({ st, vs, desired: project(mid).y, h: 20 + vs.length * 14, edge: project(st === 'Parked' ? v3(right.x * 1.3, -1.9, right.z * 1.3) : edge) });
      }
      let yPrev = H - 8;
      for (const rw of rows) { rw.y = Math.min(rw.desired, yPrev - rw.h + 8); yPrev = rw.y - 12; }
      const shift = Math.max(0, 16 - (rows[rows.length - 1].y - 8));
      if (shift) rows.forEach((rw) => { rw.y += shift; });
      for (const rw of rows) {
        const st = rw.st, col = STAGE_COLOR[st], o = { kind: 'stage', id: st }, on = isSel(o) || isHov(o), ff = st === 'Parked' ? 1 : floorFocus(st);
        const al = Math.max(0.5, ff);
        ctx.strokeStyle = rgba(col, (on ? 0.8 : 0.28) * al); ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(rw.edge.x, rw.edge.y); ctx.lineTo(colX - 8, rw.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = rgba(col, al); ctx.beginPath(); ctx.arc(colX - 4, rw.y, on ? 3.5 : 2.5, 0, TAU); ctx.fill();
        const num = st === 'Parked' ? '' : `${String(FLOW.indexOf(st) + 1).padStart(2, '0')}  `;
        const head = `${num}${st === 'Parked' ? 'SEED VAULT' : st.toUpperCase()}`;
        ctx.font = '700 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.globalAlpha = al; ctx.fillStyle = col; ctx.fillText(head, colX + 4, rw.y);
        const hw = ctx.measureText(head).width;
        ctx.font = '500 10px Inter, system-ui, sans-serif'; ctx.fillStyle = theme.muted;
        if (W >= 620) ctx.fillText(st === 'Parked' ? 'parked' : STAGE_NAME[st], colX + 4 + hw + 6, rw.y);
        ctx.globalAlpha = 1;
        hit(o, 0, (x, y) => x >= colX - 8 && x <= W - 2 && Math.abs(y - rw.y) < 9, -10);
        rw.vs.forEach((vn, i) => {
          const y = rw.y + 15 + i * 14, ov = { kind: 'venture', id: vn.id }, s2 = isSel(vn) || isHov(vn);
          ctx.fillStyle = rgba(gold, al); ctx.beginPath(); ctx.arc(colX + 8, y, s2 ? 3.2 : 2.4, 0, TAU); ctx.fill();
          ctx.font = `${s2 ? 700 : 500} 11px Inter, system-ui, sans-serif`; ctx.globalAlpha = al; ctx.fillStyle = s2 ? theme.text : theme.muted;
          ctx.fillText(fitText(vn.v.name, W - colX - 28), colX + 16, y); ctx.globalAlpha = 1;
          hit(ov, 0, (x, yy) => x >= colX && x <= W - 2 && Math.abs(yy - y) < 7, -10);
        });
      }
    }
    overlay.forEach((fn) => fn());
    drawHUD(t);

    canvas.style.cursor = hover ? 'pointer' : drag.on ? 'grabbing' : 'grab';
    requestAnimationFrame(frame);
  }

  function fitText(s, max) { if (ctx.measureText(s).width <= max) return s; let n = s.length; while (n > 3 && ctx.measureText(s.slice(0, n) + '…').width > max) n--; return s.slice(0, n) + '…'; }
  function label(text, x, y, { size = 11, color = theme.text, alpha = 1, weight = 500, bg = false, hit: ho = null } = {}) {
    ctx.globalAlpha = alpha; ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 12;
    if (bg) { ctx.fillStyle = light ? 'rgba(255,255,255,0.78)' : 'rgba(8,13,20,0.72)'; roundRect(x - w / 2, y - size * 0.85, w, size * 1.7, 5); ctx.fill(); }
    ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.globalAlpha = 1;
    if (ho) hits.push({ o: { kind: ho.kind, id: ho.id }, p: 0, test: (px, py) => Math.abs(px - x) < w / 2 && Math.abs(py - y) < size, d: -20 });
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawHUD(t) {
    const ink = light ? 'rgba(40,40,40,0.45)' : 'rgba(200,225,235,0.4)', m = 10, L = 14;
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
    for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + dy * L); ctx.lineTo(x, y); ctx.lineTo(x + dx * L, y); ctx.stroke(); }
    const live = sc.ventures.filter((x) => x.stage !== 'Parked'), ready = live.filter((x) => x.ready.pct >= 1 && nextStage(x.stage)).length;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = light ? '#6b5a22' : '#e2c477'; ctx.font = '700 10px Inter, system-ui, sans-serif';
    ctx.fillText('DE CASTRO  ·  LIVING TOWER', 22, 20);
    ctx.fillStyle = theme.muted; ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.fillText(`${live.length} live · ${ready} ready to rise`, 22, 35);
    const hdg = ((((-cam.yaw * 180) / Math.PI) % 360) + 360) % 360;
    ctx.textAlign = 'right'; ctx.fillText(`HDG ${String(Math.round(hdg)).padStart(3, '0')}°  ·  ELEV ${Math.round((cam.pitch * 180) / Math.PI)}°`, W - 22, 20); ctx.textAlign = 'left';
    // altitude scale: stage floors as ticks at the left edge
    for (let i = 0; i <= NF; i++) { const p = project(v3(0, floorY(i), 0)); ctx.fillStyle = ink; ctx.fillRect(m + 2, p.y, i === 0 || i === NF ? 10 : 6, 1); }
  }

  function pick(x, y) {
    let best = null;
    for (const h of hits) if (h.test(x, y) && (!best || h.p < best.p || (h.p === best.p && h.d < best.d))) best = h;
    return best?.o || null;
  }
  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, local(e)); drag.on = true; const p = local(e); drag.x = p.x; drag.y = p.y; drag.moved = 0; lastInteract = performance.now(); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag.pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (drag.on && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (drag.pinch) cam.dist = clampD(cam.dist * (drag.pinch / d)); drag.pinch = d; drag.moved += 10; return; }
    if (drag.on) { const dx = p.x - drag.x, dy = p.y - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); cam.yaw -= dx * 0.008; cam.pitch = Math.max(0.03, Math.min(1.3, cam.pitch + dy * 0.006)); drag.x = p.x; drag.y = p.y; lastInteract = performance.now(); }
    else hover = pick(p.x, p.y);
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (!drag.on) return;
    if (pointers.size === 0) {
      drag.on = false;
      if (drag.moved < 6) { const h = pick(local(e).x, local(e).y); select(h || { kind: 'core', id: null }); }
    }
    drag.pinch = 0;
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { hover = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = clampD(cam.dist * (1 + Math.sign(e.deltaY) * 0.08)); lastInteract = performance.now(); }, { passive: false });

  function select(s) { selected = s; panel.innerHTML = panelHTML(sc); }
  function refresh() { sc = buildScene(store.get()); panel.innerHTML = panelHTML(sc); }
  function stop() { running = false; ro.disconnect(); }
  loop = { stop, refresh, select, pick: (x, y) => pick(x, y), hitCount: () => hits.length };
  panel.innerHTML = panelHTML(sc);
  requestAnimationFrame(frame);
}
const clampD = (d) => Math.max(14, Math.min(48, d));

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
    return `<div class="eng-head"><div class="eyebrow" style="color:${STAGE_COLOR[v.stage]}">${esc(v.stage)} · ${esc(STAGE_NAME[v.stage] || '')}${nxt ? ` → ${nxt}` : ''}</div><h2>${esc(v.name)}</h2><p class="small muted">${esc(v.summary)}</p></div>
      <div class="row"><span class="score-ring" style="font-size:26px">${vn.score}</span><span class="muted small">/100 score</span>
        <span class="right badge ${rd.pct >= 1 ? 'green' : 'gold'}">${rd.met}/${rd.total} gates</span></div>
      ${v.stage === 'Parked' ? `<p class="small muted">${esc(STAGE_INFO.Parked)}</p>` : nxt ? `<h4 class="eng-sub">To rise into ${nxt}</h4>${gateList(rd.gates)}` : `<h4 class="eng-sub">At the canopy</h4>${gateList(rd.gates)}`}
      <div class="eng-actions">
        ${nxt && v.stage !== 'Parked' ? `<button class="btn ${rd.pct >= 1 ? 'primary' : ''}" data-act="advance" data-id="${v.id}">${icon('arrow')} Advance to ${nxt}</button>` : ''}
        ${v.stage === 'Parked' ? `<button class="btn primary" data-act="revive" data-id="${v.id}">Revive to Idea</button>` : ''}
        ${prv && v.stage !== 'Parked' ? `<button class="btn sm ghost" data-act="back" data-id="${v.id}">Back to ${prv}</button>` : ''}
        <a class="btn sm" href="#/ventures/${v.id}">Open venture</a>
        ${!hasDiligence ? `<button class="btn sm" data-act="diligence" data-id="${v.id}">${icon('spark')} Commission diligence</button>` : ''}
        ${v.stage !== 'Parked' ? `<button class="btn sm ghost danger" data-act="park" data-id="${v.id}">Park</button>` : ''}
      </div>
      <h4 class="eng-sub">Connected tools</h4>
      ${links.length ? `<div class="list">${links.map((L) => `<a class="list-item" href="${L.to.href}">${chip(L.to.label, L.to.color)}<span class="small grow">${esc(L.why)}</span></a>`).join('')}</div>` : '<p class="small muted">No pavilions connected yet. The gates above show which tools to use next.</p>'}
      ${(v.history || []).length ? `<h4 class="eng-sub">Journey</h4><div class="small muted">${v.history.slice(-6).reverse().map((h) => `<div>${esc(h.date)} · ${esc(h.from)} → <b style="color:var(--text)">${esc(h.to)}</b></div>`).join('')}</div>` : ''}`;
  }
  if (sel.kind === 'module') {
    const m = sc.modIdx[sel.id];
    const g = GROUPS[m.group];
    return `<div class="eng-head"><div class="eyebrow" style="color:${g.color}">${g.label} pavilion</div><h2>${esc(m.label)}</h2></div>
      <p>${esc(m.role)}</p>
      <div class="callout small">${esc(moduleStats(m.k))}</div>
      ${m.feeds.length ? `<h4 class="eng-sub">Sky-bridges to these floors</h4><div class="row">${m.feeds.map((st) => `<button class="btn sm" data-act="pickStage" data-id="${st}" style="color:${STAGE_COLOR[st]}">${st}</button>`).join('')}</div>` : ''}
      ${(m.also || []).length ? `<h4 class="eng-sub">Feeds</h4><div class="row">${m.also.map((o) => `<button class="btn sm" data-act="pickModule" data-id="${o}">${esc(sc.modIdx[o].label)}</button>`).join('')}</div>` : ''}
      ${gateUses(sc, m.k)}
      <div class="eng-actions"><a class="btn primary" href="${m.href}">Open ${esc(m.label)} ${icon('arrow')}</a></div>`;
  }
  if (sel.kind === 'stage') {
    const st = sel.id;
    const vs = sc.ventures.filter((x) => x.stage === st);
    const feeders = sc.modules.filter((m) => m.feeds.includes(st));
    return `<div class="eng-head"><div class="eyebrow" style="color:${STAGE_COLOR[st]}">${st === 'Parked' ? 'Below ground' : `Floor ${FLOW.indexOf(st) + 1} of 6`} · ${esc(STAGE_NAME[st])}</div><h2>${esc(st)}</h2></div>
      <p>${esc(STAGE_INFO[st])}</p>
      ${feeders.length ? `<h4 class="eng-sub">Powered by</h4><div class="row">${feeders.map((m) => `<button class="btn sm" data-act="pickModule" data-id="${m.k}" style="color:${m.color}">${esc(m.label)}</button>`).join('')}</div>` : ''}
      <h4 class="eng-sub">Ventures ${st === 'Parked' ? 'in the vault' : 'on this floor'}</h4>
      ${vs.length ? `<div class="list">${vs.map((x) => `<a class="list-item" data-act="pickVenture" data-id="${x.id}" style="cursor:pointer"><b class="grow">${esc(x.v.name)}</b><span class="badge ${x.ready.pct >= 1 ? 'green' : ''}">${x.ready.met}/${x.ready.total}</span></a>`).join('')}</div>` : '<p class="small muted">None yet.</p>'}
      ${st === 'Idea' ? `<div class="eng-actions"><a class="btn primary" href="#/ventures" data-act="newVenture">${icon('plus')} Plant a new idea</a></div>` : ''}`;
  }
  // core / overview
  const live = sc.ventures.filter((x) => x.stage !== 'Parked');
  const readyNow = live.filter((x) => x.ready.pct >= 1 && nextStage(x.stage));
  const stuck = live.slice().sort((a, b) => a.ready.pct - b.ready.pct)[0];
  return `<div class="eng-head"><div class="eyebrow">The tower</div><h2>From seed to canopy</h2></div>
    <p class="small">Every idea is planted in the vault and rises floor by floor — <b style="color:${STAGE_COLOR.Idea}">Idea</b>, <b style="color:${STAGE_COLOR.Validate}">Validate</b>, <b style="color:${STAGE_COLOR.Plan}">Plan</b>, <b style="color:${STAGE_COLOR.Build}">Build</b>, <b style="color:${STAGE_COLOR.Launch}">Launch</b>, <b style="color:${STAGE_COLOR.Scale}">Scale</b>. Each floor is earned by passing its gates, and every gate is satisfied by one of the pavilions around the base.</p>
    <div class="calc-out" style="margin-top:8px"><div class="o"><div class="l">Live ventures</div><div class="v">${live.length}</div></div><div class="o"><div class="l">Ready to rise</div><div class="v">${readyNow.length}</div></div></div>
    ${readyNow.length ? `<h4 class="eng-sub">Ready to rise</h4><div class="list">${readyNow.map((x) => `<a class="list-item" data-act="pickVenture" data-id="${x.id}" style="cursor:pointer"><b class="grow">${esc(x.v.name)}</b>${chip(x.v.stage + ' → ' + nextStage(x.v.stage), STAGE_COLOR[nextStage(x.v.stage)])}</a>`).join('')}</div>` : ''}
    ${stuck ? `<h4 class="eng-sub">Most blocked</h4><a class="list-item" data-act="pickVenture" data-id="${stuck.id}" style="cursor:pointer"><b class="grow">${esc(stuck.v.name)}</b><span class="small muted">${stuck.ready.met}/${stuck.ready.total} gates at ${esc(stuck.v.stage)}</span></a>` : ''}
    <h4 class="eng-sub">Reading the tower</h4>
    <div class="small muted eng-legend">
      <div><span class="lg-dot" style="background:#e2c477"></span>Gold pods are ventures — size is score, the ring around each is readiness for the next floor.</div>
      <div><span class="lg-dot" style="background:${GROUPS.knowledge.color}"></span>Crystal towers — Knowledge. <span class="lg-dot" style="background:${GROUPS.capital.color};margin-left:6px"></span>Domed vaults — Capital. <span class="lg-dot" style="background:${GROUPS.governance.color};margin-left:6px"></span>Green-roofed blocks — Governance.</div>
      <div>Glowing sky-bridges carry each pavilion's power to the floors it feeds; dashed mycelium on the ground links the pavilions to each other.</div>
      <div><span class="lg-dot" style="background:${STAGE_COLOR.Parked}"></span>Parked ideas rest as seeds in the vault beneath the tower, roots feeding upward.</div>
      <div style="margin-top:6px">Drag to orbit · scroll or pinch to zoom · click a floor, pod or pavilion.</div>
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
  title: 'The Tower',
  async render(s) {
    try { wikiCount = (await K.loadIndex()).articles.length; } catch { wikiCount = 0; }
    const live = s.ventures.filter((v) => v.stage !== 'Parked');
    const rows = live.map((v) => ({ v, r: readiness(v) })).sort((a, b) => FLOW.indexOf(b.v.stage) - FLOW.indexOf(a.v.stage) || b.r.pct - a.r.pct);
    return `
    <div class="page-head"><div><div class="eyebrow">Build</div><h1>The Tower</h1>
      <p>Your pipeline as a living building. Ideas are planted in the seed vault and rise floor by floor from idea to scale; every other tool in the empire is a pavilion at its base, bridged to the floors it powers. Click a pod to see exactly what stands between it and the next floor.</p></div>
      <div class="actions"><button class="btn" data-act="resetCam">${icon('sync')} Reset view</button><button class="btn" data-act="toggleSpin">${cam.auto ? 'Pause rotation' : 'Rotate'}</button><a class="btn primary" href="#/ventures" data-act="newVenture">${icon('plus')} New idea</a></div></div>
    <div class="eng-wrap">
      <div class="eng-stage card flush"><canvas id="eng-canvas" aria-label="3D model of the venture tower: stage floors, the seed vault and the connected module pavilions"></canvas>
        <div class="eng-hint small">Drag to orbit · scroll to zoom · click to inspect</div></div>
      <aside class="eng-panel card" id="eng-panel"></aside>
    </div>
    <div class="card flush mt"><div class="card-head"><h3>Pipeline readiness</h3><div class="right small muted">Gates met for each venture's next floor</div></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Venture</th><th>Floor</th><th>Next</th><th style="width:38%">Readiness</th><th class="num">Score</th></tr></thead><tbody>
      ${rows.map(({ v, r }) => `<tr class="click" data-act="pickVenture" data-id="${v.id}"><td><b>${esc(v.name)}</b></td><td><span class="badge" style="color:${STAGE_COLOR[v.stage]}">${esc(v.stage)}</span></td><td class="small muted">${esc(nextStage(v.stage) || '—')}</td>
        <td><div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.pct * 100)}%;background:${r.pct >= 1 ? 'var(--green)' : STAGE_COLOR[v.stage]}"></div></div><div class="small muted" style="margin-top:3px">${r.met}/${r.total} · ${esc(r.gates.find((g) => !g.ok)?.label || 'All gates met')}</div></td>
        <td class="num"><span class="score-ring" style="font-size:16px">${store.ventureScore(v, RUBRIC)}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No live ventures. Plant an idea to start the tower.</div>'}
    </div>`;
  },
  mount(el) {
    const canvas = el.querySelector('#eng-canvas'), panel = el.querySelector('#eng-panel');
    if (canvas && panel) start(canvas, panel);
  },
  actions: {
    resetCam() { cam = { ...CAM0, auto: cam.auto }; },
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
    async park(el) { const v = store.byId('ventures', el.dataset.id); if (await confirmBox(`Park ${v.name}? It will rest in the seed vault beneath the tower until you revive it.`, 'Park')) { selected = { kind: 'venture', id: v.id }; moveStage(v.id, 'Parked'); } },
    revive(el) { selected = { kind: 'venture', id: el.dataset.id }; moveStage(el.dataset.id, 'Idea'); },
    diligence(el) {
      const v = store.byId('ventures', el.dataset.id);
      const item = K.addToQueue({ type: 'diligence', title: `Due diligence: ${v.name}`, question: `Assess ${v.name} (${v.summary}). Cover market size and demand evidence in the UAE/GCC, competitors and pricing benchmarks, regulatory and licensing requirements, unit economics benchmarks, capital required and key risks. Recommend the three riskiest assumptions to test first and the cheapest test for each.`, domain: 'Business & Ventures', venture: v.id, priority: 'High' });
      if (K.mode() !== 'connected') copyText(K.promptFor(item, store.get().ventures));
      toast('Diligence sent to Claude', 'ok');
    },
  },
};
