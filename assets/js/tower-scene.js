// tower-scene.js — the architecture of The Tower, authored as meshes for gl.js.
import { Mesh, surface, lathe, sector, sphere, frustum, box, card, tube, circlePts, bezier3, frames, V, TAU, hex, mt, rng } from './gl.js';

export const FLOW = ['Idea', 'Validate', 'Plan', 'Build', 'Launch', 'Scale'];
export const STAGE_COLOR = { Idea: '#8f9bb0', Validate: '#6fa0d8', Plan: '#a18ad6', Build: '#c9a54c', Launch: '#e39a4f', Scale: '#4fb286', Parked: '#e0705c' };
export const STAGE_NAME = { Idea: 'Seed', Validate: 'Sprout', Plan: 'Sapling', Build: 'Growth', Launch: 'Bloom', Scale: 'Canopy', Parked: 'Seed Vault' };
export const GROUPS = { knowledge: { label: 'Knowledge', color: '#6fa0d8' }, capital: { label: 'Capital', color: '#4fb286' }, governance: { label: 'Governance', color: '#a18ad6' }, operations: { label: 'Operations', color: '#e39a4f' } };

// geometry constants
export const FH = 1.6, NF = FLOW.length, B = 0.55, TOP = B + NF * FH;
export const ISLAND_R = 8.4, DEPTH = 3.4, BASE = 0.4, MOD_R = 5.7, WEDGE = (58 * Math.PI) / 180;
export const VAULT_C = [0, -2.1, 0], VAULT_R = 1.3;
export const rad = (y) => 2.2 + 0.4 * Math.sin(y * 0.5 + 0.4) - y * 0.03;
export const twist = (y) => y * 0.085;
export const floorY = (i) => B + i * FH;
export const stageMidY = (st) => (st === 'Parked' ? VAULT_C[1] : floorY(FLOW.indexOf(st)) + FH / 2);
export const polar = (deg, r, y = 0) => [Math.cos((deg * Math.PI) / 180) * r, y, Math.sin((deg * Math.PI) / 180) * r];

export const MODULE_DEFS = [
  { k: 'wiki', label: 'Knowledge Wiki', group: 'knowledge', href: '#/wiki', feeds: ['Idea', 'Validate', 'Plan'],
    role: 'The memory of the empire. Every idea starts by asking what we already know — market, regulation, benchmarks — and every finding is filed back here so the next idea starts smarter.' },
  { k: 'claude', label: 'Claude Desk', group: 'knowledge', href: '#/claude', feeds: ['Validate', 'Plan'], also: ['wiki'],
    role: 'Your research partner. Commission diligence on a venture at Validate; Claude researches it from primary sources overnight and files a dossier into the wiki.' },
  { k: 'math', label: 'Mastermind Lab', group: 'knowledge', href: '#/math', feeds: ['Validate', 'Plan', 'Launch'],
    role: 'The mathematics of the decision: expected value and Kelly sizing at Validate, NPV / DCF / break-even at Plan, and a logged forecast before you commit to scale.' },
  { k: 'legal', label: 'Legal & Entities', group: 'governance', href: '#/legal', feeds: ['Plan', 'Build', 'Scale'],
    role: 'Structure and trust. Choose the entity at Plan, make it active and register contracts at Build, and calendar the obligations that keep it in good standing.' },
  { k: 'treasury', label: 'Treasury', group: 'capital', href: '#/treasury', feeds: ['Plan', 'Build'],
    role: 'The capital gate. Only strategic cash — above your operating and reserve tiers — can fund a venture moving from Plan into Build.' },
  { k: 'finance', label: 'Accounting', group: 'capital', href: '#/finance', feeds: ['Build', 'Launch'],
    role: 'If it is not in the ledger it did not happen. Books open at Build; revenue booked in the ledger is what proves a Launch.' },
  { k: 'investments', label: 'Investments', group: 'capital', href: '#/investments', feeds: [], also: ['treasury'],
    role: 'The portfolio that compounds alongside the ventures. Liquid holdings top up strategic cash when the tower needs capital.' },
  { k: 'property', label: 'Property', group: 'capital', href: '#/property', feeds: [], also: ['treasury'],
    role: 'Income-producing assets. Net rental cash flow feeds Treasury, which funds the next venture.' },
].map((m, i) => ({ ...m, deg: 70 + (i * 220) / 7, also: m.also || [] }));

/** Outposts on the outer ring: the operating tools that move goods and money. */
export const OUTPOST_DEFS = [
  { k: 'procure', label: 'Procurement Yard', group: 'operations', href: '#/procure', feeds: ['Build', 'Launch'], also: ['finance'], deg: 117, r: 7.5,
    role: 'Where the empire buys. Every item, quote, purchase order and shipment, costed to the door: landed cost, not unit price, decides who wins the order.' },
  { k: 'commerce', label: 'Commerce Hub', group: 'operations', href: '#/commerce', feeds: ['Launch', 'Scale'], also: ['procure'], deg: 243, r: 7.5,
    role: 'Where the empire sells. Product leads, Amazon economics, supplier vetting and the cash forecast for the online store.' },
].map((m) => ({ ...m }));
export const ALL_DEFS = [...MODULE_DEFS.map((m) => ({ ...m, r: MOD_R })), ...OUTPOST_DEFS];
export const modBodyTop = (m) => (m.group === 'knowledge' ? 2.5 : m.group === 'capital' ? 1.67 : m.group === 'operations' ? 0.85 : 1.6);
export const modTopY = (m) => (m.group === 'knowledge' ? 3.5 : m.group === 'capital' ? 1.75 : m.group === 'operations' ? 1.25 : 1.6);
const nearOutpost = (p, pad = 1.6) => OUTPOST_DEFS.some((o) => { const q = polar(o.deg, o.r); return Math.hypot(q[0] - p[0], q[2] - p[2]) < pad; });
export const inWedge = (deg, pad = 0) => { const d = ((deg % 360) + 540) % 360 - 180; return Math.abs(d) < 58 + pad; };   // deg measured from +x; wedge centred on +x

const W = (n) => [n, n, n];
const mixc = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const METAL = { col: hex('#cdb482'), mat: mt(0.28, 0.9, 0, 0) };
const STONE = hex('#9a958a');

// ---------------------------------------------------------------- the island, cutaway section and plinth
function island(m) {
  const A0 = WEDGE, A1 = TAU - WEDGE, R = ISLAND_R, soil = { col: hex('#6b5a45'), mat: mt(1, 0, 0, 6) };
  lathe(m, [[R, -DEPTH], [R, 0]], 120, { ...soil, a0: A0, a1: A1 });
  sector(m, 0, R, A0, A1, 0, 28, 120, { col: hex('#4a6b3a'), mat: mt(0.95, 0, 0, 1) });
  for (const [a, dir] of [[A0, 1], [A1, -1]]) {   // radial cut walls
    const c = Math.cos(a), s = Math.sin(a), n = dir > 0 ? [s, 0, -c] : [-s, 0, c];
    const q = [[0, -DEPTH, 0], [c * R, -DEPTH, s * R], [c * R, 0, s * R], [0, 0, 0]];
    const ids = q.map((p, i) => m.vert(p, n, hex('#6b5a45'), mt(1, 0, 0, 6), [i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0])); m.quad(ids[0], ids[1], ids[2], ids[3]);
  }
  sector(m, 0, R, -WEDGE, WEDGE, -DEPTH, 10, 50, { col: hex('#33363c'), mat: mt(0.85, 0, 0, 2) });
  lathe(m, [[0, -DEPTH - BASE], [R + 0.14, -DEPTH - BASE], [R + 0.14, -DEPTH], [R, -DEPTH]], 120, { col: hex('#2a2d33'), mat: mt(0.55, 0.4, 0, 2) });
  const glow = (pts, col, r = 0.028, e = 1.7) => tube(m, pts, r, 5, { col: hex(col), mat: mt(0.4, 0, e, 11) });
  glow(circlePts(R + 0.01, 0.025, 120, 0, 0, A0, A1), '#e2c477');
  glow(circlePts(R + 0.14, -DEPTH - BASE / 2, 120), '#6fd4c4', 0.03, 1.3);
  for (const a of [A0, A1]) glow([[0, 0.025, 0], [Math.cos(a) * R, 0.025, Math.sin(a) * R]], '#e2c477');
}

function plinthAndFoundation(m) {
  lathe(m, [[0, -0.6], [3.55, -0.6], [3.55, -0.15], [3.4, 0], [3.38, B], [0, B]], 72, { col: hex('#a39d90'), mat: mt(0.7, 0, 0, 2) });
  tube(m, circlePts(3.28, B + 0.02, 96), 0.025, 5, { col: hex('#e2c477'), mat: mt(0.4, 0, 1.8, 11) });
  tube(m, circlePts(3.55, -0.3, 96), 0.02, 5, { col: hex('#6fd4c4'), mat: mt(0.4, 0, 1.4, 11) });
  for (let i = 0; i < 7; i++) { const a = (-50 + i * 16.7) * Math.PI / 180, r = 2.55; lathe(m, [[0.17, -DEPTH], [0.17, -0.6]], 14, { cx: Math.cos(a) * r, cz: Math.sin(a) * r, col: hex('#8a8a86'), mat: mt(0.75, 0, 0, 2) }); }
  lathe(m, [[0.42, -DEPTH], [0.42, -2.3]], 24, { col: hex('#8a8a86'), mat: mt(0.75, 0, 0, 2) });
  lathe(m, [[1.9, -DEPTH], [1.9, -DEPTH + 0.14], [1.7, -DEPTH + 0.18], [0, -DEPTH + 0.18]], 40, { col: hex('#5a5d63'), mat: mt(0.7, 0.2, 0, 2) });
}

// ---------------------------------------------------------------- tower floors
const NCELL = 24, ROWS = 2;
function floorsOf(R, reg) {
  FLOW.forEach((st, i) => {
    const y0 = floorY(i), y1 = y0 + FH, col = hex(STAGE_COLOR[st]), r0 = rad(y0);
    const facade = new Mesh();
    surface(facade, (u, v) => { const y = y0 + (y1 - y0) * v, th = u * TAU + twist(y), r = rad(y); return [Math.cos(th) * r, y, Math.sin(th) * r]; }, NCELL * 4, 4, { col, mat: mt(0.05, i, 0, 9), uv: [NCELL, ROWS], out: (p) => [0, p[1], 0] });
    const inner = new Mesh();
    lathe(inner, [[0, y0 - 0.05], [r0 - 0.03, y0 - 0.05], [r0 - 0.03, y0 + 0.06], [0, y0 + 0.06]], 64, { col: mixc(col, [0.11, 0.12, 0.14], 0.82), mat: mt(0.55, 0.15, 0, 0) });
    tube(inner, circlePts(r0 - 0.04, y0 + 0.07, 72), 0.025, 5, { col, mat: mt(0.4, 0, 1.8, 11) });
    tube(inner, circlePts(r0 + 0.07, y0 + 0.02, 96), 0.035, 6, { col, mat: mt(0.4, 0, 2.0, 11) });
    tube(inner, circlePts(1.25, y1 - 0.09, 64), 0.025, 5, { col: hex('#ffe3b0'), mat: mt(0.4, 0, 1.3, 11) });
    tube(inner, circlePts(1.9, y1 - 0.09, 64), 0.016, 5, { col: hex('#ffe3b0'), mat: mt(0.4, 0, 0.8, 11) });
    lathe(inner, [[1.0, y0 + 0.06], [1.0, y0 + 0.3], [1.2, y0 + 0.3], [1.2, y0 + 0.06]], 48, { col: mixc(col, [0.8, 0.78, 0.74], 0.6), mat: mt(0.35, 0.2, 0, 0) });
    tube(inner, circlePts(1.1, y0 + 0.31, 56), 0.016, 5, { col, mat: mt(0.4, 0, 1.6, 11) });
    const gi = R.addGroup(inner, { pass: 'opaque', shadow: true, tag: 'static' });
    const gf = R.addGroup(facade, { pass: 'glass', center: [0, (y0 + y1) / 2, 0], tag: 'static' });
    reg.floors.push([gi, gf]);
  });
}

function exoskeleton(R, reg) {
  const m = new Mesh();
  for (const fam of [1, -1]) for (let k = 0; k < 12; k++) {
    const pts = []; const N = 54;
    for (let s = 0; s <= N; s++) { const y = B + ((TOP - B) * s) / N, th = (k * TAU) / 12 + twist(y) + fam * 0.17 * (y - B), r = rad(y) + 0.05; pts.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
    tube(m, pts, 0.042, 6, METAL);
    for (let i = 0; i <= NF; i++) { const s = Math.round((i * FH * N) / (TOP - B)), p = pts[Math.min(N, s)]; sphere(m, p, 0.075, 6, METAL); }
  }
  reg.exo = R.addGroup(m, { pass: 'opaque', shadow: true, tag: 'static' });
}

function terraces(R) {
  const solid = new Mesh(), glass = new Mesh(), leaf = new Mesh(); const rnd = rng(11);
  for (let i = 0; i < NF; i++) {
    const y = floorY(i), r0 = rad(y) + 0.02, r1 = rad(y) + 0.64;
    lathe(solid, [[r0, y - 0.09], [r1, y - 0.09], [r1, y + 0.02], [r0, y + 0.02]], 96, { col: hex('#9b7a4c'), mat: mt(0.75, 0, 0, 0) });
    lathe(solid, [[r1 - 0.3, y + 0.02], [r1 - 0.3, y + 0.13], [r1 - 0.08, y + 0.13], [r1 - 0.08, y + 0.02]], 96, { col: hex('#2f2418'), mat: mt(1, 0, 0, 0) });
    lathe(glass, [[r1 - 0.02, y + 0.02], [r1 - 0.02, y + 0.46]], 96, { col: [0.7, 0.85, 0.95, 0.14], mat: mt(0.05, 0, 0, 3) });
    tube(solid, circlePts(r1 - 0.02, y + 0.47, 96), 0.02, 5, METAL);
    for (let k = 0; k < 96; k += 6) { const a = (k / 96) * TAU; tube(solid, [[Math.cos(a) * (r1 - 0.02), y + 0.02, Math.sin(a) * (r1 - 0.02)], [Math.cos(a) * (r1 - 0.02), y + 0.47, Math.sin(a) * (r1 - 0.02)]], 0.014, 4, METAL); }
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * TAU + rnd() * 0.05, rr = r1 - 0.19;
      const c = [Math.cos(a) * rr, y + 0.14, Math.sin(a) * rr];
      for (let q = 0; q < 11; q++) { const o = [(rnd() - 0.5) * 0.28, rnd() * 0.22, (rnd() - 0.5) * 0.28]; const s = 0.09 + rnd() * 0.07; leafCard(leaf, V.add(c, o), s, rnd, [0.12 + rnd() * 0.12, 0.33 + rnd() * 0.22, 0.1 + rnd() * 0.1], 0.5); }
      if (k % 3 === 0) { const bx = Math.cos(a) * (r1 - 0.02), bz = Math.sin(a) * (r1 - 0.02); for (let q = 0; q < 4; q++) leafCard(leaf, [bx + (rnd() - 0.5) * 0.1, y - 0.12 - q * 0.16, bz + (rnd() - 0.5) * 0.1], 0.1, rnd, [0.1, 0.4 + rnd() * 0.2, 0.12], 0.8); }
    }
  }
  R.addGroup(solid, { pass: 'opaque', shadow: true, tag: 'static' });
  R.addGroup(glass, { pass: 'glass', center: [0, 5, 0], tag: 'static' });
  R.addGroup(leaf, { pass: 'foliage', tag: 'static' });
}

function leafCard(m, c, s, rnd, col, sway = 0.5, type = 0) {
  const ax = V.mul(V.norm([rnd() - 0.5, (rnd() - 0.5) * 0.6, rnd() - 0.5]), s), t = V.norm(V.cross(ax, [rnd() - 0.5, 1, rnd() - 0.5]));
  card(m, c, ax, V.mul(t, s * 0.8), { col: [col[0], col[1], col[2], sway], mat: mt(0.8, type, 0, 7) }, V.norm([rnd() - 0.5, 0.8, rnd() - 0.5]));
}

function atriumAndCrown(R, reg) {
  const glass = new Mesh(), glow = new Mesh(), solid = new Mesh(), crown = new Mesh(), light = new Mesh();
  lathe(glass, [[0.7, B], [0.7, TOP]], 40, { col: [1, 0.85, 0.5, 0.12], mat: mt(0.05, 0, 0.1, 3) });
  lathe(glow, [[0.34, B + 0.1], [0.34, TOP]], 24, { col: hex('#ffd98a'), mat: mt(1, 0, 0.55, 8) });
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; tube(solid, [[Math.cos(a) * 0.7, B, Math.sin(a) * 0.7], [Math.cos(a) * 0.7, TOP, Math.sin(a) * 0.7]], 0.02, 5, { col: hex('#ffd98a'), mat: mt(0.4, 0, 1.8, 11) }); }
  lathe(solid, [[0, TOP - 0.05], [rad(TOP), TOP - 0.05], [rad(TOP), TOP + 0.12], [0, TOP + 0.12]], 64, { col: hex('#33363c'), mat: mt(0.4, 0.5, 0, 0) });
  tube(solid, circlePts(rad(TOP) + 0.02, TOP + 0.13, 96), 0.04, 6, { col: hex('#e2c477'), mat: mt(0.4, 0, 2.2, 11) });
  // lotus crown
  const K = 12, petal = (k, u, v) => {
    const phi = (k * TAU) / K + twist(TOP), rho = rad(TOP) * (1 + 0.32 * Math.sin(Math.PI * v * 0.9) - 0.86 * Math.pow(v, 1.25)), w = (TAU / K) * 0.62 * (1 - 0.86 * Math.pow(v, 1.5)), a = phi + u * w;
    return [Math.cos(a) * rho, TOP + 0.12 + 3.1 * v, Math.sin(a) * rho];
  };
  for (let k = 0; k < K; k++) {
    const c = k % 2 ? hex('#c9a54c') : hex('#4fb286');
    surface(crown, (u, v) => petal(k, u * 2 - 1, v), 8, 16, { col: [...c, 0.62], mat: mt(0.05, 0, 0.7, 3), out: (p) => [0, p[1] - 0.6, 0] });
    for (const u of [-1, 0, 1]) tube(solid, Array.from({ length: 18 }, (_, i) => petal(k, u, i / 17)), u ? 0.014 : 0.01, 4, { col: hex(k % 2 ? '#ffdd8a' : '#9af0c4'), mat: mt(0.4, 0, 1.5, 11) });
  }
  tube(solid, circlePts(1.15, TOP + 1.55, 72), 0.03, 6, { col: hex('#fff1b8'), mat: mt(0.4, 0, 2, 11) });
  sphere(light, [0, TOP + 3.1, 0], 0.2, 14, { col: hex('#fff3c4'), mat: mt(0.3, 0, 2.6, 10) });
  lathe(glow, [[0.3, TOP + 3.2], [0.03, TOP + 17]], 20, { col: hex('#fff1b8'), mat: mt(1, 0, 0.8, 8) });
  lathe(glow, [[0.05, -2.8], [0.05, TOP + 3]], 8, { col: hex('#ffd98a'), mat: mt(1, 0, 1.2, 8), uv: [1, 0.4] });
  R.addGroup(solid, { pass: 'opaque', shadow: true, tag: 'static' });
  R.addGroup(glass, { pass: 'glass', center: [0, 5, 0], tag: 'static' });
  R.addGroup(glow, { pass: 'additive', tag: 'static' });
  reg.crown = [R.addGroup(crown, { pass: 'glass', center: [0, TOP + 1.7, 0], tag: 'static' }), R.addGroup(light, { pass: 'opaque', tag: 'static' })];
}

function vault(R, reg) {
  const glass = new Mesh(), glow = new Mesh(), solid = new Mesh();
  sphere(glass, VAULT_C, VAULT_R, 28, { col: [0.9, 0.46, 0.38, 0.2], mat: mt(0.05, 0, 0.18, 3) });
  sphere(glow, VAULT_C, VAULT_R * 0.82, 20, { col: hex('#e0705c'), mat: mt(1, 0, 1.1, 8), uv: [1, 0] });
  for (const lat of [-0.5, 0, 0.5]) { const y = VAULT_C[1] + VAULT_R * Math.sin(lat), r = VAULT_R * Math.cos(lat) + 0.01; tube(solid, circlePts(r, y, 64, 0, 0), 0.02, 5, { col: hex('#e8a27c'), mat: mt(0.4, 0, 1.4, 11) }); }
  tube(solid, circlePts(1.0, -DEPTH + 0.2, 64), 0.025, 5, { col: hex('#e0705c'), mat: mt(0.4, 0, 1.8, 11) });
  R.addGroup(solid, { pass: 'opaque', tag: 'static' });
  reg.vault = [R.addGroup(glass, { pass: 'glass', center: VAULT_C, tag: 'static' }), R.addGroup(glow, { pass: 'additive', tag: 'static' })];
}

function roots(R) {
  const m = new Mesh(), rnd = rng(5), mat = mt(0.6, 0.25, 1.0, 5), col = hex('#d9a85a');
  for (const [a, nin] of [[WEDGE, (c, s) => [s, 0, -c]], [-WEDGE, (c, s) => [-s, 0, c]]]) {
    const c = Math.cos(a), s = Math.sin(a), n = V.mul(nin(c, s), 0.05);
    for (let k = 0; k < 8; k++) {
      const r0 = 0.9 + rnd() * 0.9, reach = 2.6 + rnd() * 4.2, drop = 1.0 + rnd() * 2.0, ph = rnd() * 6, pts = [], br = [];
      for (let i = 0; i <= 28; i++) {
        const t = i / 28, r = r0 + reach * t, y = -0.15 - drop * Math.pow(t, 0.8) + Math.sin(t * 9 + ph) * 0.12 * t;
        const p = V.add([c * r, y, s * r], n); pts.push(p); if (i >= 12) br.push(V.add(p, [0, -(t - 0.43) * 1.8 - Math.sin(t * 14 + ph) * 0.05, 0]));
      }
      tube(m, pts, (i, t) => 0.075 * (1 - t * 0.78) + 0.012, 6, { col, mat, uvScale: 1 });
      tube(m, br, (i, t) => 0.04 * (1 - t * 0.7) + 0.008, 5, { col, mat });
    }
  }
  for (let k = 0; k < 8; k++) {   // tendrils from the plinth to the vault
    const a = (-52 + k * 14.8) * Math.PI / 180, r = 2.2 + rnd() * 1.2, start = [Math.cos(a) * r, -0.6, Math.sin(a) * r], end = [Math.cos(a) * 0.9, -1.2, Math.sin(a) * 0.9];
    tube(m, bezier3(start, end, -0.9, 24), (i, t) => 0.05 * (1 - t * 0.5), 5, { col, mat });
  }
  R.addGroup(m, { pass: 'opaque', tag: 'static' });
}

// ---------------------------------------------------------------- ground: pool, paths, mycelium, lamps
function groundworks(R, reg) {
  const m = new Mesh(), A0 = WEDGE, A1 = TAU - WEDGE;
  sector(m, 3.95, 5.0, A0, A1, 0.03, 4, 110, { col: hex('#2ea6a0'), mat: mt(0.1, 0, 0, 4) });
  tube(m, circlePts(3.93, 0.1, 110, 0, 0, A0, A1), 0.05, 5, { col: STONE, mat: mt(0.8, 0, 0, 2) });
  tube(m, circlePts(5.02, 0.1, 110, 0, 0, A0, A1), 0.05, 5, { col: STONE, mat: mt(0.8, 0, 0, 2) });
  for (const mod of MODULE_DEFS) {
    const d = (mod.deg * Math.PI) / 180, c = Math.cos(d), s = Math.sin(d);
    box(m, [c * 4.3, 0.07, s * 4.3], 1.7, 0.1, 1.05, d, { col: hex('#b6b0a2'), mat: mt(0.7, 0, 0, 2) });                     // bridge across the pool
    for (const side of [-1, 1]) tube(m, [[c * 3.5 - s * 0.5 * side, 0.15, s * 3.5 + c * 0.5 * side], [c * 5.1 - s * 0.5 * side, 0.15, s * 5.1 + c * 0.5 * side]], 0.018, 4, METAL);
    box(m, [c * 5.25, 0.03, s * 5.25], 1.0, 0.05, 0.9, d, { col: hex('#aaa496'), mat: mt(0.8, 0, 0, 2) });
  }
  for (const mod of MODULE_DEFS) for (const o of mod.also) {
    const to = MODULE_DEFS.find((x) => x.k === o), a = polar(mod.deg, MOD_R, 0.07), b = polar(to.deg, MOD_R, 0.07), mid = V.lerp(a, b, 0.5); mid[0] *= 0.55; mid[2] *= 0.55;
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, w = 1 - t; pts.push([w * w * a[0] + 2 * w * t * mid[0] + t * t * b[0], 0.07, w * w * a[2] + 2 * w * t * mid[2] + t * t * b[2]]); }
    const mm = new Mesh(); tube(mm, pts, 0.04, 5, { col: hex(GROUPS[mod.group].color), mat: mt(0.5, 0.25, 1.4, 5) });
    reg.myc.push({ from: mod.k, to: o, g: R.addGroup(mm, { pass: 'opaque', tag: 'static' }) });
  }
  // lamps along the rim
  for (let a = 64; a < 300; a += 12) {
    const p = polar(a, ISLAND_R - 0.55);
    if (nearOutpost(p, 1.25)) continue;
    lathe(m, [[0.035, 0], [0.035, 1.15]], 8, { cx: p[0], cz: p[2], col: hex('#1b1e24'), mat: mt(0.4, 0.8, 0, 0) });
    sphere(m, [p[0], 1.22, p[2]], 0.095, 8, { col: hex('#ffd9a0'), mat: mt(0.3, 0, 3.4, 11) });
  }
  R.addGroup(m, { pass: 'opaque', shadow: true, tag: 'static' });
}

// ---------------------------------------------------------------- trees and planting
function planting(R) {
  const trunks = new Mesh(), leaf = new Mesh(), rnd = rng(23), mods = MODULE_DEFS.map((m) => polar(m.deg, MOD_R));
  const placed = [];
  let guard = 0;
  while (placed.length < 15 && guard++ < 500) {
    const deg = rnd() * 360, r = 6.9 + rnd() * 1.0, p = polar(deg, r);
    if (inWedge(deg, 9)) continue;
    if (placed.some((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) < 1.5) || nearOutpost(p, 1.9)) continue;
    placed.push(p);
  }
  placed.forEach((p, idx) => {
    const palm = idx % 3 !== 0, h = 2.0 + rnd() * 1.4, lean = (rnd() - 0.5) * 0.9, ph = rnd() * TAU, dirA = rnd() * TAU;
    const top = [p[0] + Math.cos(dirA) * lean, h, p[2] + Math.sin(dirA) * lean], ctrl = [p[0] + Math.cos(dirA) * lean * 0.1, h * 0.55, p[2] + Math.sin(dirA) * lean * 0.1];
    const trunk = Array.from({ length: 14 }, (_, i) => { const t = i / 13, w = 1 - t; return [w * w * p[0] + 2 * w * t * ctrl[0] + t * t * top[0], w * w * 0 + 2 * w * t * ctrl[1] + t * t * h, w * w * p[2] + 2 * w * t * ctrl[2] + t * t * top[2]]; });
    tube(trunks, trunk, (i, t) => (palm ? 0.13 - t * 0.05 : 0.17 - t * 0.09), 7, { col: hex(palm ? '#7a6244' : '#5e4a32'), mat: mt(0.95, 0, 0, 0), uvScale: 1 });
    if (palm) {
      for (let f = 0; f < 12; f++) {
        const a = (f / 12) * TAU + ph, dir = [Math.cos(a), 0, Math.sin(a)], len = 1.6 + rnd() * 0.5, N = 9, side = V.mul(V.norm(V.cross(dir, [0, 1, 0])), 0.34), up = (f % 2 ? 0.2 : 0) + rnd() * 0.15;
        const pts = Array.from({ length: N + 1 }, (_, i) => { const s = i / N; return V.add(top, [dir[0] * len * s, len * (0.5 * s - 1.05 * s * s) + up * (1 - s), dir[2] * len * s]); });
        const col = [0.1 + rnd() * 0.08, 0.38 + rnd() * 0.18, 0.1 + rnd() * 0.06, 0.9];
        const ids = pts.map((q, i) => { const s = i / N, w = V.mul(side, 1 - s * 0.5); return [leaf.vert(V.sub(q, w), [0, 1, 0], col, mt(0.8, 1, 0, 7), [s, 0]), leaf.vert(V.add(q, w), [0, 1, 0], col, mt(0.8, 1, 0, 7), [s, 1])]; });
        for (let i = 0; i < N; i++) leaf.quad(ids[i][0], ids[i + 1][0], ids[i + 1][1], ids[i][1]);
      }
    } else {
      const c = [top[0], h + 0.15, top[2]], cnt = 190;
      for (let q = 0; q < cnt; q++) {
        const th = rnd() * TAU, ph2 = Math.acos(1 - rnd() * 0.9), rr = 1.25 * Math.cbrt(rnd());
        const o = [Math.cos(th) * Math.sin(ph2) * rr * 1.25, Math.cos(ph2) * rr * 0.55, Math.sin(th) * Math.sin(ph2) * rr * 1.25];
        leafCard(leaf, V.add(c, o), 0.16 + rnd() * 0.1, rnd, [0.12 + rnd() * 0.1, 0.34 + rnd() * 0.2, 0.09 + rnd() * 0.08], 1);
      }
      for (const b of [0.6, -0.6]) tube(trunks, [top, [top[0] + b, h + 0.5, top[2] - b * 0.4]], 0.05, 5, { col: hex('#5e4a32'), mat: mt(0.95, 0, 0, 0) });
    }
  });
  // shrub clusters with flowers
  let n = 0; guard = 0;
  while (n < 22 && guard++ < 500) {
    const deg = rnd() * 360, r = 4.9 + rnd() * 2.3, p = polar(deg, r);
    if (inWedge(deg, 8) || mods.some((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) < 2.3) || nearOutpost(p, 1.5)) continue;
    n++;
    for (let q = 0; q < 46; q++) { const o = [(rnd() - 0.5) * 0.9, rnd() * 0.45, (rnd() - 0.5) * 0.9]; leafCard(leaf, V.add(p, [o[0], o[1] + 0.12, o[2]]), 0.14 + rnd() * 0.08, rnd, [0.08 + rnd() * 0.1, 0.28 + rnd() * 0.2, 0.08 + rnd() * 0.06], 0.9); }
    const fc = [[0.95, 0.5, 0.65], [1, 0.85, 0.35], [0.95, 0.95, 0.95], [0.75, 0.55, 0.95]][Math.floor(rnd() * 4)];
    for (let q = 0; q < 7; q++) leafCard(leaf, V.add(p, [(rnd() - 0.5) * 0.8, 0.4 + rnd() * 0.25, (rnd() - 0.5) * 0.8]), 0.05, rnd, fc, 0.9);
  }
  R.addGroup(trunks, { pass: 'opaque', shadow: true, tag: 'static' });
  R.addGroup(leaf, { pass: 'foliage', tag: 'static' });
}

// ---------------------------------------------------------------- pavilions and sky-bridges
function rot2(x, z, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - z * s, x * s + z * c]; }

function propFor(k, m, bx, bz, face) {
  const p = new Mesh(), col = hex(GROUPS[m.group].color), gold = hex('#e2c477'), y0 = 0.15;
  const glowMat = (e = 1.8) => mt(0.35, 0, e, 0);
  switch (k) {
    case 'wiki': case 'claude': {
      const tilt = k === 'wiki' ? 0.5 : -0.4;
      sphere(p, [bx, 1.0, bz], 0.26, 14, { col: k === 'wiki' ? col : hex('#ffe3a0'), mat: mt(0.3, 0, 2.6, 10) });
      tube(p, Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * TAU, x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55; return [bx + x, 1.0 + z * Math.sin(tilt), bz + z * Math.cos(tilt)]; }), 0.018, 5, { col: gold, mat: mt(0.4, 0, 1.8, 11) });
      if (k === 'claude') for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; sphere(p, [bx + Math.cos(a) * 0.55, 1.0 + Math.sin(a) * 0.55 * Math.sin(tilt), bz + Math.sin(a) * 0.55 * Math.cos(tilt)], 0.06, 8, { col: gold, mat: mt(0.3, 0, 3, 10) }); }
      break;
    }
    case 'math': frustum(p, bx, bz, 0.02, 0.38, 4, 0.55, 0.95, face, { col, mat: glowMat(1.6) }); frustum(p, bx, bz, 0.38, 0.02, 4, 0.95, 1.35, face, { col, mat: glowMat(1.6) }); break;
    case 'legal': for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.24; const [dx, dz] = rot2(0, x, face); lathe(p, [[0.06, y0], [0.06, 1.0]], 10, { cx: bx + dx, cz: bz + dz, col: hex('#e8e4da'), mat: mt(0.4, 0.1, 0.2, 0) }); } { const [dx, dz] = rot2(0, 0, face); box(p, [bx + dx, 1.05, bz + dz], 0.15, 0.08, 1.35, face + Math.PI / 2, { col: gold, mat: glowMat(1.2) }); } break;
    case 'treasury': for (let i = 0; i < 7; i++) { const j = (i % 2) * 0.03; lathe(p, [[0, y0 + 0.09 * i], [0.4, y0 + 0.09 * i], [0.4, y0 + 0.09 * i + 0.075], [0, y0 + 0.09 * i + 0.075]], 24, { cx: bx + j, cz: bz - j, col: hex('#e2b84a'), mat: mt(0.2, 0.95, 0.3, 0) }); } break;
    case 'finance': [0.5, 0.85, 0.65].forEach((h, i) => { const [dx, dz] = rot2(0, (i - 1) * 0.36, face); box(p, [bx + dx, y0 + h / 2, bz + dz], 0.26, h, 0.26, face, { col, mat: glowMat(1.7) }); }); break;
    case 'investments': [0.3, 0.45, 0.65, 0.9, 1.2].forEach((h, i) => { const [dx, dz] = rot2(0, (i - 2) * 0.3, face); box(p, [bx + dx, y0 + h / 2, bz + dz], 0.2, h, 0.2, face, { col, mat: glowMat(1.9) }); }); break;
    case 'property': box(p, [bx, y0 + 0.24, bz], 0.7, 0.48, 0.55, face, { col: hex('#efe8d8'), mat: mt(0.5, 0, 0.3, 0) }); frustum(p, bx, bz, 0.5, 0.03, 4, y0 + 0.48, y0 + 0.95, face + Math.PI / 4, { col, mat: glowMat(1.5) }); break;
    default: break;
  }
  return p;
}

function modules(R, reg) {
  for (const m of MODULE_DEFS) {
    const base = polar(m.deg, MOD_R), bx = base[0], bz = base[2], face = Math.atan2(bz, bx) + Math.PI, col = hex(GROUPS[m.group].color);
    const solid = new Mesh(), glass = new Mesh(), glow = new Mesh(), props = propFor(m.k, m, bx, bz, face);
    lathe(solid, [[0, 0], [1.65, 0], [1.65, 0.1], [1.5, 0.15], [0, 0.15]], 48, { cx: bx, cz: bz, col: hex('#8f8c84'), mat: mt(0.85, 0, 0, 2) });
    tube(solid, circlePts(1.52, 0.16, 56, bx, bz), 0.02, 5, { col, mat: mt(0.4, 0, 1.7, 11) });
    const gl = (a = 0.24) => ({ col: [...col, a], mat: mt(0.05, 0, 0.16, 3) });
    if (m.group === 'knowledge') {
      const y0 = 0.15, y1 = 2.5, r0 = 0.82, r1 = 0.56, n = 6, rot = face + Math.PI / 6;
      frustum(glass, bx, bz, r0, r1, n, y0, y1, rot, gl(0.42)); frustum(glass, bx, bz, r1, 0.02, n, y1, y1 + 0.95, rot, gl(0.42));
      for (let i = 0; i < n; i++) { const a = rot + (i * TAU) / n; const bo = [bx + Math.cos(a) * r0, y0, bz + Math.sin(a) * r0], to = [bx + Math.cos(a) * r1, y1, bz + Math.sin(a) * r1]; tube(solid, [bo, to], 0.035, 6, METAL); tube(solid, [to, [bx, y1 + 0.95, bz]], 0.03, 6, METAL); }
      for (let k = 0; k < 4; k++) { const yk = 0.6 + k * 0.55, rr = (r0 + (r1 - r0) * ((yk - y0) / (y1 - y0))) * 0.96; tube(solid, circlePts(rr, yk, 6, bx, bz).map((p, i) => { const a = rot + (i * TAU) / 6; return [bx + Math.cos(a) * rr, yk, bz + Math.sin(a) * rr]; }), 0.022, 5, { col, mat: mt(0.4, 0, 1.6, 11) }); lathe(solid, [[0, yk - 0.02], [rr * 0.97, yk - 0.02], [rr * 0.97, yk + 0.02], [0, yk + 0.02]], 6, { cx: bx, cz: bz, col: hex('#20252c'), mat: mt(0.5, 0.2, 0, 0), a0: rot, a1: rot + TAU }); }
      lathe(glow, [[0.2, 0.2], [0.2, 3.1]], 16, { cx: bx, cz: bz, col, mat: mt(1, 0, 1.1, 8) });
      sphere(solid, [bx, y1 + 1.02, bz], 0.09, 8, { col: hex('#ffffff'), mat: mt(0.2, 0, 3.4, 10) });
      lathe(glow, [[0.06, 3.55], [0.012, 7.5]], 10, { cx: bx, cz: bz, col, mat: mt(1, 0, 0.6, 8) });
    } else if (m.group === 'capital') {
      lathe(solid, [[1.08, 0.15], [1.08, 0.62], [1.04, 0.64]], 56, { cx: bx, cz: bz, col: hex('#aaa496'), mat: mt(0.7, 0, 0, 2) });
      const prof = Array.from({ length: 15 }, (_, k) => { const a = (k / 14) * (Math.PI / 2); return [1.04 * Math.cos(a), 0.62 + 1.05 * Math.sin(a)]; }); prof[14][0] = 0.001;
      lathe(glass, prof, 40, { cx: bx, cz: bz, col: [...col, 0.2], mat: mt(0.05, 0, 0.16, 3) });
      for (let q = 0; q < 10; q++) { const a = (q / 10) * TAU; tube(solid, Array.from({ length: 15 }, (_, k) => { const t = (k / 14) * (Math.PI / 2); return [bx + Math.cos(a) * 1.05 * Math.cos(t), 0.62 + 1.06 * Math.sin(t), bz + Math.sin(a) * 1.05 * Math.cos(t)]; }), 0.02, 5, METAL); }
      for (const t of [0.3, 0.62, 0.95, 1.25]) tube(solid, circlePts(1.05 * Math.cos(t), 0.62 + 1.06 * Math.sin(t), 40, bx, bz), 0.018, 5, METAL);
      tube(solid, circlePts(0.7, 0.17, 40, bx, bz), 0.02, 5, { col, mat: mt(0.4, 0, 1.7, 11) });
      lathe(glow, [[0.25, 0.2], [0.25, 1.5]], 14, { cx: bx, cz: bz, col, mat: mt(1, 0, 0.9, 8) });
    } else {
      const rot = face + Math.PI / 4, half = 0.88;
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const [dx, dz] = rot2(sx * half * Math.SQRT2 * 0.707 * 1.0, sz * half, face); lathe(solid, [[0.06, 0.15], [0.06, 1.46]], 10, { cx: bx + dx, cz: bz + dz, col: hex('#d8d4ca'), mat: mt(0.4, 0.2, 0, 0) }); }
      box(solid, [bx, 0.19, bz], 2.1, 0.08, 2.1, face, { col: hex('#a8a296'), mat: mt(0.7, 0, 0, 2) });
      for (let k = 0; k < 4; k++) { const b = face + (k * Math.PI) / 2, n = [Math.cos(b), 0, Math.sin(b)], t = [-Math.sin(b) * 0.9, 0, Math.cos(b) * 0.9]; card(glass, [bx + n[0] * 0.9, 0.82, bz + n[2] * 0.9], t, [0, 0.66, 0], { col: [...col, 0.16], mat: mt(0.05, 0, 0.1, 3) }, n); }
      box(solid, [bx, 1.53, bz], 2.5, 0.14, 2.5, face, { col: hex('#3a3f46'), mat: mt(0.5, 0.5, 0, 0) });
      box(solid, [bx, 1.62, bz], 2.34, 0.05, 2.34, face, { col: hex('#2f6b3f'), mat: mt(0.95, 0, 0, 0) });
      tube(solid, [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]].map(([a, b]) => { const [dx, dz] = rot2((a - 0.5) * 2.5, (b - 0.5) * 2.5, face); return [bx + dx, 1.5, bz + dz]; }), 0.02, 5, { col, mat: mt(0.4, 0, 1.8, 11) });
      const rnd = rng(40 + Math.round(m.deg)), leaf = new Mesh();
      for (let q = 0; q < 42; q++) { const [dx, dz] = rot2((rnd() - 0.5) * 2.2, (rnd() - 0.5) * 2.2, face); leafCard(leaf, [bx + dx, 1.7 + rnd() * 0.12, bz + dz], 0.12, rnd, [0.12 + rnd() * 0.08, 0.4 + rnd() * 0.2, 0.12], 0.7); }
      reg.modules[m.k] = reg.modules[m.k] || []; reg.modules[m.k].push(R.addGroup(leaf, { pass: 'foliage', tag: 'static' }));
    }
    const top = modTopY(m); lathe(glow, [[0.08, top + 0.1], [0.015, top + 3.5]], 10, { cx: bx, cz: bz, col, mat: mt(1, 0, 0.55, 8) });
    reg.modules[m.k] = (reg.modules[m.k] || []).concat([R.addGroup(solid, { pass: 'opaque', shadow: true, tag: 'static' }), R.addGroup(props, { pass: 'opaque', tag: 'static' }), R.addGroup(glass, { pass: 'glass', center: [bx, 1.2, bz], tag: 'static' }), R.addGroup(glow, { pass: 'additive', tag: 'static' })]);

    // sky-bridges to the floors this pavilion powers
    m.feeds.forEach((st, fi) => {
      const i = FLOW.indexOf(st), y = floorY(i) + 0.3, ang = ((m.deg + (fi - (m.feeds.length - 1) / 2) * 7) * Math.PI) / 180, r = rad(y) + 0.6;
      const start = [bx * 0.8, modBodyTop(m) - 0.15, bz * 0.8], end = [Math.cos(ang) * r, y, Math.sin(ang) * r];
      const pts = bezier3(start, end, 0.9 + fi * 0.15, 56), bm = new Mesh(), fr = frames(pts);
      tube(bm, pts, 0.05, 8, { col, mat: mt(0.4, 0.5, 2.1, 5) });
      for (let s = 0; s < 2; s++) tube(bm, pts.map((p, i) => { const a = i * 0.45 + s * Math.PI; return V.add(p, V.add(V.mul(fr[i].N, Math.cos(a) * 0.13), V.mul(fr[i].B, Math.sin(a) * 0.13))); }), 0.014, 5, METAL);
      sphere(bm, start, 0.09, 8, { col, mat: mt(0.3, 0, 2.6, 11) }); sphere(bm, end, 0.11, 8, { col, mat: mt(0.3, 0, 2.6, 11) });
      reg.bridges.push({ m: m.k, st, g: R.addGroup(bm, { pass: 'opaque', tag: 'static' }) });
    });
  }
}

/** Builds every static piece of The Tower into the renderer and returns a registry for per-frame uniforms. */
export function buildStatic(R) {
  const reg = { floors: [], modules: {}, bridges: [], myc: [], exo: null, crown: [], vault: [] };
  const base = new Mesh(); island(base); plinthAndFoundation(base);
  R.addGroup(base, { pass: 'opaque', shadow: true, tag: 'static' });
  floorsOf(R, reg); exoskeleton(R, reg); terraces(R); atriumAndCrown(R, reg); vault(R, reg); roots(R);
  groundworks(R, reg); planting(R); modules(R, reg); outposts(R, reg);
  const rnd = rng(77), fl = [];
  for (let i = 0; i < 70; i++) fl.push(rnd() * TAU, 2.2 + rnd() * 5.8, 0.4 + rnd() * 5.5, 0.04 + rnd() * 0.08);
  R.addParticles(fl, { mode: 0, col: [0.85, 1, 0.55], int: 1.4 });
  const mo = []; for (let i = 0; i < 30; i++) mo.push(rnd(), rnd() * TAU, 0.15 + rnd() * 0.45, 0.05 + rnd() * 0.05);
  R.addParticles(mo, { mode: 1, col: [1, 0.78, 0.4], int: 1.6, top: TOP + 2.4 });
  return reg;
}

/** Dynamic part: venture pods, readiness halos and the links of the selected venture. */
export function buildVentures(R, sc, links) {
  R.removeTag('dyn'); const refs = { pods: {}, links: [] };
  for (const vn of sc.ventures) {
    const m = new Mesh(), r = 0.2 + 0.14 * (vn.score / 100), parked = vn.stage === 'Parked';
    sphere(m, vn.pos, r, 18, { col: hex(parked ? '#f0a890' : '#e2c477'), mat: mt(0.3, 0, 2.3, 10) });
    const rr = r * 1.6;
    tube(m, circlePts(rr, vn.pos[1], 48, vn.pos[0], vn.pos[2]), 0.012, 4, { col: hex('#ffffff'), mat: mt(0.4, 0, 0.35, 11) });
    if (vn.ready.pct > 0.02) tube(m, circlePts(rr, vn.pos[1], Math.max(4, Math.round(48 * vn.ready.pct)), vn.pos[0], vn.pos[2], -Math.PI / 2, -Math.PI / 2 + TAU * vn.ready.pct), 0.026, 5, { col: hex(vn.ready.pct >= 1 ? '#4fb286' : vn.color), mat: mt(0.4, 0, 2.2, 11) });
    refs.pods[vn.id] = R.addGroup(m, { pass: 'opaque', tag: 'dyn' });
  }
  for (const L of links) {
    const mod = ALL_DEFS.find((x) => x.k === L.to.k), top = modBodyTop(mod), b = polar(mod.deg, mod.r), start = [b[0] * 0.85, top - 0.1, b[2] * 0.85];
    const m = new Mesh(); tube(m, bezier3(start, L.from.pos, 1.2, 48), 0.055, 7, { col: hex(GROUPS[mod.group].color), mat: mt(0.4, 0.55, 2.6, 5) });
    refs.links.push({ L, g: R.addGroup(m, { pass: 'opaque', tag: 'dyn' }) });
  }
  return refs;
}

// ---------------------------------------------------------------- outposts: Procurement Yard and Commerce Hub
function outposts(R, reg) {
  for (const o of OUTPOST_DEFS) {
    const base = polar(o.deg, o.r), bx = base[0], bz = base[2], face = Math.atan2(bz, bx) + Math.PI, col = hex(GROUPS[o.group].color);
    const L = (x, z, y = 0) => { const [dx, dz] = rot2(x, z, face); return [bx + dx, y, bz + dz]; };
    const solid = new Mesh(), glass = new Mesh(), glow = new Mesh(), spin = new Mesh(), yellow = { col: hex('#e0a92e'), mat: mt(0.5, 0.35, 0, 0) };
    box(solid, [bx, 0.04, bz], 1.6, 0.08, 1.25, face, { col: hex('#a7a196'), mat: mt(0.85, 0, 0, 2) });
    tube(solid, [[-0.8, -0.625], [0.8, -0.625], [0.8, 0.625], [-0.8, 0.625], [-0.8, -0.625]].map(([x, z]) => L(x, z, 0.09)), 0.016, 4, { col, mat: mt(0.4, 0, 1.7, 11) });
    // light mast
    const mp = L(-0.72, 0.56); lathe(solid, [[0.02, 0.08], [0.015, 1.25]], 8, { cx: mp[0], cz: mp[2], col: hex('#2a2e35'), mat: mt(0.4, 0.8, 0, 0) });
    box(solid, [mp[0], 1.27, mp[2]], 0.12, 0.04, 0.06, face, { col: hex('#fff0cc'), mat: mt(0.3, 0, 3, 11) });
    if (o.k === 'procure') {
      const C = ['#1f5f8b', '#a8392e', '#2f6e4a', '#c98a2b', '#6b7480', '#24507a', '#8a2f4f', '#3f7f7a'];
      const slots = [[-0.42, -0.36, 0], [-0.42, -0.08, 0], [-0.42, 0.2, 0], [0.2, -0.36, 0], [0.2, -0.08, 0], [-0.42, -0.36, 1], [-0.42, -0.08, 1], [0.2, -0.36, 1], [0.2, 0.3, 0]];
      slots.forEach(([x, z, lv], i) => {
        const c = L(x, z, 0.08 + 0.13 + lv * 0.26), cc = hex(C[i % C.length]);
        box(solid, c, 0.25, 0.26, 0.6, face, { col: cc, mat: mt(0.55, 0.35, 0, 0) });
        for (let r = -4; r <= 4; r++) box(solid, L(x + 0.126, z + r * 0.065, c[1]), 0.006, 0.24, 0.02, face, { col: cc.map((q) => q * 0.7), mat: mt(0.6, 0.3, 0, 0) });   // corrugation
        box(solid, L(x, z - 0.302, c[1]), 0.23, 0.24, 0.008, face, { col: cc.map((q) => q * 0.55), mat: mt(0.6, 0.3, 0, 0) });                                    // doors
      });
      // straddle gantry over the stacks
      for (const [x, z] of [[-0.7, -0.6], [-0.7, 0.42], [0.48, -0.6], [0.48, 0.42]]) tube(solid, [L(x, z, 0.08), L(x, z, 0.95)], 0.022, 6, yellow);
      for (const z of [-0.6, 0.42]) tube(solid, [L(-0.7, z, 0.95), L(0.48, z, 0.95)], 0.026, 6, yellow);
      for (const x of [-0.7, 0.48]) tube(solid, [L(x, -0.6, 0.95), L(x, 0.42, 0.95)], 0.02, 6, yellow);
      box(solid, L(-0.12, -0.1, 0.92), 0.16, 0.08, 1.06, face, yellow);
      tube(solid, [L(-0.12, -0.1, 0.9), L(-0.12, -0.1, 0.72)], 0.006, 4, { col: hex('#222222'), mat: mt(0.5, 0.6, 0, 0) });
      box(solid, L(-0.12, -0.1, 0.7), 0.06, 0.04, 0.12, face, yellow);
    } else {
      // parcel hub: warehouse, roof lights, loading doors, parcels, a van and a delivery drone circling the roof
      box(solid, L(-0.12, 0, 0.29), 0.95, 0.42, 0.78, face, { col: hex('#dcd6ca'), mat: mt(0.8, 0, 0, 2) });
      box(solid, L(-0.12, 0, 0.515), 1.0, 0.03, 0.83, face, { col: hex('#3a3f46'), mat: mt(0.5, 0.5, 0, 0) });
      for (const z of [-0.24, 0, 0.24]) card(glass, L(-0.12, z, 0.54), V.mul([Math.cos(face), 0, Math.sin(face)], 0.4), [0, 0.012, 0], { col: [0.75, 0.9, 1, 0.5], mat: mt(0.05, 0, 0.4, 3) }, [0, 1, 0]);
      for (const z of [-0.24, 0, 0.24]) {
        box(solid, L(0.357, z, 0.22), 0.012, 0.26, 0.17, face, { col: hex('#4a4f57'), mat: mt(0.5, 0.6, 0, 0) });
        box(solid, L(0.362, z, 0.37), 0.01, 0.02, 0.17, face, { col: hex('#ffb35c'), mat: mt(0.3, 0, 2.2, 11) });
      }
      const rnd = rng(9);
      for (let i = 0; i < 8; i++) { const s = 0.07 + rnd() * 0.05; box(solid, L(0.5 + (i % 3) * 0.1 - 0.1, 0.3 + Math.floor(i / 3) * 0.02, 0.08 + s / 2 + (i > 4 ? 0.09 : 0)), s, s, s * 1.2, face + rnd() * 0.5, { col: hex('#b48a5a'), mat: mt(0.95, 0, 0, 0) }); }
      // van
      box(solid, L(0.5, -0.42, 0.2), 0.36, 0.17, 0.16, face + Math.PI / 2, { col: hex('#f2f2f0'), mat: mt(0.35, 0.2, 0, 0) });
      box(solid, L(0.5, -0.24, 0.17), 0.14, 0.12, 0.155, face + Math.PI / 2, { col: hex('#f2f2f0'), mat: mt(0.35, 0.2, 0, 0) });
      for (const [x, z] of [[0.43, -0.53], [0.57, -0.53], [0.43, -0.25], [0.57, -0.25]]) { const p = L(x, z, 0.1); sphere(solid, p, 0.035, 6, { col: hex('#1a1a1a'), mat: mt(0.9, 0, 0, 0) }); }
      // roof pad and drone (kind 13 orbits the pivot stored in uv)
      const pad = L(-0.12, 0, 0.535); lathe(solid, [[0, 0.535], [0.17, 0.535], [0.17, 0.545], [0, 0.545]], 24, { cx: pad[0], cz: pad[2], col: hex('#2b2f36'), mat: mt(0.6, 0.3, 0, 0) });
      tube(solid, circlePts(0.15, 0.55, 32, pad[0], pad[2]), 0.008, 4, { col, mat: mt(0.4, 0, 2, 11) });
      const dr = 0.42, dc = [pad[0] + Math.cos(face) * dr, 1.02, pad[2] + Math.sin(face) * dr];
      const S = (m) => ({ col: [...hex(m.c), 0.65], mat: mt(m.r ?? 0.4, m.m ?? 0.5, m.e ?? 0, 13) }), pv = [pad[0], pad[2]];
      const dv = (p, n, c, m) => spin.vert(p, n, c, m, pv);
      const sbox = (c, sx, sy, sz, o) => { const tmp = new Mesh(); box(tmp, c, sx, sy, sz, face, o); for (let i = 0; i < tmp.n; i++) { const q = tmp.v.slice(i * 16, i * 16 + 16); dv([q[0], q[1], q[2]], [q[3], q[4], q[5]], [q[6], q[7], q[8], q[9]], [q[10], q[11], q[12], q[13]]); } const off = spin.n - tmp.n; for (const ix of tmp.idx) spin.idx.push(ix + off); };
      sbox(dc, 0.08, 0.03, 0.08, S({ c: '#2a2e35' }));
      for (const [ax, az] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { sbox([dc[0] + ax * 0.06, dc[1] + 0.012, dc[2] + az * 0.06], 0.07, 0.006, 0.07, S({ c: '#8c939c', m: 0.2 })); }
      sbox([dc[0], dc[1] - 0.03, dc[2]], 0.05, 0.04, 0.05, S({ c: '#b48a5a', r: 0.95, m: 0 }));
      sbox([dc[0], dc[1] + 0.02, dc[2]], 0.02, 0.012, 0.02, S({ c: '#7dfcff', e: 3 }));
    }
    const top = modTopY(o); lathe(glow, [[0.07, top + 0.1], [0.012, top + 2.6]], 10, { cx: bx, cz: bz, col, mat: mt(1, 0, 0.5, 8) });
    reg.modules[o.k] = [R.addGroup(solid, { pass: 'opaque', shadow: true, tag: 'static' }), R.addGroup(glass, { pass: 'glass', center: [bx, 0.5, bz], tag: 'static' }), R.addGroup(glow, { pass: 'additive', tag: 'static' }), R.addGroup(spin, { pass: 'opaque', tag: 'static' })].filter(Boolean);
    for (const to of o.also) {
      const t = ALL_DEFS.find((x) => x.k === to); if (!t) continue;
      const a = polar(o.deg, o.r - 0.7, 0.07), b = polar(t.deg, t.r, 0.07), mid = V.lerp(a, b, 0.5); mid[0] *= 0.82; mid[2] *= 0.82;
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, w = 1 - u; pts.push([w * w * a[0] + 2 * w * u * mid[0] + u * u * b[0], 0.07, w * w * a[2] + 2 * w * u * mid[2] + u * u * b[2]]); }
      const mm = new Mesh(); tube(mm, pts, 0.04, 5, { col, mat: mt(0.5, 0.25, 1.4, 5) });
      reg.myc.push({ from: o.k, to, g: R.addGroup(mm, { pass: 'opaque', tag: 'static' }) });
    }
  }
}

// ---------------------------------------------------------------- perks that grow with the empire level
/** A skyscraper with a lit curtain-wall facade (kind 9) whose window cells are sized in world units. */
function skyscraper(m, cx, cz, w, d, h, rot, y0, seed, col) {
  const ca = Math.cos(rot), sa = Math.sin(rot), P = (x, z, y) => [cx + x * ca - z * sa, y, cz + x * sa + z * ca];
  const hw = w / 2, hd = d / 2, sides = [[[-hw, -hd], [hw, -hd], [0, -1], w], [[hw, -hd], [hw, hd], [1, 0], d], [[hw, hd], [-hw, hd], [0, 1], w], [[-hw, hd], [-hw, -hd], [-1, 0], d]];
  const fm = mt(0.05, seed, 0, 9);
  for (const [a, b, n, len] of sides) {
    const nn = [n[0] * ca - n[1] * sa, 0, n[0] * sa + n[1] * ca], cu = Math.max(2, Math.round(len / 0.34)), cv = Math.max(3, Math.round(h / 0.42));
    const ids = [P(a[0], a[1], y0), P(b[0], b[1], y0), P(b[0], b[1], y0 + h), P(a[0], a[1], y0 + h)].map((p, i) => m.vert(p, nn, col, fm, [i === 1 || i === 2 ? cu : 0, i >= 2 ? cv : 0]));
    m.quad(ids[0], ids[1], ids[2], ids[3]);
  }
  box(m, [cx, y0 + h + 0.06, cz], w * 1.02, 0.12, d * 1.02, rot, { col: hex('#22262c'), mat: mt(0.6, 0.4, 0, 0) });
}

export const SKYLINE = [0, 6, 11, 17, 25, 34, 46, 60];
export function buildPerks(R, level) {
  R.removeTag('perk');
  const refs = { skyline: null, blink: null, crane: null };
  // skyline: the empire's city on the horizon
  const n = SKYLINE[Math.max(0, Math.min(SKYLINE.length - 1, level - 1))], sky = new Mesh(), blink = new Mesh(), rnd = rng(101), placed = [];
  const tones = ['#7f9bb8', '#9aa8b6', '#6f8aa6', '#b7c2cc', '#8fa6a0', '#a59b8a'];
  let guard = 0;
  while (placed.length < n && guard++ < 2000) {
    const behind = placed.length % 4 !== 3, deg = behind ? 120 + rnd() * 200 : rnd() * 360, r = 30 + rnd() * 26, p = polar(deg, r);
    if (placed.some((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) < 3.2)) continue;
    placed.push(p);
    const k = placed.length, landmark = level >= 5 && k === 1, h = landmark ? 20 : 4 + rnd() * (6 + level * 1.1), w = landmark ? 2.4 : 1.2 + rnd() * 1.6, d = landmark ? 2.4 : 1.2 + rnd() * 1.6, y0 = -3.8;
    skyscraper(sky, p[0], p[2], w, d, h, rnd() * Math.PI, y0, k, hex(tones[k % tones.length]));
    if (h > 9) { lathe(sky, [[0.06, y0 + h + 0.12], [0.01, y0 + h + (landmark ? 5 : 1.4)]], 6, { cx: p[0], cz: p[2], col: hex('#40454d'), mat: mt(0.4, 0.8, 0, 0) }); sphere(blink, [p[0], y0 + h + (landmark ? 5 : 1.4), p[2]], landmark ? 0.25 : 0.16, 6, { col: hex('#ff3b30'), mat: mt(0.3, 0, 4, 12) }); }
  }
  refs.skyline = R.addGroup(sky, { pass: 'opaque', tag: 'perk' });
  // aviation warning lights: crown always, pavilion spires from level 3
  sphere(blink, [0, TOP + 3.38, 0], 0.07, 8, { col: hex('#ff3b30'), mat: mt(0.3, 0, 4, 12) });
  if (level >= 3) for (const m of ALL_DEFS) { const b = polar(m.deg, m.r); sphere(blink, [b[0], modTopY(m) + (m.group === 'knowledge' ? 0.15 : 0.05), b[2]], 0.05, 6, { col: hex('#ff3b30'), mat: mt(0.3, 0, 3.6, 12) }); }
  // the tower crane stays on site until the tower is complete (level 8)
  if (level < LEVEL_DONE) {
    const crane = new Mesh(), jib = new Mesh(), Y = { col: hex('#e0a92e'), mat: mt(0.5, 0.35, 0, 0) }, mp = polar(206, 3.74), top = TOP + 4.3, hw = 0.1;
    const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [mp[0] + a * hw, mp[2] + b * hw]);
    for (const [x, z] of corners) tube(crane, [[x, 0, z], [x, top, z]], 0.014, 4, Y);
    for (let y = 0, i = 0; y < top - 0.3; y += 0.3, i++) for (let f = 0; f < 4; f++) { const A = corners[f], Bc = corners[(f + 1) % 4], up = i % 2; tube(crane, [[A[0], y + (up ? 0 : 0.3), A[1]], [Bc[0], y + (up ? 0.3 : 0), Bc[1]]], 0.008, 3, Y); }
    box(crane, [mp[0], 0.05, mp[2]], 0.5, 0.1, 0.5, 0, { col: hex('#7d7a72'), mat: mt(0.9, 0, 0, 2) });
    sphere(blink, [mp[0], top + 0.95, mp[2]], 0.05, 6, { col: hex('#ff3b30'), mat: mt(0.3, 0, 4, 12) });
    // slewing part: built along +dir, rotated in the vertex shader about the mast
    const dir = V.norm([-mp[0], 0, -mp[2]]), side = [-dir[2], 0, dir[0]], pv = [mp[0], mp[2]];
    const at = (s, y, o = 0) => [mp[0] + dir[0] * s + side[0] * o, y, mp[2] + dir[2] * s + side[2] * o];
    const tmp = new Mesh(), Ys = { col: [...hex('#e0a92e'), 0.035], mat: mt(0.5, 0.35, 0, 13) };
    const jl = 5.2, cj = 1.7, y0 = top + 0.05, y1 = top + 0.32;
    for (const o of [-0.08, 0.08]) tube(tmp, [at(-cj, y0, o), at(jl, y0, o)], 0.014, 4, Ys);
    tube(tmp, [at(-cj, y1, 0), at(jl, y1 - 0.12, 0)], 0.014, 4, Ys);
    for (let s = -cj, i = 0; s < jl - 0.2; s += 0.32, i++) { const o = i % 2 ? 0.08 : -0.08; tube(tmp, [at(s, y0, o), at(s + 0.32, y1 - 0.12 * ((s + 0.32 + cj) / (jl + cj)), 0)], 0.007, 3, Ys); }
    tube(tmp, [at(0, top, 0), at(0, top + 0.95, 0)], 0.02, 4, Ys);                                              // cat head
    tube(tmp, [at(0, top + 0.95, 0), at(jl * 0.7, y1 - 0.1, 0)], 0.006, 3, Ys); tube(tmp, [at(0, top + 0.95, 0), at(-cj, y1, 0)], 0.006, 3, Ys);
    box(tmp, at(-cj + 0.3, y0 - 0.12, 0), 0.5, 0.3, 0.32, Math.atan2(dir[2], dir[0]), { col: [...hex('#8d8a82'), 0.035], mat: mt(0.9, 0, 0, 13) });   // counterweight
    box(tmp, at(0.18, top - 0.12, 0.14), 0.22, 0.2, 0.16, Math.atan2(dir[2], dir[0]), { col: [...hex('#e8e4da'), 0.035], mat: mt(0.4, 0.2, 0, 13) });   // cab
    const tr = 3.1; box(tmp, at(tr, y0 - 0.04, 0), 0.16, 0.06, 0.2, Math.atan2(dir[2], dir[0]), Ys);
    tube(tmp, [at(tr, y0 - 0.06, 0), at(tr, y0 - 2.6, 0)], 0.004, 3, { col: [0.12, 0.12, 0.12, 0.035], mat: mt(0.5, 0.6, 0, 13) });
    box(tmp, at(tr, y0 - 2.68, 0), 0.08, 0.12, 0.06, 0, { col: [...hex('#d23b2a'), 0.035], mat: mt(0.4, 0.2, 0, 13) });
    sphere(tmp, at(jl, y0, 0), 0.045, 6, { col: [...hex('#ff3b30'), 0.035], mat: mt(0.3, 0, 3.2, 13) });
    for (let i = 0; i < tmp.n; i++) { const q = tmp.v.slice(i * 16, i * 16 + 16); jib.vert([q[0], q[1], q[2]], [q[3], q[4], q[5]], [q[6], q[7], q[8], q[9]], [q[10], q[11], q[12], q[13]], pv); }
    jib.idx = tmp.idx.slice();
    refs.crane = [R.addGroup(crane, { pass: 'opaque', shadow: true, tag: 'perk' }), R.addGroup(jib, { pass: 'opaque', tag: 'perk' })];
  }
  refs.blink = R.addGroup(blink, { pass: 'opaque', tag: 'perk' });
  return refs;
}
export const LEVEL_DONE = 8;

// ---------------------------------------------------------------- attention beacons
export const SEV_COLOR = { 3: '#ff4d4d', 2: '#ffb547', 1: '#7fb2ff', 0: '#4fe39a' };
/** items: [{ kind: 'module'|'stage'|'venture', id, sev, pos?, r? }] */
export function buildBeacons(R, items) {
  R.removeTag('beacon');
  const out = [];
  for (const it of items) {
    const m = new Mesh(), add = new Mesh(), col = hex(SEV_COLOR[it.sev] || SEV_COLOR[1]);
    const em = mt(0.3, 0, 2.8, 11);
    const diamond = (c, s) => { frustum(m, c[0], c[2], 0.001, s, 4, c[1] - s * 1.3, c[1], 0, { col, mat: em }); frustum(m, c[0], c[2], s, 0.001, 4, c[1], c[1] + s * 1.3, 0, { col, mat: em }); };
    if (it.kind === 'module') {
      const d = ALL_DEFS.find((x) => x.k === it.id); if (!d) continue;
      const b = polar(d.deg, d.r), top = modTopY(d) + (d.group === 'knowledge' ? 0.75 : 0.65);
      diamond([b[0], top, b[2]], 0.13);
      tube(m, circlePts(d.group === 'operations' ? 1.0 : 1.72, 0.12, 64, b[0], b[2]), 0.03, 5, { col, mat: mt(0.4, 0, 2.4, 5) });
      lathe(add, [[0.16, top + 0.2], [0.02, top + 3.2]], 10, { cx: b[0], cz: b[2], col, mat: mt(1, 0, 0.9, 8) });
    } else if (it.kind === 'stage') {
      const i = FLOW.indexOf(it.id), y = it.id === 'Parked' ? -0.15 : floorY(i) + 0.52, r = it.id === 'Parked' ? 1.1 : rad(y) + 0.78;
      if (it.id === 'Parked') tube(m, circlePts(VAULT_R + 0.12, VAULT_C[1], 64, 0, 0), 0.03, 5, { col, mat: mt(0.4, 0, 2.4, 5) });
      else { tube(m, circlePts(r, y, 120), 0.03, 5, { col, mat: mt(0.4, 0, 2.6, 5) }); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; diamond([Math.cos(a) * r, y + 0.22, Math.sin(a) * r], 0.06); } }
    } else if (it.kind === 'venture' && it.pos) {
      diamond([it.pos[0], it.pos[1] + 0.55, it.pos[2]], 0.07);
    }
    const g = R.addGroup(m, { pass: 'opaque', tag: 'beacon' }), ga = R.addGroup(add, { pass: 'additive', tag: 'beacon' });
    out.push({ ...it, groups: [g, ga].filter(Boolean) });
  }
  return out;
}
