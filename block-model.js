// Runtime counterpart of art_pipeline/procedural_wrestler.py's chamfered
// rectangular blocks. Broad planar faces, narrow edge bevels, no round muscle mesh.
import { transformJoint } from './choreography.js?v=1.14.0';
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>mul(a,1/(Math.hypot(...a)||1));
export function bevelGeometry(center,size,bevel=.06){
  const [w,h,d]=size.map(v=>v/2),r=Math.min(bevel,w*.48,h*.48,d*.48),v=[];
  for(const [y,shrink] of [[-h,r],[-h+r,0],[h-r,0],[h,r]]){
    let x=w-shrink,z=d-shrink,c=Math.max(.002,r*.6);
    for(const [a,b] of [[-x+c,-z],[x-c,-z],[x,-z+c],[x,z-c],[x-c,z],[-x+c,z],[-x,z-c],[-x,-z+c]])v.push(add(center,[a,y,b]));
  }
  const faces=[Array.from({length:8},(_,i)=>7-i),Array.from({length:8},(_,i)=>24+i)];
  for(let j=0;j<3;j++)for(let i=0;i<8;i++)faces.push([j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i]);
  return {vertices:v,faces};
}
function emit(stage,vertices,faces,center,color){for(const indices of faces){let points=indices.map(i=>vertices[i]);let mean=points.reduce((a,p)=>add(a,mul(p,1/points.length)),[0,0,0]);if(dot(cross(sub(points[1],points[0]),sub(points[2],points[0])),sub(mean,center))<0)points.reverse();stage.face(points,color);}}
function block(stage,center,size,color,fn=p=>p,bevel=.06){let mesh=bevelGeometry(center,size,bevel);emit(stage,mesh.vertices.map(fn),mesh.faces,fn(center),color);}
function boneFrame(a,b,front){let y=unit(sub(b,a)),x=unit(cross(y,front));if(Math.hypot(...x)<.1)x=unit(cross(y,[1,0,0]));let z=unit(cross(x,y));return p=>add(a,add(mul(x,p[0]),add(mul(y,p[1]),mul(z,p[2]))));}
function segment(stage,a,b,r1,r2,color,front){
  const length=Math.hypot(...sub(b,a)),fn=boneFrame(a,b,front),vertices=[];
  for(const [t,end] of [[0,.83],[.12,1],[.86,1],[1,.83]]){let x=(r1+(r2-r1)*t)*end,z=x*.88,c=x*.22;
    for(const [px,pz] of [[-x+c,-z],[x-c,-z],[x,-z+c],[x,z-c],[x-c,z],[-x+c,z],[-x,z-c],[-x,-z+c]])vertices.push(fn([px,length*t,pz]));
  }
  const faces=[Array.from({length:8},(_,i)=>7-i),Array.from({length:8},(_,i)=>24+i)];for(let j=0;j<3;j++)for(let i=0;i<8;i++)faces.push([j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i]);
  emit(stage,vertices,faces,mix(a,b,.5),color);
}
const palettes={stone:{skin:'#eba25e',light:'#ffb86e',hair:'#f7c33e',gear:'#d0182d',trim:'#ffc11b',boot:'#ffc11b'},viper:{skin:'#c87955',light:'#e29468',hair:'#18151a',gear:'#161a22',trim:'#d1263d',boot:'#171b22'}};
export function drawBlockModel(stage,a){
  const c=palettes[a.id],j=a.j,original={head:[0,3.14,0],chest:[0,2.3,0],pelvis:[0,1.46,0]};
  const fn=p=>{const anchor=p[1]>2.8?'head':p[1]>1.9?'chest':'pelvis';return transformJoint(add(p,sub(a.local[anchor],original[anchor])),a.root,a.yaw,a.roll);};
  const direction=p=>transformJoint(p,[0,0,0],a.yaw,a.roll),front=direction([0,0,1]);
  const detail=(center,size,color,bevel=.035)=>{const anchor=center[1]>2.8?'head':center[1]>1.9?'chest':'pelvis';const offset=sub(a.local[anchor],original[anchor]);block(stage,center,size,color,p=>transformJoint(add(p,offset),a.root,a.yaw,a.roll),bevel);};
  // Tapered block torso and broad raised pectoral/abdominal panels.
  detail([0,2.11,-.025],[1.1,1.22,.64],c.skin,.09);
  detail([0,2.62,-.035],[1.16,.28,.67],c.skin,.08);
  for(const x of [-.29,.29])detail([x,2.38,.34],[.55,.45,.21],c.light,.065);
  for(const y of [2.0,1.81])for(const x of [-.17,.17])detail([x,y,.325],[.3,.16,.075],c.skin,.025);
  detail([0,1.57,0],[1.02,.43,.73],c.gear,.04);
  detail([0,1.75,.03],[1.1,.095,.75],c.trim,.025);
  detail([0,1.74,.414],[.17,.15,.045],c.gear,.02);
  const diamond=(cx,cy,z,size,color)=>stage.face([fn([cx,cy-size,z]),fn([cx+size,cy,z]),fn([cx,cy+size,z]),fn([cx-size,cy,z])],color);
  diamond(0,1.74,.442,.06,c.trim);
  for(const side of [-1,1]){const points=side<0?[[-.32,1.36],[-.13,1.36],[-.28,1.73],[-.5,1.73]]:[[.13,1.36],[.32,1.36],[.5,1.73],[.28,1.73]];stage.face(points.map(([x,y])=>fn([x,y,.384])),c.trim);}
  for(const side of ['l','r']){
    segment(stage,j[side+'s'],j[side+'e'],.31,.25,c.skin,front);
    segment(stage,j[side+'e'],j[side+'h'],.25,.19,c.skin,front);
    const shoulderFn=p=>add(j[side+'s'],direction(p));block(stage,[0,0,0],[.58,.5,.54],c.light,shoulderFn,.11);
    const wrist=mix(j[side+'e'],j[side+'h'],.82);segment(stage,mix(j[side+'e'],j[side+'h'],.76),mix(j[side+'e'],j[side+'h'],.93),.205,.205,c.gear,front);
    const handBasis=boneFrame(wrist,j[side+'h'],front),handFn=p=>add(j[side+'h'],sub(handBasis(p),wrist));
    block(stage,[0,.05,0],[.39,.37,.37],c.light,handFn,.06);
    for(let i=0;i<4;i++)block(stage,[-.135+i*.09,.095,.19],[.07,.19,.05],c.skin,handFn,.012);
    block(stage,[.185,.0,.065],[.09,.2,.13],c.skin,handFn,.025);
    const hip=fn([side==='l'?-.3:.3,1.46,0]);segment(stage,hip,j[side+'k'],.29,.25,c.skin,front);
    const kneeFn=p=>add(j[side+'k'],direction(p));block(stage,[0,0,.04],[.52,.31,.55],c.gear,kneeFn,.055);block(stage,[0,0,.33],[.4,.22,.045],c.gear,kneeFn,.02);
    segment(stage,j[side+'k'],j[side+'a'],.21,.18,c.skin,front);
    const bootTop=mix(j[side+'k'],j[side+'a'],.22),bootFn=boneFrame(bootTop,j[side+'a'],front),bootLength=Math.hypot(...sub(j[side+'a'],bootTop));
    segment(stage,bootTop,j[side+'a'],.245,.245,c.boot,front);
    block(stage,[0,.015,0],[.54,.1,.48],c.gear,bootFn,.022);
    block(stage,[0,bootLength*.54,.226],[.16,bootLength*.72,.025],c.gear,bootFn,.008);
    for(let i=0;i<4;i++)block(stage,[0,bootLength*(.24+i*.15),.251],[.19,.021,.021],a.id==='stone'?'#fff1ad':'#d1263d',bootFn,.005);
    const footFn=p=>add(j[side+'a'],direction(p));block(stage,[0,-.06,.15],[.55,.3,.73],c.boot,footFn,.06);block(stage,[0,-.21,.15],[.58,.08,.75],'#40251f',footFn,.02);
  }
  detail([0,2.79,0],[.34,.26,.37],c.skin,.035);
  detail([0,3.13,0],[.69,.73,.61],c.skin,.08);
  for(const x of [-.17,.17]){
    detail([x,3.21,.318],[.23,.11,.036],'#39251c',.007);
    detail([x,3.218,.342],[.18,.073,.028],'#fff5da',.003);
    detail([x+(x<0?.025:-.025),3.218,.36],[.053,.067,.015],'#1c343e',.002);
    const brow=[x,3.31,.32],offset=sub(a.local.head,original.head),angle=x<0?-.22:.22;block(stage,brow,[.25,.06,.085],c.hair,p=>{const q=sub(p,brow);return transformJoint(add(add(brow,[q[0]*Math.cos(angle)-q[1]*Math.sin(angle),q[0]*Math.sin(angle)+q[1]*Math.cos(angle),q[2]]),offset),a.root,a.yaw,a.roll);},.01);
  }
  detail([0,3.13,.354],[.105,.17,.1],c.light,.025);
  detail([0,2.964,.32],[.31,.068,.04],'#281b1a',.004);
  if(a.id==='stone'){
    detail([0,3.47,-.03],[.71,.12,.65],c.hair,.04);
    detail([0,3.49,.02],[.76,.14,.68],c.gear,.035);diamond(0,3.49,.382,.054,c.trim);
    for(const x of [-.34,.34])for(let i=0;i<3;i++)detail([x,3.075,-.145+i*.1],[.08,.73,.082],i===1?'#ffdb60':c.hair,.02);
    for(const x of [-.145,.145])detail([x,3.04,.351],[.26,.115,.12],c.hair,.035);
    for(const x of [-.235,.235])detail([x,2.945,.328],[.09,.21,.1],c.hair,.025);
    detail([.39,3.43,-.08],[.14,.14,.15],c.gear,.03);
    const tailFn=p=>fn(add([.4,3.4,-.18],[p[0]+p[1]*.7,p[1],p[2]]));
    block(stage,[0,-.16,0],[.12,.38,.04],c.gear,tailFn,.01);
  }else{
    detail([0,3.53,-.025],[.19,.29,.53],c.hair,.035);
    detail([0,2.898,.17],[.53,.21,.37],c.hair,.035);
    detail([0,3.02,.333],[.34,.065,.03],c.hair,.01);
    // Black/red identity stripe rather than a rounded muscle tattoo.
    detail([-.52,2.31,.085],[.085,.25,.035],c.trim,.008);
  }
}
