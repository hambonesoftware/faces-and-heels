import assert from 'node:assert/strict';
import { demoMoves } from './moves.js';
import { buildMoveFlow, getCategoryRoute, resolveTargetDecision } from './flow-engine.js';
import { cloneInitialState, resolveNeutralRoll, perspectiveState } from './match-engine.js';

const state = cloneInitialState();
resolveNeutralRoll(state, 20, 1); // establish Stone as H for deterministic Smart Flow tests
const perspective = perspectiveState(state);
const forearm = demoMoves.find(move => move.id === 'forearm-smash');
const clothesline = demoMoves.find(move => move.id === 'running-clothesline');
const bodySlam = demoMoves.find(move => move.id === 'body-slam');
const dragonScrew = demoMoves.find(move => move.id === 'dragon-screw');

assert.equal(buildMoveFlow(forearm, perspective).kind, 'readyToConfirm');
assert.deepEqual(resolveTargetDecision(forearm, perspective).values, ['head']);
assert.deepEqual(resolveTargetDecision(clothesline, perspective).values, ['head']);
assert.deepEqual(resolveTargetDecision(bodySlam, perspective).values, ['core']);
assert.equal(resolveTargetDecision(dragonScrew, perspective).kind, 'choice');

const oneLegPerspective = { ...perspective, legalBodyTargets: ['rightLeg'] };
const oneLegDecision = resolveTargetDecision(dragonScrew, oneLegPerspective);
assert.equal(oneLegDecision.kind, 'resolved');
assert.deepEqual(oneLegDecision.values, ['rightLeg']);

const proneState = cloneInitialState();
resolveNeutralRoll(proneState, 20, 1);
proneState.wrestlers.viper.posture = 'prone';
const pronePerspective = perspectiveState(proneState);
const grappleRoute = getCategoryRoute(demoMoves, 'grapple', pronePerspective);
assert.equal(grappleRoute.kind, 'directMove');
assert.equal(grappleRoute.move.id, 'ground-headlock');

console.log('Smart Flow tests passed.');
