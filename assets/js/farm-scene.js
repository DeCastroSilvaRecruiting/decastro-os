// Grounded nature-farm scene. Keeps the existing workshop and progression contracts.
import { Mesh, box, tube, sphere, lathe, circlePts, hex, mt, rng, V, TAU } from './gl.js';
import { FLOW, ALL_DEFS, polar, STAGE_COLOR, SEV_COLOR } from './tower-scene.js';
import { islandSlots, BRIDGE_END } from './world-islands.js';
export { FLOW, ALL_DEFS, MODULE_DEFS, OUTPOST_DEFS, GROUPS, polar, STAGE_COLOR, SEV_COLOR } from './tower-scene.js';
export const STAGE_NAME = { Idea:'Seed beds', Validate:'Nursery', Plan:'Young orchard', Build:'Growing rows', Launch:'First harvest', Scale:'Mature orchard', Parked:'Seed store' };
export const VAULT_C = [3.8,0.45,0], VAULT_R = 0.6;
export const FH = 0.8;
export const stageCenter = st => st === 'Parked' ? VAULT_C.slice() : [[-2,0.25,-2],[0,0.25,-2],[2,0.25,-2],[-2,0.25,0],[0,0.25,0],[2,0.25,0]][Math.max(0,FLOW.indexOf(st))].slice();
export const floorY = () => 0.05;
export const stageMidY = () => 0.5;
export const rad = () => 0.8;
export const modBodyTop = () => 1.15;
export const modTopY = () => 1.85;
const mat = (color,rough=0.9) => ({col:hex(color),mat:mt(rough,0,0,0)});
const wood=mat('#786049'), wall=mat('#ded6bb'), roof=mat('#956b51'), stone=mat('#b5ab8f');
const add=(R,m,tag='static',extra={})=>R.addGroup(m,{pass:'opaque',shadow:true,tag,...extra});
function ellipsoid(m,p,r,color,seg=10){
 const q=new Mesh();sphere(q,[0,0,0],1,seg,mat(color));const off=m.n;
 for(let i=0;i<q.n;i++){const k=i*16,d=q.v.slice(k,k+3),n=V.norm(d.map((x,j)=>x/r[j]));m.vert(d.map((x,j)=>p[j]+x*r[j]),n,q.v.slice(k+6,k+10),q.v.slice(k+10,k+14));}
 for(const ix of q.idx)m.idx.push(ix+off);
}
function tree(m,x,z,size=1,fruit=false){
 tube(m,[[x,0,z],[x+0.03,0.7*size,z],[x-0.04,1.1*size,z]],0.065*size,7,wood);
 for(const [dx,dz] of [[-.2,.1],[.18,.15],[0,-.2]]){
  tube(m,[[x,0.55*size,z],[x+dx*size,1.05*size,z+dz*size]],0.025*size,5,wood);
  ellipsoid(m,[x+dx*size,1.12*size,z+dz*size],[.38*size,.46*size,.34*size],fruit?'#61774a':'#647257');
 }
 if(fruit)for(let j=0;j<5;j++){const a=j*2.4;sphere(m,[x+Math.cos(a)*.32*size,(1.12+j*.035)*size,z+Math.sin(a)*.32*size],.045*size,6,mat('#b69849'));}
}
function gable(m,x,z,w,d,h,material=roof){
 const p=[[x-w/2,h,z-d/2],[x+w/2,h,z-d/2],[x,h+.5,z-d/2],[x-w/2,h,z+d/2],[x+w/2,h,z+d/2],[x,h+.5,z+d/2]];
 for(const ids of [[0,3,5,2],[2,5,4,1]]){const n=V.norm(V.cross(V.sub(p[ids[1]],p[ids[0]]),V.sub(p[ids[2]],p[ids[0]]))),vs=ids.map(i=>m.vert(p[i],n,material.col,material.mat));m.quad(...vs);}
 for(const ids of [[0,2,1],[3,4,5]]){const n=V.norm(V.cross(V.sub(p[ids[1]],p[ids[0]]),V.sub(p[ids[2]],p[ids[0]]))),vs=ids.map(i=>m.vert(p[i],n,wall.col,wall.mat));m.tri(...vs);}
}
function building(m,x,z,w=1.65,d=1.3,color='#ded6bb'){
 box(m,[x,.64,z],w,1.28,d,0,mat(color));gable(m,x,z,w+.18,d+.18,1.28);
 box(m,[x,.43,z+d/2+.012],.35,.86,.025,0,wood);
 for(const side of [-1,1]){box(m,[x+side*w*.32,.77,z+d/2+.025],.28,.34,.025,0,mat('#52757a',.25));box(m,[x+side*w*.32,.77,z+d/2+.045],.022,.34,.015,0,wall);}
 box(m,[x+w*.3,1.55,z-d*.2],.18,.6,.2,0,stone);
}
function path(m,points,width){
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],len=Math.hypot(b[0]-a[0],b[2]-a[2]);if(len<1e-6)continue;
  const dx=-(b[2]-a[2])/len*width,dz=(b[0]-a[0])/len*width,o=mat('#b9ac8d');
  const ps=[[a[0]-dx,.025,a[2]-dz],[b[0]-dx,.025,b[2]-dz],[b[0]+dx,.025,b[2]+dz],[a[0]+dx,.025,a[2]+dz]];
  const ids=ps.map(p=>m.vert(p,[0,1,0],o.col,o.mat));m.quad(...ids.reverse());
 }
}
function fence(m,x0,z0,x1,z1){
 const len=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.ceil(len/.7));
 for(let i=0;i<=n;i++){const t=i/n;box(m,[x0+(x1-x0)*t,.25,z0+(z1-z0)*t],.045,.5,.045,0,wood);}
 for(const y of [.18,.38])tube(m,[[x0,y,z0],[x1,y,z1]],.022,4,wood);
}
function bed(m,x,z,stage=0){
 box(m,[x,.1,z],1.5,.18,1.2,0,wood);box(m,[x,.2,z],1.38,.035,1.08,0,mat('#554736'));
 for(let row=0;row<3;row++)for(let col=0;col<5;col++){
  const px=x-.53+col*.265,pz=z-.36+row*.36,h=.08+stage*.04;
  if(stage>=4){tube(m,[[px,.2,pz],[px,.2+h,pz]],.012,4,mat('#77774d'));sphere(m,[px,.2+h,pz],.055,6,mat('#c5ac63'));}
  else ellipsoid(m,[px,.22+h*.4,pz],[.08+h*.1,h,.09+h*.1],stage<2?'#768653':'#526b40',6);
 }
}
function greenhouse(R,x,z){
 const m=new Mesh(),glass=new Mesh();
 for(const dx of [-.8,.8])for(const dz of [-.65,.65])tube(m,[[x+dx,0,z+dz],[x+dx,1.1,z+dz],[x,1.65,z+dz]],.023,5,wood);
 for(const dx of [-.8,0,.8])tube(m,[[x+dx,dx===0?1.65:1.1,z-.65],[x+dx,dx===0?1.65:1.1,z+.65]],.024,5,wood);
 gable(glass,x,z,1.6,1.3,1.1,{col:[.58,.77,.74,.24],mat:mt(.15,0,0,3)});
 add(R,m);R.addGroup(glass,{pass:'glass',tag:'static',center:[x,.8,z]});
}
export function buildStatic(R){
 const reg={floors:[],modules:{},bridges:[],myc:[],exo:null,crown:[],vault:[]},ground=new Mesh();
 box(ground,[0,-.18,0],145,.3,145,0,mat('#697655'));
 // Broad natural paths: the same routes used by the walking characters.
 path(ground,circlePts(7.62,.025,160),.3);
 path(ground,[[0,.025,-8],[0,.025,8]],.24);
 path(ground,[[-7,.025,0],[7,.025,0]],.22);
 add(R,ground);
 for(const st of FLOW){const p=stageCenter(st),m=new Mesh();bed(m,p[0],p[2],FLOW.indexOf(st));reg.floors.push([add(R,m)]);}
 const main=new Mesh();building(main,0,2.55,2.2,1.25,'#e6dfcc');building(main,VAULT_C[0],0,.95,.85,'#b9ac8e');
 reg.vault=[add(R,main)];
 for(const d of ALL_DEFS){const p=polar(d.deg,d.r),m=new Mesh();building(m,p[0],p[2],d.group==='operations'?1.35:1.55,1.15,d.k==='commerce'?'#a68b70':'#d5cdb5');reg.modules[d.k]=[add(R,m)];}
 greenhouse(R,-3.8,2.4);
 const plants=new Mesh(),rnd=rng(752);
 for(let i=0;i<34;i++){const a=i/34*TAU,r=10+rnd()*3;tree(plants,Math.cos(a)*r,Math.sin(a)*r,.8+rnd()*.45,i%3===0);}
 for(let row=0;row<9;row++)for(let col=0;col<15;col++){
  const x=11+col*.65,z=-8+row*.75;
  tube(plants,[[x,.03,z],[x,.4,z]],.018,4,wood);ellipsoid(plants,[x,.42,z],[.24,.2,.2],row%2?'#647b49':'#71854e',6);
 }
 for(let i=0;i<6;i++)fence(plants,10,-9+i*2.1,21,-9+i*2.1);
 // Pond, reed fringe and orchard in the opposite meadow.
 const pond=new Mesh();ellipsoid(pond,[-10,.01,3.5],[2.5,.035,1.6],'#597f7c',32);add(R,pond);
 for(let i=0;i<28;i++){const a=i/28*TAU,x=-10+Math.cos(a)*2.65,z=3.5+Math.sin(a)*1.75;tube(plants,[[x,0,z],[x,.32+rnd()*.25,z]],.018,4,mat('#8a8956'));}
 for(let x=-18;x<=-11;x+=2)for(let z=-9;z<=-3;z+=2)tree(plants,x,z,1.1,true);
 fence(plants,-8,-9,8,-9);fence(plants,-8,9,8,9);
 for(let i=0;i<80;i++){const a=rnd()*TAU,r=8.7+rnd()*3,p=polar(a*180/Math.PI,r);sphere(plants,[p[0],.12,p[2]],.045,5,mat(['#c3ac68','#a496b3','#e1d6b5'][i%3]));}
 add(R,plants);return reg;
}
export function buildDistricts(R,s){
 const slots=islandSlots(s),m=new Mesh();
 for(const sl of slots){
  const [x,,z]=sl.c;box(m,[x,-.005,z],7.8,.025,7.8,0,mat('#77825a'));
  const a=polar(sl.deg,7.8),b=polar(sl.deg,BRIDGE_END+2);
  path(m,[[a[0],.025,a[2]],[b[0],.025,b[2]]],.3);
  fence(m,x-3.8,z-3.8,x+3.8,z-3.8);fence(m,x-3.8,z-3.8,x-3.8,z+3.8);
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)bed(m,x-2.3+c*1.8,z-2+r*1.6,Math.max(0,sl.level));
  if(sl.level>=2)building(m,x+1.6,z+2,1.8,1.3,'#d9d1b8');
  else {box(m,[x+1.5,.25,z+2],1.4,.5,.8,0,wood);}
  tree(m,x-2.6,z+2,1+Math.max(0,sl.level)*.06,true);
 }
 add(R,m);return slots;
}
export function buildVentures(R,sc,links){
 R.removeTag('dyn');const refs={pods:{},links:[]};
 for(const v of sc.ventures){const m=new Mesh(),[x,y,z]=v.pos;
  tube(m,[[x,.2,z],[x,y+.22,z]],.025,5,wood);sphere(m,[x,y+.24,z],.11,10,mat(v.color));
  tube(m,circlePts(.2,.24,24,x,z,0,TAU*Math.max(.02,v.ready.pct)),.016,4,mat(v.ready.pct>=1?'#88a563':'#c2aa68'));
  refs.pods[v.id]=add(R,m,'dyn');
 }
 for(const L of links){const d=ALL_DEFS.find(m=>m.k===L.to.k),b=polar(d.deg,d.r),m=new Mesh();tube(m,[[b[0],.08,b[2]],[L.from.pos[0],.08,L.from.pos[2]]],.025,5,mat('#cfb57f'));refs.links.push({L,g:add(R,m,'dyn')});}
 return refs;
}
export function buildBeacons(R,items){
 R.removeTag('beacon');return items.map(it=>{const d=ALL_DEFS.find(d=>d.k===it.id),p=it.pos|| (it.kind==='module'&&d?polar(d.deg,d.r):stageCenter(it.id)),m=new Mesh();
 const y=it.kind==='module'?2.1:1; sphere(m,[p[0],y,p[2]],.09,8,mat(SEV_COLOR[it.sev]||'#d5b768'));return {...it,groups:[add(R,m,'beacon')]};});
}
export function buildPerks(R,level){
 R.removeTag('perk');const m=new Mesh(),rnd=rng(29);
 // Distant wooded hills replace the city skyline, crane and aerial traffic.
 for(let i=0;i<18;i++){const a=i/18*TAU,r=48+rnd()*8;ellipsoid(m,[Math.cos(a)*r,-1,Math.sin(a)*r],[9+rnd()*7,5+rnd()*9,8+rnd()*6],i%2?'#7c8970':'#687d63',18);}
 for(let i=0;i<level*4;i++){const a=i*2.4;tree(m,Math.cos(a)*16,Math.sin(a)*16,.8,true);}
 add(R,m,'perk');return {skyline:null,blink:null,crane:null};
}
