import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoMoves,reactionMove} from './moves.js';
import {animationByMove} from './combat-animation-map.js';
import {samplePair,coreVolumes,ARM_LENGTH,neckPoint} from './choreography.js';
import {moveArt,MOVE_ART_TIMES} from './ui-art.js';
import {cloneInitialState,giveControl,getLegalMoves,perspectiveState,resolveMoveAttempt,resolveReaction,wrestler} from './match-engine.js';
import {resolveTargetDecision} from './flow-engine.js';

const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const allMoves=[...demoMoves,reactionMove];
const moveIds=new Set(allMoves.map(move=>move.id));
assert.equal(moveIds.size,23,'Every move ID must be unique');
assert.equal(Object.keys(animationByMove).length,allMoves.length,'Every move requires choreography');
assert.equal(Object.keys(MOVE_ART_TIMES).length,allMoves.length,'Every move including the counter needs art');

let frames=0;
for(const move of allMoves){
  assert(Number.isInteger(move.staminaCost)&&move.staminaCost>0,move.id+': positive integer stamina cost');
  assert(Number.isInteger(move.staminaDamage)&&move.staminaDamage>move.staminaCost,move.id+': opponent damage must exceed attacker cost');
  const anim=animationByMove[move.id];
  assert(anim,move.id+': missing choreography entry');

  if(move===reactionMove){
    const preview=moveArt(move.id);
    assert(preview.includes('data-choreography="shove_counter"'),'Counter preview does not depict shove');
    assert.equal((preview.match(/data-wrestler=/g)||[]).length,2,'Counter art must show both wrestlers');
    continue;
  }
  assert(move.automatic===true || move.category!=='setup',move.id+': setup moves should not require a d20');
  const state=cloneInitialState();
  giveControl(state,'stone');
  const actor=wrestler(state,'stone'),defender=wrestler(state,'viper');
  actor.posture=move.requirements.attackerPostures[0];
  defender.posture=move.requirements.defenderPostures[0];
  assert(getLegalMoves(state).some(item=>item.id===move.id),move.id+': move must be legal in its declared starting position');
  const decision=resolveTargetDecision(move,perspectiveState(state));
  const originalAttacker=actor.stamina,originalDefender=defender.stamina;
  const originalPosture=defender.posture;
  const bodyBefore=JSON.stringify(defender.bodyDamage);
  const outcome=resolveMoveAttempt(state,{moveId:move.id,target:decision.values[0]||null,attackRoll:20,damageRoll:12});
  assert(outcome.success,move.id+': 20 roll should succeed');
  assert.equal(originalAttacker-actor.stamina,move.staminaCost,move.id+': wrong player cost');
  assert.equal(originalDefender-defender.stamina,move.staminaDamage,move.id+': wrong opponent loss');
  assert(outcome.staminaDamage>move.staminaCost,move.id+': successful loss should be greater than player cost');
  assert.equal(outcome.listedStaminaDamage,move.staminaDamage,move.id+': listed loss mismatch');
  if(move.category==='setup'){
    assert.equal(JSON.stringify(defender.bodyDamage),bodyBefore,move.id+': setup must not mark damage');
    assert.equal(state.pinEligible,false,move.id+': setup must not produce a pin');
    assert.equal(state.activeWrestlerId,'stone',move.id+': setup must retain control');
  }
  if(move.result?.preserveDefenderPosture)assert.equal(defender.posture,originalPosture,move.id+': posture unexpectedly changed');

  const poseTime=MOVE_ART_TIMES[move.id],art=moveArt(move.id);
  assert(Number.isFinite(poseTime)&&poseTime>0&&poseTime<1,move.id+': invalid animation moment');
  assert(art.includes('data-choreography="'+anim.choreography+'"'),move.id+': art depicts wrong choreography');
  assert(art.includes('data-pose-time="'+poseTime+'"'),move.id+': art time inconsistent');
  assert.equal((art.match(/data-wrestler=/g)||[]).length,2,move.id+': art must show both performers');
  assert(!/NaN|Infinity|undefined/.test(art),move.id+': non-finite artwork coordinates');
}

// Failed moves cost stamina, but must not exhaust the opponent on a miss.
{
 const state=cloneInitialState();
 giveControl(state,'stone');
 const before=wrestler(state,'viper').stamina;
 const fail=resolveMoveAttempt(state,{moveId:'forearm-smash',target:'head',attackRoll:1,damageRoll:1});
 assert(!fail.success,'low roll should miss');
 assert.equal(wrestler(state,'viper').stamina,before,'missed move drained stamina');
 const originalAttacker=wrestler(state,'stone'),reactor=wrestler(state,'viper');
 const originalBefore=originalAttacker.stamina,reactorBefore=reactor.stamina;
 const reaction=resolveReaction(state,{reactionRoll:20,damageRoll:8});
 assert(reaction.success,'shove reaction should succeed');
 assert.equal(originalBefore-originalAttacker.stamina,reactionMove.staminaDamage,'wrong reaction damage');
 assert.equal(reactorBefore-reactor.stamina,reactionMove.staminaCost,'wrong reaction cost');
 assert(reaction.staminaDamage>reactionMove.staminaCost,'reaction fails requested imbalance');
}

// A kneeling opponent remains kneeling after being struck by a forearm.
{
 const state=cloneInitialState();
 giveControl(state,'stone');
 wrestler(state,'viper').posture='kneeling';
 const impact=resolveMoveAttempt(state,{moveId:'forearm-smash',target:'head',attackRoll:20,damageRoll:7});
 assert(impact.success);
 assert.equal(wrestler(state,'viper').posture,'kneeling');
}

// Clamp actual stamina loss to remaining stamina, but retain nominal values.
{
 const state=cloneInitialState();
 giveControl(state,'stone');
 wrestler(state,'viper').stamina=2;
 const outcome=resolveMoveAttempt(state,{moveId:'forearm-smash',target:'head',attackRoll:20,damageRoll:1});
 assert(outcome.success);
 assert.equal(outcome.staminaDamage,2);
 assert.equal(outcome.listedStaminaDamage,7);
 assert.equal(wrestler(state,'viper').stamina,0);
}

// Kneeling defenders should NOT pop to standing at the beginning of a move.
// Kneeling grapplers should start on their knees, not standing.
const variants=[
 ['knee_lift',{viper:'kneeling'},'viper'],
 ['ddt',{viper:'kneeling'},'viper'],
 ['forearm',{viper:'kneeling'},'viper'],
 ['snap_down',{viper:'kneeling'},'viper'],
 ['pick_up',{stone:'kneeling',viper:'prone'},'stone'],
 ['armbar',{stone:'kneeling',viper:'prone'},'stone'],
 ['ankle_lock',{stone:'kneeling',viper:'prone'},'stone']
];
for(const [name,postures,kneelingId] of variants){
 const first=samplePair(name,0,'stone',postures);
 assert(first[kneelingId].j.head[1]>2.4&&first[kneelingId].j.head[1]<2.95,name+': begins standing instead of kneeling');
 let previous=null;
 for(let i=0;i<=500;i++){
  const t=i/500,pair=samplePair(name,t,'stone',postures);
  frames++;
  for(const id of ['stone','viper']){
   for(const [key,point] of Object.entries(pair[id].j)){
    assert(point.every(Number.isFinite),name+': nonfinite coordinate');
    assert(point[1]>=.18,name+': model below canvas');
    if(previous)assert(distance(point,previous[id].j[key])<.27,name+': snapped joint on variant');
   }
   for(const limb of ['l','r']){
    assert(Math.abs(distance(pair[id].j[limb+'s'],pair[id].j[limb+'e'])-ARM_LENGTH)<1e-6,name+': upper arm stretch');
    assert(Math.abs(distance(pair[id].j[limb+'e'],pair[id].j[limb+'h'])-ARM_LENGTH)<1e-6,name+': lower arm stretch');
   }
  }
  for(const left of coreVolumes(pair.stone))for(const right of coreVolumes(pair.viper))
   assert(distance(left.p,right.p)>=left.radius+right.radius-1e-6,name+': torso or head intersection');
  previous=pair;
 }
}

// A move's physical target should match the declared body region.
const dropkick=demoMoves.find(move=>move.id==='dropkick');
const headlock=demoMoves.find(move=>move.id==='ground-headlock');
assert.deepEqual(dropkick.targeting.bodyParts,['core'],'Dropkick hits chest, not head');
assert.deepEqual(headlock.targeting.bodyParts,['head'],'Headlock must affect neck/head, not core');
assert(demoMoves.find(move=>move.id==='pick-up-opponent').result.attackerPosture==='standing','pickup should return kneeling attacker to feet');
assert(demoMoves.find(move=>move.id==='forearm-smash').result.preserveDefenderPosture,'forearm must not levitate kneeling opponent');

const app=readFileSync('app.js','utf8');
assert(app.includes('OPP STA'),'Action bar should reveal expected opponent drain');
assert(app.includes('OPPONENT ON HIT'),'Move inspection should reveal expected opponent drain');
assert(app.includes('OPPONENT EXERTION'),'Setup screen should explain its stamina penalty');

console.log('Balanced roster / animation art PASS: '+demoMoves.length+' moves, one counter, '+frames+' kneeling samples, legal posture consequences, real versus listed drain, accurate impact target, synchronized artwork.');
