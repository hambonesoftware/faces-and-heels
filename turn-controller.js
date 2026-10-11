/**
 * Centralized combat decision policy.
 *
 * Pure and dependency-free on purpose: match-engine, UI, bots, and tests call
 * this same source of truth. A position ('prone' or 'grappled') and advantage
 * ('H'/'L') never determine who can respond; the current phase grants the
 * defender's interruption window explicitly.
 */
export const ACTION_IDS=Object.freeze({
  NEUTRAL:'neutral-roll',
  MOVE:'select-move',
  SCRAMBLE:'scramble-up',
  RECOVER:'crowd-recover',
  BREATH:'catch-breath',
  REACT:'react',
  PASS_REACTION:'pass-reaction',
  PIN:'start-pin',
  SKIP_PIN:'skip-pin',
  COUNT_PIN:'pin-count',
  HOLD_SQUEEZE:'hold-squeeze',
  HOLD_RELEASE:'hold-release',
  HOLD_ESCAPE:'hold-escape'
});
const both=['stone','viper'];
const other=id=>id==='stone'?'viper':'stone';
function option(id,actorId,{label=id,enabled=true,reason='',roll=null,role='actor'}={}){
  return {id,actorId,label,enabled,reason,roll,role};
}
function getStateRole(state,id){return state.roles?.[id]||'N';}
const phaseKinds={
  NEUTRAL_ROLL:'contest',
  ACTION_SELECT:'offense',
  REACTION:'interrupt',
  PIN_OPPORTUNITY:'pin-decision',
  PIN:'pin-defense',
  HOLD:'hold-control',
  HOLD_ESCAPE:'hold-defense',
  MATCH_COMPLETE:'complete'
};
function seal(phase,actorId,actions,{kind=phaseKinds[phase]||'unknown',defenderId=null,reason='',controlId=null}={}){
  return {phase,kind,actorId,defenderId,controlId,reason,actions};
}
export function getTurnContext(state,legalMoves=[]){
  if(!state||!state.wrestlers||!state.roles)return seal('INVALID',null,[],{reason:'Missing match state'});
  if(state.winnerId||state.phase==='MATCH_COMPLETE')return seal('MATCH_COMPLETE',null,[],{reason:'Match finished'});
  const hold=state.activeHold;
  if(hold){
    const phase=state.phase==='HOLD_ESCAPE'?'HOLD_ESCAPE':'HOLD';
    const defenderId=hold.defenderId,holderId=hold.holderId;
    if(phase==='HOLD_ESCAPE'){
      return seal(phase,defenderId,[
        option(ACTION_IDS.HOLD_ESCAPE,defenderId,{label:hold.finishPending?'Final escape roll':'Escape grapple',roll:'d20 + Agility',role:'defender'})
      ],{defenderId:holderId,controlId:holderId,reason:'Low may escape despite High control'});
    }
    const source=(state.moves||[]).find(m=>m.id===hold.moveId);
    // The engine owns move metadata. Expose the availability it can determine
    // from persisted hold data; if not given, default to the v1.15 tick cost.
    const tickCost=Number(hold.tickCost??source?.sustained?.tickCost??2);
    const stamina=state.wrestlers[holderId]?.stamina??0;
    return seal('HOLD',holderId,[
      option(ACTION_IDS.HOLD_SQUEEZE,holderId,{label:'Tighten hold',enabled:stamina>=tickCost,reason:stamina>=tickCost?'':'Insufficient stamina'}),
      option(ACTION_IDS.HOLD_RELEASE,holderId,{label:'Release hold'})
    ],{defenderId,controlId:holderId,reason:'Holder controls pressure; Low gets a roll after every squeeze'});
  }
  if(state.pendingFailure||state.phase==='REACTION'){
    const pending=state.pendingFailure;
    if(!pending)return seal('INVALID',null,[],{reason:'Reaction phase without failure details'});
    const actorId=pending.defenderId,stamina=state.wrestlers[actorId]?.stamina??0;
    const cost=Number(state.reactionCost??5);
    return seal('REACTION',actorId,[
      option(ACTION_IDS.REACT,actorId,{label:'Counterattack',roll:'d20 + Power',enabled:stamina>=cost,reason:stamina>=cost?'':'Insufficient stamina',role:'defender'}),
      option(ACTION_IDS.PASS_REACTION,actorId,{label:'Pass counter',role:'defender'})
    ],{defenderId:pending.attackerId,controlId:pending.attackerId,reason:'An interrupted wrestler can respond regardless of High/Low'});
  }
  if(state.phase==='PIN'){
    const pinnedId=state.pinningWrestlerId?other(state.pinningWrestlerId):null;
    // The existing pin minigame runs opposed dice per count. Both sides are
    // included, so later interactive kickouts can reuse this contract.
    return seal('PIN',pinnedId,[
      option(ACTION_IDS.COUNT_PIN,pinnedId,{label:'Resolve opposed pin and kickout dice',roll:'Opposed d20',role:'defender'})
    ],{defenderId:state.pinningWrestlerId,controlId:state.pinningWrestlerId});
  }
  if(state.phase==='PIN_OPPORTUNITY'||state.pinEligible){
    const actorId=state.pinningWrestlerId,defenderId=actorId?other(actorId):null;
    const exhausted=Boolean(defenderId&&state.wrestlers[defenderId]?.stamina<=0);
    return seal('PIN_OPPORTUNITY',actorId,[
      option(ACTION_IDS.PIN,actorId,{label:'Attempt pin',roll:'Three opposed d20 counts'}),
      option(ACTION_IDS.SKIP_PIN,actorId,{label:'Continue offense',enabled:!exhausted,reason:exhausted?'Exhausted rival must be finished':''})
    ],{defenderId,controlId:actorId});
  }
  if(state.phase==='NEUTRAL_ROLL'){
    return seal('NEUTRAL_ROLL',null,[option(ACTION_IDS.NEUTRAL,null,{label:'Contest for control',roll:'Opposed d20 + Agility',role:'both'})],{reason:'Both wrestlers contest control'});
  }
  if(state.phase==='ACTION_SELECT'){
    const actorId=state.activeWrestlerId;
    if(!actorId||!state.wrestlers[actorId])return seal('INVALID',null,[],{reason:'No active wrestler to take action'});
    const w=state.wrestlers[actorId],defenderId=other(actorId);
    const hasMoves=Array.isArray(legalMoves)&&legalMoves.length>0;
    const actions=[
      option(ACTION_IDS.MOVE,actorId,{label:'Choose wrestling move',enabled:hasMoves,reason:hasMoves?'':'No legal move'})
    ];
    // Scramble is a post-kickout/active offense recovery. The actor, never the
    // idle Low wrestler, receives it; normal offense may remain available.
    if(w.posture==='prone')actions.push(option(ACTION_IDS.SCRAMBLE,actorId,{label:'Get up from the mat'}));
    if(w.crowdResource>0&&w.stamina<w.maxStamina)actions.push(option(ACTION_IDS.RECOVER,actorId,{label:'Spend crowd to recover stamina'}));
    if(!hasMoves&&w.posture!=='prone')actions.push(option(ACTION_IDS.BREATH,actorId,{label:'Catch breath; contest control again'}));
    return seal('ACTION_SELECT',actorId,actions,{
      kind:hasMoves?'offense':'recovery',defenderId,
      controlId:getStateRole(state,actorId)==='H'?actorId:null,
      reason:hasMoves?'Legal moves available':'Recovery option required to avoid deadlock'
    });
  }
  return seal('INVALID',null,[],{reason:'Unknown phase '+String(state.phase)});
}
export function canPerformAction(state,actionId,actorId,legalMoves=[]){
  const turn=getTurnContext(state,legalMoves);
  const action=turn.actions.find(a=>a.id===actionId);
  if(!action)return {ok:false,reason:'Action '+actionId+' is not available in '+turn.phase,turn};
  if(!action.enabled)return {ok:false,reason:action.reason||'Action unavailable',turn};
  if(action.role!=='both'&&action.actorId!==actorId)
    return {ok:false,reason:'Not this wrestler\'s action or response window',turn};
  return {ok:true,action,turn};
}
export function getDefensiveWindow(state){
  const turn=getTurnContext(state);
  return ['interrupt','hold-defense','pin-defense'].includes(turn.kind)
    ?{actorId:turn.actorId,kind:turn.kind,roll:turn.actions.find(a=>a.roll)?.roll??null,controlId:turn.controlId}
    :null;
}
