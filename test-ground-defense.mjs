import assert from 'node:assert/strict';
import {cloneInitialState,giveControl,wrestler,roleFor,resolveMoveAttempt,skipPin,
  resolveGroundDefense,getAvailableActions,checkCombatFlow,validateCombatAction} from './match-engine.js';
import {ACTION_IDS} from './turn-controller.js';

function prepare(){
 const state=cloneInitialState();giveControl(state,'stone');
 const landed=resolveMoveAttempt(state,{moveId:'running-clothesline',attackRoll:20,damageRoll:7,target:'head'});
 assert(landed.success&&landed.pinEligible);
 assert(skipPin(state).ok);
 assert.equal(state.phase,'GROUND_DEFENSE');
 assert.equal(state.roles.stone,'H');assert.equal(state.roles.viper,'L');
 assert.equal(state.groundDefense.defenderId,'viper');
 const turn=getAvailableActions(state);
 assert.equal(turn.actorId,'viper');assert.equal(turn.controlId,'stone');
 assert.equal(turn.kind,'ground-defense');
 assert.equal(turn.actions.filter(x=>x.enabled).length,3);
 for(const id of [ACTION_IDS.GROUND_SCRAMBLE,ACTION_IDS.GROUND_COVER,ACTION_IDS.GROUND_PASS]){
  assert(validateCombatAction(state,id,'viper').ok,'Low owns grounded response');
  assert(!validateCombatAction(state,id,'stone').ok,'High cannot roll for Low');
 }
 assert(checkCombatFlow(state).ok);
 return state;
}
{
 const state=prepare();
 assert(!resolveGroundDefense(state,{choice:'scramble',roll:21}).ok,'Invalid d20 must not mutate');
 const before=wrestler(state,'viper').stamina;
 const outcome=resolveGroundDefense(state,{choice:'scramble',roll:1});
 assert(outcome.ok&&!outcome.success);
 assert.equal(before-wrestler(state,'viper').stamina,2);
 assert.equal(state.phase,'ACTION_SELECT');
 assert.equal(state.roles.stone,'H');
 assert.equal(wrestler(state,'viper').posture,'prone');
 assert.equal(state.groundDefense,null);
 assert(!resolveGroundDefense(state,{choice:'cover'}).ok);
}
{
 const state=prepare(),reply=resolveGroundDefense(state,{choice:'scramble',roll:20});
 assert(reply.ok&&reply.success);
 assert.equal(state.phase,'NEUTRAL_ROLL');assert.equal(state.roles.viper,'N');
 assert.equal(wrestler(state,'viper').posture,'kneeling');
 assert(!state.pinEligible);
}
{
 const state=prepare();
 const reply=resolveGroundDefense(state,{choice:'cover'});
 assert(reply.ok&&reply.guard===3);
 assert.equal(state.phase,'ACTION_SELECT');
 const v=wrestler(state,'viper');assert.equal(v.groundGuard,3);
 const old=v.stamina;
 const effect=resolveMoveAttempt(state,{moveId:'stomp',attackRoll:20,damageRoll:7,target:'core'});
 assert(effect.success);
 assert(effect.guardAbsorbed>0,'Cover must cushion a hit');
 assert.equal(old-v.stamina,effect.staminaDamage);
 assert(effect.listedStaminaDamage>effect.staminaDamage);
 assert(effect.listedStaminaDamage>effect.move.staminaCost);
 assert.equal(v.groundGuard,0,'Cover lasts one landed attack only');
}
{
 const state=prepare(),outcome=resolveGroundDefense(state,{choice:'pass'});
 assert(outcome.ok);assert.equal(state.phase,'ACTION_SELECT');assert.equal(state.groundDefense,null);
}
{
 const state=prepare();
 wrestler(state,'viper').stamina=0;
 const out=resolveGroundDefense(state,{choice:'scramble',roll:20});
 assert(out.ok&&out.success&&out.cost===0,'Low keeps last-chance d20 even exhausted');
}
console.log('Ground defense PASS: Low scramble, cover, pass, costs, postures and permission checks.');
