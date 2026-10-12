import assert from 'node:assert/strict';
import {cloneInitialState,giveControl,wrestler,resolveMoveAttempt,startPin,skipPin,
 resolvePinCount,escapeHold,checkCombatFlow,getAvailableActions,
 validateCombatAction,resolveGroundDefense,transitionHold,availableHoldTransitions,
 maintainHold,resolveReaction,resolveNeutralRoll} from './match-engine.js';
import {ACTION_IDS} from './turn-controller.js';
const copy=x=>structuredClone(x);
const scenarios=[];
function save(label,s){scenarios.push({label,state:copy(s)});}
{
 const s=cloneInitialState();save('neutral',s);
 giveControl(s,'stone');save('stone offense',s);
 const miss=resolveMoveAttempt(s,{moveId:'forearm-smash',attackRoll:1,damageRoll:1,target:'head'});
 assert(!miss.success);save('reaction Low',s);
 const result=resolveReaction(s,{reactionMoveId:'forearm-smash',reactionRoll:20,damageRoll:1});
 assert(result.success);save('Viper offense',s);
}
{
 const s=cloneInitialState();giveControl(s,'stone');
 assert(resolveMoveAttempt(s,{moveId:'running-clothesline',attackRoll:20,damageRoll:1}).success);
 save('pin opportunity',s);
 const p=copy(s);
 startPin(p);save('pin count 1',p);
 resolvePinCount(p,{pinningId:'stone',count:1,pinningRoll:20,pinnedRoll:1});
 save('pin count 2',p);
 resolvePinCount(p,{pinningId:'stone',count:2,pinningRoll:20,pinnedRoll:1});
 save('pin count 3',p);
 resolvePinCount(p,{pinningId:'stone',count:3,pinningRoll:20,pinnedRoll:1});
 save('pin victory',p);
 skipPin(s);save('prone defense',s);
 resolveGroundDefense(s,{choice:'pass'});save('high resumes',s);
}
{
 const s=cloneInitialState();giveControl(s,'viper');
 wrestler(s,'stone').posture='prone';
 assert(resolveMoveAttempt(s,{moveId:'armbar',attackRoll:20,damageRoll:2,target:'leftArm'}).success);
 save('armbar escape',s);
 assert(!escapeHold(s,{escapeRoll:1}).success);save('holder pressure',s);
 assert(availableHoldTransitions(s).some(x=>x.id==='ankle-lock'));
 transitionHold(s,{moveId:'ankle-lock'});save('chained hold escape',s);
 assert(!escapeHold(s,{escapeRoll:1}).success);
 wrestler(s,'stone').stamina=4;
 maintainHold(s);save('last chance escape',s);
 assert(!escapeHold(s,{escapeRoll:1}).success);save('submission victory',s);
}
let checked=0;
for(const scenario of scenarios){
 const s=copy(scenario.state);
 const audited=checkCombatFlow(s);
 assert(audited.ok,`${scenario.label}: ${audited.issues.join(', ')}`);
 const turn=getAvailableActions(s);
 assert.equal(turn.phase,s.phase,scenario.label+': mismatched phase');
 if(s.winnerId){
   assert.equal(turn.actions.length,0,'Terminal state exposes actions');
   assert.equal(s.phase,'MATCH_COMPLETE');
 }else{
   const enabled=turn.actions.filter(a=>a.enabled);
   assert(enabled.length>=1,scenario.label+': dead end');
   for(const action of enabled){
     assert(validateCombatAction(s,action.id,action.actorId).ok,scenario.label+': advertised action not executable');
     if(action.actorId&&turn.controlId&&turn.actorId!==turn.controlId)
       assert(!validateCombatAction(s,action.id,turn.controlId).ok,scenario.label+': High stole Low defense');
   }
 }
 checked++;
}
// Systematic edge cases: stamina/crowd/guard extremes must not strand any
// authentic phase. Use copies rather than inventing invalid phase combinations.
for(let i=0;i<2400;i++){
 const source=scenarios[i%scenarios.length],s=copy(source.state);
 if(s.winnerId)continue;
 const actor=i%2?'stone':'viper';
 const other=actor==='stone'?'viper':'stone';
 // Mutating a resource cannot invalidate action ownership. Zero stamina is a
 // particularly important guard against disappearance of escape and pin rolls.
 s.wrestlers[actor].stamina=[0,1,s.wrestlers[actor].maxStamina][i%3];
 s.wrestlers[other].crowdResource=[0,1,5][(i*7)%3];
 s.wrestlers[other].groundGuard=i%4===0?3:0;
 const result=checkCombatFlow(s);
 assert(result.ok,`${source.label} resource seed ${i}: ${result.issues.join('; ')}`);
 const enabled=getAvailableActions(s).actions.filter(x=>x.enabled);
 assert(enabled.length>0,'Unresolvable phase after resource change');
 if(['HOLD_ESCAPE','PIN','GROUND_DEFENSE','REACTION'].includes(s.phase)){
  const turn=getAvailableActions(s);
  assert(turn.actorId!==turn.controlId,'Low defensive response must remain permitted');
 }
 checked++;
}
{
 const s=cloneInitialState();giveControl(s,'stone');
 assert.throws(()=>resolveMoveAttempt(s,{moveId:'forearm-smash',target:'core',attackRoll:20,damageRoll:7}),
  /legal target/,'Forged fixed target must be rejected');
 assert.equal(s.turnCounter,0,'Invalid target must not consume a turn');
}
{
 const s=cloneInitialState();giveControl(s,'stone');
 s.activeWrestlerId=null;
 assert(!checkCombatFlow(s).ok,'Invalid actor state should be detected');
}
{
 const s=cloneInitialState();giveControl(s,'stone');
 s.phase='PIN';s.pinningWrestlerId=null;
 assert(!checkCombatFlow(s).ok,'Pin with no controller should be detected');
}
{
 const s=cloneInitialState();giveControl(s,'stone');
 s.phase='REACTION';s.pendingFailure=null;
 assert(!checkCombatFlow(s).ok,'Reaction lacking previous failure should be detected');
}
console.log(`Combat state graph PASS: ${checked} real-phase and extreme-resource checks, no unreachable defense/terminal action or invalid target.`);
