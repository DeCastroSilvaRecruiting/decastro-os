// gl.js — a compact WebGL2 renderer for The Tower.
// Physically-flavoured materials, sun shadows, a procedural sky and desert, MSAA HDR, bloom and tone mapping.
// Zero dependencies.

export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- vector / matrix math
export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  neg: (a) => [-a[0], -a[1], -a[2]],
};

export const M = {
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = (2 * f * n) / (n - f); return o; },
  ortho(l, r, b, t, n, f) { const o = new Float32Array(16); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; },
  look(e, c, u) {
    const z = V.norm(V.sub(e, c)), x = V.norm(V.cross(u, z)), y = V.cross(z, x), o = new Float32Array(16);
    o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[8] = x[2]; o[9] = y[2]; o[10] = z[2];
    o[12] = -V.dot(x, e); o[13] = -V.dot(y, e); o[14] = -V.dot(z, e); o[15] = 1; return o;
  },
  /** shift the projected image sideways in NDC (moves the principal point) */
  shiftX(p, tx) { const o = new Float32Array(p); for (let c = 0; c < 4; c++) o[c * 4] += tx * p[c * 4 + 3]; return o; },
  inv(m) {
    const o = new Float32Array(16), a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7], a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return o; det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  },
  /** project a world point to canvas CSS pixels (or null when behind the camera) */
  project(vp, p, W, H) { const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15]; if (w <= 0.01) return null; return { x: (x / w * 0.5 + 0.5) * W, y: (1 - (y / w * 0.5 + 0.5)) * H, w }; },
};

export const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export const lin = (c) => c.map((x) => Math.pow(x, 2.2));
export const mt = (rough, metal, emis, kind) => [rough, metal, emis, kind];

export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- mesh builder
// vertex = pos3 nrm3 col4 mat4(rough, metal|param, emissive, kind) uv2  → 16 floats
export const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
export class Mesh {
  constructor() { this.v = []; this.idx = []; this.n = 0; }
  vert(p, n, c, m, uv = [0, 0]) { this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], c[3] === undefined ? 1 : c[3], m[0], m[1], m[2], m[3], uv[0], uv[1]); return this.n++; }
  tri(a, b, c) { this.idx.push(a, b, c); }
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  get empty() { return this.n === 0; }
}

/** grid of a parametric surface; normals by finite differences; `out` (point | fn) orients them outward */
export function surface(m, fn, nu, nv, o) {
  const ids = [], e = 1e-3;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv, p = fn(u, v);
    const pu = V.sub(fn(Math.min(1, u + e), v), fn(Math.max(0, u - e), v)), pv = V.sub(fn(u, Math.min(1, v + e)), fn(u, Math.max(0, v - e)));
    let n = V.norm(V.cross(pu, pv));
    if (o.out) { const c = typeof o.out === 'function' ? o.out(p, u, v) : o.out; if (V.dot(n, V.sub(p, c)) < 0) n = V.neg(n); }
    ids.push(m.vert(p, n, o.col, o.mat, [u * (o.uv ? o.uv[0] : 1), v * (o.uv ? o.uv[1] : 1)]));
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = ids[j * (nu + 1) + i]; m.quad(a, a + 1, a + nu + 2, a + nu + 1); }
}

/** surface of revolution about the Y axis. profile = [[radius, y], ...] ordered bottom → top (counter-clockwise) */
export function lathe(m, prof, seg, o = {}) {
  const a0 = o.a0 ?? 0, a1 = o.a1 ?? TAU, cx = o.cx ?? 0, cz = o.cz ?? 0, rows = prof.length, ids = [];
  for (let k = 0; k < rows; k++) {
    const pr = prof[Math.max(0, k - 1)], nx = prof[Math.min(rows - 1, k + 1)], dr = nx[0] - pr[0], dy = nx[1] - pr[1], l = Math.hypot(dr, dy) || 1, nr = dy / l, ny = -dr / l;
    for (let i = 0; i <= seg; i++) {
      const a = a0 + ((a1 - a0) * i) / seg, c = Math.cos(a), s = Math.sin(a);
      ids.push(m.vert([cx + c * prof[k][0], prof[k][1], cz + s * prof[k][0]], [c * nr, ny, s * nr], o.col, o.mat, [(i / seg) * (o.uv ? o.uv[0] : 1), (k / Math.max(1, rows - 1)) * (o.uv ? o.uv[1] : 1)]));
    }
  }
  for (let k = 0; k < rows - 1; k++) for (let i = 0; i < seg; i++) { const a = ids[k * (seg + 1) + i]; m.quad(a, a + 1, a + seg + 2, a + seg + 1); }
}

/** polar patch, flat, facing up (or down) */
export function sector(m, r0, r1, a0, a1, y, nr, na, o, up = true) {
  const ids = [];
  for (let j = 0; j <= nr; j++) for (let i = 0; i <= na; i++) { const r = r0 + ((r1 - r0) * j) / nr, a = a0 + ((a1 - a0) * i) / na; ids.push(m.vert([Math.cos(a) * r, y, Math.sin(a) * r], [0, up ? 1 : -1, 0], o.col, o.mat, [Math.cos(a) * r, Math.sin(a) * r])); }
  for (let j = 0; j < nr; j++) for (let i = 0; i < na; i++) { const a = ids[j * (na + 1) + i]; m.quad(a, a + 1, a + na + 2, a + na + 1); }
}

export function sphere(m, c, r, seg, o) {
  const prof = []; for (let k = 0; k <= seg; k++) { const a = -Math.PI / 2 + (Math.PI * k) / seg; prof.push([Math.max(0.0001, r * Math.cos(a)), c[1] + r * Math.sin(a)]); }
  lathe(m, prof, seg * 2, { ...o, cx: c[0], cz: c[2] });
}

function flatFace(m, pts, n, o, uvs) { const ids = pts.map((p, i) => m.vert(p, n, o.col, o.mat, uvs ? uvs[i] : [i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0])); m.quad(ids[0], ids[1], ids[2], ids[3]); return ids; }

/** n-sided frustum with flat faces (prism when r0 === r1) */
export function frustum(m, cx, cz, r0, r1, n, y0, y1, rot, o = {}) {
  const ring = (r, y) => Array.from({ length: n }, (_, i) => { const a = rot + (i * TAU) / n; return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]; });
  const A = ring(r0, y0), B = ring(r1, y1), c = [cx, (y0 + y1) / 2, cz];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, q = [A[i], A[j], B[j], B[i]];
    let nn = V.norm(V.cross(V.sub(q[1], q[0]), V.sub(q[3], q[0]))); const mid = V.mul(V.add(V.add(q[0], q[1]), V.add(q[2], q[3])), 0.25);
    if (V.dot(nn, V.sub(mid, c)) < 0) nn = V.neg(nn);
    flatFace(m, q, nn, o, [[i, 0], [i + 1, 0], [i + 1, 1], [i, 1]]);
  }
  const cap = (R, y, up) => { const c0 = m.vert([cx, y, cz], [0, up ? 1 : -1, 0], o.col, o.mat, [0.5, 0.5]); const ids = R.map((p) => m.vert(p, [0, up ? 1 : -1, 0], o.col, o.mat, [0.5, 0.5])); for (let i = 0; i < n; i++) m.tri(c0, ids[i], ids[(i + 1) % n]); };
  if (o.capTop) cap(B, y1, true); if (o.capBottom) cap(A, y0, false);
}

export function box(m, c, sx, sy, sz, rotY, o) {
  const ca = Math.cos(rotY), sa = Math.sin(rotY), P = (x, y, z) => [c[0] + (x * ca - z * sa) * sx / 2, c[1] + (y * sy) / 2, c[2] + (x * sa + z * ca) * sz / 2];
  const v = [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)];
  const faces = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
  for (const f of faces) { const q = f.map((i) => v[i]); let n = V.norm(V.cross(V.sub(q[1], q[0]), V.sub(q[3], q[0]))); const mid = V.mul(V.add(V.add(q[0], q[1]), V.add(q[2], q[3])), 0.25); if (V.dot(n, V.sub(mid, c)) < 0) n = V.neg(n); flatFace(m, q, n, o); }
}

/** flat quad with centre c and half-axes ax, ay (leaf cards, ribbons) */
export function card(m, c, ax, ay, o, nrm) {
  const n = nrm || V.norm(V.cross(ax, ay));
  const p = [V.sub(V.sub(c, ax), ay), V.sub(V.add(c, ax), ay), V.add(V.add(c, ax), ay), V.add(V.sub(c, ax), ay)];
  flatFace(m, p, n, o, [[0, 0], [1, 0], [1, 1], [0, 1]]);
}

export function frames(pts) {
  const out = []; let N = null;
  for (let i = 0; i < pts.length; i++) {
    const T = V.norm(V.sub(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]));
    if (!N) { N = V.cross(T, Math.abs(T[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]); }
    N = V.sub(N, V.mul(T, V.dot(N, T))); N = V.norm(N);
    out.push({ T, N, B: V.cross(T, N) });
  }
  return out;
}

/** tube along a polyline; uv.x = distance along, uv.y = around */
export function tube(m, pts, radius, sides, o) {
  const fr = frames(pts), rings = []; let len = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i) len += V.len(V.sub(pts[i], pts[i - 1]));
    const r = typeof radius === 'function' ? radius(i, i / (pts.length - 1)) : radius, ids = [];
    for (let s = 0; s <= sides; s++) { const a = (s / sides) * TAU, d = V.add(V.mul(fr[i].N, Math.cos(a)), V.mul(fr[i].B, Math.sin(a))); ids.push(m.vert(V.add(pts[i], V.mul(d, r)), d, o.col, o.mat, [len * (o.uvScale ?? 1), s / sides])); }
    rings.push(ids);
  }
  for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < sides; s++) m.quad(rings[i][s], rings[i][s + 1], rings[i + 1][s + 1], rings[i + 1][s]);
}

export const circlePts = (r, y, n = 64, cx = 0, cz = 0, a0 = 0, a1 = TAU) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]; });

export function bezier3(a, b, lift, n = 40) {
  const mid = V.lerp(a, b, 0.5); mid[1] += lift; const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, w = 1 - t; out.push([w * w * a[0] + 2 * w * t * mid[0] + t * t * b[0], w * w * a[1] + 2 * w * t * mid[1] + t * t * b[1], w * w * a[2] + 2 * w * t * mid[2] + t * t * b[2]]); }
  return out;
}

// ---------------------------------------------------------------- shaders
const COMMON = `
precision highp float;
uniform vec3 uSunDir, uSunCol, uSkyTop, uSkyHor, uAmbSky, uAmbGnd, uFogCol, uSand;
uniform float uFog, uNight, uTime;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x), mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(17.,9.); a*=.5; } return s; }
vec3 skyCol(vec3 d){
  float h = clamp(d.y, 0., 1.);
  vec3 c = mix(uSkyHor, uSkyTop, pow(h, 0.5));
  float sd = max(dot(d, uSunDir), 0.);
  c += uSunCol * (pow(sd, 900.)*14. + pow(sd, 12.)*0.22 + pow(sd, 3.)*0.12*(1.-h));
  if (uNight > 0.0) { vec3 s = floor(d*170.); float r = h31(s); c += step(0.9985, r)*uNight*smoothstep(0.1,0.45,d.y)*vec3(0.85,0.92,1.)*(0.6+0.4*sin(uTime*2.+r*60.)); }
  if (d.y < 0.) c = mix(c, uFogCol, clamp(-d.y*5., 0., 1.));
  return c;
}
`;

const VS_MAIN = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol; layout(location=3) in vec4 aMat; layout(location=4) in vec2 aUV;
uniform mat4 uVP; uniform mat4 uSVP; uniform mat4 uModel; uniform float uTime;
out vec3 vPos; out vec3 vNrm; out vec4 vCol; out vec4 vMat; out vec2 vUV; out vec4 vSh;
void main(){
  vec3 p = (uModel*vec4(aPos,1.)).xyz;
  if (aMat.w > 6.5 && aMat.w < 7.5) { float w = aCol.a; p.x += sin(uTime*1.4 + p.x*0.8 + p.z*0.6)*0.05*w; p.z += cos(uTime*1.1 + p.z*0.7 + p.y)*0.04*w; p.y += sin(uTime*2.0 + p.x)*0.012*w; }
  vec3 n = mat3(uModel)*aNrm;
  if (aMat.w > 12.5 && aMat.w < 13.5) {   // slewing / orbiting parts: rotate about the pivot stored in uv
    float sp = aCol.a; float a = sp < 0.1 ? 0.75*sin(uTime*sp*3.1) + uTime*sp*0.5 : uTime*sp;
    float c = cos(a), s = sin(a); vec2 q = p.xz - aUV; p.xz = aUV + vec2(q.x*c - q.y*s, q.x*s + q.y*c); n.xz = vec2(n.x*c - n.z*s, n.x*s + n.z*c);
    if (sp >= 0.1) p.y += sin(uTime*2.3)*0.035;
  }
  vPos = p; vNrm = n; vCol = aCol; vMat = aMat; vUV = aUV; vSh = uSVP*vec4(p,1.);
  gl_Position = uVP*vec4(p,1.);
}`;

const VS_SHADOW = `#version 300 es
layout(location=0) in vec3 aPos; uniform mat4 uSVP; uniform mat4 uModel;
void main(){ gl_Position = uSVP*uModel*vec4(aPos,1.); }`;
const FS_SHADOW = `#version 300 es
precision highp float; out vec4 o; void main(){ o = vec4(1.); }`;

const FS_MAIN = `#version 300 es
precision highp sampler2DShadow;
${COMMON}
in vec3 vPos; in vec3 vNrm; in vec4 vCol; in vec4 vMat; in vec2 vUV; in vec4 vSh;
uniform vec3 uCam; uniform float uDim, uHL, uOcc, uPassBack, uShadowTexel;
uniform vec3 uFocus; uniform float uCut;
uniform sampler2DShadow uShadow;
out vec4 oCol;

vec3 shade(vec3 alb, vec3 N, vec3 V, float rough, float metal, float sh, float ao){
  vec3 L = uSunDir; float ndl = max(dot(N,L),0.); float ndv = max(dot(N,V),0.001);
  vec3 H = normalize(L+V); float ndh = max(dot(N,H),0.);
  vec3 F0 = mix(vec3(0.04), alb, metal);
  vec3 F = F0 + (1.-F0)*pow(1.-ndv, 5.);
  float a = max(rough*rough, 0.03); float a2 = a*a; float dd = ndh*ndh*(a2-1.)+1.; float D = a2/(3.14159*dd*dd);
  vec3 spec = min(F*D*0.25*ndl, vec3(12.));
  vec3 diff = alb*(1.-metal);
  vec3 hemi = mix(uAmbGnd, uAmbSky, N.y*0.5+0.5);
  vec3 col = diff*(uSunCol*ndl*sh + hemi*ao) + spec*uSunCol*sh;
  vec3 R = reflect(-V,N);
  float spc = 1.-rough;
  col += skyCol(R) * F * spc*spc * ao * (0.3+0.7*metal);
  return col;
}

void main(){
  if (uCut > 0.5 && vPos.y > uFocus.y + 0.06) {          // see-through: fade whatever stands between the camera and the player
    vec3 ab = uFocus - uCam; float L = length(ab); vec3 dir = ab / max(L, 1e-4);
    float s = dot(vPos - uCam, dir);
    if (s > 0.0 && s < L - 0.32) {
      float d = length(vPos - uCam - dir*s), rad = 0.3 + 1.1*(s/L);
      if (d < rad && h21(gl_FragCoord.xy) < smoothstep(rad, rad*0.55, d)*0.92) discard;
    }
  }
  int kind = int(vMat.w + 0.5);
  vec3 V = normalize(uCam - vPos);
  vec3 N = normalize(vNrm);
  bool back = dot(N,V) < 0.;
  bool glass = (kind==3 || kind==9);
  if (glass && (back != (uPassBack > 0.5))) discard;
  if (back) N = -N;
  float rough = vMat.x, metal = vMat.y, emis = vMat.z;
  vec3 base = pow(vCol.rgb, vec3(2.2));
  vec3 alb = base; vec3 em = vec3(0.); float alpha = 1.; float ao = 1.;

  float ndl0 = max(dot(N,uSunDir),0.);
  vec3 sc = vSh.xyz/vSh.w*0.5+0.5; float sh = 1.;
  if (sc.x>0. && sc.x<1. && sc.y>0. && sc.y<1. && sc.z<1.) {
    float s = 0.; float bias = 0.0012 + 0.0028*(1.-ndl0);
    for (int x=-1; x<=1; x++) for (int y=-1; y<=1; y++) s += texture(uShadow, vec3(sc.xy + vec2(float(x),float(y))*uShadowTexel, sc.z - bias));
    sh = s/9.;
  }
  vec3 col = vec3(0.);

  if (kind == 7) {                       // foliage cards
    int lt = int(vMat.y + 0.5); vec2 uv = vUV;
    if (lt == 0) { vec2 q = uv*2.-1.; q.y *= 0.85; if (dot(q,q) > 1. - 0.3*smoothstep(-1.,1.,q.x*q.y)) discard; }
    else { float cy = abs(uv.y-0.5)*2.; float len = uv.x; float wmax = 0.98*(1.-len*0.7); float teeth = fract(len*17. - cy*3.2); if (cy > wmax || (teeth > 0.62 && cy > 0.07)) discard; }
    vec3 a = base*(0.8+0.4*h21(floor(vPos.xz*9.)+vPos.y));
    vec3 hemi = mix(uAmbGnd, uAmbSky, N.y*0.5+0.5);
    float ndl = max(dot(N,uSunDir),0.);
    float trans = pow(max(dot(-V,uSunDir),0.), 3.);
    col = a*(hemi*0.9 + uSunCol*(0.3+0.7*ndl)*sh) + a*uSunCol*trans*0.5*sh;
  }
  else if (kind == 1) {                   // ground: grass, sand, paving
    vec2 p = vPos.xz; float r = length(p);
    float n1 = fbm(p*1.1), n2 = fbm(p*0.35+4.);
    vec3 grass = mix(vec3(0.075,0.19,0.07), vec3(0.2,0.34,0.11), n1);
    vec3 sand = mix(vec3(0.5,0.38,0.24), vec3(0.66,0.54,0.36), n1);
    float sandAmt = smoothstep(0.38,0.72, n2 + (r-5.8)*0.1);
    vec3 g = mix(grass, sand, sandAmt);
    float plaza = 1.-smoothstep(5.35,5.75,r);
    vec2 tp = p*0.8; vec2 tl = abs(fract(tp)-0.5); float line = smoothstep(0.455,0.5,max(tl.x,tl.y));
    vec3 stone = mix(vec3(0.5,0.47,0.42), vec3(0.64,0.6,0.54), h21(floor(tp)))*(1.-0.4*line);
    alb = mix(g, stone, plaza);
    ao = mix(0.45, 1., smoothstep(3.2,4.3,r));
    col = shade(alb, N, V, 0.92, 0., sh, ao);
  }
  else if (kind == 2) {                   // stone / concrete
    float n = fbm(vPos.xz*1.6 + vPos.y*2.1);
    alb = base*(0.78+0.44*n);
    float ln = smoothstep(0.47,0.5,abs(fract(vPos.y*1.25)-0.5)); alb *= 1.-0.2*ln;
    col = shade(alb, N, V, max(rough,0.6), metal, sh, ao);
  }
  else if (kind == 4) {                   // water
    vec2 p = vPos.xz*1.5; float t = uTime*0.15; float e = 0.05;
    vec2 o2 = vec2(t, t*0.7);
    float h0 = fbm(p+o2), hx = fbm(p+vec2(e,0.)+o2), hz = fbm(p+vec2(0.,e)+o2);
    vec3 Nw = normalize(vec3(-(hx-h0)*1.6, 1., -(hz-h0)*1.6));
    float F = 0.03+0.97*pow(1.-max(dot(Nw,V),0.),5.);
    vec3 env = skyCol(reflect(-V,Nw));
    vec3 deep = vec3(0.01,0.05,0.06) + uAmbSky*0.05;
    col = mix(deep, env, clamp(F*1.1+0.12,0.,1.));
    vec3 H = normalize(uSunDir+V); col += uSunCol*pow(max(dot(Nw,H),0.),260.)*sh*2.;
    col *= 0.75+0.25*sh;
  }
  else if (kind == 5) {                   // glowing flow lines: bridges, roots, mycelium
    float speed = vMat.y;
    float pulse = pow(0.5+0.5*sin((vUV.x*0.8 - uTime*speed)*6.2831), 6.);
    col = shade(vec3(0.05), N, V, 0.4, 0.6, sh, 1.);
    em = base*emis*(0.25 + 1.7*pulse)*uDim*(1.+uHL*1.2);
    col += em;
  }
  else if (kind == 6) {                   // earth strata on the cutaway
    float w = fbm(vPos.xz*0.5 + vec2(vPos.y*0.4, 0.))*0.6;
    float yy = -vPos.y + w*0.35;
    vec3 c = vec3(0.13,0.1,0.06);
    c = mix(c, vec3(0.42,0.24,0.13), smoothstep(0.35,0.45,yy));
    c = mix(c, vec3(0.6,0.46,0.28), smoothstep(1.3,1.4,yy));
    c = mix(c, vec3(0.3,0.3,0.31), smoothstep(2.3,2.4,yy));
    c = mix(c, vec3(0.16,0.17,0.2), smoothstep(3.3,3.4,yy));
    float lines = 0.5+0.5*sin(yy*24.+fbm(vPos.xz*2.)*6.); c *= 0.86+0.14*lines;
    c *= 0.88+0.24*h31(floor(vPos*38.));
    col = shade(c, N, V, 1., 0., sh, 1.);
  }
  else if (kind == 8) {                   // additive light beams and glows
    float ndv = max(dot(N,V),0.);
    float fall = pow(ndv, 1.5) * pow(clamp(1.-vUV.y,0.,1.), 1.4);
    col = base*emis*fall*uDim*(1.+uHL*0.8);
  }
  else if (kind == 9) {                   // curtain-wall facade
    vec2 cell = floor(vUV), fc = fract(vUV);
    float mull = step(fc.x,0.07)+step(0.93,fc.x);
    float spand = step(fc.y,0.16)*(mod(cell.y,2.)<0.5 ? 1. : 0.35);
    float frame = clamp(mull+spand,0.,1.);
    float h = h21(cell + vMat.y*13.1);
    float litP = 0.14 + 0.42*uOcc + 0.22*uHL + 0.22*uNight;
    float lit = step(1.-litP, h) * (1.-frame);
    float flick = 0.85+0.15*sin(uTime*(0.5+h*2.)+h*30.);
    vec3 warm = mix(vec3(1.0,0.7,0.36), vec3(0.72,0.86,1.0), h21(cell.yx+3.));
    vec3 env = skyCol(reflect(-V,N));
    float F = 0.04+0.96*pow(1.-max(dot(N,V),0.),5.);
    vec3 glassC = env*(F*1.3+0.05) + base*0.09 + base*uHL*0.14;
    vec3 frameC = shade(vec3(0.045,0.05,0.06), N, V, 0.35, 0.8, sh, 1.) + base*0.12*spand;
    if (frame > 0.5) { col = frameC; alpha = 1.; }
    else if (lit > 0.5) { col = warm*0.95*flick*(0.5+0.5*uDim) + glassC*0.4; alpha = 0.92; }
    else { vec3 H = normalize(uSunDir+V); col = glassC + uSunCol*pow(max(dot(N,H),0.),90.)*sh*0.5; alpha = 0.24+0.6*F+0.08*uHL; }
    alpha *= mix(0.5, 1., uDim);
    if (back) alpha *= 0.8;
  }
  else if (kind == 10) {                  // glowing venture pods
    float ndv = max(dot(N,V),0.); float rim = pow(1.-ndv, 2.);
    col = base*(0.45+emis*(0.65+0.6*rim))*(1.+uHL*0.9)*mix(0.45,1.,uDim);
    col += uSunCol*pow(max(dot(N,normalize(uSunDir+V)),0.),60.)*0.3;
  }
  else if (kind == 11) {                  // solid emissive strips and lamps
    col = shade(vec3(0.03), N, V, 0.4, 0.5, sh, 1.)*0.4 + base*emis*uDim*(1.+uHL*1.2);
  }
  else if (kind == 12) {                  // aviation warning lights: slow red blink
    float ph = h21(floor(vPos.xz*2.) + floor(vPos.y)); float on = smoothstep(0.55, 0.6, fract(uTime*0.5 + ph)) * (1. - smoothstep(0.9, 0.95, fract(uTime*0.5 + ph)));
    col = base*emis*(0.06 + 0.94*on)*(0.65 + 0.35*uDim);
  }
  else if (kind == 3) {                   // plain glass
    vec3 env = skyCol(reflect(-V,N));
    float F = 0.04+0.96*pow(1.-max(dot(N,V),0.),5.);
    float spc = pow(max(dot(N,normalize(uSunDir+V)),0.),120.);
    col = env*F*1.3 + base*(0.1+emis) + uSunCol*spc*sh*0.6 + base*uHL*0.2;
    alpha = clamp(vCol.a + F*0.7, 0., 0.95)*mix(0.45,1.,uDim);
    if (back) alpha *= 0.7;
  }
  else {                                  // 0: standard lit material
    col = shade(alb, N, V, rough, metal, sh, ao);
    col += base*emis*uDim*(1.+uHL);
    col *= mix(0.55,1.,uDim);
  }

  if (kind != 8) { float dist = length(uCam - vPos); float f = 1.-exp(-uFog*dist); col = mix(col, uFogCol, f*0.85); }
  oCol = vec4(col, alpha);
}`;

const VS_FULL = `#version 300 es
out vec2 vN;
void main(){ vec2 p = vec2(float((gl_VertexID & 1) << 2) - 1., float((gl_VertexID & 2) << 1) - 1.); vN = p; gl_Position = vec4(p, 1., 1.); }`;

const FS_SKY = `#version 300 es
${COMMON}
in vec2 vN; out vec4 oCol;
uniform mat4 uInvVP; uniform vec3 uCam; uniform float uGroundY, uIslandR;
void main(){
  vec4 p = uInvVP*vec4(vN,1.,1.); vec3 d = normalize(p.xyz/p.w - uCam);
  vec3 c;
  if (d.y > -0.002) {
    c = skyCol(d);
    // drifting cumulus layer, lit by the sun (and dimmed at night)
    vec2 cuv = d.xz/(d.y + 0.11)*1.25 + vec2(uTime*0.006, uTime*0.0025);
    float cn = fbm(cuv*0.8)*0.62 + fbm(cuv*2.4 + 3.1)*0.38;
    float cov = smoothstep(0.5, 0.8, cn)*smoothstep(0.0, 0.16, d.y);
    float sl = clamp(dot(d, uSunDir)*0.5 + 0.55, 0., 1.);
    vec3 cl = mix(uAmbSky*2.2 + uFogCol*0.35, uSunCol*0.6 + uSkyHor*0.35, sl*sl);
    cl += uSunCol*pow(max(dot(d, uSunDir), 0.), 8.)*0.6;
    c = mix(c, cl, cov*0.82);
  }
  else {
    float t = (uGroundY - uCam.y)/d.y; vec3 g = uCam + d*t; vec2 q = g.xz;
    vec2 qs = vec2(q.x*0.05+q.y*0.02, q.y*0.07-q.x*0.02);
    float e = 0.6;
    float h0 = fbm(qs), hx = fbm(qs+vec2(e*0.05,-e*0.02)), hz = fbm(qs+vec2(e*0.02,e*0.07));
    float g0 = vn(q*2.4);
    vec3 Nn = normalize(vec3(-(hx-h0)*2.0 - (g0-.5)*0.05, 1., -(hz-h0)*2.0));
    vec3 sand = mix(uSand*0.85, uSand*1.1, fbm(q*0.3));
    float ndl = max(dot(Nn,uSunDir),0.);
    vec3 lit = sand*(uSunCol*ndl*0.9 + uAmbSky*0.9);
    float r = length(q);
    lit *= mix(0.15, 1., smoothstep(uIslandR, uIslandR+8., r));
    lit *= 1. - 0.5*smoothstep(26., 60., r);
    float fogF = 1.-exp(-t*0.011);
    c = mix(lit, uFogCol, fogF);
    c = mix(c, uSkyHor, smoothstep(-0.07, 0., d.y));
  }
  oCol = vec4(c,1.);
}`;

const VS_PART = `#version 300 es
layout(location=0) in vec4 aSeed;
uniform mat4 uVP; uniform float uTime, uMode, uPx, uTop;
out float vTw;
void main(){
  vec3 p;
  if (uMode < 0.5) { float a = aSeed.x + uTime*aSeed.w; p = vec3(cos(a)*aSeed.y, aSeed.z + sin(uTime*0.7 + aSeed.x*5.)*0.4, sin(a)*aSeed.y); vTw = 0.35 + 0.65*max(0., sin(uTime*1.6 + aSeed.x*9.)); }
  else { float u = fract(aSeed.x + uTime*aSeed.w); float a = aSeed.y + uTime*0.6; p = vec3(cos(a)*aSeed.z, -2.3 + u*uTop, sin(a)*aSeed.z); vTw = sin(u*3.14159); }
  vec4 c = uVP*vec4(p,1.); gl_Position = c; gl_PointSize = clamp(uPx*(uMode<0.5?26.:20.)/max(c.w,0.5), 2., 48.);
}`;
const FS_PART = `#version 300 es
precision highp float; in float vTw; uniform vec3 uCol; uniform float uInt; out vec4 oCol;
void main(){ float d = length(gl_PointCoord-0.5)*2.; float a = smoothstep(1.,0.,d); a *= a; oCol = vec4(uCol*a*vTw*uInt, 1.); }`;

const FS_BRIGHT = `#version 300 es
precision highp float; in vec2 vN; uniform sampler2D uTex; uniform float uThresh; out vec4 o;
void main(){ vec3 c = texture(uTex, vN*0.5+0.5).rgb; float l = max(c.r, max(c.g, c.b)); float k = max(l-uThresh, 0.)/max(l, 1e-4); o = vec4(c*k, 1.); }`;
const FS_BLUR = `#version 300 es
precision highp float; in vec2 vN; uniform sampler2D uTex; uniform vec2 uDir; out vec4 o;
void main(){ vec2 uv = vN*0.5+0.5; vec3 c = texture(uTex, uv).rgb*0.2270270270;
  c += texture(uTex, uv+uDir*1.3846153846).rgb*0.3162162162 + texture(uTex, uv-uDir*1.3846153846).rgb*0.3162162162;
  c += texture(uTex, uv+uDir*3.2307692308).rgb*0.0702702703 + texture(uTex, uv-uDir*3.2307692308).rgb*0.0702702703;
  o = vec4(c,1.); }`;
const FS_COMP = `#version 300 es
precision highp float; in vec2 vN; uniform sampler2D uScene, uB1, uB2; uniform float uBloom, uExposure, uTime; uniform vec3 uGrade; out vec4 o;
float hh(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 uv = vN*0.5+0.5;
  vec3 c = texture(uScene, uv).rgb + (texture(uB1, uv).rgb*0.6 + texture(uB2, uv).rgb*0.9)*uBloom;
  c *= uExposure;
  c = (c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14);
  c = clamp(c, 0., 1.);
  c = pow(c, vec3(1./2.2));
  c = mix(c, c*uGrade, 0.5);
  vec2 q = uv-0.5; c *= 1.-dot(q,q)*0.85;
  c += (hh(gl_FragCoord.xy + uTime)-0.5)/255.*1.6;
  o = vec4(c, 1.);
}`;

// ---------------------------------------------------------------- renderer
export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl; this.canvas = canvas;
    this.hdr = !!gl.getExtension('EXT_color_buffer_float');
    this.groups = []; this.particles = []; this.W = 0; this.H = 0; this.dpr = 1;
    this.P = {
      main: this.prog(VS_MAIN, FS_MAIN), shadow: this.prog(VS_SHADOW, FS_SHADOW), sky: this.prog(VS_FULL, FS_SKY), part: this.prog(VS_PART, FS_PART),
      bright: this.prog(VS_FULL, FS_BRIGHT), blur: this.prog(VS_FULL, FS_BLUR), comp: this.prog(VS_FULL, FS_COMP),
    };
    this.emptyVao = gl.createVertexArray();
    this.initShadow();
  }

  prog(vs, fs) {
    const gl = this.gl, mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`${t === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'} shader: ${gl.getShaderInfoLog(sh)}`); return sh; };
    const id = gl.createProgram(); gl.attachShader(id, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(id, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(id);
    if (!gl.getProgramParameter(id, gl.LINK_STATUS)) throw new Error(`Program link: ${gl.getProgramInfoLog(id)}`);
    return { id, loc: {} };
  }
  u(p, n, v) {
    const gl = this.gl; let loc = p.loc[n]; if (loc === undefined) loc = p.loc[n] = gl.getUniformLocation(p.id, n); if (loc === null) return;
    if (typeof v === 'number') gl.uniform1f(loc, v); else if (v.length === 3) gl.uniform3fv(loc, v); else if (v.length === 2) gl.uniform2fv(loc, v); else if (v.length === 16) gl.uniformMatrix4fv(loc, false, v);
  }
  ui(p, n, v) { const loc = this.gl.getUniformLocation(p.id, n); if (loc !== null) this.gl.uniform1i(loc, v); }

  initShadow() {
    const gl = this.gl, S = (this.shadowSize = 2048);
    this.shadowTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, S, S, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shadowFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  tex(w, h) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (this.hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, f, w, h };
  }

  resize(cssW, cssH, dpr) {
    const gl = this.gl, W = Math.max(2, Math.floor(cssW * dpr)), H = Math.max(2, Math.floor(cssH * dpr));
    this.dpr = dpr; this.cssW = cssW; this.cssH = cssH;
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H; this.canvas.width = W; this.canvas.height = H;
    for (const k of ['msaaFbo', 'msaaColor', 'msaaDepth']) if (this[k]) { k === 'msaaFbo' ? gl.deleteFramebuffer(this[k]) : gl.deleteRenderbuffer(this[k]); }
    for (const r of ['scene', 'bA', 'bB', 'cA', 'cB']) if (this[r]) { gl.deleteTexture(this[r].t); gl.deleteFramebuffer(this[r].f); }
    const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
    this.msaaFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaaFbo);
    this.msaaColor = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.msaaColor);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, this.hdr ? gl.RGBA16F : gl.RGBA8, W, H); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.msaaColor);
    this.msaaDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.msaaDepth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, W, H); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.msaaDepth);
    this.scene = this.tex(W, H);
    const hw = Math.max(2, W >> 1), hh = Math.max(2, H >> 1), qw = Math.max(2, W >> 2), qh = Math.max(2, H >> 2);
    this.bA = this.tex(hw, hh); this.bB = this.tex(hw, hh); this.cA = this.tex(qw, qh); this.cB = this.tex(qw, qh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  addGroup(mesh, o = {}) {
    if (mesh.empty) return null;
    const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.v), gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.idx), gl.STATIC_DRAW);
    const S = 64; [[0, 3, 0], [1, 3, 12], [2, 4, 24], [3, 4, 40], [4, 2, 56]].forEach(([i, n, off]) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, S, off); });
    gl.bindVertexArray(null);
    const g = { vao, vb, ib, count: mesh.idx.length, pass: o.pass || 'opaque', shadow: !!o.shadow, center: o.center || [0, 3, 0], tag: o.tag || '', dim: 1, hl: 0, occ: 0, model: IDENT.slice() };
    this.groups.push(g); return g;
  }
  removeTag(tag) { const gl = this.gl; this.groups = this.groups.filter((g) => { if (g.tag !== tag) return true; gl.deleteVertexArray(g.vao); gl.deleteBuffer(g.vb); gl.deleteBuffer(g.ib); return false; }); }

  addParticles(seeds, o) {
    const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(seeds), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    this.particles.push({ vao, n: seeds.length / 4, mode: o.mode, col: o.col, int: o.int ?? 1, top: o.top ?? 12 });
  }

  /** frame: { view, proj, eye, t, env, sunTarget } */
  render(F) {
    const gl = this.gl, P = this.P, env = F.env;
    const vp = M.mul(F.proj, F.view);
    // sun shadow matrix: ortho box around the model
    const sc = F.sunTarget || [0, 3, 0], sunEye = V.add(sc, V.mul(env.uSunDir, 40));
    const svp = M.mul(M.ortho(-15, 15, -15, 15, 5, 85), M.look(sunEye, sc, Math.abs(env.uSunDir[1]) > 0.98 ? [1, 0, 0] : [0, 1, 0]));

    // 1. shadow pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo); gl.viewport(0, 0, this.shadowSize, this.shadowSize);
    gl.colorMask(false, false, false, false); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4);
    gl.useProgram(P.shadow.id); this.u(P.shadow, 'uSVP', svp);
    for (const g of this.groups) if (g.shadow) { this.u(P.shadow, 'uModel', g.model); gl.bindVertexArray(g.vao); gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_INT, 0); }
    gl.disable(gl.POLYGON_OFFSET_FILL); gl.colorMask(true, true, true, true);

    // 2. main pass into the multisampled HDR buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaaFbo); gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const setEnv = (p) => { for (const k of ['uSunDir', 'uSunCol', 'uSkyTop', 'uSkyHor', 'uAmbSky', 'uAmbGnd', 'uFogCol', 'uSand']) this.u(p, k, env[k]); this.u(p, 'uFog', env.uFog); this.u(p, 'uNight', env.uNight); this.u(p, 'uTime', F.t); };
    // sky + desert
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.useProgram(P.sky.id); setEnv(P.sky);
    this.u(P.sky, 'uInvVP', M.inv(vp)); this.u(P.sky, 'uCam', F.eye); this.u(P.sky, 'uGroundY', env.groundY); this.u(P.sky, 'uIslandR', env.islandR);
    gl.bindVertexArray(this.emptyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    // scene
    gl.useProgram(P.main.id); setEnv(P.main);
    this.u(P.main, 'uVP', vp); this.u(P.main, 'uSVP', svp); this.u(P.main, 'uCam', F.eye); this.u(P.main, 'uFocus', F.focus || [0, -99, 0]); this.u(P.main, 'uCut', F.focus ? 1 : 0); this.u(P.main, 'uShadowTexel', 1 / this.shadowSize);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex); this.ui(P.main, 'uShadow', 0);
    const draw = (g, back) => { this.u(P.main, 'uModel', g.model); this.u(P.main, 'uDim', g.dim); this.u(P.main, 'uHL', g.hl); this.u(P.main, 'uOcc', g.occ); this.u(P.main, 'uPassBack', back); gl.bindVertexArray(g.vao); gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_INT, 0); };
    gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    for (const g of this.groups) if (g.pass === 'opaque' || g.pass === 'foliage') draw(g, 0);
    // glass: far → near, back faces then front faces
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    const glassG = this.groups.filter((g) => g.pass === 'glass').map((g) => ({ g, d: Math.hypot(g.center[0] - F.eye[0], g.center[1] - F.eye[1], g.center[2] - F.eye[2]) })).sort((a, b) => b.d - a.d);
    for (const { g } of glassG) { draw(g, 1); draw(g, 0); }
    // additive light
    gl.blendFunc(gl.ONE, gl.ONE);
    for (const g of this.groups) if (g.pass === 'additive') draw(g, 0);
    gl.useProgram(P.part.id); this.u(P.part, 'uVP', vp); this.u(P.part, 'uTime', F.t); this.u(P.part, 'uPx', this.dpr);
    for (const p of this.particles) { this.u(P.part, 'uMode', p.mode); this.u(P.part, 'uTop', p.top); this.u(P.part, 'uCol', p.col); this.u(P.part, 'uInt', p.int * (p.mode === 0 ? env.fireflies : 1)); gl.bindVertexArray(p.vao); gl.drawArrays(gl.POINTS, 0, p.n); }
    gl.depthMask(true); gl.disable(gl.BLEND);

    // 3. resolve MSAA, bloom, composite
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msaaFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.scene.f);
    gl.blitFramebuffer(0, 0, this.W, this.H, 0, 0, this.W, this.H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(this.emptyVao);
    const pass = (prog, target, setup) => { gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null); gl.viewport(0, 0, target ? target.w : this.W, target ? target.h : this.H); gl.useProgram(prog.id); setup(); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    const bindTex = (t, unit) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t.t); };
    pass(P.bright, this.bA, () => { bindTex(this.scene, 0); this.ui(P.bright, 'uTex', 0); this.u(P.bright, 'uThresh', env.bloomThresh); });
    const blur = (src, tmp, dstA) => {
      pass(P.blur, tmp, () => { bindTex(src, 0); this.ui(P.blur, 'uTex', 0); this.u(P.blur, 'uDir', [1 / src.w, 0]); });
      pass(P.blur, dstA, () => { bindTex(tmp, 0); this.ui(P.blur, 'uTex', 0); this.u(P.blur, 'uDir', [0, 1 / tmp.h]); });
    };
    blur(this.bA, this.bB, this.bA); blur(this.bA, this.bB, this.bA);
    // quarter-res chain from the half-res blur
    pass(P.blur, this.cA, () => { bindTex(this.bA, 0); this.ui(P.blur, 'uTex', 0); this.u(P.blur, 'uDir', [1 / this.bA.w, 0]); });
    blur(this.cA, this.cB, this.cA); blur(this.cA, this.cB, this.cA);
    pass(P.comp, null, () => {
      bindTex(this.scene, 0); this.ui(P.comp, 'uScene', 0); bindTex(this.bA, 1); this.ui(P.comp, 'uB1', 1); bindTex(this.cA, 2); this.ui(P.comp, 'uB2', 2);
      this.u(P.comp, 'uBloom', env.bloom); this.u(P.comp, 'uExposure', env.exposure); this.u(P.comp, 'uTime', F.t % 100); this.u(P.comp, 'uGrade', env.grade);
    });
    gl.bindVertexArray(null); gl.activeTexture(gl.TEXTURE0);
    return vp;
  }

  dispose() {
    try { this.gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
  }
}

const L_ = (h, k = 1) => lin(hex(h)).map((x) => x * k);
const PRESET = {
  night: { uSunCol: [0.3, 0.36, 0.52], uSkyTop: L_('#02050d'), uSkyHor: L_('#18213b'), uAmbSky: [0.035, 0.05, 0.1], uAmbGnd: [0.03, 0.025, 0.03], uFogCol: L_('#101828'), uSand: [0.14, 0.13, 0.16], uFog: 0.005, uNight: 1, fireflies: 1.2, exposure: 1.25, bloom: 1.0, bloomThresh: 0.8, grade: [0.98, 1.0, 1.08] },
  dawn: { uSunCol: [2.1, 1.35, 1.0], uSkyTop: L_('#35558a'), uSkyHor: L_('#f2a67c'), uAmbSky: [0.17, 0.19, 0.31], uAmbGnd: [0.14, 0.1, 0.09], uFogCol: L_('#9d8f9f'), uSand: [0.55, 0.42, 0.33], uFog: 0.004, uNight: 0.12, fireflies: 0.4, exposure: 1.0, bloom: 0.6, bloomThresh: 1.05, grade: [1.04, 1.0, 1.0] },
  day: { uSunCol: [2.7, 2.42, 2.0], uSkyTop: L_('#2f6fcf'), uSkyHor: L_('#b9d0e6'), uAmbSky: [0.3, 0.39, 0.56], uAmbGnd: [0.26, 0.21, 0.16], uFogCol: L_('#a9bccd'), uSand: [0.62, 0.48, 0.32], uFog: 0.0024, uNight: 0, fireflies: 0.25, exposure: 0.86, bloom: 0.28, bloomThresh: 1.35, grade: [1.03, 1.0, 0.97] },
  dusk: { uSunCol: [2.3, 1.25, 0.7], uSkyTop: L_('#0b1a3d'), uSkyHor: L_('#dc7f52', 0.9), uAmbSky: [0.08, 0.13, 0.29], uAmbGnd: [0.09, 0.06, 0.05], uFogCol: L_('#2c3752'), uSand: [0.4, 0.31, 0.25], uFog: 0.0042, uNight: 0.65, fireflies: 1, exposure: 1.05, bloom: 0.85, bloomThresh: 0.95, grade: [1.04, 1.0, 1.06] },
};
const KEYS = [[0, 'night'], [5.4, 'night'], [6.4, 'dawn'], [8.2, 'day'], [16.3, 'day'], [17.6, 'dusk'], [18.7, 'night'], [24, 'night']];
const MOON = V.norm([-0.35, 0.62, -0.7]);
/** Sky, sun and light for a local clock hour (0–24): sunrise about 06:15, sunset about 17:45, a moon at night. */
export function skyAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let k = 0; while (k < KEYS.length - 2 && h >= KEYS[k + 1][0]) k++;
  const [h0, a] = KEYS[k], [h1, b] = KEYS[k + 1], f = h1 > h0 ? Math.min(1, Math.max(0, (h - h0) / (h1 - h0))) : 0, s = f * f * (3 - 2 * f);
  const A = PRESET[a], B = PRESET[b], out = {};
  for (const key of Object.keys(A)) out[key] = Array.isArray(A[key]) ? A[key].map((x, i) => x + (B[key][i] - x) * s) : A[key] + (B[key] - A[key]) * s;
  const nightW = (a === 'night' ? 1 - s : 0) + (b === 'night' ? s : 0);
  const t = Math.min(1, Math.max(0, (h - 6.2) / (17.8 - 6.2))), elev = 0.07 + 0.86 * Math.sin(Math.PI * t), az = ((-125 + 130 * t) * Math.PI) / 180;
  const sun = [Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az)];
  out.uSunDir = V.norm(V.lerp(sun, MOON, nightW));
  out.groundY = -3.8; out.islandR = 8.4; out.hour = h; out.isNight = nightW > 0.5;
  return out;
}

/** environment presets, colours supplied in sRGB and converted to linear here */
export function environment(light) {
  const L = (h, k = 1) => lin(hex(h)).map((x) => x * k);
  if (!light) return {
    uSunDir: V.norm([0.5, 0.2, -0.62]), uSunCol: [2.3, 1.25, 0.7], uSkyTop: L('#0b1a3d'), uSkyHor: L('#dc7f52', 0.9), uAmbSky: [0.08, 0.13, 0.29], uAmbGnd: [0.09, 0.06, 0.05],
    uFogCol: L('#2c3752'), uSand: [0.4, 0.31, 0.25], uFog: 0.0042, uNight: 0.65, fireflies: 1, exposure: 1.05, bloom: 0.85, bloomThresh: 0.95, grade: [1.04, 1.0, 1.06], groundY: -3.8, islandR: 8.4,
  };
  return {
    uSunDir: V.norm([0.5, 0.58, -0.5]), uSunCol: [2.5, 2.28, 1.95], uSkyTop: L('#4d86d6'), uSkyHor: L('#d7e3ee'), uAmbSky: [0.34, 0.43, 0.6], uAmbGnd: [0.28, 0.24, 0.19],
    uFogCol: L('#cfd9e2'), uSand: [0.66, 0.52, 0.35], uFog: 0.0035, uNight: 0, fireflies: 0.35, exposure: 0.9, bloom: 0.3, bloomThresh: 1.3, grade: [1.02, 1.0, 0.98], groundY: -3.8, islandR: 8.4,
  };
}
