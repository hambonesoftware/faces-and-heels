import { demoMoves, demoState, reactionMove } from './moves.js';
import {isLegendaryLearnable,MAX_LEGENDARY_MOVES,getLegendaryCandidate} from './legendary-catalog.js';
import { isMoveLegal, resolveTargetDecision } from './flow-engine.js';

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
  state.activeHold = null;
  state.phase = 'ACTION_SELECT';
}

export function beginNeutral(state, { resetPostures = false } = {}) {
  state.phase = 'NEUTRAL_ROLL';
  state.activeWrestlerId = null;
  state.neutralAction = false;
  state.pinEligible = false;
  state.pinningWrestlerId = null;
  state.pendingFailure = null;
  state.activeHold = null;
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
  if (!actorId || state.winnerId || state.activeHold) return [];
  const perspective = perspectiveState(state, actorId);
  let moves = demoMoves.filter(move => isMoveKnown(perspective.attacker,move) && isMoveLegal(move, perspective));
  const defender = perspective.defender;
  if (state.mustFinishTargetId === defender.id && defender.stamina <= 0 && defender.posture !== 'prone') {
    moves = moves.filter(move => move.category !== 'setup' && move.result?.defenderPosture === 'prone' && move.staminaDamage > 0);
  }
  return moves;
}

export function canReact(state) {
  if (!state.pendingFailure || state.activeHold) return false;
  const reactor = wrestler(state, state.pendingFailure.defenderId);
  return reactor.stamina >= REACTION_COST;
}

export function spendCrowdForStamina(state, wrestlerId, amount = 1) {
  const w = wrestler(state, wrestlerId);
  const spend = Math.max(0, Math.min(amount, w.crowdResource));
  if (!spend) return { ok: false, gained: 0, spent: 0 };
  w.crowdResource -= spend;
  const gained = recover(w, 10 * spend);
  return { ok: true, gained, spent: spend };
}

export function catchBreathToNeutral(state, wrestlerId) {
  const w = wrestler(state, wrestlerId);
  recover(w, 10);
  beginNeutral(state, { resetPostures: true });
  return { wrestlerId, recovered: 10 };
}

export function scrambleUp(state, wrestlerId) {
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

function applyDamageMark(defender, target, damageRoll) {
  const threshold = bodyThreshold(defender, target);
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
    state.phase = canReact(state) ? 'REACTION' : 'ACTION_SELECT';
    if (!canReact(state)) {
      // Existing H/L stays. A failed action from the special N/N kickout turn returns to Neutral.
      if (state.neutralAction || roleFor(state, attackerId) === 'N') beginNeutral(state);
      else state.activeWrestlerId = attackerId;
    }
    return result;
  }

  state.pendingFailure = null;
  const listedStaminaDamage = Number(move.staminaDamage || 0);
  const defenderBefore = defender.stamina;
  defender.stamina = Math.max(0, defender.stamina - listedStaminaDamage);
  // Reports actual stamina drained, never a value greater than what remains.
  result.staminaDamage = defenderBefore - defender.stamina;
  result.listedStaminaDamage = listedStaminaDamage;
  result.crowdGained = awardCrowd(attacker, move.crowdGain || 0);
  if (resolvedTarget && move.category !== 'setup') result.damage = applyDamageMark(defender, resolvedTarget, damageRoll);

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
      target:resolvedTarget,ticks:0,escapes:0
    };
    state.pinEligible=false;state.pinningWrestlerId=null;
    result.activeHold=structuredClone(state.activeHold);
    state.phase='HOLD';
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
  if(!hold||state.phase!=='HOLD'||state.winnerId)return {ok:false,reason:'No active holder turn'};
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
  // A sustained submission can actually finish the match. The opponent has
  // survived an entry and every intervening contested escape opportunity.
  if(defender.stamina===0){
    state.winnerId=hold.holderId;
    state.winMethod='submission';
    state.activeHold=null;
    state.phase='MATCH_COMPLETE';
    return {ok:true,submitted:true,moveId:move.id,holderId:hold.holderId,defenderId:hold.defenderId,cost:spec.tickCost,staminaDamage:actual};
  }
  state.phase='HOLD_ESCAPE';
  return {ok:true,submitted:false,moveId:move.id,holderId:hold.holderId,defenderId:hold.defenderId,cost:spec.tickCost,staminaDamage:actual,ticks:hold.ticks};
}
export function releaseHold(state){
  const hold=state.activeHold;
  if(!hold||state.phase!=='HOLD')return {ok:false,reason:'No releasable hold'};
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
  if(!hold||state.phase!=='HOLD_ESCAPE'||!Number.isInteger(escapeRoll)||escapeRoll<1||escapeRoll>20)
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
    return {ok:true,success:true,escapeRoll,modifier,total,targetNumber,staminaCost:before-defender.stamina,defenderId:hold.defenderId};
  }
  state.phase='HOLD';
  state.activeWrestlerId=hold.holderId;
  return {ok:true,success:false,escapeRoll,modifier,total,targetNumber,staminaCost:before-defender.stamina,defenderId:hold.defenderId,ticks:hold.ticks};
}

export function declineReaction(state) {
  if (!state.pendingFailure) return { ok: false };
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

export function resolveReaction(state, { reactionRoll, damageRoll }) {
  if (!state.pendingFailure) throw new Error('No reaction is pending.');
  const originalAttackerId = state.pendingFailure.attackerId;
  const reactorId = state.pendingFailure.defenderId;
  const originalAttacker = wrestler(state, originalAttackerId);
  const reactor = wrestler(state, reactorId);
  if (reactor.stamina < REACTION_COST) return declineReaction(state);

  reactor.stamina = Math.max(0, reactor.stamina - REACTION_COST);
  const modifier = statModifier(reactor.stats[reactionMove.stat]);
  const targetNumber = conditioning(originalAttacker);
  const total = reactionRoll + modifier;
  const success = total >= targetNumber;
  const result = {
    success,
    reactorId,
    originalAttackerId,
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
  originalAttacker.stamina = Math.max(0, originalAttacker.stamina - reactionMove.staminaDamage);
  result.staminaDamage = opponentBefore - originalAttacker.stamina;
  result.listedStaminaDamage = reactionMove.staminaDamage;
  result.damage = applyDamageMark(originalAttacker, 'core', damageRoll);
  result.crowdGained = awardCrowd(reactor, reactionMove.crowdGain || 0);
  reactor.posture = reactionMove.result.attackerPosture || 'standing';
  originalAttacker.posture = reactionMove.result.defenderPosture || 'standing';
  reactor.condition = deriveCondition(reactor);
  originalAttacker.condition = deriveCondition(originalAttacker);
  if (originalAttacker.stamina <= 0) state.mustFinishTargetId = originalAttackerId;
  giveControl(state, reactorId);
  return result;
}

export function startPin(state) {
  if (!state.pinEligible || !state.pinningWrestlerId) throw new Error('No pin opportunity is available.');
  state.phase = 'PIN';
  return {
    pinningId: state.pinningWrestlerId,
    pinnedId: opponentId(state.pinningWrestlerId),
    count: 0
  };
}

export function resolvePinCount(state, { pinningId, count, pinningRoll, pinnedRoll }) {
  const pinnedId = opponentId(pinningId);
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
    state.phase = 'MATCH_COMPLETE';
    state.activeWrestlerId = null;
    return result;
  }

  state.phase = 'PIN';
  return result;
}

export function skipPin(state) {
  const forced = state.pinningWrestlerId && wrestler(state, opponentId(state.pinningWrestlerId)).stamina <= 0;
  if (forced) return { ok: false, forced: true };
  state.pinEligible = false;
  state.pinningWrestlerId = null;
  state.phase = 'ACTION_SELECT';
  return { ok: true };
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
