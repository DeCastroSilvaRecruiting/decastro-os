// Grounded nature-farm scene. Keeps the existing workshop and progression contracts.
import { Mesh, box, tube, sphere, card, surface, lathe, circlePts, hex, mt, rng, V, TAU } from './gl.js';
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
const wood={...mat('#786049'),mat:mt(.85,0,0,17)}, wall={...mat('#ded6bb'),mat:mt(.94,0,0,18)}, roof={...mat('#956b51'),mat:mt(.85,0,0,19)}, stone={...mat('#b5ab8f'),mat:mt(.95,0,0,18)};
const add=(R,m,tag='static',extra={})=>{const g=R.addGroup(m,{pass:'opaque',shadow:true,tag,...extra});if(m.leaves&&!m.leaves.empty)R.addGroup(m.leaves,{pass:'foliage',tag});return g;};
function ellipsoid(m,p,r,color,seg=10,material=null){
 const q=new Mesh();sphere(q,[0,0,0],1,seg,material?{col:hex(color),mat:material}:mat(color));const off=m.n;
 for(let i=0;i<q.n;i++){const k=i*16,d=q.v.slice(k,k+3),n=V.norm(d.map((x,j)=>x/r[j]));m.vert(d.map((x,j)=>p[j]+x*r[j]),n,q.v.slice(k+6,k+10),q.v.slice(k+10,k+14));}
 for(const ix of q.idx)m.idx.push(ix+off);
}
function tree(m,x,z,size=1,fruit=false){
 const rnd=rng(Math.floor(Math.abs(x*941+z*1289))+31),leaves=(m.leaves ||= new Mesh());
 tube(m,[[x,0,z],[x+.04,.55*size,z],[x-.03,1.1*size,z+.02]],.055*size,10,wood);
 for(let branch=0;branch<7;branch++){
  const a=branch*2.39996,r=(.22+rnd()*.2)*size,dy=(.85+rnd()*.55)*size;
  const end=[x+Math.cos(a)*r,dy,z+Math.sin(a)*r];
  tube(m,[[x,.48*size,z],end],.018*size,6,wood);
  for(let i=0;i<22;i++){
   const t=rnd()*TAU,rr=Math.sqrt(rnd())*.3*size,yy=(rnd()-.4)*.42*size;
   const p=[end[0]+Math.cos(t)*rr,end[1]+yy,end[2]+Math.sin(t)*rr];
   const angle=rnd()*TAU,len=(.07+rnd()*.055)*size;
   card(leaves,p,[Math.cos(angle)*len,.015,Math.sin(angle)*len],[-Math.sin(angle)*len*.42,len*.34,Math.cos(angle)*len*.42],{col:[.24+rnd()*.13,.32+rnd()*.1,.16+rnd()*.1,.45],mat:mt(.8,0,0,7)});
  }
  if(fruit&&branch%2===0)sphere(m,[end[0],end[1]-.1,end[2]],.042*size,8,mat('#ae914c'));
 }
}

function gable(m,x,z,w,d,h,material=roof){
 const p=[[x-w/2,h,z-d/2],[x+w/2,h,z-d/2],[x,h+.5,z-d/2],[x-w/2,h,z+d/2],[x+w/2,h,z+d/2],[x,h+.5,z+d/2]];
 for(const ids of [[0,3,5,2],[2,5,4,1]]){const n=V.norm(V.cross(V.sub(p[ids[1]],p[ids[0]]),V.sub(p[ids[2]],p[ids[0]]))),vs=ids.map(i=>m.vert(p[i],n,material.col,material.mat));m.quad(...vs);}
 for(const ids of [[0,2,1],[3,4,5]]){const n=V.norm(V.cross(V.sub(p[ids[1]],p[ids[0]]),V.sub(p[ids[2]],p[ids[0]]))),vs=ids.map(i=>m.vert(p[i],n,wall.col,wall.mat));m.tri(...vs);}
}
function windowPane(m,c,yaw=0){
 box(m,c,.38,.44,.026,yaw,wood);
 const front=[c[0]+Math.sin(yaw)*.022,c[1],c[2]+Math.cos(yaw)*.022];
 box(m,front,.3,.36,.018,yaw,{col:hex('#667d7d'),mat:mt(.18,.1,0,26)});
 box(m,[front[0]+Math.sin(yaw)*.015,front[1],front[2]+Math.cos(yaw)*.015],.014,.36,.012,yaw,wall);
}
function building(m,x,z,w=1.65,d=1.3,color='#ded6bb'){
 box(m,[x,.64,z],w,1.28,d,0,{...wall,col:hex(color)});gable(m,x,z,w+.18,d+.18,1.28);
 box(m,[x,.43,z+d/2+.012],.35,.86,.025,0,wood);
 for(const side of [-1,1]){box(m,[x+side*w*.32,.77,z+d/2+.025],.28,.34,.025,0,mat('#52757a',.25));box(m,[x+side*w*.32,.77,z+d/2+.045],.022,.34,.015,0,wall);}
 box(m,[x+w*.3,1.55,z-d*.2],.18,.6,.2,0,stone);
 box(m,[x,.06,z],w+.09,.12,d+.09,0,stone);
 for(const side of [-1,1]){
  const wx=x+side*w*.32,front=z+d/2+.045;
  box(m,[wx,.77,front],.35,.42,.018,0,wood);
  box(m,[wx,.77,front+.015],.27,.34,.018,0,{col:hex('#667d7d'),mat:mt(.18,.1,0,26)});
  box(m,[wx,.77,front+.026],.018,.35,.018,0,wall);
  box(m,[wx,.77,front+.026],.28,.018,.018,0,wall);
  box(m,[wx,.54,front+.04],.39,.035,.11,0,stone);
  tube(m,[[x+side*(w/2+.06),.18,z-d/2],[x+side*(w/2+.06),1.28,z-d/2]],.018,6,wood);
 }
 for(let i=0;i<4;i++)box(m,[x-.14+i*.09,.43,z+d/2+.03],.006,.82,.012,0,wood);
 sphere(m,[x+.1,.43,z+d/2+.048],.013,8,mat('#a58b58',.3));
 for(const dz of [-d/2-.07,d/2+.07])tube(m,[[x-w/2-.05,1.27,z+dz],[x+w/2+.05,1.27,z+dz]],.025,6,wood);
 box(m,[x,.025,z+d/2+.24],.65,.04,.38,0,stone);
 for(const side of [-1,1]){windowPane(m,[x+side*w*.28,.79,z-d/2-.022],Math.PI);windowPane(m,[x+side*(w/2+.022),.79,z],side*Math.PI/2);}
 // A small terracotta planter and a leafy plant beside the entrance.
 lathe(m,[[.085,0],[.11,.15],[.12,.16],[.105,.17]],12,{cx:x+w*.36,cz:z+d/2+.18,col:hex('#a66f50'),mat:mt(.9,0,0,19)});
 for(let i=0;i<5;i++){const a=i*2.4;tube(m,[[x+w*.36,.15,z+d/2+.18],[x+w*.36+Math.cos(a)*.1,.27,z+d/2+.18+Math.sin(a)*.1]],.012,4,mat('#526c3f'));}

}
// Departments have recognisable silhouettes, not a ring of cloned houses.
function barn(m,x,z,color='#80634c'){
 box(m,[x,.7,z],1.85,1.4,1.25,0,{...wood,col:hex(color)});gable(m,x,z,2.02,1.42,1.4);
 for(const side of [-1,1]){
  box(m,[x+side*.29,.57,z+.64],.55,1.12,.035,0,wood);
  tube(m,[[x+side*.55,.08,z+.67],[x+side*.02,1.08,z+.67]],.018,5,wall);
 }
 tube(m,[[x-.85,1.27,z+.68],[x+.85,1.27,z+.68]],.025,6,wall);
 windowPane(m,[x,.9,z-.65],Math.PI);
 for(let i=0;i<13;i++)box(m,[x-.84+i*.14,.7,z+.632],.008,1.3,.016,0,wood);
 for(const side of [-1,1]){lathe(m,[[.22,0],[.22,.65],[.2,.72]],20,{cx:x+side*1.15,cz:z-.1,col:hex('#a6aa9a'),mat:mt(.55,.45,0,0)});}
}
function cottage(m,x,z){
 building(m,x,z,1.7,1.18,'#b9b5a0');
 // Stone buttresses and a shaded reading veranda.
 for(const side of [-1,1]){box(m,[x+side*.77,.63,z+.61],.12,1.26,.13,0,stone);tube(m,[[x+side*.72,.03,z+1.02],[x+side*.72,1.09,z+1.02]],.027,8,wood);}
 box(m,[x,1.12,z+.85],1.7,.055,.65,0,wood);
 for(let i=0;i<8;i++)box(m,[x-.76+i*.215,1.17,z+.85],.045,.04,.7,0,wood);
 box(m,[x,.24,z+.87],.85,.045,.24,0,wood);
}
function studio(m,x,z){
 box(m,[x,.53,z],1.65,1.06,1.2,0,{...wall,col:hex('#d8d0b7')});
 box(m,[x,1.11,z],1.85,.12,1.4,0,wood);
 for(let i=0;i<4;i++){box(m,[x-.59+i*.39,.58,z+.61],.35,.78,.025,0,{col:hex('#6b8887'),mat:mt(.18,.1,0,26)});box(m,[x-.785+i*.39,.58,z+.635],.022,.84,.02,0,wood);}
 windowPane(m,[x,.6,z-.625],Math.PI);
 box(m,[x,.06,z+.81],1.85,.12,.4,0,stone);
 for(const side of [-1,1])box(m,[x+side*.78,.35,z+.8],.16,.5,.2,0,wood);
}
function estatePorch(m){
 for(const x of [-.9,.9])tube(m,[[x,.03,3.55],[x,1.18,3.55]],.04,10,wall);
 box(m,[0,1.2,3.3],2.3,.09,.85,0,wood);
 box(m,[0,.035,3.3],2.4,.07,.9,0,stone);
 for(const x of [-.65,.65]){box(m,[x,.36,3.3],.38,.06,.27,0,wood);for(const dx of [-.13,.13])tube(m,[[x+dx,.03,3.3],[x+dx,.36,3.3]],.018,5,wood);}
}
function faceEntrance(m,c,angle){
 const co=Math.cos(angle),si=Math.sin(angle);
 for(let i=0;i<m.n;i++){const k=i*16,x=m.v[k]-c[0],z=m.v[k+2]-c[2],nx=m.v[k+3],nz=m.v[k+5];m.v[k]=c[0]+x*co+z*si;m.v[k+2]=c[2]-x*si+z*co;m.v[k+3]=nx*co+nz*si;m.v[k+5]=-nx*si+nz*co;}
 if(m.leaves)faceEntrance(m.leaves,c,angle);
}
function path(m,points,width){
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],len=Math.hypot(b[0]-a[0],b[2]-a[2]);if(len<1e-6)continue;
  const dx=-(b[2]-a[2])/len*width,dz=(b[0]-a[0])/len*width,o={col:hex('#b9ac8d'),mat:mt(.98,0,0,20)};
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
 for(const side of [-1,1]){
  card(glass,[x+side*.8,.55,z],[0,0,.65],[0,.55,0],{col:[.65,.78,.75,.17],mat:mt(.12,0,0,3)},[side,0,0]);
  for(let i=0;i<4;i++)tube(m,[[x+side*.8,0,z-.65+i*.43],[x+side*.8,1.1,z-.65+i*.43]],.012,5,wood);
 }
 box(m,[x,.4,z],1.2,.08,.8,0,wood);
 for(let i=0;i<6;i++)ellipsoid(m,[x-.45+i*.18,.52,z],[.08,.12,.08],'#587544',8);

 add(R,m);R.addGroup(glass,{pass:'glass',tag:'static',center:[x,.8,z]});
}
export function buildStatic(R){
 const reg={floors:[],modules:{},bridges:[],myc:[],exo:null,crown:[],vault:[]},ground=new Mesh();
 box(ground,[0,-.18,0],145,.3,145,0,{col:hex('#697655'),mat:mt(1,0,0,21)});
 // Broad natural paths: the same routes used by the walking characters.
 const lane=Array.from({length:181},(_,i)=>{const deg=i*2;let r=7.62;for(const center of [117,243]){const d=Math.abs(deg-center);if(d<16)r=Math.min(r,6.5+(7.62-6.5)*(1-Math.cos(Math.PI*d/16))/2);}const p=polar(deg,r);return[p[0],.025,p[2]];});
 path(ground,lane,.3);
 path(ground,[[0,.025,-8],[0,.025,8]],.24);
 path(ground,[[-7,.025,0],[7,.025,0]],.22);
 for(const d of ALL_DEFS){const ops=d.group==='operations',a=polar(d.deg,ops?6.0:7.62),b=polar(d.deg,ops?6.85:d.r+1.05);path(ground,[[a[0],.025,a[2]],[b[0],.025,b[2]]],.2);}
 add(R,ground);
 for(const st of FLOW){const p=stageCenter(st),m=new Mesh();bed(m,p[0],p[2],FLOW.indexOf(st));reg.floors.push([add(R,m)]);}
 const main=new Mesh();building(main,0,2.55,2.2,1.25,'#e6dfcc');building(main,VAULT_C[0],0,.95,.85,'#b9ac8e');
 estatePorch(main);reg.vault=[add(R,main)];
 for(const d of ALL_DEFS){
  const p=polar(d.deg,d.r),m=new Mesh();
  if(d.group==='operations')barn(m,p[0],p[2],d.k==='commerce'?'#748071':'#8c6a4e');
  else if(['wiki','claude','math'].includes(d.k))cottage(m,p[0],p[2]);
  else if(['investments','property'].includes(d.k))studio(m,p[0],p[2]);
  else building(m,p[0],p[2],1.6,1.15,d.k==='legal'?'#c5c0ab':'#e0d5bd');
  faceEntrance(m,p,Math.atan2(p[0],p[2])+(d.group==='operations'?Math.PI:0));
  reg.modules[d.k]=[add(R,m)];
 }
 greenhouse(R,-3.8,2.4);
 const plants=new Mesh(),rnd=rng(752);
 for(let i=0;i<12;i++){
  const p=polar(15+i*30,8.3),bronze={col:hex('#514b3c'),mat:mt(.6,.3,0,0)};
  tube(plants,[[p[0],0,p[2]],[p[0],.52,p[2]]],.022,8,bronze);
  box(plants,[p[0],.48,p[2]],.11,.025,.11,0,bronze);
  box(plants,[p[0],.55,p[2]],.075,.12,.075,0,{col:hex('#c5b894'),mat:mt(.4,0,0,27)});
  box(plants,[p[0],.62,p[2]],.12,.025,.12,0,bronze);
 }
 for(let i=0;i<34;i++){const a=i/34*TAU,r=10+rnd()*3;tree(plants,Math.cos(a)*r,Math.sin(a)*r,.8+rnd()*.45,i%3===0);}
 for(let row=0;row<9;row++)for(let col=0;col<15;col++){
  const x=11+col*.65,z=-8+row*.75;
  tube(plants,[[x,.03,z],[x,.4,z]],.018,4,wood);ellipsoid(plants,[x,.42,z],[.24,.2,.2],row%2?'#647b49':'#71854e',6);
 }
 for(let i=0;i<6;i++){fence(plants,10,-9+i*2.1,14.9,-9+i*2.1);fence(plants,16.1,-9+i*2.1,21,-9+i*2.1);}
 // Pond, reed fringe and orchard in the opposite meadow.
 const pond=new Mesh();ellipsoid(pond,[-10,.01,3.5],[2.5,.035,1.6],'#597f7c',48,mt(.12,0,0,4));add(R,pond);
 for(let i=0;i<28;i++){const a=i/28*TAU,x=-10+Math.cos(a)*2.65,z=3.5+Math.sin(a)*1.75;tube(plants,[[x,0,z],[x,.32+rnd()*.25,z]],.018,4,mat('#8a8956'));}
 for(let i=0;i<32;i++){const a=i/32*TAU,p=[-10+Math.cos(a)*2.72,.03,3.5+Math.sin(a)*1.8];ellipsoid(plants,p,[.12+rnd()*.09,.07,.1],i%2?'#8b8d78':'#a29b84',8,mt(.95,0,0,18));}
 for(const x of [-7.4,-6.6])for(const z of [4.6,4.9])box(plants,[x,.15,z],.045,.3,.045,0,wood);
 box(plants,[-7,.32,4.75],1.05,.05,.42,0,wood);box(plants,[-7,.55,4.94],1.05,.3,.04,0,wood);
 for(let x=-18;x<=-11;x+=2)for(let z=-9;z<=-3;z+=2)tree(plants,x,z,1.1,true);
 for(const z of [-9,9]){fence(plants,-8,z,-1.1,z);fence(plants,1.1,z,8,z);}
 for(let i=0;i<80;i++){const a=rnd()*TAU,r=8.7+rnd()*3,p=polar(a*180/Math.PI,r);sphere(plants,[p[0],.12,p[2]],.045,5,mat(['#c3ac68','#a496b3','#e1d6b5'][i%3]));}
 add(R,plants);return reg;
}
export function buildDistricts(R,s){
 const slots=islandSlots(s),m=new Mesh();
 for(const sl of slots){
  const [x,,z]=sl.c;box(m,[x,-.005,z],7.8,.025,7.8,0,{col:hex('#77825a'),mat:mt(1,0,0,21)});
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
 for(let i=0;i<18;i++){
  const a=i/18*TAU,r=48+rnd()*8,cx=Math.cos(a)*r,cz=Math.sin(a)*r,w=20+rnd()*12,d=18+rnd()*10,h=5+rnd()*9;
  surface(m,(u,v)=>{const ridge=Math.pow(Math.max(0,Math.sin(Math.PI*u)*Math.sin(Math.PI*v)),.8);return [cx+(u-.5)*w,-.2+ridge*h*(.72+.22*Math.abs(Math.sin(u*9+i))+.12*Math.sin(v*13+u*3)),cz+(v-.5)*d];},24,20,{col:hex(i%2?'#7c8970':'#687d63'),mat:mt(.96,0,0,29),out:p=>[p[0],-5,p[2]]});
 }

 for(let i=0;i<level*4;i++){const a=i*2.4;tree(m,Math.cos(a)*16,Math.sin(a)*16,.8,true);}
 add(R,m,'perk');return {skyline:null,blink:null,crane:null};
}

// Small, batched ambient models animate inside the existing render loop.
export function buildAmbient(R) {
  const birds = [];
  for (let i = 0; i < 5; i++) {
    const m = new Mesh(), feather = mat(i % 2 ? '#6b7164' : '#a9afa1', .8);
    ellipsoid(m, [0,0,0], [.025,.022,.095], '#777e70', 8);
    for (const side of [-1,1]) {
      const points = [[0,0,-.02],[side*.22,.025,.04],[side*.08,0,.09]];
      const ids = points.map(p => m.vert(p,[0,1,0],feather.col,feather.mat));m.tri(...ids);
    }
    birds.push({ group:add(R,m,'ambient',{shadow:false}), radius:12+i*2.3, height:3.1+i*.3, speed:.055+i*.008, phase:i*1.8 });
  }
  const mast = new Mesh(), rotor = new Mesh(), px=-12.5, pz=6.2, height=2.4;
  for (const side of [-1,1]) {
    tube(mast,[[px+side*.34,0,pz],[px+side*.08,height,pz]],.035,7,wood);
    if(side===1)for(let j=0;j<5;j++)tube(mast,[[px-.3+j*.045,j*.44,pz],[px+.3-(j+1)*.045,(j+1)*.44,pz]],.015,5,wood);
  }
  tube(mast,[[px,0,pz],[px,height,pz]],.025,7,wood);add(R,mast);
  sphere(rotor,[0,0,0],.07,12,mat('#77776b',.5));
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
    const points=[[-.035,.09,.025],[.035,.09,.025],[.08,.64,.025],[-.08,.64,.025]].map(([x,y,z])=>[x*c-y*s,x*s+y*c,z]);
    const ids=points.map(p=>rotor.vert(p,[0,0,1],wood.col,wood.mat));rotor.quad(...ids);
  }
  const wind=add(R,rotor,'ambient',{shadow:false});
  return { birds, wind, animate(t){
    for(const b of birds){const a=b.phase+t*b.speed,c=Math.cos(-a),s=Math.sin(-a);b.group.model=new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,Math.cos(a)*b.radius,b.height+Math.sin(t*.6+b.phase)*.08,Math.sin(a)*b.radius,1]);}
    const a=t*.35,c=Math.cos(a),s=Math.sin(a);wind.model=new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,px,height,pz+.03,1]);
  }};
}
