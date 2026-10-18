/**
 * Deterministic decision policy for a solo opponent.
 * No privileged move access, rigged dice, hidden information or timers.
 * The caller performs the selected action with the regular match-engine API.
 */
import {getLegalMoves,getAvailableActions,getAvailableReactions,availableHoldTransitions,
  wrestler,opponentId,statModifier,conditioning,attackBoostEligibility} from './match-engine.js';
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
// Classic territory wrestling favors coherent sequences over perpetual
// guaranteed takedowns or opening-bell finishers. The AI reads only state from
// attempts actually made; players remain free to choose any legal move.
const CLASSIC_OPENERS=Object.freeze({
  'forearm-smash':12,'knee-lift':10,'hip-toss':14,'dragon-screw':10,
  // Big slams, aerial shots and clotheslines are payoffs after an exchange,
  // rather than the default first offensive move of every match.
  'body-slam':-11,'dropkick':-9,'running-clothesline':-8,
  'vertical-suplex':-13,'spinebuster':-14,'ddt':-11,'neckbreaker':-11
});
export function classicMoveRating(move,attacker,defender,state){
 const hitChance=move.automatic?1:Math.max(.05,Math.min(.95,
   (21+statModifier(attacker.stats[move.stat])-conditioning(defender))/20));
 const effectiveDamage=Math.min(move.staminaDamage,defender.stamina);
 const crowd=Number(move.crowdGain||0);
 const prior=state?.moveHistory||[];
 const attempts=prior.length;
 const personal=prior.filter(x=>x.actorId===attacker.id);
 const last=personal.at(-1),beforeLast=personal.at(-2);
 const health=defender.maxStamina>0?defender.stamina/defender.maxStamina:1;
 const opening=attempts<6&&health>.63;
 const windingDown=health<.52&&attempts>=8;
 const lateMatch=health<.31&&attempts>=10;
 let score=hitChance*(effectiveDamage*.88+
   (move.result?.defenderPosture==='prone'?3:0)) -
   move.staminaCost*.52 +(move.automatic?1:0)+crowd*.8;
 if(opening){
   score+=CLASSIC_OPENERS[move.id]||0;
   if(move.category==='grapple'&&!move.sustained)score+=2;
 }
 // Preserve the wrestlers' style signatures without inventing unavailable
 // animations: Stone favors power slams, Viper prioritizes his real dropkick.
 if(attacker.style==='Powerhouse'&&['body-slam','vertical-suplex'].includes(move.id))score+=3;
 if(attacker.style==='Daredevil'&&move.id==='dropkick')score+=opening?-1:7;
 if(move.category==='setup'){
   // Picks and snap downs are useful positional tools, not an infinite source
   // of uncontested offense. The original CPU spammed 826 snap downs/100 bouts.
   score-=move.id==='snap-down'?20:move.id==='pull-to-knees'?9:7;
   if(defender.stamina<=0&&move.id==='pick-up-opponent')score+=10;
   if(move.id==='pick-up-opponent'&&windingDown
      &&attacker.crowdResource>=2&&attacker.stamina>=12)score+=20;
   // A knee to a kneeling rival naturally leads into a snap-down and mat
   // wrestling. Otherwise Forearm Smash is one of very few legal strikes
   // against a kneeling defender and the CPU can repeat it unnaturally.
   if(move.id==='snap-down'&&defender.posture==='kneeling'){
     score+=27;
     if(last?.moveId==='knee-lift')score+=4;
     // Avoid a loop of knee -> snap-down -> pickup -> knee -> snap-down
     // whenever other viable moves and holds exist.
     score-=personal.slice(-8).filter(h=>h.moveId==='snap-down').length*14;
   }
 }
 if(move.sustained){
   score+=opening?-14:health>.53?-5:4;
 }
 if(move.legendary){
   // A finisher is the payoff after meaningful work, not the opening move.
   score+=lateMatch?43:windingDown?32:health>.53||attempts<8?-40:-11;
 }
 if(opening&&['ddt','spinebuster','neckbreaker','vertical-suplex'].includes(move.id))score-=8;
 if(opening&&move.result?.defenderPosture==='prone'&&move.id!=='hip-toss'&&move.id!=='dragon-screw')
   score-=5;
 if(!opening&&attempts>=6&&['body-slam','dropkick','vertical-suplex','running-clothesline','ddt'].includes(move.id))
   score+=2;
 if(!opening&&!move.sustained&&!move.legendary&&move.category!=='setup'){
   // Old matches progress from strikes and hip tosses toward slams/dropkicks.
   score+=(health<.68?3:0);
 }
 if(last?.moveId===move.id)score-=last.success?22:28;
 if(beforeLast?.moveId===move.id)score-=7;
 // Repeated strikes are believable, but five identical attacks in a row are
 // not. Repetition is assessed per wrestler, not across both participants.
 const recent=personal.slice(-6).filter(h=>h.moveId===move.id).length;
 score-=recent*3;
 const lifetime=personal.filter(h=>h.moveId===move.id).length;
 if(lifetime>=4)score-=Math.min(15,(lifetime-3)*3);
 if(!recent&&personal.length>=2)score+=2;
 if(attacker.stamina<=move.staminaCost+3)score-=4;
 return score;
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

// Spend valuable crowd dice late in a pin, or when a damaged rival is
// vulnerable. A defender can always fight back with their own reserves.
export function choosePinCrowdSpend(wrestlerState, opponentState, {defending=false,count=1,difficulty='standard'}={}) {
 const available=Math.max(0,Math.floor(wrestlerState.crowdResource||0));
 if(!available)return 0;
 const staminaRatio=opponentState.maxStamina>0?opponentState.stamina/opponentState.maxStamina:1;
 const marks=Object.values(opponentState.bodyDamage||{}).reduce((n,x)=>n+Number(x||0),0);
 const ownMarks=Object.values(wrestlerState.bodyDamage||{}).reduce((n,x)=>n+Number(x||0),0);
 if(defending){
   const danger=count>=3||ownMarks>=3||wrestlerState.stamina<=Math.max(8,wrestlerState.maxStamina*.25);
   return danger?Math.min(available,count>=3||ownMarks>=5?2:1):0;
 }
 const opportunity=count>=2&&(staminaRatio<.55||marks>=3);
 return opportunity?Math.min(available,staminaRatio<.25||marks>=5?2:1):0;
}

export function chooseAiAction(state,{setup=DEFAULT_MATCH_SETUP,rng=Math.random}={}){
 if(!isAiDecision(state,setup))return null;
 const aiId=aiWrestlerId(setup),ai=wrestler(state,aiId),opponent=wrestler(state,opponentId(aiId));
 const difficulty=setup.difficulty||'standard';
 switch(state.phase){
 case 'NEUTRAL_ROLL':return {type:'neutral'};
 case 'PIN':return {type:'pin-defense'};
 case 'PIN_OPPORTUNITY':
   if(opponent.stamina===0||opponent.stamina<=12)return {type:'pin'};
   // Early covers exist, but should usually be one-count teases rather than
   // three-count gambling every time someone lands a hip toss.
   const wear=opponent.stamina/opponent.maxStamina;
   const chance=wear>.72?.035:wear>.42?.28:wear>.2?.60:.77;
   return {type:rng()<chance?'pin':'skip-pin'};
 case 'HOLD_ESCAPE':return {type:'escape-hold'};
 case 'GROUND_DEFENSE':
   return {type:ai.stamina<=1?'scramble-ground':(rng()<.77?'scramble-ground':'cover-ground')};
 case 'REACTION':{
   const moves=getAvailableReactions(state);
   if(!moves.length)return {type:'pass-reaction'};
   if(difficulty==='rookie'&&rng()<.30)return {type:'pass-reaction'};
   const selected=chooseWeighted(moves.map(move=>({value:move,score:classicMoveRating(move,ai,opponent,state)})),rng,difficulty);
   return selected?{type:'reaction',moveId:selected.id}:{type:'pass-reaction'};
 }
 case 'HOLD':{
   const hold=state.activeHold;
   const current=hold?state.wrestlers[hold.defenderId]:null;
   const options=availableHoldTransitions(state);
   const tickCost=hold?({armbar:2,'ankle-lock':2,'ground-headlock':2,'standing-wristlock':2,'standing-headlock':2}[hold.moveId]||2):2;
   if(ai.stamina<tickCost)return {type:'release-hold'};
   if(options.length&&ai.stamina>9&&current?.stamina>8&&rng()<(difficulty==='veteran'?.28:.15))
     return {type:'switch-hold',moveId:options[0].id};
   if(current?.stamina<8||rng()>(current?.stamina/current?.maxStamina>.68?.40:.22))return {type:'tighten-hold'};
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
   const scored=legal.map(move=>({value:move,score:classicMoveRating(move,ai,opponent,state)}));
   const move=chooseWeighted(scored,rng,difficulty);
   return {
     type:'move',moveId:move.id,target:chooseTarget(state,move,rng),
     crowdSpend:attackBoostEligibility(state,move).available&&ai.stamina>move.staminaCost+3
       &&(difficulty==='veteran'||(difficulty==='standard'&&rng()<.25))?1:0
   };
 }
 default:return null;
 }
}
