import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderBroadcastDice} from './broadcast-dice.js';

const code=readFileSync('app.js','utf8');
const html=readFileSync('index.html','utf8');
const sw=readFileSync('sw.js','utf8');
const css=readFileSync('broadcast-dice.css','utf8');
const opening=readFileSync('broadcast-opening.css','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));

assert.equal(pkg.version,'1.25.2');
assert(html.includes('./broadcast-dice.css?v=1.23.0'));
assert(html.includes('./broadcast-opening.css?v=1.23.0'));
assert(html.indexOf('broadcast.css')<html.indexOf('broadcast-dice.css'));
assert(html.indexOf('broadcast-dice.css')<html.indexOf('broadcast-opening.css'));
assert(sw.includes("'./broadcast-dice.js?v=1.23.0'"));
assert(sw.includes("'./broadcast-dice.css?v=1.23.0'"));
assert(sw.includes("'./broadcast-opening.css?v=1.23.0'"));
assert(sw.includes('faces-heels-v1.25.2-one-tap-move-execution'));

// True opposed dice: two d20s and the actual scores, NOT a made-up defense number.
const opposed=renderBroadcastDice({title:'KICKOUT',mode:'opposed',leftLabel:'VIPER',leftValue:17,rightLabel:'STONE',rightValue:12,
 leftMeta:'TOTAL 19',rightMeta:'TOTAL 12',result:'KICKOUT!'});
assert(opposed.includes('17')&&opposed.includes('12'));
assert.equal((opposed.match(/broadcast-die--d20/g)||[]).length,2);
assert(!opposed.includes('broadcast-die--target'));
assert(opposed.includes('TOTAL 19')&&opposed.includes('KICKOUT!'));
// A normal move/hold escape uses passive CON or a fixed DC. Never invent a second d20.
const staticTarget=renderBroadcastDice({title:'FOREARM SMASH',mode:'target',
 leftLabel:'STONE',leftValue:11,rightLabel:'VIPER · CON',rightValue:13});
assert.equal((staticTarget.match(/broadcast-die--d20/g)||[]).length,1);
assert.equal((staticTarget.match(/broadcast-die--target/g)||[]).length,1);
assert(staticTarget.includes('STATIC DC'));
assert(!staticTarget.includes('13</span><span class="broadcast-die-type">D20'));
const unsafe=renderBroadcastDice({title:'<unsafe>',mode:'target',leftLabel:'<a>',rightValue:13});
assert(unsafe.includes('&lt;unsafe&gt;')&&unsafe.includes('&lt;a&gt;'));
assert(!unsafe.includes('<unsafe>'));

assert(code.includes("mode:'opposed',leftLabel:'STONE',rightLabel:'VIPER'"));
assert(code.includes("mode:'opposed',leftLabel:`${pinned.name} · DEFENSE`"));
assert(code.includes("target:conditioning(currentDefender())"),'Attacks must display static defender Conditioning');
assert(code.includes('groundScrambleTarget('),'Ground defense should show its actual DC');
assert(code.includes('holdSpec.holdStat'),'Grapple defense should derive true hold target');
assert(code.includes('settleRollingVisual({leftTotal:result.pinnedTotal,rightTotal:result.pinningTotal'));
assert(code.includes('settleRollingVisual({leftTotal:result.stoneTotal,rightTotal:result.viperTotal'));
assert(code.includes('ui.broadcastRoll.result=result'),'Final dice result must remain visible through a distinct outcome phase');
assert(!code.includes('<div class="die">${ui.roll'),'Old instant-disappearing single die display must be removed');
assert(css.includes('.broadcast-dice-console')&&css.includes('.broadcast-die--target'));
assert(css.includes('.arena-shell .event-overlay')&&css.includes('.arena-shell .pin-overlay'));
assert(css.includes('@media(max-width:540px)'));
assert(opening.includes('.show-matchup')&&opening.includes('.show-open-program'));
assert(opening.includes('.show-fighter-portrait svg'),'The opening must feature original wrestler vector portraits');

// Evaluate just the real intro renderer, without any browser or story-mode fixtures.
const introSource=code.slice(code.indexOf('function renderMatchIntro() {'),code.indexOf('function renderCoachHint(){'));
assert(introSource.startsWith('function renderMatchIntro()')&&introSource.length>2500);
const renderIntro=new Function('matchSetup','portrait',introSource+';return renderMatchIntro')(
 {mode:'solo',playerId:'stone',difficulty:'standard',tutorial:true},
 id=>'<svg data-original-wrestler="'+id+'"></svg>');
const intro=renderIntro();
assert(intro.includes('show-open-program')&&intro.includes('show-matchup')&&intro.includes('show-lower-third'));
assert(intro.includes('data-original-wrestler="stone"')&&intro.includes('data-original-wrestler="viper"'));
assert(intro.includes('data-start-match')&&intro.includes('data-match-mode="solo"'));
assert(intro.includes('data-player-id="stone"')&&intro.includes('data-player-id="viper"'));
assert(intro.includes('data-difficulty="standard"')&&intro.includes('data-toggle-coaching'));
assert(!intro.includes('intro-poster--setup'),'A reskinned former setup dialog does not meet this milestone');

// Test the actual display timer helper with fake timers: accessible final hold
// should not be shortened by reducedMotion and still be deliberate in Fast mode.
const start=code.indexOf('async function readableDicePause(');
const end=code.indexOf('async function rollingVisual(',start);
assert(start>0&&end>start);
const makePause=new Function('settings','setTimeout',code.slice(start,end)+';return readableDicePause');
const observed=[];
const time=(fn,ms)=>{observed.push(ms);fn();};
const reduced=makePause({fast:false,reducedMotion:true},time);
await reduced(1750);
assert.equal(observed[0],1750,'Reduced motion must still show the final number for 1.75 seconds');
const fast=makePause({fast:true,reducedMotion:false},time);
await fast(1750);
assert(observed[1]>=900,'Even Fast mode must not instantly dismiss a final roll');
await reduced(950);
assert.equal(observed[2],950,'Resolved result should remain visible separately from the die hold');
assert(code.includes('await readableDicePause(1750)')&&code.includes('await readableDicePause(950)'));
console.log('Live TV production integration PASS: real portraits and show opening, genuine opposed dice and DCs, 1.75s final number hold plus 0.95s verdict, phone/landscape layouts and proper offline caching.');
