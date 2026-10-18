import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {demoMoves} from './moves.js';
import {cloneInitialState,giveControl,attackBoostEligibility} from './match-engine.js';

// Compile actual browser controller JS instead of testing a rewritten mock UI.
execFileSync(process.execPath,['--check','app.js'],{stdio:'pipe'});
const app=readFileSync('app.js','utf8');
const setupStart=app.indexOf('function moveHasBoostChoice(move) {');
const setupEnd=app.indexOf('async function playSuccessfulMove(',setupStart);
assert(setupStart>0&&setupEnd>setupStart,'Real selectMove controller must exist');
const fragment=app.slice(setupStart,setupEnd);
const state=cloneInitialState();giveControl(state,'stone');
let selected=0,rendered=0,executed=0;
const ui={selectedMove:null,selectedTarget:null,spendCrowd:0,phase:'ACTION_SELECT'};
const logs=[];
let overrideTarget=null;
const targetDecision=()=>overrideTarget??{kind:'none',values:[]};
const ctx={
 audio:{cue(){selected++}},ui,state,attackBoostEligibility,
 resolveTargetDecision:targetDecision,perspectiveState:()=>state,
 currentActor:()=>state.wrestlers.stone,bodyLabel:s=>s.toUpperCase(),
 log:x=>logs.push(x),render:()=>{rendered++},rollMove:()=>{executed++}
};
const actual=new Function(...Object.keys(ctx),fragment+';return {selectMove,moveHasBoostChoice};')(...Object.values(ctx));
const reset=()=>{ui.phase='ACTION_SELECT';ui.selectedMove=null;ui.selectedTarget=null;ui.spendCrowd=0;rendered=0;executed=0;overrideTarget=null;};
const routine=demoMoves.find(m=>m.id==='running-clothesline');
const finisher=demoMoves.find(m=>m.id==='flash-finisher');
const setup=demoMoves.find(m=>m.automatic&&m.category==='setup');
assert(routine&&finisher?.legendary&&setup,'Use actual moves rather than invented commands');

// Even with crowd energy, a common move starts on first selection.
state.wrestlers.stone.crowdResource=3;
reset();actual.selectMove(routine);
assert.equal(ui.phase,'SELECTED');assert.equal(executed,1,'Common move must execute on tap');
assert.equal(rendered,0,'Common move should not display EXECUTE confirmation');
assert.equal(ui.spendCrowd,0);
assert.equal(actual.moveHasBoostChoice(routine),false);

// Legendary move with funded boost gets the choice to spend or execute unboosted.
reset();actual.selectMove(finisher);
assert.equal(executed,0,'Boost-eligible finisher must wait for the player choice');
assert.equal(rendered,1,'Boost-eligible finisher must show crowd-choice controls');
assert.equal(actual.moveHasBoostChoice(finisher),true);
assert.equal(ui.phase,'SELECTED');

// The same finisher becomes one-tap if Pop is exhausted.
state.wrestlers.stone.crowdResource=0;
reset();actual.selectMove(finisher);
assert.equal(executed,1,'No spendable resource means no EXECUTE confirmation');
assert.equal(rendered,0);

// Automatic setup moves are also triggered immediately.
state.wrestlers.stone.crowdResource=3;
reset();actual.selectMove(setup);
assert.equal(executed,1,'Setup actions should start immediately');

// Choosing a body target is always required before rolling.
reset();overrideTarget={kind:'choice',values:['head','core']};
actual.selectMove(routine);
assert.equal(ui.phase,'TARGET_CHOICE');
assert.equal(executed,0,'Do not skip a required target');
assert.equal(rendered,1);

// Exercise the ACTUAL click handler extracted from the browser controller.
const targetStart=app.indexOf('  if (el.dataset.target) {');
const targetEnd=app.indexOf('  if (el.dataset.roll !== undefined)',targetStart);
assert(targetStart>0&&targetEnd>targetStart,'Real target click handler must exist');
const targetBlock=app.slice(targetStart,targetEnd);
const targetCtx={
 ui,state,resolveTargetDecision:targetDecision,perspectiveState:()=>state,
 currentActor:()=>state.wrestlers.stone,bodyLabel:s=>s.toUpperCase(),
 log:x=>logs.push(x),moveHasBoostChoice:actual.moveHasBoostChoice,
 render:()=>{rendered++},rollMove:()=>{executed++}
};
const targetClick=new Function('el',...Object.keys(targetCtx),targetBlock);
const click=target=>targetClick({dataset:{target}},...Object.values(targetCtx));
click('leftArm'); // fake target must not execute
assert.equal(ui.phase,'TARGET_CHOICE');
assert.equal(executed,0);
click('head');
assert.equal(ui.selectedTarget,'head');
assert.equal(executed,1,'After choosing required target, routine move executes immediately');
assert.equal(rendered,1,'Do not show redundant EXECUTE after required target');

// A finisher with legal target and available Pop still offers an optional boost.
reset();overrideTarget={kind:'choice',values:['head','core']};
actual.selectMove(finisher);
assert.equal(executed,0);
click('core');
assert.equal(ui.selectedTarget,'core');
assert.equal(ui.phase,'SELECTED');
assert.equal(executed,0);
assert.equal(rendered,2,'Boost option appears only AFTER required target');

// CPU retains its existing sequence (pick move -> choose target/spend -> roll ONCE).
reset();overrideTarget=null;
actual.selectMove(routine,{autoExecute:false});
assert.equal(executed,0,'CPU move selection must never start a premature roll');
assert.equal(rendered,1);
assert(app.includes('selectMove(move,{autoExecute:false})'),
  'Actual AI caller must opt out of one-tap for its deliberate move setup');
assert(app.includes('await rollMove();break;'),'CPU must still roll through the standard engine exactly once');

// Cache-bust browser JS on installed GitHub Pages PWA.
const html=readFileSync('index.html','utf8');
const sw=readFileSync('sw.js','utf8');
assert(html.includes('app.js?v=1.25.2'));
assert(html.includes('sw.js?v=1.25.2'));
assert(sw.includes("'./app.js?v=1.25.2'"));
assert(sw.includes('faces-heels-v1.25.2-one-tap-move-execution'));
console.log('One-tap move UX PASS: common/setup, zero-Pop finishers, targeted moves, boost choices, illegal targets, and single CPU execution.');
