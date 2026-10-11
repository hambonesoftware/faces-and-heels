// Coordinated, pelvis-pivoted performances for the existing block models.
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),length=a=>Math.hypot(...a);
const unit=a=>mul(a,1/(length(a)||1)),clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t)},PI=Math.PI;
const env=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
export const MOVE_TIMING={shove_counter:{duration:1650,impact:.49},knee_lift:{duration:1580,impact:.49},dropkick:{duration:2050,impact:.57},ddt:{duration:2450,impact:.79},neckbreaker:{duration:2500,impact:.84},hip_toss:{duration:2700,impact:.87},spinebuster:{duration:3050,impact:.88},elbow_drop:{duration:2100,impact:.79},stomp:{duration:1750,impact:.63},knee_drop:{duration:2050,impact:.73},leg_drop:{duration:2250,impact:.81},armbar:{duration:2400,impact:.62},ankle_lock:{duration:2300,impact:.59},pick_up:{duration:2350},pull_to_knees:{duration:1750},snap_down:{duration:2100,impact:.77},lockup:{duration:1900},forearm:{duration:1550,impact:.5},clothesline:{duration:2050,impact:.48},suplex:{duration:3600,impact:.82},body_slam:{duration:3100,impact:.8},dragon_screw:{duration:2500,impact:.76},headlock:{duration:2300,impact:.52},pin:{duration:1500},kickout:{duration:1600,impact:.44},finisher:{duration:3700,impact:.82}};
export const ARM_LENGTH=.74;
export function transformJoint(p,root,yaw,roll=0){const x=p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),z=-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);return add(root,[x*Math.cos(roll)-p[1]*Math.sin(roll),x*Math.sin(roll)+p[1]*Math.cos(roll),z]);}
const BASE={pelvis:[0,1.46,0],chest:[0,2.3,0],head:[0,3.14,0],ls:[-.55,2.65,0],rs:[.55,2.65,0],le:[-.78,2.14,.1],re:[.78,2.14,.1],lh:[-.5,2.25,.58],rh:[.5,2.25,.58],lk:[-.34,.79,.12],rk:[.34,.79,.12],la:[-.4,.25,.1],ra:[.4,.25,.1]};
const rotate=(p,r)=>transformJoint(p,[0,0,0],r.yaw,r.roll),point=(r,p)=>transformJoint(p,r.root,r.yaw,r.roll);
export const neckPoint=r=>mix(r.j.chest,r.j.head,.68);
// Fixed-length two-bone IK, with a stable elbow/knee bend plane.
function solve(start,target,pole,upper,lower){
  const delta=sub(target,start),n=length(delta),axis=n>1e-8?mul(delta,1/n):[0,-1,0];
  const distance=Math.max(.06,Math.min(upper+lower-.015,n)),end=add(start,mul(axis,distance));
  let bend=sub(pole,mul(axis,dot(pole,axis)));
  if(length(bend)<1e-5){const f=Math.abs(axis[2])<.8?[0,0,1]:[1,0,0];bend=sub(f,mul(axis,dot(f,axis)));}
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
  return {end,middle:add(add(start,mul(axis,along)),mul(unit(bend),Math.sqrt(Math.max(0,upper*upper-along*along))))};
}
function arm(r,side,target,weight=1,pole=null){const s=solve(r.j[side+'s'],mix(r.j[side+'h'],target,weight),pole||rotate([side==='l'?-1:1,-.5,.18],r),ARM_LENGTH,ARM_LENGTH);r.j[side+'h']=s.end;r.j[side+'e']=s.middle;}
function forearmContact(a,d,weight){
  const shoulder=a.j.ls,goal=surface(d.j.head,shoulder,.5),delta=sub(goal,shoulder),half=ARM_LENGTH/2,distance=Math.max(.4,Math.min(1.09,length(delta))),contact=add(shoulder,mul(unit(delta),distance));
  // Place the middle of the forearm on the face surface, retaining both
  // bone lengths. Outside the reachable arc, use the bounded hand solver.
  const cosine=(distance*distance+half*half-ARM_LENGTH*ARM_LENGTH)/(2*distance*half);
  const axis=unit(delta),up=unit(sub([0,1,0],mul(axis,axis[1]))),direction=add(mul(axis,cosine),mul(up,Math.sqrt(1-cosine*cosine)));
  const elbow=sub(contact,mul(direction,half)),hand=add(contact,mul(direction,half));
  const usual=rotate([-1,-.5,.18],a),pole=mix(usual,sub(elbow,shoulder),weight);
  arm(a,'l',hand,weight,pole);
}
function leg(r,side,target,weight=1){const hip=point(r,[side==='l'?-.3:.3,1.46,0]),s=solve(hip,mix(r.j[side+'a'],target,weight),rotate([0,0,1],r),.72,.72);r.j[side+'a']=s.end;r.j[side+'k']=s.middle;}
function translate(r,v){r.root=add(r.root,v);for(const k in r.j)r.j[k]=add(r.j[k],v);}
function build(id,s){
  const local=structuredClone(BASE),lean=s.lean||0,spread=s.spread||0;
  for(const k of ['chest','head','ls','rs','le','re','lh','rh'])local[k][2]+=lean*(k==='head'?1.2:1);
  for(const [side,sign] of [['l',-1],['r',1]])local[side+'h']=mix(local[side+'h'],[sign*1.12,2.05,.25],spread);
  const yaw=s.yaw??PI/2,roll=s.roll||0,root=sub(s.p,transformJoint(local.pelvis,[0,0,0],yaw,roll));
  return {id,root,yaw,roll,local,j:Object.fromEntries(Object.entries(local).map(([k,v])=>[k,transformJoint(v,root,yaw,roll)])),grounded:s.ground??1};
}
const K=(t,p,extra={})=>[t,{p,yaw:PI/2,roll:0,lean:0,spread:0,ground:1,...extra}],DK=(t,p,extra={})=>K(t,p,{yaw:-PI/2,...extra});
const down=(t,x,z=0,extra={})=>DK(t,[x,.39,z],{roll:-PI/2,ground:0,spread:1,...extra});

// The 2016-era action combat roster uses one distinct choreography per attack.
// Pose rows: progress, x, pelvis height, z, roll, lean, spread, foot-contact, yaw.
const COMBAT_TRACKS={"knee_lift":{"a":[[0,-1.4,1.46,-0.25],[0.25,-0.75,1.35,-0.35,0,0.12],[0.49,-0.48,1.38,-0.4,0,-0.12],[0.67,-0.64,1.43,-0.4],[1,-1.05,1.46,-0.35]],"d":[[0,1.4,1.46,0.35],[0.25,0.82,1.46,0.4],[0.5,0.86,1.26,0.44,0,-0.2],[0.7,0.99,0.98,0.44,0,0,0,0.75],[1,1.05,0.98,0.44,0,0,0,0.75]]},"dropkick":{"a":[[0,-2,1.46,-0.45],[0.24,-1.05,1.53,-0.45,0,-0.15],[0.46,-0.52,1.62,-0.45,-1.13,0,0.85,0],[0.62,-0.53,1.13,-0.45,-1.48,0,0.9,0],[0.8,-0.77,0.42,-0.45,-1.57,0,1,0],[0.89,-0.92,0.6,-0.45,-1.1,0,1,0],[1,-1.03,1.46,-0.45,0,0,0,1]],"d":[[0,1.4,1.46,0.45],[0.42,0.83,1.46,0.45],[0.57,1.01,1.27,0.45,-0.47,0,0,0.3],[0.81,1.15,0.39,0.45,-1.57,0,1,0],[1,1.15,0.39,0.45,-1.57,0,1,0]]},"ddt":{"a":[[0,-1.4,1.46,-0.65],[0.22,-0.6,1.25,-0.57,0,0.2],[0.43,-0.42,1.11,-0.57,0,0.3],[0.6,-0.66,0.9,-0.6,0.63,0,0,0],[0.78,-1.02,0.42,-0.63,1.57,0,0.5,0],[1,-1.05,1.46,-0.63,0,0,0,1]],"d":[[0,1.4,1.46,0.5],[0.22,0.8,1.37,0.54,0,0.14],[0.44,0.65,1.15,0.6,-0.3,0,0,0.25],[0.6,0.73,0.78,0.67,-0.95,0,0,0],[0.79,0.9,0.39,0.7,-1.57,0,1,0],[1,0.9,0.39,0.7,-1.57,0,1,0]]},"neckbreaker":{"a":[[0,-1.45,1.46,-0.4],[0.23,-0.62,1.34,-0.72,0,0,0,1,0.7],[0.43,-0.45,1.2,-0.8,0,0.24,0,1,0.15],[0.64,-0.54,0.85,-0.82,0.7,0,0,0,0],[0.84,-0.92,0.42,-0.84,1.32,0,0,0],[1,-1.05,1.46,-0.85,0,0,0,1]],"d":[[0,1.4,1.46,0.4],[0.23,0.85,1.4,0.62],[0.45,0.68,1.25,0.73,-0.36,0,0,0.4],[0.65,0.78,0.7,0.73,-1.05,0,0,0],[0.84,0.87,0.39,0.75,-1.57,0,1,0],[1,0.87,0.39,0.75,-1.57,0,1,0]]},"hip_toss":{"a":[[0,-1.5,1.46,-0.52],[0.22,-0.72,1.38,-0.5,0,0,0,1,0.62],[0.44,-0.16,1.23,-0.31,0,0.2,0,1,0],[0.63,-0.16,1.38,-0.31,0,0,0,1,-0.35],[0.82,-0.91,1.36,-0.52,0,0,0,1,0.3],[1,-1.12,1.46,-0.52]],"d":[[0,1.4,1.46,0.5],[0.22,0.83,1.36,0.62],[0.44,0.3,1.65,0.82,-0.6,0,0,0],[0.61,-0.1,2.18,0.85,-1.57,0,0.7,0],[0.74,0.42,1.2,0.85,-1.5,0,0,0],[0.87,0.9,0.39,0.85,-1.57,0,1,0],[1,0.9,0.39,0.85,-1.57,0,1,0]]},"spinebuster":{"a":[[0,-1.6,1.46,-0.5],[0.22,-0.68,1.18,-0.6,0,0.23],[0.44,-0.46,1.23,-0.6,0,0.06],[0.6,-0.46,1.46,-0.6,0,-0.08],[0.77,-0.64,0.91,-0.65,0,0.3],[0.91,-0.75,1.14,-0.65,0,0.19],[1,-0.9,1.46,-0.65]],"d":[[0,1.4,1.46,0.5],[0.23,0.8,1.25,0.57,0,0.2],[0.45,0.37,1.9,0.75,-0.7,0,0,0],[0.6,0.28,2.15,0.77,-1.57,0,0.6,0],[0.76,0.41,1.23,0.8,-1.5,0,0,0],[0.88,0.68,0.39,0.8,-1.57,0,1,0],[1,0.68,0.39,0.8,-1.57,0,1,0]]},"elbow_drop":{"a":[[0,-1.5,1.46,-0.78],[0.27,-0.75,1.46,-0.72,0,0.1],[0.48,0.18,1.24,-0.23,-0.4,0,0,0],[0.68,0.18,0.76,-0.23,-1.05,0,0,0],[0.79,0.18,0.48,-0.23,-1.23,0,0,0],[1,-0.75,1.46,-0.5,0,0,0,1]],"d":[[0,0.85,0.39,0.55,-1.57,0,1,0],[0.49,0.85,0.39,0.55,-1.57,0,1,0],[0.71,0.88,0.39,0.56,-1.57,0,0.4,0],[1,0.89,0.39,0.55,-1.57,0,1,0]]},"stomp":{"a":[[0,-1.5,1.46,-0.85],[0.26,-0.68,1.43,-0.72,0,0.12],[0.48,0.2612,1.43,-0.19,0,-0.16],[0.63,0.254,1.3,-0.19,0,0.21],[0.82,0.22760000000000002,1.42,-0.19],[1,-1.08,1.46,-0.85]],"d":[[0,0.85,0.39,0.55,-1.57,0,1,0],[0.43,0.85,0.39,0.55,-1.57,0,1,0],[0.67,0.87,0.39,0.54,-1.57,0,0.35,0],[1,0.85,0.39,0.55,-1.57,0,1,0]]},"knee_drop":{"a":[[0,-1.45,1.46,-0.8],[0.29,-0.69,1.38,-0.72],[0.49,0.2648,1.34,-0.19,0,-0.15],[0.7,0.2612,0.89,-0.19,0,0.2,0,0.6],[0.83,0.2504,0.85,-0.19,0,0,0,0.7],[1,-0.88,1.46,-0.81]],"d":[[0,0.87,0.39,0.54,-1.57,0,1,0],[0.51,0.87,0.39,0.54,-1.57,0,1,0],[0.75,0.88,0.39,0.56,-1.57,0,0.4,0],[1,0.87,0.39,0.54,-1.57,0,1,0]]},"leg_drop":{"a":[[0,-1.5,1.46,-0.8],[0.26,-0.73,1.46,-0.7],[0.48,0.266,1.36,-0.19,0,-0.22],[0.68,0.2684,0.84,-0.19,-0.85,0,0.9,0],[0.81,0.266,0.46,-0.19,-1.1,0,1,0],[1,-0.9,1.46,-0.78]],"d":[[0,0.87,0.39,0.55,-1.57,0,1,0],[0.53,0.87,0.39,0.55,-1.57,0,1,0],[0.78,0.9,0.39,0.57,-1.57,0,0.4,0],[1,0.87,0.39,0.55,-1.57,0,1,0]]},"armbar":{"a":[[0,-1.45,1.46,-0.84],[0.24,-0.78,1.14,-0.76,0,0.24],[0.44,-0.62,0.9,-0.73,0,0.34,0,1,0.3],[0.64,-0.57,0.85,-0.74,0,0.28,0,1,0.13],[0.83,-0.6,0.98,-0.77,0,0.24],[1,-0.82,1.46,-0.79,0,0,0,1]],"d":[[0,0.8,0.39,0.52,-1.57,0,1,0],[0.26,0.8,0.39,0.52,-1.57,0,1,0],[0.45,0.7,0.39,0.56,-1.57,0,0.5,0],[0.65,0.68,0.39,0.58,-1.57,0,0.6,0],[0.83,0.75,0.39,0.55,-1.57,0,0.4,0],[1,0.8,0.39,0.52,-1.57,0,1,0]]},"ankle_lock":{"a":[[0,-1.5,1.46,-0.95],[0.25,-0.7,1.28,-0.8,0,0.3],[0.44,-0.49,1.17,-0.75,0,0.38],[0.62,-0.47,1.17,-0.75,0,0.44],[0.8,-0.62,1.31,-0.82,0,0.25],[1,-0.9,1.46,-0.88]],"d":[[0,0.85,0.39,0.56,-1.57,0,1,0],[0.25,0.85,0.39,0.56,-1.57,0,1,0],[0.48,0.86,0.39,0.59,-1.57,0,0.25,0],[0.66,0.86,0.39,0.6,-1.57,0,0.35,0],[1,0.85,0.39,0.56,-1.57,0,1,0]]}};
function poseRows(rows,defender=false){
 return rows.map(([t,x,y,z,roll=0,lean=0,spread=0,grounded=roll?0:1,yaw])=>[
   t,(defender?DK:K)(t,[x,y,z],{roll,lean,spread,ground:grounded,...(yaw===undefined?{}:{yaw})})[1]
 ]);
}

function interpolate(a,b,t){const s={p:mix(a.p,b.p,t)};for(const k of ['yaw','roll','lean','spread','ground'])s[k]=a[k]+(b[k]-a[k])*t;return s;}
function sampleTrack(id,keys,t){
  let i=1;while(i<keys.length-1&&t>keys[i][0])i++;
  const [ta,a]=keys[i-1],[tb,b]=keys[i],u=clamp((t-ta)/(tb-ta)),s=interpolate(a,b,ease(u)),r=build(id,s);
  for(const [side,index] of [['l',0],['r',1]]){
    // Alternate plants rather than sliding both feet with the torso.
    const foot=spec=>{const q=transformJoint([side==='l'?-.4:.4,0,.1],[0,0,0],spec.yaw,0);return [spec.p[0]+q[0],.25,spec.p[2]+q[2]]};
    const from=foot(a),to=foot(b),travel=length(sub(to,from)),step=clamp((u-index*.35)/.65),target=mix(from,to,ease(step));
    target[1]+=.18*Math.sin(step*PI)*Math.min(1,travel/.2);leg(r,side,target,s.ground);
  }return r;
}
// Conservative torso/head volumes, used for diagnostics and safety clearance.
// The cover uses the torso's actual half-thickness because the two backs
// are horizontal and separated vertically; normal poses use the full width.
export function coreVolumes(r){return [...Array.from({length:7},(_,i)=>({p:point(r,mix([0,1.46,0],[0,2.61,0],i/6)),radius:r.coreRadius??.61})),{p:r.j.head,radius:.49}];}
export function bodyClearance(a,d,vertical=false){
  const axis=vertical?1:2;let push=0;
  for(const x of coreVolumes(a))for(const y of coreVolumes(d)){const delta=sub(y.p,x.p),r=x.radius+y.radius,other=delta.reduce((v,c,i)=>v+(i===axis?0:c*c),0);if(other<r*r)push=Math.max(push,Math.sqrt(r*r-other)-(vertical?-delta[axis]:delta[axis]));}
  if(push>0){const v=[0,0,0];v[axis]=push*.5*(vertical?1:-1);translate(a,v);translate(d,mul(v,-1));}
}
function ground(r){
  let floor=Infinity;
  for(const [center,size] of [[[0,2.11,-.025],[1.1,1.22,.64]],[[0,1.57,0],[1.02,.43,.73]],[[0,3.17,0],[.78,.98,.7]]]){
    const anchor=center[1]>2.8?'head':center[1]>1.9?'chest':'pelvis',offset=sub(r.local[anchor],BASE[anchor]);
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])floor=Math.min(floor,point(r,add(add(center,offset),[x*size[0]/2,y*size[1]/2,z*size[2]/2]))[1]);
  }
  for(const side of ['l','r'])for(const x of [-.29,.29])for(const y of [-.25,.1])for(const z of [-.225,.525])floor=Math.min(floor,add(r.j[side+'a'],rotate([x,y,z],r))[1]);
  for(const k of ['lh','rh','le','re','lk','rk'])floor=Math.min(floor,r.j[k][1]-.24);
  if(floor<.015)translate(r,[0,.015-floor,0]);
}
function tracks(name){
  if(COMBAT_TRACKS[name])return [poseRows(COMBAT_TRACKS[name].a),poseRows(COMBAT_TRACKS[name].d,true)];
  let A=[K(0,[-1.4,1.46,0]),K(1,[-1.4,1.46,0])],D=[DK(0,[1.4,1.46,0]),DK(1,[1.4,1.46,0])];
  if(name==='lockup'){
    A=[K(0,[-1.4,1.46,0]),K(.25,[-.72,1.32,-.08],{lean:.12}),K(.5,[-.67,1.28,-.08],{lean:.14}),K(.72,[-.75,1.35,-.08],{lean:.1}),K(1,[-1.4,1.46,0])];
    D=[DK(0,[1.4,1.46,0]),DK(.25,[.72,1.32,.08],{lean:.12}),DK(.5,[.77,1.35,.08],{lean:.1}),DK(.72,[.69,1.28,.08],{lean:.14}),DK(1,[1.4,1.46,0])];
  }else if(name==='forearm'){
    A=[K(0,[-1.4,1.46,0]),K(.28,[-.92,1.32,-.08],{lean:-.12}),K(.5,[-.72,1.4,-.08],{lean:.12}),K(.65,[-.7,1.38,-.08],{lean:.14}),K(1,[-1.4,1.46,0])];
    D=[DK(0,[1.4,1.46,0]),DK(.5,[.83,1.46,.08]),DK(.64,[1.12,1.3,.12],{lean:-.2,spread:.6}),DK(1,[1.4,1.46,0])];
  }else if(name==='clothesline'){
    A=[K(0,[-2.1,1.4,-.7]),K(.25,[-1.35,1.3,-.7],{lean:.16}),K(.48,[-.42,1.4,-.7]),K(.68,[.72,1.4,-.7]),K(1,[1.65,1.46,-.7])];
    D=[DK(0,[.72,1.46,.7]),DK(.48,[.72,1.46,.7]),DK(.61,[.95,1.28,.7],{roll:-.55,ground:0,spread:1}),down(.79,1.1,.7),down(1,1.1,.7)];
  }else if(name==='body_slam'){
    A=[K(0,[-1.4,1.46,0]),K(.2,[-.65,1.32,-.25],{yaw:.75}),K(.34,[-.45,1.05,-.45],{yaw:0,lean:.16}),K(.5,[-.45,1.46,-.45],{yaw:0}),K(.61,[-.45,1.46,-.45],{yaw:0}),K(.71,[-.6,1.25,-.5],{yaw:.2,lean:.1}),K(.8,[-.9,1.12,-.6],{yaw:.5}),K(1,[-1.3,1.46,-.7])];
    D=[DK(0,[1.4,1.46,0]),DK(.2,[.75,1.4,.35]),DK(.34,[.1,1.6,.85],{roll:-.5,ground:.2}),DK(.5,[-.9,2.45,.85],{roll:-PI/2,ground:0}),DK(.61,[-.9,2.45,.85],{roll:-PI/2,ground:0}),DK(.7,[-.55,2.22,1.0],{roll:-PI/2,ground:0,spread:.5}),down(.8,-.25,1.0),down(.87,-.25,1.0,{p:[-.25,.45,1.0]}),down(1,-.25,1.0)];
  }else if(name==='suplex'||name==='finisher'){
    A=[K(0,[-1.4,1.46,0]),K(.18,[-.7,1.35,-.3],{lean:.1}),K(.3,[-.62,1.08,-.45],{lean:.13}),K(.49,[-.55,1.46,-.55],{yaw:.45}),K(.62,[-.55,1.46,-.55],{yaw:.45}),K(.73,[-.85,1.28,-.65],{roll:.65,ground:0}),K(.82,[-1.2,.39,-.7],{roll:PI/2,ground:0,spread:1}),K(1,[-1.2,.39,-.7],{roll:PI/2,ground:0,spread:1})];
    D=[DK(0,[1.4,1.46,0]),DK(.18,[.75,1.35,.35],{lean:.1}),DK(.3,[.6,1.45,.65],{roll:.5,ground:.2}),DK(.49,[.1,3.8,.75],{roll:PI,ground:0}),DK(.62,[.1,3.8,.75],{roll:PI,ground:0}),DK(.73,[-.05,2.6,.75],{roll:PI*1.28,ground:0,spread:.3}),DK(.82,[-.15,.39,.75],{roll:PI*1.5,ground:0,spread:1}),DK(.88,[-.15,.45,.75],{roll:PI*1.5,ground:0,spread:1}),DK(1,[-.15,.39,.75],{roll:PI*1.5,ground:0,spread:1})];
    if(name==='finisher'){D[3]=DK(.49,[.18,3.55,.75],{roll:PI*.9,ground:0});D[4]=DK(.64,[.18,3.55,.75],{roll:PI*.9,ground:0});A[6]=K(.82,[-.9,.85,-.7],{roll:.55,ground:0,spread:.6});A[7]=K(1,[-.9,.85,-.7],{roll:.55,ground:0,spread:.6});}
  }else if(name==='dragon_screw'){
    A=[K(0,[-1.4,1.46,0]),K(.25,[-.72,.98,-.45],{lean:.18}),K(.45,[-.65,1.0,-.55],{yaw:.6}),K(.62,[-.82,.85,-.72],{yaw:-.25}),K(.76,[-1,.98,-.85]),K(1,[-1.4,1.46,-.85])];
    D=[DK(0,[1.4,1.46,0]),DK(.25,[.85,1.46,.5]),DK(.45,[.85,1.4,.5],{lean:-.1}),DK(.62,[1,1.25,.6],{roll:-.5,ground:0,spread:.5}),down(.76,1.1,.7),down(1,1.1,.7)];
  }else if(name==='pick_up'){
    A=[K(0,[-1.3,1.46,-.62]),K(.22,[-.48,1.24,-.53],{lean:.3}),K(.42,[-.46,1.15,-.53],{lean:.26}),K(.64,[-.49,1.36,-.53],{lean:.14}),K(.86,[-.57,1.46,-.53]),K(1,[-.67,1.46,-.53])];
    D=[down(0,.86,.55),down(.22,.86,.55),DK(.42,[.82,.75,.55],{roll:-.92,spread:.55,ground:.15}),DK(.64,[.84,1.12,.55],{roll:-.34,spread:.25,ground:.5}),DK(.86,[.88,1.46,.55]),DK(1,[.88,1.46,.55])];
  }else if(name==='pull_to_knees'){
    A=[K(0,[-1.3,1.46,-.62]),K(.25,[-.48,1.2,-.53],{lean:.29}),K(.5,[-.45,1.14,-.53],{lean:.25}),K(.76,[-.49,1.29,-.53],{lean:.2}),K(1,[-.55,1.38,-.53],{lean:.16})];
    D=[down(0,.86,.55),down(.25,.86,.55),DK(.52,[.83,.72,.55],{roll:-.93,spread:.6,ground:.1}),DK(.78,[.84,.95,.55],{roll:-.25,spread:.25,ground:.6}),DK(1,[.84,.98,.55],{roll:0,ground:.75})];
  }else if(name==='snap_down'){
    A=[K(0,[-1.4,1.46,-.6]),K(.25,[-.48,1.25,-.55],{lean:.23}),K(.5,[-.42,1.1,-.55],{lean:.35}),K(.73,[-.56,1.25,-.57],{lean:.16}),K(1,[-.9,1.46,-.6])];
    D=[DK(0,[1.4,1.46,.58]),DK(.25,[.88,1.36,.58],{lean:.13}),DK(.5,[.78,.94,.58],{roll:-.66,ground:.2,spread:.3}),down(.77,.92,.63),down(1,.92,.63)];
  }else if(name==='shove_counter'){
    A=[K(0,[-1.4,1.46,-.2]),K(.3,[-.65,1.38,-.2],{lean:.12}),K(.49,[-.42,1.43,-.2],{lean:.23,spread:.7}),K(.7,[-.73,1.46,-.2]),K(1,[-1.25,1.46,-.2])];
    D=[DK(0,[1.4,1.46,.25]),DK(.3,[.84,1.43,.25]),DK(.5,[.86,1.3,.25],{lean:-.23,spread:.8}),DK(.7,[1.25,1.35,.25],{lean:-.13}),DK(1,[1.6,1.46,.25])];
  }else if(name==='headlock'){
    A=[K(0,[-.55,1.2,-1.15],{yaw:0}),K(.28,[.35,.92,-.9],{yaw:0,lean:.25}),K(.52,[.32,.86,-.9],{yaw:0,lean:.28}),K(.75,[.35,.91,-.9],{yaw:0,lean:.24}),K(1,[.35,.92,-.9],{yaw:0,lean:.25})];
    D=[down(0,-.75,.3),down(.52,-.75,.3,{spread:.5}),down(1,-.75,.3)];
  }else if(name==='pin'||name==='kickout'){
    A=[K(0,[-.35,1.24,-.2],{yaw:PI/2,roll:-PI/2,ground:0,spread:.7}),K(1,[-.35,1.24,-.2],{yaw:PI/2,roll:-PI/2,ground:0,spread:.7})];D=[down(0,.15,.35),down(1,.15,.35)];
    if(name==='kickout'){A=[A[0],K(.44,[-.35,1.95,-.4],{roll:-1.15,ground:0,spread:1}),K(.73,[-.45,1.15,-1.2],{roll:-.35,ground:0,spread:1}),K(1,[-.9,1.05,-1.4],{roll:0,ground:1})];D=[D[0],down(.44,.15,.4,{roll:-1.15,spread:.5}),down(.72,.15,.4),down(1,.15,.4)];}
  }return [A,D];
}
const TRACKS=Object.fromEntries(Object.keys(MOVE_TIMING).map(n=>[n,tracks(n)]));
function surface(p,toward,radius=.33){return add(p,mul(unit(sub(toward,p)),radius));}
function mirror(r){r.root=[-r.root[0],r.root[1],-r.root[2]];r.yaw+=PI;r.roll=-r.roll;for(const k in r.j)r.j[k]=[-r.j[k][0],r.j[k][1],-r.j[k][2]];}
export function samplePair(name,t,attackerId='stone',postures={},time=0){
  t=clamp(t);const other=attackerId==='stone'?'viper':'stone';
  if(!name){const result={};for(const [id,x,yaw] of [['stone',-1.4,PI/2],['viper',1.4,-PI/2]]){
    const prone=postures[id]==='prone',kneeling=postures[id]==='kneeling',r=build(id,{p:[x,prone?.39:kneeling?.98:1.46,prone?(id==='stone'?-.7:.7):0],yaw,roll:prone?(id==='stone'?PI/2:-PI/2):0,spread:prone?1:0,ground:prone?0:kneeling?.75:1,lean:Math.sin(time/480)*.012});
    for(const side of ['l','r']){arm(r,side,r.j[side+'h']);leg(r,side,r.j[side+'a']);}ground(r);result[id]=r;
  }return result;}
  const [A,D]=TRACKS[name]||tracks(name);
  // Snap downs can start from either standing or kneeling, consistent with the rules.
  const defenderKeys=(name==='snap_down'&&postures[other]==='kneeling')
    ?[DK(0,[1.4,.98,.58],{ground:.75}),DK(.25,[.88,.94,.58],{lean:.1,ground:.65}),DK(.5,[.78,.83,.58],{roll:-.66,ground:.2,spread:.3}),down(.77,.92,.63),down(1,.92,.63)]
    :D;
  const a=sampleTrack(attackerId,A,t),d=sampleTrack(other,defenderKeys,t);
  if(name==='dragon_screw')leg(d,'r',add(d.j.pelvis,[-.95,-.25,-.1]),env(t,.08,.25,.45,.7));
  ground(a);ground(d);
  // Pins use vertical separation; keep the defender's back on the mat.
  if(name==='pin'||name==='kickout'){
    const cover=1-ease((t-.35)/.2);if(name==='pin'||cover>0){a.coreRadius=d.coreRadius=name==='pin'?.4:.61-.21*cover;const old=d.root[1];bodyClearance(a,d,true);const correction=old-d.root[1];translate(a,[0,correction,0]);translate(d,[0,correction,0]);}else bodyClearance(a,d);
  }else bodyClearance(a,d);
  for(const r of [a,d])for(const side of ['l','r'])arm(r,side,r.j[side+'h']);
  const grip=(r,side,p,w,radius=.33)=>arm(r,side,surface(p,r.j[side+'s'],radius),w);
  if(name==='lockup'){const w=env(t,.1,.25,.72,1);grip(a,'l',neckPoint(d),w);grip(a,'r',d.j.ls,w,.18);grip(d,'l',neckPoint(a),w);grip(d,'r',a.j.ls,w,.18);}
  else if(name==='forearm'){arm(a,'l',point(a,[-.7,2.8,-.5]),env(t,.04,.23,.3,.48));forearmContact(a,d,env(t,.3,.5,.54,.72));}
  else if(name==='clothesline')grip(a,'l',add(d.j.chest,[0,.25,0]),env(t,.22,.44,.49,.65),.4);
  else if(['suplex','finisher','body_slam'].includes(name)){const w=env(t,.09,.22,.61,.75),slam=name==='body_slam';grip(a,slam?'r':'l',mix(d.j.chest,neckPoint(d),.25),w,.4);grip(a,slam?'l':'r',d.j.pelvis,w,.4);grip(d,'l',a.j.rs,env(t,.1,.22,.35,.5),.18);}
  else if(name==='dragon_screw'){const w=env(t,.1,.25,.48,.68);arm(a,'l',add(d.j.ra,[0,.08,.12]),w);arm(a,'r',add(d.j.ra,[0,-.08,-.12]),w);}
  else if(['pick_up','pull_to_knees','snap_down'].includes(name)){const w=name==='snap_down'?env(t,.12,.29,.63,.86):env(t,.1,.28,.8,1.03);grip(a,'l',neckPoint(d),w,.24);grip(a,'r',d.j.rs,w,.18);}
  // Distinct paired grips and strikes: attachment follows the opponent's
  // animated landmarks rather than a fixed world-space destination.
  else if(name==='ddt'){const w=env(t,.1,.25,.68,.91);grip(a,'l',neckPoint(d),w,.18);grip(a,'r',d.j.rs,w,.15);grip(d,'r',a.j.ls,env(t,.18,.33,.52,.7),.18);}
  else if(name==='neckbreaker'){const w=env(t,.15,.28,.64,.88);grip(a,'r',neckPoint(d),w,.2);grip(a,'l',d.j.rs,w,.18);}
  else if(name==='hip_toss'){const w=env(t,.12,.25,.64,.85);arm(a,'l',d.j.rh,w);grip(a,'r',d.j.pelvis,w,.3);}
  else if(name==='spinebuster'){const w=env(t,.14,.29,.74,.89);grip(a,'l',d.j.pelvis,w,.27);grip(a,'r',d.j.chest,w,.33);grip(d,'l',a.j.rs,env(t,.19,.3,.65,.78),.18);}
  else if(name==='knee_lift'){const w=env(t,.28,.43,.5,.7);leg(a,'r',surface(d.j.chest,a.j.ra,.3),w);grip(a,'l',d.j.ls,env(t,.12,.3,.52,.66),.2);}
  else if(name==='dropkick'){const w=env(t,.28,.44,.54,.68);leg(a,'l',surface(d.j.chest,a.j.la,.27),w);leg(a,'r',surface(d.j.chest,a.j.ra,.27),w);}
  else if(name==='elbow_drop'){const w=env(t,.4,.6,.78,.85);arm(a,'l',surface(d.j.chest,a.j.ls,.3),w);}
  else if(name==='stomp'){const w=env(t,.43,.57,.64,.79);leg(a,'l',surface(d.j.chest,a.j.la,.26),w);}
  else if(name==='knee_drop'){const w=env(t,.54,.67,.76,.86);leg(a,'r',surface(d.j.chest,a.j.ra,.25),w);}
  else if(name==='leg_drop'){const w=env(t,.53,.7,.81,.93);leg(a,'r',surface(d.j.chest,a.j.ra,.24),w);}
  else if(name==='armbar'){const w=env(t,.18,.37,.78,.96);arm(a,'l',d.j.le,w);arm(a,'r',d.j.lh,w);arm(d,'l',surface(a.j.chest,d.j.lh,.4),w*.45);}
  else if(name==='ankle_lock'){const w=env(t,.22,.39,.77,.94);arm(a,'l',d.j.la,w);arm(a,'r',add(d.j.la,[0,.18,0]),w);}
  else if(name==='shove_counter'){const w=env(t,.17,.36,.47,.66);grip(a,'l',d.j.chest,w,.31);grip(a,'r',d.j.rs,w,.22);}
  else if(name==='headlock'){const w=ease(t/.28);grip(a,'l',neckPoint(d),w,.28);grip(a,'r',d.j.rs,w,.18);}
  else if(name==='pin')grip(a,'r',d.j.rk,1,.22);
  for(const r of [a,d])for(const side of ['l','r'])if(r.j[side+'h'][1]<.25)arm(r,side,[r.j[side+'h'][0],.25,r.j[side+'h'][2]]);
  if(attackerId==='viper'){mirror(a);mirror(d);}return {[attackerId]:a,[other]:d};
}
// Transitions rotate around the pelvis instead of swinging around the feet.
export function blendPairs(from,to,t){
  if(t<=0)return structuredClone(from);if(t>=1)return structuredClone(to);
  const out={};for(const id of ['stone','viper']){
    const a=from[id],b=to[id],angle=(x,y)=>x+Math.atan2(Math.sin(y-x),Math.cos(y-x))*t;
    const r=build(id,{p:mix(a.j.pelvis,b.j.pelvis,t),yaw:angle(a.yaw,b.yaw),roll:angle(a.roll,b.roll),ground:0});r.coreRadius=(a.coreRadius??.61)+((b.coreRadius??.61)-(a.coreRadius??.61))*t;
    for(const k in r.local)r.local[k]=mix(a.local[k],b.local[k],t);
    r.root=sub(mix(a.j.pelvis,b.j.pelvis,t),rotate(r.local.pelvis,r));for(const k in r.j)r.j[k]=point(r,r.local[k]);
    for(const side of ['l','r']){arm(r,side,mix(a.j[side+'h'],b.j[side+'h'],t));leg(r,side,mix(a.j[side+'a'],b.j[side+'a'],t));}ground(r);out[id]=r;
  }
  // Only correct genuine overlap during transitions, retaining whichever
  // side each performer already occupies (also when Viper attacks).
  const a=out.stone,b=out.viper;
  const overlap=coreVolumes(a).some(x=>coreVolumes(b).some(y=>length(sub(x.p,y.p))<x.radius+y.radius-1e-8));
  if(overlap){
    if(Math.abs(a.j.chest[1]-b.j.chest[1])>.8){const top=a.j.chest[1]>b.j.chest[1]?a:b,bottom=top===a?b:a,old=bottom.root[1];bodyClearance(top,bottom,true);const dy=old-bottom.root[1];translate(top,[0,dy,0]);translate(bottom,[0,dy,0]);}
    else if(a.root[2]<=b.root[2])bodyClearance(a,b);else bodyClearance(b,a);
  }
  return out;
}
