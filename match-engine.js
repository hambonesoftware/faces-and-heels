import { demoMoves, demoState, reactionMove } from './moves.js';
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
  state.phase = 'ACTION_SELECT';
}

export function beginNeutral(state, { resetPostures = false } = {}) {
  state.phase = 'NEUTRAL_ROLL';
  state.activeWrestlerId = null;
  state.neutralAction = false;
  state.pinEligible = false;
  state.pinningWrestlerId = null;
  state.pendingFailure = null;
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

export function getLegalMoves(state, actorId = state.activeWrestlerId) {
  if (!actorId || state.winnerId) return [];
  const perspective = perspectiveState(state, actorId);
  let moves = demoMoves.filter(move => isMoveLegal(move, perspective));
  const defender = perspective.defender;
  if (state.mustFinishTargetId === defender.id && defender.stamina <= 0 && defender.posture !== 'prone') {
    moves = moves.filter(move => move.result?.defenderPosture === 'prone');
  }
  return moves;
}

export function canReact(state) {
  if (!state.pendingFailure) return false;
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
  if (!w || w.posture !== 'prone') return { ok: false };
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
  if (!isMoveLegal(move, perspective)) throw new Error(`${move.name} is not legal in the current state.`);

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
  const success = total >= targetNumber;

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
  defender.stamina = Math.max(0, defender.stamina - Number(move.staminaDamage || 0));
  result.staminaDamage = Number(move.staminaDamage || 0);
  result.crowdGained = awardCrowd(attacker, move.crowdGain || 0);
  if (resolvedTarget) result.damage = applyDamageMark(defender, resolvedTarget, damageRoll);

  if (move.result?.defenderPosture) defender.posture = move.result.defenderPosture;
  if (move.result?.attackerPosture) attacker.posture = move.result.attackerPosture;
  attacker.condition = deriveCondition(attacker);
  defender.condition = deriveCondition(defender);

  // If this was the post-kickout N/N action, success establishes H/L.
  if (state.neutralAction || roleFor(state, attackerId) === 'N') setRoles(state, attackerId);
  state.neutralAction = false;
  state.activeWrestlerId = attackerId;

  if (defender.stamina <= 0) state.mustFinishTargetId = defenderId;
  else if (state.mustFinishTargetId === defenderId) state.mustFinishTargetId = null;

  state.pinEligible = defender.posture === 'prone';
  state.pinningWrestlerId = state.pinEligible ? attackerId : null;
  result.pinEligible = state.pinEligible;
  result.forcedPin = state.pinEligible && defender.stamina <= 0;
  state.phase = state.pinEligible ? 'PIN_OPPORTUNITY' : 'ACTION_SELECT';
  return result;
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

  originalAttacker.stamina = Math.max(0, originalAttacker.stamina - reactionMove.staminaDamage);
  result.staminaDamage = reactionMove.staminaDamage;
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
