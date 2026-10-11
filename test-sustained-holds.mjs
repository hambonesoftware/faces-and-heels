import assert from 'node:assert/strict';
import {demoMoves} from './moves.js';
import {cloneInitialState,giveControl,wrestler,getLegalMoves,resolveMoveAttempt,maintainHold,releaseHold,escapeHold,startPin} from './match-engine.js';
import {samplePair,coreVolumes,ARM_LENGTH,neckPoint} from './choreography.js';
import {readFileSync} from 'node:fs';

const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const specs=[
 {id:'armbar',attacker:'viper',choreography:'armbar',target:'leftArm'},
 {id:'ankle-lock',attacker:'viper',choreography:'ankle_lock',target:'leftLeg'},
 {id:'ground-headlock',attacker:'stone',choreography:'headlock',target:'head'}
];
function setupHold(spec){
 const state=cloneInitialState();
 giveControl(state,spec.attacker);
 const other=spec.attacker==='stone'?'viper':'stone';
 wrestler(state,other).posture='prone';
 assert(getLegalMoves(state).some(m=>m.id===spec.id),spec.id+' unavailable to correct wrestler');
 const move=demoMoves.find(m=>m.id===spec.id);
 const a=wrestler(state,spec.attacker),d=wrestler(state,other),beforeA=a.stamina,beforeD=d.stamina;
 const hit=resolveMoveAttempt(state,{moveId:spec.id,target:spec.target,attackRoll:20,damageRoll:1});
 assert(hit.success,spec.id+' failed at high roll');
 assert.equal(a.stamina,beforeA-move.staminaCost);
 assert.equal(d.stamina,beforeD-move.staminaDamage);
 assert.equal(state.phase,'HOLD_ESCAPE','Every successful hold immediately grants Low a defense roll');
 assert.equal(state.activeHold.moveId,spec.id);
 assert.equal(state.activeHold.holderId,spec.attacker);
 assert.equal(state.activeHold.defenderId,other);
 assert.equal(state.pinEligible,false,'Cannot pin while a hold is locked');
 assert.equal(getLegalMoves(state).length,0,'Ordinary attack list should be hidden during hold');
 assert.throws(()=>resolveMoveAttempt(state,{moveId:spec.id,attackRoll:20,damageRoll:1}),/not learned or legal/);
 return {state,move,a,d,other};
}
for(const spec of specs){
 const {state,move,a,d}=setupHold(spec);
 const initial=escapeHold(state,{escapeRoll:1});
 assert(initial.ok&&!initial.success,'Initial escape should fail on a roll of 1');
 assert.equal(state.phase,'HOLD');
 assert.equal(state.activeHold.escapes,1);
 const beforeA=a.stamina,beforeD=d.stamina;
 const pressure=maintainHold(state);
 assert(pressure.ok&&!pressure.submitted);
 assert.equal(pressure.cost,move.sustained.tickCost);
 assert.equal(pressure.staminaDamage,move.sustained.tickDamage);
 assert.equal(beforeA-a.stamina,move.sustained.tickCost);
 assert.equal(beforeD-d.stamina,move.sustained.tickDamage);
 assert(pressure.staminaDamage>pressure.cost,'Pressure must drain more opponent stamina than attacker expenditure');
 assert.equal(state.phase,'HOLD_ESCAPE');
 assert.equal(state.activeHold.ticks,1);
 assert.equal(maintainHold(state).ok,false,'Cannot squeeze twice without escape turn');
 assert.equal(releaseHold(state).ok,false,'Cannot bypass escape turn');

 const escape=escapeHold(state,{escapeRoll:1});
 assert(escape.ok&&!escape.success,'minimum escape roll must fail');
 assert.equal(state.phase,'HOLD');
 assert.equal(state.activeHold.escapes,2);
 assert.equal(escape.staminaCost,move.sustained.escapeCost);
 assert.equal(state.activeWrestlerId,spec.attacker);
 assert.equal(state.roles[spec.attacker],'H');

 const released=releaseHold(state);
 assert(released.ok);
 assert.equal(state.activeHold,null);
 assert.equal(state.phase,'PIN_OPPORTUNITY');
 assert.equal(state.pinningWrestlerId,spec.attacker);
 assert(startPin(state).pinningId===spec.attacker);
}
for(const spec of specs){
 const {state}=setupHold(spec);
 const success=escapeHold(state,{escapeRoll:20});
 assert(success.ok&&success.success,'maximum roll should break any demo hold');
 assert.equal(state.activeHold,null);
 assert.equal(state.phase,'NEUTRAL_ROLL');
 assert.equal(state.roles.stone,'N');
 assert.equal(state.roles.viper,'N');
 assert.equal(state.wrestlers.stone.posture,'standing');
 assert.equal(state.wrestlers.viper.posture,'standing');
}
for(const spec of specs){
 const {state,d,move}=setupHold(spec);
 // A first failed escape gives the attacker permission to apply pressure.
 assert(!escapeHold(state,{escapeRoll:1}).success);
 d.stamina=move.sustained.tickDamage;
 const end=maintainHold(state);
 assert(end.ok&&!end.submitted&&end.finishPending,'Exhaustion must trigger a final defensive roll');
 assert.equal(state.phase,'HOLD_ESCAPE');
 assert.equal(d.stamina,0);
 assert.equal(state.winnerId,null);
 const final=escapeHold(state,{escapeRoll:1});
 assert(final.ok&&final.submitted&&!final.success,'Failed final escape finishes submission');
 assert.equal(state.winnerId,spec.attacker);
 assert.equal(state.winMethod,'submission');
 assert.equal(state.phase,'MATCH_COMPLETE');
 assert.equal(state.activeHold,null);
}
// Defender can still attempt to escape without paying more than their remaining STA.
{
 const {state,d}=setupHold(specs[0]);
 d.stamina=1;
 const escape=escapeHold(state,{escapeRoll:20});
 assert.equal(escape.staminaCost,1);
 assert.equal(d.stamina,0);
 assert(escape.success);
}
{
 const {state,a}=setupHold(specs[1]);
 assert(!escapeHold(state,{escapeRoll:1}).success);
 a.stamina=0;
 assert.equal(maintainHold(state).ok,false);
 assert(releaseHold(state).ok,'A tired wrestler can release without stamina');
}

// Even an opponent exhausted on the initial grab gets the final defensive roll.
for(const spec of specs){
 const {state,d}=setupHold(spec);
 d.stamina=0;
 state.activeHold.finishPending=true;
 const final=escapeHold(state,{escapeRoll:20});
 assert(final.success&&!final.submitted,'A natural 20 must still beat an exhausting grapple');
 assert.equal(state.phase,'NEUTRAL_ROLL');
}

let samples=0;
for(const spec of specs)for(const actorId of ['stone','viper']){
 const name=spec.choreography;
 for(let i=0;i<=150;i++){
  const t=.585+(i/150)*.03;
  const pose=samplePair(name,t,actorId,{[actorId==='stone'?'viper':'stone']:'prone'});
  samples++;
  for(const id of ['stone','viper']){
   for(const point of Object.values(pose[id].j)){
    assert(point.every(Number.isFinite),name+' invalid hold joint');
    assert(point[1]>=.2,name+' penetrates the mat');
   }
   for(const side of ['l','r']){
    assert(Math.abs(dist(pose[id].j[side+'s'],pose[id].j[side+'e'])-ARM_LENGTH)<1e-6);
    assert(Math.abs(dist(pose[id].j[side+'e'],pose[id].j[side+'h'])-ARM_LENGTH)<1e-6);
   }
  }
  for(const a of coreVolumes(pose.stone))for(const b of coreVolumes(pose.viper)){
   assert(dist(a.p,b.p)>=a.radius+b.radius-1e-6,name+' head/torso collision');
  }
 }
}
const stage=readFileSync('iso-stage.js','utf8');
assert(stage.includes('setHold(hold)'), 'Renderer missing retained hold');
assert(stage.includes("this.activeHold.moveId"), 'Renderer must hold same paired choreography');
assert(stage.includes("!p&&!this.preview&&!this.pinId&&this.activeHold"), 'Hold must render while not playing new attacks');
const ui=readFileSync('app.js','utf8');
for(const control of ['data-hold-squeeze','data-hold-release','data-hold-escape']){
 assert(ui.includes(control),'Missing '+control);
}
assert(ui.includes("state.winMethod==='submission'"),'Submission victory must be labeled');
assert(ui.includes('recordResult(progression,result.holderId'),'Submission victories must be saved');
console.log('Sustained wrestling submissions PASS: three holds, two actors, pressure/escape/release loops, submission wins, '+samples+' paired pose samples.');
