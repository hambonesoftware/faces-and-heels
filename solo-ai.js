/**
 * Deterministic decision policy for a solo opponent.
 * No privileged move access, rigged dice, hidden information or timers.
 * The caller performs the selected action with the regular match-engine API.
 */
import {getLegalMoves,getAvailableActions,getAvailableReactions,availableHoldTransitions,
  wrestler,opponentId,statModifier,conditioning} from './match-engine.js';
import {resolveTargetDecision} from './flow-engine.js';

export const AI_DIFFICULTIES=Object.freeze(['rookie','standard','veteran']);
export const AI_PLAYER_IDS=Object.freeze(['stone','viper']);
export const DEFAULT_MATCH_SETUP=Object.freeze({mode:'solo',playerId:'stone',difficulty:'standard',tutorial:true});
export function sanitizeMatchSetup(raw){
 const s=raw&&typeof raw==='object'?raw:{};
 return {
  mode:s.mode==='local'?'local':'solo',
  playerId:AI_PLAYER_IDS.includes(s.playerId)?s.playerId:'stone',
  difficulty:AI_DIFFICULTIES.includes(s.difficulty)?s.difficulty:'standard',
  tutorial:s.tutorial!==false
 };
}
export function readMatchSetup(storage){
 try{return sanitizeMatchSetup(JSON.parse(storage.getItem('fh-match-setup-v1')))}
 catch{return sanitizeMatchSetup(null)}
}
export function saveMatchSetup(storage,setup){
 const safe=sanitizeMatchSetup(setup);
 try{storage.setItem('fh-match-setup-v1',JSON.stringify(safe))}catch{}
 return safe;
}
export function aiWrestlerId(setup){return setup?.mode==='solo'?opponentId(setup.playerId):null;}
export function isAiDecision(state,setup){
 if(!state||state.winnerId||setup?.mode!=='solo')return false;
 if(state.phase==='NEUTRAL_ROLL')return true;
 const actor=getAvailableActions(state).actorId;
 return Boolean(actor&&actor===aiWrestlerId(setup));
}
function chooseWeighted(scored,rng,difficulty){
 if(scored.length===0)return null;
 const ordered=scored.slice().sort((a,b)=>b.score-a.score);
 if(difficulty==='veteran')return ordered[0].value;
 const pool=difficulty==='rookie'?ordered.slice(0,Math.min(5,ordered.length)):ordered.slice(0,Math.min(3,ordered.length));
 const floor=pool.at(-1).score;
 const weights=pool.map(item=>Math.max(.15,item.score-floor+(difficulty==='rookie'?2.5:1)));
 const total=weights.reduce((a,b)=>a+b,0);
 let needle=Math.max(0,Math.min(.999999,Number(rng())||0))*total;
 for(let i=0;i<pool.length;i++){needle-=weights[i];if(needle<0)return pool[i].value;}
 return pool.at(-1).value;
}
function moveRating(move,attacker,defender){
 const hitChance=move.automatic?1:Math.max(.05,Math.min(.95,
   (21+statModifier(attacker.stats[move.stat])-conditioning(defender))/20));
 const effectiveDamage=Math.min(move.staminaDamage,defender.stamina);
 const control=move.sustained?5:0;
 const pin=move.result?.defenderPosture==='prone'?4:0;
 const signature=move.legendary?6:0;
 const pace=attacker.stamina<=move.staminaCost+3?3:0;
 const setup=move.category==='setup'?(defender.posture!=='standing'&&defender.stamina<=0?9:2):0;
 return hitChance*(effectiveDamage*.95+pin+signature+control+setup)
   -move.staminaCost*.52-pace
   +(move.automatic?2:0)
   +(move.crowdGain||0)*.6;
}
function chooseTarget(state,move,rng){
 const actor=state.activeWrestlerId;
 const view={...state,attacker:wrestler(state,actor),defender:wrestler(state,opponentId(actor))};
 const target=resolveTargetDecision(move,view);
 if(!target.values?.length)return null;
 const priority=['head','core','leftArm','rightArm','leftLeg','rightLeg'];
 return target.values.slice().sort((a,b)=>{
  const d=view.defender;
  return (d.bodyDamage?.[b]||0)-(d.bodyDamage?.[a]||0)||priority.indexOf(a)-priority.indexOf(b);
 })[0];
}
/** Returns a single intention. The UI invokes its existing animation and roll
 * handlers; the engine validates permissions a second time.
 */
export function chooseAiAction(state,{setup=DEFAULT_MATCH_SETUP,rng=Math.random}={}){
 if(!isAiDecision(state,setup))return null;
 const aiId=aiWrestlerId(setup),ai=wrestler(state,aiId),opponent=wrestler(state,opponentId(aiId));
 const difficulty=setup.difficulty||'standard';
 switch(state.phase){
 case 'NEUTRAL_ROLL':return {type:'neutral'};
 case 'PIN':return {type:'pin-defense'};
 case 'PIN_OPPORTUNITY':
   return {type:opponent.stamina===0||opponent.stamina<=12||difficulty==='veteran'?'pin':(rng()<.72?'pin':'skip-pin')};
 case 'HOLD_ESCAPE':return {type:'escape-hold'};
 case 'GROUND_DEFENSE':
   return {type:ai.stamina<=1?'scramble-ground':(rng()<.77?'scramble-ground':'cover-ground')};
 case 'REACTION':{
   const moves=getAvailableReactions(state);
   if(!moves.length)return {type:'pass-reaction'};
   if(difficulty==='rookie'&&rng()<.30)return {type:'pass-reaction'};
   const selected=chooseWeighted(moves.map(move=>({value:move,score:moveRating(move,ai,opponent)})),rng,difficulty);
   return selected?{type:'reaction',moveId:selected.id}:{type:'pass-reaction'};
 }
 case 'HOLD':{
   const hold=state.activeHold;
   const current=hold?state.wrestlers[hold.defenderId]:null;
   const options=availableHoldTransitions(state);
   const tickCost=hold?({armbar:2,'ankle-lock':2,'ground-headlock':2}[hold.moveId]||2):2;
   if(ai.stamina<tickCost)return {type:'release-hold'};
   if(options.length&&ai.stamina>9&&current?.stamina>8&&rng()<(difficulty==='veteran'?.28:.15))
     return {type:'switch-hold',moveId:options[0].id};
   if(current?.stamina<8||rng()>.18)return {type:'tighten-hold'};
   return {type:'release-hold'};
 }
 case 'ACTION_SELECT':{
   const legal=getLegalMoves(state);
   const actions=getAvailableActions(state).actions.filter(x=>x.enabled);
   if(ai.posture==='prone' && actions.some(x=>x.id==='scramble-up'))return {type:'stand'};
   if(actions.some(x=>x.id==='crowd-recover')&&ai.stamina<=Math.min(12,ai.maxStamina*.22))
     return {type:'recover'};
   if(!legal.length){
     if(actions.some(x=>x.id==='crowd-recover'))return {type:'recover'};
     if(actions.some(x=>x.id==='scramble-up'))return {type:'stand'};
     return {type:'breath'};
   }
   const scored=legal.map(move=>({value:move,score:moveRating(move,ai,opponent)}));
   const move=chooseWeighted(scored,rng,difficulty);
   return {
     type:'move',moveId:move.id,target:chooseTarget(state,move,rng),
     crowdSpend:!move.automatic&&ai.crowdResource>0&&ai.stamina>move.staminaCost+3
       &&(difficulty==='veteran'||(difficulty==='standard'&&rng()<.25))?1:0
   };
 }
 default:return null;
 }
}
