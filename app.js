import {ACTION_IDS} from './turn-controller.js?v=1.19.0';
import {renderBroadcastDice} from './broadcast-dice.js?v=1.23.0';
import {renderCombatDock,renderCombatPrompt,renderPinEnergy,moveFamilies} from './combat-dock.js?v=1.25.0';
import {groundScrambleTarget,GROUND_SCRAMBLE_COST} from './ground-defense.js?v=1.19.0';
import {DEFAULT_MATCH_SETUP,readMatchSetup,saveMatchSetup,aiWrestlerId,isAiDecision,chooseAiAction,choosePinCrowdSpend} from './solo-ai.js?v=1.24.0';
import { animationByMove } from './combat-animation-map.js?v=1.21.0';
import { portrait, moveArt, damageDiagram } from './ui-art.js?v=1.21.0';
import { emptyProgress, loadProgress, saveProgress, recordResult, resetProgress } from './progression.js?v=1.19.0';
import { DEFAULT_PRESENTATION, readSettings, saveSettings, delayFor, tacticalLabel, chanceToHit, MatchAudio } from './presentation.js?v=1.19.0';
import { demoMoves } from './moves.js?v=1.21.0';
import { LEGENDARY_CATALOG,MAX_LEGENDARY_MOVES } from './legendary-catalog.js?v=1.19.0';
import { bodyLabel, resolveTargetDecision } from './flow-engine.js?v=1.19.0';
import { IsoStage } from './iso-stage.js?v=1.22.0';
let rendererMode = 'iso';
try { const saved=localStorage.getItem('fh-renderer-v15'); if(['iso','sprite','compare'].includes(saved)) rendererMode=saved; } catch {}
const requestedRenderer=new URLSearchParams(location.search).get('renderer');
if(['iso','sprite','compare'].includes(requestedRenderer))rendererMode=requestedRenderer;
import {
  cloneInitialState,
  opponentId,
  wrestler,
  roleFor,
  statModifier,
  conditioning,
  attackBoostEligibility,
  perspectiveState,
  resolveNeutralRoll,
  getLegalMoves,
  canReact,
  getAvailableReactions,
  resolveGroundDefense,
  resolveMoveAttempt,
  resolveReaction,
  declineReaction,
  startPin,
  resolvePinCount,
  skipPin,
  spendCrowdForStamina,
  catchBreathToNeutral,
  scrambleUp,
  totalBodyMarks,
  setLegendaryLoadout,
  maintainHold,
  availableHoldTransitions,
  transitionHold,
  escapeHold,
  releaseHold,
  getAvailableActions,
  validateCombatAction,
  checkCombatFlow
} from './match-engine.js?v=1.24.0';

const app = document.querySelector('#app');
let progression=loadProgress(localStorage);
let matchSetup=readMatchSetup(localStorage);
let aiBusy=false,aiTimer=null;
const aiEnabled=()=>matchSetup.mode==='solo'&&!new URLSearchParams(location.search).has('demo');
let settings=readSettings(localStorage);
const audio=new MatchAudio();audio.muted=settings.muted;
const highlights=[];let resultRecorded=false;
const rivalryLead=progression.history.length?`${progression.history.at(-1).winner.toUpperCase()} won the previous encounter. The rivalry continues.`:'The rivalry begins. Win the opening Neutral roll to establish control.';
const trailing={stone:null,viper:null};
const state = cloneInitialState();
for(const id of ['stone','viper'])setLegendaryLoadout(state,id,progression.learnedLegendaries[id]);



let ui = {
  phase: 'NEUTRAL_ROLL',
  selectedMove: null,
  selectedTarget: null,
  spendCrowd: 0,
  drawer: null,
  roll: null,
  rollLabel: '',
  broadcastRoll: null,
  event: null,
  filter: 'all',
  moreMoves: false,
  actionFamily: null,
  showMatchOptions: false,
  showCoach: false,
  railOffset: 0,
  pinCount: 0,
  pinRolls: null,
  pinInfo: null,
  pinCrowdSpend: 0,
  neutralRolls: null,
  coachingDismissed: false
};

let introOpen = !new URLSearchParams(location.search).has('demo');
let stage = null;
let eventTimer = null;
const params = new URLSearchParams(location.search);
let seeded = Number(params.get('seed')) || null;
const matchLog = [
  'Match ready: Stone vs Viper.',
  rivalryLead
];

function random01() {
  if (seeded !== null) {
    seeded = (seeded * 1664525 + 1013904223) >>> 0;
    return seeded / 4294967296;
  }
  if (globalThis.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / 4294967296;
  }
  return Math.random();
}

function rollDie(sides) {
  return 1 + Math.floor(random01() * sides);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, delayFor(ms,settings)));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pct(value, max) {
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function log(entry) {
  matchLog.push(entry);
  if (/control|counter|kickout|pinfall|mark|finisher|reversal/i.test(entry)) highlights.push(entry);
}

// One shared combat flow policy powers both the UI and the match engine.
function turnDecision(){return getAvailableActions(state);}
function permitted(actionId,actorId=turnDecision().actorId){
  const check=validateCombatAction(state,actionId,actorId);
  if(!check.ok){log('Action unavailable: '+check.reason);announce('NOT AVAILABLE',check.reason,'danger',false,650);return false;}
  return true;
}
function syncUiToEngine() {
  if (['ROLLING','ANIMATING'].includes(ui.phase)) return;
  const turn=turnDecision();
  if (turn.phase==='ACTION_SELECT' && ['TARGET_CHOICE','SELECTED'].includes(ui.phase)) return;
  ui.phase=({NEUTRAL_ROLL:'NEUTRAL_ROLL',ACTION_SELECT:'ACTION_SELECT',
    HOLD:'HOLD',HOLD_ESCAPE:'HOLD_ESCAPE',GROUND_DEFENSE:'GROUND_DEFENSE',PIN_OPPORTUNITY:'OPPORTUNITY',
    PIN:'PIN_DEFENSE',REACTION:'REACTION',MATCH_COMPLETE:'MATCH_COMPLETE'}[turn.phase])||'ACTION_SELECT';
}

function currentActor() {
  return state.activeWrestlerId ? wrestler(state, state.activeWrestlerId) : null;
}

function currentDefender() {
  return state.activeWrestlerId ? wrestler(state, opponentId(state.activeWrestlerId)) : null;
}

function crowdPips(w) {
  const filled = Math.max(0, Math.min(5, w.crowdResource));
  const symbol = w.crowdResourceName === 'POP' ? '◆' : '▲';
  return Array.from({ length: 5 }, (_, i) => `<span class="crowd-pip ${i < filled ? 'is-on' : ''}">${symbol}</span>`).join('');
}

function statusWarning(w) {
  if (w.posture === 'prone') return 'PRONE';
  if (w.stamina <= 0) return 'EXHAUSTED';
  if (w.condition && w.condition !== 'Mostly Healthy') return w.condition.toUpperCase();
  return '';
}

function renderFighterHud(w, side) {
  const role = roleFor(state, w.id);
  const active = turnDecision().actorId === w.id;
  const roleText=role==='H'?'IN CONTROL':role==='L'?'DEFENDING':'NEUTRAL';
  const now=pct(w.stamina,w.maxStamina);
  if(trailing[w.id]===null)trailing[w.id]=now;
  else if(now>trailing[w.id])trailing[w.id]=now;
  else if(now<trailing[w.id]){const old=trailing[w.id];setTimeout(()=>{trailing[w.id]=now;const bar=document.querySelector(`[data-trail=\"${w.id}\"]`);if(bar)bar.style.width=`${now}%`;},680);trailing[w.id]=old;}
  return `
    <button class="fighter-hud fighter-hud--${side} ${active ? 'is-active-control' : ''}" data-body="${w.id}" aria-label="Open ${escapeHtml(w.name)} body status">
      <div class="hud-portrait hud-portrait--${w.id}">${portrait(w.id)}</div>
      <div class="fighter-copy">
        <div class="fighter-name-row"><strong>${escapeHtml(w.name)}</strong>${matchSetup.mode==='solo'?`<span class="fighter-player-label ${w.id===matchSetup.playerId?'is-human':'is-cpu'}">${w.id===matchSetup.playerId?'YOU':'CPU'}</span>`:''}<span class="momentum-role momentum-role--${role.toLowerCase()}">${roleText}</span>${statusWarning(w) ? `<span class="status-chip">${escapeHtml(statusWarning(w))}</span>` : ''}</div>
        <div class="stamina-row"><span>STA</span><div class="stamina"><em class="stamina-trail" data-trail="${w.id}" style="width:${trailing[w.id]}%"></em><i style="width:${now}%"></i></div><b>${w.stamina}/${w.maxStamina}</b></div>
        <div class="crowd-row"><em>${escapeHtml(w.crowdResourceName)}</em>${crowdPips(w)}</div>
      </div>
    </button>`;
}

function renderHeader() {
  return `
    <header class="game-header">
      <div class="brand"><span>FACES</span><b>&</b><strong>HEELS</strong><em>MAIN EVENT · LIVE</em></div>
      <button class="icon-button" data-drawer="menu" aria-label="Match menu">☰</button>
    </header>
    <section class="fighter-strip">
      ${renderFighterHud(wrestler(state,'stone'), 'face')}
      <div class="versus"><span>LIVE</span><b>VS</b><small>LV ${state.matchLevel}</small></div>
      ${renderFighterHud(wrestler(state,'viper'), 'heel')}
    </section>`;
}

function renderArenaOverlay() {
  if (ui.phase === 'ROLLING') {
    // The broadcast dice live in the ringside lower third, not on top of the
    // wrestler models. Keep the full ring visible during the complete roll.
    return '<div class="turn-chip turn-chip--dice"><span>RINGSIDE DICE</span><strong>OFFICIAL ROLL</strong></div>';
  }
  if (ui.phase === 'PIN' || ui.phase === 'PIN_DEFENSE') {
    const detail = ui.pinRolls ? `${ui.pinRolls.pinningTotal} vs ${ui.pinRolls.pinnedTotal}` : 'OPPOSED BGD';
    return `<div class="pin-overlay"><small>PIN ATTEMPT</small><strong>${ui.pinCount || '!'}</strong><span>${escapeHtml(detail)}</span></div>`;
  }
  if (ui.event) {
    return `<div class="event-overlay event-overlay--${ui.event.kind || 'major'}"><small>${escapeHtml(ui.event.kicker || '')}</small><strong>${escapeHtml(ui.event.title)}</strong><span>${escapeHtml(ui.event.detail || '')}</span></div>`;
  }
  if (state.phase === 'NEUTRAL_ROLL') {
    return `<div class="turn-chip"><span>N / N</span><strong>FIGHT FOR CONTROL</strong></div>`;
  }
  if (state.winnerId) {
    return `<div class="event-overlay event-overlay--spectacle"><small>WINNER</small><strong>${escapeHtml(wrestler(state,state.winnerId).name)}</strong><span>${state.winMethod==='submission'?'SUBMISSION':'PINFALL'} VICTORY</span></div>`;
  }
  const decision=turnDecision();
  if (['interrupt','hold-defense','pin-defense','ground-defense'].includes(decision.kind) && decision.actorId){
    const defending=wrestler(state,decision.actorId),holder=decision.controlId?wrestler(state,decision.controlId):null;
    const labels={'interrupt':'COUNTER WINDOW','hold-defense':'ESCAPE THE HOLD','pin-defense':'ROLL TO KICK OUT','ground-defense':'RECOVER FROM THE MAT'};
    return `<div class="turn-chip turn-chip--defense"><span>${escapeHtml(defending.name)} · ${roleFor(state,defending.id)} · DEFENDING</span><strong>${labels[decision.kind]}</strong><span>${holder?escapeHtml(holder.name)+' · HIGH CONTROL':''}</span></div>`;
  }
  const actor = currentActor();
  const defender = currentDefender();
  if (!actor || !defender) return '';
  return `<div class="turn-chip"><span>${escapeHtml(actor.name)} · ${roleFor(state,actor.id)}</span><strong>${escapeHtml(actor.name)} HAS CONTROL</strong><span>${escapeHtml(defender.name)} · ${roleFor(state,defender.id)}</span></div>`;
}

function renderArena() {
  return `
    <main class="arena-shell renderer-${rendererMode} ${ui.event?.impact ? 'is-impact' : ''}">
      <div class="arena-bg">
        <div class="arena-haze"></div>
        <div class="spot spot--blue"></div><div class="spot spot--red"></div><div class="spot spot--center"></div>
        <div class="light-rig"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="crowd crowd--far"></div><div class="crowd crowd--mid"></div><div class="crowd crowd--near"></div>
        <div class="crowd-signs"><i>STONE!</i><i>F&amp;H</i><i>VIPER!</i><i>★</i></div>
        <div class="arena-led"><span>FACES &amp; HEELS</span><span>LIVE</span><span>RING LEVEL ${state.matchLevel}</span></div>
        <div class="ring-stage">
          <div class="ring-mat"></div><div class="ring-apron"><span>FACES <b>&</b> HEELS</span></div>
          <i class="post p1"></i><i class="post p2"></i><i class="post p3"></i><i class="post p4"></i>
          <i class="rope r1"></i><i class="rope r2"></i><i class="rope r3"></i><i class="rope r4"></i>
        </div>
      </div>
      <canvas id="match-canvas" aria-label="Animated wrestling match"></canvas>
      <div class="arena-vignette"></div>
      <div class="broadcast-corner-bug" aria-hidden="true"><span class="live-dot"></span><b>LIVE</b><em>FACES &amp; HEELS</em></div>
      <div class="broadcast-match-id" aria-hidden="true">MAIN EVENT · LV ${state.matchLevel}</div>
      ${renderArenaOverlay()}
    </main>`;
}

function resolvedTargetLabel(move) {
  const decision = resolveTargetDecision(move, perspectiveState(state));
  if (decision.kind === 'choice') return `${decision.values.length} TARGETS`;
  if (decision.values.length === 1) return bodyLabel(decision.values[0]).toUpperCase();
  return 'AUTO';
}

function renderNeutral() {
 return renderCombatPrompt({
  kind:'neutral',kicker:'CENTER OF THE RING',title:'FIGHT FOR CONTROL',
  detail:'Opposed d20 + Agility decides who attacks first.',
  actions:[{action:'data-neutral-roll',label:'LOCK UP · ROLL',note:'STONE VS VIPER',primary:true}]
 });
}

function renderMoveCards() {
 const actor=currentActor(),defender=currentDefender();
 if(!actor||!defender)return renderNeutral();
 const turn=turnDecision();
 const allLegal=getLegalMoves(state);
 const allowed=moveFamilies(allLegal);
 if(ui.actionFamily&&!allowed.some(x=>x.id===ui.actionFamily))ui.actionFamily=null;
 return renderCombatDock({
  actor,defender,legalMoves:allLegal,family:ui.actionFamily,
  canRecover:turn.actions.some(a=>a.id===ACTION_IDS.RECOVER&&a.enabled)&&actor.stamina<=actor.maxStamina-5,
  canStand:turn.actions.some(a=>a.id===ACTION_IDS.SCRAMBLE&&a.enabled),
  finishRequired:state.mustFinishTargetId===defender.id&&defender.stamina<=0
 });
}

function renderTargetChoice() {
 const move=ui.selectedMove;
 const decision=resolveTargetDecision(move,perspectiveState(state));
 return renderCombatPrompt({
  kind:'target',kicker:move.legendary?'LEGENDARY FINISHER':move.category.toUpperCase(),
  title:move.name,detail:'CHOOSE BODY TARGET',
  actions:decision.values.map(target=>({action:`data-target="${escapeHtml(target)}"`,label:bodyLabel(target).toUpperCase()}))
 });
}

function renderSelectedMove() {
 const move=ui.selectedMove,actor=currentActor();
 if(!move||!actor)return '';
 const defender=currentDefender();
 const target=ui.selectedTarget||resolveTargetDecision(move,perspectiveState(state)).values[0];
 const boost=move.automatic?null:attackBoostEligibility(state,move);
 const extras=boost?.available?`<button type="button" class="dock-crowd-moment ${ui.spendCrowd?'is-on':''}" data-boost aria-pressed="${Boolean(ui.spendCrowd)}">★ ${ui.spendCrowd?'CROWD CALLED':'CALL THE CROWD'} <small>1 ${escapeHtml(actor.crowdResourceName)} · +1d6</small></button>`:'';
 const chance=boost?(ui.spendCrowd?boost.boostChance:boost.baseChance):null;
 return renderCombatPrompt({
  kind:'execute',kicker:move.legendary?'LEGENDARY':move.category.toUpperCase(),title:move.name,
  detail:`−${move.staminaCost} STA${target?' · '+bodyLabel(target).toUpperCase():''}${chance!==null?' · '+chance+'% HIT':''}`,
  actions:[
   {action:'data-back',label:'BACK'},
   {action:'data-roll',label:move.automatic?'PERFORM SETUP':'EXECUTE',note:move.automatic?'KEEP HIGH CONTROL':'ROLL d20',primary:true}
  ],extras
 });
}

function renderOpportunity(){
 const pinning=wrestler(state,state.pinningWrestlerId);
 const pinned=wrestler(state,opponentId(state.pinningWrestlerId));
 const forced=pinned.stamina<=0;
 return renderCombatPrompt({
  kind:'opportunity',kicker:'SHOULDERS DOWN',title:'PIN OPPORTUNITY',
  detail:`${pinned.name} IS PRONE${forced?' · FINISH REQUIRED':''}`,
  actions:[{action:'data-pin',label:'GO FOR PIN',note:'3 COUNT',primary:true},...(!forced?[{action:'data-continue',label:'CONTINUE OFFENSE'}]:[])],
  extras:renderPinEnergy({resourceName:pinning.crowdResourceName,resource:pinning.crowdResource,chosen:ui.pinCrowdSpend})
 });
}

function renderPinDefense(){
 const turn=turnDecision(),pinned=wrestler(state,turn.actorId);
 const pinning=turn.controlId?wrestler(state,turn.controlId):null;
 const next=Math.min(3,(ui.pinInfo?.count||0)+1);
 const humanId=aiEnabled()?matchSetup.playerId:null;
 const playerSide=(!aiEnabled()||humanId===pinned?.id)?pinned:(!aiEnabled()||humanId===pinning?.id)?pinning:null;
 return renderCombatPrompt({
  kind:'pin-defense',kicker:'REFEREE COUNT · '+next,title:'KICK OUT!',
  detail:`${pinned.name} VS ${pinning?.name||'OPPONENT'} · OPPOSED D20`,
  actions:[{action:'data-pin-defense',label:'ROLL KICKOUT',note:'DEFEND THE PIN',primary:true,danger:true}],
  extras:playerSide?renderPinEnergy({resourceName:playerSide.crowdResourceName,resource:playerSide.crowdResource,chosen:Math.min(ui.pinCrowdSpend,playerSide.crowdResource)}):''
 });
}

function renderReaction(){
 const pending=state.pendingFailure;
 if(!pending)return renderMoveCards();
 const reactor=wrestler(state,pending.defenderId);
 const moves=getAvailableReactions(state);
 return renderCombatPrompt({
  kind:'reaction',kicker:`${reactor.name} · COUNTER WINDOW`,title:'TAKE CONTROL',
  detail:'ONLY TRAINED COUNTERS ARE AVAILABLE',
  actions:[...moves.map(m=>({action:`data-reaction="${escapeHtml(m.id)}"`,label:m.name,note:`−${m.staminaCost} STA`,primary:true})),
    {action:'data-pass-reaction',label:'PASS'}]
 });
}

function renderGroundDefense(){
 const turn=turnDecision(),defender=wrestler(state,turn.actorId);
 return renderCombatPrompt({
  kind:'ground-defense',kicker:`${defender.name} · DEFENDING`,title:'GET OFF THE MAT',
  actions:[
    {action:'data-ground-scramble',label:'SCRAMBLE',note:'D20 + AGI',primary:true},
    {action:'data-ground-cover',label:'COVER UP',note:'REDUCE NEXT HIT'},
    {action:'data-ground-pass',label:'STAY DOWN'}
  ]
 });
}

function renderMatchIntro() {
  const solo=matchSetup.mode==='solo';
  const modeText=solo?'ONE PLAYER · YOU VS CPU':'TWO PLAYERS · LOCAL';
  const fighter=(id,role,tagline)=>`<div class="show-fighter show-fighter--${id}">
    <div class="show-fighter-portrait" aria-hidden="true">${portrait(id)}</div>
    <span class="show-fighter-tag">${role}</span>
    <strong class="show-fighter-name">${id.toUpperCase()}</strong>
    <span class="show-fighter-style">${tagline}</span>
  </div>`;
  return `<div class="match-intro broadcast-opening" role="dialog" aria-modal="true" aria-label="Faces and Heels main event match setup">
    <div class="show-open-shell">
      <div class="show-open-program" aria-label="Main event match card">
        <div class="show-open-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <header class="show-open-title">
          <span class="show-on-air"><i></i> LIVE · FACES &amp; HEELS PRESENTS</span>
          <h1><span>FACES</span><em>&amp;</em><span>HEELS</span></h1>
          <p>THE MAIN EVENT</p>
        </header>
        <div class="show-matchup">
          ${fighter('stone','THE FACE','POWERHOUSE · RED & GOLD')}
          <div class="show-versus"><span>TONIGHT</span><b>VS</b><small>ONE FALL</small></div>
          ${fighter('viper','THE HEEL','DAREDEVIL · BLACK & RED')}
        </div>
        <div class="show-lower-third"><span>MAIN EVENT</span><strong>STONE <em>VS</em> VIPER</strong><span>LIVE FROM THE F&amp;H ARENA</span></div>
        <div class="show-ticker" aria-hidden="true"><span>◆</span> EVERY ROLL COUNTS <span>◆</span> THE RING SETTLES IT <span>◆</span> CONTROL THE MAIN EVENT</div>
      </div>
      <section class="show-setup show-setup--compact" aria-label="Main event launch and match options">
        <div class="show-setup-heading">
          <span class="show-setup-kicker">TONIGHT · MAIN EVENT</span>
          <strong>READY TO RUMBLE?</strong>
          <small>${modeText}</small>
        </div>
        <button type="button" class="roll-button setup-enter-button" data-start-match>
          <strong>▶ PLAY</strong><small>ENTER THE RING</small>
        </button>
        <button type="button" class="show-options-toggle" data-match-options aria-expanded="${Boolean(typeof ui!=='undefined'&&ui.showMatchOptions)}" aria-controls="show-match-options">MATCH OPTIONS <span aria-hidden="true">⌄</span></button>
        <div class="show-match-options" id="show-match-options" ${typeof ui!=='undefined'&&ui.showMatchOptions?'':'hidden'}>
        <div class="show-setting-group">
          <p class="show-setting-label">MATCH TYPE</p>
          <div class="match-setup-modes" role="group" aria-label="Choose match mode">
            <button type="button" data-match-mode="solo" class="${solo?'is-selected':''}" aria-pressed="${solo}">SOLO vs CPU <small>CHALLENGE THE RIVAL</small></button>
            <button type="button" data-match-mode="local" class="${!solo?'is-selected':''}" aria-pressed="${!solo}">PASS &amp; PLAY <small>TAKE BOTH CORNERS</small></button>
          </div>
        </div>
        ${solo?`
          <div class="show-setting-group">
            <p class="setup-section-label">YOUR CORNER</p>
            <div class="setup-fighter-choices">
              ${['stone','viper'].map(id=>`<button type="button" data-player-id="${id}" class="${matchSetup.playerId===id?'is-selected':''}" aria-pressed="${matchSetup.playerId===id}">
                <span class="setup-fighter-portrait">${portrait(id)}</span>
                <strong>${id.toUpperCase()}</strong><small>${id==='stone'?'POWERHOUSE · FACE':'DAREDEVIL · HEEL'}</small>
              </button>`).join('')}
            </div>
          </div>
          <div class="show-setting-group">
            <div class="setup-difficulty"><span>CPU DIFFICULTY</span>
              <div role="group" aria-label="Opponent difficulty">${[['rookie','ROOKIE'],['standard','STANDARD'],['veteran','VETERAN']].map(([value,label])=>`<button type="button" data-difficulty="${value}" class="${matchSetup.difficulty===value?'is-selected':''}" aria-pressed="${matchSetup.difficulty===value}">${label}</button>`).join('')}</div>
            </div>
          </div>
          <button type="button" class="setup-guide-choice" data-toggle-coaching aria-pressed="${matchSetup.tutorial}">${matchSetup.tutorial?'✓':'○'} RINGSIDE COACH <small>${matchSetup.tutorial?'ON · Contextual tips':'OFF · No tips'}</small></button>
        `:`<div class="setup-local-note">Both corners are player controlled. Each wrestler rolls independently for every defensive opportunity, pin count and attack.</div>`}
        </div>
        <p class="intro-help">STONE VS VIPER · ORIGINAL WRESTLERS</p>
      </section>
    </div>
  </div>`;
}
function renderCoachHint(){
  if(!aiEnabled()||!matchSetup.tutorial||ui.coachingDismissed||introOpen||state.winnerId||isAiDecision(state,matchSetup))return '';
  const notes={
    ACTION_SELECT:'SWIPE THE MOVE BAR. A move costs your stamina and drains more from your rival when it lands.',
    SELECTED:'CHECK THE HIT CHANCE. Tap ATTEMPT MOVE to roll a d20, or BACK to choose another.',
    TARGET_CHOICE:'CHOOSE A BODY PART. Damage marks make escaping pins harder.',
    REACTION:'YOUR RIVAL MISSED. Counter with a learned move or pass.',
    HOLD_ESCAPE:'YOU ARE GRAPPLED. Roll to escape even while the opponent has control.',
    HOLD:'YOUR HOLD IS LOCKED. Apply pressure, switch holds or release for a pin chance.',
    GROUND_DEFENSE:'WHILE PRONE, YOU CAN SCRAMBLE, COVER UP OR STAY DOWN.',
    OPPORTUNITY:'YOUR RIVAL IS DOWN. Try a three-count pin or continue offense.',
    PIN_DEFENSE:'YOU ARE PINNED. ROLL TO KICK OUT ON EACH COUNT.',
    MATCH_COMPLETE:'MATCH COMPLETE. WIN OR LOSE, TRY A REMATCH TO LEARN THE TIMING.'
  };
  const note=notes[ui.phase];
  if(!note)return '';
  return `<div class="ringside-coach"><span class="coach-tag">RINGSIDE COACH</span><span>${escapeHtml(note)}</span><button type="button" data-dismiss-guide aria-label="Turn off gameplay tips">×</button></div>`;
}
function renderAiThinking(){
  const id=aiWrestlerId(matchSetup),who=id?wrestler(state,id):null;
  return `<section class="decision-panel decision-panel--cpu" aria-label="Computer opponent thinking">
    <span class="cpu-indicator" aria-hidden="true">◉</span><strong>${who?escapeHtml(who.name):'CPU'} · CPU TURN</strong>
    <span>READING THE RING · CHOOSING AN ACTION</span>
  </section>`;
}
function renderMatchComplete() {
  const winner = wrestler(state, state.winnerId);
  return `
    <section class="decision-panel decision-panel--winner"><div class="winner-portrait">${portrait(winner.id)}</div>
      <div class="opportunity-copy"><small>MATCH COMPLETE</small><strong>${escapeHtml(winner.name)} WINS</strong><span>${state.winMethod==='submission'?'Submission':'Pinfall'} · ${state.turnCounter} resolved actions · ${highlights.length} highlights</span><div class="result-record">STONE ${progression.wins.stone} — ${progression.wins.viper} VIPER</div><p class="result-highlight">${escapeHtml(highlights.at(-1) || (state.winMethod==='submission'?'The wrestler finally taps out.':'The final three-count settles the match.'))}</p></div>
      <div class="victory-actions"><button class="pin-button" data-new-match>REMATCH</button><button class="continue-button" data-drawer="highlights">HIGHLIGHTS</button><button class="continue-button" data-drawer="progress">CAREER</button></div>
    </section>`;
}

function renderHoldDock(){
 const hold=state.activeHold;
 if(!hold)return renderMoveCards();
 const move=demoMoves.find(m=>m.id===hold.moveId);
 if(!move||!move.sustained)return '';
 const holder=wrestler(state,hold.holderId),trapped=wrestler(state,hold.defenderId);
 const defending=state.phase==='HOLD_ESCAPE',finalAttempt=Boolean(hold.finishPending);
 const spec=move.sustained;
 return renderCombatPrompt({
  kind:defending?'hold-escape':'hold',kicker:`${move.name.toUpperCase()} · ${hold.ticks} PRESSURE`,
  title:defending?(finalAttempt?'LAST-CHANCE ESCAPE':'BREAK THE HOLD'):'HOLD LOCKED',
  detail:defending?`${trapped.name} MUST FIGHT FREE`:`${holder.name} HAS HIGH CONTROL`,
  actions:defending?
   [{action:'data-hold-escape',label:finalAttempt?'FINAL ESCAPE':'ESCAPE',note:'D20 + AGI',primary:true,danger:finalAttempt}]:
   [{action:'data-hold-squeeze',label:'TIGHTEN',note:`−${spec.tickCost} STA`,primary:true,disabled:holder.stamina<spec.tickCost},
    ...availableHoldTransitions(state).map(t=>({action:`data-hold-switch="${escapeHtml(t.id)}"`,label:'SWITCH: '+t.name,note:`−${t.cost} STA`})),
    {action:'data-hold-release',label:'RELEASE HOLD'}]
 });
}

function renderDecisionDock() {
  if (ui.phase === 'ROLLING' && ui.broadcastRoll)
    return renderBroadcastDice(ui.broadcastRoll);
  if(aiEnabled()&&isAiDecision(state,matchSetup)&&!['ROLLING','ANIMATING'].includes(ui.phase))return renderAiThinking();
  if (ui.phase === 'NEUTRAL_ROLL') return renderNeutral();
  if (ui.phase === 'HOLD' || ui.phase === 'HOLD_ESCAPE') return renderHoldDock();
  if (ui.phase === 'TARGET_CHOICE') return renderTargetChoice();
  if (ui.phase === 'SELECTED') return renderSelectedMove();
  if (ui.phase === 'OPPORTUNITY') return renderOpportunity();
  if (ui.phase === 'REACTION') return renderReaction();
  if (ui.phase === 'GROUND_DEFENSE') return renderGroundDefense();
  if (ui.phase === 'PIN_DEFENSE') return renderPinDefense();
  if (ui.phase === 'MATCH_COMPLETE') return renderMatchComplete();
  if (['ROLLING','ANIMATING','PIN'].includes(ui.phase)) return '';
  return renderMoveCards();
}

function renderBodyDrawer(wrestlerId) {
  const w = wrestler(state, wrestlerId);
  const damage = w.bodyDamage;
  const parts = [['head','Head'],['core','Core'],['leftArm','Left Arm'],['rightArm','Right Arm'],['leftLeg','Left Leg'],['rightLeg','Right Leg']];
  return `
    <div class="drawer-backdrop" data-close-drawer></div>
    <aside class="drawer">
      <header><div><small>BODY STATUS · ${roleFor(state,wrestlerId)}</small><strong>${escapeHtml(w.name)}</strong></div><button data-close-drawer aria-label="Close panel">×</button></header>
      <div class="loadout-heading"><strong>${escapeHtml(w.style.toUpperCase())}</strong><span>${w.commonMoves.length} COMMON · ${w.legendaryMoves.length}/${MAX_LEGENDARY_MOVES} LEGENDARY</span></div><div class="loadout-signatures">${w.legendaryMoves.map(id=>`<span>★ ${escapeHtml(demoMoves.find(m=>m.id===id)?.name||id)}</span>`).join('')}</div><div class="stat-summary"><span>Power <b>${statModifier(w.stats.Power) >= 0 ? '+' : ''}${statModifier(w.stats.Power)}</b></span><span>Agility <b>${statModifier(w.stats.Agility) >= 0 ? '+' : ''}${statModifier(w.stats.Agility)}</b></span><span>CON <b>${conditioning(w)}</b></span><span>Marks <b>${totalBodyMarks(w)}</b></span></div>
      <div class="body-figure">${damageDiagram(damage)}</div>
      <div class="damage-list">${parts.map(([key,label]) => `<div><span>${label}</span><b class="damage-${Math.min(3,damage[key]||0)}">${damage[key]||0} / 3</b></div>`).join('')}</div>
      <details class="wrestler-movebook"><summary>LEARNED COMMON MOVES</summary><div>${w.commonMoves.map(id=>`<span>${escapeHtml(demoMoves.find(m=>m.id===id)?.name||id)}</span>`).join('')}</div></details><p class="drawer-note">Body marks penalize pin rolls. Damage marks are earned only when a move's damage die beats that body part's threshold.</p>
    </aside>`;
}

function renderMenuDrawer() {
  return `
    <div class="drawer-backdrop" data-close-drawer></div><aside class="drawer">
      <header><div><small>FACES &amp; HEELS</small><strong>Ringside menu</strong></div><button data-close-drawer aria-label="Close panel">×</button></header>
      <button class="drawer-action" data-drawer="settings"><span>⚙</span><div><strong>Presentation settings</strong><small>Sound, motion, flash and speed.</small></div></button>
      <button class="drawer-action" data-drawer="progress"><span>▤</span><div><strong>Championship journey</strong><small>Local match series, rewards and rivalry.</small></div></button>
      <button class="drawer-action" data-drawer="log"><span>☷</span><div><strong>Match Log</strong><small>Rolls, control changes, damage, pins and recovery.</small></div></button>
      <button class="drawer-action" data-body="stone"><span>◉</span><div><strong>Stone Status</strong><small>Stats, body marks and stamina.</small></div></button>
      <button class="drawer-action" data-body="viper"><span>◉</span><div><strong>Viper Status</strong><small>Stats, body marks and stamina.</small></div></button>
      <div class="principle-card"><small>THE MATCH</small><strong>Keep control until the opponent steals it.<br>Prone creates a pin chance.</strong></div>
    </aside>`;
}

function renderLogDrawer() {
  return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer drawer--wide"><header><div><small>TRANSPARENT RULES</small><strong>Match Log</strong></div><button data-close-drawer aria-label="Close panel">×</button></header><div class="log-list">${matchLog.slice().reverse().map((entry,i) => `<div><span>${matchLog.length-i}</span><p>${escapeHtml(entry)}</p></div>`).join('')}</div></aside>`;
}

function renderSettingsDrawer(){return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer"><header><strong>Presentation settings</strong><button data-close-drawer aria-label="Close panel">×</button></header><p class="drawer-note">These settings change presentation only. Dice rolls and rules are identical.</p>${[['muted','Mute sound'],['reducedMotion','Reduced motion'],['reducedFlash','Reduced flash'],['fast','Fast presentation']].map(([key,label])=>`<label class="setting-option"><span>${label}</span><input type="checkbox" data-setting="${key}" ${settings[key]?'checked':''}></label>`).join('')}<details class="developer-options"><summary>Arena tools &amp; build info</summary><div class="lab-controls">${[['iso','Isometric'],['sprite','Sprites'],['compare','Compare']].map(([mode,label])=>`<button data-renderer="${mode}" aria-pressed="${rendererMode===mode}">${label}</button>`).join('')}</div><a href="./motion-lab.html">Open motion lab ↗</a><p>Build 1.19.0 · provisional digital rules</p></details></aside>`;}
function renderProgressDrawer(){return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer drawer--wide"><header><strong>Championship journey</strong><button data-close-drawer aria-label="Close panel">×</button></header><div class="championship-track">${[1,2,3].map(n=>`<span class="${progression.series>=n?'is-earned':''}"><b>${n}</b>${['DEBUT','SPOTLIGHT','TITLE ARENA'][n-1]}</span>`).join('')}</div><p class="drawer-note">Three-match championship series. Results and cosmetic unlocks live only on this device. No combat bonuses.</p><div class="stat-summary"><span>Stone wins <b>${progression.wins.stone}</b></span><span>Viper wins <b>${progression.wins.viper}</b></span><span>Matches <b>${progression.series}</b></span><span>Champion <b>${progression.champion?.toUpperCase()||'UNDECIDED'}</b></span></div><button class="drawer-action" data-toggle-career><strong>${progression.mode==='championship'?'CHAMPIONSHIP ACTIVE':'START CHAMPIONSHIP SERIES'}</strong></button><p class="drawer-note">Rewards: ${progression.palette==='spotlight'?'Spotlight palette unlocked':'Spotlight palette after 2 matches'} · ${progression.theme==='championship'?'Championship arena unlocked':'Championship arena after 3 matches'}</p>${progression.history.slice(-6).reverse().map(m=>`<p class="history-row">MATCH ${m.number} · ${m.winner.toUpperCase()} won · ${m.actions} actions</p>`).join('')}<div class="legendary-progress"><strong>LEGENDARY FINISHERS</strong><span>${progression.matPasses} / 10 MAT PASSES AVAILABLE</span></div>${['stone','viper'].map(id=>{const w=wrestler(state,id),candidates=LEGENDARY_CATALOG[w.style]||[];return `<details class="legendary-catalog"><summary>${escapeHtml(w.name)} · ${escapeHtml(w.style)} · ${w.legendaryMoves.length}/${MAX_LEGENDARY_MOVES} LEARNED</summary><div class="legendary-catalog-list">${candidates.map(candidate=>`<div><span>${escapeHtml(candidate.name)}${candidate.signatureFor===id?' · SIGNATURE':''}</span><em>${w.legendaryMoves.includes(candidate.id)?'LEARNED':candidate.status==='planned'?'CHOREOGRAPHY PENDING':'AVAILABLE'}</em></div>`).join('')}</div></details>`}).join('')}<p class="drawer-note">The original rules allow up to four style Legendary Moves per wrestler, learned with Mat Passes. Only fully animated finishers are playable; upcoming entries cannot be selected or unlocked yet.</p><button class="continue-button" data-reset-progress>RESET PROGRESSION</button></aside>`;}
function renderHighlightsDrawer(){return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer drawer--wide"><header><strong>Match highlights</strong><button data-close-drawer aria-label="Close panel">×</button></header>${highlights.length?highlights.slice(-12).reverse().map(x=>`<p class="history-row">${escapeHtml(x)}</p>`).join(''):'<p>No highlights yet.</p>'}</aside>`;}
function renderDrawer() {
  if (!ui.drawer) return '';
  if (ui.drawer === 'menu') return renderMenuDrawer();
  if (ui.drawer === 'settings') return renderSettingsDrawer();
  if (ui.drawer === 'progress') return renderProgressDrawer();
  if (ui.drawer === 'highlights') return renderHighlightsDrawer();
  if (ui.drawer === 'log') return renderLogDrawer();
  if (ui.drawer === 'stone' || ui.drawer === 'viper') return renderBodyDrawer(ui.drawer);
  return '';
}

let previousDrawer = null;
let returnFocus = null;
function focusKey(el) { return el?.dataset ? Object.entries(el.dataset).find(([key])=>['dockFamily','dockBack','matchOptions','move','target','drawer','body','boost','roll','neutralRoll','startMatch','renderer','setting','pin','moreMoves','filter','back'].includes(key)) : null; }
function render() {
  const focused = focusKey(document.activeElement);
  if (ui.drawer && !previousDrawer) returnFocus = focused;
  const closedDrawer = previousDrawer && !ui.drawer;
  const openedDrawer = ui.drawer && ui.drawer !== previousDrawer;
  previousDrawer = ui.drawer;
  syncUiToEngine();
  const previousRail = app.querySelector('[data-action-rail]');
  if (previousRail && ui.phase === 'ACTION_SELECT') ui.railOffset = previousRail.scrollLeft;
  const oldCanvas = document.querySelector('#match-canvas');
  app.innerHTML = `<div class="game-shell phase-${ui.phase.toLowerCase()} ${progression.theme==='championship'?'is-championship':''}">${renderHeader()}<div class="arena-combat-zone">${renderArena()}<div class="tactical-menu-anchor">${ui.showCoach?renderCoachHint():''}${renderDecisionDock()}</div></div><footer><span>RINGSIDE LIVE · ${state.turnCounter} ACTIONS</span><button data-drawer="log">MATCH LOG</button></footer></div>${renderDrawer()}${introOpen ? renderMatchIntro() : ''}`;
  const canvas = document.querySelector('#match-canvas');
  if (!stage) {
    stage = new IsoStage(canvas);
    stage.mode=rendererMode;
    stage.init().then(() => stage.setRestingState({ postures: { stone: wrestler(state,'stone').posture, viper: wrestler(state,'viper').posture } })).catch(error=>{console.error('Sprite assets failed to load',error);});
  } else if (oldCanvas !== canvas) {
    canvas.replaceWith(oldCanvas);
    stage.resize();
  }
  const drawer=document.querySelector('.drawer');
  if(drawer){drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-label',drawer.querySelector('header strong')?.textContent||'Ringside');}
  const shell=document.querySelector('.game-shell');
  if(shell) shell.inert=Boolean(drawer||introOpen);
  if(openedDrawer) drawer?.querySelector('button')?.focus();
  else {
    const key=closedDrawer?returnFocus:focused;
    if(key) [...app.querySelectorAll('button,input')].find(el=>el.dataset[key[0]]===key[1])?.focus({preventScroll:true});
  }
  const rail=app.querySelector('[data-action-rail]');
  if(rail){rail.scrollLeft=ui.railOffset;updateActionRail(rail);}
  stage.mode=state.activeHold?'iso':rendererMode;stage.fast=settings.fast;stage.reducedMotion=settings.reducedMotion;stage.reducedFlash=settings.reducedFlash;
  queueAiTurn();

}


// Native horizontal scrolling drives the ribbon. DOM can be rebuilt during rolls
// and HUD updates; offset is retained without losing a player's place in the list.
function updateActionRail(rail) {
  if(!rail)return;
  const max=Math.max(0,rail.scrollWidth-rail.clientWidth);
  const position=Math.max(0,Math.min(max,rail.scrollLeft));
  const cards=[...rail.querySelectorAll('[data-move]')];
  const stride=cards.length>1?cards[1].offsetLeft-cards[0].offsetLeft:(cards[0]?.offsetWidth||1);
  const first=cards.length?Math.min(cards.length-1,Math.floor((position+2)/Math.max(1,stride))):0;
  const visible=Math.max(1,Math.ceil((rail.clientWidth-12)/Math.max(1,stride)));
  const last=Math.min(cards.length,first+visible);
  const header=rail.closest('.decision-panel');
  const output=header?.querySelector('[data-rail-counter]');
  if(output)output.textContent=`${String(first+1).padStart(2,'0')}–${String(last).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
  const indicator=header?.querySelector('[data-rail-progress]');
  if(indicator) {
    const share=rail.scrollWidth?Math.min(100,rail.clientWidth/rail.scrollWidth*100):100;
    indicator.style.width=`${share}%`;
    indicator.style.left=`${max?(position/max)*(100-share):0}%`;
  }
  const prev=header?.querySelector('[data-rail-step="-1"]'),next=header?.querySelector('[data-rail-step="1"]');
  if(prev)prev.disabled=position<2;
  if(next)next.disabled=position>=max-2;
}

function announce(title, detail = '', kind = 'major', impact = false, ms = 1050) {
  if (eventTimer) clearTimeout(eventTimer);
  ui.event = { title, detail, kind, impact };
  render();
  eventTimer = setTimeout(() => { ui.event = null; render(); }, ms);
}

async function readableDicePause(ms=1750) {
  // The final values are a decision, not an animation frame. Never shorten
  // this hold to 100ms in Reduced Motion; only explicit Fast mode can shorten it.
  await new Promise(resolve=>setTimeout(resolve,settings.fast?Math.max(900,Math.round(ms*.58)):ms));
}
async function rollingVisual(label,finalRoll,{
  mode='target',leftLabel=null,rightLabel='TARGET',rightRoll=null,
  target=null,leftMeta='D20',rightMeta=null,caption=''
}={}) {
  ui.phase='ROLLING';
  ui.rollLabel=label;
  ui.roll=null;
  ui.broadcastRoll={
    title:label,mode,leftLabel:leftLabel||'YOUR ROLL',
    leftValue:null,rightLabel,
    rightValue:mode==='target'?target:null,
    leftMeta,rightMeta:rightMeta||(mode==='target'?'STATIC DC':'D20'),
    caption:caption||(mode==='opposed'?'Both wrestlers roll d20. Modifiers apply to the totals.':'Roll d20 against the displayed fixed target.'),
    result:'',live:true
  };
  render();
  if(!settings.reducedMotion){
    for(let i=0;i<3;i++){
      await wait(115);
      ui.broadcastRoll.leftValue=rollDie(20);
      if(mode==='opposed')ui.broadcastRoll.rightValue=rollDie(20);
      render();
    }
  }
  ui.roll=finalRoll;
  ui.broadcastRoll.leftValue=finalRoll;
  ui.broadcastRoll.rightValue=mode==='opposed'?rightRoll:target;
  ui.broadcastRoll.live=false;
  render();
  // A true ~1.75s settled view gives players time to read BOTH dice.
  await readableDicePause(1750);
}
async function settleRollingVisual({leftTotal=null,rightTotal=null,result='' }={}){
  if(ui.phase!=='ROLLING'||!ui.broadcastRoll)return;
  if(leftTotal!==null)ui.broadcastRoll.leftMeta=`TOTAL ${leftTotal}`;
  if(rightTotal!==null)ui.broadcastRoll.rightMeta=`TOTAL ${rightTotal}`;
  ui.broadcastRoll.result=result;
  render();
  await readableDicePause(950);
}

async function rollNeutral() {
  audio.cue('bell');
  const stoneRoll = rollDie(20);
  const viperRoll = rollDie(20);
  await rollingVisual('FIGHT FOR CONTROL',stoneRoll,{
    mode:'opposed',leftLabel:'STONE',rightLabel:'VIPER',rightRoll:viperRoll,
    leftMeta:'D20 + AGILITY',rightMeta:'D20 + AGILITY',
    caption:'Both wrestlers roll d20; the higher Agility-adjusted total wins control.'
  });
  const result = resolveNeutralRoll(state,stoneRoll,viperRoll);
  await settleRollingVisual({leftTotal:result.stoneTotal,rightTotal:result.viperTotal,
    result:result.tie?'TIE · ROLL AGAIN':`${wrestler(state,result.winnerId).name} WINS CONTROL`});
  ui.phase = 'ANIMATING'; render();
  await stage.playLockup();
  ui.neutralRolls = result;
  if (result.tie) {
    log(`Neutral tie: Stone ${result.stoneTotal}, Viper ${result.viperTotal}. Roll again.`);
    ui.phase = 'NEUTRAL_ROLL';
    announce('NEUTRAL TIE!', `${result.stoneTotal} – ${result.viperTotal} · roll again`, 'major', false, 850);
    return;
  }
  const winner = wrestler(state, result.winnerId);
  log(`Neutral: Stone ${result.stoneTotal}, Viper ${result.viperTotal}. ${winner.name} becomes H.`);
  ui.phase = 'ACTION_SELECT';
  ui.neutralRolls = null;
  announce(`${winner.name} GAINS CONTROL`, 'H momentum established', 'major', false, 900);
  stage?.setRestingState({ postures: { stone: wrestler(state,'stone').posture, viper: wrestler(state,'viper').posture } });
}

function selectMove(move) {
  audio.cue('select');
  ui.selectedMove = move;
  ui.selectedTarget = null;
  ui.spendCrowd = 0;
  const target = resolveTargetDecision(move, perspectiveState(state));
  if (target.kind === 'choice') ui.phase = 'TARGET_CHOICE';
  else {
    ui.selectedTarget = target.values[0] || null;
    ui.phase = 'SELECTED';
    if (ui.selectedTarget) log(`${currentActor().name} chose ${move.name}; ${bodyLabel(ui.selectedTarget)} auto-resolved.`);
  }
  render();
}

async function playSuccessfulMove(move, result) {
  ui.phase = 'ANIMATING';
  render();
  const anim = animationByMove[move.id];
  if (!anim) {
    // Never substitute an idle performance or unrelated strike for a named move.
    console.error('Missing paired animation for move:',move.id);
    log(`Animation mapping missing: ${move.name}`);
    await wait(100);
    stage.resetPositions();
    stage.setRestingState({ postures: { stone: wrestler(state,'stone').posture, viper: wrestler(state,'viper').posture } });
    ui.selectedMove = null;
    ui.selectedTarget = null;
    ui.spendCrowd = 0;
    ui.phase = state.pinEligible ? 'OPPORTUNITY' : 'ACTION_SELECT';
    render();
    return;
  }
  if(move.category==='special')audio.cue('finisher');
  if(move.category==='setup')audio.cue('select');
  await stage.playPair(anim.attacker, anim.defender, {
    attackerId: result.attackerId,
    moveId: move.id,
    impactFrame: anim.impactFrame,
    choreography: anim.choreography,
    impactKind: anim.kind,
    hitStopMs: anim.hitStopMs,
    onImpact: () => {
      if (move.category === 'setup') return;
      audio.cue(anim.kind==='slam'?'heavy':'light');
      const arena = document.querySelector('.arena-shell');
      const ring = document.querySelector('.ring-stage');
      arena?.classList.add(anim.kind === 'slam' ? 'impact-shake--slam' : 'impact-shake');
      ring?.classList.add(anim.kind === 'slam' ? 'ring-bounce--slam' : 'ring-bounce');
      setTimeout(() => { arena?.classList.remove('impact-shake','impact-shake--slam'); ring?.classList.remove('ring-bounce','ring-bounce--slam'); }, anim.kind === 'slam' ? 260 : 180);
      const damageText = result.target ? (result.damage?.marked ? `${bodyLabel(result.target).toUpperCase()} MARK +1` : `${bodyLabel(result.target).toUpperCase()} HOLDS`) : 'POSITION CONTROL';
      ui.event = { title: `${move.name.toUpperCase()}!`, detail: `${damageText} · -${result.staminaDamage} STA`, kind: move.category === 'special' ? 'spectacle' : 'major', impact: true };
      render();
    }
  });
  stage.resetPositions();
  ui.event = null;
  if(state.activeHold)stage.setHold(state.activeHold);
  else stage.setRestingState({ postures: { stone: wrestler(state,'stone').posture, viper: wrestler(state,'viper').posture } });
  ui.selectedMove = null;
  ui.selectedTarget = null;
  ui.spendCrowd = 0;
  ui.phase = state.activeHold?'HOLD_ESCAPE':(state.pinEligible ? 'OPPORTUNITY' : 'ACTION_SELECT');
  ui.railOffset=0;ui.filter='all';
  render();
  if (move.category === 'setup') announce(move.name.toUpperCase(), `OPPONENT −${result.staminaDamage} STA · CONTROL RETAINED`, 'major', false, 720);
}

async function rollMove() {
  const move = ui.selectedMove;
  if (!move) return;
  if (move.automatic) {
    // Setup actions are uncontested while High control is held. The engine
    // applies stamina and posture rules, then the paired choreography plays.
    const result = resolveMoveAttempt(state, {
      moveId: move.id,
      attackRoll: 20,
      damageRoll: 0,
      crowdSpend: 0
    });
    log(`${wrestler(state,result.attackerId).name} performs ${move.name}; ${wrestler(state,result.defenderId).name} becomes ${wrestler(state,result.defenderId).posture}. High control retained.`);
    await playSuccessfulMove(move, result);
    return;
  }
  const attackRoll = rollDie(20);
  const damageRoll = rollDie(move.damageDie || 4);
  await rollingVisual(`${currentActor().name} · ${move.name}`,attackRoll,{
    mode:'target',leftLabel:currentActor().name,rightLabel:`${currentDefender().name} · CON`,
    target:conditioning(currentDefender()),leftMeta:'ATTACK D20',rightMeta:'STATIC CON',
    caption:'The defender uses passive Conditioning, not another d20.'
  });
  const boostAllowed=attackBoostEligibility(state,move).available;
  const crowdSpend=boostAllowed?ui.spendCrowd:0;
  const crowdRolls=crowdSpend?[rollDie(6)]:[];
  const result=resolveMoveAttempt(state,{moveId:move.id,target:ui.selectedTarget,attackRoll,damageRoll,crowdSpend,crowdRolls});
  await settleRollingVisual({leftTotal:result.total,rightTotal:result.targetNumber,
    result:`${result.success?'MOVE CONNECTS':'ATTACK MISSES'}${result.spentCrowd?' · CROWD +'+result.crowdBonus:''}`});
  log(`${wrestler(state,result.attackerId).name} ${move.name}: d20 ${attackRoll} ${result.modifier >= 0 ? '+' : ''}${result.modifier}${result.spentCrowd ? ` +${result.crowdBonus} Heat/Pop d6` : ''}${result.tieUpBonus ? ` +${result.tieUpBonus} tie-up control` : ''} = ${result.total} vs CON ${result.targetNumber}.`);
  if (!result.success) {
    log(`${move.name} missed. ${canReact(state) ? `${wrestler(state,result.defenderId).name} may react.` : 'No legal reaction; control state continues.'}`);
    ui.selectedMove = null;
    ui.selectedTarget = null;
    ui.spendCrowd = 0;
    ui.phase = state.phase === 'REACTION' ? 'REACTION' : (state.phase === 'NEUTRAL_ROLL' ? 'NEUTRAL_ROLL' : 'ACTION_SELECT');
    audio.cue('light');
    announce('MISS!', state.phase === 'REACTION' ? `${wrestler(state,result.defenderId).name} can counter` : 'Control holds', 'danger', false, 850);
    return;
  }
  const damageSummary = result.damage ? `Damage d${move.damageDie}: ${result.damage.damageRoll} vs ${result.damage.threshold}${result.damage.marked ? ' → body mark' : ' → no mark'}.` : '';
  log(`${move.name} connects. ${damageSummary} ${wrestler(state,result.defenderId).name} loses ${result.staminaDamage} STA.${result.crowdGained ? ` ${wrestler(state,result.attackerId).name} gains ${result.crowdGained} ${wrestler(state,result.attackerId).crowdResourceName}.` : ''}`);
  if (result.pinEligible) log(`${wrestler(state,result.defenderId).name} ends prone: pin opportunity created${result.forcedPin ? ' and is mandatory at 0 STA' : ''}.`);
  await playSuccessfulMove(move, result);
}


function performHoldPressure(){
  if(state.phase!=='HOLD'||ui.phase!=='HOLD')return;
  const result=maintainHold(state);
  if(!result.ok){announce('CANNOT MAINTAIN',result.reason,'danger',false,750);return;}
  const holder=wrestler(state,result.holderId),trapped=wrestler(state,result.defenderId);
  log(`${holder.name} tightens the hold: -${result.cost} STA to maintain, -${result.staminaDamage} STA to ${trapped.name}.`);
  ui.phase=state.phase;
  if(result.submitted){
    stage?.setHold(null);
    stage?.setRestingState({postures:{stone:wrestler(state,'stone').posture,viper:wrestler(state,'viper').posture}});
    log(`${trapped.name} submits to ${holder.name}!`);
    audio.cue('victory');
    highlights.push(`${holder.name} forces ${trapped.name} to submit.`);
    if(!resultRecorded){progression=recordResult(progression,result.holderId,result.defenderId,state.turnCounter,highlights);saveProgress(localStorage,progression);resultRecorded=true;}
    announce('SUBMISSION!',`${holder.name} WINS`,'spectacle',false,1200);
  }else{
    stage?.setHold(state.activeHold);
    announce('HOLD TIGHTENS',`${trapped.name} -${result.staminaDamage} STA · escape window`,'major',false,720);
  }
  render();
}
function performHoldSwitch(moveId){
  if(state.phase!=='HOLD'||ui.phase!=='HOLD')return;
  const result=transitionHold(state,{moveId});
  if(!result.ok){announce('SWITCH UNAVAILABLE',result.reason,'danger',false,700);return;}
  const name=demoMoves.find(m=>m.id===result.to)?.name||result.to;
  stage?.playHoldTransition(result.from,result.to,result.holderId);
  log(`${wrestler(state,result.holderId).name} switches to ${name}: -${result.cost} stamina, -${result.staminaDamage} opponent stamina. New escape window.`);
  ui.phase='HOLD_ESCAPE';
  announce('HOLD TRANSITION',name.toUpperCase()+' · ESCAPE WINDOW','major',false,760);
  render();
}

function performHoldRelease(){
  if(state.phase!=='HOLD'||ui.phase!=='HOLD')return;
  const result=releaseHold(state);
  if(!result.ok)return;
  stage?.setHold(null);
  stage?.setRestingState({postures:{stone:wrestler(state,'stone').posture,viper:wrestler(state,'viper').posture}});
  ui.phase=result.pinEligible?'OPPORTUNITY':'ACTION_SELECT';
  log(`${wrestler(state,result.holderId).name} releases the submission, retaining control.`);
  announce('HOLD RELEASED',result.pinEligible?'PIN OPPORTUNITY':'HIGH CONTROL RETAINED','major',false,800);
}
async function performHoldEscape(){
  if(state.phase!=='HOLD_ESCAPE'||ui.phase!=='HOLD_ESCAPE')return;
  const defender=wrestler(state,state.activeHold.defenderId),roll=rollDie(20);
  const hold=state.activeHold,holder=wrestler(state,hold.holderId),
    holdSpec=demoMoves.find(m=>m.id===hold.moveId).sustained;
  const dc=10+statModifier(holder.stats[holdSpec.holdStat])+Math.min(3,hold.ticks);
  await rollingVisual(`${defender.name} · ESCAPE HOLD`,roll,{
    mode:'target',leftLabel:defender.name,rightLabel:'HOLD ESCAPE DC',
    target:dc,leftMeta:'D20 + AGILITY',rightMeta:'ESCAPE TARGET',
    caption:'The trapped wrestler rolls. The opponent maintains the hold.'
  });
  const result=escapeHold(state,{escapeRoll:roll});
  if(result.ok)await settleRollingVisual({leftTotal:result.total,rightTotal:result.targetNumber,
    result:result.ropeBreak?'ROPE BREAK':result.reversal?'ESCAPE & REVERSAL':result.success?'HOLD BROKEN':result.submitted?'SUBMISSION':'STILL TRAPPED'});
  if(!result.ok)return;
  const name=wrestler(state,result.defenderId).name;
  log(`${name} escape: d20 ${result.escapeRoll} ${result.modifier>=0?'+':''}${result.modifier} = ${result.total} vs ${result.targetNumber}. ${result.success?'Hold broken.':result.submitted?'Submission!':'Still trapped.'}`);
  if(result.success){
    stage?.setHold(null);
    stage?.setRestingState({postures:{stone:wrestler(state,'stone').posture,viper:wrestler(state,'viper').posture}});
    ui.phase=result.reversal?'ACTION_SELECT':'NEUTRAL_ROLL';
    announce(result.reversal?'GRAPPLE REVERSED!':'ESCAPED!',result.reversal?`${name} takes High control`:`${name} breaks free · neutral restart`,'major',false,900);
  }else if(result.submitted){
    const holder=wrestler(state,result.holderId),trapped=wrestler(state,result.defenderId);
    stage?.setHold(null);
    stage?.setRestingState({postures:{stone:wrestler(state,'stone').posture,viper:wrestler(state,'viper').posture}});
    highlights.push(`${holder.name} forces ${trapped.name} to submit after the final escape attempt.`);
    if(!resultRecorded){progression=recordResult(progression,result.holderId,result.defenderId,state.turnCounter,highlights);saveProgress(localStorage,progression);resultRecorded=true;}
    ui.phase='MATCH_COMPLETE';
    audio.cue('victory');
    announce('SUBMISSION!',`${holder.name} WINS · FINAL ESCAPE FAILED`,'spectacle',false,1200);
  }else{
    stage?.setHold(state.activeHold);
    ui.phase='HOLD';
    announce('NO ESCAPE',`${name} is still trapped`,'danger',false,750);
  }
}

async function runReaction(moveId) {
  if(!state.pendingFailure||!canReact(state))return;
  const chosen=getAvailableReactions(state).find(move=>move.id===moveId);
  if(!chosen)return;
  const reactorId=state.pendingFailure.defenderId;
  const reactionRoll=rollDie(20),damageRoll=rollDie(chosen.damageDie);
  await rollingVisual(`${wrestler(state,reactorId).name} · COUNTER`,reactionRoll,{
    mode:'target',leftLabel:wrestler(state,reactorId).name,rightLabel:'ATTACKER CON',
    target:conditioning(wrestler(state,state.pendingFailure.attackerId)),
    leftMeta:'COUNTER D20',rightMeta:'STATIC CON',
    caption:`${chosen.name} · The counter is a d20 attack against Conditioning.`
  });
  const result=resolveReaction(state,{reactionMoveId:moveId,reactionRoll,damageRoll});
  await settleRollingVisual({leftTotal:result.total,rightTotal:result.targetNumber,
    result:result.success?'REVERSAL WON':'COUNTER MISSES'});
  log(`${wrestler(state,result.reactorId).name} ${chosen.name}: d20 ${result.reactionRoll} ${result.modifier>=0?'+':''}${result.modifier} = ${result.total} vs CON ${result.targetNumber}.`);
  if(!result.success){
    ui.phase=state.phase;
    announce('COUNTER MISSES',state.phase==='NEUTRAL_ROLL'?'NEUTRAL RESET':'HIGH CONTROL REMAINS','danger',false,850);
    render();
    return;
  }
  const anim=animationByMove[chosen.id];
  if(!anim){log('Missing counter choreography '+chosen.id);return;}
  ui.phase='ANIMATING';render();
  await stage.playPair(anim.attacker,anim.defender,{
    attackerId:result.reactorId,choreography:anim.choreography,
    impactFrame:anim.impactFrame,impactKind:anim.kind||'strike',
    hitStopMs:75,onImpact:()=>{
      audio.cue('reversal');
      announce('REVERSAL!',`${chosen.name.toUpperCase()} · ${wrestler(state,reactorId).name} TAKES CONTROL`,'major',true,820);
    }
  });
  stage.resetPositions();
  stage.setRestingState({postures:{stone:wrestler(state,'stone').posture,viper:wrestler(state,'viper').posture}});
  ui.phase=state.phase==='PIN_OPPORTUNITY'?'OPPORTUNITY':'ACTION_SELECT';
  render();
}
async function performGroundDefense(choice){
  const act={scramble:ACTION_IDS.GROUND_SCRAMBLE,cover:ACTION_IDS.GROUND_COVER,pass:ACTION_IDS.GROUND_PASS}[choice];
  const actor=state.groundDefense?.defenderId;
  if(!act||!permitted(act,actor))return;
  const roll=choice==='scramble'?rollDie(20):undefined;
  if(roll!==undefined){
    const w=wrestler(state,actor),c=wrestler(state,state.groundDefense.controllerId);
    const target=groundScrambleTarget(c,{...w,stamina:Math.max(0,w.stamina-GROUND_SCRAMBLE_COST)});
    await rollingVisual(`${w.name} · MAT SCRAMBLE`,roll,{
      mode:'target',leftLabel:w.name,rightLabel:'SCRAMBLE DC',
      target,leftMeta:'D20 + AGILITY',rightMeta:'ESCAPE TARGET',
      caption:'Beat the grounded escape target to rise and challenge control.'
    });
  }
  const result=resolveGroundDefense(state,{choice,roll});
  if(roll!==undefined&&result.ok)await settleRollingVisual({
    leftTotal:result.total,rightTotal:result.targetNumber,
    result:result.comeback?'SCRAMBLE REVERSAL':result.success?'SCRAMBLE SUCCESS':'STILL DOWN'
  });
  if(!result.ok)return;
  log(`${wrestler(state,actor).name} chooses ${choice}.`+(roll!==undefined?` Roll ${roll} vs ${result.targetNumber}.`:''));
  if(choice==='scramble'){
    ui.phase='ANIMATING';render();
    const kind=result.success?'ground_scramble':'ground_scramble_fail';
    await stage.playPair('idle','idle',{attackerId:actor,choreography:kind,impactKind:'setup'});
    stage.resetPositions();
    stage.setRestingState({postures:{stone:wrestler(state,'stone').posture,viper:wrestler(state,'viper').posture}});
    announce(result.comeback?'SCRAMBLE REVERSAL!':result.success?'SCRAMBLED TO KNEES':'STILL DOWN',result.comeback?'DEFENDER EARNS HIGH CONTROL':result.success?'BACK TO NEUTRAL':'HIGH KEEPS CONTROL','major',false,750);
  }else {
    announce(choice==='cover'?'COVERED UP':'STAYING DOWN',choice==='cover'?'NEXT LANDED HIT MITIGATED':'HIGH RETAINS ADVANTAGE','major',false,750);
  }
  ui.phase=state.phase;render();
}

function passReaction() {
  const pending = state.pendingFailure;
  if (!pending) return;
  const reactor = wrestler(state, pending.defenderId);
  const result = declineReaction(state);
  log(`${reactor.name} passes the reaction.${result.neutral ? ' Match returns to Neutral.' : ` ${wrestler(state,result.retainedBy).name} remains H.`}`);
  ui.phase = result.neutral ? 'NEUTRAL_ROLL' : 'ACTION_SELECT';
  render();
}

async function runPin() {
  if(!permitted(ACTION_IDS.PIN,state.pinningWrestlerId))return;
  const pin=startPin(state);
  ui.pinInfo={...pin,count:0};
  ui.pinCount=0;ui.pinRolls=null;ui.phase='PIN_DEFENSE';
  stage.playPin({pinningId:pin.pinningId});
  log(`${wrestler(state,pin.pinningId).name} hooks a pin. ${wrestler(state,pin.pinnedId).name} gets a roll on every count.`);
  render();
}

async function rollPinDefense(){
  const pin=ui.pinInfo;
  if(!pin||!permitted(ACTION_IDS.COUNT_PIN,pin.pinnedId))return;
  const count=pin.count+1;
  const pinningRoll=rollDie(20),pinnedRoll=rollDie(20);
  const pinning=wrestler(state,pin.pinningId),pinned=wrestler(state,pin.pinnedId);
  const humanId=aiEnabled()?matchSetup.playerId:null;
  const crowdFor=(w,defending)=>{
    const n=aiEnabled()&&w.id!==humanId
      ?choosePinCrowdSpend(w,defending?pinning:pinned,{defending,count,difficulty:matchSetup.difficulty})
      :ui.pinCrowdSpend;
    return Array.from({length:Math.min(3,w.crowdResource,Math.max(0,n))},()=>rollDie(6));
  };
  const pinningCrowdRolls=crowdFor(pinning,false),pinnedCrowdRolls=crowdFor(pinned,true);
  await rollingVisual(`REFEREE COUNT ${count} · KICKOUT`,pinnedRoll,{
    mode:'opposed',leftLabel:`${pinned.name} · DEFENSE`,rightLabel:`${pinning.name} · PIN`,
    rightRoll:pinningRoll,leftMeta:'DEFENSIVE D20',rightMeta:'PINNING D20',
    caption:'Two real d20 rolls. Body penalties and Heat/Pop d6 modify the final totals.'
  });
  const result=resolvePinCount(state,{pinningId:pin.pinningId,count,pinningRoll,pinnedRoll,pinningCrowdRolls,pinnedCrowdRolls});
  await settleRollingVisual({leftTotal:result.pinnedTotal,rightTotal:result.pinningTotal,
    result:result.kickout?(result.comeback?'KICKOUT REVERSAL':'KICKOUT!'):result.pinfall?'THREE · PINFALL':'SHOULDERS DOWN'});
  pin.count=count;ui.pinCount=count;ui.pinRolls=result;
  if(!aiEnabled()||matchSetup.playerId===pin.pinnedId)ui.pinCrowdSpend=0;
  audio.cue('count');
  log(`Count ${count}: ${pinned.name} rolls ${pinnedRoll} - ${result.pinnedPenalty} + ${result.pinnedBonus} Heat/Pop (${pinnedCrowdRolls.join(',')||'none'}) = ${result.pinnedTotal}; ${pinning.name} rolls ${pinningRoll} - ${result.pinningPenalty} + ${result.pinningBonus} Heat/Pop (${pinningCrowdRolls.join(',')||'none'}) = ${result.pinningTotal}.`);
  if(result.kickout){
    audio.cue('reversal');
    ui.event={title:result.comeback?`KICKOUT REVERSAL!`:`KICKOUT AT ${count}!`,detail:`${wrestler(state,pin.pinnedId).name} ${result.comeback?'springs up and seizes control':'breaks the pin'} · +10 STA`,kind:'spectacle',impact:true};
    if(result.comeback)log(`${wrestler(state,pin.pinnedId).name} earns a kickout reversal (winning margin ${result.margin}); now controls the action.`);
    render();
    await stage.playKickout({pinnedId:pin.pinnedId,onImpact:()=>stage.pulseImpact('kickout')});
    ui.pinInfo=null;ui.pinCount=0;ui.pinRolls=null;ui.event=null;
    ui.phase='ACTION_SELECT';
    stage.resetPositions();
    stage.setRestingState({postures:{stone:wrestler(state,'stone').posture,viper:wrestler(state,'viper').posture}});
    render();
    return;
  }
  if(result.pinfall){
    audio.cue('victory');
    if(!resultRecorded){progression=recordResult(progression,pin.pinningId,pin.pinnedId,state.turnCounter,highlights);saveProgress(localStorage,progression);resultRecorded=true;}
    log(`${wrestler(state,pin.pinningId).name} wins by pinfall.`);
    ui.pinInfo=null;ui.phase='MATCH_COMPLETE';render();
    return;
  }
  ui.phase='PIN_DEFENSE';
  announce(`COUNT ${count}!`,`${wrestler(state,pin.pinnedId).name} still needs a kickout`,'major',false,750);
  render();
}

function recoverWithCrowd() {
  const actor = currentActor();
  if (!actor) return;
  const result = spendCrowdForStamina(state, actor.id, 1);
  if (!result.ok) return;
  audio.cue('crowd');
  log(`${actor.name} spends 1 ${actor.crowdResourceName} to recover ${result.gained} STA.`);
  announce('+10 STAMINA', `1 ${actor.crowdResourceName} spent`, 'major', false, 700);
}

function catchBreath() {
  const actor = currentActor();
  if (!actor) return;
  catchBreathToNeutral(state, actor.id);
  log(`${actor.name} has no legal action, catches breath, and resets the match to Neutral.`);
  ui.phase = 'NEUTRAL_ROLL';
  stage.setRestingState({ postures: { stone: wrestler(state,'stone').posture, viper: wrestler(state,'viper').posture } });
  render();
}

function scrambleUpAction() {
  const actor = currentActor();
  if (!actor) return;
  const result = scrambleUp(state, actor.id);
  if (!result.ok) return;
  log(`${actor.name} scrambles from prone to standing and keeps the post-kickout next action.`);
  stage.setRestingState({ postures: { stone: wrestler(state,'stone').posture, viper: wrestler(state,'viper').posture } });
  ui.phase = 'ACTION_SELECT';
  render();
}

function resetSelection() {
  ui.phase = state.phase === 'NEUTRAL_ROLL' ? 'NEUTRAL_ROLL' : 'ACTION_SELECT';
  ui.selectedMove = null;
  ui.selectedTarget = null;
  ui.spendCrowd = 0;
  render();
}

app.addEventListener('change',event=>{const input=event.target.closest('[data-setting]');if(!input)return;settings=saveSettings(localStorage,{...settings,[input.dataset.setting]:input.checked});audio.muted=settings.muted;if(stage){stage.reducedMotion=settings.reducedMotion;stage.reducedFlash=settings.reducedFlash;}document.documentElement.classList.toggle('user-reduced-motion',settings.reducedMotion);document.documentElement.classList.toggle('user-reduced-flash',settings.reducedFlash);});

// Scroll is capture-phase because the event does not bubble. Wheel input is
// translated to horizontal motion only while the pointer is over the ribbon.
app.addEventListener('scroll',event=>{
  const rail=event.target.closest?.('[data-action-rail]');
  if(rail){ui.railOffset=rail.scrollLeft;updateActionRail(rail);}
},true);
app.addEventListener('wheel',event=>{
  const rail=event.target.closest?.('[data-action-rail]');
  if(!rail)return;
  const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  const limit=rail.scrollWidth-rail.clientWidth;
  if(limit<2||(!delta))return;
  if((delta>0&&rail.scrollLeft>=limit-1)||(delta<0&&rail.scrollLeft<=1))return;
  event.preventDefault();
  rail.scrollLeft+=delta;
},{passive:false});
app.addEventListener('keydown',event=>{
  const rail=event.target.closest?.('[data-action-rail]');
  if(!rail||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  event.preventDefault();
  const move=rail.querySelector('[data-move]');
  const stride=(move?.offsetWidth||150)+12;
  rail.scrollTo({left:event.key==='Home'?0:event.key==='End'?rail.scrollWidth:(rail.scrollLeft+(event.key==='ArrowRight'?stride:-stride)),behavior:settings.reducedMotion?'auto':'smooth'});
});

app.addEventListener('click', event => {
  audio.unlock();
  const el = event.target.closest('button,[data-close-drawer]');
  if (!el) return;
  if (['ROLLING','ANIMATING','PIN'].includes(ui.phase) && !el.dataset.renderer && !el.dataset.drawer && el.dataset.closeDrawer===undefined) return;
  if (el.dataset.matchMode !== undefined) {matchSetup=saveMatchSetup(localStorage,{...matchSetup,mode:el.dataset.matchMode});render();return;}
  if (el.dataset.playerId !== undefined) {matchSetup=saveMatchSetup(localStorage,{...matchSetup,playerId:el.dataset.playerId});render();return;}
  if (el.dataset.difficulty !== undefined) {matchSetup=saveMatchSetup(localStorage,{...matchSetup,difficulty:el.dataset.difficulty});render();return;}
  if (el.dataset.toggleCoaching !== undefined) {matchSetup=saveMatchSetup(localStorage,{...matchSetup,tutorial:!matchSetup.tutorial});render();return;}
  if (el.dataset.matchOptions !== undefined){ui.showMatchOptions=!ui.showMatchOptions;render();document.querySelector('[data-match-options]')?.focus();return;}
  if (el.dataset.coachHelp !== undefined){ui.showCoach=!ui.showCoach;render();return;}
  if (el.dataset.startMatch !== undefined) { introOpen=false;ui.showMatchOptions=false;matchSetup=saveMatchSetup(localStorage,matchSetup);audio.cue('bell');render();document.querySelector('[data-neutral-roll]')?.focus();return;}
  if (el.dataset.dismissGuide !== undefined){ui.showCoach=false;render();return;}
  // Human cannot click on the CPU's turn before its scheduled action runs.
  if(aiEnabled()&&(aiBusy||isAiDecision(state,matchSetup))&&!el.dataset.drawer&&!el.dataset.closeDrawer&&!el.dataset.renderer)return;
  if (el.dataset.neutralRoll !== undefined) { if(permitted(ACTION_IDS.NEUTRAL,null))rollNeutral(); return; }
  if (el.dataset.dockFamily !== undefined) {
    if(moveFamilies(getLegalMoves(state)).some(f=>f.id===el.dataset.dockFamily)){
      ui.actionFamily=el.dataset.dockFamily;ui.railOffset=0;audio.cue('select');render();
    }
    return;
  }
  if (el.dataset.dockBack !== undefined){ui.actionFamily=null;ui.railOffset=0;render();return;}
  if (el.dataset.move) {
    const move=getLegalMoves(state).find(m=>m.id===el.dataset.move);
    if(move&&permitted(ACTION_IDS.MOVE,state.activeWrestlerId))selectMove(move);
    return;
  }
  if (el.dataset.renderer) {rendererMode=el.dataset.renderer;try{localStorage.setItem('fh-renderer-v15',rendererMode)}catch{} render();return;}
  if (el.dataset.target) { ui.selectedTarget = el.dataset.target; log(`${currentActor().name} chose ${bodyLabel(ui.selectedTarget)} for ${ui.selectedMove.name}.`); ui.phase = 'SELECTED'; render(); return; }
  if (el.dataset.roll !== undefined) { if(permitted(ACTION_IDS.MOVE,state.activeWrestlerId)) rollMove(); return; }
  if (el.dataset.boost !== undefined) {
    const permission=ui.selectedMove?attackBoostEligibility(state,ui.selectedMove):null;
    ui.spendCrowd=permission?.available?(ui.spendCrowd?0:1):0;
    render();return;
  }
  if (el.dataset.back !== undefined) { resetSelection(); return; }
  if (el.dataset.holdSqueeze !== undefined) { if(permitted(ACTION_IDS.HOLD_SQUEEZE,state.activeHold?.holderId))performHoldPressure(); return; }
  if (el.dataset.holdSwitch !== undefined) {if(permitted(ACTION_IDS.HOLD_SWITCH,state.activeHold?.holderId))performHoldSwitch(el.dataset.holdSwitch);return;}
  if (el.dataset.holdRelease !== undefined) { if(permitted(ACTION_IDS.HOLD_RELEASE,state.activeHold?.holderId))performHoldRelease(); return; }
  if (el.dataset.holdEscape !== undefined) { if(permitted(ACTION_IDS.HOLD_ESCAPE,state.activeHold?.defenderId))performHoldEscape(); return; }
  if (el.dataset.pin !== undefined) { runPin(); return; }
  if (el.dataset.pinCrowd !== undefined) { ui.pinCrowdSpend=Math.max(0,Math.min(3,Number(el.dataset.pinCrowd)||0));render();return; }
  if (el.dataset.pinDefense !== undefined) { rollPinDefense(); return; }
  if (el.dataset.continue !== undefined) { if(!permitted(ACTION_IDS.SKIP_PIN,state.pinningWrestlerId))return; const result=skipPin(state); if (!result.ok) { announce('FINISH REQUIRED','0 STA opponent must be pinned or submitted','danger',false,850); return; } ui.phase='GROUND_DEFENSE'; render(); return; }
  if (el.dataset.reaction !== undefined) { if(permitted(ACTION_IDS.REACT,state.pendingFailure?.defenderId))runReaction(el.dataset.reaction); return; }
  if (el.dataset.groundScramble !== undefined) {performGroundDefense('scramble');return;}
  if (el.dataset.groundCover !== undefined) {performGroundDefense('cover');return;}
  if (el.dataset.groundPass !== undefined) {performGroundDefense('pass');return;}
  if (el.dataset.passReaction !== undefined) { if(permitted(ACTION_IDS.PASS_REACTION,state.pendingFailure?.defenderId))passReaction(); return; }
  if (el.dataset.recover !== undefined) { if(permitted(ACTION_IDS.RECOVER,state.activeWrestlerId))recoverWithCrowd(); return; }
  if (el.dataset.scrambleUp !== undefined) { if(permitted(ACTION_IDS.SCRAMBLE,state.activeWrestlerId))scrambleUpAction(); return; }
  if (el.dataset.catchBreath !== undefined) { if(permitted(ACTION_IDS.BREATH,state.activeWrestlerId))catchBreath(); return; }
  if(el.dataset.toggleCareer!==undefined){progression.mode=progression.mode==='championship'?'quick':'championship';saveProgress(localStorage,progression);render();return;}
  if(el.dataset.resetProgress!==undefined){if(confirm('Reset all local championship results and rewards?')){progression=resetProgress(localStorage);render();}return;}
  if (el.dataset.newMatch !== undefined) { location.href='./?fhbuild=1.25.0&t='+Date.now(); return; }
  if (el.dataset.railStep !== undefined) {
    const rail=app.querySelector('[data-action-rail]');
    const card=rail?.querySelector('[data-move]');
    if(rail&&card)rail.scrollBy({left:Number(el.dataset.railStep)*(card.offsetWidth+12)*Math.max(1,Math.floor(rail.clientWidth/(card.offsetWidth+12))),behavior:settings.reducedMotion?'auto':'smooth'});
    return;
  }
  if (el.dataset.filter) {
    if(ui.filter!==el.dataset.filter){
      ui.filter=el.dataset.filter;ui.railOffset=0;
      const oldRail=app.querySelector('[data-action-rail]');if(oldRail)oldRail.scrollLeft=0;
      render();
    }
    return;
  }
  if (el.dataset.body) { ui.drawer=el.dataset.body; render(); return; }
  if (el.dataset.drawer) { ui.drawer=el.dataset.drawer; render(); return; }
  if (el.dataset.closeDrawer !== undefined) { ui.drawer=null; render(); return; }
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && ui.drawer){ui.drawer=null;render();return;}
  const modal=document.querySelector('.match-intro,.drawer');
  if(event.key!=='Tab'||!modal)return;
  const items=[...modal.querySelectorAll('button:not([disabled]),a,input,summary')].filter(el=>el.getClientRects().length);
  if(!items.length)return;
  const first=items[0],last=items.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){event.preventDefault();first.focus();}
});

// Solo-play orchestration stays outside match-engine.js. The bot chooses an
// intention only; each action goes through the same roll, animation and rules
// handlers as the human. Exactly one queued/active bot action may exist.
function queueAiTurn(){
  if(!aiEnabled()||introOpen||ui.drawer||aiBusy||aiTimer||!stage||state.winnerId)return;
  if(['ROLLING','ANIMATING','SELECTED','TARGET_CHOICE'].includes(ui.phase))return;
  if(!isAiDecision(state,matchSetup))return;
  aiTimer=setTimeout(async()=>{
    aiTimer=null;
    if(aiBusy||introOpen||ui.drawer||!isAiDecision(state,matchSetup))return;
    aiBusy=true;
    try{
      await performAiTurn();
    }catch(error){
      console.error('CPU turn failed',error);
      log('CPU turn issue: '+error.message);
      // Fail visibly, never silently fake a successful attack.
      announce('CPU TURN ERROR','Open Match Log for details','danger',false,1100);
    }finally{
      aiBusy=false;
      if(!state.winnerId)queueAiTurn();
    }
  },settings.fast?140:420);
}
async function performAiTurn(){
  const decision=chooseAiAction(state,{setup:matchSetup,rng:random01});
  if(!decision)return;
  switch(decision.type){
    case 'neutral':await rollNeutral();break;
    case 'move':{
      const move=getLegalMoves(state).find(m=>m.id===decision.moveId);
      if(!move)throw Error('CPU selected an unavailable move: '+decision.moveId);
      selectMove(move);
      // The player uses the target-choice screen; CPU chooses from the exact
      // same target list, then resolves the standard dice rolls.
      ui.selectedTarget=decision.target;
      ui.spendCrowd=decision.crowdSpend||0;
      ui.phase='SELECTED';
      render();
      await rollMove();break;
    }
    case 'pin':await runPin();break;
    case 'skip-pin':{
      const skipped=skipPin(state);
      if(!skipped.ok)throw Error('CPU could not decline pin');
      ui.phase='GROUND_DEFENSE';render();break;
    }
    case 'pin-defense':await rollPinDefense();break;
    case 'reaction':await runReaction(decision.moveId);break;
    case 'pass-reaction':passReaction();break;
    case 'tighten-hold':performHoldPressure();break;
    case 'switch-hold':performHoldSwitch(decision.moveId);break;
    case 'release-hold':performHoldRelease();break;
    case 'escape-hold':await performHoldEscape();break;
    case 'scramble-ground':await performGroundDefense('scramble');break;
    case 'cover-ground':await performGroundDefense('cover');break;
    case 'stand':scrambleUpAction();break;
    case 'recover':recoverWithCrowd();break;
    case 'breath':catchBreath();break;
    default:throw Error('Unsupported CPU decision '+decision.type);
  }
}

function applyDemoQuery() {
  const demo = params.get('demo');
  if (!demo) return;
  // Development shortcuts intentionally establish Stone as H first.
  state.activeWrestlerId='stone'; state.roles.stone='H'; state.roles.viper='L'; state.phase='ACTION_SELECT'; ui.phase='ACTION_SELECT';
  if (demo === 'selected') { ui.selectedMove=demoMoves.find(m=>m.id==='forearm-smash'); ui.selectedTarget='head'; ui.phase='SELECTED'; }
  else if (demo === 'target') { ui.selectedMove=demoMoves.find(m=>m.id==='dragon-screw'); ui.phase='TARGET_CHOICE'; }
  else if (demo === 'opportunity') { wrestler(state,'viper').posture='prone'; state.pinEligible=true; state.pinningWrestlerId='stone'; state.phase='PIN_OPPORTUNITY'; ui.phase='OPPORTUNITY'; }
  else if (demo === 'reaction') { state.pendingFailure={attackerId:'stone',defenderId:'viper',moveId:'forearm-smash'}; state.phase='REACTION'; ui.phase='REACTION'; }
}

applyDemoQuery();
document.documentElement.classList.toggle('user-reduced-motion',settings.reducedMotion);
document.documentElement.classList.toggle('user-reduced-flash',settings.reducedFlash);
render();
if(introOpen) document.querySelector('[data-start-match]')?.focus();
