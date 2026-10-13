import assert from 'node:assert/strict';
import {demoMoves} from './moves.js';
import {
 cloneInitialState,opponentId,getAvailableActions,checkCombatFlow,
 resolveNeutralRoll,resolveMoveAttempt,resolveReaction,declineReaction,
 resolvePinCount,startPin,skipPin,maintainHold,releaseHold,escapeHold,
 transitionHold,resolveGroundDefense,scrambleUp,spendCrowdForStamina,
 catchBreathToNeutral
} from './match-engine.js';
import {chooseAiAction} from './solo-ai.js';

const seedRng=seed=>{let x=seed>>>0;return ()=>((x=Math.imul(x,1664525)+1013904223>>>0)/4294967296)};
const die=(rng,sides=20)=>1+Math.floor(rng()*sides);
const SPECTACULAR=new Set([
 'body-slam','vertical-suplex','spinebuster','dropkick','ddt','neckbreaker',
 'running-clothesline','flash-finisher','viper-bite'
]);

export function playClassicSample(seed){
 const rng=seedRng(seed*7127+19),state=cloneInitialState();
 const moves=[],events=[];let turns=0,pins=0,kickouts=0,holdOpens=0,holdPressures=0,
    switches=0,escapes=0,reactions=0,changeCount=0,lastHigh=null;
 while(!state.winnerId && turns++<650){
  const actor=getAvailableActions(state).actorId;
  // CPU-vs-CPU exercises the exact Solo AI used by the actual game; for each
  // decision the opposing corner is designated the hypothetical human.
  const setup={mode:'solo',playerId:actor?opponentId(actor):'stone',
    difficulty:'standard',tutorial:false};
  const intent=chooseAiAction(state,{setup,rng});
  assert(intent,`Seed ${seed} step ${turns}: no AI choice in ${state.phase}`);
  switch(intent.type){
   case 'neutral':resolveNeutralRoll(state,die(rng),die(rng));break;
   case 'move':{
    const move=demoMoves.find(x=>x.id===intent.moveId);
    assert(move,'Unrecognized move');
    const result=resolveMoveAttempt(state,{moveId:move.id,target:intent.target,
      attackRoll:die(rng),damageRoll:die(rng,move.damageDie),crowdSpend:intent.crowdSpend,
      crowdRolls:intent.crowdSpend?[die(rng,6)]:[]});
    moves.push({actor:result.attackerId,id:move.id,success:result.success,
      target:result.target,category:move.category,legendary:!!move.legendary});
    if(move.sustained)holdOpens++;
    break;
   }
   case 'reaction':{
    const move=demoMoves.find(x=>x.id===intent.moveId);
    resolveReaction(state,{reactionMoveId:move.id,reactionRoll:die(rng),
      damageRoll:die(rng,move.damageDie)});reactions++;break;
   }
   case 'pass-reaction':declineReaction(state);break;
   case 'pin':startPin(state);pins++;break;
   case 'skip-pin':skipPin(state);break;
   case 'pin-defense':{
    const z=resolvePinCount(state,{pinningId:state.pinningWrestlerId,
      count:state.pinCount+1,pinningRoll:die(rng),pinnedRoll:die(rng)});
    if(z.kickout)kickouts++;break;
   }
   case 'escape-hold':{
    const z=escapeHold(state,{escapeRoll:die(rng)});
    if(z.success)escapes++;break;
   }
   case 'tighten-hold':maintainHold(state);holdPressures++;break;
   case 'release-hold':releaseHold(state);break;
   case 'switch-hold':transitionHold(state,{moveId:intent.moveId});switches++;break;
   case 'scramble-ground':resolveGroundDefense(state,{choice:'scramble',roll:die(rng)});break;
   case 'cover-ground':resolveGroundDefense(state,{choice:'cover'});break;
   case 'stand':scrambleUp(state,state.activeWrestlerId);break;
   case 'recover':spendCrowdForStamina(state,state.activeWrestlerId,1);break;
   case 'breath':catchBreathToNeutral(state,state.activeWrestlerId);break;
   default:throw Error('Unrecognized Solo AI action '+intent.type);
  }
  const high=Object.entries(state.roles).find(([,v])=>v==='H')?.[0]||null;
  if(lastHigh && high && lastHigh!==high)changeCount++;
  if(high)lastHigh=high;
  const audit=checkCombatFlow(state);
  assert(audit.ok,`Seed ${seed} at ${turns}: ${audit.issues.join('; ')}`);
 }
 assert(state.winnerId,`Seed ${seed} stuck after ${turns} decisions`);
 let repeats=0;const last={};
 for(const move of moves){
  if(last[move.actor]===move.id)repeats++;
  last[move.actor]=move.id;
 }
 return {
  seed,winner:state.winnerId,method:state.winMethod,steps:turns,
  moves,pins,kickouts,holdOpens,holdPressures,escapes,reactions,
  switches,controlChanges:changeCount,repeats
 };
}

const bouts=Array.from({length:100},(_,i)=>playClassicSample(i+1));
const total=bouts.reduce((sum,b)=>sum+b.moves.length,0);
const sum=key=>bouts.reduce((n,b)=>n+b[key],0);
const avg=key=>sum(key)/bouts.length;
const wins={stone:bouts.filter(x=>x.winner==='stone').length,
 viper:bouts.filter(x=>x.winner==='viper').length};
const methods={pinfall:bouts.filter(x=>x.method==='pinfall').length,
 submission:bouts.filter(x=>x.method==='submission').length};
const firstThree=bouts.flatMap(b=>b.moves.slice(0,3));
const bigOpening=firstThree.filter(m=>SPECTACULAR.has(m.id)).length;
const finishers=bouts.flatMap(b=>b.moves.filter(m=>m.legendary));
const finishersEarly=bouts.flatMap(b=>b.moves.slice(0,6).filter(m=>m.legendary));
const moveTally={};for(const b of bouts)for(const move of b.moves)moveTally[move.id]=(moveTally[move.id]||0)+1;
const openers={};for(const b of bouts){
 const name=b.moves[0]?.id||'none';openers[name]=(openers[name]||0)+1;
}
const missing=new Set(demoMoves.filter(m=>m.category!=='setup').map(m=>m.id));
for(const move of Object.keys(moveTally))missing.delete(move);
assert.equal(wins.stone+wins.viper,100);
assert(wins.stone>10&&wins.viper>10,'Play styles must be viable');
assert(total>=1000,'Matches lack meaningful offense');
assert(bigOpening/firstThree.length<=.15,'Too many heavy moves in opening exchanges');
assert(finishersEarly.length<=3,'Legendaries frequently occur during opening sequence');
assert(finishers.length>=25,'Finisher payoffs are nearly absent');
assert(avg('pins')>=1&&avg('pins')<=6,'Unconvincing pin pacing');
assert(methods.submission>=3,'Sustained holds never finish a match');
assert(sum('repeats')/total<.085,'Attack repetition remains too high');
assert(sum('controlChanges')>0,'No control reversals');
assert(missing.size<8,'Too much of the move roster is never used');

console.log('CLASSIC MATCH AUDIT: 100 completed real-engine CPU-vs-CPU matches');
console.log('Winners: Stone '+wins.stone+', Viper '+wins.viper+'; finishes: '+JSON.stringify(methods));
console.log('Mean decisions: '+avg('steps').toFixed(2)+'; mean attack attempts: '+(total/100).toFixed(2));
console.log('Mean pins: '+avg('pins').toFixed(2)+'; kickouts: '+avg('kickouts').toFixed(2)+
 '; holds: '+avg('holdOpens').toFixed(2)+'; escapes: '+avg('escapes').toFixed(2));
console.log('Early heavy/high-spot attempts: '+bigOpening+'/'+firstThree.length+
 ' ('+(100*bigOpening/firstThree.length).toFixed(1)+'%)');
console.log('Legendary attempts: '+finishers.length+'; first six slots: '+finishersEarly.length);
console.log('Same-move repeats by wrestler: '+sum('repeats')+' / '+total);
console.log('Opening move distribution: '+JSON.stringify(openers));
console.log('Move frequency: '+JSON.stringify(Object.entries(moveTally).sort((a,b)=>b[1]-a[1])));
for(const b of bouts.filter((_,i)=>[0,14,35,67,90].includes(i))){
 console.log('TAPE #'+b.seed+' ('+b.winner+', '+b.method+', '+b.steps+' turns): '+
  b.moves.slice(0,22).map(m=>m.actor[0]+':'+(m.success?'':'MISS-')+m.id).join(' → '));
}
