/**
 * Faces & Heels v1.25: arena-first, thumb-driven controls.
 * Pure render helpers. Pass already-legal engine moves: this module never
 * invents attacks, grapples, reversals, pin options, or new combat rules.
 */
const e=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export const FAMILY_ORDER=Object.freeze(['strike','grapple','special','setup']);
export const FAMILY_LABELS=Object.freeze({
 strike:'STRIKE',grapple:'GRAPPLE',special:'SPECIAL',setup:'SETUP'
});
export const FAMILY_SYMBOLS=Object.freeze({
 strike:'✦',grapple:'◆',special:'★',setup:'↗'
});
export function moveFamilies(legalMoves=[]){
 return FAMILY_ORDER.map(id=>({
   id,label:FAMILY_LABELS[id],symbol:FAMILY_SYMBOLS[id],
   moves:legalMoves.filter(move=>move.category===id)
 })).filter(f=>f.moves.length);
}
export function renderCombatDock({actor,defender,legalMoves=[],family=null,canRecover=false,canStand=false,finishRequired=false}={}){
 if(!actor)return '';
 const groups=moveFamilies(legalMoves);
 const active=groups.find(group=>group.id===family);
 const header=`<div class="combat-dock-head">
   <span class="combat-dock-status"><i aria-hidden="true"></i>${e(actor.name)} · ${active?'CHOOSE MOVE':'IN CONTROL'}</span>
   <span class="combat-dock-hint">${active?`${active.moves.length} TRAINED ${e(active.label)} MOVES`:'PICK YOUR ATTACK'}</span>
 </div>`;
 const tools=(canStand||canRecover)?`<div class="combat-dock-utility">
   ${canStand?'<button type="button" class="dock-utility" data-scramble-up>STAND UP</button>':''}
   ${canRecover?`<button type="button" class="dock-utility" data-recover>RECOVER +10 STA <small>1 ${e(actor.crowdResourceName)}</small></button>`:''}
 </div>`:'';
 const notice=finishRequired?`<span class="combat-dock-alert">FINISH ${e(defender?.name||'OPPONENT')} · NO STAMINA</span>`:'';
 if(!groups.length){
  return `<section class="combat-dock combat-dock--recovery" aria-label="Wrestling recovery controls">
    ${header}<div class="combat-dock-line"><strong>RESET THE EXCHANGE</strong>
    ${canStand?'<button class="dock-action dock-action--primary" data-scramble-up>STAND UP</button>':''}
    ${canRecover?`<button class="dock-action" data-recover>RECOVER <small>1 ${e(actor.crowdResourceName)}</small></button>`:''}
    ${!canStand?'<button class="dock-action dock-action--primary" data-catch-breath>CATCH BREATH</button>':''}</div>
   </section>`;
 }
 if(!active){
   return `<section class="combat-dock combat-dock--families" aria-label="Choose wrestling attack category">
     ${notice}${header}
     <div class="combat-dock-families">
       ${groups.map(g=>`<button type="button" data-dock-family="${g.id}" class="dock-family dock-family--${g.id}" aria-label="${g.label}, ${g.moves.length} available moves">
         <span class="dock-family-symbol" aria-hidden="true">${g.symbol}</span>
         <strong>${g.label}</strong>
         <span class="dock-family-count">${g.moves.length}</span>
       </button>`).join('')}
     </div>${tools}
    </section>`;
 }
 return `<section class="combat-dock combat-dock--moves" aria-label="${e(active.label)} move selection">
   ${notice}<div class="combat-dock-head"><button type="button" data-dock-back class="dock-back" aria-label="Back to attack types">‹</button>
   <span class="combat-dock-status"><i aria-hidden="true"></i>${e(active.label)} <small>· ${e(actor.name)}</small></span>
   <span class="combat-dock-hint">${active.moves.length} AVAILABLE</span></div>
   <div class="combat-move-window" data-action-rail role="region" tabindex="0" aria-label="Legal ${e(active.label)} moves, swipe or use arrow keys">
     ${active.moves.map(move=>`<button type="button" class="dock-move dock-move--${e(move.category)}" data-move="${e(move.id)}"
         aria-label="${e(move.name)}, costs ${move.staminaCost} stamina">
          <span class="dock-move-name">${e(move.name)}</span>
          <span class="dock-move-cost">−${move.staminaCost} STA</span>
        </button>`).join('')}
   </div><div class="combat-dock-bottom"><span>SWIPE FOR MORE MOVES</span><button type="button" class="dock-back-text" data-dock-back>ALL ATTACKS ›</button></div>
 </section>`;
}
/** Render action-only in-ring moments using the engine's REAL input selectors. */
export function renderCombatPrompt({kind='action',kicker='',title='',detail='',actions=[],extras='',meta=''}={}){
 return `<section class="combat-dock combat-dock--prompt combat-dock--${e(kind)}" aria-label="${e(title||'Match decision')}">
   <div class="combat-dock-head"><span class="combat-dock-status"><i aria-hidden="true"></i>${e(kicker)}</span>${meta?`<span class="combat-dock-hint">${e(meta)}</span>`:''}</div>
   <div class="combat-prompt-body"><div class="combat-prompt-copy"><strong>${e(title)}</strong>${detail?`<small>${e(detail)}</small>`:''}</div>
     <div class="combat-prompt-actions">
       ${actions.map(a=>`<button type="button" class="dock-action ${a.primary?'dock-action--primary':''} ${a.danger?'dock-action--danger':''}"
         ${e(a.action)}${a.disabled?' disabled':''}>${e(a.label)}${a.note?`<small>${e(a.note)}</small>`:''}</button>`).join('')}
     </div>
   </div>${extras?`<div class="combat-prompt-extras">${extras}</div>`:''}
 </section>`;
}
/** Heat/Pop choices only display if an existing pin count permits it. */
export function renderPinEnergy({resourceName='HEAT/POP',resource=0,chosen=0}={}){
 const available=Math.max(0,Math.min(3,Number(resource)||0));
 return `<div class="dock-energy" role="group" aria-label="${e(resourceName)} dice for the upcoming pin count">
  <span>ADD ${e(resourceName)}:</span>
  ${Array.from({length:available+1},(_,i)=>`<button type="button" class="dock-energy-step ${chosen===i?'is-on':''}" data-pin-crowd="${i}" aria-pressed="${chosen===i}">${i}d6</button>`).join('')}
 </div>`;
}
