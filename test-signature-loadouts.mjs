import assert from 'node:assert/strict';
import {wrestlerDefinitions,demoMoves} from './moves.js';
import {LEGENDARY_CATALOG,MAX_LEGENDARY_MOVES,WRESTLING_STYLES,getLegendaryCandidate,isLegendaryLearnable} from './legendary-catalog.js';
import {cloneInitialState,giveControl,wrestler,getLegalMoves,resolveMoveAttempt,setLegendaryLoadout,isMoveKnown} from './match-engine.js';
import {emptyProgress,sanitizeProgress,learnLegendary} from './progression.js';
import {animationByMove} from './combat-animation-map.js';
import {MOVE_TIMING,samplePair,coreVolumes,neckPoint} from './choreography.js';
import {moveArt,MOVE_ART_TIMES} from './ui-art.js';

const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
assert.equal(WRESTLING_STYLES.length,5);
for(const [style,candidates] of Object.entries(LEGENDARY_CATALOG)){
 assert(WRESTLING_STYLES.includes(style),'Invalid style');
 assert(candidates.length>=8&&candidates.length<=10,style+' must offer 8–10 choices');
 assert.equal(new Set(candidates.map(m=>m.id)).size,candidates.length,'Duplicate style move');
}
assert.equal(MAX_LEGENDARY_MOVES,4);
assert.equal(wrestlerDefinitions.stone.style,'Powerhouse');
assert.equal(wrestlerDefinitions.viper.style,'Daredevil');

let state=cloneInitialState();
giveControl(state,'stone');
let stone=getLegalMoves(state);
assert(stone.some(move=>move.id==='flash-finisher'),'Stone should know his signature');
assert(!stone.some(move=>move.id==='viper-bite'),'Stone must not know Viper signature');
assert(stone.some(move=>move.id==='body-slam'),'Stone must know the body slam');
assert(!stone.some(move=>move.id==='dropkick'),'Stone is not trained for the dropkick');
assert(!stone.some(move=>move.id==='armbar'),'Stone is not trained for the armbar');
for(const setup of ['pick-up-opponent','pull-to-knees','snap-down']){
 const definition=demoMoves.find(m=>m.id===setup);
 assert(isMoveKnown(wrestler(state,'stone'),definition),'Setup actions must be universal');
}
assert.throws(()=>resolveMoveAttempt(state,{moveId:'dropkick',attackRoll:20,damageRoll:8}),/not learned or legal/);
assert.throws(()=>resolveMoveAttempt(state,{moveId:'viper-bite',attackRoll:20,damageRoll:12}),/not learned or legal/);

giveControl(state,'viper');
let viper=getLegalMoves(state);
assert(viper.some(move=>move.id==='viper-bite'),'Viper must know his signature');
assert(!viper.some(move=>move.id==='flash-finisher'),'Viper must not know Stone signature');
assert(viper.some(move=>move.id==='dropkick'),'Viper must know dropkick');
assert(!viper.some(move=>move.id==='spinebuster'),'Viper must not know spinebuster');
assert(viper.some(move=>move.id==='ddt'),'Viper must know DDT');
assert.throws(()=>resolveMoveAttempt(state,{moveId:'flash-finisher',attackRoll:20,damageRoll:12}),/not learned or legal/);
assert.throws(()=>resolveMoveAttempt(state,{moveId:'spinebuster',attackRoll:20,damageRoll:12}),/not learned or legal/);
assert(!setLegendaryLoadout(state,'viper',['flash-finisher']).ok,'cross-wrestler signature loadout must be rejected');
assert(!setLegendaryLoadout(state,'viper',['shooting-star']).ok,'planned animation must not be unlockable');
assert(!setLegendaryLoadout(state,'viper',Array(5).fill('viper-bite')).ok,'above max must fail');
assert(!setLegendaryLoadout(state,'stone',['flash-finisher','flash-finisher']).ok,'duplicates must fail');

const viperBite=demoMoves.find(m=>m.id==='viper-bite');
assert(viperBite.legendary&&viperBite.category==='special');
assert(viperBite.legendaryStyle==='Daredevil'&&viperBite.signatureFor==='viper');
assert(viperBite.heatPopRequired<=wrestler(state,'viper').crowdResource);
assert(viperBite.staminaDamage>viperBite.staminaCost);
assert(animationByMove['viper-bite']?.choreography==='viper_bite');
assert(MOVE_TIMING.viper_bite.duration>=2400);
assert(MOVE_ART_TIMES['viper-bite']>0);
const art=moveArt('viper-bite');
assert(art.includes('data-choreography="viper_bite"'),'Finisher artwork must match its animation');

const defender=wrestler(state,'stone'),attacker=wrestler(state,'viper');
const defenderBefore=defender.stamina,attackerBefore=attacker.stamina;
const result=resolveMoveAttempt(state,{moveId:'viper-bite',attackRoll:20,damageRoll:12,target:'head'});
assert(result.success);
assert.equal(attackerBefore-attacker.stamina,viperBite.staminaCost);
assert.equal(defenderBefore-defender.stamina,viperBite.staminaDamage);
assert.equal(defender.posture,'prone');
assert(state.pinEligible,'Legendary signature must offer immediate pin on success');
assert.equal(state.pinningWrestlerId,'viper');
assert.equal(wrestler(state,'viper').crowdResource,3,'Legendary hit awards Heat');

let frames=0;
for(const attackingId of ['stone','viper']){
 let prev=null,maxTravel=0,initial=null,closest=99;
 for(let i=0;i<=800;i++){
  const t=i/800,p=samplePair('viper_bite',t,attackingId);
  frames++;
  const other=attackingId==='stone'?'viper':'stone';
  if(!initial)initial=p[attackingId].j.pelvis;
  maxTravel=Math.max(maxTravel,dist(initial,p[attackingId].j.pelvis));
  if(t>.25&&t<.8)closest=Math.min(closest,dist(p[attackingId].j.lh,neckPoint(p[other])));
  for(const id of ['stone','viper']){
   for(const [key,v] of Object.entries(p[id].j)){
    assert(v.every(Number.isFinite));
    assert(v[1]>=.2,'Finisher joint penetrates mat');
    if(prev)assert(dist(v,prev[id].j[key])<.15,'Finisher frame discontinuity');
   }
  }
  for(const a of coreVolumes(p.stone))for(const b of coreVolumes(p.viper))
   assert(dist(a.p,b.p)>=a.radius+b.radius-1e-6,'Finisher head/torso overlap');
  prev=p;
 }
 assert(maxTravel>.5,'Finisher attacker must move');
 assert(closest<.45,'Finisher must make neck contact');
 const end=samplePair('viper_bite',1,attackingId);
 assert(end[attackingId==='stone'?'viper':'stone'].j.head[1]<.95,'Finisher ends with defender prone');
}

const old=sanitizeProgress({version:1,wins:{stone:0,viper:0},losses:{stone:0,viper:0}});
assert.deepEqual(old.learnedLegendaries,{stone:['flash-finisher'],viper:['viper-bite']});
assert.equal(old.matPasses,10);
const progress=emptyProgress();
assert.equal(progress.matPasses,10);
assert.equal(learnLegendary(progress,'stone','Powerhouse','flash-finisher').ok,false,'No duplicate legendary unlock');
assert.equal(learnLegendary(progress,'stone','Daredevil','viper-bite').ok,false,'Cannot unlock another style signature');
assert.equal(learnLegendary(progress,'viper','Daredevil','shooting-star').ok,false,'Do not spend Mat Pass on unanimated move');
assert.equal(progress.matPasses,10,'Failed unlock may not spend Mat Pass');
assert(!isLegendaryLearnable('Daredevil','shooting-star'));
assert(getLegendaryCandidate('Daredevil','viper-bite').signatureFor==='viper');
console.log('Signature loadouts PASS: distinct moves, 5 style catalogs, exclusive finishers, actual pin, Mat Pass safety and '+frames+' choreography samples.');
