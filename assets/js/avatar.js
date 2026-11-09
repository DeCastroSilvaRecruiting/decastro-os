// avatar.js — chibi cartoon characters built from primitives, posed with per-part transforms.
// Each character is five render groups (body, two arms, two legs) so it can walk, swing its arms and wave.
import { Mesh, sphere, lathe, tube, V, M, hex, mt } from './gl.js';

export const SKIN = ['#f6d7c3', '#eec1a1', '#dca37d', '#c68a62', '#a86d47', '#7d4f33', '#5a3825'];
export const HAIR = ['#1c1714', '#3b2a20', '#5a3d2b', '#8a5a3b', '#b07a4f', '#d8b27a', '#e9d3a2', '#a33b2b', '#8f8f8f'];
export const HAIR_STYLES = [['short', 'Short'], ['side', 'Side part'], ['buzz', 'Buzz cut'], ['curly', 'Curly'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['bob', 'Bob'], ['bald', 'Bald']];
export const FACIAL = [['none', 'None'], ['stubble', 'Stubble'], ['beard', 'Beard']];
export const TOPS = [['polo', 'Golf polo'], ['shirt', 'Shirt'], ['blazer', 'Blazer'], ['tee', 'T-shirt'], ['dress', 'Dress']];
export const ACCESSORIES = [['none', 'None'], ['cap', 'Golf cap'], ['visor', 'Golf visor'], ['sunglasses', 'Sunglasses'], ['bag', 'DCS golf bag']];

export const DEFAULT_AVATARS = {
  matthew: { name: 'Matthew', skin: '#dca37d', hair: '#3b2a20', hairStyle: 'side', facial: 'stubble', top: 'polo', topColor: '#1f3a5f', bottomColor: '#d8cbb0', shoes: '#f4f4f2', accent: '#c9a54c', accessory: 'cap', eyes: '#2b1d14' },
  lizzie: { name: 'Lizzie', skin: '#eec1a1', hair: '#8a5a3b', hairStyle: 'long', facial: 'none', top: 'dress', topColor: '#d9667a', bottomColor: '#f2efe9', shoes: '#f4f4f2', accent: '#ffffff', accessory: 'sunglasses', eyes: '#3a2a20' },
};

// ---------- small matrix helpers (column-major, like gl.js) ----------
const T = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
const RY = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
const RX = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
const RZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); };
const mul = (...ms) => ms.reduce((a, b) => M.mul(a, b));
const about = (p, R) => mul(T(p[0], p[1], p[2]), R, T(-p[0], -p[1], -p[2]));

// ---------- mesh helpers ----------
const S = 0.92;                                     // overall scale: about 0.62 world units tall
const SH = 0.5, HEAD = [0, 0.53, 0], HR = 0.13, HIP = 0.21, SHOULDER = 0.37;
/** Append a unit sphere, squashed into an ellipsoid; mask(dir) can hide parts by pulling them inside the head. */
function blob(m, c, r, o, { seg = 12, mask = null, hideTo = null } = {}) {
  const t = new Mesh(); sphere(t, [0, 0, 0], 1, seg, o);
  for (let i = 0; i < t.n; i++) {
    const k = i * 16, d = [t.v[k], t.v[k + 1], t.v[k + 2]];
    let p = [c[0] + d[0] * r[0], c[1] + d[1] * r[1], c[2] + d[2] * r[2]];
    if (mask && mask(d) && hideTo) p = [hideTo.c[0] + d[0] * hideTo.r, hideTo.c[1] + d[1] * hideTo.r, hideTo.c[2] + d[2] * hideTo.r];
    const n = V.norm([d[0] / r[0], d[1] / r[1], d[2] / r[2]]);
    t.v[k] = p[0] * S; t.v[k + 1] = p[1] * S; t.v[k + 2] = p[2] * S; t.v[k + 3] = n[0]; t.v[k + 4] = n[1]; t.v[k + 5] = n[2];
  }
  merge(m, t);
}
function merge(m, t) { const off = m.n; for (let i = 0; i < t.v.length; i++) m.v.push(t.v[i]); m.n += t.n; for (const ix of t.idx) m.idx.push(ix + off); }
const sc = (p) => p.map((x) => x * S);
const shade = (h, k) => { const c = hex(h); return [c[0] * k, c[1] * k, c[2] * k]; };

/** Build the meshes for one character. Returns { body, armL, armR, legL, legR } meshes in local space (feet at y=0, facing +z). */
export function avatarMeshes(a) {
  const skin = { col: hex(a.skin), mat: mt(0.65, 0, 0.12, 0) }, hair = { col: hex(a.hair), mat: mt(0.55, 0.05, 0.08, 0) };
  const top = { col: hex(a.topColor), mat: mt(0.7, 0, 0.1, 0) }, bottom = { col: hex(a.bottomColor), mat: mt(0.75, 0, 0.08, 0) };
  const shoes = { col: hex(a.shoes), mat: mt(0.45, 0, 0.08, 0) }, accent = { col: hex(a.accent || '#c9a54c'), mat: mt(0.4, 0.2, 0.1, 0) };
  const dark = { col: hex(a.eyes || '#2b1d14'), mat: mt(0.2, 0, 0, 0) }, white = { col: [1, 1, 1], mat: mt(0.2, 0, 0.6, 0) };
  const body = new Mesh(), armL = new Mesh(), armR = new Mesh(), legL = new Mesh(), legR = new Mesh();
  const head = { c: HEAD, r: HR * 0.92 };

  // legs and shoes
  for (const [m, x] of [[legL, 0.05], [legR, -0.05]]) {
    tube(m, [sc([x, HIP, 0]), sc([x, 0.05, 0.005])], 0.034 * S, 8, a.top === 'dress' ? skin : bottom);
    blob(m, [x, 0.03, 0.022], [0.042, 0.03, 0.065], shoes, { seg: 8 });
  }
  // torso
  const dress = a.top === 'dress';
  lathe(body, [[0.072, 0.19], [0.088, 0.235], [0.088, 0.3], [0.08, 0.36], [0.06, 0.395], [0.025, 0.415]].map(([r, y]) => [r * S, y * S]), 18, top);
  if (dress) lathe(body, [[0.135, 0.12], [0.11, 0.17], [0.08, 0.24], [0.072, 0.26]].map(([r, y]) => [r * S, y * S]), 20, top);
  else lathe(body, [[0.078, 0.17], [0.08, 0.215], [0.075, 0.23]].map(([r, y]) => [r * S, y * S]), 16, bottom);   // waistband
  if (a.top === 'polo' || a.top === 'shirt') { tube(body, Array.from({ length: 13 }, (_, i) => { const t = (i / 12) * Math.PI * 1.6 + Math.PI * 0.2 + Math.PI / 2; return sc([Math.cos(t) * 0.05, 0.4, Math.sin(t) * 0.05]); }), 0.012 * S, 5, { col: shade(a.topColor, 1.25), mat: top.mat }); }
  if (a.top === 'shirt' || a.top === 'polo') for (let i = 0; i < (a.top === 'shirt' ? 4 : 2); i++) blob(body, [0, 0.37 - i * 0.04, 0.083], [0.006, 0.006, 0.004], { col: [0.95, 0.95, 0.95], mat: mt(0.3, 0, 0.2, 0) }, { seg: 4 });
  if (a.top === 'blazer') { for (const s of [-1, 1]) tube(body, [sc([s * 0.012, 0.4, 0.07]), sc([s * 0.045, 0.3, 0.085]), sc([s * 0.03, 0.22, 0.083])], 0.009 * S, 4, { col: shade(a.topColor, 0.7), mat: top.mat }); blob(body, [0, 0.35, 0.078], [0.022, 0.05, 0.01], { col: [0.96, 0.96, 0.96], mat: mt(0.4, 0, 0.2, 0) }, { seg: 6 }); }
  if (a.top === 'polo') blob(body, [0.045, 0.34, 0.078], [0.012, 0.012, 0.004], accent, { seg: 4 });         // logo
  // neck and head
  lathe(body, [[0.03, 0.39], [0.03, 0.44]].map(([r, y]) => [r * S, y * S]), 10, skin);
  blob(body, HEAD, [HR, HR * 0.97, HR * 0.95], skin, { seg: 16 });
  for (const s of [-1, 1]) blob(body, [s * HR * 0.97, 0.525, -0.005], [0.022, 0.03, 0.018], skin, { seg: 6 });
  // face
  for (const s of [-1, 1]) {
    blob(body, [s * 0.045, 0.545, 0.112], [0.019, 0.024, 0.012], dark, { seg: 8 });
    blob(body, [s * 0.045 + 0.007, 0.553, 0.122], [0.006, 0.006, 0.003], white, { seg: 4 });
    tube(body, [sc([s * 0.028, 0.584, 0.112]), sc([s * 0.062, 0.588, 0.104])], 0.006 * S, 4, { col: shade(a.hair, 0.9), mat: hair.mat });
    blob(body, [s * 0.075, 0.507, 0.098], [0.022, 0.014, 0.008], { col: hex('#f19a9a'), mat: mt(0.8, 0, 0.1, 0) }, { seg: 6 });
  }
  blob(body, [0, 0.52, 0.128], [0.013, 0.011, 0.01], { col: shade(a.skin, 0.92), mat: skin.mat }, { seg: 6 });
  tube(body, Array.from({ length: 9 }, (_, i) => { const x = -0.03 + (i / 8) * 0.06; return sc([x, 0.487 + 220 * x * x * 0.06 * 0.5, 0.118 - Math.abs(x) * 0.25]); }), 0.0055 * S, 4, { col: hex('#7a3b33'), mat: mt(0.5, 0, 0, 0) });
  // facial hair
  if (a.facial !== 'none') {
    const beard = a.facial === 'beard';
    blob(body, [0, beard ? 0.505 : 0.53, beard ? 0.006 : 0], beard ? [HR * 1.04, HR * 1.0, HR * 1.03] : [HR * 1.02, HR * 0.99, HR * 0.972], { col: beard ? hex(a.hair) : V.lerp(hex(a.skin), hex(a.hair), 0.3), mat: hair.mat }, { seg: 14, mask: (d) => !(d[1] < -0.08 && d[2] > -0.35) || (Math.abs(d[0]) < 0.32 && d[1] > -0.5 && d[2] > 0.72), hideTo: head });
  }
  // hair
  const st = a.hairStyle;
  if (st !== 'bald') {
    const thick = st === 'buzz' ? 1.012 : st === 'curly' ? 1.06 : 1.05;
    const fringe = st === 'side' ? (d) => d[2] > 0.3 && d[1] < 0.42 - d[0] * 0.25 : st === 'bob' || st === 'long' ? (d) => d[2] > 0.35 && d[1] < 0.38 : (d) => d[2] > 0.25 && d[1] < 0.5;
    const low = st === 'long' || st === 'bob' ? -0.55 : -0.2;
    const maskCap = (d) => fringe(d) || d[1] < low || (d[2] > -0.1 && d[1] < 0.05 && Math.abs(d[0]) > 0.7 && st !== 'long' && st !== 'bob');
    if (st === 'curly') {
      for (let i = 0; i < 70; i++) { const u = Math.acos(1 - 2 * ((i + 0.5) / 70)), v = i * 2.39996; const d = [Math.sin(u) * Math.cos(v), Math.cos(u), Math.sin(u) * Math.sin(v)]; if (maskCap(d)) continue; blob(body, [HEAD[0] + d[0] * HR * 1.03, HEAD[1] + d[1] * HR * 1.03, HEAD[2] + d[2] * HR * 1.03], [0.035, 0.035, 0.035], hair, { seg: 5 }); }
    } else blob(body, [0, HEAD[1] + 0.008, -0.004], [HR * thick, HR * thick * 1.02, HR * thick], hair, { seg: 18, mask: maskCap, hideTo: head });
    if (st === 'side') blob(body, [0.035, 0.6, 0.085], [0.07, 0.03, 0.045], hair, { seg: 8 });
    if (st === 'long') { blob(body, [0, 0.43, -0.07], [0.13, 0.17, 0.075], hair, { seg: 12 }); for (const s of [-1, 1]) blob(body, [s * 0.11, 0.44, 0.03], [0.035, 0.12, 0.05], hair, { seg: 8 }); }
    if (st === 'bob') { blob(body, [0, 0.48, -0.03], [0.142, 0.1, 0.13], hair, { seg: 12, mask: (d) => d[2] > 0.45, hideTo: head }); }
    if (st === 'ponytail') { tube(body, [sc([0, 0.6, -0.12]), sc([0, 0.56, -0.19]), sc([0, 0.46, -0.21]), sc([0, 0.38, -0.18])], 0.034 * S, 8, hair); blob(body, [0, 0.6, -0.125], [0.03, 0.03, 0.03], accent, { seg: 6 }); }
    if (st === 'bun') { blob(body, [0, 0.68, -0.05], [0.06, 0.055, 0.06], hair, { seg: 10 }); }
  }
  // accessories
  if (a.accessory === 'cap' || a.accessory === 'visor') {
    if (a.accessory === 'cap') blob(body, [0, 0.578, -0.004], [HR * 1.09, HR * 0.78, HR * 1.09], accent, { seg: 16, mask: (d) => d[1] < 0.1, hideTo: head });
    else lathe(body, [[HR * 1.08, 0.585], [HR * 1.08, 0.62]].map(([r, y]) => [r * S, y * S]), 20, accent);
    blob(body, [0, 0.594, 0.13], [0.1, 0.012, 0.075], accent, { seg: 10, mask: (d) => d[2] < -0.2, hideTo: { c: [0, 0.594, 0.1], r: 0.01 } });
    blob(body, [0, 0.658, 0], [0.012, 0.008, 0.012], { col: shade(a.accent || '#c9a54c', 0.8), mat: accent.mat }, { seg: 4 });
  }
  if (a.accessory === 'sunglasses') {
    const g = { col: hex('#151515'), mat: mt(0.1, 0.6, 0, 0) };
    for (const s of [-1, 1]) blob(body, [s * 0.046, 0.548, 0.121], [0.033, 0.024, 0.008], g, { seg: 8 });
    tube(body, [sc([-0.015, 0.553, 0.13]), sc([0.015, 0.553, 0.13])], 0.004 * S, 4, g);
    for (const s of [-1, 1]) tube(body, [sc([s * 0.078, 0.553, 0.11]), sc([s * 0.125, 0.553, 0.02])], 0.0035 * S, 4, g);
  }
  if (a.accessory === 'bag') {
    const leather = { col: hex('#8a5a32'), mat: mt(0.55, 0.05, 0.08, 0) }, canvas = { col: hex('#d8cfb8'), mat: mt(0.85, 0, 0.08, 0) };
    tube(body, [sc([-0.06, 0.15, -0.11]), sc([0.06, 0.52, -0.13])], 0.05 * S, 12, canvas);
    tube(body, [sc([-0.065, 0.13, -0.11]), sc([-0.05, 0.19, -0.115])], 0.055 * S, 12, leather);
    tube(body, [sc([0.05, 0.47, -0.128]), sc([0.065, 0.53, -0.13])], 0.055 * S, 12, leather);
    for (let i = 0; i < 3; i++) tube(body, [sc([0.055 + i * 0.012 - 0.012, 0.53, -0.13]), sc([0.06 + i * 0.02 - 0.02, 0.62, -0.13 + i * 0.01])], 0.006 * S, 4, { col: hex('#c0c4c8'), mat: mt(0.3, 0.9, 0, 0) });
    tube(body, [sc([0.08, 0.38, 0.06]), sc([0.03, 0.42, 0.085]), sc([-0.05, 0.3, 0.085]), sc([-0.08, 0.2, 0.03])], 0.008 * S, 4, leather);
  }
  // arms: sleeve then skin, hand at the end
  const sleeve = a.top === 'tee' || a.top === 'polo' || a.top === 'dress' ? 0.45 : 0.85;
  for (const [m, s] of [[armL, 1], [armR, -1]]) {
    const sh = [s * 0.098, SHOULDER, 0], hand = [s * 0.118, 0.24, 0.012], mid = V.lerp(sh, hand, sleeve);
    tube(m, [sc(sh), sc(mid)], 0.03 * S, 8, top);
    tube(m, [sc(mid), sc(hand)], 0.025 * S, 8, skin);
    blob(m, hand, [0.03, 0.03, 0.03], skin, { seg: 8 });
    blob(m, sh, [0.033, 0.033, 0.033], top, { seg: 8 });
  }
  return { body, armL, armR, legL, legR };
}

/** Add a character to the renderer. Returns an object with pose() to place and animate it each frame. */
export function addAvatar(R, a, tag) {
  const ms = avatarMeshes(a), g = {};
  for (const k of Object.keys(ms)) g[k] = R.addGroup(ms[k], { pass: 'opaque', shadow: true, tag });
  const hipL = sc([0.05, HIP, 0]), hipR = sc([-0.05, HIP, 0]), shL = sc([0.098, SHOULDER, 0]), shR = sc([-0.098, SHOULDER, 0]);
  return {
    groups: Object.values(g),
    /** pos: feet position; yaw: facing; walk: 0..1 blend; phase: stride phase; wave: 0..1; t: seconds */
    pose(pos, yaw, { walk = 0, phase = 0, wave = 0, t = 0, talk = 0 } = {}) {
      const bob = Math.abs(Math.sin(phase)) * 0.014 * walk + Math.sin(t * 2.1) * 0.003 * (1 - walk);
      const root = mul(T(pos[0], pos[1] + bob, pos[2]), RY(yaw));
      const sw = Math.sin(phase) * 0.6 * walk, idle = Math.sin(t * 1.7) * 0.05 * (1 - walk);
      g.body.model = mul(root, RY(Math.sin(phase) * 0.06 * walk + Math.sin(t * 3) * 0.04 * talk));
      g.legL.model = mul(root, about(hipL, RX(sw)));
      g.legR.model = mul(root, about(hipR, RX(-sw)));
      g.armL.model = mul(root, about(shL, mul(RX(-sw * 0.8 + idle), RZ(0.08))));
      const waveA = wave > 0 ? mul(RZ(-2.4 * wave - Math.sin(t * 12) * 0.25 * wave), RX(-0.2 * wave)) : RX(sw * 0.8 - idle);
      g.armR.model = mul(root, about(shR, mul(waveA, RZ(-0.08))));
    },
    set dim(v) { for (const x of Object.values(g)) if (x) x.dim = v; },
    set hl(v) { for (const x of Object.values(g)) if (x) x.hl = v; },
  };
}
export const AVATAR_HEIGHT = 0.68 * S;
