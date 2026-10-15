import assert from 'node:assert/strict';
import {cloneInitialState,giveControl,resolveMoveAttempt,startPin,resolvePinCount,
  skipPin,resolveGroundDefense,wrestler,checkCombatFlow} from './match-engine.js';

function pendingPin(){
 const s=cloneInitialState();giveControl(s,'stone');
 const move=resolveMoveAttempt(s,{moveId:'running-clothesline',attackRoll:20,damageRoll:1});
 assert(move.success&&s.pinEligible);
 const p=startPin(s);
 return {s,p};
}
function count(s,p,pinnedRoll,pinningRoll=10){
 return resolvePinCount(s,{pinningId:p.pinningId,count:1,pinnedRoll,pinningRoll});
}
{
 const {s,p}=pendingPin();
 const outcome=count(s,p,20,1);
 assert(outcome.kickout&&outcome.comeback&&outcome.margin>=7);
 assert.equal(s.phase,'ACTION_SELECT');
 assert.equal(s.activeWrestlerId,'viper');
 assert.equal(s.roles.viper,'H');
 assert.equal(s.roles.stone,'L');
 assert.equal(wrestler(s,'viper').posture,'standing');
 assert.equal(wrestler(s,'stone').posture,'prone');
 assert(checkCombatFlow(s).ok);
}
{
 const {s,p}=pendingPin();
 const outcome=count(s,p,11,10);
 assert(outcome.kickout&&!outcome.comeback,'Close kickout must not automatically reverse control');
 assert.equal(s.roles.stone,'N');
 assert.equal(s.roles.viper,'N');
 assert.equal(s.neutralAction,true);
 assert.equal(wrestler(s,'viper').posture,'prone');
}
{
 const {s,p}=pendingPin();
 wrestler(s,'viper').stamina=0;
 const outcome=count(s,p,20,1);
 assert(outcome.kickout&&!outcome.comeback,'Exhaustion blocks explosive recovery but never the defensive roll');
 assert.equal(s.roles.viper,'N');
 assert.equal(s.neutralAction,true);
}
{
 const {s,p}=pendingPin();
 const outcome=count(s,p,1,20);
 assert(!outcome.kickout&&!outcome.comeback,'No undeserved comeback on lost pin count');
 assert.equal(s.phase,'PIN');
}
function grounded(){
 const s=cloneInitialState();giveControl(s,'stone');
 assert(resolveMoveAttempt(s,{moveId:'running-clothesline',attackRoll:20,damageRoll:1}).success);
 assert(skipPin(s).ok);
 return s;
}
{
 const s=grounded();
 const o=resolveGroundDefense(s,{choice:'scramble',roll:20});
 assert(o.success&&o.comeback&&o.margin>=6);
 assert.equal(s.roles.viper,'H');assert.equal(s.activeWrestlerId,'viper');
 assert.equal(wrestler(s,'viper').posture,'standing');
 assert(checkCombatFlow(s).ok);
}
{
 const s=grounded();
 const o=resolveGroundDefense(s,{choice:'scramble',roll:12});
 assert(o.success&&!o.comeback);
 assert.equal(s.phase,'NEUTRAL_ROLL');
 assert.equal(s.roles.stone,'N');assert.equal(wrestler(s,'viper').posture,'kneeling');
}
{
 const s=grounded();
 const o=resolveGroundDefense(s,{choice:'scramble',roll:1});
 assert(!o.success&&!o.comeback);assert.equal(s.roles.stone,'H');
}
console.log('Earned defensive comebacks PASS: strong kickouts and scrambles reverse, narrow wins reset, exhausted defenders still roll');
