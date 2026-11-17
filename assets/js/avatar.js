// Human-scale articulated avatars. All geometry is authored in one consistent metre-like space.
import { Mesh, sphere, tube, V, M, hex, mt } from './gl.js';
export const SKIN = ['#f6d7c3', '#eec1a1', '#dca37d', '#c68a62', '#a86d47', '#7d4f33', '#5a3825'];
export const HAIR = ['#1c1714', '#3b2a20', '#5a3d2b', '#8a5a3b', '#b07a4f', '#d8b27a', '#e9d3a2', '#a33b2b', '#8f8f8f'];
export const HAIR_STYLES = [['short', 'Short'], ['side', 'Side part'], ['buzz', 'Buzz cut'], ['curly', 'Curly'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['bob', 'Bob'], ['bald', 'Bald']];
export const FACIAL = [['none', 'None'], ['stubble', 'Stubble'], ['beard', 'Beard']];
export const TOPS = [['polo', 'Golf polo'], ['shirt', 'Shirt'], ['blazer', 'Blazer'], ['tee', 'T-shirt'], ['dress', 'Dress']];
export const ACCESSORIES = [['none', 'None'], ['cap', 'Golf cap'], ['visor', 'Golf visor'], ['sunglasses', 'Sunglasses'], ['bag', 'DCS golf bag']];

export const DEFAULT_AVATARS = {
  matthew: { name: 'Matthew', portrait: 'matthew', build: 'broad', skin: '#dca37d', hair: '#332c28', hairStyle: 'curly', facial: 'beard', top: 'shirt', topColor: '#86acbc', bottomColor: '#c4b79d', shoes: '#42392f', accent: '#b8a078', accessory: 'none', eyes: '#2b1d14' },
  lizzie: { name: 'Lizzie', portrait: 'lizzie', build: 'slim', skin: '#eec1a1', hair: '#30231f', hairStyle: 'long', facial: 'none', top: 'dress', topColor: '#be4e3c', bottomColor: '#a1664e', shoes: '#564238', accent: '#c9ad7a', accessory: 'none', eyes: '#3a2a20' },
};

const T=(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
const RX=a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]);};
const RY=a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);};
const RZ=a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]);};
const mul=(...m)=>m.reduce((a,b)=>M.mul(a,b));
const pivot=(p,r)=>mul(T(...p),r,T(...p.map(x=>-x)));
const material=(color,kind=0,rough=.65)=>({col:hex(color),mat:mt(rough,0,0,kind)});
const HEAD=[0,.675,0],HIP=.37,KNEE=.205,SHOULDER=.565,ELBOW=.46;
function blob(m,c,r,o,{seg=20,portrait=null,mask=null,sculpt=false}={}){
 const q=new Mesh();sphere(q,[0,0,0],1,seg,o);const off=m.n;
 for(let i=0;i<q.n;i++){
  const k=i*16,d=q.v.slice(k,k+3),scale=mask && mask(d) ? 0.94 : 1;
  let x=d[0]*r[0]*scale,y=d[1]*r[1]*scale,z=d[2]*r[2]*scale;
  if(sculpt){x*=1-.17*Math.max(0,-d[1]);z+=Math.exp(-d[0]*d[0]*80-Math.pow(d[1]-.02,2)*45)*Math.max(0,d[2])*.006;}
  const n=V.norm(d.map((x,j)=>x/r[j]));
  const uv=portrait?[(portrait==='matthew'?.281:.765)+d[0]*(portrait==='matthew'?.095:.09),.4-d[1]*.29]:q.v.slice(k+14,k+16);
  const mat=o.mat.slice();if(portrait)mat[1]=d[2];
  m.vert([c[0]+x,c[1]+y,c[2]+z],n,o.col,mat,uv);
 }
 for(const ix of q.idx)m.idx.push(ix+off);
}
function limb(m,a,b,ra,rb,o,seg=16){
 const d=V.norm(V.sub(b,a)),u=V.norm(V.cross(d,Math.abs(d[2])<.9?[0,0,1]:[0,1,0])),v=V.cross(d,u),off=m.n,rows=5;
 for(let j=0;j<=rows;j++){
  const t=j/rows,r=ra+(rb-ra)*t+Math.sin(Math.PI*t)*Math.min(ra,rb)*.08;
  for(let i=0;i<=seg;i++){const angle=i/seg*Math.PI*2,n=V.add(V.mul(u,Math.cos(angle)),V.mul(v,Math.sin(angle))),p=V.add(V.lerp(a,b,t),V.mul(n,r));m.vert(p,V.norm(V.sub(n,V.mul(d,(rb-ra)/V.len(V.sub(b,a))))),o.col,o.mat,[i/seg,t]);}
 }
 for(let j=0;j<rows;j++)for(let i=0;i<seg;i++){const a=off+j*(seg+1)+i;m.quad(a,a+1,a+seg+2,a+seg+1);}
}
function torso(m,rings,o,seg=32){
 const off=m.n;
 rings.forEach(([y,rx,rz],j)=>{for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,c=Math.cos(a),s=Math.sin(a);m.vert([c*rx,y,s*rz],V.norm([c/rx,0,s/rz]),o.col,o.mat,[i/seg,j/(rings.length-1)]);}});
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<seg;i++){const a=off+j*(seg+1)+i;m.quad(a,a+1,a+seg+2,a+seg+1);}
}
export function avatarMeshes(a){
 const skin=material(a.skin,15,.62),hair=material(a.hair,23,.6),top=material(a.topColor,16,.86),bottom=material(a.bottomColor,16,.88),shoes=material(a.shoes,17,.58),metal=material(a.accent||'#b9a077',0,.3);
 skin.mat[1]=a.portrait==='matthew'?1:a.portrait==='lizzie'?2:0;
 const body=new Mesh(),armL=new Mesh(),armR=new Mesh(),foreL=new Mesh(),foreR=new Mesh(),legL=new Mesh(),legR=new Mesh(),shinL=new Mesh(),shinR=new Mesh();
 const dress=a.top==='dress',broad=a.build==='broad',shoulderX=broad?.084:.077;
 if(dress){
  torso(body,[[.35,.062,.034],[.385,.066,.038],[.43,.055,.031],[.49,.069,.038],[.54,.075,.034]],top);
  torso(body,[[.535,.075,.033],[.565,.077,.025],[.607,.022,.018]],skin);
  for(const side of [-1,1])tube(body,[[side*.052,.53,.03],[side*.067,.575,0],[side*.052,.53,-.03]],.0035,6,top);
 }else torso(body,[[.35,.062,.034],[.385,.066,.038],[.43,broad?.064:.055,.031],[.49,broad?.075:.069,.038],[.54,broad?.09:.083,.034],[.565,broad?.084:.077,.025],[.607,.022,.018]],top);
 if(dress)torso(body,[[.225,.095,.051],[.27,.085,.048],[.325,.071,.04],[.39,.064,.038],[.43,.055,.032]],top);
 else{torso(body,[[.345,.061,.032],[.385,.066,.038]],bottom);torso(body,[[.38,.067,.039],[.389,.067,.039]],material('#594333',17));blob(body,[0,.384,.04],[.009,.005,.003],metal,{seg:8});}
 limb(body,[0,.578,0],[0,.635,0],broad?.024:.018,broad?.024:.02,skin);
 const face={...skin,mat:mt(.55,0,0,a.portrait==='matthew'?24:a.portrait==='lizzie'?25:15)};
 blob(body,HEAD,[.037,.053,.037],face,{seg:40,portrait:a.portrait,sculpt:true});
 for(const side of [-1,1])blob(body,[side*.037,.671,0],[.005,.01,.006],skin,{seg:12});
 // A fitted hair cap and narrow locks keep the facial silhouette recognisable.
 const st=a.hairStyle;
 if(st!=='bald'){
  const long=['long','bob','ponytail','bun'].includes(st),low=long?-.55:-.05;
  const hidden=d=>(d[2]>.15&&d[1]<.5)||(d[1]<low);
  blob(body,[0,.678,-.002],[.039,.054,.039],hair,{seg:32,mask:hidden});
  if(st==='curly')for(let i=0;i<110;i++){
   const y=1-2*(i+.5)/110,t=i*2.39996,r=Math.sqrt(1-y*y),d=[Math.cos(t)*r,y,Math.sin(t)*r];if(hidden(d))continue;
   blob(body,[d[0]*.038,.677+d[1]*.054,d[2]*.038],[.0045,.004,.0045],hair,{seg:8});
  }
  if(st==='long'||st==='bob'){
   blob(body,[0,st==='long'?.614:.64,-.027],[.043,st==='long'?.085:.055,.017],hair,{seg:24});
   for(const side of [-1,1]){
    blob(body,[side*.036,st==='long'?.626:.65,.003],[.009,st==='long'?.065:.04,.017],hair,{seg:20});
    for(let strand=0;strand<8;strand++){
     const x=side*(.032+strand*.0014),points=Array.from({length:12},(_,i)=>[x+Math.sin(i*.6+strand)*.001,.69-i*(st==='long'?.010:.006),.015+Math.sin(i*.3)*.004]);
     tube(body,points,.00045,3,material(a.hair,23));
    }
   }
  }
  if(st==='side')blob(body,[.01,.715,.016],[.026,.012,.019],hair,{seg:20});
  if(st==='bun')blob(body,[0,.732,-.02],[.018,.015,.016],hair,{seg:20});
  if(st==='ponytail')limb(body,[0,.698,-.039],[0,.59,-.054],.012,.007,hair);
 }
 if(!a.portrait){
  for(const side of [-1,1]){blob(body,[side*.013,.684,.033],[.006,.003,.003],material('#ede7dc'),{seg:12});blob(body,[side*.013,.684,.036],[.0025,.0026,.001],material(a.eyes||'#352820'),{seg:10});}
  blob(body,[0,.672,.037],[.004,.009,.006],skin,{seg:16});tube(body,[[-.009,.656,.032],[0,.654,.035],[.009,.656,.032]],.0013,5,material('#975f54',15));
  if(a.facial!=='none')blob(body,[0,.651,.015],[.029,.022,.025],hair,{seg:20,mask:d=>d[1]>.05||d[2]<.2});
 }
 // Shirt placket, cuffs, dress hem and restrained tailoring.
 if(a.top==='shirt'||a.top==='polo')for(const side of [-1,1]){
  const pts=[[side*.008,.607,.02],[side*.035,.59,.027],[side*.014,.562,.036]],n=V.norm(V.cross(V.sub(pts[1],pts[0]),V.sub(pts[2],pts[0]))),col=top.col.map(x=>Math.min(1,x*1.08));
  const ids=pts.map((p,i)=>body.vert(p,n,col,top.mat,[i%2,i/2]));body.tri(...ids);
 }
 if(a.top==='shirt'||a.top==='polo')for(let i=0;i<(a.top==='shirt'?5:2);i++)blob(body,[0,.55-i*.027,.036],[.002,.002,.001],material('#ddd7c7'),{seg:8});
 if(a.top==='blazer')for(const side of [-1,1])tube(body,[[side*.018,.58,.024],[side*.04,.535,.037],[side*.012,.48,.038]],.004,5,material(a.topColor,16));
 if(dress)torso(body,[[.225,.095,.051],[.23,.094,.05]],material(a.topColor,16));
 for(const [upper,lower,leg,shin,side]of [[armL,foreL,legL,shinL,1],[armR,foreR,legR,shinR,-1]]){
  const shoulder=[side*shoulderX,SHOULDER,0],elbow=[side*.105,ELBOW,.003],wrist=[side*.108,.365,.012];
  const short=['tee','polo','dress'].includes(a.top),end=V.lerp(shoulder,elbow,short?.5:1);
  limb(upper,shoulder,end,dress?.019:.023,dress?.017:.019,dress?skin:top);if(short)limb(upper,end,elbow,.018,.016,skin);
  blob(upper,shoulder,[.018,.014,.02],dress?skin:top,{seg:16});
  limb(lower,elbow,wrist,.016,.01,short?skin:top);
  blob(lower,[wrist[0],.35,wrist[2]],[.01,.017,.006],skin,{seg:16});
  for(let finger=0;finger<4;finger++)limb(lower,[wrist[0]-.007+finger*.0045,.34,.013],[wrist[0]-.007+finger*.0045,.321+Math.abs(finger-1.5)*.002,.016],.0023,.0018,skin,8);
  limb(lower,[wrist[0]-side*.008,.357,.014],[wrist[0]-side*.016,.342,.021],.0035,.0025,skin,8);
  limb(leg,[side*.035,HIP,0],[side*.034,KNEE,.002],.029,.019,dress?skin:bottom,20);
  limb(shin,[side*.034,KNEE,.002],[side*.033,.027,.004],.019,.011,dress?skin:bottom,20);
  blob(shin,[side*.033,.013,.017],[.017,.013,.032],shoes,{seg:20});
  if(!dress)limb(shin,[side*.033,.027,.004],[side*.033,.041,.004],.012,.012,bottom,16);
 }
 if(a.accessory==='sunglasses')for(const side of [-1,1]){blob(body,[side*.014,.687,.035],[.01,.006,.003],material('#1a1c1d',0,.13),{seg:16});tube(body,[[side*.021,.688,.033],[side*.035,.687,.005]],.0015,5,metal);}
 if(a.accessory==='cap'||a.accessory==='visor'){
  if(a.accessory==='cap')blob(body,[0,.705,-.002],[.041,.031,.041],metal,{seg:24,mask:d=>d[1]<0});
  blob(body,[0,.704,.034],[.035,.002,.024],metal,{seg:20});
 }
 if(a.accessory==='bag'){limb(body,[-.027,.36,-.045],[.027,.55,-.045],.025,.023,material('#c4b79a',16));tube(body,[[-.05,.53,.02],[.03,.43,.04],[.05,.36,-.02]],.003,6,material('#765039',17));}
 return {body,armL,foreL,armR,foreR,legL,shinL,legR,shinR};
}
export function addAvatar(R,a,tag){
 const meshes=avatarMeshes(a),g={};for(const [k,m]of Object.entries(meshes))g[k]=R.addGroup(m,{pass:'opaque',shadow:true,tag});
 return {groups:Object.values(g),pose(pos,yaw,{walk=0,phase=0,wave=0,t=0,talk=0}={}){
  const bob=(1-Math.cos(phase*2))*.002*walk+Math.sin(t*1.7)*.0007*(1-walk),root=mul(T(pos[0],pos[1]+bob,pos[2]),RY(yaw));
  g.body.model=mul(root,RY(Math.sin(phase)*.025*walk+Math.sin(t*2)*.012*talk));
  for(const side of [1,-1]){
   const left=side===1,suffix=left?'L':'R',swing=Math.sin(phase+(left?0:Math.PI)),hip=[side*.035,HIP,0],knee=[side*.034,KNEE,.002],shoulder=[side*(a.build==='broad'?.084:.077),SHOULDER,0],elbow=[side*.105,ELBOW,.003];
   const leg=mul(root,pivot(hip,RX(swing*.36*walk))),bend=Math.max(0,-Math.cos(phase+(left?0:Math.PI)))*.6*walk;
   g['leg'+suffix].model=leg;g['shin'+suffix].model=mul(leg,pivot(knee,RX(bend)));
   const waving=!left?wave:0,arm=mul(root,pivot(shoulder,mul(RX(-swing*.28*walk),RZ(-side*(.045+waving*1.8)))));
   g['arm'+suffix].model=arm;g['fore'+suffix].model=mul(arm,pivot(elbow,RX(-.14-waving*(.45+Math.sin(t*9)*.2))));
  }
 },set dim(v){for(const x of Object.values(g))x.dim=v;},set hl(v){for(const x of Object.values(g))x.hl=v;}};
}
export const AVATAR_HEIGHT=.745;
