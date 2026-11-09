// The Tower — the venture pipeline as a living, high-tech building, rendered in real time with WebGL2.
// Six stage floors rise from a seed vault in the soil to a lotus crown; every other module of the empire is a
// pavilion around the base, joined to the floors it powers by glowing sky-bridges. Layers show what needs you,
// what is done and how far the empire has come; the sky follows your local clock.
import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, compact, fnum, toast, confirmBox, copyText, today, fmtDate } from '../ui.js';
import { RUBRIC } from '../seed.js';
import { FLOW, STAGE_INFO, readiness, nextStage, prevStage } from '../gates.js';
import { Renderer, skyAt, M, V, TAU } from '../gl.js';
import * as T from '../tower-scene.js';
import { game, LEVELS } from '../empire-game.js';
import { fxWarning, procureAlerts } from '../procure-data.js';

const { STAGE_COLOR, STAGE_NAME, GROUPS, SEV_COLOR } = T;
const MODULES = T.ALL_DEFS;
export const LAYERS = [['pipeline', 'Pipeline'], ['attention', 'Needs you'], ['progress', 'Done'], ['game', 'Empire']];
const SKIES = [['live', 'Live sky'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']];

// ---------- Model ----------
const CAM0 = { base: 0.35, pitch: 0.2, zoom: 1, zoomT: 1, ty: 4.2, auto: true, swayAmp: 0.8, phase: 0 };
let cam = { ...CAM0, tt: [0, 4.2, 0], tc: [0, 4.2, 0] };
let selected = { kind: 'core', id: null };
let loop = null;
let wikiCount = 0;
let ptab = 'needs';
let curSc = null;
const tw = () => store.get().settings.tower || { sky: 'live', layer: 'pipeline' };

function gameCtx(s) {
  return { today: today(), deadlines: store.deadlines(14), wealth: store.wealth(), wikiCount, fxWarning: fxWarning(s), procureAlerts: procureAlerts(s) };
}

function buildScene(s) {
  const ventures = [], perStage = {};
  for (const v of s.ventures) {
    const st = FLOW.includes(v.stage) ? v.stage : 'Parked';
    const n = (perStage[st] = (perStage[st] || 0) + 1) - 1;
    let pos;
    if (st === 'Parked') { const a = n * 1.25; pos = [Math.cos(a) * 0.62, -2.75 + (n > 4 ? 0.4 : 0), Math.sin(a) * 0.62]; }
    else {
      const i = FLOW.indexOf(st), ring = n % 6, tier = Math.floor(n / 6), a = i * 0.9 + ring * (TAU / 6) + T.twist(T.floorY(i));
      pos = [Math.cos(a) * 1.1, T.floorY(i) + 0.62 + tier * 0.55, Math.sin(a) * 1.1];
    }
    ventures.push({ kind: 'venture', id: v.id, v, stage: st, pos, score: store.ventureScore(v, RUBRIC), ready: readiness(v), color: STAGE_COLOR[st] });
  }
  const modules = MODULES.map((m) => ({ ...m, kind: 'module', id: m.k, color: GROUPS[m.group].color, base: T.polar(m.deg, m.r) }));
  const G = game(s, gameCtx(s));
  const sc = { ventures, modules, modIdx: Object.fromEntries(modules.map((m) => [m.k, m])), core: { kind: 'core', id: 'core' }, G };
  sc.stat = (o) => (o.kind === 'module' ? G.module(o.id) : o.kind === 'venture' ? G.venture(o.id) : o.kind === 'stage' ? G.stage(o.id, ventures.filter((x) => x.stage === o.id).map((x) => x.id)) : { needs: G.attention, done: G.events, xp: G.xp });
  return sc;
}

/** Links specific to one venture: which modules it touches right now. */
function ventureLinks(sc, vn) {
  const v = vn.v, s = store.get(), out = [];
  const add = (k, why) => { if (sc.modIdx[k]) out.push({ from: vn, to: sc.modIdx[k], why }); };
  if (s.queue.some((q) => q.venture === v.id)) add('claude', 'Research commissioned');
  if (v.entity) add('legal', `Entity: ${v.entity}`);
  if (v.entity && s.journal.some((j) => j.entity === v.entity)) add('finance', 'Books open');
  if (s.decisions.some((d) => `${d.title} ${d.context || ''}`.toLowerCase().includes(v.name.toLowerCase()))) add('math', 'Decision logged');
  if (+v.capitalRequired > 0) add('treasury', `Needs ${compact(+v.capitalRequired, store.base())}`);
  const rf = (s.rfqs || []).filter((r) => r.venture === v.id).length, po = (s.orders || []).filter((o) => o.venture === v.id).length;
  if (rf || po) add('procure', [rf && `${rf} request${rf === 1 ? '' : 's'}`, po && `${po} order${po === 1 ? '' : 's'}`].filter(Boolean).join(' · '));
  if (v.id === 'v_amazon' && (s.products || []).length) add('commerce', `${s.products.length} product lead${s.products.length === 1 ? '' : 's'}`);
  return out;
}

/** Which elements carry a beacon in the current layer, and how urgent each is. */
function beaconItems(sc, layer) {
  if (layer !== 'attention' && layer !== 'progress') return [];
  const out = [], maxSev = (arr) => arr.reduce((a, n) => Math.max(a, n.sev), 0);
  for (const m of sc.modules) {
    const st = sc.G.module(m.k);
    if (layer === 'attention' && st.needs.length) out.push({ kind: 'module', id: m.k, sev: maxSev(st.needs) });
    if (layer === 'progress' && st.done.length) out.push({ kind: 'module', id: m.k, sev: 0 });
  }
  for (const stg of ['Parked', ...FLOW]) {
    const st = sc.stat({ kind: 'stage', id: stg });
    if (layer === 'attention' && st.needs.length) out.push({ kind: 'stage', id: stg, sev: maxSev(st.needs) });
    if (layer === 'progress' && st.done.length) out.push({ kind: 'stage', id: stg, sev: 0 });
  }
  for (const vn of sc.ventures) {
    const st = sc.G.venture(vn.id);
    if (layer === 'attention' && st.needs.length) out.push({ kind: 'venture', id: vn.id, sev: maxSev(st.needs), pos: vn.pos });
    if (layer === 'progress' && st.done.length) out.push({ kind: 'venture', id: vn.id, sev: 0, pos: vn.pos });
  }
  return out;
}

const localHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
const skyHour = (mode) => (mode === 'day' ? 12.5 : mode === 'dusk' ? 17.55 : mode === 'night' ? 22 : localHour());

// ---------- ray picking ----------
function raySphere(o, d, c, r) { const oc = V.sub(o, c), b = V.dot(oc, d), cc = V.dot(oc, oc) - r * r, h = b * b - cc; if (h < 0) return null; const t = -b - Math.sqrt(h); return t > 0 ? t : (-b + Math.sqrt(h) > 0 ? -b + Math.sqrt(h) : null); }
function rayCyl(o, d, cx, cz, r, y0, y1) {
  const ox = o[0] - cx, oz = o[2] - cz, a = d[0] * d[0] + d[2] * d[2]; if (a < 1e-9) return null;
  const b = 2 * (ox * d[0] + oz * d[2]), c = ox * ox + oz * oz - r * r, disc = b * b - 4 * a * c; if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) { if (t <= 0) continue; const y = o[1] + d[1] * t; if (y >= y0 && y <= y1) return t; }
  return null;
}

// ---------- Renderer ----------
function start(canvas, overlay, panel) {
  if (loop) loop.stop();
  const stage = canvas.parentElement;
  let R;
  try { R = new Renderer(canvas); } catch (e) {
    console.warn('The Tower needs WebGL2:', e);
    overlay.remove(); canvas.remove();
    stage.insertAdjacentHTML('afterbegin', `<div class="eng-fallback"><b>The 3D tower needs WebGL 2.</b><br><span class="small muted">Your browser or device could not start it. Everything else on this page still works: the empire level, what needs you, the gates and the readiness table.</span></div>`);
    let sc0 = buildScene(store.get()); curSc = sc0; panel.innerHTML = panelHTML(sc0);
    loop = { stop() {}, refresh() { sc0 = buildScene(store.get()); curSc = sc0; panel.innerHTML = panelHTML(sc0); }, select(s) { selected = s; panel.innerHTML = panelHTML(sc0); }, setLayer() { panel.innerHTML = panelHTML(sc0); }, panel() { panel.innerHTML = panelHTML(sc0); } };
    return;
  }
  const reg = T.buildStatic(R);
  window.__dcTower = { cam: () => cam, select: (x) => loop?.select(x), sc: () => curSc, R };
  const ctx = overlay.getContext('2d');
  const root = document.documentElement;
  let sc = buildScene(store.get()), refs = null, vp = new Float32Array(16), view = new Float32Array(16);
  curSc = sc;
  let W = 0, H = 0, dpr = 1, colW = 168, hits = [], hover = null, running = true, lastInteract = 0;
  let light = false, env = skyAt(skyHour(tw().sky)), theme = { text: '#e8e6e0', muted: '#8b93a0' };
  let perks = T.buildPerks(R, sc.G.level.n), perkLevel = sc.G.level.n, beacons = [];
  const t0 = performance.now(); let last = t0;
  const drag = { on: false, x: 0, y: 0, moved: 0, pinch: 0 };
  const pointers = new Map();

  function readTheme() {
    light = root.dataset.theme === 'light';
    const cs = getComputedStyle(root);
    theme = { text: cs.getPropertyValue('--text').trim() || (light ? '#1a1a1a' : '#e8e6e0'), muted: cs.getPropertyValue('--muted').trim() || '#8b93a0' };
  }
  readTheme();

  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(2, r.width); H = Math.max(2, r.height); dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    colW = W < 620 ? 112 : 168;
    R.resize(W, H, dpr);
    overlay.width = Math.floor(W * dpr); overlay.height = Math.floor(H * dpr);
  }
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();

  function rebuildDynamic() {
    const vn = selected.kind === 'venture' ? sc.ventures.find((x) => x.id === selected.id) : null;
    const links = vn ? ventureLinks(sc, vn).map((L) => ({ from: L.from, to: { k: L.to.k }, why: L.why, mod: L.to })) : [];
    refs = T.buildVentures(R, sc, links);
    refs.linkMeta = links;
    beacons = T.buildBeacons(R, beaconItems(sc, tw().layer));
    if (sc.G.level.n !== perkLevel) { perks = T.buildPerks(R, sc.G.level.n); perkLevel = sc.G.level.n; }
  }
  rebuildDynamic();

  const ease = (g, dim, hl, k) => { if (!g) return; g.dim += (dim - g.dim) * k; g.hl += (hl - g.hl) * k; };

  function frame(now) {
    if (!running) return;
    if (!canvas.isConnected) { stop(); return; }
    const dt = Math.max(0, Math.min(64, now - last)); last = now; const t = Math.max(0, now - t0) / 1000, k = 1 - Math.exp(-dt * 0.008);
    if ((root.dataset.theme === 'light') !== light) readTheme();
    env = skyAt(skyHour(tw().sky));
    const layer = tw().layer;

    // ---- camera
    if (cam.auto && !drag.on && now - lastInteract > 3500) cam.phase += dt * 0.00022;
    cam.zoom += (cam.zoomT - cam.zoom) * (1 - Math.exp(-dt * 0.005));
    for (let i = 0; i < 3; i++) cam.tc[i] += (cam.tt[i] - cam.tc[i]) * (1 - Math.exp(-dt * 0.005));
    const yaw = cam.base + Math.sin(cam.phase) * cam.swayAmp * (cam.auto ? 1 : 0);
    const fov = (34 * Math.PI) / 180, aspEff = Math.max(0.3, (W - colW) / H);
    const fit = Math.max(21 / (2 * Math.tan(fov / 2)), 23 / (2 * Math.tan(fov / 2) * aspEff));
    const dist = fit * cam.zoom, cp = Math.cos(cam.pitch), eye = [cam.tc[0] + dist * cp * Math.cos(yaw), cam.tc[1] + dist * Math.sin(cam.pitch), cam.tc[2] + dist * cp * Math.sin(yaw)];
    view = M.look(eye, cam.tc, [0, 1, 0]);
    const proj = M.shiftX(M.persp(fov, W / H, 0.5, 220), -colW / W);

    // ---- focus state and uniforms
    const sel = selected;
    const selVenture = sel.kind === 'venture' ? sc.ventures.find((x) => x.id === sel.id) : null;
    const focusMod = sel.kind === 'module' ? sc.modIdx[sel.id] : null;
    const focusStage = sel.kind === 'stage' ? sel.id : null;
    const vlinks = selVenture ? ventureLinks(sc, selVenture) : [];
    const any = !!(focusMod || focusStage || selVenture);
    const isSel = (o) => sel.kind === o.kind && sel.id === o.id;
    const isHov = (o) => hover && hover.kind === o.kind && hover.id === o.id;
    const hlOf = (o) => (isSel(o) ? 1 : isHov(o) ? 0.55 : 0);
    const flagged = new Set(beacons.map((b) => `${b.kind}:${b.id}`));
    const layerDim = (kind, id) => ((layer === 'attention' || layer === 'progress') && !any ? (flagged.has(`${kind}:${id}`) ? 1 : 0.5) : 1);
    const floorFocus = (st) => (focusStage ? (focusStage === st ? 1 : 0.35) : focusMod ? (focusMod.feeds.includes(st) ? 1 : 0.35) : selVenture ? (selVenture.stage === st ? 1 : 0.4) : layerDim('stage', st));
    const modLit = (m) => (!any ? layerDim('module', m.k) > 0.6 : focusMod === m || (focusStage && m.feeds.includes(focusStage)) || (selVenture && vlinks.some((L) => L.to === m)));
    const count = (st) => sc.ventures.filter((x) => x.stage === st).length;

    FLOW.forEach((st, i) => { const o = { kind: 'stage', id: st }, d = floorFocus(st), h = hlOf(o), occ = count(st) > 0 ? 0.9 : 0.1; for (const g of reg.floors[i]) { ease(g, d, h, k); g.occ += (occ - g.occ) * k; } });
    if (reg.exo) ease(reg.exo, any ? 0.8 : 1, 0, k);
    for (const g of reg.crown) ease(g, floorFocus('Scale'), hlOf({ kind: 'stage', id: 'Scale' }), k);
    const vo = { kind: 'stage', id: 'Parked' }; for (const g of reg.vault) ease(g, focusStage && focusStage !== 'Parked' ? 0.5 : 1, hlOf(vo), k);
    for (const m of sc.modules) for (const g of reg.modules[m.k] || []) ease(g, modLit(m) ? 1 : 0.35, hlOf(m), k);
    for (const b of reg.bridges) { const m = sc.modIdx[b.m], on = (focusMod && focusMod === m) || (focusStage && focusStage === b.st); ease(b.g, on ? 1 : any ? 0.12 : 0.55, on ? 1 : 0, k); }
    for (const my of reg.myc) { const on = focusMod && (focusMod.k === my.from || focusMod.k === my.to); ease(my.g, on ? 1 : any ? 0.2 : 0.6, on ? 1 : 0, k); }
    for (const vn of sc.ventures) { const g = refs.pods[vn.id]; if (g) ease(g, focusMod || (focusStage && vn.stage !== focusStage) ? 0.5 : layerDim('venture', vn.id) > 0.6 ? 1 : 0.55, hlOf(vn), k); }
    for (const l of refs.links) ease(l.g, 1, 0.3, k);
    for (const b of beacons) { const sp = b.sev >= 3 ? 5 : b.sev === 2 ? 3 : 1.6, amp = b.sev >= 3 ? 0.45 : b.sev === 2 ? 0.3 : 0.15; for (const g of b.groups) { g.dim = 1 - amp + amp * Math.sin(t * sp); g.hl = isSel(b) ? 1 : 0; } }
    if (perks.skyline) perks.skyline.occ = Math.min(1, 0.22 + 0.1 * sc.G.level.n);

    try { vp = R.render({ view, proj, eye, t, env, sunTarget: [0, 3, 0] }); } catch (e) { console.error(e); stop(); return; }
    drawOverlay(t, view, { any, isSel, isHov, floorFocus, modLit, count, focusMod, focusStage, selVenture, vlinks, layer });
    overlay.style.cursor = hover ? 'pointer' : drag.on ? 'grabbing' : 'grab';
    requestAnimationFrame(frame);
  }

  // ---------- 2D overlay: labels, stage column, HUD ----------
  function fitText(s, max) { if (ctx.measureText(s).width <= max) return s; let n = s.length; while (n > 3 && ctx.measureText(s.slice(0, n) + '…').width > max) n--; return s.slice(0, n) + '…'; }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function pill(text, x, y, { size = 11, weight = 600, alpha = 1, hit = null } = {}) {
    ctx.globalAlpha = alpha; ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 14; ctx.fillStyle = light ? 'rgba(255,255,255,0.8)' : 'rgba(8,13,22,0.7)'; rrect(x - w / 2, y - size * 0.95, w, size * 1.9, 6); ctx.fill();
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = theme.text; ctx.fillText(text, x, y); ctx.globalAlpha = 1;
    if (hit) hits.push({ o: { kind: hit.kind, id: hit.id }, test: (px, py) => Math.abs(px - x) < w / 2 && Math.abs(py - y) < size });
    return w;
  }
  function badge(x, y, text, color, pulse = 0) {
    ctx.font = '700 10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.max(16, ctx.measureText(text).width + 9);
    if (pulse) { ctx.globalAlpha = 0.35 * pulse; ctx.fillStyle = color; rrect(x - w / 2 - 3, y - 11, w + 6, 22, 11); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = color; rrect(x - w / 2, y - 8, w, 16, 8); ctx.fill();
    ctx.fillStyle = '#0b0f16'; ctx.fillText(text, x, y + 0.5);
  }
  const sevOf = (arr) => arr.reduce((a, n) => Math.max(a, n.sev), 0);
  function layerBadge(o, x, y, t, layer) {
    if (layer === 'pipeline') return;
    const st = sc.stat(o);
    if (layer === 'attention' && st.needs.length) { const sv = sevOf(st.needs); badge(x, y, String(st.needs.length), SEV_COLOR[sv], sv >= 3 ? 0.5 + 0.5 * Math.sin(t * 5) : 0); }
    else if (layer === 'progress' && st.done.length) badge(x, y, `✓ ${st.done.length}`, SEV_COLOR[0]);
    else if (layer === 'game' && st.xp) badge(x, y, `${fnum(st.xp, 0)} XP`, '#e2c477');
  }
  function drawOverlay(t, view, F) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); hits = [];
    const P = (p) => M.project(vp, p, W, H);
    // module names — nudged apart so they never pile up, with leaders back to their pavilions
    {
      const items = [];
      ctx.font = `600 ${W < 620 ? 10 : 11.5}px Inter, system-ui, sans-serif`;
      for (const m of sc.modules) { const a = P([m.base[0], T.modTopY(m) + 0.9, m.base[2]]); if (!a) continue; items.push({ m, ax: a.x, ay: a.y, x: a.x, y: a.y, w: ctx.measureText(m.label).width + 14 + (F.layer !== 'pipeline' ? 26 : 0), h: 22 }); }
      for (let it = 0; it < 60; it++) for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j], ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = a.h + 3 - Math.abs(a.y - b.y);
        if (ox > 0 && oy > 0) { const d = (a.y <= b.y ? 1 : -1) * oy / 2; a.y -= d; b.y += d; }
      }
      for (const a of items) {
        a.x = Math.max(a.w / 2 + 6, Math.min(W - colW - 8 - a.w / 2, a.x)); a.y = Math.max(122, Math.min(H - 54, a.y));
        const moved = Math.hypot(a.x - a.ax, a.y - a.ay) > 10;
        if (moved) { ctx.strokeStyle = a.m.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.ax, a.ay + 6); ctx.lineTo(a.x, a.y + 4); ctx.stroke(); ctx.fillStyle = a.m.color; ctx.beginPath(); ctx.arc(a.ax, a.ay + 6, 2.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        const pw = pill(a.m.label, a.x - (F.layer !== 'pipeline' ? 12 : 0), a.y, { size: W < 620 ? 10 : 11.5, alpha: F.modLit(a.m) ? 1 : 0.45, hit: a.m });
        layerBadge(a.m, a.x - 12 + pw / 2 + 14, a.y, t, F.layer);
      }
    }
    // venture link captions and pod badges
    for (const L of F.vlinks) { const a = P(L.from.pos), b = P([L.to.base[0], T.modBodyTop(L.to) + 0.2, L.to.base[2]]); if (a && b) pill(L.why, (a.x + b.x) / 2, (a.y + b.y) / 2 - 10, { size: 10, weight: 500 }); }
    // stage column
    const right = [view[0], view[4], view[8]], order = ['Parked', ...FLOW], colX = W - colW + 4, rows = [];
    for (const st of order) {
      const vs = sc.ventures.filter((x) => x.stage === st), midY = T.stageMidY(st), rr = st === 'Parked' ? 1.1 : T.rad(midY) + 0.7;
      const a = P([0, midY, 0]), e = P([right[0] * rr, midY, right[2] * rr]); if (!a || !e) continue;
      rows.push({ st, vs, desired: a.y, h: 20 + vs.length * 14, edge: e });
    }
    { const g = ctx.createLinearGradient(colX - 30, 0, colX + 40, 0); g.addColorStop(0, 'rgba(6,10,18,0)'); g.addColorStop(1, light ? 'rgba(255,255,255,0.5)' : env.uNight < 0.3 ? 'rgba(8,13,22,0.4)' : 'rgba(6,10,18,0.62)'); ctx.fillStyle = g; ctx.fillRect(colX - 30, 0, W - colX + 30, H); }
    let yPrev = H - 8;
    for (const rw of rows) { rw.y = Math.min(rw.desired, yPrev - rw.h + 8); yPrev = rw.y - 12; }
    const shift = rows.length ? Math.max(0, 16 - (rows[rows.length - 1].y - 8)) : 0; if (shift) rows.forEach((rw) => { rw.y += shift; });
    for (const rw of rows) {
      const st = rw.st, col = STAGE_COLOR[st], o = { kind: 'stage', id: st }, on = F.isSel(o) || F.isHov(o), ff = st === 'Parked' ? 1 : F.floorFocus(st), al = Math.max(0.5, ff);
      ctx.strokeStyle = col; ctx.globalAlpha = (on ? 0.85 : 0.3) * al; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(rw.edge.x, rw.edge.y); ctx.lineTo(colX - 8, rw.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = al; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(colX - 4, rw.y, on ? 3.5 : 2.5, 0, TAU); ctx.fill();
      const head = `${st === 'Parked' ? '' : String(FLOW.indexOf(st) + 1).padStart(2, '0') + '  '}${st === 'Parked' ? 'SEED VAULT' : st.toUpperCase()}`;
      ctx.font = '700 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(head, colX + 4, rw.y);
      const hw = ctx.measureText(head).width; ctx.font = '500 10px Inter, system-ui, sans-serif'; ctx.fillStyle = theme.muted;
      if (W >= 620 && F.layer === 'pipeline') ctx.fillText(st === 'Parked' ? 'parked' : STAGE_NAME[st], colX + 4 + hw + 6, rw.y);
      ctx.globalAlpha = 1;
      if (F.layer !== 'pipeline') { const sv = sc.stat(o); if ((F.layer === 'attention' && sv.needs.length) || (F.layer === 'progress' && sv.done.length) || (F.layer === 'game' && sv.xp)) layerBadge(o, Math.min(W - 24, colX + 4 + hw + 22), rw.y, t, F.layer); }
      hits.push({ o, test: (x, y) => x >= colX - 8 && x <= W - 2 && Math.abs(y - rw.y) < 9 });
      rw.vs.forEach((vn, i) => {
        const y = rw.y + 15 + i * 14, ov = { kind: 'venture', id: vn.id }, s2 = F.isSel(vn) || F.isHov(vn);
        const needs = F.layer === 'attention' ? sc.G.venture(vn.id).needs : [];
        ctx.globalAlpha = al; ctx.fillStyle = needs.length ? SEV_COLOR[sevOf(needs)] : '#e2c477'; ctx.beginPath(); ctx.arc(colX + 8, y, s2 ? 3.2 : 2.4, 0, TAU); ctx.fill();
        ctx.font = `${s2 ? 700 : 500} 11px Inter, system-ui, sans-serif`; ctx.fillStyle = s2 ? theme.text : theme.muted; ctx.fillText(fitText(vn.v.name, W - colX - 28), colX + 16, y); ctx.globalAlpha = 1;
        hits.push({ o: ov, test: (x, yy) => x >= colX && x <= W - 2 && Math.abs(yy - y) < 7 });
      });
    }
    // HUD frame corners
    const ink = light ? 'rgba(30,30,30,0.5)' : 'rgba(210,230,240,0.45)', m = 10, Lc = 14;
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
    for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + dy * Lc); ctx.lineTo(x, y); ctx.lineTo(x + dx * Lc, y); ctx.stroke(); }
    const live = sc.ventures.filter((x) => x.stage !== 'Parked'), ready = live.filter((x) => x.ready.pct >= 1 && nextStage(x.stage)).length;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#e2c477'; ctx.font = '700 10px Inter, system-ui, sans-serif'; ctx.fillText('DE CASTRO  ·  LIVING TOWER', 22, 20);
    ctx.fillStyle = theme.muted; ctx.font = '500 10px Inter, system-ui, sans-serif';
    const hr = env.hour, clock = `${String(Math.floor(hr)).padStart(2, '0')}:${String(Math.floor((hr % 1) * 60)).padStart(2, '0')}`;
    ctx.fillText(`${live.length} live · ${ready} ready to rise · ${tw().sky === 'live' ? `sky at ${clock}` : `${tw().sky} sky`}`, 22, 35);
    // empire level card
    {
      const G = sc.G, lv = G.level, x = 18, y = 54, w = Math.min(236, W - colW - 40), h = 58;
      ctx.fillStyle = light ? 'rgba(255,255,255,0.82)' : 'rgba(8,13,22,0.72)'; rrect(x, y, w, h, 9); ctx.fill();
      ctx.strokeStyle = 'rgba(226,196,119,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#e2c477'; ctx.font = '800 15px Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText(String(lv.n), x + 12, y + 15);
      ctx.fillStyle = theme.text; ctx.font = '700 11px Inter, system-ui, sans-serif'; ctx.fillText(fitText(`LEVEL ${lv.n} · ${lv.title.toUpperCase()}`, w - 40), x + 30, y + 15);
      const bx = x + 12, bw = w - 24, by = y + 30;
      ctx.fillStyle = light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'; rrect(bx, by - 3, bw, 6, 3); ctx.fill();
      const g2 = ctx.createLinearGradient(bx, 0, bx + bw, 0); g2.addColorStop(0, '#c9a54c'); g2.addColorStop(1, '#ffe39a'); ctx.fillStyle = g2; rrect(bx, by - 3, Math.max(6, bw * lv.p), 6, 3); ctx.fill();
      ctx.font = '500 10px Inter, system-ui, sans-serif'; ctx.fillStyle = theme.muted;
      ctx.fillText(fitText(`${fnum(G.xp, 0)}${lv.next ? ` / ${fnum(lv.next, 0)}` : ''} XP · ${G.streak.weeks}-week streak · +${fnum(G.weekXP, 0)} this week`, w - 24), x + 12, y + 45);
      hits.push({ o: { kind: 'core', id: null, game: true }, test: (px, py) => px >= x && px <= x + w && py >= y && py <= y + h });
    }
    const hdg = ((((-(cam.base + Math.sin(cam.phase) * cam.swayAmp * (cam.auto ? 1 : 0)) * 180) / Math.PI) % 360) + 360) % 360;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = theme.muted; ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.fillText(`HDG ${String(Math.round(hdg)).padStart(3, '0')}°  ·  ELEV ${Math.round((cam.pitch * 180) / Math.PI)}°`, W - 22, 20); ctx.textAlign = 'left';
  }

  // ---------- picking ----------
  function pick(x, y) {
    for (const h of hits) if (h.test(x, y)) return h.o;
    const nx = (x / W) * 2 - 1, ny = 1 - (y / H) * 2, inv = M.inv(vp);
    const un = (z) => { const w = inv[3] * nx + inv[7] * ny + inv[11] * z + inv[15]; return [(inv[0] * nx + inv[4] * ny + inv[8] * z + inv[12]) / w, (inv[1] * nx + inv[5] * ny + inv[9] * z + inv[13]) / w, (inv[2] * nx + inv[6] * ny + inv[10] * z + inv[14]) / w]; };
    const a = un(-1), b = un(1), d = V.norm(V.sub(b, a));
    let pod = null, podT = Infinity;
    for (const vn of sc.ventures) { const tt = raySphere(a, d, vn.pos, 0.2 + 0.14 * (vn.score / 100) + 0.22); if (tt && tt < podT) { podT = tt; pod = vn; } }
    if (pod) return { kind: 'venture', id: pod.id };
    let best = null, bt = Infinity;
    const consider = (tt, o) => { if (tt && tt < bt) { bt = tt; best = o; } };
    for (const m of sc.modules) consider(rayCyl(a, d, m.base[0], m.base[2], m.group === 'operations' ? 0.95 : 1.25, 0, T.modTopY(m) + 0.3), { kind: 'module', id: m.k });
    FLOW.forEach((st, i) => { const y0 = T.floorY(i); consider(rayCyl(a, d, 0, 0, T.rad(y0 + T.FH / 2) + 0.65, y0, y0 + T.FH), { kind: 'stage', id: st }); });
    const vt = raySphere(a, d, T.VAULT_C, T.VAULT_R * 1.05);
    if (vt) { const p = V.add(a, V.mul(d, vt)), deg = (Math.atan2(p[2], p[0]) * 180) / Math.PI; if (Math.abs(deg) < 58 && p[1] < 0) consider(vt, { kind: 'stage', id: 'Parked' }); }
    return best;
  }
  const local = (e) => { const r = overlay.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  overlay.addEventListener('pointerdown', (e) => { overlay.setPointerCapture(e.pointerId); pointers.set(e.pointerId, local(e)); drag.on = true; const p = local(e); drag.x = p.x; drag.y = p.y; drag.moved = 0; lastInteract = performance.now(); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag.pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  overlay.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (drag.on && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (drag.pinch) cam.zoomT = clampZ(cam.zoomT * (drag.pinch / d)); drag.pinch = d; drag.moved += 10; return; }
    if (drag.on) { const dx = p.x - drag.x, dy = p.y - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); cam.base -= dx * 0.006; cam.pitch = Math.max(0.04, Math.min(1.35, cam.pitch + dy * 0.005)); drag.x = p.x; drag.y = p.y; lastInteract = performance.now(); }
    else hover = pick(p.x, p.y);
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (!drag.on) return;
    if (pointers.size === 0) { drag.on = false; if (drag.moved < 6) { const h = pick(local(e).x, local(e).y); select(h || { kind: 'core', id: null }); } }
    drag.pinch = 0;
  };
  overlay.addEventListener('pointerup', end); overlay.addEventListener('pointercancel', end);
  overlay.addEventListener('pointerleave', () => { hover = null; });
  overlay.addEventListener('wheel', (e) => { e.preventDefault(); cam.zoomT = clampZ(cam.zoomT * (1 + Math.sign(e.deltaY) * 0.09)); lastInteract = performance.now(); }, { passive: false });

  function focusFor(s) {
    if (s.kind === 'stage') { cam.tt = [0, T.stageMidY(s.id), 0]; cam.zoomT = s.id === 'Parked' ? 0.55 : 0.6; }
    else if (s.kind === 'module') { const m = sc.modIdx[s.id]; cam.tt = [m.base[0] * 0.55, 1.6, m.base[2] * 0.55]; cam.zoomT = 0.62; }
    else if (s.kind === 'venture') { const vn = sc.ventures.find((x) => x.id === s.id); cam.tt = vn ? [vn.pos[0] * 0.4, vn.pos[1], vn.pos[2] * 0.4] : [0, 4.2, 0]; cam.zoomT = 0.55; }
    else { cam.tt = [0, 4.2, 0]; cam.zoomT = 1; }
  }
  function select(s) { selected = { kind: s.kind, id: s.id }; ptab = 'needs'; focusFor(s); rebuildDynamic(); panel.innerHTML = panelHTML(sc); }
  function refresh() { sc = buildScene(store.get()); curSc = sc; rebuildDynamic(); panel.innerHTML = panelHTML(sc); levelCheck(sc); }
  function setLayer() { rebuildDynamic(); panel.innerHTML = panelHTML(sc); }
  function stop() { running = false; ro.disconnect(); R.dispose(); }
  loop = { stop, refresh, select, setLayer, panel() { panel.innerHTML = panelHTML(sc); } };
  focusFor(selected);
  panel.innerHTML = panelHTML(sc);
  levelCheck(sc);
  requestAnimationFrame(frame);
}
const clampZ = (z) => Math.max(0.32, Math.min(1.5, z));

/** Celebrate a level reached since the owner last looked. */
function levelCheck(sc) {
  const seen = +(tw().seenLevel || 0), n = sc.G.level.n;
  if (n > seen) {
    store.update((s) => { s.settings.tower = { ...(s.settings.tower || {}), seenLevel: n }; }, { render: false });
    if (seen) toast(`Level ${n}: ${sc.G.level.title}. ${sc.G.level.perk}`, 'ok');
  }
}

// ---------- Side panel ----------
const modLabel = (k) => (k === 'ventures' ? 'Venture Engine' : MODULES.find((m) => m.k === k)?.label || k);
const modColor = (k) => (k === 'ventures' ? '#c9a54c' : GROUPS[MODULES.find((m) => m.k === k)?.group]?.color || '#888');
const chip = (txt, color) => `<span class="badge" style="color:${color};border-color:${color}55;background:${color}18">${esc(txt)}</span>`;
const SEV_LABEL = { 3: 'Act now', 2: 'Soon', 1: 'Worth doing' };

function gateList(g) {
  return `<div class="eng-gates">${g.map((x) => `<a class="eng-gate ${x.ok ? 'ok' : ''}" href="${x.href}">
    <span class="tick">${x.ok ? '✓' : ''}</span><span class="grow"><span>${esc(x.label)}</span>${x.hint && !x.ok ? `<span class="small muted" style="display:block">${esc(x.hint)}</span>` : ''}</span>
    ${chip(modLabel(x.module), modColor(x.module))}</a>`).join('')}</div>`;
}

/** "Needs you" and "Done" for any element, with the XP each earns. */
function statusHTML(st, { emptyNeeds = 'Nothing needs you here right now.', emptyDone = 'Nothing recorded here yet. Done work shows up the moment it is in the app.' } = {}) {
  const needs = st.needs || [], done = st.done || [];
  const tab = (k, l, n) => `<button class="eng-tab ${ptab === k ? 'on' : ''}" data-act="ptab" data-tab="${k}">${l}<span class="n">${n}</span></button>`;
  const list = ptab === 'done'
    ? (done.length ? `<div class="eng-feed">${done.slice(0, 12).map((e) => `<a class="eng-row" href="${esc(e.href || '#/engine')}"><span class="eng-dot" style="background:${SEV_COLOR[0]}"></span><span class="grow"><span>${esc(e.text)}</span><span class="small muted" style="display:block">${e.date ? fmtDate(e.date) : 'undated'}</span></span><span class="eng-xp">+${e.xp}</span></a>`).join('')}${done.length > 12 ? `<div class="small muted" style="padding:6px 2px">and ${done.length - 12} more</div>` : ''}</div>` : `<p class="small muted">${emptyDone}</p>`)
    : (needs.length ? `<div class="eng-feed">${needs.slice(0, 10).map((n) => `<a class="eng-row" href="${esc(n.href || '#/engine')}"><span class="eng-dot" style="background:${SEV_COLOR[n.sev]}"></span><span class="grow"><span>${esc(n.text)}</span><span class="small muted" style="display:block">${SEV_LABEL[n.sev] || ''}</span></span>${n.xp ? `<span class="eng-xp">+${n.xp}</span>` : ''}</a>`).join('')}</div>` : `<p class="small muted">${emptyNeeds}</p>`);
  return `<div class="eng-status"><div class="eng-tabs">${tab('needs', 'Needs you', needs.length)}${tab('done', 'Done', done.length)}${st.xp ? `<span class="eng-xp right">${fnum(st.xp, 0)} XP earned</span>` : ''}</div>${list}</div>`;
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
    case 'procure': return `${(s.catalog || []).length} items · ${(s.rfqs || []).filter((r) => ['Draft', 'Open', 'Comparing'].includes(r.status)).length} open requests · ${(s.orders || []).filter((o) => ['Sent', 'Confirmed', 'In production', 'Shipped', 'Customs'].includes(o.status)).length} open orders · ${(s.suppliers || []).length} suppliers`;
    case 'commerce': return `${(s.products || []).length} product leads · ${(s.suppliers || []).length} suppliers on file`;
    default: return '';
  }
}

function empireHTML(sc, full) {
  const G = sc.G, lv = G.level, nextMs = G.milestones.filter((m) => !m.done).sort((a, b) => b.p - a.p);
  return `<div class="eng-empire">
      <div class="row" style="gap:12px;align-items:center"><div class="eng-lvl">${lv.n}</div><div class="grow"><div class="eyebrow" style="color:#e2c477">Empire level</div><h2 style="margin:0">${esc(lv.title)}</h2></div>
        <div style="text-align:right"><div class="eng-big">${fnum(G.xp, 0)}</div><div class="small muted">XP</div></div></div>
      <div class="bar-track mt"><div class="bar-fill" style="width:${Math.round(lv.p * 100)}%;background:linear-gradient(90deg,#c9a54c,#ffe39a)"></div></div>
      <div class="small muted" style="margin-top:5px">${lv.next ? `${fnum(lv.next - G.xp, 0)} XP to <b style="color:var(--text)">${esc(lv.nextTitle)}</b>: ${esc(lv.nextPerk)}` : 'Top level reached. The tower is complete.'}</div>
      <div class="calc-out" style="margin-top:10px"><div class="o"><div class="l">Streak</div><div class="v">${G.streak.weeks} wk</div></div><div class="o"><div class="l">This week</div><div class="v">+${fnum(G.weekXP, 0)}</div></div><div class="o"><div class="l">Milestones</div><div class="v">${G.milestones.filter((m) => m.done).length}/${G.milestones.length}</div></div></div>
      ${!G.streak.activeThisWeek && G.streak.weeks ? '<div class="callout gold small" style="margin-top:8px">Record one real action this week to keep your streak.</div>' : ''}
    </div>
    <h4 class="eng-sub">Orders of the day</h4>
    ${G.quests.length ? `<div class="eng-feed">${G.quests.map((n) => `<a class="eng-row" href="${esc(n.href || '#/engine')}"><span class="eng-dot" style="background:${SEV_COLOR[n.sev]}"></span><span class="grow small">${esc(n.text)}</span>${n.xp ? `<span class="eng-xp">+${n.xp}</span>` : ''}</a>`).join('')}</div>` : '<p class="small muted">No open orders. Pick the next gate of your most promising venture.</p>'}
    <h4 class="eng-sub">Next milestones</h4>
    <div class="eng-ms">${(full ? G.milestones : nextMs.slice(0, 4)).map((m) => `<div class="eng-m ${m.done ? 'done' : ''}"><div class="row" style="gap:8px"><span class="tick">${m.done ? '✓' : ''}</span><b class="grow small">${esc(m.title)}</b><span class="eng-xp">+${m.xp}</span></div><div class="small muted" style="margin:2px 0 5px 24px">${esc(m.desc)}</div>${m.done ? '' : `<div class="bar-track" style="margin-left:24px;height:4px"><div class="bar-fill" style="width:${Math.round(m.p * 100)}%;background:#c9a54c"></div></div>`}</div>`).join('')}</div>
    ${full ? '' : `<button class="btn sm ghost" data-act="allMilestones" style="margin-top:6px">All ${G.milestones.length} milestones</button>`}
    <h4 class="eng-sub">Recent activity</h4>
    ${G.events.filter((e) => e.date).length ? `<div class="eng-feed">${G.events.filter((e) => e.date).slice(0, 6).map((e) => `<a class="eng-row" href="${esc(e.href || '#/engine')}"><span class="eng-dot" style="background:${SEV_COLOR[0]}"></span><span class="grow small">${esc(e.text)}<span class="muted" style="display:block">${fmtDate(e.date)}</span></span><span class="eng-xp">+${e.xp}</span></a>`).join('')}</div>` : '<p class="small muted">Your first recorded action starts the feed.</p>'}
    <details class="small muted" style="margin-top:10px"><summary>How XP works</summary><p style="margin-top:6px">XP comes only from things recorded in the app with a date or a status: a venture rising a floor (100 XP per floor number), a playbook step, an answered research question, a logged or reviewed decision, a ledger entry, an obligation met, a supplier chosen, goods received, an idea promoted. Milestones add a bonus. Nothing can be ticked just for points, so the level is a fair read of real progress.</p>
      <p>${LEVELS.map((l, i) => `${i + 1}. ${l.title} (${fnum(l.at, 0)})`).join(' · ')}</p></details>`;
}

let showAllMs = false;
function panelHTML(sc) {
  const sel = selected, layer = tw().layer;
  if (sel.kind === 'venture') {
    const vn = sc.ventures.find((x) => x.id === sel.id);
    if (!vn) { selected = { kind: 'core', id: null }; return panelHTML(sc); }
    const v = vn.v, nxt = nextStage(v.stage), prv = prevStage(v.stage), rd = vn.ready;
    const links = ventureLinks(sc, vn);
    const hasDiligence = store.get().queue.some((q) => q.venture === v.id);
    return `<div class="eng-head"><div class="eyebrow" style="color:${STAGE_COLOR[v.stage]}">${esc(v.stage)} · ${esc(STAGE_NAME[v.stage] || '')}${nxt ? ` → ${nxt}` : ''}</div><h2>${esc(v.name)}</h2><p class="small muted">${esc(v.summary)}</p></div>
      <div class="row"><span class="score-ring" style="font-size:26px">${vn.score}</span><span class="muted small">/100 score</span>
        <span class="right badge ${rd.pct >= 1 ? 'green' : 'gold'}">${rd.met}/${rd.total} gates</span></div>
      ${statusHTML(sc.stat(vn), { emptyNeeds: 'Nothing urgent. Work the next gate below.' })}
      ${v.stage === 'Parked' ? `<p class="small muted">${esc(STAGE_INFO.Parked)}</p>` : nxt ? `<h4 class="eng-sub">To rise into ${nxt} <span class="muted">· +${100 * (FLOW.indexOf(nxt) + 1)} XP</span></h4>${gateList(rd.gates)}` : `<h4 class="eng-sub">At the canopy</h4>${gateList(rd.gates)}`}
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
    if (!m) { selected = { kind: 'core', id: null }; return panelHTML(sc); }
    const g = GROUPS[m.group];
    return `<div class="eng-head"><div class="eyebrow" style="color:${g.color}">${g.label} ${m.group === 'operations' ? 'outpost' : 'pavilion'}</div><h2>${esc(m.label)}</h2></div>
      <p>${esc(m.role)}</p>
      <div class="callout small">${esc(moduleStats(m.k))}</div>
      ${statusHTML(sc.stat(m))}
      ${m.feeds.length ? `<h4 class="eng-sub">${m.group === 'operations' ? 'Feeds these floors' : 'Sky-bridges to these floors'}</h4><div class="row">${m.feeds.map((st) => `<button class="btn sm" data-act="pickStage" data-id="${st}" style="color:${STAGE_COLOR[st]}">${st}</button>`).join('')}</div>` : ''}
      ${(m.also || []).length ? `<h4 class="eng-sub">Feeds</h4><div class="row">${m.also.map((o) => sc.modIdx[o] ? `<button class="btn sm" data-act="pickModule" data-id="${o}">${esc(sc.modIdx[o].label)}</button>` : '').join('')}</div>` : ''}
      ${gateUses(sc, m.k)}
      <div class="eng-actions"><a class="btn primary" href="${m.href}">Open ${esc(m.label)} ${icon('arrow')}</a></div>`;
  }
  if (sel.kind === 'stage') {
    const st = sel.id;
    const vs = sc.ventures.filter((x) => x.stage === st);
    const feeders = sc.modules.filter((m) => m.feeds.includes(st));
    return `<div class="eng-head"><div class="eyebrow" style="color:${STAGE_COLOR[st]}">${st === 'Parked' ? 'Below ground' : `Floor ${FLOW.indexOf(st) + 1} of 6`} · ${esc(STAGE_NAME[st])}</div><h2>${esc(st)}</h2></div>
      <p>${esc(STAGE_INFO[st])}</p>
      ${statusHTML(sc.stat({ kind: 'stage', id: st }), { emptyDone: st === 'Parked' ? 'No ventures parked yet. Parking a failed idea is a win: +20 XP.' : `No venture has risen to ${st} yet: +${100 * (FLOW.indexOf(st) + 1)} XP when one does.` })}
      ${feeders.length ? `<h4 class="eng-sub">Powered by</h4><div class="row">${feeders.map((m) => `<button class="btn sm" data-act="pickModule" data-id="${m.k}" style="color:${m.color}">${esc(m.label)}</button>`).join('')}</div>` : ''}
      <h4 class="eng-sub">Ventures ${st === 'Parked' ? 'in the vault' : 'on this floor'}</h4>
      ${vs.length ? `<div class="list">${vs.map((x) => `<a class="list-item" data-act="pickVenture" data-id="${x.id}" style="cursor:pointer"><b class="grow">${esc(x.v.name)}</b><span class="badge ${x.ready.pct >= 1 ? 'green' : ''}">${x.ready.met}/${x.ready.total}</span></a>`).join('')}</div>` : '<p class="small muted">None yet.</p>'}
      ${st === 'Idea' ? `<div class="eng-actions"><a class="btn primary" href="#/ventures" data-act="newVenture">${icon('plus')} Plant a new idea</a></div>` : ''}`;
  }
  // core / overview
  const live = sc.ventures.filter((x) => x.stage !== 'Parked');
  const readyNow = live.filter((x) => x.ready.pct >= 1 && nextStage(x.stage));
  return `${empireHTML(sc, showAllMs)}
    ${readyNow.length ? `<h4 class="eng-sub">Ready to rise</h4><div class="list">${readyNow.map((x) => `<a class="list-item" data-act="pickVenture" data-id="${x.id}" style="cursor:pointer"><b class="grow">${esc(x.v.name)}</b>${chip(x.v.stage + ' → ' + nextStage(x.v.stage), STAGE_COLOR[nextStage(x.v.stage)])}</a>`).join('')}</div>` : ''}
    <h4 class="eng-sub">Reading the tower</h4>
    <div class="small muted eng-legend">
      <div><b style="color:var(--text)">Layers.</b> ${layer === 'attention' ? 'Needs you: red beacons need action now, amber soon, blue are worth doing.' : layer === 'progress' ? 'Done: green rings mark everything with recorded work, with the count beside each label.' : layer === 'game' ? 'Empire: the XP each part of the tower has earned you.' : 'Pipeline: the plain building. Switch layers at the bottom left of the view.'}</div>
      <div><span class="lg-dot" style="background:#e2c477"></span>Gold pods are ventures. Size is score; the ring around each is readiness for the next floor.</div>
      <div><span class="lg-dot" style="background:${GROUPS.knowledge.color}"></span>Crystal towers: Knowledge. <span class="lg-dot" style="background:${GROUPS.capital.color};margin-left:6px"></span>Domed vaults: Capital. <span class="lg-dot" style="background:${GROUPS.governance.color};margin-left:6px"></span>Green-roofed blocks: Governance. <span class="lg-dot" style="background:${GROUPS.operations.color};margin-left:6px"></span>Outposts on the outer ring: Operations.</div>
      <div>The skyline on the horizon grows with your level, and the crane stays until the tower is complete. The sky follows your clock unless you fix it.</div>
      <div style="margin-top:6px">Drag to orbit · scroll or pinch to zoom · click a floor, pod, pavilion or the level card.</div>
    </div>`;
}

function gateUses(sc, k) {
  const uses = sc.ventures.flatMap((x) => x.ready.gates.filter((g) => g.module === k && !g.ok).map((g) => ({ x, g })));
  if (!uses.length) return '';
  return `<h4 class="eng-sub">Blocking right now</h4><div class="list">${uses.slice(0, 6).map(({ x, g }) => `<a class="list-item" href="${g.href}"><span class="grow small"><b>${esc(x.v.name)}</b>: ${esc(g.label)}</span></a>`).join('')}</div>`;
}

// ---------- View ----------
function moveStage(id, to) {
  store.update((s) => {
    const v = s.ventures.find((x) => x.id === id); if (!v) return;
    (v.history ||= []).push({ date: today(), from: v.stage, to });
    v.stage = to; v.updated = today();
  });
}
const setTower = (patch) => store.update((s) => { s.settings.tower = { ...(s.settings.tower || {}), ...patch }; }, { render: false });

export default {
  title: 'The Tower',
  async render(s) {
    try { wikiCount = (await K.loadIndex()).articles.length; } catch { wikiCount = 0; }
    const live = s.ventures.filter((v) => v.stage !== 'Parked');
    const rows = live.map((v) => ({ v, r: readiness(v) })).sort((a, b) => FLOW.indexOf(b.v.stage) - FLOW.indexOf(a.v.stage) || b.r.pct - a.r.pct);
    const t = s.settings.tower || {};
    return `
    <div class="page-head"><div><div class="eyebrow">Build</div><h1>The Tower</h1>
      <p>Your empire as a living building. Ideas rise floor by floor from the seed vault to the crown; every tool is a pavilion at the base. Switch layers to see what needs you and what is done, and watch the skyline grow as real work earns XP.</p></div>
      <div class="actions"><button class="btn" data-act="resetCam">${icon('sync')} Reset view</button><button class="btn" data-act="toggleSpin">${cam.auto ? 'Pause rotation' : 'Rotate'}</button><a class="btn primary" href="#/ventures" data-act="newVenture">${icon('plus')} New idea</a></div></div>
    <div class="eng-wrap">
      <div class="eng-stage card flush"><canvas id="eng-canvas" aria-hidden="true"></canvas><canvas id="eng-overlay" aria-label="3D model of the venture tower: stage floors, the seed vault, the connected pavilions and outposts"></canvas>
        <div class="eng-layers" role="toolbar" aria-label="Tower layers">${LAYERS.map(([k, l]) => `<button class="eng-layer ${(t.layer || 'pipeline') === k ? 'on' : ''}" data-act="layer" data-id="${k}" aria-pressed="${(t.layer || 'pipeline') === k}">${l}</button>`).join('')}
          <select class="eng-sky" data-change="sky" aria-label="Sky">${SKIES.map(([k, l]) => `<option value="${k}" ${(t.sky || 'live') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
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
    const canvas = el.querySelector('#eng-canvas'), overlay = el.querySelector('#eng-overlay'), panel = el.querySelector('#eng-panel');
    if (canvas && overlay && panel) start(canvas, overlay, panel);
  },
  actions: {
    resetCam() { cam = { ...CAM0, auto: cam.auto, tt: [0, 4.2, 0], tc: cam.tc }; },
    toggleSpin(el) {
      if (cam.auto) { cam.base += Math.sin(cam.phase) * cam.swayAmp; cam.auto = false; }
      else { cam.phase = 0; cam.auto = true; }
      el.textContent = cam.auto ? 'Pause rotation' : 'Rotate';
    },
    layer(el) {
      setTower({ layer: el.dataset.id });
      el.parentElement.querySelectorAll('.eng-layer').forEach((b) => { const on = b.dataset.id === el.dataset.id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      if (el.dataset.id === 'game') selected = { kind: 'core', id: null };
      ptab = el.dataset.id === 'progress' ? 'done' : 'needs';
      loop?.setLayer();
    },
    sky(el) { setTower({ sky: el.value }); },
    ptab(el) { ptab = el.dataset.tab; loop?.panel(); },
    allMilestones() { showAllMs = true; loop?.panel(); },
    pickVenture(el) { loop?.select({ kind: 'venture', id: el.dataset.id }); if (window.innerWidth < 1100) document.getElementById('eng-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
    pickModule(el) { loop?.select({ kind: 'module', id: el.dataset.id }); },
    pickStage(el) { loop?.select({ kind: 'stage', id: el.dataset.id }); },
    newVenture(el, e) { e.preventDefault(); import('./ventures.js').then((m) => m.default.actions.new()); },
    async advance(el) {
      const v = store.byId('ventures', el.dataset.id); const nxt = nextStage(v.stage); if (!nxt) return;
      const r = readiness(v);
      if (r.pct < 1 && !(await confirmBox(`${v.name} has met ${r.met} of ${r.total} gates for ${nxt}. Advance anyway? Skipping gates is how capital gets lost.`, `Advance to ${nxt}`))) return;
      selected = { kind: 'venture', id: v.id }; moveStage(v.id, nxt); toast(`${v.name} rose to ${nxt}: +${100 * (FLOW.indexOf(nxt) + 1)} XP`, 'ok');
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
