// The Tower — the venture pipeline as a living, high-tech building, rendered in real time with WebGL2.
// Six stage floors rise from a seed vault in the soil to a lotus crown; every other module of the empire is a
// pavilion around the base, joined to the floors it powers by glowing sky-bridges. Layers show what needs you,
// what is done and how far the empire has come; the sky follows your local clock.
import * as store from '../store.js';
import * as K from '../knowledge.js';
import { esc, icon, compact, fnum, toast, confirmBox, copyText, today, fmtDate, uid, openForm } from '../ui.js';
import { addAvatar, DEFAULT_AVATARS, SKIN, HAIR, HAIR_STYLES, FACIAL, TOPS, ACCESSORIES } from '../avatar.js';
import * as GW from '../game-world.js';
import * as WI from '../world-islands.js';
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
// ---------- game state (survives re-renders) ----------
const gameRT = { chars: {}, trail: [], at: null, wtab: 'learn', planV: null, arrivedAt: -10 };
const isPlay = () => !!tw().play;
const gs = () => store.get().settings.game || {};
const activeId = () => (gs().active === 'lizzie' ? 'lizzie' : 'matthew');
const otherId = () => (activeId() === 'matthew' ? 'lizzie' : 'matthew');
const avatarCfg = (id) => ({ ...DEFAULT_AVATARS[id], ...((gs().avatars || {})[id] || {}) });
let wikiArticles = [];
function ensureChars() {
  for (const [id, deg] of [['matthew', 92], ['lizzie', 97]]) if (!gameRT.chars[id]) { const pos = GW.toXYZ(deg, GW.ringR(deg)); gameRT.chars[id] = { pos, yaw: Math.atan2(pos[0], pos[2]), path: [], goal: null, walk: 0, phase: 0, waveAt: 0 }; }
}

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
    GW.setIslands(WI.islandSlots(store.get()));
    let sc0 = buildScene(store.get()); curSc = sc0; panel.innerHTML = panelHTML(sc0);
    loop = { stop() {}, refresh() { sc0 = buildScene(store.get()); curSc = sc0; panel.innerHTML = panelHTML(sc0); }, select(s) { selected = s; panel.innerHTML = panelHTML(sc0); }, setLayer() { panel.innerHTML = panelHTML(sc0); }, panel() { panel.innerHTML = panelHTML(sc0); },
      walkTo(k) { gameRT.at = k; panel.innerHTML = panelHTML(sc0); }, setPlay() { panel.innerHTML = panelHTML(sc0); } };
    return;
  }
  const reg = T.buildStatic(R);
  GW.buildHQ(R);
  const slots = WI.buildIslands(R, store.get()); GW.setIslands(slots);
  ensureChars();
  const avs = { matthew: addAvatar(R, avatarCfg('matthew'), 'avatar'), lizzie: addAvatar(R, avatarCfg('lizzie'), 'avatar') };
  window.__dcTower = { cam: () => cam, select: (x) => loop?.select(x), sc: () => curSc, R, game: gameRT, walk: (k) => loop?.walkTo(k) };
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
    colW = isPlay() ? 0 : W < 620 ? 112 : 168;
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

  function stepChars(dt, t) {
    const act = gameRT.chars[activeId()], fol = gameRT.chars[otherId()];
    // follower trails the active character, then stands beside it
    const lastT = gameRT.trail[gameRT.trail.length - 1];
    if (!lastT || V.len(V.sub(act.pos, lastT)) > 0.06) { gameRT.trail.push(act.pos.slice()); if (gameRT.trail.length > 80) gameRT.trail.shift(); }
    const gap = V.len([act.pos[0] - fol.pos[0], 0, act.pos[2] - fol.pos[2]]);
    if (act.path.length && gap > 0.6 && gameRT.trail.length > 9) { fol.path = [gameRT.trail[gameRT.trail.length - 9]]; fol.goal = null; }
    else if (!act.path.length && !fol.path.length && gap > 0.75) { const q = GW.toPolar(act.pos), side = q.r > 5.2 ? GW.toXYZ(q.deg + 4.2, q.r) : GW.toXYZ(q.deg, Math.min(5.0, q.r + 0.42)); fol.path = [side]; fol.goal = { faceTo: act }; }
    for (const id of ['matthew', 'lizzie']) {
      const c = gameRT.chars[id];
      if (c.path.length) {
        const tg = c.path[0], dx = tg[0] - c.pos[0], dz = tg[2] - c.pos[2], dist = Math.hypot(dx, dz), end = c.path[c.path.length - 1], far = Math.hypot(end[0] - c.pos[0], end[2] - c.pos[2]), sp = (id === activeId() ? 1.25 : 1.45) * (1 + Math.min(1.6, far / 5)) * dt;
        if (dist <= sp) { c.pos = tg.slice(); c.path.shift(); } else { c.pos = [c.pos[0] + (dx / dist) * sp, c.pos[1] + (tg[1] - c.pos[1]) * Math.min(1, sp / dist), c.pos[2] + (dz / dist) * sp]; }
        if (dist > 1e-4) { let d = Math.atan2(dx, dz) - c.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); c.yaw += d * Math.min(1, dt * 10); }
        c.phase += Math.min(dist, sp) * 17; c.walk += (1 - c.walk) * Math.min(1, dt * 8);
        if (!c.path.length) arrive(id, c, t);
      } else c.walk += (0 - c.walk) * Math.min(1, dt * 6);
      if (!c.path.length && c.faceYaw != null) { let d = c.faceYaw - c.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); c.yaw += d * Math.min(1, dt * 6); }
    }
  }
  function arrive(id, c, t) {
    const g = c.goal; c.goal = null;
    if (!g) { c.faceYaw = null; return; }
    if (g.faceTo) { c.faceYaw = Math.atan2(g.faceTo.pos[0] - c.pos[0], g.faceTo.pos[2] - c.pos[2]); return; }
    const centre = g.k === 'hq' ? [0, 0, 0] : g.island ? T.polar(g.deg, WI.ISLAND_DIST + 1) : T.polar(g.deg, (MODULES.find((m) => m.k === g.k) || {}).r || 5.7);
    c.faceYaw = Math.atan2(centre[0] - c.pos[0], centre[2] - c.pos[2]);
    if (id === activeId()) { c.waveAt = t; gameRT.at = g.k; gameRT.wtab = 'learn'; selected = { kind: 'core', id: null }; panel.innerHTML = panelHTML(sc); }
  }
  function walkTo(k, spot) {
    const c = gameRT.chars[activeId()], place = k ? GW.placeOf(k) : null;
    if (k && !place) return;
    c.path = GW.route(c.pos, place || spot); c.goal = place; c.faceYaw = null;
    gameRT.at = null; selected = { kind: 'core', id: null }; panel.innerHTML = panelHTML(sc);
  }

  function frame(now) {
    if (!running) return;
    if (!canvas.isConnected) { stop(); return; }
    const dt = Math.max(0, Math.min(64, now - last)); last = now; const t = Math.max(0, now - t0) / 1000, k = 1 - Math.exp(-dt * 0.008);
    if ((root.dataset.theme === 'light') !== light) readTheme();
    env = skyAt(skyHour(tw().sky));
    const layer = tw().layer;

    // ---- characters
    const P = isPlay();
    stepChars(dt / 1000, t);
    for (const id of ['matthew', 'lizzie']) {
      const c = gameRT.chars[id], wave = Math.max(0, 1 - Math.abs(t - c.waveAt - 0.9) / 0.9) * (c.waveAt ? 1 : 0);
      avs[id].pose(c.pos, c.yaw, { walk: c.walk, phase: c.phase, wave: Math.min(1, wave * 1.6), t });
    }
    if (P) {
      const a = gameRT.chars[activeId()].pos;
      cam.tt = [a[0], a[1] + 0.38, a[2]];
      if (!drag.on && now - lastInteract > 2500) { const ar = GW.toPolar(a).r, want = Math.atan2(a[2], a[0]) + (ar > WI.RIM + 1 ? Math.PI + 0.35 : ar < 5.2 ? 0.55 : 0.12); let d = want - cam.base; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.base += d * (1 - Math.exp(-dt * 0.0016)); }
    }
    // ---- camera
    if (cam.auto && !P && !drag.on && now - lastInteract > 3500) cam.phase += dt * 0.00022;
    cam.zoom += (cam.zoomT - cam.zoom) * (1 - Math.exp(-dt * 0.005));
    for (let i = 0; i < 3; i++) cam.tc[i] += (cam.tt[i] - cam.tc[i]) * (1 - Math.exp(-dt * 0.005));
    const yaw = cam.base + Math.sin(cam.phase) * cam.swayAmp * (cam.auto && !P ? 1 : 0);
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

    try { vp = R.render({ view, proj, eye, t, env, sunTarget: [0, 3, 0], focus: P ? [gameRT.chars[activeId()].pos[0], gameRT.chars[activeId()].pos[1] + 0.3, gameRT.chars[activeId()].pos[2]] : null }); } catch (e) { console.error(e); stop(); return; }
    drawOverlay(t, view, { any, isSel, isHov, floorFocus, modLit, count, focusMod, focusStage, selVenture, vlinks, layer, play: P });
    overlay.style.cursor = hover || P ? 'pointer' : drag.on ? 'grabbing' : 'grab';
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
      for (const m of sc.modules) { if (cam.zoom > 1.7 && !F.play) break; const a = P([m.base[0], T.modTopY(m) + 0.9, m.base[2]]); if (!a) continue; items.push({ m, ax: a.x, ay: a.y, x: a.x, y: a.y, w: ctx.measureText(m.label).width + 14 + (F.layer !== 'pipeline' ? 26 : 0), h: 22 }); }
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
    // venture islands
    for (const isle of GW.islands()) {
      if (F.play && Math.hypot(gameRT.chars[activeId()].pos[0] - isle.c[0], gameRT.chars[activeId()].pos[2] - isle.c[2]) < WI.ISLAND_RAD + 0.5) continue;
      const q = P([isle.c[0], 2.6, isle.c[2]]); if (!q || q.x > W - colW - 20) continue;
      const th = WI.THEMES[isle.theme];
      pill(isle.label, q.x, q.y, { size: W < 620 ? 10 : 11.5, hit: F.play ? { kind: 'place', id: isle.k } : { kind: 'venture', id: isle.id } });
      ctx.font = '600 9.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = th.color; ctx.fillText(`${th.title.toUpperCase()} · ${isle.level < 0 ? 'PARKED' : WI.BUILD_STEPS[isle.level].toUpperCase()}`, q.x, q.y + 17);
    }
    if (F.play) drawMinimap(t);
    // play mode: Venture HQ sign and name tags
    if (F.play) {
      const hp = GW.toXYZ(GW.HQ.deg, 3.45), a = P([hp[0], 1.15, hp[2]]);
      if (a) { pill('Venture HQ', a.x, a.y, { size: W < 620 ? 10 : 11.5, hit: { kind: 'place', id: 'hq' } }); }
      for (const id of ['matthew', 'lizzie']) {
        const c = gameRT.chars[id], q = P([c.pos[0], c.pos[1] + 0.8, c.pos[2]]); if (!q) continue;
        const on = id === activeId();
        ctx.font = `${on ? 700 : 600} 11px Inter, system-ui, sans-serif`; const nm = avatarCfg(id).name, w = ctx.measureText(nm).width + 18;
        ctx.fillStyle = on ? 'rgba(226,196,119,0.95)' : 'rgba(8,13,22,0.72)'; rrect(q.x - w / 2, q.y - 10, w, 20, 10); ctx.fill();
        ctx.fillStyle = on ? '#11151c' : '#e8e6e0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nm, q.x, q.y + 0.5);
        ctx.beginPath(); ctx.moveTo(q.x - 5, q.y + 10); ctx.lineTo(q.x + 5, q.y + 10); ctx.lineTo(q.x, q.y + 15); ctx.closePath(); ctx.fillStyle = on ? 'rgba(226,196,119,0.95)' : 'rgba(8,13,22,0.72)'; ctx.fill();
        hits.push({ o: { kind: 'char', id }, test: (px, py) => Math.abs(px - q.x) < w / 2 && Math.abs(py - q.y) < 11 });
      }
      if (gameRT.chars[activeId()].path.length) { const dst = gameRT.chars[activeId()].path[gameRT.chars[activeId()].path.length - 1], d = P(dst); if (d) { ctx.strokeStyle = '#e2c477'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); ctx.beginPath(); ctx.ellipse(d.x, d.y, 12, 5, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; } }
    }
    // stage column
    const right = [view[0], view[4], view[8]], order = F.play ? [] : ['Parked', ...FLOW], colX = W - colW + 4, rows = [];
    for (const st of order) {
      const vs = sc.ventures.filter((x) => x.stage === st), midY = T.stageMidY(st), rr = st === 'Parked' ? 1.1 : T.rad(midY) + 0.7;
      const a = P([0, midY, 0]), e = P([right[0] * rr, midY, right[2] * rr]); if (!a || !e) continue;
      rows.push({ st, vs, desired: a.y, h: 20 + vs.length * 14, edge: e });
    }
    if (!F.play) { const g = ctx.createLinearGradient(colX - 30, 0, colX + 40, 0); g.addColorStop(0, 'rgba(6,10,18,0)'); g.addColorStop(1, light ? 'rgba(255,255,255,0.5)' : env.uNight < 0.3 ? 'rgba(8,13,22,0.4)' : 'rgba(6,10,18,0.62)'); ctx.fillStyle = g; ctx.fillRect(colX - 30, 0, W - colX + 30, H); }
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
    if (!F.play) ctx.fillText(`HDG ${String(Math.round(hdg)).padStart(3, '0')}°  ·  ELEV ${Math.round((cam.pitch * 180) / Math.PI)}°`, W - 22, 20); ctx.textAlign = 'left';
  }

  function drawMinimap(t) {
    const R0 = W < 620 ? 50 : 66, cx = W - R0 - 16, cy = 16 + R0 + 4, k = R0 / 26.5, to = (p) => [cx + p[0] * k, cy + p[2] * k];
    ctx.fillStyle = 'rgba(8,13,22,0.72)'; ctx.beginPath(); ctx.arc(cx, cy, R0 + 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(226,196,119,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(79,140,70,0.85)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 8.4 * k, (58 * Math.PI) / 180, (302 * Math.PI) / 180); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(46,166,160,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, 5 * k, 0, TAU); ctx.fill(); ctx.fillStyle = '#c9a54c'; ctx.beginPath(); ctx.arc(cx, cy, 2.6 * k, 0, TAU); ctx.fill();
    for (const isle of GW.islands()) {
      const a = to(T.polar(isle.deg, 8.4)), b = to(T.polar(isle.deg, WI.BRIDGE_END)), c = to(isle.c), th = WI.THEMES[isle.theme];
      ctx.strokeStyle = th.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.fillStyle = isle.theme === 'farm' ? '#c8a46a' : isle.theme === 'port' ? '#8d96a0' : '#4f8c46'; ctx.beginPath(); ctx.arc(c[0], c[1], WI.ISLAND_RAD * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = th.color; ctx.stroke();
      hits.push({ o: { kind: 'place', id: isle.k }, test: (px, py) => Math.hypot(px - c[0], py - c[1]) < WI.ISLAND_RAD * k + 3 });
    }
    for (const m of sc.modules) { const p = to(m.base); ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, TAU); ctx.fill(); hits.push({ o: { kind: 'place', id: m.k }, test: (px, py) => Math.hypot(px - p[0], py - p[1]) < 5 }); }
    const hq = to(GW.toXYZ(GW.HQ.deg, 3.6)); ctx.fillStyle = '#ffe39a'; ctx.fillRect(hq[0] - 2.5, hq[1] - 2.5, 5, 5); hits.push({ o: { kind: 'place', id: 'hq' }, test: (px, py) => Math.hypot(px - hq[0], py - hq[1]) < 6 });
    for (const id of [otherId(), activeId()]) { const c = gameRT.chars[id], p = to(c.pos), on = id === activeId(); ctx.fillStyle = on ? '#ffe39a' : '#f4f4f2'; ctx.beginPath(); ctx.arc(p[0], p[1], on ? 3.6 + Math.sin(t * 5) * 0.8 : 2.6, 0, TAU); ctx.fill(); if (on) { ctx.strokeStyle = '#11151c'; ctx.lineWidth = 1; ctx.stroke(); } }
    ctx.font = '700 9px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e2c477'; ctx.fillText('WORLD MAP', cx, cy + R0 + 16);
    ctx.textAlign = 'left';
  }

  // ---------- picking ----------
  function ray(x, y) {
    const nx = (x / W) * 2 - 1, ny = 1 - (y / H) * 2, inv = M.inv(vp);
    const un = (z) => { const w = inv[3] * nx + inv[7] * ny + inv[11] * z + inv[15]; return [(inv[0] * nx + inv[4] * ny + inv[8] * z + inv[12]) / w, (inv[1] * nx + inv[5] * ny + inv[9] * z + inv[13]) / w, (inv[2] * nx + inv[6] * ny + inv[10] * z + inv[14]) / w]; };
    const a = un(-1), b = un(1); return { a, d: V.norm(V.sub(b, a)) };
  }
  function ground(x, y) { const { a, d } = ray(x, y); if (d[1] > -1e-4) return null; const tt = -a[1] / d[1]; return V.add(a, V.mul(d, tt)); }
  function pick(x, y) {
    for (const h of hits) if (h.test(x, y)) return h.o;
    const { a, d } = ray(x, y);
    let pod = null, podT = Infinity;
    for (const vn of sc.ventures) { const tt = raySphere(a, d, vn.pos, 0.2 + 0.14 * (vn.score / 100) + 0.22); if (tt && tt < podT) { podT = tt; pod = vn; } }
    if (pod) return { kind: 'venture', id: pod.id };
    let best = null, bt = Infinity;
    const consider = (tt, o) => { if (tt && tt < bt) { bt = tt; best = o; } };
    for (const m of sc.modules) consider(rayCyl(a, d, m.base[0], m.base[2], m.group === 'operations' ? 0.95 : 1.25, 0, T.modTopY(m) + 0.3), { kind: 'module', id: m.k });
    for (const isle of GW.islands()) consider(rayCyl(a, d, isle.c[0], isle.c[2], WI.ISLAND_RAD, -0.5, 1.6), isPlay() ? { kind: 'place', id: isle.k } : { kind: 'venture', id: isle.id });
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
    if (pointers.size === 0) {
      drag.on = false;
      if (drag.moved < 6) {
        const p = local(e), h = pick(p.x, p.y);
        if (isPlay()) {
          if (h && (h.kind === 'module' || h.kind === 'place')) walkTo(h.id);
          else if (h && h.kind === 'stage') walkTo('hq');
          else if (h && h.kind === 'char') { if (h.id !== activeId()) { store.update((s) => { s.settings.game = { ...(s.settings.game || {}), active: h.id }; }, { render: false }); gameRT.at = null; panel.innerHTML = panelHTML(sc); toast(`Playing as ${avatarCfg(h.id).name}`, 'ok'); } }
          else if (h && h.kind === 'venture') select(h);
          else { const gp = ground(p.x, p.y), spot = gp && GW.spotFromGround(gp); if (spot && spot.k) walkTo(spot.k); else if (spot) walkTo(null, spot); }
        } else select(h && h.kind !== 'char' && h.kind !== 'place' ? h : h && h.kind === 'place' ? { kind: 'stage', id: 'Idea' } : { kind: 'core', id: null });
      }
    }
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
  function select(s) { selected = { kind: s.kind, id: s.id }; ptab = 'needs'; if (!isPlay()) focusFor(s); rebuildDynamic(); panel.innerHTML = panelHTML(sc); }
  function refresh() { sc = buildScene(store.get()); curSc = sc; rebuildDynamic(); panel.innerHTML = panelHTML(sc); levelCheck(sc); }
  function setLayer() { rebuildDynamic(); panel.innerHTML = panelHTML(sc); }
  function stop() { running = false; ro.disconnect(); R.dispose(); }
  function setPlay(on) {
    resize();
    if (on) { cam.zoomT = 0.24; cam.pitch = 0.78; cam.auto = false; } else { cam.tt = [0, 4.2, 0]; cam.zoomT = 1; cam.pitch = CAM0.pitch; gameRT.at = null; }
    selected = { kind: 'core', id: null }; panel.innerHTML = panelHTML(sc);
  }
  loop = { stop, refresh, select, setLayer, walkTo, setPlay, panel() { panel.innerHTML = panelHTML(sc); } };
  if (isPlay()) { cam.zoomT = Math.min(cam.zoomT, 0.3); cam.zoom = cam.zoomT; cam.pitch = Math.max(cam.pitch, 0.6); } else focusFor(selected);
  panel.innerHTML = panelHTML(sc);
  levelCheck(sc);
  requestAnimationFrame(frame);
}
const clampZ = (z) => Math.max(isPlay() ? 0.1 : 0.32, Math.min(isPlay() ? 0.9 : 2.8, z));

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
  if (isPlay() && sel.kind !== 'venture') return gameRT.at ? workshopHTML(sc, gameRT.at) : playHomeHTML(sc);
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
        ${isPlay() ? `<button class="btn sm" data-act="leavePlace">← Back to the game</button>` : ''}
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


// ---------- Game panels ----------
const placeStat = (sc, k) => (k === 'hq' ? { needs: sc.G.attention.filter((n) => n.k === 'ventures' || n.k === 'core'), done: sc.G.events.filter((e) => e.k === 'ventures'), xp: sc.G.events.filter((e) => e.k === 'ventures').reduce((a, e) => a + e.xp, 0) } : sc.stat({ kind: 'module', id: k }));
const questPlace = (n) => (n.venture && GW.placeOf(`v:${n.venture}`) ? `v:${n.venture}` : n.k === 'ventures' || n.k === 'core' || !GW.placeOf(n.k) ? 'hq' : n.k);
function liveVentures() { return store.get().ventures.filter((v) => v.stage !== 'Parked'); }
function tasksAt(k) {
  const s = store.get(), out = [];
  (s.gameTasks || []).filter((x) => (x.ws || 'hq') === k).forEach((x) => out.push({ ...x, src: 'g' }));
  s.ventures.forEach((v) => (v.tasks || []).forEach((x) => { if ((x.ws || (k === 'hq' ? 'hq' : '')) === k) out.push({ ...x, src: v.id, vname: v.name }); }));
  return out.sort((a, b) => (a.done - b.done) || String(a.due || '9').localeCompare(String(b.due || '9')));
}

function playHomeHTML(sc) {
  const act = activeId(), c = gameRT.chars[act], walking = c && c.path.length && c.goal;
  const card = (id) => { const a = avatarCfg(id), on = id === act; return `<div class="gm-char ${on ? 'on' : ''}"><div class="gm-face" style="background:${a.skin};border-color:${a.hair}"><span style="background:${a.hair}"></span></div><div class="grow"><b>${esc(a.name)}</b><div class="small muted">${on ? 'You are playing' : 'Following along'}</div></div>${on ? '' : `<button class="btn sm" data-act="playAs" data-id="${id}">Play as</button>`}<button class="btn sm ghost" data-act="wardrobe" data-id="${id}">Wardrobe</button></div>`; };
  return `<div class="eng-head"><div class="eyebrow" style="color:#e2c477">The Tower · game</div><h2>${walking ? `Walking to ${esc(c.goal.label)}…` : 'Where to next?'}</h2><p class="small muted">Tap a building, an island or the world map to travel. Each building is a workshop, and every venture has its own island across a sky-bridge that builds itself up as the venture rises the tower.</p></div>
    <div class="gm-chars">${card('matthew')}${card('lizzie')}</div>
    <h4 class="eng-sub">Workshops</h4>
    <div class="gm-places">${GW.PLACES.map((p) => { const st = placeStat(sc, p.k), sv = st.needs.reduce((a, n) => Math.max(a, n.sev), 0), W = GW.WORKSHOPS[p.k]; return `<button class="gm-place" data-act="goto" data-id="${p.k}"><span class="gm-pin" style="background:${p.k === 'hq' ? '#e2c477' : GROUPS[p.group]?.color || '#888'}"></span><span class="grow"><b>${esc(W?.title || p.label)}</b></span>${st.needs.length ? `<span class="gm-n" style="background:${SEV_COLOR[sv]}">${st.needs.length}</span>` : ''}</button>`; }).join('')}</div>
    <h4 class="eng-sub">Venture islands</h4>
    <div class="gm-places">${GW.islands().map((p) => { const th = WI.THEMES[p.theme], n = sc.G.venture(p.id).needs.length; return `<button class="gm-place" data-act="goto" data-id="${p.k}"><span class="gm-pin" style="background:${th.color}"></span><span class="grow"><b>${esc(p.label)}</b><span class="small muted" style="display:block">${esc(th.title)} · ${p.level < 0 ? 'parked' : esc(WI.BUILD_STEPS[p.level].toLowerCase())}</span></span>${n ? `<span class="gm-n" style="background:${SEV_COLOR[2]}">${n}</span>` : ''}</button>`; }).join('') || '<p class="small muted">Plant a venture and its island appears.</p>'}</div>
    <h4 class="eng-sub">Orders of the day</h4>
    ${sc.G.quests.length ? `<div class="eng-feed">${sc.G.quests.map((n) => `<button class="eng-row gm-btnrow" data-act="goto" data-id="${questPlace(n)}"><span class="eng-dot" style="background:${SEV_COLOR[n.sev]}"></span><span class="grow small">${esc(n.text)}</span>${n.xp ? `<span class="eng-xp">+${n.xp}</span>` : ''}</button>`).join('')}</div>` : '<p class="small muted">No open orders. Visit Venture HQ and write the next section of a plan.</p>'}
    ${empireHTML(sc, false).split('<h4 class="eng-sub">Orders of the day</h4>')[0]}`;
}

function districtHTML(sc, k) {
  const isle = GW.placeOf(k), v = isle && store.byId('ventures', isle.id), who = avatarCfg(activeId()).name;
  if (!v) { gameRT.at = null; return playHomeHTML(sc); }
  const th = WI.THEMES[isle.theme], lv = v.stage === 'Parked' ? -1 : FLOW.indexOf(v.stage), rd = readiness(v), nxt = nextStage(v.stage), st = sc.G.venture(v.id);
  if (!['build', 'plan', 'tasks', 'needs'].includes(gameRT.wtab)) gameRT.wtab = 'build';
  const tab = (id, l, n) => `<button class="eng-tab ${gameRT.wtab === id ? 'on' : ''}" data-act="wtab" data-tab="${id}">${l}${n != null ? `<span class="n">${n}</span>` : ''}</button>`;
  const tasks = (v.tasks || []).slice().sort((a, b) => (a.done - b.done) || String(a.due || '9').localeCompare(String(b.due || '9')));
  let body = '';
  if (gameRT.wtab === 'build') {
    body = `<div class="gm-steps">${WI.BUILD_STEPS.map((s, i) => `<div class="gm-step ${i <= lv ? 'done' : i === lv + 1 ? 'next' : ''}"><span class="tick">${i <= lv ? '✓' : i + 1}</span><span class="grow"><b>${esc(s)}</b><span class="small muted" style="display:block">${i <= lv ? `Built at ${FLOW[i]}` : `Unlocks when ${esc(v.name)} rises to ${FLOW[i]}`}</span></span></div>`).join('')}</div>
      ${v.stage === 'Parked' ? `<p class="small muted">${esc(STAGE_INFO.Parked)}</p><button class="btn primary" data-act="revive" data-id="${v.id}">Revive to Idea</button>` : nxt ? `<h4 class="eng-sub">To build the next stage <span class="muted">· +${100 * (FLOW.indexOf(nxt) + 1)} XP</span></h4>${gateList(rd.gates)}<div class="eng-actions"><button class="btn ${rd.pct >= 1 ? 'primary' : ''}" data-act="advance" data-id="${v.id}">${icon('arrow')} Rise to ${nxt}</button></div>` : '<p class="small muted">Fully built. This venture is at the canopy.</p>'}`;
  } else if (gameRT.wtab === 'plan') { gameRT.planV = v.id; body = planStudioHTML(); }
  else if (gameRT.wtab === 'tasks') {
    body = `<div class="row" style="margin:6px 0 10px"><button class="btn primary sm" data-act="gameTaskNew" data-ws="hq" data-venture="${v.id}">${icon('plus')} New task</button><span class="small muted right">+10 XP each when done</span></div>
      ${tasks.length ? tasks.slice(0, 20).map((x) => `<div class="check-item ${x.done ? 'done' : ''}"><input type="checkbox" ${x.done ? 'checked' : ''} data-change="gameTaskDone" data-id="${esc(x.id)}" data-src="${esc(v.id)}" aria-label="Done"><div class="txt">${esc(x.text)}<div class="small muted">${x.due ? `due ${fmtDate(x.due)}` : 'no date'}${x.done && x.doneOn ? ` · done ${fmtDate(x.doneOn)}` : ''}</div></div></div>`).join('') : '<p class="small muted">No tasks for this venture yet.</p>'}`;
  } else body = statusHTML(st);
  return `<div class="eng-head"><div class="eyebrow" style="color:${th.color}">${esc(who)} is visiting · ${esc(th.title)}</div><h2>${esc(v.name)}</h2><p class="small muted">${esc(th.blurb)}</p></div>
    <div class="row" style="gap:8px;margin-bottom:8px;flex-wrap:wrap"><button class="btn sm ghost" data-act="leavePlace">← Leave</button><a class="btn sm ghost" href="#/ventures/${v.id}">Open the venture</a><span class="badge right" style="color:${STAGE_COLOR[v.stage]}">${esc(v.stage)} · ${rd.met}/${rd.total} gates</span></div>
    <div class="eng-tabs gm-tabs">${tab('build', 'Build', null)}${tab('plan', 'Plan', `${GW.planProgress(v).done}/${GW.PLAN.length}`)}${tab('tasks', 'Tasks', tasks.filter((x) => !x.done).length)}${tab('needs', 'Needs you', st.needs.length)}</div>
    <div class="gm-body">${body}</div>`;
}

function workshopHTML(sc, k) {
  if (String(k).startsWith('v:')) return districtHTML(sc, k);
  const W = GW.WORKSHOPS[k], place = GW.placeOf(k), who = avatarCfg(activeId()).name;
  if (!W) { gameRT.at = null; return playHomeHTML(sc); }
  const st = placeStat(sc, k), tasks = tasksAt(k), open = tasks.filter((x) => !x.done);
  const tab = (id, l, n) => `<button class="eng-tab ${gameRT.wtab === id ? 'on' : ''}" data-act="wtab" data-tab="${id}">${l}${n != null ? `<span class="n">${n}</span>` : ''}</button>`;
  const learned = gs().learned || {};
  let body = '';
  if (gameRT.wtab === 'learn') {
    const arts = (W.domain ? wikiArticles.filter((a) => a.domain === W.domain) : wikiArticles.slice().sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')))).slice(0, 5);
    body = `<div class="gm-lessons">${W.lessons.map(([id, title, text]) => { const key = `${k}.${id}`, done = learned[key]; return `<div class="gm-lesson ${done ? 'done' : ''}"><div class="row" style="gap:8px"><span class="tick">${done ? '✓' : ''}</span><b class="grow">${esc(title)}</b>${done ? `<span class="small muted">${fmtDate(done)}</span>` : `<span class="eng-xp">+${GW.LESSON_XP}</span>`}</div><p class="small" style="margin:6px 0 8px 24px">${esc(text)}</p>${done ? '' : `<button class="btn sm" style="margin-left:24px" data-act="learn" data-id="${key}">I've got this</button>`}</div>`; }).join('')}</div>
      <h4 class="eng-sub">From the wiki</h4>${arts.length ? `<div class="list">${arts.map((a) => `<a class="list-item" href="#/wiki/${esc(a.slug)}"><span class="grow small"><b>${esc(a.title)}</b>${a.summary ? `<span class="muted" style="display:block">${esc(a.summary.slice(0, 110))}${a.summary.length > 110 ? '…' : ''}</span>` : ''}</span></a>`).join('')}</div>` : `<p class="small muted">No articles here yet. <button class="btn sm" data-act="gameAsk" data-ws="${k}">Ask Claude to research this area</button></p>`}`;
  } else if (gameRT.wtab === 'do') {
    body = `${k === 'hq' ? planStudioHTML() : ''}
      <h4 class="eng-sub">${k === 'hq' ? 'Also at HQ' : 'Tools in this workshop'}</h4>
      <div class="gm-actions">${W.actions.map(([href, l]) => `<a class="btn" href="${href}">${esc(l)} ${icon('arrow')}</a>`).join('')}
        <button class="btn" data-act="gameTaskNew" data-ws="${k}">${icon('plus')} New task here</button>
        ${k !== 'hq' ? `<button class="btn" data-act="gameAsk" data-ws="${k}">${icon('spark')} Ask Claude</button>` : ''}</div>`;
  } else if (gameRT.wtab === 'tasks') {
    body = `<div class="row" style="margin:6px 0 10px"><button class="btn primary sm" data-act="gameTaskNew" data-ws="${k}">${icon('plus')} New task</button><span class="small muted right">+10 XP each when done</span></div>
      ${tasks.length ? tasks.slice(0, 20).map((x) => `<div class="check-item ${x.done ? 'done' : ''}"><input type="checkbox" ${x.done ? 'checked' : ''} data-change="gameTaskDone" data-id="${esc(x.id)}" data-src="${esc(x.src)}" aria-label="Done"><div class="txt">${esc(x.text)}<div class="small muted">${x.vname ? `${esc(x.vname)} · ` : ''}${x.due ? `due ${fmtDate(x.due)}` : 'no date'}${x.done && x.doneOn ? ` · done ${fmtDate(x.doneOn)}` : ''}</div></div></div>`).join('') : '<p class="small muted">No tasks in this workshop yet. Tasks with a date reach your Command Centre deadlines.</p>'}`;
  } else body = statusHTML(st);
  return `<div class="eng-head"><div class="eyebrow" style="color:#e2c477">${esc(who)} is in the workshop</div><h2>${esc(W.title)}</h2><p class="small muted">${esc(W.theme)}</p></div>
    <div class="row" style="gap:8px;margin-bottom:8px"><button class="btn sm ghost" data-act="leavePlace">← Leave</button>${k !== 'hq' && place ? `<a class="btn sm ghost" href="${MODULES.find((m) => m.k === k)?.href || '#/engine'}">Open the full module</a>` : ''}</div>
    <div class="eng-tabs gm-tabs">${tab('learn', 'Learn', W.lessons.filter(([id]) => !learned[`${k}.${id}`]).length || null)}${tab('do', k === 'hq' ? 'Plan Studio' : 'Do')}${tab('tasks', 'Tasks', open.length)}${tab('needs', 'Needs you', st.needs.length)}</div>
    <div class="gm-body">${body}</div>`;
}

function planStudioHTML() {
  const vs = liveVentures();
  if (!vs.length) return '<p class="small muted">Plant a venture first: the plan belongs to a venture.</p>';
  if (!vs.some((v) => v.id === gameRT.planV)) gameRT.planV = vs[0].id;
  const v = vs.find((x) => x.id === gameRT.planV), pr = GW.planProgress(v), p = v.plan || {};
  return `<div class="gm-plan">
    <div class="row" style="gap:8px;flex-wrap:wrap"><select class="pill-select" data-change="planVenture" aria-label="Venture">${vs.map((x) => `<option value="${x.id}" ${x.id === v.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><span class="small muted right">${pr.done}/${pr.total} sections</span></div>
    <div class="bar-track" style="margin:8px 0 10px"><div class="bar-fill" style="width:${Math.round(pr.pct * 100)}%;background:linear-gradient(90deg,#c9a54c,#ffe39a)"></div></div>
    ${GW.PLAN.map(([key, title, prompt]) => { const done = (p[key]?.text || '').trim().length >= 20; return `<button class="gm-sec ${done ? 'done' : ''}" data-act="planEdit" data-k="${key}"><span class="tick">${done ? '✓' : ''}</span><span class="grow"><b>${esc(title)}</b><span class="small muted" style="display:block">${esc(done ? p[key].text.slice(0, 90) + (p[key].text.length > 90 ? '…' : '') : prompt)}</span></span>${done ? '' : `<span class="eng-xp">+${GW.PLAN_XP}</span>`}</button>`; }).join('')}
    <div class="gm-actions" style="margin-top:10px"><button class="btn sm" data-act="planCopy">Copy plan</button><button class="btn sm" data-act="planAsk" ${pr.done ? '' : 'disabled'}>${icon('spark')} Ask Claude to critique</button><a class="btn sm ghost" href="#/ventures/${v.id}">Open venture</a></div></div>`;
}

const SWATCH = [['#1f3a5f', 'Navy'], ['#f4f4f2', 'White'], ['#1d1f24', 'Black'], ['#c9a54c', 'Gold'], ['#d9667a', 'Rose'], ['#7fb2e5', 'Sky blue'], ['#6b7a3a', 'Olive'], ['#7a2335', 'Burgundy'], ['#d8cbb0', 'Stone'], ['#8c939c', 'Grey'], ['#2f6e4a', 'Green'], ['#b8392e', 'Red'], ['#e9c46a', 'Sand'], ['#5b3a8e', 'Purple']];
function wardrobeForm(id) {
  const a = avatarCfg(id), opts = (arr) => arr.map(([v, l]) => ({ v, l })), sw = opts(SWATCH);
  const withCur = (list, cur) => (list.some((x) => x.v === cur) ? list : [{ v: cur, l: `Current (${cur})` }, ...list]);
  openForm({ title: `Wardrobe: ${a.name}`, wide: true, intro: '<p class="small muted" style="margin-top:0">Match the character to the real person. A photo helps Claude tune these exactly.</p>', values: a, fields: [
    { k: 'name', label: 'Name', required: true },
    { k: 'skin', label: 'Skin tone', type: 'select', options: withCur(SKIN.map((c, i) => ({ v: c, l: `Tone ${i + 1}` })), a.skin) },
    { k: 'hair', label: 'Hair colour', type: 'select', options: withCur(HAIR.map((c, i) => ({ v: c, l: ['Black', 'Dark brown', 'Brown', 'Chestnut', 'Light brown', 'Dark blonde', 'Blonde', 'Red', 'Grey'][i] })), a.hair) },
    { k: 'hairStyle', label: 'Hair style', type: 'select', options: opts(HAIR_STYLES) }, { k: 'facial', label: 'Facial hair', type: 'select', options: opts(FACIAL) },
    { k: 'top', label: 'Top', type: 'select', options: opts(TOPS) }, { k: 'topColor', label: 'Top colour', type: 'select', options: withCur(sw, a.topColor) },
    { k: 'bottomColor', label: 'Trousers or skirt colour', type: 'select', options: withCur(sw, a.bottomColor) }, { k: 'shoes', label: 'Shoes', type: 'select', options: withCur(sw, a.shoes) },
    { k: 'accessory', label: 'Accessory', type: 'select', options: opts(ACCESSORIES) }, { k: 'accent', label: 'Cap, visor or accent colour', type: 'select', options: withCur(sw, a.accent) },
  ], onSave: (d) => { store.update((s) => { s.settings.game = { ...(s.settings.game || {}) }; s.settings.game.avatars = { ...(s.settings.game.avatars || {}), [id]: { ...a, ...d } }; }); toast(`${d.name} updated`, 'ok'); } });
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
    try { const ix = await K.loadIndex(); wikiArticles = ix.articles || []; wikiCount = wikiArticles.length; } catch { wikiCount = 0; wikiArticles = []; }
    const live = s.ventures.filter((v) => v.stage !== 'Parked');
    const rows = live.map((v) => ({ v, r: readiness(v) })).sort((a, b) => FLOW.indexOf(b.v.stage) - FLOW.indexOf(a.v.stage) || b.r.pct - a.r.pct);
    const t = s.settings.tower || {};
    return `
    <div class="page-head"><div><div class="eyebrow">Build</div><h1>The Tower</h1>
      <p>Your empire as a living building, and a game. Press Play to walk the island as yourself or Lizzie: every building is a workshop where you learn, write your business plans and set tasks. Switch layers to see what needs you and what is done, and watch the skyline grow as real work earns XP.</p></div>
      <div class="actions"><button class="btn" data-act="resetCam">${icon('sync')} Reset view</button><button class="btn" data-act="toggleSpin">${cam.auto ? 'Pause rotation' : 'Rotate'}</button><a class="btn primary" href="#/ventures" data-act="newVenture">${icon('plus')} New idea</a></div></div>
    <div class="eng-wrap">
      <div class="eng-stage card flush"><canvas id="eng-canvas" aria-hidden="true"></canvas><canvas id="eng-overlay" aria-label="3D model of the venture tower: stage floors, the seed vault, the connected pavilions and outposts"></canvas>
        <div class="eng-layers" role="toolbar" aria-label="Tower layers"><button class="eng-layer eng-play ${t.play ? 'on' : ''}" data-act="playToggle">${t.play ? '■ Exit game' : '▶ Play'}</button>${LAYERS.map(([k, l]) => `<button class="eng-layer ${(t.layer || 'pipeline') === k ? 'on' : ''}" data-act="layer" data-id="${k}" aria-pressed="${(t.layer || 'pipeline') === k}">${l}</button>`).join('')}
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
    playToggle(el) { const on = !isPlay(); setTower({ play: on }); el.textContent = on ? '■ Exit game' : '▶ Play'; el.classList.toggle('on', on); loop?.setPlay(on); if (on) toast('Tap a building to walk there', 'ok'); },
    goto(el) { if (!isPlay()) { setTower({ play: true }); loop?.setPlay(true); document.querySelector('.eng-play')?.classList.add('on'); } loop?.walkTo(el.dataset.id); },
    leavePlace() { gameRT.at = null; selected = { kind: 'core', id: null }; loop?.panel(); },
    wtab(el) { gameRT.wtab = el.dataset.tab; loop?.panel(); },
    playAs(el) { store.update((s) => { s.settings.game = { ...(s.settings.game || {}), active: el.dataset.id }; }, { render: false }); gameRT.at = null; loop?.panel(); toast(`Playing as ${avatarCfg(el.dataset.id).name}`, 'ok'); },
    wardrobe(el) { wardrobeForm(el.dataset.id); },
    learn(el) { const id = el.dataset.id; store.update((s) => { s.settings.game = { ...(s.settings.game || {}) }; s.settings.game.learned = { ...(s.settings.game.learned || {}), [id]: today() }; }, { render: false }); toast(`Lesson learned: +${GW.LESSON_XP} XP`, 'ok'); loop?.refresh(); },
    gameTaskNew(el) {
      const ws = el.dataset.ws || gameRT.at || 'hq';
      openForm({ title: `New task · ${GW.WORKSHOPS[ws]?.title || 'Workshop'}`, values: { ws, venture: el.dataset.venture || (ws === 'hq' ? gameRT.planV || '' : '') }, fields: [
        { k: 'text', label: 'What needs doing?', required: true, full: true },
        { k: 'venture', label: 'Venture', type: 'select', options: () => [{ v: '', l: 'General (the empire)' }, ...liveVentures().map((v) => ({ v: v.id, l: v.name }))] },
        { k: 'due', label: 'Due date', type: 'date', hint: 'Dated tasks reach your deadlines' },
        { k: 'ws', label: 'Workshop', type: 'select', options: GW.PLACES.map((p) => ({ v: p.k, l: GW.WORKSHOPS[p.k]?.title || p.label })) },
      ], onSave: (d) => {
        store.update((s) => {
          const rec = { id: uid('t'), text: d.text, due: d.due || '', done: false, doneOn: '', ws: d.ws, created: today() };
          if (d.venture) { const v = s.ventures.find((x) => x.id === d.venture); (v.tasks ||= []).push(rec); v.updated = today(); } else (s.gameTasks ||= []).push(rec);
        }, { render: false });
        toast('Task created', 'ok'); gameRT.wtab = 'tasks'; loop?.refresh();
      } });
    },
    gameTaskDone(el) {
      store.update((s) => {
        const list = el.dataset.src === 'g' ? s.gameTasks : s.ventures.find((v) => v.id === el.dataset.src)?.tasks;
        const x = (list || []).find((y) => y.id === el.dataset.id); if (!x) return;
        x.done = el.checked; x.doneOn = el.checked ? today() : '';
      }, { render: false });
      if (el.checked) toast('Done: +10 XP', 'ok');
      loop?.refresh();
    },
    planVenture(el) { gameRT.planV = el.value; loop?.panel(); },
    planEdit(el) {
      const v = store.byId('ventures', gameRT.planV), key = el.dataset.k, sec = GW.PLAN.find((x) => x[0] === key), cur = (v.plan || {})[key] || {};
      openForm({ title: `${v.name}: ${sec[1]}`, wide: true, values: { text: cur.text || '' }, fields: [{ k: 'text', label: sec[2], type: 'textarea', full: true, hint: 'Twenty characters or more counts as written. Be specific: names, numbers, dates.' }],
        onSave: (d) => {
          const was = (cur.text || '').trim().length >= 20, now = (d.text || '').trim().length >= 20;
          store.update((s) => { const x = s.ventures.find((y) => y.id === v.id); x.plan = { ...(x.plan || {}), [key]: { text: d.text || '', on: cur.on || today() } }; x.updated = today(); }, { render: false });
          if (now && !was) toast(`Plan section written: +${GW.PLAN_XP} XP`, 'ok');
          loop?.refresh();
        } });
    },
    planCopy() { const v = store.byId('ventures', gameRT.planV); copyText(GW.planMarkdown(v)); toast('Plan copied as Markdown', 'ok'); },
    planAsk() {
      const v = store.byId('ventures', gameRT.planV);
      K.addToQueue({ type: 'review', title: `Plan review: ${v.name}`, question: `Critique this business plan as a sceptical investor would. For each section say what is strong, what is missing or unproven, and the cheapest test that would prove or disprove it. Check any market figures against current sources and cite them.

${GW.planMarkdown(v)}`, domain: 'Business & Ventures', venture: v.id, priority: 'Normal' });
      toast(K.mode() === 'connected' ? 'Sent to Claude' : 'Queued. Connect your vault so Claude can pick it up.', 'ok');
    },
    gameAsk(el) {
      const ws = el.dataset.ws, W = GW.WORKSHOPS[ws];
      openForm({ title: `Ask Claude · ${W?.title || ''}`, fields: [{ k: 'title', label: 'Your question', required: true, full: true, placeholder: 'Decision-shaped: what will the answer help you decide?' }, { k: 'question', label: 'Detail and the decision it informs', type: 'textarea' }],
        onSave: (d) => { K.addToQueue({ type: 'research', title: d.title, question: d.question || '', domain: W?.domain || 'Business & Ventures', venture: '', priority: 'Normal' }); toast(K.mode() === 'connected' ? 'Sent to Claude' : 'Queued. Connect your vault so Claude can pick it up.', 'ok'); } });
    },
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
