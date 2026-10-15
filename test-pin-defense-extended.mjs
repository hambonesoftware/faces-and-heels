import assert from 'node:assert/strict';
import {cloneInitialState,giveControl,wrestler,resolveMoveAttempt,startPin,resolvePinCount,
  skipPin,validateCombatAction,checkCombatFlow} from './match-engine.js';
import {ACTION_IDS} from './turn-controller.js';
const pin=()=>{
 const state=cloneInitialState();giveControl(state,'stone');
 assert(resolveMoveAttempt(state,{moveId:'running-clothesline',attackRoll:20,damageRoll:7}).success);
 return state;
};
for(const count of [1,2,3]){
 const state=pin(),p=startPin(state);
 assert(!validateCombatAction(state,ACTION_IDS.COUNT_PIN,'stone').ok);
 assert(validateCombatAction(state,ACTION_IDS.COUNT_PIN,'viper').ok);
 for(let n=1;n<count;n++){
   const live=resolvePinCount(state,{pinningId:p.pinningId,count:n,pinningRoll:20,pinnedRoll:1});
   assert(!live.kickout&&!live.pinfall);
   assert.equal(state.phase,'PIN');
 }
 const result=resolvePinCount(state,{pinningId:p.pinningId,count,pinningRoll:1,pinnedRoll:20});
 assert(result.kickout,'Defender kickout possible at all three counts');
 assert.equal(state.phase,'ACTION_SELECT');
 assert.equal(state.activeWrestlerId,'viper');
 assert.equal(state.roles.viper,'H');
 assert(result.comeback,'Excellent kickout should earn the next offensive turn');
 assert(checkCombatFlow(state).ok);
}
{
 const state=pin(),p=startPin(state);
 for(let i=1;i<=3;i++){
   const roll=resolvePinCount(state,{pinningId:p.pinningId,count:i,pinningRoll:20,pinnedRoll:1});
   assert.equal(roll.pinfall,i===3);
 }
 assert.equal(state.winnerId,'stone');
 assert.equal(state.winMethod,'pinfall');
 assert.equal(state.phase,'MATCH_COMPLETE');
 assert.equal(checkCombatFlow(state).ok,true);
 assert(!validateCombatAction(state,ACTION_IDS.COUNT_PIN,'viper').ok);
}
{
 const state=pin(),p=startPin(state);
 assert.throws(()=>resolvePinCount(state,{pinningId:p.pinningId,count:2,pinningRoll:20,pinnedRoll:1}),/order/);
 assert.throws(()=>resolvePinCount(state,{pinningId:p.pinningId,count:1,pinningRoll:21,pinnedRoll:1}),/Invalid/);
 assert.throws(()=>resolvePinCount(state,{pinningId:'viper',count:1,pinningRoll:1,pinnedRoll:1}),/Wrong/);
}
{
 const state=pin(),p=startPin(state);
 wrestler(state,'viper').stamina=0;
 assert(resolvePinCount(state,{pinningId:p.pinningId,count:1,pinningRoll:1,pinnedRoll:20}).kickout,
  'Exhausted Low still has a defensive roll');
}
console.log('Pin flow PASS: defender rolls on every count, invalid count rejected and zero-stamina kickout possible.');
