import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoMoves} from './moves.js';
import {renderCombatDock,moveFamilies} from './combat-dock.js';

const actor={id:'stone',name:'STONE',crowdResource:2,crowdResourceName:'POP',stamina:40,maxStamina:64};
const defender={id:'viper',name:'VIPER',stamina:36,maxStamina:65};
const initial=renderCombatDock({actor,defender,legalMoves:demoMoves});
assert(initial.includes('data-dock-family="strike"'),'Attack families should be actionable');
assert(!initial.includes('data-move='),'Initial screen must not bury arena under all move cards');
const groups=moveFamilies(demoMoves);
for(const group of groups){
 const html=renderCombatDock({actor,defender,legalMoves:demoMoves,family:group.id});
 const moves=[...html.matchAll(/data-move="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(moves,group.moves.map(m=>m.id));
 assert(html.includes('data-action-rail'));
 assert(html.includes('data-dock-back'));
 assert(!html.includes('action-slot-art'),'Move portraits must not crowd combat buttons');
}
const source=readFileSync('app.js','utf8');
assert(source.includes('renderCombatDock({'),'Game must use active combat dock');
assert(source.includes("if (el.dataset.dockFamily !== undefined)"));
assert(source.includes("if (el.dataset.dockBack !== undefined)"));
assert(source.includes('getLegalMoves(state).find(m=>m.id===el.dataset.move)'),'Illegal move clicks cannot enter a selection state');
console.log('v1.25 attack family navigation PASS: all real moves accessible behind large action buttons.');
