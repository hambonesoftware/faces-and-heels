import assert from 'node:assert/strict';
import {cloneInitialState,giveControl,wrestler,resolveMoveAttempt,startPin,resolvePinCount} from './match-engine.js';

function readyPin() {
  const state=cloneInitialState();
  giveControl(state,'stone');
  assert(resolveMoveAttempt(state,{moveId:'running-clothesline',attackRoll:20,damageRoll:7}).success);
  startPin(state);
  return state;
}
{
  const state=readyPin();
  wrestler(state,'stone').crowdResource=2;
  wrestler(state,'viper').crowdResource=2;
  const result=resolvePinCount(state,{
    pinningId:'stone',count:1,pinningRoll:8,pinnedRoll:7,
    pinningCrowdRolls:[2],pinnedCrowdRolls:[6]
  });
  assert.equal(result.pinningBonus,2);
  assert.equal(result.pinnedBonus,6);
  assert.equal(result.pinningTotal,10-(wrestler(state,'stone').bodyDamage.core||0));
  assert.equal(result.pinnedTotal,13-Object.values(wrestler(state,'viper').bodyDamage).reduce((sum,n)=>sum+Number(n||0),0));
  assert.equal(result.kickout,true);
  assert.equal(wrestler(state,'stone').crowdResource,1);
  assert.equal(wrestler(state,'viper').crowdResource,1);
}
{
  const state=readyPin();
  wrestler(state,'viper').crowdResource=0;
  assert.throws(()=>resolvePinCount(state,{pinningId:'stone',count:1,pinningRoll:8,pinnedRoll:7,pinnedCrowdRolls:[6]}),/Invalid Heat\/Pop/);
  assert.equal(state.pinCount,0);
}
{
  const state=cloneInitialState();
  giveControl(state,'stone');
  wrestler(state,'stone').crowdResource=1;
  const result=resolveMoveAttempt(state,{moveId:'running-clothesline',attackRoll:1,damageRoll:1,crowdSpend:1,crowdRolls:[6]});
  assert.equal(result.spentCrowd,1);
  assert.equal(result.crowdBonus,6);
  assert.equal(result.total,result.attackRoll+result.modifier+6);
  assert.equal(wrestler(state,'stone').crowdResource,0);
}
console.log('Heat/Pop d6 pin and attack rules PASS');
