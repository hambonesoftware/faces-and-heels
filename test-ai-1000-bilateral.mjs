/**
 * Complete CPU-vs-CPU bilateral dice audit, using the same chooseAiAction
 * decision policy as the live solo game. This is intentionally separate from
 * the deliberately aggressive random combat stress test.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chooseAiAction} from './solo-ai.js';
import {demoMoves} from './moves.js';
import {
 cloneInitialState,opponentId,getLegalMoves,checkCombatFlow,
 resolveNeutralRoll,resolveMoveAttempt,resolveReaction,declineReaction,
 startPin,skipPin,resolvePinCount,escapeHold,maintainHold,
 releaseHold,transitionHold,resolveGroundDefense,scrambleUp,
 spendCrowdForStamina,catchBreathToNeutral
} from './match-engine.js';

const ids=['stone','viper'];
function rngFactory(seed){
 let x=seed>>>0;
 return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);
}
function die(rng,sides=20){return 1+Math.floor(rng()*sides);}
const counts=()=>({
 attack:0,setup:0,moveSuccess:0,moveFailure:0,
 reaction:0,reactionSuccess:0,holdEscape:0,holdEscapeSuccess:0,
 groundDefense:0,pinAttack:0,pinDefense:0,neutral:0
});
function play(seed){
 const rng=rngFactory(seed),state=cloneInitialState();
 const dice={stone:counts(),viper:counts()};
 let steps=0,controlSwings=0,lastController=null,finished=false;
 for(;steps<650&&!state.winnerId;steps++){
   const phase=state.phase;
   const report=checkCombatFlow(state);
   assert(report.ok,`Seed ${seed}, step ${steps} failed flow validation (${phase}): ${report.issues.join('; ')}`);
   const actor=phase==='ACTION_SELECT'?state.activeWrestlerId:
     phase==='REACTION'?state.pendingFailure?.defenderId:
     phase==='PIN_OPPORTUNITY'?state.pinningWrestlerId:
     phase==='PIN'?opponentId(state.pinningWrestlerId):
     phase==='HOLD_ESCAPE'?state.activeHold?.defenderId:
     phase==='HOLD'?state.activeHold?.holderId:
     phase==='GROUND_DEFENSE'?state.groundDefense?.defenderId:null;
   const setup={mode:'solo',playerId:actor?opponentId(actor):'stone',difficulty:'standard',tutorial:false};
   const action=chooseAiAction(state,{setup,rng});
   assert(action,`Seed ${seed}, step ${steps}, phase ${phase}: missing CPU decision`);
   switch(action.type){
     case 'neutral':{
       for(const id of ids)dice[id].neutral++;
       resolveNeutralRoll(state,die(rng),die(rng));break;
     }
     case 'move':{
       const move=getLegalMoves(state).find(x=>x.id===action.moveId);
       assert(move,`Invalid AI move ${action.moveId} in ${phase}`);
       if(move.automatic)dice[actor].setup++;else dice[actor].attack++;
       const outcome=resolveMoveAttempt(state,{
         moveId:move.id,target:action.target,attackRoll:move.automatic?20:die(rng),
         damageRoll:move.automatic?0:die(rng,move.damageDie||4),
         crowdSpend:action.crowdSpend,
         crowdRolls:action.crowdSpend?[die(rng,6)]:[]
       });
       if(!move.automatic)dice[actor][outcome.success?'moveSuccess':'moveFailure']++;
       break;
     }
     case 'reaction':{
       dice[actor].reaction++;
       const m=demoMoves.find(x=>x.id===action.moveId);
       assert(m,`Unknown counter ${action.moveId}`);
       const outcome=resolveReaction(state,{
         reactionMoveId:m.id,reactionRoll:die(rng),damageRoll:die(rng,m.damageDie)
       });
       if(outcome.success)dice[actor].reactionSuccess++;
       break;
     }
     case 'pass-reaction':assert(declineReaction(state).ok);break;
     case 'pin':startPin(state);break;
     case 'skip-pin':assert(skipPin(state).ok);break;
     case 'pin-defense':{
       const p=state.pinningWrestlerId,defender=opponentId(p);
       dice[p].pinAttack++;dice[defender].pinDefense++;
       resolvePinCount(state,{
         pinningId:p,count:state.pinCount+1,pinningRoll:die(rng),pinnedRoll:die(rng)
       });
       break;
     }
     case 'escape-hold':{
       dice[actor].holdEscape++;
       const o=escapeHold(state,{escapeRoll:die(rng)});
       assert(o.ok);
       if(o.success)dice[actor].holdEscapeSuccess++;
       break;
     }
     case 'tighten-hold':assert(maintainHold(state).ok);break;
     case 'switch-hold':assert(transitionHold(state,{moveId:action.moveId}).ok);break;
     case 'release-hold':assert(releaseHold(state).ok);break;
     case 'scramble-ground':{
       dice[actor].groundDefense++;
       assert(resolveGroundDefense(state,{choice:'scramble',roll:die(rng)}).ok);break;
     }
     case 'cover-ground':assert(resolveGroundDefense(state,{choice:'cover'}).ok);break;
     case 'stand':assert(scrambleUp(state,actor).ok);break;
     case 'recover':assert(spendCrowdForStamina(state,actor,1).ok);break;
     case 'breath':assert(catchBreathToNeutral(state,actor).recovered>0);break;
     default:throw Error('Unimplemented AI action '+action.type);
   }
   const controller=Object.keys(state.roles).find(id=>state.roles[id]==='H');
   if(lastController&&controller&&lastController!==controller)controlSwings++;
   if(controller)lastController=controller;
 }
 assert(state.winnerId,`AI match ${seed} not complete after ${steps} steps`);
 assert(state.phase==='MATCH_COMPLETE');
 const offensive=id=>dice[id].attack+dice[id].pinAttack;
 const defensive=id=>dice[id].reaction+dice[id].holdEscape+dice[id].groundDefense+dice[id].pinDefense;
 return {seed,winner:state.winnerId,method:state.winMethod,steps,controlSwings,dice,
   bothOffense:ids.every(id=>offensive(id)>0),
   bothDefense:ids.every(id=>defensive(id)>0),
   fullTwoWay:ids.every(id=>offensive(id)>0&&defensive(id)>0),
   noLoserOffense:offensive(opponentId(state.winnerId))===0,
   neutralEach:ids.every(id=>dice[id].neutral>0)};
}
assert.deepEqual(play(17),play(17),'CPU replay must be deterministic');
const MATCHES=Number(process.env.FH_AI_BILATERAL_MATCHES||1000);
assert(Number.isInteger(MATCHES)&&MATCHES>0);
const bouts=Array.from({length:MATCHES},(_,i)=>play(0xA1B00000+i+1));
const total=(predicate)=>bouts.filter(predicate).length;
const wins=Object.fromEntries(ids.map(id=>[id,total(b=>b.winner===id)]));
const methods=[...new Set(bouts.map(b=>b.method))];
const stats=Object.fromEntries(ids.map(id=>[id,Object.fromEntries(Object.keys(counts()).map(type=>[type,bouts.reduce((sum,b)=>sum+b.dice[id][type],0)]))]));
const coverage=Object.fromEntries(ids.map(id=>[id,{
  matchesWithAttack:total(b=>b.dice[id].attack+b.dice[id].pinAttack>0),
  matchesWithActiveDefense:total(b=>b.dice[id].reaction+b.dice[id].holdEscape+b.dice[id].pinDefense+b.dice[id].groundDefense>0)
}]));
const flow={
  matches:MATCHES,completed:bouts.length,wins,
  averageSteps:Number((bouts.reduce((n,b)=>n+b.steps,0)/MATCHES).toFixed(2)),
  maxSteps:Math.max(...bouts.map(b=>b.steps)),
  averageControlSwings:Number((bouts.reduce((n,b)=>n+b.controlSwings,0)/MATCHES).toFixed(2)),
  bothOffense:total(b=>b.bothOffense),
  bothActiveDefense:total(b=>b.bothDefense),
  bothOffenseAndDefense:total(b=>b.fullTwoWay),
  oneSidedWithoutLoserOffense:total(b=>b.noLoserOffense),
  bothNeutral:total(b=>b.neutralEach),
  pinfall:total(b=>b.method==='pinfall'),
  submission:total(b=>b.method==='submission'),
  stats,coverage
};
// Wrestling can include occasional one-sided/squash bouts, but a healthy
// match pool should provide meaningful d20 offense AND active defense to
// both competitors in at least 90% of CPU-vs-CPU matches.
assert(flow.bothOffense>=MATCHES*.90,'Too many matches deny one wrestler offense');
assert(flow.bothActiveDefense>=MATCHES*.90,'Too many matches deny one wrestler defensive dice');
assert(flow.bothOffenseAndDefense>=MATCHES*.90,'Two-way offense/defense coverage below 90%');
assert(flow.oneSidedWithoutLoserOffense<=MATCHES*.10,'Too many one-sided bouts');
assert(flow.averageControlSwings>=3,'Insufficient back-and-forth changes of control');
assert.equal(wins.stone+wins.viper,MATCHES);
assert(wins.stone>0&&wins.viper>0);
assert.equal(stats.stone.pinAttack+stats.viper.pinAttack,
             stats.stone.pinDefense+stats.viper.pinDefense);
for(const id of ids){
 for(const key of ['attack','reaction','pinAttack','pinDefense','holdEscape','groundDefense','neutral'])
   assert(stats[id][key]>0,`${id} lacks ${key} across all AI matches`);
}
mkdirSync('audit-output',{recursive:true});
writeFileSync('audit-output/ai-bilateral-1000.json',JSON.stringify({
  title:'Real CPU-vs-CPU seeded 1000-match bilateral offense/defense audit',
  scenario:'Both Stone and Viper controlled by chooseAiAction; source-rules normal attacks target static CON',
  seedStart:0xA1B00001,
  report:flow,
  oneSidedExamples:bouts.filter(b=>b.noLoserOffense).slice(0,20).map(
    b=>({seed:b.seed,winner:b.winner,method:b.method,steps:b.steps,dice:b.dice})
  ),
  boutSummaries:bouts.map(b=>({
    seed:b.seed,winner:b.winner,method:b.method,steps:b.steps,
    controlSwings:b.controlSwings,bothOffense:b.bothOffense,
    bothDefense:b.bothDefense,fullTwoWay:b.fullTwoWay,
    noLoserOffense:b.noLoserOffense
  }))
},null,2)+'\n');
console.log('1,000-MATCH LIVE-CPU DECISION POLICY / BILATERAL DICE REPORT:');
console.log(JSON.stringify(flow,null,2));
