import { portrait, moveArt, damageDiagram } from './ui-art.js?v=1.6.0';
import { emptyProgress, loadProgress, saveProgress, recordResult, resetProgress } from './progression.js?v=1.6.0';
import { DEFAULT_PRESENTATION, readSettings, saveSettings, delayFor, tacticalLabel, chanceToHit, MatchAudio } from './presentation.js?v=1.6.0';
import { demoMoves } from './moves.js?v=1.6.0';
import { bodyLabel, resolveTargetDecision } from './flow-engine.js?v=1.6.0';
import { IsoStage } from './iso-stage.js?v=1.6.0';
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
  resolveMoveAttempt,
  resolveReaction,
  declineReaction,
  startPin,
  resolvePinCount,
  skipPin,
  spendCrowdForStamina,
  catchBreathToNeutral,
  scrambleUp,
  totalBodyMarks
} from './match-engine.js?v=1.6.0';

const app = document.querySelector('#app');
let progression=loadProgress(localStorage);
let settings=readSettings(localStorage);
const audio=new MatchAudio();audio.muted=settings.muted;
const highlights=[];let resultRecorded=false;
const rivalryLead=progression.history.length?`${progression.history.at(-1).winner.toUpperCase()} won the previous encounter. The rivalry continues.`:'The rivalry begins. Win the opening Neutral roll to establish control.';
const trailing={stone:null,viper:null};
const state = cloneInitialState();

const animationByMove = {
  'forearm-smash': { attacker:'forearm', defender:'forearm_hit', choreography:'forearm', impactFrame:5, kind:'strike' },
  'running-clothesline': { attacker:'clothesline', defender:'clothesline_hit', choreography:'clothesline', impactFrame:5, kind:'strike', hitStopMs:84 },
  'vertical-suplex': { attacker:'suplex', defender:'suplex_taken', choreography:'suplex', impactFrame:9, kind:'slam' },
  'body-slam': { attacker:'body_slam', defender:'body_slam_taken', choreography:'body_slam', impactFrame:9, kind:'slam', hitStopMs:102 },
  'dragon-screw': { attacker:'dragon_screw', defender:'dragon_screw_taken', choreography:'dragon_screw', impactFrame:7, kind:'slam' },
  'ground-headlock': { attacker:'headlock', defender:'headlock_taken', choreography:'headlock', impactFrame:5, kind:'grapple' },
  'flash-finisher': { attacker:'suplex', defender:'suplex_taken', choreography:'suplex', impactFrame:9, kind:'slam', hitStopMs:115 }
};

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
  pinCount: 0,
  pinRolls: null,
  neutralRolls: null
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

function syncUiToEngine() {
  if (['ROLLING','ANIMATING','PIN'].includes(ui.phase)) return;
  if (state.phase === 'NEUTRAL_ROLL') ui.phase = 'NEUTRAL_ROLL';
  else if (state.phase === 'PIN_OPPORTUNITY') ui.phase = 'OPPORTUNITY';
  else if (state.phase === 'REACTION') ui.phase = 'REACTION';
  else if (state.phase === 'MATCH_COMPLETE') ui.phase = 'MATCH_COMPLETE';
  else if (state.phase === 'ACTION_SELECT' && !['TARGET_CHOICE','SELECTED','ROLLING','ANIMATING'].includes(ui.phase)) ui.phase = 'ACTION_SELECT';
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
  const active = state.activeWrestlerId === w.id;
  const roleText=role==='H'?'IN CONTROL':role==='L'?'DEFENDING':'NEUTRAL';
  const now=pct(w.stamina,w.maxStamina);
  if(trailing[w.id]===null)trailing[w.id]=now;
  else if(now>trailing[w.id])trailing[w.id]=now;
  else if(now<trailing[w.id]){const old=trailing[w.id];setTimeout(()=>{trailing[w.id]=now;const bar=document.querySelector(`[data-trail=\"${w.id}\"]`);if(bar)bar.style.width=`${now}%`;},680);trailing[w.id]=old;}
  return `
    <button class="fighter-hud fighter-hud--${side} ${active ? 'is-active-control' : ''}" data-body="${w.id}" aria-label="Open ${escapeHtml(w.name)} body status">
      <div class="hud-portrait hud-portrait--${w.id}">${portrait(w.id)}</div>
      <div class="fighter-copy">
        <div class="fighter-name-row"><strong>${escapeHtml(w.name)}</strong><span class="momentum-role momentum-role--${role.toLowerCase()}">${roleText}</span>${statusWarning(w) ? `<span class="status-chip">${escapeHtml(statusWarning(w))}</span>` : ''}</div>
        <div class="stamina-row"><span>STA</span><div class="stamina"><em class="stamina-trail" data-trail="${w.id}" style="width:${trailing[w.id]}%"></em><i style="width:${now}%"></i></div><b>${w.stamina}/${w.maxStamina}</b></div>
        <div class="crowd-row"><em>${escapeHtml(w.crowdResourceName)}</em>${crowdPips(w)}</div>
      </div>
    </button>`;
}

function renderHeader() {
  return `
    <header class="game-header">
      <div class="brand"><span>FACES</span><b>&</b><strong>HEELS</strong><em>NEON SHOWDOWN</em></div>
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
  if (ui.phase === 'PIN') {
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
    return `<div class="event-overlay event-overlay--spectacle"><small>WINNER</small><strong>${escapeHtml(wrestler(state,state.winnerId).name)}</strong><span>PINfall victory</span></div>`;
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
  const allLegal = getLegalMoves(state);
  if (!allLegal.length) {
    const canScramble = actor.posture === 'prone';
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

  const filtered = ui.filter === 'all' ? allLegal : allLegal.filter(move => move.category === ui.filter);
  const expanded = ui.moreMoves || ui.filter !== 'all';
  const moves = expanded ? filtered : filtered.slice(0, 4);
  const hiddenCount = Math.max(0, filtered.length - moves.length);
  const showFilters = expanded && allLegal.length > 4;
  const cards = moves.map(move => {
    const decision = resolveTargetDecision(move, perspectiveState(state));
    const choice = decision.kind === 'choice';
    const target = choice ? 'Choose target' : resolvedTargetLabel(move);
    const tactic=tacticalLabel(move);
    return `
      <button class="move-card move-card--${move.category} ${move.category === 'special' ? 'is-special' : ''}" data-move="${move.id}">
        <span class="move-art">${moveArt(move.id)}</span>
        <span class="move-main"><small class="move-category">${escapeHtml(move.category)}</small><strong>${escapeHtml(move.name)}</strong><small>${escapeHtml(target)} · ${tactic}</small></span>
        <span class="move-cost"><b>${move.staminaCost}</b><small>STA</small></span>
      </button>`;
  }).join('');

  const recoverButton = actor.crowdResource > 0 && actor.stamina <= actor.maxStamina - 5
    ? `<button class="recover-mini" data-recover>+10 STA · 1 ${escapeHtml(actor.crowdResourceName)}</button>` : '';
  const finishNotice = state.mustFinishTargetId === defender.id && defender.stamina <= 0
    ? `<div class="finish-required">FINISH REQUIRED · ${escapeHtml(defender.name)} IS OUT OF STAMINA</div>` : '';

  return `
    <section class="decision-panel decision-panel--moves">
      ${finishNotice}
      <div class="decision-heading"><div><small>${roleFor(state,actor.id) === 'N' ? 'NEUTRAL ACTION' : `${roleFor(state,actor.id)} CONTROL`}</small><strong>${escapeHtml(actor.name)} · choose a move</strong></div>
        <div class="decision-tools">${recoverButton}${allLegal.length > 4 ? `<button class="more-moves" data-more-moves>${expanded ? 'LESS' : `MORE +${allLegal.length - 4}`}</button>` : ''}</div>
      </div>
      ${showFilters ? `<div class="filter-row">${['all','strike','grapple','special'].map(filter => `<button data-filter="${filter}" class="filter-chip ${ui.filter === filter ? 'is-active' : ''}">${filter.toUpperCase()}</button>`).join('')}</div>` : ''}
      <div class="move-grid">${cards}</div>
      ${hiddenCount > 0 && !expanded ? `<div class="move-hint">Four legal moves shown · ${hiddenCount} more available</div>` : ''}
    </section>`;
}

function renderTargetChoice() {
  const move = ui.selectedMove;
  const decision = resolveTargetDecision(move, perspectiveState(state));
  return `
    <section class="decision-panel decision-panel--selected">
      <div class="selected-title"><button class="back-mini" data-back aria-label="Back">‹</button><div><small>${move.category.toUpperCase()}</small><strong>${escapeHtml(move.name)}</strong></div><span>CHOOSE TARGET</span></div>
      <div class="choice-grid">${decision.values.map(target => `<button class="choice-button" data-target="${target}">${escapeHtml(bodyLabel(target).toUpperCase())}</button>`).join('')}</div>
    </section>`;
}

function renderSelectedMove() {
  const move = ui.selectedMove;
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
      <meter class="connect-meter" min="0" max="100" value="${probability}" aria-label="${probability}% chance to connect">${probability}%</meter><p class="probability-note">${probability}% to connect · damage threshold and pin counts resolve separately</p><div class="primary-row"><button class="boost-button ${ui.spendCrowd ? 'is-on' : ''}" data-boost ${actor.crowdResource < 1 ? 'disabled' : ''}><strong>${boostLabel}</strong><small>${escapeHtml(actor.crowdResourceName)}</small></button><button class="roll-button" data-roll><strong>ATTEMPT MOVE</strong><small>ROLL d20 · ${escapeHtml(move.name)}</small></button></div>
    </section>`;
}

function renderOpportunity() {
  const pinning = wrestler(state, state.pinningWrestlerId);
  const pinned = wrestler(state, opponentId(state.pinningWrestlerId));
  const forced = pinned.stamina <= 0;
  return `
    <section class="decision-panel decision-panel--opportunity">
      <div class="opportunity-copy"><small>${forced ? 'FINISH REQUIRED' : 'PIN OPPORTUNITY'}</small><strong>${escapeHtml(pinned.name)} is prone</strong><span>${forced ? `${pinned.name} has 0 STA. The H wrestler must attempt a finish.` : 'Three opposed BGD counts. Body damage makes kickouts harder.'}</span></div>
      <div class="opportunity-actions"><button class="pin-button" data-pin>PIN NOW</button>${forced ? '' : '<button class="continue-button" data-continue>CONTINUE</button>'}</div>
    </section>`;
}

function renderReaction() {
  const pending = state.pendingFailure;
  if (!pending) return renderMoveCards();
  const reactor = wrestler(state, pending.defenderId);
  const target = wrestler(state, pending.attackerId);
  const available = canReact(state);
  return `
    <section class="decision-panel decision-panel--reaction">
      <div class="opportunity-copy"><small>REACTION WINDOW</small><strong>${escapeHtml(reactor.name)} can steal control</strong><span>Shove Counter: d20 + Power vs ${escapeHtml(target.name)} CON ${conditioning(target)} · costs 5 STA.</span></div>
      <div class="opportunity-actions">${available ? '<button class="reaction-button" data-reaction>COUNTER · 5 STA</button>' : ''}<button class="continue-button" data-pass-reaction>${available ? 'PASS' : 'NO STAMINA · PASS'}</button></div>
    </section>`;
}

function renderMatchIntro() {
  return `<div class="match-intro" role="dialog" aria-modal="true" aria-label="Tonight's match"><div class="intro-poster"><p class="poster-kicker">FACES &amp; HEELS PRESENTS</p><h1>MAIN<br>EVENT</h1><div class="poster-match"><div>${portrait('stone')}<strong>STONE</strong><span>POWERHOUSE · FACE</span></div><b>VS</b><div>${portrait('viper')}<strong>VIPER</strong><span>DAREDEVIL · HEEL</span></div></div><p class="intro-rivalry">${escapeHtml(rivalryLead)}</p><button class="roll-button" data-start-match><strong>ENTER THE RING</strong><small>A TACTICAL WRESTLING SHOWDOWN</small></button><p class="intro-help">Play both corners. Choose a move, roll the dice, and fight for the three-count.</p></div></div>`;
}

function renderMatchComplete() {
  const winner = wrestler(state, state.winnerId);
  return `
    <section class="decision-panel decision-panel--winner"><div class="winner-portrait">${portrait(winner.id)}</div>
      <div class="opportunity-copy"><small>MATCH COMPLETE</small><strong>${escapeHtml(winner.name)} WINS</strong><span>Pinfall · ${state.turnCounter} resolved actions · ${highlights.length} highlights</span><div class="result-record">STONE ${progression.wins.stone} — ${progression.wins.viper} VIPER</div><p class="result-highlight">${escapeHtml(highlights.at(-1) || 'The final three-count settles the match.')}</p></div>
      <div class="victory-actions"><button class="pin-button" data-new-match>REMATCH</button><button class="continue-button" data-drawer="highlights">HIGHLIGHTS</button><button class="continue-button" data-drawer="progress">CAREER</button></div>
    </section>`;
}

function renderDecisionDock() {
  if (ui.phase === 'NEUTRAL_ROLL') return renderNeutral();
  if (ui.phase === 'TARGET_CHOICE') return renderTargetChoice();
  if (ui.phase === 'SELECTED') return renderSelectedMove();
  if (ui.phase === 'OPPORTUNITY') return renderOpportunity();
  if (ui.phase === 'REACTION') return renderReaction();
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
      <div class="stat-summary"><span>Power <b>${statModifier(w.stats.Power) >= 0 ? '+' : ''}${statModifier(w.stats.Power)}</b></span><span>Agility <b>${statModifier(w.stats.Agility) >= 0 ? '+' : ''}${statModifier(w.stats.Agility)}</b></span><span>CON <b>${conditioning(w)}</b></span><span>Marks <b>${totalBodyMarks(w)}</b></span></div>
      <div class="body-figure">${damageDiagram(damage)}</div>
      <div class="damage-list">${parts.map(([key,label]) => `<div><span>${label}</span><b class="damage-${Math.min(3,damage[key]||0)}">${damage[key]||0} / 3</b></div>`).join('')}</div>
      <p class="drawer-note">Body marks penalize pin rolls. Damage marks are earned only when a move's damage die beats that body part's threshold.</p>
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

function renderSettingsDrawer(){return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer"><header><strong>Presentation settings</strong><button data-close-drawer aria-label="Close panel">×</button></header><p class="drawer-note">These settings change presentation only. Dice rolls and rules are identical.</p>${[['muted','Mute sound'],['reducedMotion','Reduced motion'],['reducedFlash','Reduced flash'],['fast','Fast presentation']].map(([key,label])=>`<label class="setting-option"><span>${label}</span><input type="checkbox" data-setting="${key}" ${settings[key]?'checked':''}></label>`).join('')}<details class="developer-options"><summary>Arena tools &amp; build info</summary><div class="lab-controls">${[['iso','Isometric'],['sprite','Sprites'],['compare','Compare']].map(([mode,label])=>`<button data-renderer="${mode}" aria-pressed="${rendererMode===mode}">${label}</button>`).join('')}</div><a href="./motion-lab.html">Open motion lab ↗</a><p>Build 1.6.0 · provisional digital rules</p></details></aside>`;}
function renderProgressDrawer(){return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer drawer--wide"><header><strong>Championship journey</strong><button data-close-drawer aria-label="Close panel">×</button></header><div class="championship-track">${[1,2,3].map(n=>`<span class="${progression.series>=n?'is-earned':''}"><b>${n}</b>${['DEBUT','SPOTLIGHT','TITLE ARENA'][n-1]}</span>`).join('')}</div><p class="drawer-note">Three-match championship series. Results and cosmetic unlocks live only on this device. No combat bonuses.</p><div class="stat-summary"><span>Stone wins <b>${progression.wins.stone}</b></span><span>Viper wins <b>${progression.wins.viper}</b></span><span>Matches <b>${progression.series}</b></span><span>Champion <b>${progression.champion?.toUpperCase()||'UNDECIDED'}</b></span></div><button class="drawer-action" data-toggle-career><strong>${progression.mode==='championship'?'CHAMPIONSHIP ACTIVE':'START CHAMPIONSHIP SERIES'}</strong></button><p class="drawer-note">Rewards: ${progression.palette==='spotlight'?'Spotlight palette unlocked':'Spotlight palette after 2 matches'} · ${progression.theme==='championship'?'Championship arena unlocked':'Championship arena after 3 matches'}</p>${progression.history.slice(-6).reverse().map(m=>`<p class="history-row">MATCH ${m.number} · ${m.winner.toUpperCase()} won · ${m.actions} actions</p>`).join('')}<button class="continue-button" data-reset-progress>RESET PROGRESSION</button></aside>`;}
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
  const oldCanvas = document.querySelector('#match-canvas');
  app.innerHTML = `<div class="game-shell phase-${ui.phase.toLowerCase()} ${progression.theme==='championship'?'is-championship':''}">${renderHeader()}<div class="arena-combat-zone">${renderArena()}<div class="tactical-menu-anchor">${renderDecisionDock()}</div></div><footer><span>RINGSIDE LIVE · ${state.turnCounter} ACTIONS</span><button data-drawer="log">MATCH LOG</button></footer></div>${renderDrawer()}${introOpen ? renderMatchIntro() : ''}`;
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
  stage.mode=rendererMode;stage.fast=settings.fast;stage.reducedMotion=settings.reducedMotion;stage.reducedFlash=settings.reducedFlash;

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
  const anim = animationByMove[move.id] || animationByMove['forearm-smash'];
  if(move.category==='special')audio.cue('finisher');
  await stage.playPair(anim.attacker, anim.defender, {
    attackerId: result.attackerId,
    moveId: move.id,
    impactFrame: anim.impactFrame,
    choreography: anim.choreography,
    impactKind: anim.kind,
    hitStopMs: anim.hitStopMs,
    onImpact: () => {
      audio.cue(anim.kind==='slam'?'heavy':'light');
      const arena = document.querySelector('.arena-shell');
      const ring = document.querySelector('.ring-stage');
      arena?.classList.add(anim.kind === 'slam' ? 'impact-shake--slam' : 'impact-shake');
      ring?.classList.add(anim.kind === 'slam' ? 'ring-bounce--slam' : 'ring-bounce');
      setTimeout(() => { arena?.classList.remove('impact-shake','impact-shake--slam'); ring?.classList.remove('ring-bounce','ring-bounce--slam'); }, anim.kind === 'slam' ? 260 : 180);
      const damageText = result.damage?.marked ? `${bodyLabel(result.target).toUpperCase()} MARK +1` : `${bodyLabel(result.target).toUpperCase()} HOLDS`;
      ui.event = { title: move.id === 'flash-finisher' ? 'FLASHPOINT DRIVER!' : `${move.name.toUpperCase()}!`, detail: `${damageText} · -${result.staminaDamage} STA`, kind: move.category === 'special' ? 'spectacle' : 'major', impact: true };
      render();
    }
  });
  stage.resetPositions();
  ui.event = null;
  stage.setRestingState({ postures: { stone: wrestler(state,'stone').posture, viper: wrestler(state,'viper').posture } });
  ui.selectedMove = null;
  ui.selectedTarget = null;
  ui.spendCrowd = 0;
  ui.phase = state.pinEligible ? 'OPPORTUNITY' : 'ACTION_SELECT';
  render();
}

async function rollMove() {
  const move = ui.selectedMove;
  if (!move) return;
  const attackRoll = rollDie(20);
  const damageRoll = rollDie(move.damageDie);
  await rollingVisual(`${currentActor().name} · ${move.name}`, attackRoll);
  const result = resolveMoveAttempt(state, { moveId: move.id, target: ui.selectedTarget, attackRoll, damageRoll, crowdSpend: ui.spendCrowd });
  log(`${wrestler(state,result.attackerId).name} ${move.name}: d20 ${attackRoll} ${result.modifier >= 0 ? '+' : ''}${result.modifier}${result.spentCrowd ? ` +${result.spentCrowd} crowd` : ''} = ${result.total} vs CON ${result.targetNumber}.`);
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

async function runReaction() {
  if (!state.pendingFailure || !canReact(state)) return;
  const reactorId = state.pendingFailure.defenderId;
  const reactionRoll = rollDie(20);
  const damageRoll = rollDie(6);
  await rollingVisual(`${wrestler(state,reactorId).name} · SHOVE COUNTER`, reactionRoll);
  const result = resolveReaction(state, { reactionRoll, damageRoll });
  log(`${wrestler(state,result.reactorId).name} Shove Counter: ${result.reactionRoll} ${result.modifier >= 0 ? '+' : ''}${result.modifier} = ${result.total} vs CON ${result.targetNumber}.`);
  if (!result.success) {
    log('Reaction failed. Existing control is maintained, or Neutral resumes if no H/L existed.');
    ui.phase = state.phase === 'NEUTRAL_ROLL' ? 'NEUTRAL_ROLL' : 'ACTION_SELECT';
    announce('COUNTER FAILS', state.phase === 'NEUTRAL_ROLL' ? 'Back to Neutral' : `${currentActor()?.name || 'H'} keeps control`, 'danger', false, 900);
    return;
  }
  ui.phase='ANIMATING';render();
  const damageText = result.damage?.marked ? 'CORE MARK +1' : 'CORE HOLDS';
  await stage.playPair('forearm', 'forearm_hit', {
    attackerId: result.reactorId,
    choreography: 'forearm',
    impactFrame: 5,
    impactKind: 'strike',
    hitStopMs: 72,
    onImpact: () => {audio.cue('reversal');announce('REVERSAL!' , `${damageText} · ${wrestler(state,result.reactorId).name} TAKES H`, 'major', true, 850);} 
  });
  stage.resetPositions();
  stage.setRestingState({ postures: { stone: wrestler(state,'stone').posture, viper: wrestler(state,'viper').posture } });
  log(`${wrestler(state,result.reactorId).name} successfully steals H control.`);
  ui.phase = 'ACTION_SELECT';
  render();
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
  const pin = startPin(state);
  ui.phase = 'PIN';
  ui.pinCount = 0;
  ui.pinRolls = null;
  stage.playPin({ pinningId: pin.pinningId });
  render();
  log(`${wrestler(state,pin.pinningId).name} attempts a pin on ${wrestler(state,pin.pinnedId).name}.`);

  for (const count of [1,2,3]) {
    await wait(450);
    const pinningRoll = rollDie(20);
    const pinnedRoll = rollDie(20);
    const result = resolvePinCount(state, { pinningId: pin.pinningId, count, pinningRoll, pinnedRoll });
    audio.cue('count');
    ui.pinCount = count;
    ui.pinRolls = result;
    render();
    log(`Pin count ${count}: ${wrestler(state,pin.pinningId).name} ${result.pinningRoll}-${result.pinningPenalty}=${result.pinningTotal}; ${wrestler(state,pin.pinnedId).name} ${result.pinnedRoll}-${result.pinnedPenalty}=${result.pinnedTotal}.`);
    await wait(520);
    if (result.kickout) {
      audio.cue('reversal');
      ui.event = { title:`KICKOUT AT ${count}!`, detail:`${wrestler(state,pin.pinnedId).name} wins the count · +10 STA · next move`, kind:'spectacle', impact:true };
      render();
      await stage.playKickout({ pinnedId: pin.pinnedId, onImpact: () => stage.pulseImpact('kickout') });
      log(`${wrestler(state,pin.pinnedId).name} kicks out at ${count}. Both are prone, N/N, and ${wrestler(state,pin.pinnedId).name} receives the next move.`);
      await wait(500);
      ui.event = null;
      ui.pinCount = 0;
      ui.pinRolls = null;
      ui.phase = 'ACTION_SELECT';
      stage.resetPositions();
      stage.setRestingState({ postures: { stone: wrestler(state,'stone').posture, viper: wrestler(state,'viper').posture } });
      render();
      return;
    }
    if (result.pinfall) {
      audio.cue('victory');
      if(!resultRecorded){progression=recordResult(progression,pin.pinningId,pin.pinnedId,state.turnCounter,highlights);saveProgress(localStorage,progression);resultRecorded=true;}
      ui.event = { title:'PINFALL!', detail:`${wrestler(state,pin.pinningId).name} wins the match`, kind:'spectacle', impact:true };
      log(`${wrestler(state,pin.pinningId).name} wins by pinfall.`);
      ui.phase = 'MATCH_COMPLETE';
      render();
      return;
    }
  }
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
  ui.moreMoves = false;
  ui.filter = 'all';
  render();
}

app.addEventListener('change',event=>{const input=event.target.closest('[data-setting]');if(!input)return;settings=saveSettings(localStorage,{...settings,[input.dataset.setting]:input.checked});audio.muted=settings.muted;if(stage){stage.reducedMotion=settings.reducedMotion;stage.reducedFlash=settings.reducedFlash;}document.documentElement.classList.toggle('user-reduced-motion',settings.reducedMotion);document.documentElement.classList.toggle('user-reduced-flash',settings.reducedFlash);});
app.addEventListener('click', event => {
  audio.unlock();
  const el = event.target.closest('button,[data-close-drawer]');
  if (!el) return;
  if (['ROLLING','ANIMATING','PIN'].includes(ui.phase) && !el.dataset.renderer && !el.dataset.drawer && el.dataset.closeDrawer===undefined) return;
  if (el.dataset.startMatch !== undefined) { introOpen=false; audio.cue('bell'); render(); document.querySelector('[data-neutral-roll]')?.focus(); return; }
  if (el.dataset.neutralRoll !== undefined) { rollNeutral(); return; }
  if (el.dataset.move) { const move = demoMoves.find(m => m.id === el.dataset.move); if (move) selectMove(move); return; }
  if (el.dataset.renderer) {rendererMode=el.dataset.renderer;try{localStorage.setItem('fh-renderer-v15',rendererMode)}catch{} render();return;}
  if (el.dataset.target) { ui.selectedTarget = el.dataset.target; log(`${currentActor().name} chose ${bodyLabel(ui.selectedTarget)} for ${ui.selectedMove.name}.`); ui.phase = 'SELECTED'; render(); return; }
  if (el.dataset.roll !== undefined) { rollMove(); return; }
  if (el.dataset.boost !== undefined) { const actor=currentActor(); ui.spendCrowd = ui.spendCrowd ? 0 : (actor?.crowdResource > 0 ? 1 : 0); render(); return; }
  if (el.dataset.back !== undefined) { resetSelection(); return; }
  if (el.dataset.pin !== undefined) { runPin(); return; }
  if (el.dataset.continue !== undefined) { const result=skipPin(state); if (!result.ok) { announce('FINISH REQUIRED','0 STA opponent must be pinned or submitted','danger',false,850); return; } ui.phase='ACTION_SELECT'; render(); return; }
  if (el.dataset.reaction !== undefined) { runReaction(); return; }
  if (el.dataset.passReaction !== undefined) { passReaction(); return; }
  if (el.dataset.recover !== undefined) { recoverWithCrowd(); return; }
  if (el.dataset.scrambleUp !== undefined) { scrambleUpAction(); return; }
  if (el.dataset.catchBreath !== undefined) { catchBreath(); return; }
  if(el.dataset.toggleCareer!==undefined){progression.mode=progression.mode==='championship'?'quick':'championship';saveProgress(localStorage,progression);render();return;}
  if(el.dataset.resetProgress!==undefined){if(confirm('Reset all local championship results and rewards?')){progression=resetProgress(localStorage);render();}return;}
  if (el.dataset.newMatch !== undefined) { location.href='./?fhbuild=1.6.0&t='+Date.now(); return; }
  if (el.dataset.moreMoves !== undefined) { ui.moreMoves=!ui.moreMoves; if(!ui.moreMoves) ui.filter='all'; render(); return; }
  if (el.dataset.filter) { ui.filter=el.dataset.filter; ui.moreMoves=true; render(); return; }
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
