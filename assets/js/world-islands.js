// world-islands.js — the wider world around The Tower: one floating island per venture, joined to the main island
// by arched sky-bridges. Each island is themed to its venture and builds itself up as the venture rises the tower:
// survey stakes at Idea, a market stall at Validate, foundations at Plan, scaffolding at Build, the finished
// building at Launch and an expansion at Scale. Ambient life (ostriches, golf carts, airships, balloons, birds)
// moves through the vertex shader's orbit kind (13), so nothing here costs a draw call per frame.
import { Mesh, box, tube, card, lathe, sphere, frustum, circlePts, V, TAU, hex, mt, rng } from './gl.js';
import { FLOW } from './gates.js';

export const ISLAND_DIST = 21, ISLAND_RAD = 4.1, RIM = 8.32, BRIDGE_END = ISLAND_DIST - ISLAND_RAD + 0.15;
const SLOT_DEG = [96, 136, 176, 216, 256, 292];

export const THEMES = {
  atelier: { title: 'Golf Atelier', blurb: 'Leather workshop and boutique, with a putting green to test every bag.', sand: 0.05, color: '#c9a54c', main: [0.5, 0.2, 2.0, 1.6] },
  course: { title: 'The Circuit Course', blurb: 'A championship hole, carts and the clubhouse where the Wednesday mornings happen.', sand: 0.0, color: '#4fb286', main: [-1.5, 2.0, 1.5, 1.1] },
  farm: { title: 'Ostrich Farm', blurb: 'Desert pens, a water hole with palms, and the farm restaurant and craft store.', sand: 0.95, color: '#e39a4f', main: [-0.5, 2.2, 1.7, 1.2] },
  port: { title: 'Trade Port', blurb: 'Container yard, gantry and the cargo airship that brings stock from the factories.', sand: 0.45, color: '#6fa0d8', main: [1.1, 0.2, 2.2, 1.6] },
  generic: { title: 'Venture Quarter', blurb: 'A plot that grows into headquarters as the venture rises.', sand: 0.2, color: '#a18ad6', main: [0.6, 0.2, 1.9, 1.5] },
};
export const BUILD_STEPS = ['Survey staked out', 'Market-test stall', 'Foundations poured', 'Under construction', 'Grand opening', 'Expansion'];

export function themeOf(v) {
  const t = `${v.id} ${v.name} ${v.summary || ''}`.toLowerCase();
  if (/ostrich|farm/.test(t)) return 'farm';
  if (/circuit|network|event|tee time/.test(t)) return 'course';
  if (/amazon|store|e-?commerce|trade|china/.test(t)) return 'port';
  if (/golf|bag|leather|atelier/.test(t)) return 'atelier';
  return 'generic';
}
/** One island per venture (first six), in a stable order so islands never swap places when stages change. */
export function islandSlots(s) {
  return (s.ventures || []).slice(0, SLOT_DEG.length).map((v, i) => {
    const deg = SLOT_DEG[i], a = (deg * Math.PI) / 180;
    return { k: `v:${v.id}`, v, id: v.id, theme: themeOf(v), deg, a, c: [Math.cos(a) * ISLAND_DIST, 0, Math.sin(a) * ISLAND_DIST], level: v.stage === 'Parked' ? -1 : FLOW.indexOf(v.stage), label: v.name };
  });
}
export const bridgeY = (r) => (r > RIM && r < BRIDGE_END ? 0.12 + Math.sin(((r - RIM) / (BRIDGE_END - RIM)) * Math.PI) * 0.75 : null);

// ---------------------------------------------------------------- small helpers
function blob(m, c, r, o, seg = 10) {
  const t = new Mesh(); sphere(t, [0, 0, 0], 1, seg, o);
  for (let i = 0; i < t.n; i++) { const k = i * 16, d = [t.v[k], t.v[k + 1], t.v[k + 2]], n = V.norm([d[0] / r[0], d[1] / r[1], d[2] / r[2]]); t.v[k] = c[0] + d[0] * r[0]; t.v[k + 1] = c[1] + d[1] * r[1]; t.v[k + 2] = c[2] + d[2] * r[2]; t.v[k + 3] = n[0]; t.v[k + 4] = n[1]; t.v[k + 5] = n[2]; }
  merge(m, t);
}
function merge(m, t) { const off = m.n; for (let i = 0; i < t.v.length; i++) m.v.push(t.v[i]); m.n += t.n; for (const ix of t.idx) m.idx.push(ix + off); }
/** Copy a model built at the origin (facing +z) into dst: rotate by yaw, move to pos, and make it orbit pivot at speed sp (kind 13). */
function placeMover(dst, src, pos, yaw, pivot, sp) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let i = 0; i < src.n; i++) {
    const k = i * 16, x = src.v[k], y = src.v[k + 1], z = src.v[k + 2], nx = src.v[k + 3], nz = src.v[k + 5];
    dst.vert([pos[0] + x * c + z * s, pos[1] + y, pos[2] - x * s + z * c], [nx * c + nz * s, src.v[k + 4], -nx * s + nz * c], [src.v[k + 6], src.v[k + 7], src.v[k + 8], sp], [src.v[k + 10], src.v[k + 11], src.v[k + 12], 13], pivot);
  }
  const off = dst.n - src.n; for (const ix of src.idx) dst.idx.push(ix + off);
}
function disc(m, c, r, y, o, seg = 40, rings = 4, sx = 1, sz = 1, rot = 0) {
  const ids = [], ca = Math.cos(rot), sa = Math.sin(rot);
  for (let j = 0; j <= rings; j++) for (let i = 0; i <= seg; i++) {
    const rr = (r * j) / rings, a = (i / seg) * TAU, lx = Math.cos(a) * rr * sx, lz = Math.sin(a) * rr * sz;
    ids.push(m.vert([c[0] + lx * ca - lz * sa, y, c[2] + lx * sa + lz * ca], [0, 1, 0], o.col, o.mat, [lx, lz]));
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) { const a = ids[j * (seg + 1) + i]; m.quad(a, a + seg + 1, a + seg + 2, a + 1); }
}
const C = (h, k = 1) => hex(h).map((x) => x * k);
const MAT = { stone: mt(0.85, 0, 0, 2), paint: mt(0.7, 0, 0, 0), metal: mt(0.4, 0.8, 0, 0), wood: mt(0.85, 0, 0, 0), glow: (e) => mt(0.3, 0, e, 11), glass: mt(0.05, 0, 0.35, 3) };

// ---------------------------------------------------------------- builders
function tree(m, p, rnd, kind = 'palm') {
  const h = 0.9 + rnd() * 0.7;
  if (kind === 'palm') {
    tube(m, [p, [p[0] + 0.05, p[1] + h * 0.5, p[2] + 0.04], [p[0] + 0.12, p[1] + h, p[2] + 0.06]], 0.045, 6, { col: C('#7a5a3c'), mat: MAT.wood });
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + rnd(), tip = [p[0] + 0.12 + Math.cos(a) * 0.55, p[1] + h - 0.18, p[2] + 0.06 + Math.sin(a) * 0.55]; tube(m, [[p[0] + 0.12, p[1] + h, p[2] + 0.06], [p[0] + 0.12 + Math.cos(a) * 0.3, p[1] + h + 0.08, p[2] + 0.06 + Math.sin(a) * 0.3], tip], 0.05, 3, { col: C('#3f7a2e', 0.9 + rnd() * 0.25), mat: mt(0.8, 0, 0.05, 0) }); }
  } else {
    tube(m, [p, [p[0], p[1] + 0.3, p[2]]], 0.04, 6, { col: C('#6b4f36'), mat: MAT.wood });
    frustum(m, p[0], p[2], 0.26, 0.02, 8, p[1] + 0.25, p[1] + 0.25 + h, 0, { col: C('#2f5e2a', 0.9 + rnd() * 0.2), mat: mt(0.9, 0, 0.04, 0) });
  }
}

function islandBase(solid, sl, rnd) {
  const th = THEMES[sl.theme], c = sl.c, R = ISLAND_RAD;
  disc(solid, c, R, 0, { col: [1, 1, 1], mat: mt(0.95, th.sand, 0, 14) }, 56, 6);
  lathe(solid, [[R, 0], [R, -0.45], [R * 0.82, -1.3], [R * 0.5, -2.3], [R * 0.2, -3.0], [0.05, -3.4]], 48, { cx: c[0], cz: c[2], col: C('#6b5a45'), mat: mt(1, 0, 0, 6) });
  tube(solid, circlePts(R - 0.04, 0.05, 72, c[0], c[2]), 0.06, 5, { col: C('#b6b0a2'), mat: MAT.stone });
  for (let i = 0; i < 6; i++) { const a = rnd() * TAU, r = R * (0.35 + rnd() * 0.5); blob(solid, [c[0] + Math.cos(a) * R * 0.75, -1.4 - rnd() * 1.2, c[2] + Math.sin(a) * R * 0.75], [0.3 + rnd() * 0.3, 0.25, 0.3], { col: C('#5b4c3b'), mat: mt(1, 0, 0, 0) }, 6); void r; }
}

function bridge(solid, glow, sl) {
  const a = sl.a, u = [Math.cos(a), 0, Math.sin(a)], w = [-u[2], 0, u[0]], col = C(THEMES[sl.theme].color);
  const P = (r, o, dy = 0) => [u[0] * r + w[0] * o, (bridgeY(r) ?? 0.12) + dy, u[2] * r + w[2] * o];
  const N = 24;
  for (let i = 0; i < N; i++) {
    const r0 = RIM + ((BRIDGE_END - RIM) * i) / N, r1 = RIM + ((BRIDGE_END - RIM) * (i + 1)) / N, rm = (r0 + r1) / 2;
    const p0 = P(r0, 0), p1 = P(r1, 0), len = V.len(V.sub(p1, p0));
    box(solid, [u[0] * rm, (p0[1] + p1[1]) / 2 - 0.05, u[2] * rm], len + 0.02, 0.07, 0.62, a, { col: C('#d8d2c4'), mat: MAT.stone });
  }
  for (const o of [-0.3, 0.3]) {
    const rail = [], base = [];
    for (let i = 0; i <= N; i++) { const r = RIM + ((BRIDGE_END - RIM) * i) / N; rail.push(P(r, o, 0.34)); base.push(P(r, o, 0.02)); }
    tube(glow, rail, 0.018, 5, { col, mat: mt(0.4, 0, 1.6, 11) });
    for (let i = 0; i <= N; i += 3) tube(solid, [base[i], rail[i]], 0.012, 4, { col: C('#3a3f46'), mat: MAT.metal });
  }
  // a gateway arch where the bridge lands on the island
  const g = []; for (let i = 0; i <= 18; i++) { const t = (i / 18) * Math.PI; g.push([u[0] * (BRIDGE_END + 0.2) + w[0] * Math.cos(t) * 0.42, 0.02 + Math.sin(t) * 0.95, u[2] * (BRIDGE_END + 0.2) + w[2] * Math.cos(t) * 0.42]); }
  tube(glow, g, 0.035, 6, { col, mat: mt(0.4, 0, 1.4, 11) });
}

/** Local frame on an island: x points away from the tower, z is tangential. */
function frame(sl) {
  const u = [Math.cos(sl.a), 0, Math.sin(sl.a)], w = [-u[2], 0, u[0]];
  return { L: (x, z, y = 0) => [sl.c[0] + u[0] * x + w[0] * z, y, sl.c[2] + u[2] * x + w[2] * z], rot: sl.a, u, w };
}

function construction(solid, glow, sl, F, rnd) {
  const th = THEMES[sl.theme], [mx, mz, mw, md] = th.main, lv = sl.level, L = F.L, col = C(th.color);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [mx + (a * mw) / 2, mz + (b * md) / 2]);
  // sign post at the gateway
  const sp = L(-ISLAND_RAD + 0.75, 0.75); tube(solid, [sp, [sp[0], 0.75, sp[2]]], 0.025, 5, { col: C('#5b4632'), mat: MAT.wood });
  box(solid, [sp[0], 0.72, sp[2]], 0.04, 0.24, 0.5, F.rot, { col, mat: MAT.glow(0.6) });
  if (lv < 0) {                                    // parked: an overgrown plot, waiting in the seed vault
    box(solid, L(mx, mz, 0.05), mw, 0.1, md, F.rot, { col: C('#8d877b', 0.8), mat: MAT.stone });
    for (let i = 0; i < 9; i++) blob(solid, L(mx + (rnd() - 0.5) * mw, mz + (rnd() - 0.5) * md, 0.12), [0.18 + rnd() * 0.15, 0.12, 0.18 + rnd() * 0.15], { col: C('#3d5e2c', 0.8 + rnd() * 0.3), mat: mt(0.95, 0, 0, 0) }, 6);
    return;
  }
  if (lv <= 2) {                                    // survey: stakes and string lines
    corners.forEach(([x, z]) => { const p = L(x, z); tube(solid, [p, [p[0], 0.32, p[2]]], 0.014, 4, { col: C('#d8c39a'), mat: MAT.wood }); box(solid, [p[0], 0.3, p[2]], 0.04, 0.04, 0.04, 0, { col: C('#ff7a1a'), mat: MAT.glow(0.8) }); });
    tube(solid, [...corners, corners[0]].map(([x, z]) => L(x, z, 0.2)), 0.004, 3, { col: C('#f4f4f2'), mat: MAT.paint });
    const tp = L(mx - mw / 2 - 0.5, mz + md / 2 + 0.4); for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; tube(solid, [[tp[0] + Math.cos(a) * 0.12, 0, tp[2] + Math.sin(a) * 0.12], [tp[0], 0.42, tp[2]]], 0.008, 3, { col: C('#d8b23c'), mat: MAT.paint }); }
    box(solid, [tp[0], 0.46, tp[2]], 0.08, 0.06, 0.1, F.rot, { col: C('#2a2e35'), mat: MAT.metal });
  }
  if (lv >= 1) {                                    // market-test stall
    const sx = mx - mw / 2 - 0.9, sz = mz - md / 2 - 0.6;
    for (const [a, b] of [[-0.35, -0.25], [0.35, -0.25], [-0.35, 0.25], [0.35, 0.25]]) { const p = L(sx + a, sz + b); tube(solid, [p, [p[0], 0.62, p[2]]], 0.014, 4, { col: C('#e8e4da'), mat: MAT.paint }); }
    for (let i = 0; i < 6; i++) box(solid, L(sx - 0.375 + i * 0.125 + 0.0625, sz, 0.66), 0.125, 0.03, 0.62, F.rot, { col: i % 2 ? C('#f4f4f2') : col, mat: MAT.paint });
    box(solid, L(sx, sz, 0.27), 0.7, 0.04, 0.3, F.rot, { col: C('#8a6a48'), mat: MAT.wood });
    for (let i = 0; i < 4; i++) box(solid, L(sx - 0.25 + i * 0.16, sz, 0.32), 0.08, 0.07, 0.08, F.rot + rnd(), { col: C(['#b48a5a', '#d9667a', '#7fb2e5', '#c9a54c'][i]), mat: MAT.paint });
  }
  if (lv >= 2) box(solid, L(mx, mz, 0.06), mw + 0.2, 0.12, md + 0.2, F.rot, { col: C('#b8b2a6'), mat: MAT.stone });   // foundations
  if (lv === 2) { const bp = L(mx - mw / 2 - 0.5, mz + md / 2 + 0.4); box(solid, [bp[0], 0.38, bp[2]], 0.5, 0.03, 0.34, F.rot, { col: C('#2f5fa8'), mat: MAT.glow(0.35) }); for (const [a, b] of [[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.13], [0.2, 0.13]]) { const p = L(mx - mw / 2 - 0.5 + a, mz + md / 2 + 0.4 + b); tube(solid, [p, [p[0], 0.37, p[2]]], 0.01, 3, { col: C('#5b4632'), mat: MAT.wood }); } }
  if (lv === 3) {                                   // construction: half walls and scaffolding
    const h = 0.55;
    box(solid, L(mx - mw / 2, mz, 0.12 + h / 2), 0.08, h, md, F.rot, { col: C('#cfc8ba'), mat: MAT.stone });
    box(solid, L(mx + mw / 2, mz, 0.12 + h / 2), 0.08, h, md, F.rot, { col: C('#cfc8ba'), mat: MAT.stone });
    box(solid, L(mx, mz - md / 2, 0.12 + h / 2), mw, h, 0.08, F.rot, { col: C('#cfc8ba'), mat: MAT.stone });
    const sc = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [mx + (a * (mw + 0.3)) / 2, mz + (b * (md + 0.3)) / 2]);
    for (const [x, z] of sc) tube(solid, [L(x, z), L(x, z, 1.1)], 0.012, 4, { col: C('#e0a92e'), mat: MAT.metal });
    for (const y of [0.4, 0.75, 1.1]) tube(solid, [...sc, sc[0]].map(([x, z]) => L(x, z, y)), 0.01, 4, { col: C('#e0a92e'), mat: MAT.metal });
    for (let i = 0; i < 3; i++) box(solid, L(mx + mw / 2 + 0.55, mz - 0.4 + i * 0.4, 0.06 + i * 0.0), 0.3, 0.12, 0.3, F.rot, { col: C('#a07850'), mat: MAT.wood });
  }
}

function mainBuilding(solid, glass, sl, F, rnd, scale = 1, dz = 0) {
  const th = THEMES[sl.theme], [mx, mz0, mw0, md0] = th.main, L = F.L, mz = mz0 + dz, mw = mw0 * scale, md = md0 * scale, col = C(th.color);
  const wall = { atelier: '#efe6d4', course: '#f4f2ec', farm: '#c9a46a', port: '#8d96a0', generic: '#e8eaee' }[sl.theme];
  const h = { atelier: 0.85, course: 0.7, farm: 0.62, port: 1.0, generic: 1.25 }[sl.theme] * (scale < 1 ? 0.85 : 1);
  box(solid, L(mx, mz, 0.12 + h / 2), mw, h, md, F.rot, { col: C(wall), mat: MAT.stone });
  // roof
  if (sl.theme === 'course' || sl.theme === 'farm') frustum(solid, ...((p) => [p[0], p[2]])(L(mx, mz)), (Math.max(mw, md) / 2) * 1.35, 0.05, 4, 0.12 + h, 0.12 + h + 0.45, F.rot + Math.PI / 4, { col: C(sl.theme === 'farm' ? '#8a5a32' : '#3a4a3f'), mat: mt(0.8, 0, 0, 0) });
  else box(solid, L(mx, mz, 0.12 + h + 0.03), mw + 0.08, 0.06, md + 0.08, F.rot, { col: C('#2a2e35'), mat: MAT.metal });
  // glazing on the face toward the bridge
  card(glass, L(mx - mw / 2 - 0.006, mz, 0.12 + h * 0.45), F.w.map((x) => (x * md * 0.42)), [0, h * 0.34, 0], { col: [0.8, 0.92, 1, 0.5], mat: MAT.glass }, F.u.map((x) => -x));
  box(solid, L(mx - mw / 2 - 0.01, mz, 0.12 + h * 0.86), 0.02, 0.05, md * 0.88, F.rot, { col, mat: MAT.glow(1.6) });
  if (sl.theme === 'atelier') { box(solid, L(mx - mw / 2 - 0.22, mz, 0.12 + h * 0.8), 0.44, 0.03, md * 0.7, F.rot, { col: C('#1f4d3a'), mat: MAT.paint }); }
  if (sl.theme === 'port') { box(solid, L(mx, mz - md / 2 - 0.006, 0.12 + h * 0.4), mw * 0.5, h * 0.8, 0.02, F.rot, { col: C('#4a4f57'), mat: MAT.metal }); }
  // flag
  const fp = L(mx - mw / 2 - 0.3, mz + md / 2 + 0.2); tube(solid, [fp, [fp[0], 1.55, fp[2]]], 0.012, 5, { col: C('#d8dce2'), mat: MAT.metal });
  card(glass, [fp[0] + F.w[0] * 0.17, 1.42, fp[2] + F.w[2] * 0.17], F.w.map((x) => x * 0.17), [0, 0.1, 0], { col: [...col, 1], mat: MAT.glow(0.9) }, F.u);
  void rnd;
}

function themed(solid, movers, glass, sl, F, rnd) {
  const lv = sl.level, L = F.L, th = THEMES[sl.theme], pv = [sl.c[0], sl.c[2]];
  if (sl.theme === 'atelier') {
    // putting green to test the bags, from Validate
    if (lv >= 1) { const g = L(-1.3, 2.0, 0.03); disc(solid, g, 0.95, 0.03, { col: C('#3f9a45'), mat: mt(0.9, 0, 0, 0) }, 32, 3); disc(solid, L(-1.1, 2.15), 0.05, 0.035, { col: C('#111'), mat: MAT.paint }, 12, 1); const fp = L(-1.1, 2.15); tube(solid, [fp, [fp[0], 0.6, fp[2]]], 0.01, 4, { col: C('#f4f4f2'), mat: MAT.paint }); card(glass, [fp[0] + F.w[0] * 0.1, 0.54, fp[2] + F.w[2] * 0.1], F.w.map((x) => x * 0.1), [0, 0.06, 0], { col: [...C('#c9a54c'), 1], mat: MAT.glow(0.8) }, F.u); }
    // display bags outside the boutique
    if (lv >= 4) for (let i = 0; i < 3; i++) { const p = L(-0.75, -0.55 + i * 0.5); tube(solid, [[p[0], 0.05, p[2]], [p[0] + 0.03, 0.5, p[2]]], 0.09, 10, { col: C(i === 1 ? '#d8cfb8' : '#8a5a32'), mat: mt(0.6, 0.05, 0.05, 0) }); for (let k = 0; k < 3; k++) blob(solid, [p[0] + 0.03 + (k - 1) * 0.04, 0.6, p[2]], [0.03, 0.04, 0.025], { col: C('#c0c4c8'), mat: MAT.metal }, 5); }
  }
  if (sl.theme === 'course') {
    disc(solid, L(0.6, -0.4, 0.025), 2.9, 0.025, { col: C('#4c9a3c'), mat: mt(0.9, 0, 0, 0) }, 40, 3, 1, 0.42, F.rot + 0.35);
    disc(solid, L(2.5, 0.6, 0.03), 0.85, 0.032, { col: C('#62b650'), mat: mt(0.85, 0, 0, 0) }, 32, 3);
    for (const [x, z, r] of [[1.6, 1.4, 0.38], [2.9, -0.4, 0.32], [-0.4, -1.6, 0.42]]) disc(solid, L(x, z, 0.03), r, 0.033, { col: C('#e6d3a3'), mat: mt(0.95, 0, 0, 0) }, 24, 2, 1.3, 0.8);
    box(solid, L(-2.4, -1.4, 0.04), 0.6, 0.06, 0.5, F.rot, { col: C('#5fae4a'), mat: MAT.paint });
    const fp = L(2.6, 0.7); tube(solid, [fp, [fp[0], 0.85, fp[2]]], 0.012, 4, { col: C('#f4f4f2'), mat: MAT.paint }); card(glass, [fp[0] + F.w[0] * 0.13, 0.76, fp[2] + F.w[2] * 0.13], F.w.map((x) => x * 0.13), [0, 0.08, 0], { col: [...C('#ff3b30'), 1], mat: MAT.glow(0.8) }, F.u);
    const carts = [0, 1, 2, 3, 4, 6][Math.max(0, lv)];
    for (let i = 0; i < carts; i++) {
      const cart = new Mesh(); box(cart, [0, 0.13, 0], 0.18, 0.12, 0.3, 0, { col: C('#f4f4f2'), mat: MAT.paint }); box(cart, [0, 0.36, -0.02], 0.2, 0.02, 0.3, 0, { col: C(th.color), mat: MAT.paint });
      for (const [a, b] of [[-0.08, -0.12], [0.08, -0.12], [-0.08, 0.1], [0.08, 0.1]]) tube(cart, [[a, 0.2, b], [a, 0.35, b]], 0.006, 3, { col: C('#888'), mat: MAT.metal });
      for (const [a, b] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) blob(cart, [a, 0.05, b], [0.02, 0.045, 0.045], { col: C('#1a1a1a'), mat: mt(0.9, 0, 0, 0) }, 6);
      const ang = sl.a + (i / Math.max(1, carts)) * TAU, rr = 2.4 + (i % 2) * 0.6, pos = [sl.c[0] + Math.cos(ang) * rr, 0.02, sl.c[2] + Math.sin(ang) * rr];
      placeMover(movers, cart, pos, -ang, pv, 0.1 + 0.08 + (i % 3) * 0.02);   // forward (+z) along the orbit tangent
    }
  }
  if (sl.theme === 'farm') {
    const pen = L(1.0, -1.0), pr = 1.55;
    for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU, p = [pen[0] + Math.cos(a) * pr, 0, pen[2] + Math.sin(a) * pr]; tube(solid, [p, [p[0], 0.42, p[2]]], 0.02, 4, { col: C('#7a5a3c'), mat: MAT.wood }); }
    for (const y of [0.2, 0.38]) tube(solid, circlePts(pr, y, 56, pen[0], pen[2]), 0.012, 4, { col: C('#8a6a48'), mat: MAT.wood });
    const pond = L(-1.2, 2.2, 0.02); disc(solid, pond, 0.82, 0.022, { col: C('#d8c49a'), mat: mt(0.95, 0, 0, 0) }, 28, 2, 1.2, 0.85, F.rot); disc(solid, pond, 0.62, 0.03, { col: C('#2ea6a0'), mat: mt(0.1, 0, 0, 4) }, 28, 2, 1.2, 0.85, F.rot);
    tree(solid, L(-2.4, 1.0), rnd); tree(solid, L(-1.2, 2.3), rnd); tree(solid, L(-2.2, 2.1), rnd);
    const birds = [0, 2, 3, 5, 8, 12][Math.max(0, lv)];
    for (let i = 0; i < birds; i++) {
      const o = new Mesh(), plume = { col: C(i % 3 ? '#2a2622' : '#6b5d52'), mat: mt(0.85, 0, 0.05, 0) }, skin = { col: C('#c9a79a'), mat: mt(0.7, 0, 0.05, 0) };
      blob(o, [0, 0.46, 0], [0.13, 0.11, 0.18], plume, 10); blob(o, [0, 0.5, -0.17], [0.09, 0.06, 0.06], { col: C('#efe9e0'), mat: plume.mat }, 6);
      tube(o, [[0, 0.5, 0.12], [0, 0.72, 0.17], [0, 0.86, 0.19]], 0.022, 5, skin); blob(o, [0, 0.89, 0.21], [0.04, 0.035, 0.05], skin, 6); blob(o, [0, 0.88, 0.26], [0.012, 0.01, 0.03], { col: C('#d8b27a'), mat: MAT.paint }, 4);
      blob(o, [0.018, 0.9, 0.235], [0.009, 0.009, 0.006], { col: C('#111'), mat: MAT.paint }, 4); blob(o, [-0.018, 0.9, 0.235], [0.009, 0.009, 0.006], { col: C('#111'), mat: MAT.paint }, 4);
      for (const s of [-1, 1]) tube(o, [[s * 0.05, 0.38, 0], [s * 0.05, 0.2, 0.02], [s * 0.05, 0.02, 0.0]], 0.014, 4, skin);
      const rr = 0.45 + (i % 3) * 0.32, ang = (i / Math.max(1, birds)) * TAU + rnd(), pos = [pen[0] + Math.cos(ang) * rr, 0, pen[2] + Math.sin(ang) * rr];
      placeMover(movers, o, pos, -ang, [pen[0], pen[2]], 0.1 + 0.14 + (i % 4) * 0.035);
    }
  }
  if (sl.theme === 'port') {
    box(solid, L(0.4, 0, 0.03), 5.4, 0.06, 4.4, F.rot, { col: C('#9a958b'), mat: MAT.stone });
    const n = [2, 4, 6, 9, 12, 16][Math.max(0, lv)], CC = ['#1f5f8b', '#a8392e', '#2f6e4a', '#c98a2b', '#6b7480', '#8a2f4f'];
    for (let i = 0; i < n; i++) { const row = i % 4, col = Math.floor(i / 4) % 2, lvl = Math.floor(i / 8); box(solid, L(-1.6 + col * 0.72, 0.95 + row * 0.32, 0.06 + 0.14 + lvl * 0.28), 0.62, 0.27, 0.27, F.rot, { col: C(CC[i % CC.length]), mat: mt(0.55, 0.35, 0, 0) }); }
    if (lv >= 2) { const Y = { col: C('#e0a92e'), mat: MAT.metal }; for (const [x, z] of [[-2.1, 0.65], [-2.1, 2.25], [-0.6, 0.65], [-0.6, 2.25]]) tube(solid, [L(x, z, 0.06), L(x, z, 1.3)], 0.025, 5, Y); for (const z of [0.65, 2.25]) tube(solid, [L(-2.1, z, 1.3), L(-0.6, z, 1.3)], 0.03, 5, Y); box(solid, L(-1.35, 1.45, 1.28), 0.22, 0.1, 1.7, F.rot, Y); }
    if (lv >= 3) {
      const ship = new Mesh();
      blob(ship, [0, 0, 0], [0.42, 0.42, 1.5], { col: C('#e9ecef'), mat: mt(0.45, 0.2, 0.08, 0) }, 16);
      for (const [a, b] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) card(ship, [a * 0.32, b * 0.32, -1.25], [a * 0.25, b * 0.25, 0], [0, 0, 0.3], { col: C('#6fa0d8'), mat: MAT.paint }, [b, -a, 0]);
      box(ship, [0, -0.5, 0.1], 0.3, 0.16, 0.7, 0, { col: C('#2a2e35'), mat: MAT.metal });
      box(ship, [0, -0.95, 0.1], 0.27, 0.26, 0.6, 0, { col: C('#a8392e'), mat: mt(0.55, 0.35, 0, 0) });
      for (const s of [-1, 1]) tube(ship, [[s * 0.12, -0.58, 0.1], [s * 0.12, -0.82, 0.1]], 0.006, 3, { col: C('#333'), mat: MAT.metal });
      blob(ship, [0, -0.42, 0.75], [0.04, 0.04, 0.04], { col: C('#7dfcff'), mat: MAT.glow(3) }, 5);
      placeMover(movers, ship, [sl.c[0] + Math.cos(sl.a + 1.2) * 5.4, 3.6, sl.c[2] + Math.sin(sl.a + 1.2) * 5.4], -(sl.a + 1.2), pv, 0.1 + 0.07);
    }
  }
}

// ---------------------------------------------------------------- ambient life over the whole world
function ambient(movers, rnd) {
  const stripes = [['#d9667a', '#f4f4f2'], ['#c9a54c', '#1f3a5f'], ['#4fb286', '#f4e3b0'], ['#6fa0d8', '#f4f4f2']];
  for (let i = 0; i < 4; i++) {
    const b = new Mesh(), [c1, c2] = stripes[i];
    const prof = [[0.02, 0.0], [0.28, 0.08], [0.62, 0.55], [0.74, 1.05], [0.66, 1.5], [0.4, 1.82], [0.02, 1.92]];
    for (let k = 0; k < 12; k++) lathe(b, prof, 2, { col: C(k % 2 ? c1 : c2), mat: mt(0.7, 0, 0.12, 0), a0: (k / 12) * TAU, a1: ((k + 1) / 12) * TAU });
    box(b, [0, -0.42, 0], 0.26, 0.2, 0.26, 0, { col: C('#8a6a48'), mat: MAT.wood });
    for (const [a, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) tube(b, [[a, -0.32, z], [a * 2.2, 0.06, z * 2.2]], 0.005, 3, { col: C('#333'), mat: MAT.paint });
    blob(b, [0, -0.2, 0], [0.06, 0.08, 0.06], { col: C('#ffb35c'), mat: MAT.glow(2.5) }, 6);
    const ang = rnd() * TAU, rr = 26 + rnd() * 14;
    placeMover(movers, b, [Math.cos(ang) * rr, 9 + rnd() * 6, Math.sin(ang) * rr], 0, [0, 0], 0.1 + 0.006 + rnd() * 0.01);
  }
  for (let f = 0; f < 3; f++) {
    const ang0 = rnd() * TAU, rr = 12 + rnd() * 10, y = 6.5 + rnd() * 3;
    for (let i = 0; i < 7; i++) {
      const bird = new Mesh(), dark = { col: C('#1d1f24'), mat: mt(0.8, 0, 0, 0) };
      tube(bird, [[-0.16, 0.05, -0.03], [0, 0, 0.03], [0.16, 0.05, -0.03]], 0.012, 3, dark);
      const a = ang0 + i * 0.035 * (i % 2 ? 1 : -1), r = rr + (i % 2 ? 0.25 : -0.25) * Math.ceil(i / 2), pos = [Math.cos(a) * r, y + Math.ceil(i / 2) * 0.05, Math.sin(a) * r];
      placeMover(movers, bird, pos, -a, [0, 0], 0.1 + 0.11 + f * 0.02);
    }
  }
}

/** Build every island, bridge and the ambient life. Returns the slots so the game can route to them. */
export function buildIslands(R, s) {
  R.removeTag('world');
  const slots = islandSlots(s), solid = new Mesh(), glow = new Mesh(), glass = new Mesh(), movers = new Mesh();
  for (const sl of slots) {
    const rnd = rng(1000 + sl.deg), F = frame(sl);
    islandBase(solid, sl, rnd);
    bridge(solid, glow, sl);
    for (let i = 0; i < 5; i++) { const a = rnd() * TAU, r = ISLAND_RAD * (0.72 + rnd() * 0.2), p = [sl.c[0] + Math.cos(a) * r, 0, sl.c[2] + Math.sin(a) * r]; const toBridge = Math.abs(Math.atan2(Math.sin(a - sl.a - Math.PI), Math.cos(a - sl.a - Math.PI))); if (toBridge < 0.5) continue; tree(solid, p, rnd, sl.theme === 'farm' || sl.theme === 'port' ? 'palm' : rnd() < 0.5 ? 'palm' : 'cypress'); }
    construction(solid, glow, sl, F, rnd);
    if (sl.level >= 4) mainBuilding(solid, glass, sl, F, rnd);
    if (sl.level >= 5) mainBuilding(solid, glass, sl, F, rnd, 0.65, sl.theme === 'course' ? -3.6 : -2.1);
    themed(solid, movers, glass, sl, F, rnd);
  }
  ambient(movers, rng(77));
  R.addGroup(solid, { pass: 'opaque', shadow: true, tag: 'world' });
  R.addGroup(glow, { pass: 'opaque', tag: 'world' });
  R.addGroup(movers, { pass: 'opaque', tag: 'world' });
  if (glass.n) R.addGroup(glass, { pass: 'glass', center: [0, 1, 0], tag: 'world' });
  return slots;
}
