// Dependency-free regression checks for generated geometry and articulated poses.
import assert from 'node:assert/strict';
import { avatarMeshes, addAvatar, DEFAULT_AVATARS, TOPS, HAIR_STYLES, ACCESSORIES } from '../assets/js/avatar.js';
import * as Farm from '../assets/js/farm-scene.js';
import { ESTATE_TOUR } from '../assets/js/farm-tour.js';
import { planGroundRoute } from '../assets/js/farm-navigation.js';
import { groundBlocked, PLACES, route, toXYZ } from '../assets/js/game-world.js';
import { SEED } from '../assets/js/seed.js';

function validateMesh(mesh) {
  assert.equal(mesh.v.length, mesh.n * 16, 'vertex layout must be complete');
  assert(mesh.v.every(Number.isFinite), 'geometry must have finite positions, normals and UVs');
  assert.equal(mesh.idx.length % 3, 0, 'indices must form triangles');
  assert(mesh.idx.every(i => Number.isInteger(i) && i >= 0 && i < mesh.n), 'indices must reference existing vertices');
}

let outfits = 0;
for (const base of Object.values(DEFAULT_AVATARS)) {
  for (const [top] of TOPS) for (const [hairStyle] of HAIR_STYLES) for (const [accessory] of ACCESSORIES) {
    for (const mesh of Object.values(avatarMeshes({ ...base, top, hairStyle, accessory }))) validateMesh(mesh);
    outfits++;
  }
  // An untextured character must also be renderable when no portrait is assigned.
  for (const mesh of Object.values(avatarMeshes({ ...base, portrait: null }))) validateMesh(mesh);
  const avatar = addAvatar({ addGroup(mesh) { validateMesh(mesh); return {}; } }, base, 'test');
  for (let phase = 0; phase < Math.PI * 2; phase += 0.2) {
    avatar.pose([1, 0.035, 2], 0.8, { walk: 1, phase, wave: 0.5, t: phase });
    for (const group of avatar.groups) assert(group.model.every(Number.isFinite), 'joint transforms must remain finite through a stride');
  }
}

let sceneGroups = 0;
const renderer = {
  addGroup(mesh, options) { validateMesh(mesh); sceneGroups++; return { dim: 1, occ: 0, hl: 0, ...options }; },
  removeTag() {},
};
const registry = Farm.buildStatic(renderer);
assert.equal(registry.floors.length, Farm.FLOW.length, 'every venture stage needs a garden bed');
for (const module of Farm.ALL_DEFS) assert(registry.modules[module.k]?.length, `missing workshop ${module.k}`);
Farm.buildDistricts(renderer, SEED);
Farm.buildPerks(renderer, 4);
for (const place of PLACES) {
  const points = route(toXYZ(92, 7.62), place);
  assert(points.length && points.flat().every(Number.isFinite), `route to ${place.k} must be walkable`);
}
console.log(`Passed: ${outfits} outfits, untextured fallback, animated joints, ${sceneGroups} scene groups and ${PLACES.length} workshop routes.`);

const detour=planGroundRoute([-3,0],[3,0],(x,z)=>Math.abs(x)<.6&&Math.abs(z)<2.2);
assert(detour?.length,'route must detour around an obstacle');
for(let i=1;i<detour.length;i++){const a=detour[i-1],b=detour[i];for(let t=0;t<=1;t+=.05)assert(!(Math.abs(a[0]+(b[0]-a[0])*t)<.6&&Math.abs(a[1]+(b[1]-a[1])*t)<2.2),'simplified route cuts through obstacle');}
assert.equal(planGroundRoute([0,0],[1,1],()=>true),null,'unreachable destination must fail safely');
assert(groundBlocked(-10,3.5),'pond must not be walkable');
const meadow=planGroundRoute([0,7.62],[-13,7],groundBlocked);assert(meadow?.length,'orchard approach must remain reachable');
assert(planGroundRoute([0,7.62],[15.6,-7.8],groundBlocked)?.length,'vineyard gates must remain reachable');
console.log('Passed: collision-aware free exploration, obstacle detours, pond boundary and vineyard gates.');

const fence=(x,z)=>Math.abs(x)<4&&Math.abs(z-.2)<.18;
const aroundFence=planGroundRoute([0,-2],[0,2],fence);assert(aroundFence?.length,'thin fences need a route around an end');
for(let i=1;i<aroundFence.length;i++){const a=aroundFence[i-1],b=aroundFence[i];for(let t=0;t<=1;t+=.025)assert(!fence(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t),'route crossed between grid samples through a fence');}
assert.equal(planGroundRoute([0,0],[50,50],()=>false),null,'outside-world targets must be rejected');
console.log('Passed: thin-fence collision and world bounds.');

const ambient=Farm.buildAmbient(renderer);
ambient.animate(0);const initial=ambient.wind.model.slice();ambient.animate(1);
assert.notDeepEqual(ambient.wind.model,initial,'wind pump must animate');
for(const b of ambient.birds)assert(b.group.model.every(Number.isFinite),'bird transforms must stay finite');
ambient.animate(0);assert.deepEqual(ambient.wind.model,initial,'ambient motion must support a deterministic reduced-motion pose');
console.log('Passed: ambient bird and wind-pump animation.');

for(const stop of ESTATE_TOUR){
 assert([...stop.target,...stop.walk,stop.yaw,stop.pitch,stop.zoom].every(Number.isFinite),'tour camera values must be finite');
 assert(planGroundRoute([0,7.62],stop.walk,groundBlocked)?.length,`tour destination ${stop.title} must be reachable`);
}
console.log(`Passed: all ${ESTATE_TOUR.length} tour destinations are reachable.`);
