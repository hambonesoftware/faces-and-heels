import assert from 'node:assert/strict';
import {
  cloneInitialState,
  wrestler,
  statModifier,
  conditioning,
  resolveNeutralRoll,
  getLegalMoves,
  resolveMoveAttempt,
  canReact,
  resolveReaction,
  startPin,
  resolvePinCount,
  skipPin,
  scrambleUp,
  spendCrowdForStamina
} from './match-engine.js';

assert.equal(statModifier(16), 3);
assert.equal(statModifier(15), 2);
assert.equal(conditioning(cloneInitialState().wrestlers.stone), 12);

const state = cloneInitialState();
assert.equal(state.phase, 'NEUTRAL_ROLL');
const neutral = resolveNeutralRoll(state, 18, 9);
assert.equal(neutral.winnerId, 'stone');
assert.equal(state.roles.stone, 'H');
assert.equal(state.roles.viper, 'L');
assert.equal(state.activeWrestlerId, 'stone');

const clothesline = getLegalMoves(state).find(move => move.id === 'running-clothesline');
assert.ok(clothesline);
const hit = resolveMoveAttempt(state, {
  moveId: clothesline.id,
  target: 'head',
  attackRoll: 18,
  damageRoll: 9,
  crowdSpend: 0
});
assert.equal(hit.success, true);
assert.equal(state.wrestlers.viper.posture, 'prone');
assert.equal(state.pinEligible, true, 'all successful moves ending prone create pin eligibility');
assert.equal(state.pinningWrestlerId, 'stone');
assert.equal(state.wrestlers.viper.bodyDamage.head, 1);
assert.equal(state.wrestlers.stone.crowdResource, 3, 'crowd-gaining move should award Pop');

assert.equal(skipPin(state).ok, true);
assert.equal(state.phase, 'ACTION_SELECT');

// Missed ground control opens a real reaction, and successful reaction transfers H.
const headlock = getLegalMoves(state).find(move => move.id === 'ground-headlock');
assert.ok(headlock);
const miss = resolveMoveAttempt(state, {
  moveId: headlock.id,
  target: 'core',
  attackRoll: 1,
  damageRoll: 1,
  crowdSpend: 0
});
assert.equal(miss.success, false);
assert.equal(state.phase, 'REACTION');
assert.equal(canReact(state), true);
const reaction = resolveReaction(state, { reactionRoll: 20, damageRoll: 6 });
assert.equal(reaction.success, true);
assert.equal(state.activeWrestlerId, 'viper');
assert.equal(state.roles.viper, 'H');
assert.equal(state.roles.stone, 'L');

// Viper can immediately use the same move engine after stealing control.
const viperForearm = getLegalMoves(state).find(move => move.id === 'forearm-smash');
assert.ok(viperForearm);
const stoneStaminaBeforeViperHit = state.wrestlers.stone.stamina;
const viperHit = resolveMoveAttempt(state, {
  moveId: viperForearm.id,
  target: 'head',
  attackRoll: 20,
  damageRoll: 8,
  crowdSpend: 0
});
assert.equal(viperHit.success, true);
assert.ok(state.wrestlers.stone.stamina < stoneStaminaBeforeViperHit);
assert.equal(state.activeWrestlerId, 'viper');
assert.equal(state.roles.viper, 'H');

// Direct pin test: defender winning any opposed roll kicks out and gets next N/N action.
const pinState = cloneInitialState();
resolveNeutralRoll(pinState, 20, 1);
pinState.wrestlers.viper.posture = 'prone';
pinState.pinEligible = true;
pinState.pinningWrestlerId = 'stone';
const pin = startPin(pinState);
assert.equal(pin.pinningId, 'stone');
const kickout = resolvePinCount(pinState, { pinningId: 'stone', count: 1, pinningRoll: 5, pinnedRoll: 19 });
assert.equal(kickout.kickout, true);
assert.equal(pinState.roles.stone, 'N');
assert.equal(pinState.roles.viper, 'N');
assert.equal(pinState.activeWrestlerId, 'viper');
assert.equal(pinState.neutralAction, true);
assert.equal(pinState.wrestlers.stone.posture, 'prone');
assert.equal(pinState.wrestlers.viper.posture, 'prone');
assert.equal(getLegalMoves(pinState).length, 0, 'limited demo move list intentionally needs the post-kickout scramble bridge');
assert.equal(scrambleUp(pinState, 'viper').ok, true);
assert.equal(pinState.wrestlers.viper.posture, 'standing');
assert.ok(getLegalMoves(pinState).some(move => move.id === 'armbar'), 'Viper can use a learned ground grapple after kickout');

// Pinfall completes the match if the defender never wins a count.
const pinfallState = cloneInitialState();
resolveNeutralRoll(pinfallState, 20, 1);
pinfallState.wrestlers.viper.posture = 'prone';
pinfallState.pinEligible = true;
pinfallState.pinningWrestlerId = 'stone';
startPin(pinfallState);
for (const count of [1, 2, 3]) {
  const result = resolvePinCount(pinfallState, { pinningId: 'stone', count, pinningRoll: 20, pinnedRoll: 1 });
  if (count < 3) assert.equal(result.pinfall, false);
  else assert.equal(result.pinfall, true);
}
assert.equal(pinfallState.phase, 'MATCH_COMPLETE');
assert.equal(pinfallState.winnerId, 'stone');

// Crowd resource converts to stamina without exceeding max.
const recoveryState = cloneInitialState();
recoveryState.wrestlers.stone.stamina = 20;
const recovery = spendCrowdForStamina(recoveryState, 'stone', 1);
assert.equal(recovery.ok, true);
assert.equal(recoveryState.wrestlers.stone.stamina, 30);
assert.equal(recoveryState.wrestlers.stone.crowdResource, 1);

console.log('v1.3 complete-match-loop unit tests passed.');
