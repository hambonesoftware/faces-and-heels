import {ACTION_IDS} from './turn-controller.js?v=1.19.0';
import {DEFAULT_MATCH_SETUP,readMatchSetup,saveMatchSetup,aiWrestlerId,isAiDecision,chooseAiAction,choosePinCrowdSpend} from './solo-ai.js?v=1.19.2';
import { animationByMove } from './combat-animation-map.js?v=1.21.0';
import { portrait, moveArt, damageDiagram } from './ui-art.js?v=1.21.0';
import { emptyProgress, loadProgress, saveProgress, recordResult, resetProgress } from './progression.js?v=1.19.0';
import { DEFAULT_PRESENTATION, readSettings, saveSettings, delayFor, tacticalLabel, chanceToHit, MatchAudio } from './presentation.js?v=1.19.0';
import { demoMoves } from './moves.js?v=1.21.0';
import { LEGENDARY_CATALOG,MAX_LEGENDARY_MOVES } from './legendary-catalog.js?v=1.19.0';
import { bodyLabel, resolveTargetDecision } from './flow-engine.js?v=1.19.0';
import { IsoStage } from './iso-stage.js?v=1.19.0';
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
} from './match-engine.js?v=1.21.1';

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
  event: null,
  filter: 'all',
  moreMoves: false,
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
    return `<div class="dice-overlay"><small>${escapeHtml(ui.rollLabel || ui.selectedMove?.name || 'ROLL')}</small><div class="die">${ui.roll ?? '•'}</div><strong>${ui.roll ? 'LOCKED' : 'ROLLING'}</strong></div>`;
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
  const rolls = ui.neutralRolls;
  return `
    <section class="decision-panel decision-panel--neutral">
      <div class="opportunity-copy"><small>OPENING / NEUTRAL</small><strong>Fight for control</strong><span>${escapeHtml(rivalryLead)} Both recover up to 10 stamina. Highest roll + Agility takes control.</span></div>
      ${rolls ? `<div class="neutral-score"><span>STONE <b>${rolls.stoneTotal}</b></span><i>VS</i><span>VIPER <b>${rolls.viperTotal}</b></span></div>` : ''}
      <button class="roll-button neutral-roll-button" data-neutral-roll><strong>FIGHT FOR CONTROL</strong><small>ROLL BIG GOLD DICE</small></button>
    </section>`;
}

function renderMoveCards() {
  const actor = currentActor();
  const defender = currentDefender();
  if (!actor || !defender) return renderNeutral();
  const turn=turnDecision();
  const allLegal = getLegalMoves(state);
  if (!allLegal.length) {
    const canScramble = turn.actions.some(action=>action.id===ACTION_IDS.SCRAMBLE&&action.enabled);
    return `
      <section class="decision-panel decision-panel--recovery">
        <div class="opportunity-copy"><small>${canScramble ? 'MAT SCRAMBLE' : 'NO LEGAL MOVE'}</small><strong>${escapeHtml(actor.name)} ${canScramble ? 'can get back to a base' : 'needs a reset'}</strong><span>${canScramble ? 'Kickouts leave both wrestlers prone. Stand up without surrendering the next-action right, then choose a legal move.' : 'Spend crowd energy for stamina if available, or Catch Breath to reset the match to Neutral.'}</span></div>
        <div class="opportunity-actions">
          ${canScramble ? '<button class="reaction-button" data-scramble-up>SCRAMBLE UP</button>' : ''}
          ${actor.crowdResource > 0 && actor.stamina < actor.maxStamina ? `<button class="reaction-button" data-recover>+10 STA · 1 ${escapeHtml(actor.crowdResourceName)}</button>` : ''}
          ${canScramble ? '' : '<button class="continue-button" data-catch-breath>CATCH BREATH → N/N</button>'}
        </div>
      </section>`;
  }

  // Only legal moves appear; the ribbon contains the entire contextual roster.
  const categories = ['all','strike','grapple','setup','special'];
  const labels = {all:'ALL',strike:'HITS',grapple:'GRABS',setup:'SETUP',special:'SIGNATURE'};
  const present = categories.filter(category => category === 'all' || allLegal.some(move => move.category === category));
  // A new posture can invalidate a previous category (for example, pickup
  // ends the ground-attack list). Always show legal actions after the turn.
  if(!present.includes(ui.filter)){ui.filter='all';ui.railOffset=0;}
  const activeCategory = ui.filter;
  const moves = activeCategory === 'all' ? allLegal : allLegal.filter(move => move.category === activeCategory);
  const cards = moves.map((move, index) => {
    const decision = resolveTargetDecision(move, perspectiveState(state));
    const target = decision.kind === 'choice' ? 'CHOOSE TARGET' : resolvedTargetLabel(move);
    const categoryName = move.legendary ? 'LEGENDARY' : (labels[move.category] || move.category.toUpperCase());
    return `
      <button class="action-slot action-slot--${escapeHtml(move.category)}" data-move="${escapeHtml(move.id)}" aria-label="${escapeHtml(move.name)}, costs ${move.staminaCost} stamina, removes up to ${move.staminaDamage} opponent stamina on success, ${escapeHtml(target)}" type="button" title="${escapeHtml(move.name)} · ${move.staminaCost} stamina cost · ${move.staminaDamage} opponent stamina loss">
        <span class="action-slot-art">${moveArt(move.id)}</span>
        <span class="action-slot-index" aria-hidden="true">${String(index+1).padStart(2,'0')}</span>
        <span class="action-slot-heading"><strong>${escapeHtml(move.name)}</strong><small class="action-slot-category">${escapeHtml(categoryName)} · ${escapeHtml(target)}</small></span>
        <span class="action-slot-foot"><span class="action-slot-cost">−${move.staminaCost} <small>STA</small></span><span class="action-slot-effect">−${move.staminaDamage} <small>OPP</small></span></span>
      </button>`;
  }).join('');

  const recoverButton = turn.actions.some(action=>action.id===ACTION_IDS.RECOVER&&action.enabled) && actor.stamina <= actor.maxStamina - 5
    ? `<button class="recover-mini" data-recover type="button">+10 STA · 1 ${escapeHtml(actor.crowdResourceName)}</button>` : '';
  const standButton=turn.actions.some(action=>action.id===ACTION_IDS.SCRAMBLE&&action.enabled)
    ? '<button class="recover-mini" data-scramble-up type="button">STAND UP</button>' : '';
  const finishNotice = state.mustFinishTargetId === defender.id && defender.stamina <= 0
    ? `<div class="finish-required">FINISH REQUIRED · ${escapeHtml(defender.name)} IS OUT OF STAMINA</div>` : '';

  return `
    <section class="decision-panel decision-panel--moves" aria-label="Ringside action bar">
      ${finishNotice}
      <div class="action-ribbon-heading">
        <div class="action-ribbon-title">
          <strong><span class="action-live-dot"></span>${escapeHtml(actor.name)} <span class="action-initiative">· ${roleFor(state,actor.id) === 'N' ? 'NEUTRAL' : 'IN CONTROL'}</span></strong>
        </div>
        <div class="action-ribbon-tools">${standButton}${recoverButton}<span class="action-available">${moves.length} MOVES</span></div>
      </div>
      <div class="action-ribbon-controls">
        <div class="action-category-tabs" role="group" aria-label="Move type">
          ${present.map(category => `<button type="button" class="action-category action-category--${category} ${activeCategory === category ? 'is-active' : ''}" data-filter="${category}" aria-pressed="${activeCategory === category}">${labels[category]}</button>`).join('')}
        </div>
        <div class="action-ribbon-navigation">
          <output class="action-ribbon-count" data-rail-counter aria-live="off">01 / ${String(moves.length).padStart(2,'0')}</output>
          <button type="button" class="action-ribbon-arrow" data-rail-step="-1" aria-label="Scroll to previous moves">‹</button>
          <button type="button" class="action-ribbon-arrow" data-rail-step="1" aria-label="Scroll to next moves">›</button>
        </div>
      </div>
      <div class="action-ribbon-window">
        <div class="action-ribbon-track" data-action-rail tabindex="0" role="region" aria-label="Available wrestling moves. Swipe horizontally, or use left and right arrow keys.">
          ${cards}
        </div>
      </div>
      <div class="action-ribbon-footer">
        <span class="action-ribbon-progress" aria-hidden="true"><i data-rail-progress></i></span>
        <span>SWIPE MOVES → TAP TO ATTACK</span>
      </div>
    </section>`;
}

function renderTargetChoice() {
  const move = ui.selectedMove;
  const decision = resolveTargetDecision(move, perspectiveState(state));
  return `
    <section class="decision-panel decision-panel--selected">
      <div class="selected-title"><button class="back-mini" data-back aria-label="Back">‹</button><div><small>${move.legendary?'LEGENDARY FINISHER · '+escapeHtml(currentActor().style.toUpperCase()):move.category.toUpperCase()}</small><strong>${escapeHtml(move.name)}</strong></div><span>CHOOSE TARGET</span></div>
      <div class="choice-grid">${decision.values.map(target => `<button class="choice-button" data-target="${target}">${escapeHtml(bodyLabel(target).toUpperCase())}</button>`).join('')}</div>
    </section>`;
}

function renderSelectedMove() {
  const move = ui.selectedMove;
  if (move.automatic) {
    return `
      <section class="decision-panel decision-panel--selected">
        <div class="selected-title"><button class="back-mini" data-back aria-label="Back">‹</button><div><small>POSITIONING / SETUP</small><strong>${escapeHtml(move.name)}</strong></div><span>${move.staminaCost} STA</span></div>
        <div class="selected-illustration">${moveArt(move.id)}<p>${escapeHtml(move.description)}</p></div>
        <div class="move-meta-line"><b>RETAINS HIGH CONTROL</b><i>·</i><span>NO BODY MARK</span><i>·</i><span>NO ATTACK ROLL</span></div>
        <div class="move-resource-trade"><span>YOUR COST <b>−${move.staminaCost} STA</b></span><span>OPPONENT EXERTION <b>−${move.staminaDamage} STA</b></span></div>
        <div class="primary-row"><button class="roll-button" data-roll><strong>PERFORM SETUP</strong><small>KEEP CONTROL · ${move.staminaCost} STA</small></button></div>
      </section>`;
  }
  const actor = currentActor();
  const defender = currentDefender();
  const decision = resolveTargetDecision(move, perspectiveState(state));
  const target = ui.selectedTarget || decision.values[0] || null;
  const mod = statModifier(actor.stats[move.stat]);
  const probability=chanceToHit(mod,conditioning(defender),ui.spendCrowd);
  const boostLabel = ui.spendCrowd ? `BOOST +${ui.spendCrowd}` : 'BOOST';
  return `
    <section class="decision-panel decision-panel--selected">
      <div class="selected-title"><button class="back-mini" data-back aria-label="Back">‹</button><div><small>${move.category.toUpperCase()}</small><strong>${escapeHtml(move.name)}</strong></div><span>${move.staminaCost} STA</span></div>
      <div class="selected-illustration">${moveArt(move.id)}<p>${escapeHtml(move.description)}</p></div><div class="move-meta-line"><b>${target ? escapeHtml(bodyLabel(target).toUpperCase()) : 'AUTO'}</b><i>·</i><span>${escapeHtml(move.stat.toUpperCase())} ${mod >= 0 ? '+' : ''}${mod}</span><i>·</i><span>VS CON ${conditioning(defender)}</span><i>·</i><span>d${move.damageDie} DAMAGE</span></div>
      <div class="move-resource-trade"><span>YOUR COST <b>−${move.staminaCost} STA</b></span><span>OPPONENT ON HIT <b>−${move.staminaDamage} STA</b></span></div><meter class="connect-meter" min="0" max="100" value="${probability}" aria-label="${probability}% chance to connect">${probability}%</meter><p class="probability-note">${probability}% to connect · damage threshold and pin counts resolve separately</p><div class="primary-row"><button class="boost-button ${ui.spendCrowd ? 'is-on' : ''}" data-boost ${actor.crowdResource < 1 ? 'disabled' : ''}><strong>${boostLabel}</strong><small>${escapeHtml(actor.crowdResourceName)}</small></button><button class="roll-button" data-roll><strong>ATTEMPT MOVE</strong><small>ROLL d20 · ${escapeHtml(move.name)}</small></button></div>
    </section>`;
}

function renderOpportunity() {
  const pinning = wrestler(state, state.pinningWrestlerId);
  const pinned = wrestler(state, opponentId(state.pinningWrestlerId));
  const forced = pinned.stamina <= 0;
  const available=Math.min(3,pinning.crowdResource);
  const boostChoices=Array.from({length:available+1},(_,n)=>`<button type="button" class="boost-button ${ui.pinCrowdSpend===n?'is-on':''}" data-pin-crowd="${n}" aria-pressed="${ui.pinCrowdSpend===n}">${n}d6</button>`).join('');
  return `
    <section class="decision-panel decision-panel--opportunity">
      <div class="opportunity-copy"><small>${forced ? 'FINISH REQUIRED' : 'PIN OPPORTUNITY'}</small><strong>${escapeHtml(pinned.name)} is prone</strong><span>${forced ? `${pinned.name} has 0 STA. The H wrestler must attempt a finish.` : 'Three opposed BGD counts. Body damage makes kickouts harder.'}</span></div>
      <div class="pin-resource-choices" role="group" aria-label="Heat or Pop dice per pin count"><span>${escapeHtml(pinning.crowdResourceName)}: ${pinning.crowdResource} available</span>${boostChoices}<small>Choose how many d6 to spend per count during the cover.</small></div>
      <div class="opportunity-actions"><button class="pin-button" data-pin>PIN NOW</button>${forced ? '' : '<button class="continue-button" data-continue>CONTINUE</button>'}</div>
    </section>`;
}

function renderPinDefense() {
  const turn=turnDecision(),pinned=wrestler(state,turn.actorId);
  const pinning=turn.controlId?wrestler(state,turn.controlId):null;
  const next=Math.min(3,(ui.pinInfo?.count||0)+1);
  const last=ui.pinRolls;
  const humanId=aiEnabled()?matchSetup.playerId:null;
  const humanPinning=(!aiEnabled() || humanId===pinning?.id);
  const humanPinned=(!aiEnabled() || humanId===pinned?.id);
  const playerSide=humanPinned?pinned:humanPinning?pinning:null;
  const available=Math.min(3,playerSide?.crowdResource||0);
  const chosen=Math.min(ui.pinCrowdSpend,available);
  const boostControls=playerSide?`<div class="pin-resource-choices" role="group" aria-label="Heat or Pop dice to spend on the next count"><span>${escapeHtml(playerSide.name)} · ${escapeHtml(playerSide.crowdResourceName)}: ${playerSide.crowdResource} available</span>${Array.from({length:available+1},(_,n)=>`<button type="button" class="boost-button ${chosen===n?'is-on':''}" data-pin-crowd="${n}" aria-pressed="${chosen===n}">${n}d6</button>`).join('')}<small>Spend on this count only. Each die adds 1–6 to your opposed d20 roll.</small></div>`:'';
  return `
    <section class="decision-panel decision-panel--pin-defense">
      <div class="pin-defense-copy"><small>DEFENSIVE TURN · ${pinned?escapeHtml(pinned.name):'PINNED WRESTLER'}</small>
        <strong>KICK OUT — COUNT ${next}</strong>
        <span>${pinning?escapeHtml(pinning.name)+' controls the pin. ':''}Opposed d20 dice determine whether the shoulders stay down.</span>
        ${last?`<span>PREVIOUS: ${last.pinnedTotal} vs ${last.pinningTotal} · Heat/Pop +${last.pinnedBonus||0}/+${last.pinningBonus||0}</span>`:''}
        ${boostControls}
      </div>
      <button type="button" class="pin-defense-button" data-pin-defense>ROLL KICKOUT <small>BIG GOLD DICE · D20</small></button>
    </section>`;
}

function renderReaction() {
  const pending=state.pendingFailure;
  if(!pending)return renderMoveCards();
  const reactor=wrestler(state,pending.defenderId),target=wrestler(state,pending.attackerId);
  const moves=getAvailableReactions(state);
  return `
    <section class="decision-panel decision-panel--reaction">
      <div class="opportunity-copy"><small>${escapeHtml(reactor.name)} · DEFENSIVE REACTION</small>
        <strong>COUNTER THE MISSED ATTACK</strong><span>${escapeHtml(target.name)} missed. Choose a trained Common Move to reverse control, or pass.</span></div>
      <div class="counter-move-options">
      ${moves.map(move=>`<button type="button" data-reaction="${escapeHtml(move.id)}" class="counter-move">
        <span class="counter-art">${moveArt(move.id)}</span>
        <span><strong>${escapeHtml(move.name)}</strong><small>−${move.staminaCost} YOUR STA · −${move.staminaDamage} OPP</small></span>
      </button>`).join('')}
      <button class="continue-button counter-pass" data-pass-reaction>${moves.length?'PASS REACTION':'NO LEGAL COUNTER · PASS'}</button>
      </div>
    </section>`;
}
function renderGroundDefense(){
 const turn=turnDecision(),defender=wrestler(state,turn.actorId);
 const attacker=turn.controlId?wrestler(state,turn.controlId):null;
 return `
   <section class="decision-panel decision-panel--ground-defense" aria-label="Ground defense while opponent retains High control">
     <div class="opportunity-copy"><small>${escapeHtml(defender.name)} · LOW DEFENSE</small>
       <strong>GET OFF THE MAT</strong><span>${attacker?escapeHtml(attacker.name)+' remains in control. ':''}You can defend before the next attack.</span></div>
     <div class="ground-response-actions">
       <button class="ground-response-primary" data-ground-scramble>SCRAMBLE <small>d20 + AGI · −2 STA · rise to knees</small></button>
       <button class="ground-response-secondary" data-ground-cover>COVER UP <small>Guard the next hit and protect body marks</small></button>
       <button class="ground-response-pass" data-ground-pass>STAY DOWN <small>Hold position</small></button>
     </div>
   </section>`;
}

function renderMatchIntro() {
  const solo=matchSetup.mode==='solo';
  return `<div class="match-intro" role="dialog" aria-modal="true" aria-label="Set up your wrestling match">
    <div class="intro-poster intro-poster--setup">
      <p class="poster-kicker">FACES &amp; HEELS · MAIN EVENT</p>
      <h1>ENTER THE<br>RING</h1>
      <div class="match-setup-modes" role="group" aria-label="Choose match mode">
        <button type="button" data-match-mode="solo" class="${solo?'is-selected':''}" aria-pressed="${solo}">SOLO vs CPU <small>YOUR wrestler against the game</small></button>
        <button type="button" data-match-mode="local" class="${!solo?'is-selected':''}" aria-pressed="${!solo}">PASS &amp; PLAY <small>Control both wrestlers locally</small></button>
      </div>
      ${solo?`
        <p class="setup-section-label">CHOOSE YOUR WRESTLER</p>
        <div class="setup-fighter-choices">
          ${['stone','viper'].map(id=>`<button type="button" data-player-id="${id}" class="${matchSetup.playerId===id?'is-selected':''}" aria-pressed="${matchSetup.playerId===id}">
            <span class="setup-fighter-portrait">${portrait(id)}</span>
            <strong>${id.toUpperCase()}</strong><small>${id==='stone'?'POWERHOUSE · FACE':'DAREDEVIL · HEEL'}</small>
          </button>`).join('')}
        </div>
        <div class="setup-difficulty">
          <span>CPU DIFFICULTY</span>
          <div role="group" aria-label="Opponent difficulty">${[['rookie','ROOKIE'],['standard','STANDARD'],['veteran','VETERAN']].map(([value,label])=>`<button type="button" data-difficulty="${value}" class="${matchSetup.difficulty===value?'is-selected':''}" aria-pressed="${matchSetup.difficulty===value}">${label}</button>`).join('')}</div>
        </div>
        <button type="button" class="setup-guide-choice" data-toggle-coaching aria-pressed="${matchSetup.tutorial}">${matchSetup.tutorial?'✓':'○'} GUIDED FIRST MATCH <small>${matchSetup.tutorial?'Short tips appear only when needed':'No help overlays during play'}</small></button>
      `:`<div class="setup-local-note">Two players share the same screen and take turns making decisions. Every move, pin, grapple and defensive roll stays manual.</div>`}
      <button type="button" class="roll-button setup-enter-button" data-start-match><strong>${solo?'START SOLO MATCH':'START LOCAL MATCH'}</strong><small>STONE VS VIPER · 2016-STYLE ARCADE WRESTLING</small></button>
      <p class="intro-help">${solo?'You control one wrestler. The CPU uses the same moves, stamina, dice and escape rules as you.':'Both corners are human-controlled, as in previous releases.'}</p>
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

function renderHoldDock() {
  const hold=state.activeHold;
  if(!hold)return renderMoveCards();
  const move=demoMoves.find(m=>m.id===hold.moveId);
  if(!move||!move.sustained)return '';
  const holder=wrestler(state,hold.holderId);
  const trapped=wrestler(state,hold.defenderId);
  const spec=move.sustained;
  const defending=state.phase==='HOLD_ESCAPE';
  const finalAttempt=Boolean(hold.finishPending);
  const able=holder.stamina>=spec.tickCost;
  const transitions=defending?[]:availableHoldTransitions(state);
  return `
    <section class="decision-panel decision-panel--hold ${defending?'is-escape':'is-holder'}" aria-label="Active wrestling submission">
      <div class="hold-ribbon-head">
        <span class="hold-live">● ${defending?(finalAttempt?'LAST-CHANCE ESCAPE':'ESCAPE WINDOW'):'SUBMISSION LOCKED'}</span>
        <strong>${escapeHtml(move.name.toUpperCase())}</strong>
        <span class="hold-count">${hold.ticks} PRESSURE ${hold.ticks===1?'TURN':'TURNS'}</span>
      </div>
      <div class="hold-ribbon-body">
        <div class="hold-figure">${moveArt(move.id)}</div>
        <div class="hold-ribbon-copy"><strong>${escapeHtml(holder.name)} ${defending?'MAINTAINS THE HOLD':'HAS CONTROL'}</strong>
          <span>${defending?(finalAttempt?'FINAL ESCAPE: a failed roll means submission.':'ESCAPE NOW: roll Agility even while your opponent has High control.'):'Apply pressure to drain more stamina, or release to attempt a pin.'}</span>
          <div class="hold-stat-line"><b>${escapeHtml(trapped.name)}: ${trapped.stamina} STA</b><span>${escapeHtml(holder.name)}: ${holder.stamina} STA</span></div>
        </div>
        <div class="hold-ribbon-actions">
          ${defending
            ?`<button type="button" class="hold-primary hold-escape" data-hold-escape>${finalAttempt?"FINAL ESCAPE":"ESCAPE"} <small>d20 + AGI · ${trapped.stamina===0?"NO STA AVAILABLE":`−${Math.min(spec.escapeCost,trapped.stamina)} STA`}</small></button>`
            :`<button type="button" class="hold-primary" data-hold-squeeze ${able?'':'disabled'}>TIGHTEN <small>−${spec.tickCost} STA / −${spec.tickDamage} OPP</small></button>
              ${transitions.map(t=>`<button type="button" class="hold-switch" data-hold-switch="${escapeHtml(t.id)}">SWITCH → ${escapeHtml(t.name.toUpperCase())}<small>−${t.cost} STA · −${t.damage} OPP · ESCAPE FOLLOWS</small></button>`).join('')}
              <button type="button" class="hold-secondary" data-hold-release>RELEASE HOLD <small>${trapped.posture==='prone'?'PIN AVAILABLE':'KEEP CONTROL'}</small></button>`}
        </div>
      </div>
    </section>`;
}

function renderDecisionDock() {
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
function focusKey(el) { return el?.dataset ? Object.entries(el.dataset).find(([key])=>['move','target','drawer','body','boost','roll','neutralRoll','startMatch','renderer','setting','pin','moreMoves','filter','back'].includes(key)) : null; }
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
  app.innerHTML = `<div class="game-shell phase-${ui.phase.toLowerCase()} ${progression.theme==='championship'?'is-championship':''}">${renderHeader()}<div class="arena-combat-zone">${renderArena()}<div class="tactical-menu-anchor">${renderCoachHint()}${renderDecisionDock()}</div></div><footer><span>RINGSIDE LIVE · ${state.turnCounter} ACTIONS</span><button data-drawer="log">MATCH LOG</button></footer></div>${renderDrawer()}${introOpen ? renderMatchIntro() : ''}`;
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

async function rollingVisual(label, finalRoll) {
  ui.phase = 'ROLLING';
  ui.rollLabel = label;
  ui.roll = null;
  render();
  const ticks = [rollDie(20), rollDie(20), rollDie(20), finalRoll];
  for (const value of ticks) {
    await wait(75);
    ui.roll = value;
    render();
  }
  await wait(120);
}

async function rollNeutral() {
  audio.cue('bell');
  const stoneRoll = rollDie(20);
  const viperRoll = rollDie(20);
  await rollingVisual('NEUTRAL · STONE BGD', stoneRoll);
  ui.phase = 'ANIMATING'; render();
  await stage.playLockup();
  const result = resolveNeutralRoll(state, stoneRoll, viperRoll);
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
  await rollingVisual(`${currentActor().name} · ${move.name}`, attackRoll);
  const crowdRolls = ui.spendCrowd ? [rollDie(6)] : [];
  const result = resolveMoveAttempt(state, { moveId: move.id, target: ui.selectedTarget, attackRoll, damageRoll, crowdSpend: ui.spendCrowd, crowdRolls });
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
  await rollingVisual(`${defender.name} · ESCAPE HOLD`,roll);
  const result=escapeHold(state,{escapeRoll:roll});
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
  await rollingVisual(`${wrestler(state,reactorId).name} · ${chosen.name.toUpperCase()}`,reactionRoll);
  const result=resolveReaction(state,{reactionMoveId:moveId,reactionRoll,damageRoll});
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
  if(roll!==undefined)await rollingVisual(`${wrestler(state,actor).name} · SCRAMBLE`,roll);
  const result=resolveGroundDefense(state,{choice,roll});
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
  await rollingVisual(`${wrestler(state,pin.pinnedId).name} · KICK OUT ${count}`,pinnedRoll);
  const result=resolvePinCount(state,{pinningId:pin.pinningId,count,pinningRoll,pinnedRoll,pinningCrowdRolls,pinnedCrowdRolls});
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
  if (el.dataset.startMatch !== undefined) { introOpen=false;matchSetup=saveMatchSetup(localStorage,matchSetup);audio.cue('bell');render();document.querySelector('[data-neutral-roll]')?.focus();return;}
  if (el.dataset.dismissGuide !== undefined){matchSetup=saveMatchSetup(localStorage,{...matchSetup,tutorial:false});ui.coachingDismissed=true;render();return;}
  // Human cannot click on the CPU's turn before its scheduled action runs.
  if(aiEnabled()&&(aiBusy||isAiDecision(state,matchSetup))&&!el.dataset.drawer&&!el.dataset.closeDrawer&&!el.dataset.renderer)return;
  if (el.dataset.neutralRoll !== undefined) { if(permitted(ACTION_IDS.NEUTRAL,null))rollNeutral(); return; }
  if (el.dataset.move) { const move = demoMoves.find(m => m.id === el.dataset.move); if (move&&permitted(ACTION_IDS.MOVE,state.activeWrestlerId)) selectMove(move); return; }
  if (el.dataset.renderer) {rendererMode=el.dataset.renderer;try{localStorage.setItem('fh-renderer-v15',rendererMode)}catch{} render();return;}
  if (el.dataset.target) { ui.selectedTarget = el.dataset.target; log(`${currentActor().name} chose ${bodyLabel(ui.selectedTarget)} for ${ui.selectedMove.name}.`); ui.phase = 'SELECTED'; render(); return; }
  if (el.dataset.roll !== undefined) { if(permitted(ACTION_IDS.MOVE,state.activeWrestlerId)) rollMove(); return; }
  if (el.dataset.boost !== undefined) { const actor=currentActor(); ui.spendCrowd = ui.spendCrowd ? 0 : (actor?.crowdResource > 0 ? 1 : 0); render(); return; }
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
  if (el.dataset.newMatch !== undefined) { location.href='./?fhbuild=1.19.0&t='+Date.now(); return; }
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
