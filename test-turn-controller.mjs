import assert from 'node:assert/strict';
import {ACTION_IDS,getTurnContext,canPerformAction,getDefensiveWindow,auditTurnState} from './turn-controller.js';
import {
  cloneInitialState,giveControl,wrestler,getLegalMoves,getAvailableActions,
  checkCombatFlow,validateCombatAction,resolveNeutralRoll,resolveMoveAttempt,
  resolveReaction,declineReaction,skipPin,startPin,resolvePinCount,
  escapeHold,maintainHold,releaseHold,scrambleUp,spendCrowdForStamina,catchBreathToNeutral
} from './match-engine.js';
import {readFileSync} from 'node:fs';

const action=(state,id,actorId)=>validateCombatAction(state,id,actorId);
const expect=(state,phase,owner)=>{
  const result=checkCombatFlow(state);
  assert(result.ok,'Non-actionable '+phase+': '+result.issues.join('; '));
  assert.equal(result.turn.phase,phase);
  assert.equal(result.turn.actorId,owner);
  assert(result.turn.actions.some(a=>a.enabled),'No enabled actions at '+phase);
  return result.turn;
};
{
 const state=cloneInitialState();
 expect(state,'NEUTRAL_ROLL',null);
 assert(action(state,ACTION_IDS.NEUTRAL,null).ok);
 assert.equal(getDefensiveWindow(state),null);
 resolveNeutralRoll(state,20,1);
 expect(state,'ACTION_SELECT','stone');
 assert(action(state,ACTION_IDS.MOVE,'stone').ok);
 assert(!action(state,ACTION_IDS.MOVE,'viper').ok,'Low cannot initiate an offensive move');
}
{
 const state=cloneInitialState();
 giveControl(state,'stone');
 const miss=resolveMoveAttempt(state,{moveId:'forearm-smash',attackRoll:1,damageRoll:1});
 assert(!miss.success);
 const turn=expect(state,'REACTION','viper');
 assert.equal(turn.controlId,'stone');
 assert.equal(turn.kind,'interrupt');
 assert.equal(getDefensiveWindow(state).actorId,'viper');
 assert(action(state,ACTION_IDS.REACT,'viper').ok);
 assert(!action(state,ACTION_IDS.REACT,'stone').ok);
 assert(action(state,ACTION_IDS.PASS_REACTION,'viper').ok);
 const result=resolveReaction(state,{reactionRoll:20,damageRoll:1});
 assert(result.success);
 expect(state,'ACTION_SELECT','viper');
 assert.equal(state.roles.viper,'H');
}
{
 const state=cloneInitialState();
 giveControl(state,'stone');
 wrestler(state,'viper').stamina=0;
 const failed=resolveMoveAttempt(state,{moveId:'forearm-smash',attackRoll:1,damageRoll:1});
 assert(!failed.success);
 assert.equal(state.pendingFailure,null,'No stale reaction after inadequate counter stamina');
 expect(state,'ACTION_SELECT','stone');
}
{
 const state=cloneInitialState();
 giveControl(state,'stone');
 const hit=resolveMoveAttempt(state,{moveId:'running-clothesline',attackRoll:20,damageRoll:1});
 assert(hit.pinEligible);
 expect(state,'PIN_OPPORTUNITY','stone');
 assert(action(state,ACTION_IDS.PIN,'stone').ok);
 assert(!action(state,ACTION_IDS.PIN,'viper').ok);
 assert(action(state,ACTION_IDS.SKIP_PIN,'stone').ok);
 const info=startPin(state);
 const turn=expect(state,'PIN','viper');
 assert.equal(turn.kind,'pin-defense');
 assert.equal(getDefensiveWindow(state).actorId,'viper');
 assert.equal(getDefensiveWindow(state).controlId,'stone');
 assert(!action(state,ACTION_IDS.COUNT_PIN,'stone').ok);
 assert(action(state,ACTION_IDS.COUNT_PIN,'viper').ok);
 assert.throws(()=>resolvePinCount(state,{pinningId:info.pinningId,count:2,pinningRoll:20,pinnedRoll:1}),/Pin counts must resolve in order/);
 const count=resolvePinCount(state,{pinningId:info.pinningId,count:1,pinningRoll:5,pinnedRoll:19});
 assert(count.kickout);
 expect(state,'ACTION_SELECT','viper');
 const recovery=getAvailableActions(state);
 assert(recovery.actions.some(a=>a.id===ACTION_IDS.SCRAMBLE&&a.enabled),'Kickout gives action-owner standing option');
 assert(!action(state,ACTION_IDS.SCRAMBLE,'stone').ok,'Low cannot illegally stand through opponent action');
 assert(scrambleUp(state,'viper').ok);
}
{
 const state=cloneInitialState();
 giveControl(state,'stone');
 wrestler(state,'viper').stamina=1;
 resolveMoveAttempt(state,{moveId:'running-clothesline',attackRoll:20,damageRoll:1});
 const turn=expect(state,'PIN_OPPORTUNITY','stone');
 assert.equal(turn.actions.find(a=>a.id===ACTION_IDS.SKIP_PIN).enabled,false);
 assert(!skipPin(state).ok);
}
for(const [id,actor,target] of [
 ['armbar','viper','leftArm'],['ankle-lock','viper','leftLeg'],['ground-headlock','stone','head']
]){
 const state=cloneInitialState();giveControl(state,actor);
 const low=actor==='stone'?'viper':'stone';
 wrestler(state,low).posture='prone';
 resolveMoveAttempt(state,{moveId:id,target,attackRoll:20,damageRoll:1});
 const escape=expect(state,'HOLD_ESCAPE',low);
 assert.equal(escape.kind,'hold-defense');
 assert.equal(escape.controlId,actor);
 assert(action(state,ACTION_IDS.HOLD_ESCAPE,low).ok,'Low must escape while High controls');
 assert(!action(state,ACTION_IDS.HOLD_ESCAPE,actor).ok);
 const failed=escapeHold(state,{escapeRoll:1});
 assert(!failed.success);
 expect(state,'HOLD',actor);
 assert(action(state,ACTION_IDS.HOLD_RELEASE,actor).ok);
 const effect=maintainHold(state);
 assert(effect.ok);
 expect(state,'HOLD_ESCAPE',low);
 assert(!action(state,ACTION_IDS.HOLD_SQUEEZE,actor).ok,'Holder cannot squeeze twice without escape');
 const succeeded=escapeHold(state,{escapeRoll:20});
 assert(succeeded.success);
 expect(state,'NEUTRAL_ROLL',null);
}
{
 const state=cloneInitialState();giveControl(state,'viper');
 wrestler(state,'stone').posture='prone';
 resolveMoveAttempt(state,{moveId:'armbar',target:'leftArm',attackRoll:20,damageRoll:1});
 assert(!escapeHold(state,{escapeRoll:1}).success);
 wrestler(state,'stone').stamina=4;
 const pressure=maintainHold(state);
 assert(pressure.finishPending);
 expect(state,'HOLD_ESCAPE','stone');
 assert(escapeHold(state,{escapeRoll:20}).success,'Last chance remains valid despite zero stamina');
}
{
 const state=cloneInitialState();giveControl(state,'viper');
 wrestler(state,'stone').posture='prone';
 resolveMoveAttempt(state,{moveId:'armbar',target:'leftArm',attackRoll:20,damageRoll:1});
 assert(!escapeHold(state,{escapeRoll:1}).success);
 const released=releaseHold(state);
 assert(released.ok);
 expect(state,'PIN_OPPORTUNITY','viper');
}
{
 const state=cloneInitialState();giveControl(state,'stone');
 wrestler(state,'stone').stamina=0;
 wrestler(state,'stone').crowdResource=0;
 const turn=expect(state,'ACTION_SELECT','stone');
 assert(!turn.actions.some(a=>a.id===ACTION_IDS.MOVE&&a.enabled));
 assert(turn.actions.some(a=>a.id===ACTION_IDS.BREATH&&a.enabled),'Exhausted wrestler must have a recovery fallback');
 assert(catchBreathToNeutral(state,'stone'));
 expect(state,'NEUTRAL_ROLL',null);
}
{
 const state=cloneInitialState();giveControl(state,'stone');
 wrestler(state,'stone').stamina=35;
 const turn=expect(state,'ACTION_SELECT','stone');
 assert(turn.actions.some(a=>a.id===ACTION_IDS.RECOVER&&a.enabled));
 assert(!action(state,ACTION_IDS.RECOVER,'viper').ok);
 assert(spendCrowdForStamina(state,'stone',1).ok);
}
const app=readFileSync('app.js','utf8');
for(const marker of ['function turnDecision()','function permitted(','data-pin-defense','function renderPinDefense()','async function rollPinDefense()','ACTION_IDS.COUNT_PIN','getAvailableActions','validateCombatAction']){
 assert(app.includes(marker),'Missing central-turn integration '+marker);
}
assert(!app.includes('for (const count of [1,2,3])'),'Pin counts must wait for player defense input');
assert(app.includes('turn-chip--defense'),'HUD must indicate when Low wrestler is the active defender');
console.log('Turn controller PASS: valid actors, Low reactions and holds, interactive pinned defense, recovery rights, and terminal states.');
