import assert from 'node:assert/strict';
import {DEFAULT_MATCH_SETUP,sanitizeMatchSetup,readMatchSetup,saveMatchSetup,
 aiWrestlerId,isAiDecision,chooseAiAction} from './solo-ai.js';
import {cloneInitialState,getAvailableActions,checkCombatFlow,opponentId,wrestler,resolveNeutralRoll,
 getLegalMoves,resolveMoveAttempt,getAvailableReactions,resolveReaction,declineReaction,
 resolvePinCount,startPin,skipPin,maintainHold,releaseHold,escapeHold,
 transitionHold,resolveGroundDefense,scrambleUp,spendCrowdForStamina,catchBreathToNeutral} from './match-engine.js';
import {demoMoves} from './moves.js';
import {readFileSync} from 'node:fs';

function seeded(seed){let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);}
function die(rng,n=20){return 1+Math.floor(rng()*n);}
assert.deepEqual(sanitizeMatchSetup({}),DEFAULT_MATCH_SETUP);
assert.deepEqual(sanitizeMatchSetup({mode:'bad',difficulty:'cheat',playerId:'stranger',tutorial:1}),DEFAULT_MATCH_SETUP);
const map=new Map(),storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};
assert.equal(readMatchSetup(storage).playerId,'stone');
const chosen=saveMatchSetup(storage,{mode:'local',playerId:'viper',difficulty:'veteran',tutorial:false});
assert.deepEqual(readMatchSetup(storage),chosen);
assert.equal(aiWrestlerId(chosen),null);
assert.equal(aiWrestlerId({mode:'solo',playerId:'viper'}),'stone');
assert.equal(isAiDecision(cloneInitialState(),{mode:'local',playerId:'stone'}),false);
assert.equal(isAiDecision(cloneInitialState(),{mode:'solo',playerId:'stone'}),true);
const app=readFileSync('app.js','utf8');
for(const phrase of ['data-match-mode="solo"','data-match-mode="local"','data-player-id','data-difficulty',
   'queueAiTurn()','performAiTurn()','data-toggle-coaching','renderAiThinking','renderCoachHint',
   'data-dismiss-guide','if(aiEnabled()&&(aiBusy||isAiDecision(state,matchSetup))']){
 assert(app.includes(phrase),'Missing product integration: '+phrase);
}
const html=readFileSync('index.html','utf8');
assert(html.includes('app.js?v='),'Versioned game entry point missing');
let coverage=new Set();
function simulate(seed,playerId,difficulty){
 const rng=seeded(seed);
 const state=cloneInitialState();
 let steps=0;
 while(!state.winnerId&&steps++<650){
   const turn=getAvailableActions(state),actor=turn.actorId;
   const setup={mode:'solo',playerId:actor?opponentId(actor):playerId,difficulty,tutorial:false};
   const intent=chooseAiAction(state,{setup,rng});
   assert(intent,'CPU must always find legal intent at step '+steps+' phase '+state.phase);
   coverage.add(intent.type);
   switch(intent.type){
    case 'neutral':resolveNeutralRoll(state,die(rng),die(rng));break;
    case 'move':{
      const legal=getLegalMoves(state),move=legal.find(m=>m.id===intent.moveId);
      assert(move,'CPU move must be legal in current state');
      assert(move.category==='setup'||wrestler(state,state.activeWrestlerId).commonMoves.includes(move.id)
             ||wrestler(state,state.activeWrestlerId).legendaryMoves.includes(move.id),'CPU cannot use unlearned move');
      resolveMoveAttempt(state,{moveId:move.id,target:intent.target,
        attackRoll:move.automatic?20:die(rng),damageRoll:move.automatic?0:die(rng,move.damageDie||4),
        crowdSpend:intent.crowdSpend});
      break;
    }
    case 'reaction':{
      assert(getAvailableReactions(state).some(m=>m.id===intent.moveId));
      const move=demoMoves.find(m=>m.id===intent.moveId);
      resolveReaction(state,{reactionMoveId:intent.moveId,reactionRoll:die(rng),damageRoll:die(rng,move.damageDie||4)});break;
    }
    case 'pass-reaction':assert(declineReaction(state).ok);break;
    case 'pin':startPin(state);break;
    case 'skip-pin':assert(skipPin(state).ok);break;
    case 'pin-defense':{
      resolvePinCount(state,{pinningId:state.pinningWrestlerId,count:state.pinCount+1,pinningRoll:die(rng),pinnedRoll:die(rng)});
      break;
    }
    case 'escape-hold':assert(escapeHold(state,{escapeRoll:die(rng)}).ok);break;
    case 'tighten-hold':assert(maintainHold(state).ok);break;
    case 'release-hold':assert(releaseHold(state).ok);break;
    case 'switch-hold':assert(transitionHold(state,{moveId:intent.moveId}).ok);break;
    case 'scramble-ground':assert(resolveGroundDefense(state,{choice:'scramble',roll:die(rng)}).ok);break;
    case 'cover-ground':assert(resolveGroundDefense(state,{choice:'cover'}).ok);break;
    case 'stand':assert(scrambleUp(state,state.activeWrestlerId).ok);break;
    case 'recover':assert(spendCrowdForStamina(state,state.activeWrestlerId,1).ok);break;
    case 'breath':assert(catchBreathToNeutral(state,state.activeWrestlerId).ok);break;
    default:throw Error('Unsupported CPU phase decision '+intent.type);
   }
   const audit=checkCombatFlow(state);
   assert(audit.ok,`CPU seed ${seed} step ${steps} ${intent.type}: ${audit.issues.join('; ')}`);
 }
 assert(state.winnerId,`CPU match ${seed} stalled at ${steps}, phase ${state.phase}`);
 return {winner:state.winnerId,steps};
}
const outcomes=[];
for(const difficulty of ['rookie','standard','veteran']){
 for(const playerId of ['stone','viper']){
   for(let seed=1;seed<=30;seed++){
     outcomes.push(simulate(seed*7919+playerId.length*13+(difficulty.length*37),playerId,difficulty));
   }
 }
}
for(const action of ['neutral','move','pin','pin-defense','escape-hold','reaction']){
 assert(coverage.has(action),'Full simulation should exercise '+action);
}
assert(outcomes.every(o=>o.steps<650));
const wins=Object.fromEntries(['stone','viper'].map(id=>[id,outcomes.filter(o=>o.winner===id).length]));
assert(wins.stone>0&&wins.viper>0,'Solo policy must not guarantee one wrestler always wins');
console.log(`Solo vs CPU PASS: ${outcomes.length} complete matches, Stone ${wins.stone} / Viper ${wins.viper}, ${coverage.size} distinct AI action types, valid turn and loadouts.`);
