import assert from 'node:assert/strict';
import {demoMoves,reactionMove} from './moves.js';
import {animationByMove} from './combat-animation-map.js';
import {samplePair,coreVolumes,ARM_LENGTH,MOVE_TIMING,neckPoint} from './choreography.js';

const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const roster=[...demoMoves,reactionMove];
const ids=roster.map(m=>m.id);
assert.equal(new Set(ids).size,roster.length,'duplicate move IDs');
assert.deepEqual(Object.keys(animationByMove).sort(),ids.slice().sort(),'move has no unique animation mapping');
assert.equal(new Set(Object.values(animationByMove).map(a=>a.choreography)).size,roster.length,'reused choreography for different named moves');

const contactTargets={
 'ddt':'neck','neckbreaker':'neck','hip-toss':'rightHand','spinebuster':'pelvis',
 'knee-lift':'head','dropkick':'chest','elbow-drop':'chest',
 'stomp':'chest','knee-drop':'chest','leg-drop':'chest',
 'armbar':'leftHand','ankle-lock':'leftAnkle','shove-counter':'chest'
};
const legStrikes=new Set(['dropkick','stomp']);
const groundStrikes=new Set(['elbow-drop','stomp','knee-drop','leg-drop']);
let checked=0,maxJump=0,minHeight=Infinity,closestStrike=Infinity;
for(const move of roster){
 const animation=animationByMove[move.id],name=animation.choreography;
 assert(MOVE_TIMING[name],`${move.id}: undefined duration/choreography`);
 assert(MOVE_TIMING[name].duration>0,`${move.id}: invalid duration`);
 const expected=move.result?.defenderPosture;
 for(const who of ['stone','viper']){
  const other=who==='stone'?'viper':'stone';
  const start=move.requirements?.defenderPostures?.includes('prone')?'prone':'standing';
  const postures={[other]:start};
  let previous=null,initial=null,travel=0,contact=Infinity;
  for(let frame=0;frame<=1000;frame++){
   const t=frame/1000,pair=samplePair(name,t,who,postures);
   checked++;
   const a=pair[who],d=pair[other];
   if(!initial)initial=a.j.pelvis;
   travel=Math.max(travel,dist(initial,a.j.pelvis));
   for(const id of ['stone','viper']){
    const pose=pair[id];
    for(const [joint,point] of Object.entries(pose.j)){
     assert(point.every(Number.isFinite),`${move.id}: invalid coordinate in ${joint}`);
     minHeight=Math.min(minHeight,point[1]);
     assert(point[1]>=.20,`${move.id}: ${id} ${joint} below mat at frame ${frame}`);
     if(previous){
      const step=dist(point,previous[id].j[joint]);
      maxJump=Math.max(maxJump,step);
      assert(step<.15,`${move.id}: ${id} ${joint} discontinuity at ${frame}: ${step}`);
     }
    }
    for(const side of ['l','r']){
     assert(Math.abs(dist(pose.j[side+'s'],pose.j[side+'e'])-ARM_LENGTH)<1e-7,`${move.id}: stretched upper arm`);
     assert(Math.abs(dist(pose.j[side+'e'],pose.j[side+'h'])-ARM_LENGTH)<1e-7,`${move.id}: stretched forearm`);
    }
   }
   for(const x of coreVolumes(pair.stone))for(const y of coreVolumes(pair.viper)){
    assert(dist(x.p,y.p)>=x.radius+y.radius-1e-7,`${move.id}: torso/head penetration frame ${frame}`);
   }
   const target=contactTargets[move.id];
   if(target&&t>.23&&t<.88){
    const pt=target==='neck'?neckPoint(d):target==='head'?d.j.head:target==='rightHand'?d.j.rh:target==='pelvis'?d.j.pelvis:
      target==='leftHand'?d.j.lh:target==='leftAnkle'?d.j.la:d.j.chest;
    const extremities=move.id==='knee-lift'||move.id==='knee-drop'||move.id==='leg-drop'?[a.j.rk]:move.id==='elbow-drop'?[a.j.le]:legStrikes.has(move.id)?[a.j.la,a.j.ra]:[a.j.lh,a.j.rh];
    const distance=Math.min(...extremities.map(v=>dist(v,pt)));
    contact=Math.min(contact,distance);
   }
   previous=pair;
  }
  assert(travel>.30,`${move.id}: attacker stays stationary`);
  if(contactTargets[move.id]){
   assert(contact<(move.id==='knee-drop'||move.id==='leg-drop'?.98:.85),`${move.id}: lacks physical contact, closest=${contact}`);
   closestStrike=Math.min(closestStrike,contact);
  }
  const end=samplePair(name,1,who,postures)[other].j.head[1];
  if(expected==='prone')assert(end<.95,`${move.id}: defender must land on mat, head=${end}`);
  if(expected==='kneeling')assert(end>2.3&&end<3,`${move.id}: defender must end kneeling, head=${end}`);
  if(expected==='standing')assert(end>2.9,`${move.id}: defender must end standing, head=${end}`);
 }
}
// Snap Down also supports kneeling opponents, not just standing opponents.
for(const who of ['stone','viper']){
 const other=who==='stone'?'viper':'stone';
 const out=samplePair('snap_down',1,who,{[other]:'kneeling'});
 assert(out[other].j.head[1]<.95,'kneeling snap-down did not reach canvas');
}
console.log(`${roster.length} moves / ${checked} paired animation samples PASS: unique choreography, attacker travel, meaningful contact, defensive reactions, limb lengths, torso/head separation, mat and ending-posture safety; max step ${maxJump.toFixed(3)}.`);
