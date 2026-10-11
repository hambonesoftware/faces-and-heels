import assert from 'node:assert/strict';
import { samplePair, blendPairs, neckPoint, coreVolumes, ARM_LENGTH } from './choreography.js';

const distance = (a,b) => Math.hypot(...a.map((v,i) => v-b[i]));
const newMoves = ['pick_up','pull_to_knees','snap_down'];
let frames = 0;
let maxStep = 0;
let closestGrip = Infinity;
for (const name of newMoves) {
  for (const who of ['stone','viper']) {
    const other = who === 'stone' ? 'viper' : 'stone';
    for (const startKneeling of name === 'snap_down' ? [false,true] : [false]) {
      const postures = startKneeling ? {[other]:'kneeling'} : {[other]:name==='snap_down'?'standing':'prone'};
      let previous = null;
      for (let i=0; i<=1000; i++) {
        const t=i/1000;
        const pair=samplePair(name,t,who,postures);
        frames++;
        for (const id of ['stone','viper']) {
          const pose=pair[id];
          for (const [joint,p] of Object.entries(pose.j)) {
            assert(p.every(Number.isFinite), `${name} ${who} ${joint}: nonfinite position`);
            assert(p[1]>=.2, `${name} ${who} ${joint}: below mat`);
            if (previous) {
              const step=distance(p,previous[id].j[joint]);
              maxStep=Math.max(maxStep,step);
              assert(step<.15,`${name} ${who} ${joint}: jump at t=${t} (${step})`);
            }
          }
          for (const side of ['l','r']) {
            assert(Math.abs(distance(pose.j[side+'s'],pose.j[side+'e'])-ARM_LENGTH)<1e-7,`${name}: arm stretch`);
            assert(Math.abs(distance(pose.j[side+'e'],pose.j[side+'h'])-ARM_LENGTH)<1e-7,`${name}: forearm stretch`);
          }
        }
        for (const a of coreVolumes(pair.stone)) for (const b of coreVolumes(pair.viper)) {
          assert(distance(a.p,b.p)>=a.radius+b.radius-1e-7,`${name}: core/head overlap ${t}`);
        }
        if (t>.28 && t<.70) closestGrip=Math.min(closestGrip,distance(pair[who].j.lh,neckPoint(pair[other])));
        previous=pair;
      }
      const end=samplePair(name,1,who,postures);
      if(name==='pick_up')assert(end[other].j.head[1]>2.9,'pickup does not end standing');
      if(name==='pull_to_knees')assert(end[other].j.head[1]>2.45 && end[other].j.head[1]<2.95,'pull to knees ends in wrong height');
      if(name==='snap_down')assert(end[other].j.head[1]<.9,'snap down does not finish on the mat');
      const toPostures={[other]:name==='pick_up'?'standing':name==='pull_to_knees'?'kneeling':'prone'};
      const recovery=samplePair(null,0,who,toPostures);
      let prev=end;
      for(let i=1;i<=250;i++){
        const pose=blendPairs(end,recovery,i/250);
        for(const id of ['stone','viper']) for(const key in pose[id].j){
          assert(distance(pose[id].j[key],prev[id].j[key])<.15,`${name}: recovery jump ${id}/${key}`);
        }
        prev=pose;
      }
    }
  }
}
assert(closestGrip<.35,'setup moves never achieve convincing contact');
console.log(`${frames} synchronized setup frames verified: finite poses, mat clearance, core/head separation, fixed arms, contact, transitions. Max joint step ${maxStep.toFixed(3)}.`);
