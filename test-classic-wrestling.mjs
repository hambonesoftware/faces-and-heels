/**
 * 100 scripted professional-wrestling-style match audits.
 * Comparators (qualitative, not an empirical move-frequency dataset):
 * Flair vs Steamboat, WrestleWar 1989 (locks, headlocks, arm work, cutoffs)
 * Hart vs Perfect, SummerSlam 1991 (suplexes, two-counts, comeback, finisher)
 * https://www.wwe.com/classics/wcw/ric-flair-ricky-steamboat-trilogy-interview
 * https://www.wwe.com/shows/summerslam/history/greatestmatches
 *
 * Uses real combat engine and CPU move policy on BOTH sides. No browser art
 * and no human hand-entered sequences; records reproducible seeded bouts.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chooseAiAction} from './solo-ai.js';
import {cloneInitialState,opponentId,wrestler,getLegalMoves,checkCombatFlow,
 resolveNeutralRoll,resolveMoveAttempt,resolveReaction,declineReaction,resolvePinCount,
 startPin,skipPin,maintainHold,releaseHold,escapeHold,transitionHold,
 resolveGroundDefense,scrambleUp,spendCrowdForStamina,catchBreathToNeutral} from './match-engine.js';
import {demoMoves} from './moves.js';

function seeded(seed){let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);}
function die(rng,n=20){return Math.floor(rng()*n)+1;}
const sum=(arr,fn)=>arr.reduce((a,x)=>a+fn(x),0);
function percentile(arr,p){const sorted=arr.slice().sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*p)]??0;}
const ids=['stone','viper'];
function play(seed,logFull=false){
  const rng=seeded(seed),state=cloneInitialState(),events=[],moves=[],opened=[];
  let steps=0,pins=0,kickouts=0,holds=0,escapes=0,changes=0,pressure=0,finisherAttempts=0;
  let lastControl=null;const say=(actor,action,details='')=>{
    const entry={step:steps,actor,action,details};events.push(entry);
  };
  const sample=(prev)=>{
    const now=Object.entries(state.roles).find(([,role])=>role==='H')?.[0]||null;
    if(prev&&now&&prev!==now){changes++;say(now,'COMEBACK',prev+' loses control');}
    lastControl=now;
    const report=checkCombatFlow(state);
    assert(report.ok,`Invalid combat step ${steps} seed ${seed}: ${report.issues.join('; ')}`);
  };
  while(!state.winnerId&&steps++<650){
    const phase=state.phase,turn=state.phase==='NEUTRAL_ROLL'?null:state.activeWrestlerId;
    const actorId=phase==='ACTION_SELECT'?state.activeWrestlerId:
      phase==='REACTION'?state.pendingFailure?.defenderId:
      phase==='PIN_OPPORTUNITY'?state.pinningWrestlerId:
      phase==='PIN'?opponentId(state.pinningWrestlerId):
      phase==='GROUND_DEFENSE'?state.groundDefense?.defenderId:
      phase==='HOLD'?state.activeHold?.holderId:
      phase==='HOLD_ESCAPE'?state.activeHold?.defenderId:null;
    const setup={mode:'solo',playerId:actorId?opponentId(actorId):'stone',difficulty:'standard',tutorial:false};
    const decision=chooseAiAction(state,{setup,rng});
    assert(decision,`No playable intent seed ${seed}, step ${steps}, phase ${phase}`);
    const before=lastControl;
    switch(decision.type){
      case 'neutral':{
        const o=resolveNeutralRoll(state,die(rng),die(rng));
        say(null,'LOCKUP',o.tie?'Tie':o.winnerId+' controls');break;
      }
      case 'move':{
        const move=getLegalMoves(state).find(x=>x.id===decision.moveId);
        assert(move,'Invalid trained move '+decision.moveId);
        const actor=state.activeWrestlerId,defender=opponentId(actor);
        const outcome=resolveMoveAttempt(state,{moveId:move.id,target:decision.target,
          attackRoll:move.automatic?20:die(rng),damageRoll:move.automatic?0:die(rng,move.damageDie||4),
          crowdSpend:decision.crowdSpend});
        if(move.legendary)finisherAttempts++;
        moves.push({step:steps,actor,id:move.id,name:move.name,category:move.category,
          success:outcome.success,opponentDamage:outcome.staminaDamage,posture:wrestler(state,defender).posture,
          finisher:!!move.legendary,setup:move.category==='setup'});
        say(actor,outcome.success?move.name:'MISSED '+move.name,defender+' '+wrestler(state,defender).posture);
        if(move.sustained&&outcome.success)holds++;
        break;
      }
      case 'reaction':{
        const reactor=state.pendingFailure.defenderId,move=demoMoves.find(m=>m.id===decision.moveId);
        const out=resolveReaction(state,{reactionMoveId:move.id,reactionRoll:die(rng),damageRoll:die(rng,move.damageDie)});
        say(reactor,out.success?'COUNTER '+move.name:'FAILED COUNTER '+move.name);
        break;
      }
      case 'pass-reaction':{
        const actor=state.pendingFailure.defenderId;declineReaction(state);say(actor,'PASS COUNTER');break;
      }
      case 'pin':{startPin(state);pins++;say(actorId,'PIN START');break;}
      case 'skip-pin':{const r=skipPin(state);assert(r.ok);say(actorId,'NO PIN (continue)');break;}
      case 'pin-defense':{
        const p=state.pinningWrestlerId;
        const out=resolvePinCount(state,{pinningId:p,count:state.pinCount+1,
          pinningRoll:die(rng),pinnedRoll:die(rng)});
        if(out.kickout)kickouts++;
        say(actorId,out.kickout?'KICKOUT AT '+out.count:out.pinfall?'PINFALL':'COUNT '+out.count);break;
      }
      case 'escape-hold':{
        const out=escapeHold(state,{escapeRoll:die(rng)});
        assert(out.ok);if(out.success)escapes++;
        say(actorId,out.success?'ESCAPED HOLD':out.submitted?'SUBMITTED':'HOLD ESCAPE FAIL');break;
      }
      case 'tighten-hold':{const out=maintainHold(state);assert(out.ok);pressure++;say(actorId,'HOLD PRESSURE');break;}
      case 'release-hold':{assert(releaseHold(state).ok);say(actorId,'RELEASE HOLD');break;}
      case 'switch-hold':{assert(transitionHold(state,{moveId:decision.moveId}).ok);say(actorId,'SWITCH HOLD '+decision.moveId);break;}
      case 'scramble-ground':{const o=resolveGroundDefense(state,{choice:'scramble',roll:die(rng)});assert(o.ok);say(actorId,o.success?'GETS TO KNEES':'SCRAMBLE FAIL');break;}
      case 'cover-ground':{assert(resolveGroundDefense(state,{choice:'cover'}).ok);say(actorId,'COVER UP');break;}
      case 'stand':{assert(scrambleUp(state,actorId).ok);say(actorId,'STAND UP');break;}
      case 'recover':{assert(spendCrowdForStamina(state,actorId,1).ok);say(actorId,'CROWD RECOVERY');break;}
      case 'breath':{const o=catchBreathToNeutral(state,actorId);assert(o.recovered>0);say(actorId,'CATCH BREATH');break;}
      default:throw Error('Unknown '+decision.type);
    }
    sample(before);
  }
  assert(state.winnerId,`Bout seed ${seed} did not finish after ${steps}`);
  const attacks=moves.filter(m=>!m.setup),successful=attacks.filter(m=>m.success);
  const unique=new Set(successful.map(m=>m.id));
  const early=Math.max(1,Math.ceil(attacks.length/3));
  const opening=attacks.slice(0,early),closing=attacks.slice(-early);
  const earlyFinishers=opening.filter(x=>x.finisher);
  let repeats=0,repeatStreakMax=1,currentStreak=1;
  for(let i=1;i<attacks.length;i++){
    if(attacks[i].actor===attacks[i-1].actor&&attacks[i].id===attacks[i-1].id){
      repeats++;currentStreak++;repeatStreakMax=Math.max(repeatStreakMax,currentStreak);
    }else currentStreak=1;
  }
  const signature=attacks.filter(m=>m.finisher&&m.success).length;
  return {
    seed,winner:state.winnerId,method:state.winMethod||'unknown',steps,attackCount:attacks.length,
    successful:successful.length,unique:unique.size,
    openingBasic:opening.filter(m=>['forearm-smash','hip-toss','knee-lift','dragon-screw','body-slam'].includes(m.id)).length,
    openingBig:opening.filter(m=>['flash-finisher','viper-bite','ddt','spinebuster','vertical-suplex'].includes(m.id)).length,
    earlyFinishers:earlyFinishers.length,
    finishers:finisherAttempts,signature,setup:moves.filter(m=>m.setup).length,
    holds,pressure,escapes,pins,kickouts,changes,repeats,repeatStreakMax,
    grounding:attacks.filter(m=>m.success&&m.posture==='prone').length,
    closingBigger:closing.filter(m=>m.finisher||['ddt','spinebuster','vertical-suplex','body-slam'].includes(m.id)).length,
    moves,events:logFull?events:[]
  };
}
const REPORT_COUNT=Number(process.env.FH_CLASSIC_AUDIT_MATCHES||100);
assert(Number.isInteger(REPORT_COUNT)&&REPORT_COUNT>0);
const bouts=Array.from({length:REPORT_COUNT},(_,i)=>play(0xFACED000+i+1,true));
const metric=n=>sum(bouts,b=>b[n]);
const mean=n=>(metric(n)/bouts.length).toFixed(2);
const allMoves=bouts.flatMap(b=>b.moves);
const frequency=Object.entries(allMoves.reduce((acc,m)=>{const p=acc[m.id]||{attempts:0,hits:0};p.attempts++;if(m.success)p.hits++;acc[m.id]=p;return acc;},{}))
  .sort((a,b)=>b[1].attempts-a[1].attempts);
const duplicate=bouts.filter(b=>b.repeatStreakMax>=3);
const noHold=bouts.filter(b=>b.holds===0).length,noComeback=bouts.filter(b=>b.changes===0).length;
const earlyFinisher=bouts.filter(b=>b.earlyFinishers>0).length;
const openingTech=bouts.filter(b=>b.openingBasic>0).length;
const report={
  matches:REPORT_COUNT,completed:bouts.length,
  averageAttacks:Number(mean('attackCount')),medianAttacks:percentile(bouts.map(b=>b.attackCount),.5),
  p90Attacks:percentile(bouts.map(b=>b.attackCount),.9),
  uniqueMovesPerMatch:Number(mean('unique')),avgSetups:Number(mean('setup')),
  averageComebacks:Number(mean('changes')),boutsWithoutComeback:noComeback,
  boutsWithSubmissionHolds:REPORT_COUNT-noHold,
  averageHolds:Number(mean('holds')),averagePins:Number(mean('pins')),
  boutsWithThreeSameMoveInRow:duplicate.length,
  boutsWithOpeningTechnicalOrStrike:openingTech,
  boutsWithEarlyFinisher:earlyFinisher,
  totalStaminaPressure:metric('pressure'),pinfallWins:bouts.filter(b=>b.method==='pinfall').length,
  submissionWins:bouts.filter(b=>b.method==='submission').length,
  byStyle:Object.fromEntries(['stone','viper'].map(id=>[id,allMoves.filter(m=>m.actor===id&&m.success).reduce((a,m)=>(a[m.id]=(a[m.id]||0)+1,a),{})])),
  frequency:frequency.slice(0,23).map(([id,v])=>({id,...v})),
  examples:bouts.slice(0,3).map(b=>({seed:b.seed,winner:b.winner,method:b.method,
    attacks:b.attackCount,transcript:b.events.map(e=>`${e.actor||'BOTH'}:${e.action}`).slice(0,65)}))
};
assert.equal(report.completed,REPORT_COUNT);
assert(report.pinfallWins+report.submissionWins===REPORT_COUNT);
// Playtest quality gates, not claimed measurements of historical broadcasts.
// We require recognizable pacing and diverse legal wrestling, not scripted wins.
if(REPORT_COUNT===100){
 assert(report.boutsWithEarlyFinisher<=10,'Finishers appear too often during opening third');
 assert(report.boutsWithThreeSameMoveInRow<=10,'Move selection repeats too often');
 assert(report.uniqueMovesPerMatch>=5,'Match move lists lack variety');
 assert(report.avgSetups<=5,'Automatic setup moves overwhelm real wrestling offense');
 assert(report.boutsWithOpeningTechnicalOrStrike>=80,'Opening needs recognisable basic wrestling');
 assert(report.boutsWithSubmissionHolds>=25,'Ground/chain wrestling is absent from most bouts');
 assert((report.byStyle.stone['body-slam']||0)>0,'Stone must show Powerhouse offense');
 assert((report.byStyle.viper['dropkick']||0)>0,'Viper must show Daredevil offense');
}
mkdirSync('audit-output',{recursive:true});
writeFileSync('audit-output/classic-match-100.json',JSON.stringify({
 note:'100 complete deterministic engine matches, not video recordings of real wrestlers',
 builtAt:'v1.19.1',report,
 bouts:bouts.map(b=>({seed:b.seed,winner:b.winner,method:b.method,steps:b.steps,
   attackCount:b.attackCount,moves:b.moves,events:b.events}))
},null,2)+'\\n');
console.log('CLASSIC WRESTLING AUDIT REPORT (qualitative references, not an exact recreation):');
console.log(JSON.stringify(report,null,2));
