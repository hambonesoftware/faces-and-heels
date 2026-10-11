import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoMoves} from './moves.js';
import {moveArt} from './ui-art.js';

const source=readFileSync('app.js','utf8');
const css=readFileSync('styles.css','utf8');
const begin=source.indexOf('function renderMoveCards()');
const end=source.indexOf('function renderTargetChoice()',begin);
assert(begin>=0&&end>begin,'Move action renderer missing');
const fragment=source.slice(begin,end);
const ui={filter:'all',railOffset:0};
const actor={id:'stone',name:'STONE',stamina:40,maxStamina:64,crowdResource:2,crowdResourceName:'POP'};
const defender={id:'viper',name:'VIPER',stamina:36,maxStamina:65};
let legal=demoMoves;
const dependencies={
  currentActor:()=>actor,
  currentDefender:()=>defender,
  renderNeutral:()=>'<div>NEUTRAL</div>',
  getLegalMoves:()=>legal,
  ui,
  state:{mustFinishTargetId:null},
  roleFor:()=> 'H',
  escapeHtml:s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),
  resolveTargetDecision:()=>({kind:'none',values:[]}),
  perspectiveState:()=>({}),
  resolvedTargetLabel:()=> 'CORE',
  tacticalLabel:()=> 'CONTROL',
  moveArt
};
const render=new Function(...Object.keys(dependencies),fragment+';return renderMoveCards;')(...Object.values(dependencies));
let output=render();
const slots=()=>[...output.matchAll(/data-move="([^"]+)"/g)].map(match=>match[1]);
assert.equal(slots().length,demoMoves.length,'Action bar must show all legal moves, not the first four');
assert.deepEqual(slots(),demoMoves.map(m=>m.id),'Action bar must preserve legal order');
assert(output.includes('data-action-rail'),'Horizontal action rail missing');
assert(!output.includes('class="move-grid"'),'Old two-column badge grid still used');
assert(!output.includes('data-more-moves'),'Old more/less pagination still used');
assert(output.includes('data-rail-step="-1"')&&output.includes('data-rail-step="1"'),'Missing navigation buttons');
assert(output.includes('aria-label="Available wrestling moves'),'Accessibility label missing');
assert(output.includes('data-filter="setup"'),'Positioning controls omitted from categories');
assert(output.includes('data-filter="strike"')&&output.includes('data-filter="grapple"'),'Offensive categories missing');
for(const category of ['strike','grapple','setup','special']){
 ui.filter=category;
 output=render();
 assert.deepEqual(slots(),demoMoves.filter(move=>move.category===category).map(move=>move.id),category+' filter mismatch');
}
ui.filter='all';
legal=demoMoves.filter(move=>move.category==='setup');
output=render();
assert.equal(slots().length,legal.length,'Contextual legal move filtering lost');
assert(!output.includes('data-filter="special"'),'Unavailable categories should be absent');
legal=[];
output=render();
assert(output.includes('NO LEGAL MOVE'),'Recovery flow must remain available');
const artSamples=demoMoves.map(move=>moveArt(move.id));
for(const [i,sample] of artSamples.entries()){
 assert(sample.includes('<svg'),demoMoves[i].id+' artwork missing');
 assert(sample.includes('move-bg-'+demoMoves[i].id),demoMoves[i].id+' artwork lacks its own palette');
}
const normalize=sample=>sample.replace(/move-bg-[\w-]+/g,'move-bg-ID');
assert.equal(new Set(artSamples.map(normalize)).size,demoMoves.length,'Distinct move art poses required');
assert(css.includes('.action-ribbon-track{'),'Horizontal rail styling missing');
assert(css.includes('scroll-snap-type:x mandatory'),'Touch snap scrolling missing');
assert(css.includes('.action-slot--grapple'),'Category ability styling missing');
assert(source.includes("ui.railOffset = previousRail.scrollLeft"),'Action rail must preserve scroll on redraw');
assert(source.includes("ui.phase === 'ACTION_SELECT'"),'Contextual combat state handling missing');
console.log('Action ribbon UX PASS: full roster, all filters, contextual moves, unique art, swipe/card navigation, and scroll preservation.');
