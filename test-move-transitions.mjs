import assert from 'node:assert/strict';
import { cloneInitialState, giveControl, getLegalMoves, resolveMoveAttempt, wrestler } from './match-engine.js';

function use(state, moveId, target = null) {
  return resolveMoveAttempt(state, { moveId, target, attackRoll: 20, damageRoll: 1 });
}

const s = cloneInitialState();
giveControl(s, 'stone');
let stone = wrestler(s, 'stone');
let viper = wrestler(s, 'viper');
assert.equal(stone.posture, 'standing');
assert.equal(viper.posture, 'standing');
assert(getLegalMoves(s).some(m => m.id === 'running-clothesline'));
assert(use(s, 'running-clothesline').success);
assert.equal(viper.posture, 'prone');
assert.equal(s.pinEligible, true);
assert.equal(s.activeWrestlerId, 'stone');

// Skipping the pin must retain control and open contextual ground actions.
import { skipPin,resolveGroundDefense } from './match-engine.js';
assert(skipPin(s).ok);
assert.equal(s.phase,'GROUND_DEFENSE');
assert(resolveGroundDefense(s,{choice:'pass'}).ok,'Low must explicitly complete the defensive window');
assert(getLegalMoves(s).some(m => m.id === 'pick-up-opponent'));
assert(getLegalMoves(s).some(m => m.id === 'elbow-drop'));
const before = stone.stamina;
const pickup = use(s, 'pick-up-opponent');
assert(pickup.success);
assert.equal(viper.posture, 'standing');
assert.equal(stone.stamina, before - 2);
assert.equal(s.activeWrestlerId, 'stone');
assert.equal(s.roles.stone, 'H');
assert.equal(s.roles.viper, 'L');
assert.equal(s.pinEligible, false);
assert(getLegalMoves(s).some(m => m.id === 'vertical-suplex'));
assert(use(s, 'vertical-suplex').success);
assert.equal(viper.posture, 'prone');

// Grounded setup should not create a pin by itself.
assert(skipPin(s).ok);
assert(resolveGroundDefense(s,{choice:'pass'}).ok);
assert(use(s, 'pull-to-knees').success);
assert.equal(viper.posture, 'kneeling');
assert.equal(s.activeWrestlerId, 'stone');
assert(getLegalMoves(s).some(m => m.id === 'knee-lift'));
assert(getLegalMoves(s).some(m => m.id === 'snap-down'));
assert(use(s, 'snap-down').success);
assert.equal(viper.posture, 'prone');
assert.equal(s.activeWrestlerId, 'stone');
assert.equal(s.roles.stone, 'H');
assert.equal(s.pinEligible, false);
assert(getLegalMoves(s).some(m => m.id === 'pick-up-opponent'));

console.log('Move transitions and High/Low control: PASS');
