import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoMoves} from './moves.js';
import {moveArt} from './ui-art.js';

const app=readFileSync('app.js','utf8');
const css=readFileSync('styles.css','utf8');
const stage=readFileSync('iso-stage.js','utf8');

const clean=css.slice(css.lastIndexOf('/* v1.13 — RINGSIDE COMPACT'));
assert(clean.length>4000,'Compact interface CSS missing');
assert(clean.includes('.arena-combat-zone {'),'Combat zone must have a dedicated layout');
assert(clean.includes('display:grid;grid-template-columns:minmax(0,1fr)'),'Match and controls must use real layout rows');
assert(clean.includes('grid-template-rows:minmax(270px,1fr) auto'),'Ring should grow above naturally-sized dock');
assert(clean.includes('.arena-combat-zone>.arena-shell {'),'Arena must use first row');
assert(clean.includes('position:relative;inset:auto'),'Arena must not be absolutely positioned beneath action dock');
assert(clean.includes('grid-column:1;grid-row:1'),'Arena must be in first row');
assert(clean.includes('.tactical-menu-anchor {'),'Decision surface missing');
assert(clean.includes('position:relative;left:auto;bottom:auto;transform:none'),'Decision dock cannot overlay ring');
assert(clean.includes('grid-column:1;grid-row:2'),'Decision dock must sit below ring');
assert(clean.includes('.action-slot{')||clean.includes('.action-slot {'),'Compact card CSS missing');
assert(clean.includes('height:92px'),'Desktop ability tiles should be compact');
assert(clean.includes('height:87px'),'Phone ability tiles should be compact');
assert(clean.includes('max-height:38dvh'),'Selected move details must not consume whole phone screen');
assert(clean.includes('overflow-y:auto'),'Longer detail view should scroll rather than covering the ring');
assert(stage.includes('this.scale=Math.min(width/10.8,height/9.8)*(width<680?.91:.95)'),'Compact camera missing');
assert(stage.includes('this.oy=height*.62'),'Wrestlers need higher framing');

const start=app.indexOf('function renderMoveCards()'),end=app.indexOf('function renderTargetChoice()',start);
assert(start>0&&end>start,'Move renderer missing');
const fragment=app.slice(start,end);
const deps={
  currentActor:()=>({id:'stone',name:'STONE',stamina:40,maxStamina:64,crowdResource:2,crowdResourceName:'POP'}),
  currentDefender:()=>({id:'viper',name:'VIPER',stamina:36,maxStamina:65}),
  renderNeutral:()=>'<div>NEUTRAL</div>',
  getLegalMoves:()=>demoMoves,
  ui:{filter:'all',railOffset:0},
  state:{mustFinishTargetId:null},
  roleFor:()=> 'H',
  escapeHtml:s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),
  resolveTargetDecision:()=>({kind:'none',values:[]}),
  perspectiveState:()=>({}),
  resolvedTargetLabel:()=> 'CORE',
  tacticalLabel:()=> 'CONTROL',
  moveArt,
  turnDecision:()=>({actions:[]}),
  ACTION_IDS:{RECOVER:'crowd-recover',SCRAMBLE:'scramble-up'}
};
const render=new Function(...Object.keys(deps),fragment+';return renderMoveCards;')(...Object.values(deps));
const html=render();
assert.equal((html.match(/data-move="/g)||[]).length,demoMoves.length,'All legal moves must remain available');
assert(html.includes('data-action-rail'),'Horizontal scrolling must be preserved');
assert(html.includes('action-slot-effect'),'Compact opponent stamina display missing');
assert(html.includes('action-slot-cost'),'Compact stamina cost missing');
assert(!html.includes('action-slot-tactic'),'Long tactical text should not be repeated on every tile');
assert(!html.includes('action-slot-target'),'Move tiles should not have a long separate target row');
assert(!html.includes('CHOOSE YOUR NEXT MOVE'),'Overlong heading must be removed');

assert(app.includes('arena-combat-zone'),'Ring and decision dock missing from root renderer');
const root=app.slice(app.indexOf('function render() {'),app.indexOf('function updateActionRail('));
assert(root.includes('${renderArena()}<div class="tactical-menu-anchor">${renderCoachHint()}${renderDecisionDock()}</div>'), 'Ring must render before the optional guided tip and below-ring controls');
assert(app.includes("ui.phase === 'ACTION_SELECT'"),'Gameplay phases must remain contextual');
console.log('Compact ringside layout passed: wrestler-first viewport, no overlaid dock, small swipeable move cards and restrained details.');
