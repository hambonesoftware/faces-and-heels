import assert from 'node:assert/strict';
import {cloneInitialState,giveControl,wrestler,resolveMoveAttempt,escapeHold,
  transitionHold,availableHoldTransitions,maintainHold,validateCombatAction,checkCombatFlow} from './match-engine.js';
import {ACTION_IDS} from './turn-controller.js';
import {samplePair,blendPairs,coreVolumes,ARM_LENGTH} from './choreography.js';
import {readFileSync} from 'node:fs';
const d=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function holding(){
 const state=cloneInitialState();giveControl(state,'viper');
 wrestler(state,'stone').posture='prone';
 assert(resolveMoveAttempt(state,{moveId:'armbar',target:'leftArm',attackRoll:20,damageRoll:3}).success);
 assert(!escapeHold(state,{escapeRoll:1}).success);
 assert.equal(state.phase,'HOLD');
 return state;
}
{
 const state=holding(),options=availableHoldTransitions(state);
 assert.deepEqual(options.map(x=>x.id),['ankle-lock']);
 assert(validateCombatAction(state,ACTION_IDS.HOLD_SWITCH,'viper').ok);
 assert(!validateCombatAction(state,ACTION_IDS.HOLD_SWITCH,'stone').ok);
 const stone=wrestler(state,'stone'),viper=wrestler(state,'viper');
 const beforeA=viper.stamina,beforeD=stone.stamina;
 const moved=transitionHold(state,{moveId:'ankle-lock'});
 assert(moved.ok&&moved.from==='armbar'&&moved.to==='ankle-lock');
 assert.equal(beforeA-viper.stamina,3);
 assert.equal(beforeD-stone.stamina,4);
 assert.equal(state.activeHold.moveId,'ankle-lock');
 assert.equal(state.phase,'HOLD_ESCAPE');
 assert(checkCombatFlow(state).ok);
 assert(!transitionHold(state,{moveId:'armbar'}).ok,'No chaining twice before defender responds');
 assert(!escapeHold(state,{escapeRoll:1}).success);
 assert(availableHoldTransitions(state).some(x=>x.id==='armbar'));
}
{
 const state=holding();
 assert(!transitionHold(state,{moveId:'ground-headlock'}).ok,'Viper does not know Headlock');
 assert(!transitionHold(state,{moveId:'armbar'}).ok,'Cannot switch to identical hold');
 wrestler(state,'viper').stamina=2;
 assert(!transitionHold(state,{moveId:'ankle-lock'}).ok,'Cost must be affordable');
}
{
 const state=holding();
 wrestler(state,'viper').commonMoves.push('ground-headlock');
 assert(availableHoldTransitions(state).some(x=>x.id==='ground-headlock'));
 assert(transitionHold(state,{moveId:'ground-headlock'}).ok);
}
let samples=0;
for(const attacker of ['stone','viper'])for(const [from,to] of [['armbar','ankle_lock'],['headlock','armbar'],['ankle_lock','headlock']]){
 const old=samplePair(from,.60,attacker),next=samplePair(to,.60,attacker);
 let previous=old;
 for(let i=0;i<=120;i++){
  const pose=blendPairs(old,next,i/120);
  samples++;
  for(const id of ['stone','viper']){
   for(const [key,p] of Object.entries(pose[id].j)){
    assert(p.every(Number.isFinite),'Transition invalid joint');
    assert(p[1]>=.20,'Joint below canvas');
    assert(d(p,previous[id].j[key])<.2,'Transition teleported limb');
   }
   for(const side of ['l','r']){
    assert(Math.abs(d(pose[id].j[side+'s'],pose[id].j[side+'e'])-ARM_LENGTH)<1e-6);
    assert(Math.abs(d(pose[id].j[side+'e'],pose[id].j[side+'h'])-ARM_LENGTH)<1e-6);
   }
  }
  for(const a of coreVolumes(pose.stone))for(const b of coreVolumes(pose.viper))
   assert(d(a.p,b.p)>=a.radius+b.radius-1e-6,'Core collision during grip transition');
  previous=pose;
 }
}
const iso=readFileSync('iso-stage.js','utf8'),app=readFileSync('app.js','utf8');
assert(iso.includes('playHoldTransition(fromMoveId,toMoveId,holderId)'));
assert(iso.includes('blendPairs(h.from,h.to,ease(u))'));
assert(app.includes('data-hold-switch='));
console.log('Chained submissions PASS: legal repertoires, pressure/escape turns, '+samples+' collision-tested blend poses.');
