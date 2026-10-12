import { demoMoves, demoState, reactionMove } from './moves.js';
import {isLegendaryLearnable,MAX_LEGENDARY_MOVES,getLegendaryCandidate} from './legendary-catalog.js';
import { isMoveLegal, resolveTargetDecision } from './flow-engine.js';
import {ACTION_IDS,getTurnContext,canPerformAction,getDefensiveWindow,auditTurnState} from './turn-controller.js';
import {GROUND_SCRAMBLE_COST,GROUND_GUARD_VALUE,groundDefenseWindow,groundScrambleTarget} from './ground-defense.js';
import {legalCounterMoves} from './reaction-selection.js';

export const CROWD_CAP = 5;
export const BODY_MARK_CAP = 3;
export const REACTION_COST = 5;

export function cloneInitialState() {
  return structuredClone(demoState);
}

export function opponentId(id) {
  return id === 'stone' ? 'viper' : 'stone';
}

export function wrestler(state, id) {
  return state.wrestlers[id];
}

export function activeWrestler(state) {
  return state.activeWrestlerId ? wrestler(state, state.activeWrestlerId) : null;
}

export function defendingWrestler(state) {
  return state.activeWrestlerId ? wrestler(state, opponentId(state.activeWrestlerId)) : null;
}

export function roleFor(state, id) {
  return state.roles[id] || 'N';
}

export function statModifier(rawStat) {
  // Provisional v1.3 interpretation of the source's unresolved "Stat MOD 5" phrase.
  // This keeps 2d12-style raw stats but produces compact d20 modifiers.
  return Math.floor((Number(rawStat || 10) - 10) / 2);
}

export function conditioning(wrestlerState) {
  // Provisional: 10 + Fortitude modifier, not 10 + raw Fortitude.
  return 10 + statModifier(wrestlerState.stats.Fortitude);
}

export function totalBodyMarks(wrestlerState) {
  return Object.values(wrestlerState.bodyDamage || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function bodyThreshold(wrestlerState, bodyPart) {
  return wrestlerState.bodyThresholds?.[bodyPart] ?? 6;
}

export function perspectiveState(state, actorId = state.activeWrestlerId) {
  if (!actorId) return { ...state, attacker: null, defender: null };
  return {
    ...state,
    attacker: wrestler(state, actorId),
    defender: wrestler(state, opponentId(actorId))
  };
}

export function deriveCondition(wrestlerState) {
  if (wrestlerState.posture === 'prone') return 'Prone';
  const marks = totalBodyMarks(wrestlerState);
  if (wrestlerState.stamina <= 0) return 'Exhausted';
  if (marks >= 5) return 'Worn Down';
  if (marks >= 2) return 'Hurt';
  return 'Mostly Healthy';
}

export function setRoles(state, highId = null) {
  if (!highId) {
    state.roles.stone = 'N';
    state.roles.viper = 'N';
    return;
  }
  const lowId = opponentId(highId);
  state.roles[highId] = 'H';
  state.roles[lowId] = 'L';
}

export function giveControl(state, id) {
  state.activeWrestlerId = id;
  setRoles(state, id);
  state.neutralAction = false;
  state.groundDefense = null;
  state.activeHold = null;
  state.phase = 'ACTION_SELECT';
}

export function beginNeutral(state, { resetPostures = false } = {}) {
  state.phase = 'NEUTRAL_ROLL';
  state.activeWrestlerId = null;
  state.neutralAction = false;
  state.pinEligible = false;
  state.pinningWrestlerId = null;
  state.groundDefense = null;
  state.pendingFailure = null;
  state.activeHold = null;
  state.pinCount = 0;
  state.mustFinishTargetId = null;
  setRoles(state, null);
  if (resetPostures) {
    state.wrestlers.stone.posture = 'standing';
    state.wrestlers.viper.posture = 'standing';
  }
  state.wrestlers.stone.condition = deriveCondition(state.wrestlers.stone);
  state.wrestlers.viper.condition = deriveCondition(state.wrestlers.viper);
}

export function recover(wrestlerState, amount) {
  const before = wrestlerState.stamina;
  wrestlerState.stamina = Math.min(wrestlerState.maxStamina, wrestlerState.stamina + amount);
  return wrestlerState.stamina - before;
}

export function resolveNeutralRoll(state, stoneRoll, viperRoll) {
  requireCombatAction(state,ACTION_IDS.NEUTRAL,null);
  const s = wrestler(state, 'stone');
  const v = wrestler(state, 'viper');
  recover(s, 10);
  recover(v, 10);
  const stoneTotal = stoneRoll + statModifier(s.stats.Agility);
  const viperTotal = viperRoll + statModifier(v.stats.Agility);
  if (stoneTotal === viperTotal) {
    state.phase = 'NEUTRAL_ROLL';
    state.activeWrestlerId = null;
    setRoles(state, null);
    return { tie: true, stoneRoll, viperRoll, stoneTotal, viperTotal };
  }
  const winnerId = stoneTotal > viperTotal ? 'stone' : 'viper';
  giveControl(state, winnerId);
  state.turnCounter += 1;
  return { tie: false, winnerId, stoneRoll, viperRoll, stoneTotal, viperTotal };
}

// Each wrestler has a selected Common Move repertoire, universal setup
// actions, and at most four personally learned style-Legendary finishers.
export function isMoveKnown(wrestlerState,move){
  if(!wrestlerState||!move)return false;
  if(move.category==='setup')return true;
  if(move.legendary||move.category==='special'){
    const selected=wrestlerState.legendaryMoves||[];
    const candidate=getLegendaryCandidate(wrestlerState.style,move.id);
    return selected.length<=MAX_LEGENDARY_MOVES
      &&selected.includes(move.id)
      &&candidate?.status==='playable'
      &&(!candidate.signatureFor||candidate.signatureFor===wrestlerState.id)
      &&move.legendaryStyle===wrestlerState.style;
  }
  return (wrestlerState.commonMoves||[]).includes(move.id);
}
export function setLegendaryLoadout(state,id,ids){
  const w=wrestler(state,id);
  if(!w||!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.length>MAX_LEGENDARY_MOVES)
    return {ok:false,reason:'Invalid legendary loadout'};
  if(!ids.every(moveId=>isLegendaryLearnable(w.style,moveId) &&
    (!getLegendaryCandidate(w.style,moveId).signatureFor||getLegendaryCandidate(w.style,moveId).signatureFor===id)))
    return {ok:false,reason:'Unlearnable, wrong-style or signature-locked Legendary Move'};
  w.legendaryMoves=ids.slice();
  return {ok:true,ids:w.legendaryMoves};
}

export function getLegalMoves(state, actorId = state.activeWrestlerId) {
  if (!actorId || state.phase!=='ACTION_SELECT' || state.winnerId || state.activeHold) return [];
  const perspective = perspectiveState(state, actorId);
  let moves = demoMoves.filter(move => isMoveKnown(perspective.attacker,move) && isMoveLegal(move, perspective));
  const defender = perspective.defender;
  if (state.mustFinishTargetId === defender.id && defender.stamina <= 0 && defender.posture !== 'prone') {
    moves = moves.filter(move => move.category !== 'setup' && move.result?.defenderPosture === 'prone' && move.staminaDamage > 0);
  }
  return moves;
}

// Single source of truth for the live actor, legal decisions and Low's
// defensive window. Consumers can use this without reconstructing phases.
export function getAvailableActions(state){
  const moves=state.phase==='ACTION_SELECT'&&!state.activeHold ? getLegalMoves(state) : [];
  return getTurnContext(state,moves);
}
export function checkCombatFlow(state){
  const moves=state.phase==='ACTION_SELECT'&&!state.activeHold ? getLegalMoves(state) : [];
  return auditTurnState(state,moves);
}
export function validateCombatAction(state,id,actorId){
  const moves=state.phase==='ACTION_SELECT'&&!state.activeHold ? getLegalMoves(state) : [];
  return canPerformAction(state,id,actorId,moves);
}
function requireCombatAction(state,id,actorId){
  const check=validateCombatAction(state,id,actorId);
  if(!check.ok)throw new Error(check.reason);
  return check;
}

export function getAvailableReactions(state){
 const pending=state.pendingFailure;
 if(state.phase!=='REACTION'||!pending||state.activeHold)return [];
 return legalCounterMoves({moves:demoMoves,
    reactor:wrestler(state,pending.defenderId),opponent:wrestler(state,pending.attackerId),state});
}

export function canReact(state) {
  if (!state.pendingFailure || state.phase!=='REACTION' || state.activeHold) return false;
  return getAvailableReactions(state).length>0;
}

export function spendCrowdForStamina(state, wrestlerId, amount = 1) {
  const allowed=validateCombatAction(state,ACTION_IDS.RECOVER,wrestlerId);
  if(!allowed.ok)return {ok:false,gained:0,spent:0,reason:allowed.reason};
  const w = wrestler(state, wrestlerId);
  const spend = Math.max(0, Math.min(amount, w.crowdResource));
  if (!spend) return { ok: false, gained: 0, spent: 0 };
  w.crowdResource -= spend;
  const gained = recover(w, 10 * spend);
  return { ok: true, gained, spent: spend };
}

export function catchBreathToNeutral(state, wrestlerId) {
  const allowed=validateCombatAction(state,ACTION_IDS.BREATH,wrestlerId);
  if(!allowed.ok)return {ok:false,reason:allowed.reason};
  const w = wrestler(state, wrestlerId);
  recover(w, 10);
  beginNeutral(state, { resetPostures: true });
  return { wrestlerId, recovered: 10 };
}

export function scrambleUp(state, wrestlerId) {
  const allowed=validateCombatAction(state,ACTION_IDS.SCRAMBLE,wrestlerId);
  if(!allowed.ok)return {ok:false,reason:allowed.reason};
  const w = wrestler(state, wrestlerId);
  if (!w || w.posture !== 'prone' || state.activeHold) return { ok: false };
  w.posture = 'standing';
  w.condition = deriveCondition(w);
  state.phase = 'ACTION_SELECT';
  return { ok: true, wrestlerId };
}

function applyCrowdSpend(wrestlerState, requested) {
  const spend = Math.max(0, Math.min(Number(requested || 0), 1, wrestlerState.crowdResource));
  wrestlerState.crowdResource -= spend;
  return spend;
}

function awardCrowd(wrestlerState, amount) {
  const gain = Math.max(0, Number(amount || 0));
  const before = wrestlerState.crowdResource;
  wrestlerState.crowdResource = Math.min(CROWD_CAP, before + gain);
  return wrestlerState.crowdResource - before;
}

function applyDamageMark(defender, target, damageRoll, defenseBonus=0) {
  const threshold = bodyThreshold(defender, target)+defenseBonus;
  const marked = Number(damageRoll) > threshold;
  if (marked) {
    defender.bodyDamage[target] = Math.min(BODY_MARK_CAP, (defender.bodyDamage[target] || 0) + 1);
  }
  return { marked, threshold, damageRoll };
}

export function resolveMoveAttempt(state, {
  moveId,
  target = null,
  attackRoll,
  damageRoll,
  crowdSpend = 0
}) {
  const move = demoMoves.find(item => item.id === moveId);
  if (!move) throw new Error(`Unknown move ${moveId}`);
  const attackerId = state.activeWrestlerId;
  if (!attackerId) throw new Error('No active wrestler.');
  const defenderId = opponentId(attackerId);
  const attacker = wrestler(state, attackerId);
  const defender = wrestler(state, defenderId);
  const perspective = perspectiveState(state, attackerId);
  if (state.activeHold || !isMoveKnown(attacker,move) || !isMoveLegal(move, perspective)) throw new Error(`${move.name} is not learned or legal for ${attacker.name}.`);
  requireCombatAction(state,ACTION_IDS.MOVE,attackerId);

  const targetDecision = resolveTargetDecision(move, perspective);
  let resolvedTarget = target;
  if (!resolvedTarget && targetDecision.kind === 'resolved') resolvedTarget = targetDecision.values[0] || null;
  if (targetDecision.kind === 'choice' && !targetDecision.values.includes(resolvedTarget)) {
    throw new Error(`${move.name} requires a legal target choice.`);
  }

  attacker.stamina = Math.max(0, attacker.stamina - move.staminaCost);
  const spentCrowd = applyCrowdSpend(attacker, crowdSpend);
  const modifier = statModifier(attacker.stats[move.stat]);
  const targetNumber = conditioning(defender);
  const total = attackRoll + modifier + spentCrowd;
  const success = move.automatic === true || total >= targetNumber;

  state.turnCounter += 1;
  state.pinEligible = false;
  state.pinningWrestlerId = null;

  const result = {
    move,
    attackerId,
    defenderId,
    target: resolvedTarget,
    attackRoll,
    modifier,
    spentCrowd,
    total,
    targetNumber,
    success,
    damage: null,
    staminaDamage: 0,
    crowdGained: 0,
    pinEligible: false,
    forcedPin: false
  };

  if (!success) {
    state.pendingFailure = { attackerId, defenderId, moveId };
    state.phase = 'REACTION';
    state.pendingFailure.counterOptions=legalCounterMoves({moves:demoMoves,reactor:defender,opponent:attacker}).map(m=>({id:m.id,name:m.name,staminaCost:m.staminaCost}));
    const reactionAvailable=canReact(state);
    if (!reactionAvailable) {
      state.phase = 'ACTION_SELECT';
      state.pendingFailure=null;
      // Existing H/L stays. A failed action from the special N/N kickout turn returns to Neutral.
      if (state.neutralAction || roleFor(state, attackerId) === 'N') beginNeutral(state);
      else state.activeWrestlerId = attackerId;
    }
    return result;
  }

  state.pendingFailure = null;
  const listedStaminaDamage = Number(move.staminaDamage || 0);
  // Cover Up cushions one incoming landed move, but cannot reduce its nominal
  // damage to the point that attacking becomes net stamina-negative.
  const guard=Number(defender.groundGuard||0);
  const mitigated=Math.min(guard,Math.max(0,listedStaminaDamage-move.staminaCost-1));
  defender.groundGuard=0;
  const defenderBefore = defender.stamina;
  defender.stamina = Math.max(0, defender.stamina - (listedStaminaDamage-mitigated));
  result.guardAbsorbed=mitigated;
  // Reports actual stamina drained, never a value greater than what remains.
  result.staminaDamage = defenderBefore - defender.stamina;
  result.listedStaminaDamage = listedStaminaDamage;
  result.crowdGained = awardCrowd(attacker, move.crowdGain || 0);
  if (resolvedTarget && move.category !== 'setup') result.damage = applyDamageMark(defender, resolvedTarget, damageRoll, guard?2:0);

  if (move.result?.defenderPosture && !move.result.preserveDefenderPosture) defender.posture = move.result.defenderPosture;
  if (move.result?.attackerPosture) attacker.posture = move.result.attackerPosture;
  attacker.condition = deriveCondition(attacker);
  defender.condition = deriveCondition(defender);

  // If this was the post-kickout N/N action, success establishes H/L.
  if (state.neutralAction || roleFor(state, attackerId) === 'N') setRoles(state, attackerId);
  state.neutralAction = false;
  state.activeWrestlerId = attackerId;

  if (defender.stamina <= 0) state.mustFinishTargetId = defenderId;
  else if (state.mustFinishTargetId === defenderId) state.mustFinishTargetId = null;

  // Sustained holds enter their own turn cycle rather than resetting to the
  // normal action menu. The initial impact costs and damages once only.
  if (move.sustained) {
    state.activeHold={
      moveId:move.id,holderId:attackerId,defenderId,
      target:resolvedTarget,ticks:0,escapes:0,tickCost:move.sustained.tickCost,
      // Every successful grapple immediately grants its defender an escape roll.
      // Even a zero-stamina rival can attempt one final escape before a tapout.
      finishPending:defender.stamina===0
    };
    state.pinEligible=false;state.pinningWrestlerId=null;
    result.activeHold=structuredClone(state.activeHold);
    state.phase='HOLD_ESCAPE';
    return result;
  }
  state.pinEligible = defender.posture === 'prone' && move.category !== 'setup';
  state.pinningWrestlerId = state.pinEligible ? attackerId : null;
  result.pinEligible = state.pinEligible;
  result.forcedPin = state.pinEligible && defender.stamina <= 0;
  state.phase = state.pinEligible ? 'PIN_OPPORTUNITY' : 'ACTION_SELECT';
  return result;
}


// Wrestling holds are a continuing state, not instant attacks.
// A successful opener gets a persistent hold; holder may tighten, with the
// trapped wrestler getting a contest after every squeeze, or release freely.
// Release retains High control and creates a normal pin opportunity.
export function maintainHold(state){
  const hold=state.activeHold;
  if(!hold||!validateCombatAction(state,ACTION_IDS.HOLD_SQUEEZE,hold.holderId).ok)return {ok:false,reason:'No active holder turn or insufficient stamina'};
  const move=demoMoves.find(m=>m.id===hold.moveId),spec=move?.sustained;
  const holder=wrestler(state,hold.holderId),defender=wrestler(state,hold.defenderId);
  if(!spec||holder.stamina<spec.tickCost)return {ok:false,reason:'Not enough stamina to maintain the hold'};
  holder.stamina-=spec.tickCost;
  const before=defender.stamina;
  defender.stamina=Math.max(0,before-spec.tickDamage);
  const actual=before-defender.stamina;
  hold.ticks++;
  state.turnCounter++;
  holder.condition=deriveCondition(holder);defender.condition=deriveCondition(defender);
  // Pressure never removes the opponent's defensive turn. When exhausted,
  // the next failed escape check ends the match by submission; a good roll
  // still breaks the hold regardless of High/Low status.
  if(defender.stamina===0)hold.finishPending=true;
  state.phase='HOLD_ESCAPE';
  return {ok:true,submitted:false,finishPending:Boolean(hold.finishPending),moveId:move.id,
    holderId:hold.holderId,defenderId:hold.defenderId,cost:spec.tickCost,
    staminaDamage:actual,ticks:hold.ticks};
}
export function releaseHold(state){
  const hold=state.activeHold;
  if(!hold||!validateCombatAction(state,ACTION_IDS.HOLD_RELEASE,hold.holderId).ok)return {ok:false,reason:'No releasable hold'};
  const id=hold.holderId;
  state.activeHold=null;state.pendingFailure=null;
  state.activeWrestlerId=id;
  setRoles(state,id);
  const defender=wrestler(state,hold.defenderId);
  state.pinEligible=defender.posture==='prone';
  state.pinningWrestlerId=state.pinEligible?id:null;
  state.phase=state.pinEligible?'PIN_OPPORTUNITY':'ACTION_SELECT';
  return {ok:true,holderId:id,defenderId:hold.defenderId,pinEligible:state.pinEligible};
}
export function escapeHold(state,{escapeRoll}={}){
  const hold=state.activeHold;
  if(!hold||!validateCombatAction(state,ACTION_IDS.HOLD_ESCAPE,hold.defenderId).ok||!Number.isInteger(escapeRoll)||escapeRoll<1||escapeRoll>20)
    return {ok:false,reason:'No legal escape attempt'};
  const holder=wrestler(state,hold.holderId),defender=wrestler(state,hold.defenderId);
  const move=demoMoves.find(m=>m.id===hold.moveId),spec=move.sustained;
  const before=defender.stamina;
  defender.stamina=Math.max(0,defender.stamina-spec.escapeCost);
  const modifier=statModifier(defender.stats.Agility);
  const targetNumber=10+statModifier(holder.stats[spec.holdStat])+Math.min(3,hold.ticks);
  const total=escapeRoll+modifier;
  const success=total>=targetNumber;
  hold.escapes++;state.turnCounter++;
  defender.condition=deriveCondition(defender);
  if(success){
    state.activeHold=null;
    beginNeutral(state,{resetPostures:true});
    state.mustFinishTargetId=null;
    return {ok:true,success:true,escapeRoll,modifier,total,targetNumber,staminaCost:before-defender.stamina,defenderId:hold.defenderId};
  }
  if(hold.finishPending){
    // The defender DID receive the final escape roll; only its failure forces
    // submission. This roll is available even with zero remaining stamina.
    state.winnerId=hold.holderId;
    state.winMethod='submission';
    state.activeWrestlerId=null;
    state.activeHold=null;
    state.phase='MATCH_COMPLETE';
    return {ok:true,success:false,submitted:true,escapeRoll,modifier,total,targetNumber,
      staminaCost:before-defender.stamina,defenderId:hold.defenderId,holderId:hold.holderId};
  }
  state.phase='HOLD';
  state.activeWrestlerId=hold.holderId;
  return {ok:true,success:false,escapeRoll,modifier,total,targetNumber,staminaCost:before-defender.stamina,defenderId:hold.defenderId,ticks:hold.ticks};
}

export function declineReaction(state) {
  if (!state.pendingFailure||!validateCombatAction(state,ACTION_IDS.PASS_REACTION,state.pendingFailure.defenderId).ok) return { ok: false };
  const attackerId = state.pendingFailure.attackerId;
  state.pendingFailure = null;
  if (roleFor(state, attackerId) === 'N' || state.neutralAction) {
    beginNeutral(state);
    return { ok: true, neutral: true };
  }
  state.activeWrestlerId = attackerId;
  state.phase = 'ACTION_SELECT';
  return { ok: true, retainedBy: attackerId };
}

export function resolveReaction(state, { reactionRoll, damageRoll, reactionMoveId=null }) {
  if (!state.pendingFailure) throw new Error('No reaction is pending.');
  requireCombatAction(state,ACTION_IDS.REACT,state.pendingFailure.defenderId);
  const originalAttackerId = state.pendingFailure.attackerId;
  const reactorId = state.pendingFailure.defenderId;
  const originalAttacker = wrestler(state, originalAttackerId);
  const reactor = wrestler(state, reactorId);
  const legal=getAvailableReactions(state);
  const selected=legal.find(m=>m.id===(reactionMoveId||legal[0]?.id));
  if(!selected)throw new Error('Unlearned or illegal counter move');
  if(!Number.isInteger(reactionRoll)||reactionRoll<1||reactionRoll>20)throw new Error('Invalid counter d20');
  reactor.stamina = Math.max(0, reactor.stamina - selected.staminaCost);
  const modifier = statModifier(reactor.stats[selected.stat]);
  const targetNumber = conditioning(originalAttacker);
  const total = reactionRoll + modifier;
  const success = total >= targetNumber;
  const result = {
    success,
    reactorId,
    originalAttackerId,
    move:selected,
    reactionRoll,
    modifier,
    total,
    targetNumber,
    damage: null,
    staminaDamage: 0,
    crowdGained: 0
  };

  state.pendingFailure = null;
  state.turnCounter += 1;

  if (!success) {
    if (roleFor(state, originalAttackerId) === 'N' || state.neutralAction) {
      beginNeutral(state);
    } else {
      state.activeWrestlerId = originalAttackerId;
      state.phase = 'ACTION_SELECT';
    }
    return result;
  }

  const opponentBefore = originalAttacker.stamina;
  originalAttacker.stamina = Math.max(0, originalAttacker.stamina - selected.staminaDamage);
  result.staminaDamage = opponentBefore - originalAttacker.stamina;
  result.listedStaminaDamage = selected.staminaDamage;
  const target=selected.targeting?.bodyParts?.[0]||'core';
  result.target=target;
  result.damage = applyDamageMark(originalAttacker, target, damageRoll);
  result.crowdGained = awardCrowd(reactor, selected.crowdGain || 0);
  reactor.posture = selected.result?.attackerPosture || reactor.posture;
  originalAttacker.posture = selected.result?.preserveDefenderPosture?originalAttacker.posture:(selected.result?.defenderPosture||originalAttacker.posture);
  reactor.condition = deriveCondition(reactor);
  originalAttacker.condition = deriveCondition(originalAttacker);
  if (originalAttacker.stamina <= 0) state.mustFinishTargetId = originalAttackerId;
  giveControl(state, reactorId);
  if(originalAttacker.posture==='prone'){
    state.pinEligible=true;state.pinningWrestlerId=reactorId;state.phase='PIN_OPPORTUNITY';
  }
  return result;
}

export function startPin(state) {
  requireCombatAction(state,ACTION_IDS.PIN,state.pinningWrestlerId);
  if (!state.pinEligible || !state.pinningWrestlerId) throw new Error('No pin opportunity is available.');
  state.phase = 'PIN';
  state.pinCount = 0;
  return {
    pinningId: state.pinningWrestlerId,
    pinnedId: opponentId(state.pinningWrestlerId),
    count: 0
  };
}

export function resolvePinCount(state, { pinningId, count, pinningRoll, pinnedRoll }) {
  if(pinningId!==state.pinningWrestlerId)throw new Error('Wrong pinning wrestler.');
  const pinnedId = opponentId(pinningId);
  requireCombatAction(state,ACTION_IDS.COUNT_PIN,pinnedId);
  if(count!==Number(state.pinCount||0)+1 || count<1 || count>3)throw new Error('Pin counts must resolve in order');
  if(![pinningRoll,pinnedRoll].every(n=>Number.isInteger(n)&&n>=1&&n<=20))throw new Error('Invalid opposed pin rolls');
  state.pinCount=count;
  const pinning = wrestler(state, pinningId);
  const pinned = wrestler(state, pinnedId);
  const pinningPenalty = pinning.bodyDamage.core || 0;
  const pinnedPenalty = totalBodyMarks(pinned);
  const pinningTotal = pinningRoll - pinningPenalty;
  const pinnedTotal = pinnedRoll - pinnedPenalty;
  const kickout = pinnedTotal > pinningTotal;

  const result = {
    count,
    pinningId,
    pinnedId,
    pinningRoll,
    pinnedRoll,
    pinningPenalty,
    pinnedPenalty,
    pinningTotal,
    pinnedTotal,
    kickout,
    pinfall: false
  };

  if (kickout) {
    state.pinEligible = false;
    state.pinningWrestlerId = null;
    state.pinCount=0;
    state.mustFinishTargetId = null;
    pinning.posture = 'prone';
    pinned.posture = 'prone';
    recover(pinned, 10);
    pinning.condition = deriveCondition(pinning);
    pinned.condition = deriveCondition(pinned);
    setRoles(state, null);
    state.activeWrestlerId = pinnedId;
    state.neutralAction = true;
    state.phase = 'ACTION_SELECT';
    return result;
  }

  if (count >= 3) {
    result.pinfall = true;
    state.winnerId = pinningId;
    state.pinCount=0;
    state.winMethod='pinfall';
    state.phase = 'MATCH_COMPLETE';
    state.activeWrestlerId = null;
    return result;
  }

  state.phase = 'PIN';
  return result;
}

// High can choose to forgo a pin, but cannot skip the prone opponent's
// defensive get-up/cover window. Only the Low wrestler owns this decision.
export function resolveGroundDefense(state,{choice,roll}={}){
 const window=groundDefenseWindow(state),id=window?.defenderId;
 if(!window)return {ok:false,reason:'No grounded defensive window'};
 const action=choice==='scramble'?ACTION_IDS.GROUND_SCRAMBLE:
   choice==='cover'?ACTION_IDS.GROUND_COVER:choice==='pass'?ACTION_IDS.GROUND_PASS:null;
 if(!action||!validateCombatAction(state,action,id).ok)return {ok:false,reason:'Illegal grounded response'};
 const defender=wrestler(state,id),controller=wrestler(state,window.controllerId);
 if(choice==='scramble'){
   if(!Number.isInteger(roll)||roll<1||roll>20)return {ok:false,reason:'d20 escape roll required'};
   const spent=Math.min(defender.stamina,GROUND_SCRAMBLE_COST);
   defender.stamina-=spent;
   const mod=statModifier(defender.stats.Agility),targetNumber=groundScrambleTarget(controller,defender);
   const total=roll+mod;
   const success=total>=targetNumber;
   state.turnCounter++;
   state.groundDefense=null;
   if(success){
     defender.posture='kneeling';
     beginNeutral(state);
   }else {
     state.activeWrestlerId=controller.id;
     state.phase='ACTION_SELECT';
   }
   defender.condition=deriveCondition(defender);
   return {ok:true,choice,defenderId:id,controllerId:controller.id,success,roll,modifier:mod,total,targetNumber,cost:spent,posture:defender.posture};
 }
 if(choice==='cover'){
   defender.groundGuard=GROUND_GUARD_VALUE;
   defender.condition=deriveCondition(defender);
 }
 state.turnCounter++;
 state.groundDefense=null;
 state.activeWrestlerId=controller.id;
 state.phase='ACTION_SELECT';
 return {ok:true,choice,defenderId:id,controllerId:controller.id,success:choice==='cover',guard:choice==='cover'?GROUND_GUARD_VALUE:0};
}

export function skipPin(state) {
  const decision=validateCombatAction(state,ACTION_IDS.SKIP_PIN,state.pinningWrestlerId);
  if(!decision.ok)return {ok:false,forced:Boolean(state.pinEligible),reason:decision.reason};
  const forced = state.pinningWrestlerId && wrestler(state, opponentId(state.pinningWrestlerId)).stamina <= 0;
  if (forced) return { ok: false, forced: true };
  const controllerId=state.pinningWrestlerId,defenderId=opponentId(controllerId);
  state.pinEligible = false;
  state.pinningWrestlerId = null;
  state.groundDefense={controllerId,defenderId};
  state.phase='GROUND_DEFENSE';
  return {ok:true,defenderId,controllerId,defenseWindow:true};
}

export function matchSnapshot(state) {
  return {
    phase: state.phase,
    activeWrestlerId: state.activeWrestlerId,
    roles: { ...state.roles },
    winnerId: state.winnerId,
    turnCounter: state.turnCounter,
    pinEligible: state.pinEligible,
    wrestlers: Object.fromEntries(Object.entries(state.wrestlers).map(([id, w]) => [id, {
      stamina: w.stamina,
      crowdResource: w.crowdResource,
      posture: w.posture,
      bodyDamage: { ...w.bodyDamage }
    }]))
  };
}
