import assert from 'node:assert/strict';
import {demoMoves} from './moves.js';
import {renderCombatDock,renderCombatPrompt,renderPinEnergy,moveFamilies} from './combat-dock.js';

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
