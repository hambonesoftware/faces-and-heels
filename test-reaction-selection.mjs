import assert from 'node:assert/strict';
import {cloneInitialState,giveControl,wrestler,resolveMoveAttempt,getAvailableReactions,
  canReact,resolveReaction,declineReaction,validateCombatAction,checkCombatFlow} from './match-engine.js';
import {ACTION_IDS} from './turn-controller.js';
import {animationByMove} from './combat-animation-map.js';
function pending(id='stone'){
 const state=cloneInitialState();giveControl(state,id);
 const miss=resolveMoveAttempt(state,{moveId:'forearm-smash',attackRoll:1,damageRoll:1,target:'head'});
 assert(!miss.success);
 assert.equal(state.phase,'REACTION');
 return state;
}
{
 const state=pending('stone'),choices=getAvailableReactions(state);
 assert(choices.length>=2);
 assert(choices.some(x=>x.id==='dropkick'),'Viper knows dropkick');
 assert(choices.some(x=>x.id==='hip-toss'),'Viper knows hip toss');
 assert(!choices.some(x=>x.id==='knee-lift'),'Viper cannot react with Stone-only knee');
 assert(!choices.some(x=>x.legendary),'Finishers cannot be interrupts');
 for(const move of choices)assert(animationByMove[move.id]?.choreography,'Reaction must have its own paired animation');
 assert(!validateCombatAction(state,ACTION_IDS.REACT,'stone').ok);
 const result=resolveReaction(state,{reactionMoveId:'dropkick',reactionRoll:20,damageRoll:7});
 assert(result.success&&result.move.id==='dropkick');
 assert(result.staminaDamage>result.move.staminaCost);
 assert.equal(wrestler(state,'stone').posture,'prone');
 assert.equal(state.phase,'PIN_OPPORTUNITY');
 assert.equal(state.pinningWrestlerId,'viper');
 assert.throws(()=>resolveReaction(state,{reactionMoveId:'dropkick',reactionRoll:20}),/No reaction is pending/);
}
{
 const state=pending('viper'),options=getAvailableReactions(state);
 assert(options.some(x=>x.id==='knee-lift'),'Stone knows knee lift');
 assert(!options.some(x=>x.id==='dropkick'),'Stone does not know dropkick');
 assert.throws(()=>resolveReaction(state,{reactionMoveId:'dropkick',reactionRoll:20}),/Unlearned or illegal counter/);
 assert.equal(state.phase,'REACTION','Rejected direct move cannot alter state');
 const response=resolveReaction(state,{reactionMoveId:'forearm-smash',reactionRoll:20,damageRoll:7});
 assert(response.success);
 assert.equal(state.activeWrestlerId,'stone');
 assert.equal(state.roles.stone,'H');
 assert.equal(state.phase,'ACTION_SELECT');
}
{
 const state=pending();
 const failed=resolveReaction(state,{reactionMoveId:'forearm-smash',reactionRoll:1,damageRoll:1});
 assert(!failed.success);
 assert.equal(state.phase,'ACTION_SELECT');
 assert.equal(state.roles.stone,'H');
}
{
 const state=pending();
 assert(declineReaction(state).ok);
 assert.equal(state.phase,'ACTION_SELECT');
 assert(!canReact(state));
 assert(!declineReaction(state).ok);
}
{
 const state=cloneInitialState();giveControl(state,'stone');
 wrestler(state,'viper').stamina=0;
 const miss=resolveMoveAttempt(state,{moveId:'forearm-smash',attackRoll:1,damageRoll:1});
 assert(!miss.success);
 assert(!canReact(state));
 assert.equal(state.phase,'ACTION_SELECT');
 assert(checkCombatFlow(state).ok);
}
console.log('Learned reactions PASS: Stone/Viper counters, animations, direct-call security, pin-on-counter and failed/pass windows.');
