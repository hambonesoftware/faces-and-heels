import assert from 'node:assert/strict';
import {samplePair,neckPoint,MOVE_TIMING,ARM_LENGTH,coreVolumes,blendPairs} from './choreography.js';
import {SpriteStage} from './sprite-stage.js';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const near=(a,b,label,tolerance=1e-7)=>assert.ok(distance(a,b)<tolerance,label);
const names=[null,'lockup','forearm','clothesline','suplex','finisher','body_slam','headlock','dragon_screw','pin','kickout'];
let count=0,maxStep=0;
for(const who of ['stone','viper'])for(const name of names){let prev;for(let i=0;i<=1000;i++){
 const pair=samplePair(name,i/1000,who,{},0);count++;
 for(const id of ['stone','viper']){
  const r=pair[id];
  for(const [joint,p] of Object.entries(r.j)){
   assert.ok(p.every(Number.isFinite),`${name} ${who}: nonfinite ${joint}`);
   assert.ok(p[1]>=.20,`${name} ${who}: ${joint} below the mat`);
   if(prev){const step=distance(p,prev[id].j[joint]);maxStep=Math.max(maxStep,step);assert.ok(step<.15,`${name} ${who}: discontinuous ${joint} at ${i}: ${step}`);}
  }
  for(const s of ['l','r']){
   assert.ok(Math.abs(distance(r.j[s+'s'],r.j[s+'e'])-ARM_LENGTH)<1e-7,'upper arm stretches');
   assert.ok(Math.abs(distance(r.j[s+'e'],r.j[s+'h'])-ARM_LENGTH)<1e-7,'forearm stretches');
  }
 }
 for(const a of coreVolumes(pair.stone))for(const b of coreVolumes(pair.viper))assert.ok(distance(a.p,b.p)>=a.radius+b.radius-1e-7,`${name}: torso/head overlap at ${i}`);
 prev=pair;
}}
for(const who of ['stone','viper']){
 const other=who==='stone'?'viper':'stone';
 for(const t of [.5,.55,.6]){
  let p=samplePair('body_slam',t,who);assert.ok(distance(p[who].j.lh,p[other].j.pelvis)<.55,'body slam hip support lost');assert.ok(distance(p[who].j.rh,neckPoint(p[other]))<.65,'body slam shoulder support lost');
  p=samplePair('suplex',t,who);assert.ok(distance(p[who].j.rh,p[other].j.pelvis)<.55,'suplex waist support lost');assert.ok(distance(p[who].j.lh,neckPoint(p[other]))<.65,'suplex upper support lost');
 }
 let p=samplePair('suplex',.55,who);assert.ok(p[other].j.la[1]>p[other].j.head[1]+2,'suplex must invert defender');
 p=samplePair('body_slam',.55,who);assert.ok(Math.abs(p[other].j.head[1]-p[other].j.la[1])<.3,'slam must carry horizontally');
 for(const n of ['suplex','body_slam']){p=samplePair(n,.85,who);assert.ok(p[other].j.chest[1]<.85&&p[other].j.head[1]<.85,'landing must reach the mat');}
 p=samplePair('forearm',.5,who);const centre=p[who].j.le.map((v,i)=>(v+p[who].j.lh[i])/2);assert.ok(Math.abs(distance(centre,p[other].j.head)-.5)<.015,'forearm contact misses face surface');
 const a=samplePair('body_slam',.52,who),b=samplePair('body_slam',.59,who);near(a[who].j.la,b[who].j.la,'left foot slides during carry');near(a[who].j.ra,b[who].j.ra,'right foot slides during carry');
 p=samplePair('pin',1,who);assert.ok(p[who].j.chest[1]>p[other].j.chest[1]+.7,'pin bodies coincide');
 for(const n of names.filter(Boolean)){
  const postures={};if(!['lockup','forearm'].includes(n))postures[other]='prone';
  const from=samplePair(n,1,who),to=samplePair(null,0,who,postures);let prev=from;
  for(let i=1;i<=200;i++){
   const pair=blendPairs(from,to,i/200);for(const id of ['stone','viper'])for(const k in pair[id].j)assert.ok(distance(pair[id].j[k],prev[id].j[k])<.15,`${n}: recovery snaps`);prev=pair;
  }
  for(const id of ['stone','viper'])for(const k in to[id].j)near(prev[id].j[k],to[id].j[k],'recovery endpoint');
 }
}
// Both attacking identities must follow the same performance, rotated 180°.
for(const n of names.filter(Boolean))for(const t of [.2,.4,.55,.74,.85,1]){
 const a=samplePair(n,t,'stone'),b=samplePair(n,t,'viper');
 for(const [id,op] of [['stone','viper'],['viper','stone']])for(const k in a[id].j)near([-a[id].j[k][0],a[id].j[k][1],-a[id].j[k][2]],b[op].j[k],`${n}: attacker parity`);
}
// Impact callbacks must track the continuous performance, not rounded sprite frames.
let impacts=0,resolved=0;
const stage={impactPulse:0,updateParticles(){},applyChoreography(){},solveContacts(){},pulseImpact(){},display:{stone:{},viper:{}},playback:{start:0,duration:1000,frameCount:14,attackerId:'stone',defenderId:'viper',attackerAnim:'suplex',defenderAnim:'suplex_taken',impactFrame:11,impactProgress:.82,hitStopMs:60,impactFired:false,onImpact(){impacts++},resolve(){resolved++}}};
SpriteStage.prototype.update.call(stage,810,16);assert.equal(impacts,0);
SpriteStage.prototype.update.call(stage,820,10);assert.equal(impacts,1);assert.equal(stage.playback.freezeProgress,.82);
SpriteStage.prototype.update.call(stage,850,30);assert.equal(impacts,1);
SpriteStage.prototype.update.call(stage,881,31);assert.equal(stage.playback.start,60);
SpriteStage.prototype.update.call(stage,1061,180);assert.equal(resolved,1);
assert.equal(stage.playback,null);
console.log(`${count} paired samples: core clearance, bounded limbs, continuity (max step ${maxStep.toFixed(3)}), supported lifts, planted carry, mirrored attackers, recoveries and exact impact timing passed.`);
