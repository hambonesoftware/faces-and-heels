import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {demoMoves} from './moves.js';
import {renderCombatDock,renderCombatPrompt,renderPinEnergy,moveFamilies} from './combat-dock.js';

// CI does not load browser app.js as a Node module; at minimum verify its
// complete JavaScript syntax before shipping a new UI to GitHub Pages.
execFileSync(process.execPath,['--check','app.js'],{stdio:'pipe'});
const app=readFileSync('app.js','utf8');
assert(app.includes("previousDockPhase=ui.phase"),'Combat category reset logic missing');
for(const phase of ['NEUTRAL_ROLL','HOLD','HOLD_ESCAPE','TARGET_CHOICE','SELECTED','OPPORTUNITY','REACTION','GROUND_DEFENSE','PIN_DEFENSE'])
 assert(app.includes("ui.phase === '"+phase+"'")||app.includes("'"+phase+"'"),'Phase '+phase+' disappeared from dispatcher');
const legacyCss=readFileSync('broadcast.css','utf8');
const dockCss=readFileSync('combat-dock.css','utf8');
const doc=readFileSync('index.html','utf8');
const worker=readFileSync('sw.js','utf8');
// Regression for the shipped v1.25 tap bug: the v1.22 broadcast wrapper
// disables pointer events, but only the old .decision-panel was opted back in.
// ALL v1.25 prompts and buttons sit inside .combat-dock instead.
assert(/\.tactical-menu-anchor\s*\{[^}]*pointer-events\s*:\s*none/s.test(legacyCss),
  'This test must cover the old broadcast layer which blocked touch events');
const dockRule=dockCss.match(/\.tactical-menu-anchor\s*>\s*\.combat-dock\s*\{([^}]*)\}/s);
assert(dockRule,'Combat dock requires a dedicated override for the legacy wrapper');
assert(/pointer-events\s*:\s*auto\s*;/i.test(dockRule[1]),
  'CRITICAL: dock must override inherited pointer-events:none for every category and defense');
assert(doc.indexOf('broadcast.css?v=1.22.0')<doc.indexOf('combat-dock.css?v=1.25.1'),
  'Interactive dock CSS must come AFTER old broadcast CSS');
assert(doc.includes('./combat-dock.css?v=1.25.1'),
  'Bust cached inert v1.25 CSS');
assert(worker.includes("'./combat-dock.css?v=1.25.1'"),'Installed PWA must cache interactive CSS');
assert(worker.includes('faces-heels-v1.25.1-combat-dock-tap-fix'));
assert(app.includes('event.target.closest(\'button,[data-close-drawer]\')'),'Tap delegation must cover buttons');
assert(app.includes('if (el.dataset.dockFamily !== undefined)'),'Tap handler must have a category entry point');
const actor={id:'stone',name:'STONE',crowdResource:2,crowdResourceName:'POP',stamina:44,maxStamina:64};
const defender={id:'viper',name:'VIPER',stamina:29};
const groups=moveFamilies(demoMoves);
assert(groups.length>=3);
assert(groups.find(x=>x.id==='strike'));
assert(groups.find(x=>x.id==='grapple'));
assert(groups.find(x=>x.id==='setup'));
assert(groups.find(x=>x.id==='special'));
const familyView=renderCombatDock({actor,defender,legalMoves:demoMoves,helpAvailable:true});
assert(familyView.includes('data-dock-family="strike"'));
assert(familyView.includes('data-dock-family="grapple"'));
assert(familyView.includes('data-dock-family="special"'));
assert(familyView.includes('data-dock-family="setup"'));
assert(familyView.includes('data-coach-help'));
assert(!familyView.includes('data-move='),'Moves are hidden until a combat category is picked');
assert(!familyView.includes('action-slot'),'Legacy move-art tiles must not appear');

for(const group of groups){
 const view=renderCombatDock({actor,defender,legalMoves:demoMoves,family:group.id});
 const actual=[...view.matchAll(/data-move="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(actual,group.moves.map(m=>m.id),'Every legal '+group.id+' move must remain accessible');
 assert(view.includes('data-dock-back'));
 assert(view.includes('data-action-rail'),'Move list must be swipeable');
 assert(view.includes('scroll')||view.includes('SWIPE FOR MORE MOVES'));
}
// Changing the engine's legal-move list must hide every unavailable category.
const setupOnly=demoMoves.filter(m=>m.category==='setup');
const restricted=renderCombatDock({actor,defender,legalMoves:setupOnly});
assert(restricted.includes('data-dock-family="setup"'));
assert(!restricted.includes('data-dock-family="special"'));
assert(!restricted.includes('data-dock-family="strike"'));
assert.deepEqual(moveFamilies(setupOnly).flatMap(x=>x.moves),setupOnly);
// No legal moves preserves actual stand/recover/reset actions.
const empty=renderCombatDock({actor,defender,legalMoves:[],canStand:true,canRecover:true});
assert(empty.includes('data-scramble-up')&&empty.includes('data-recover'));
const breath=renderCombatDock({actor,defender,legalMoves:[]});
assert(breath.includes('data-catch-breath'));

// Original engine data selectors, not fictional game commands.
const ground=renderCombatPrompt({kind:'ground-defense',title:'GET OFF THE MAT',actions:[
 {action:'data-ground-scramble',label:'SCRAMBLE',primary:true},
 {action:'data-ground-cover',label:'COVER'},
 {action:'data-ground-pass',label:'STAY DOWN'}
]});
for(const key of ['data-ground-scramble','data-ground-cover','data-ground-pass'])assert(ground.includes(key));
const counter=renderCombatPrompt({kind:'reaction',title:'COUNTER',actions:[
 {action:'data-reaction="forearm-smash"',label:'FOREARM COUNTER'},
 {action:'data-pass-reaction',label:'PASS'}
]});
assert(counter.includes('data-reaction="forearm-smash"'));
assert(!counter.includes('data-reaction=&quot;forearm-smash&quot;'));
const target=renderCombatPrompt({kind:'target',title:'TARGET',actions:[{action:'data-target="head"',label:'HEAD'}]});
assert(target.includes('data-target="head"'));
assert(!renderCombatPrompt({title:'Unsafe <attack>',actions:[]}).includes('<attack>'));
assert.throws(()=>renderCombatPrompt({title:'TEST',actions:[{action:'onclick="evil()"',label:'NO'}]}),/Invalid combat action attribute/);
assert(renderPinEnergy({resourceName:'POP',resource:2,chosen:1}).includes('data-pin-crowd="1"'));
assert(!renderPinEnergy({resourceName:'POP',resource:0}).includes('data-pin-crowd="1"'));
console.log('v1.25 combat dock PASS: all trained moves, categories, existing defensive actions, energy choices and data-selector safety.');
