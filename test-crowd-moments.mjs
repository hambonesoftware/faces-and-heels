import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cloneInitialState,giveControl,wrestler,getLegalMoves,resolveMoveAttempt,attackBoostEligibility,conditioning} from './match-engine.js';
import {demoMoves} from './moves.js';

const state=cloneInitialState();giveControl(state,'stone');
wrestler(state,'stone').crowdResource=3;
const routine=getLegalMoves(state).find(m=>m.id==='running-clothesline');
assert(routine,'Known clothesline must be available');
const normal=attackBoostEligibility(state,routine);
assert.equal(normal.eligible,false,'Routine standing strikes should not be boostable');
assert.equal(normal.available,false);
assert(normal.baseChance>45,'Routine attack has ordinary hit odds');
const snapshot=structuredClone(state);
assert.throws(()=>resolveMoveAttempt(state,{
 moveId:routine.id,attackRoll:5,damageRoll:1,crowdSpend:1,crowdRolls:[6]
}),/Heat\/Pop boost is restricted/);
assert.deepEqual(state,snapshot,'Denied crowd spend must not consume turns, stamina or energy');

// A natural signature is an important match event, not a universal damage buff.
const special=demoMoves.find(m=>m.id==='flash-finisher');
assert(special?.legendary,'Stone has a signature finisher');
const signature=attackBoostEligibility(state,special);
assert.equal(signature.reason,'signature');
assert.equal(signature.eligible,true);
assert.equal(signature.available,true);
assert(getLegalMoves(state).some(m=>m.id===special.id),'Original signature remains legal and selectable');
const used=resolveMoveAttempt(state,{
 moveId:special.id,attackRoll:20,damageRoll:1,crowdSpend:1,crowdRolls:[4]
});
assert.equal(used.spentCrowd,1);
assert.equal(used.crowdBonus,4);
assert.equal(used.crowdGained,1,'Successful signature replenishes one Pop according to the original rules');
assert.equal(wrestler(state,'stone').crowdResource,3,'One Pop spent and one Pop earned on success');

// Difficult attacks qualify based on real odds, not arbitrary move categories.
const uphill=cloneInitialState();giveControl(uphill,'stone');
wrestler(uphill,'stone').crowdResource=1;
wrestler(uphill,'viper').stats.Fortitude=24;
const difficult=attackBoostEligibility(uphill,routine);
assert.equal(difficult.reason,'difficult');
assert(difficult.baseChance<=45&&difficult.boostChance>difficult.baseChance);
const high=resolveMoveAttempt(uphill,{
 moveId:routine.id,attackRoll:20,damageRoll:1,crowdSpend:1,crowdRolls:[6]
});
assert.equal(high.crowdBonus,6);
assert.equal(wrestler(uphill,'stone').crowdResource,1,'Successful clothesline earns 1 Pop after spending 1 Pop');
assert.equal(conditioning(wrestler(uphill,'viper')),17);

// No crowd energy means no discretionary extra die, even on signature moves.
const empty=cloneInitialState();giveControl(empty,'stone');wrestler(empty,'stone').crowdResource=0;
assert.equal(attackBoostEligibility(empty,special).eligible,true);
assert.equal(attackBoostEligibility(empty,special).available,false);

// Preserve existing regular attacks, no boost required.
const plain=cloneInitialState();giveControl(plain,'stone');
assert(resolveMoveAttempt(plain,{moveId:routine.id,attackRoll:20,damageRoll:1}).success);

const app=readFileSync('app.js','utf8');
assert(app.includes('attackBoostEligibility(state,move)'));
assert(app.includes('boost?.available'),'Crowd moment only appears on eligible moves');
assert(app.includes('dock-crowd-moment'),'Boost should be a small contextual crowd moment');
assert(app.includes("boostAllowed?ui.spendCrowd:0"),'UI must discard any stale noneligible boost');
assert(app.includes('CROWD CALLED')&&app.includes('CALL THE CROWD'));
assert(!app.includes('>BOOST</strong>'),'Routine moves no longer prompt boost');
const html=readFileSync('index.html','utf8');
const sw=readFileSync('sw.js','utf8');
const chrome=readFileSync('redline-chrome.css','utf8');
assert(html.includes('redline-chrome.css?v=1.24.0'));
assert(sw.includes("'./redline-chrome.css?v=1.24.0'"));
assert(sw.includes('faces-heels-v1.25.1-combat-dock-tap-fix'));
assert(html.indexOf('broadcast-opening.css')<html.indexOf('redline-chrome.css'));
assert(chrome.includes('.show-open-program')&&chrome.includes('.show-lower-third'),'Chrome must include opening, not just the game');
assert(chrome.includes('.broadcast-dice-console')&&chrome.includes('.broadcast-dice-result'),'Actual two-dice graphics must use chrome styling');
assert(chrome.includes('.fighter-hud')&&chrome.includes('.action-slot')&&chrome.includes('.turn-chip'),'Ring and controls both require new graphics');
assert(chrome.includes('clip-path:polygon('),'Production treatment must be angular');
console.log('Selective crowd boost + REDLINE chrome PASS: signatures and rare difficult hits earn d6; common attacks cannot; TV graphics restyled on both opening and in-match screens.');
