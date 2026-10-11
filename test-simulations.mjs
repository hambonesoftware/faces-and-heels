import assert from 'node:assert/strict';
import {demoMoves} from './moves.js';
import {
  cloneInitialState,
  wrestler,
  opponentId,
  resolveNeutralRoll,
  getLegalMoves,
  checkCombatFlow,
  resolveMoveAttempt,
  canReact,
  resolveReaction,
  declineReaction,
  startPin,
  resolvePinCount,
  skipPin,
  spendCrowdForStamina,
  catchBreathToNeutral,
  scrambleUp,
  perspectiveState,
  totalBodyMarks,
  maintainHold,
  escapeHold,
  releaseHold
} from './match-engine.js';
import { resolveTargetDecision } from './flow-engine.js';

function rngFactory(seed) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function die(rng, sides) {
  return 1 + Math.floor(rng() * sides);
}

function choose(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function chooseMove(rng, legal, state) {
  const actor = wrestler(state, state.activeWrestlerId);
  const defender = wrestler(state, opponentId(state.activeWrestlerId));
  const finisher = legal.find(move => move.legendary === true);
  if (finisher && (defender.stamina <= 20 || rng() < 0.45)) return finisher;
  const proneMakers = legal.filter(move => move.result?.defenderPosture === 'prone');
  if (state.mustFinishTargetId === defender.id && proneMakers.length) return choose(rng, proneMakers);
  const crowdMoves = legal.filter(move => move.crowdGain > 0);
  if (actor.crowdResource < 2 && crowdMoves.length && rng() < 0.35) return choose(rng, crowdMoves);
  return choose(rng, legal);
}

function validateState(state, context) {
  const audit=checkCombatFlow(state);
  assert.ok(audit.ok, `Turn-controller deadlock at ${context}: ${audit.issues.join('; ')} phase=${state.phase}`);
  const roles = Object.values(state.roles);
  const h = roles.filter(role => role === 'H').length;
  const l = roles.filter(role => role === 'L').length;
  const n = roles.filter(role => role === 'N').length;
  assert.ok((h === 1 && l === 1 && n === 0) || (h === 0 && l === 0 && n === 2), `Invalid H/N/L roles at ${context}: ${JSON.stringify(state.roles)}`);

  for (const id of ['stone', 'viper']) {
    const w = wrestler(state, id);
    assert.ok(w.stamina >= 0 && w.stamina <= w.maxStamina, `${id} stamina out of bounds at ${context}: ${w.stamina}`);
    assert.ok(w.crowdResource >= 0 && w.crowdResource <= 5, `${id} crowd resource out of bounds at ${context}: ${w.crowdResource}`);
    for (const [part, marks] of Object.entries(w.bodyDamage)) {
      assert.ok(marks >= 0 && marks <= 3, `${id} ${part} marks out of bounds at ${context}: ${marks}`);
    }
  }

  if (state.phase === 'ACTION_SELECT') assert.ok(state.activeWrestlerId, `ACTION_SELECT lacks active wrestler at ${context}`);
  if (state.phase === 'MATCH_COMPLETE') assert.ok(state.winnerId, `MATCH_COMPLETE lacks winner at ${context}`);
  if (state.winnerId) assert.equal(state.phase, 'MATCH_COMPLETE', `Winner exists outside MATCH_COMPLETE at ${context}`);
  if (state.pinEligible) assert.ok(state.pinningWrestlerId, `Pin eligible without pinning wrestler at ${context}`);
}

function simulateMatch(seed, maxSteps = 600) {
  const rng = rngFactory(seed);
  const state = cloneInitialState();
  let steps = 0;
  let pinAttempts = 0;
  let reactions = 0;
  let successfulReactions = 0;
  let failedReactions = 0;
  let controlChanges = 0;
  let neutralRolls = 0;
  let recoveries = 0;
  let scrambles = 0;
  let moveHits = 0;
  let moveMisses = 0;
  let bodyMarksAdded = 0;
  let crowdRollSpends = 0;
  let crowdStaminaSpends = 0;
  let kickouts = 0;
  let holdPressures=0,holdEscapes=0,holdReleases=0,submissions=0;
  const kickoutCounts = { 1: 0, 2: 0, 3: 0 };

  validateState(state, `seed ${seed} start`);

  while (!state.winnerId && steps < maxSteps) {
    steps += 1;
    validateState(state, `seed ${seed} step ${steps} pre`);

    if (state.phase === 'NEUTRAL_ROLL') {
      neutralRolls += 1;
      const beforeHigh = Object.entries(state.roles).find(([, role]) => role === 'H')?.[0] || null;
      const result = resolveNeutralRoll(state, die(rng, 20), die(rng, 20));
      const nextHigh = Object.entries(state.roles).find(([, role]) => role === 'H')?.[0] || null;
      if (!result.tie && beforeHigh !== nextHigh) controlChanges += 1;
      validateState(state, `seed ${seed} step ${steps} neutral`);
      continue;
    }

    if (state.phase === 'REACTION') {
      if (canReact(state) && rng() < 0.72) {
        reactions += 1;
        const previousHigh = Object.entries(state.roles).find(([, role]) => role === 'H')?.[0] || null;
        const result = resolveReaction(state, { reactionRoll: die(rng, 20), damageRoll: die(rng, 6) });
        if (result.success) {
          successfulReactions += 1;
          if (result.damage?.marked) bodyMarksAdded += 1;
        } else {
          failedReactions += 1;
        }
        const nextHigh = Object.entries(state.roles).find(([, role]) => role === 'H')?.[0] || null;
        if (previousHigh !== nextHigh && nextHigh) controlChanges += 1;
      } else {
        declineReaction(state);
      }
      validateState(state, `seed ${seed} step ${steps} reaction`);
      continue;
    }

    if(state.phase==='HOLD'){
      const hold=state.activeHold;
      assert.ok(hold,'HOLD requires active hold');
      const holder=wrestler(state,hold.holderId);
      const spec=demoMoves.find(move=>move.id===hold.moveId)?.sustained;
      if(!spec||holder.stamina<spec.tickCost||rng()<.22){
        const release=releaseHold(state);
        assert.ok(release.ok,'Hold should release');
        holdReleases++;
      }else{
        const effect=maintainHold(state);
        assert.ok(effect.ok,'Hold must tighten');
        holdPressures++;
        if(effect.finishPending)assert.equal(state.phase,'HOLD_ESCAPE','Submission must allow final defensive roll');
      }
      validateState(state,`seed ${seed} hold pressure`);
      continue;
    }
    if(state.phase==='HOLD_ESCAPE'){
      const outcome=escapeHold(state,{escapeRoll:die(rng,20)});
      assert.ok(outcome.ok,'Defender must be allowed to escape');
      if(outcome.success)holdEscapes++;
      if(outcome.submitted)submissions++;
      validateState(state,`seed ${seed} hold escape`);
      continue;
    }

    if (state.phase === 'PIN_OPPORTUNITY') {
      const pinningId = state.pinningWrestlerId;
      const pinnedId = opponentId(pinningId);
      const forced = wrestler(state, pinnedId).stamina <= 0;
      if (!forced && rng() >= 0.80) {
        skipPin(state);
        validateState(state, `seed ${seed} step ${steps} skip pin`);
        continue;
      }
      pinAttempts += 1;
      const pin = startPin(state);
      for (const count of [1, 2, 3]) {
        const result = resolvePinCount(state, {
          pinningId: pin.pinningId,
          count,
          pinningRoll: die(rng, 20),
          pinnedRoll: die(rng, 20)
        });
        if (result.kickout) {
          kickouts += 1;
          kickoutCounts[count] += 1;
          break;
        }
        if (result.pinfall) break;
      }
      validateState(state, `seed ${seed} step ${steps} pin`);
      continue;
    }

    if (state.phase === 'MATCH_COMPLETE') break;

    assert.equal(state.phase, 'ACTION_SELECT', `Unexpected phase ${state.phase}`);
    assert.ok(state.activeWrestlerId, 'ACTION_SELECT requires an active wrestler');
    const actor = wrestler(state, state.activeWrestlerId);
    let legal = getLegalMoves(state);

    if (!legal.length && actor.posture === 'prone') {
      const up = scrambleUp(state, actor.id);
      assert.equal(up.ok, true, 'Prone actor with no legal move must be able to scramble up');
      scrambles += 1;
      legal = getLegalMoves(state);
    }

    if (!legal.length && actor.crowdResource > 0 && actor.stamina < actor.maxStamina) {
      const recovered = spendCrowdForStamina(state, actor.id, 1);
      assert.equal(recovered.ok, true);
      recoveries += 1;
      crowdStaminaSpends += recovered.spent;
      legal = getLegalMoves(state);
    }

    if (!legal.length) {
      catchBreathToNeutral(state, actor.id);
      recoveries += 1;
      validateState(state, `seed ${seed} step ${steps} catch breath`);
      continue;
    }

    if (actor.crowdResource > 0 && actor.stamina <= 12 && rng() < 0.45) {
      const recovered = spendCrowdForStamina(state, actor.id, 1);
      if (recovered.ok) {
        recoveries += 1;
        crowdStaminaSpends += recovered.spent;
        legal = getLegalMoves(state);
      }
    }

    const move = chooseMove(rng, legal, state);
    const decision = resolveTargetDecision(move, perspectiveState(state));
    let target = null;
    if (decision.kind === 'choice') target = choose(rng, decision.values);
    else target = decision.values[0] || null;
    const crowdSpend = actor.crowdResource > 0 && rng() < 0.22 ? 1 : 0;
    const previousHigh = Object.entries(state.roles).find(([, role]) => role === 'H')?.[0] || null;
    const result = resolveMoveAttempt(state, {
      moveId: move.id,
      target,
      attackRoll: die(rng, 20),
      damageRoll: die(rng, move.damageDie),
      crowdSpend
    });
    crowdRollSpends += result.spentCrowd;
    if (result.success) {
      moveHits += 1;
      if (result.damage?.marked) bodyMarksAdded += 1;
    } else {
      moveMisses += 1;
    }
    const nextHigh = Object.entries(state.roles).find(([, role]) => role === 'H')?.[0] || null;
    if (previousHigh && nextHigh && previousHigh !== nextHigh) controlChanges += 1;
    validateState(state, `seed ${seed} step ${steps} move`);
  }

  validateState(state, `seed ${seed} end`);
  return {
    seed,
    winnerId: state.winnerId,
    steps,
    pinAttempts,
    reactions,
    successfulReactions,
    failedReactions,
    controlChanges,
    neutralRolls,
    recoveries,
    scrambles,
    moveHits,
    moveMisses,
    bodyMarksAdded,
    crowdRollSpends,
    crowdStaminaSpends,
    kickouts,
    holdPressures,holdEscapes,holdReleases,submissions,
    kickoutCounts,
    terminalPhase: state.phase,
    finalStoneMarks: totalBodyMarks(wrestler(state, 'stone')),
    finalViperMarks: totalBodyMarks(wrestler(state, 'viper'))
  };
}

const MATCHES = Number(process.env.FH_SIM_MATCHES || 1000);
assert.ok(MATCHES >= 1, 'FH_SIM_MATCHES must be positive');

// Determinism gate: same seed must produce the same summary.
for (let seed = 1; seed <= 10; seed++) {
  assert.deepEqual(simulateMatch(seed), simulateMatch(seed), `Seed ${seed} was not deterministic`);
}

const results = [];
for (let i = 1; i <= MATCHES; i++) results.push(simulateMatch(0xF00D0000 + i));

const failures = results.filter(result => !result.winnerId || result.terminalPhase !== 'MATCH_COMPLETE');
assert.equal(failures.length, 0, `${failures.length} simulated matches failed to reach MATCH_COMPLETE`);
assert.ok(results.every(result => result.steps < 600), 'A simulation hit the step safety cap');

const wins = results.reduce((acc, result) => {
  acc[result.winnerId] = (acc[result.winnerId] || 0) + 1;
  return acc;
}, {});
assert.ok((wins.stone || 0) > 0 && (wins.viper || 0) > 0, 'Both wrestlers must win at least one match in the batch');

const sum = key => results.reduce((total, result) => total + result[key], 0);
const avg = key => sum(key) / results.length;
const max = key => Math.max(...results.map(result => result[key]));
const kickoutCountTotals = results.reduce((acc, result) => {
  for (const count of [1,2,3]) acc[count] += result.kickoutCounts[count];
  return acc;
}, {1:0,2:0,3:0});

assert.ok(sum('moveHits') > 0 && sum('moveMisses') > 0, 'Batch must include successful and failed moves');
assert.ok(sum('successfulReactions') > 0 && sum('failedReactions') > 0, 'Batch must include successful and failed Reactions');
assert.ok(sum('controlChanges') > 0, 'Batch must include H/L control changes');
assert.ok(sum('pinAttempts') > 0 && sum('kickouts') > 0, 'Batch must include Pins and kickouts');
assert.ok(sum('bodyMarksAdded') > 0, 'Batch must accumulate body marks');
assert.ok(sum('crowdRollSpends') > 0 && sum('crowdStaminaSpends') > 0, 'Batch must exercise both crowd spend paths');
assert.ok(sum('scrambles') > 0, 'Batch must exercise post-kickout Scramble Up');
assert.ok(kickoutCountTotals[1] > 0 && kickoutCountTotals[2] > 0 && kickoutCountTotals[3] > 0, 'Batch must include kickouts at counts 1, 2, and 3');

console.log(`Full-match simulations passed: ${MATCHES}`);
console.log(`Wins: Stone ${wins.stone || 0}, Viper ${wins.viper || 0}`);
console.log(`Average steps: ${avg('steps').toFixed(1)} (max ${max('steps')})`);
console.log(`Average pin attempts: ${avg('pinAttempts').toFixed(2)}`);
console.log(`Average reactions: ${avg('reactions').toFixed(2)} (${sum('successfulReactions')} success / ${sum('failedReactions')} fail total)`);
console.log(`Average control changes: ${avg('controlChanges').toFixed(2)}`);
console.log(`Average neutral rolls: ${avg('neutralRolls').toFixed(2)}`);
console.log(`Average recovery actions: ${avg('recoveries').toFixed(2)}`);
console.log(`Average post-kickout scrambles: ${avg('scrambles').toFixed(2)}`);
console.log(`Kickouts by count: 1=${kickoutCountTotals[1]}, 2=${kickoutCountTotals[2]}, 3=${kickoutCountTotals[3]}`);
console.log(`Crowd spends: roll boosts=${sum('crowdRollSpends')}, stamina recovery=${sum('crowdStaminaSpends')}`);
console.log(`Body marks added: ${sum('bodyMarksAdded')}`);
console.log(`Submissions: ${sum('submissions')}; holds pressured ${sum('holdPressures')}, escaped ${sum('holdEscapes')}, released ${sum('holdReleases')}`);
