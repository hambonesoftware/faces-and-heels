/**
 * Actual scored dice display for Faces & Heels' broadcast presentation.
 * The roll owner provides verified engine dice. This module NEVER rolls dice,
 * changes outcomes, or implies a passive CON/DC check is an opposed d20.
 */
export function renderBroadcastDice({title='',mode='opposed',leftLabel='WRESTLER',leftValue=null,rightLabel='OPPONENT',rightValue=null,leftMeta='D20',rightMeta=null,caption='',result='',live=false}={}){
  if(!['opposed','target'].includes(mode))throw new Error('Invalid dice graphic type');
  rightMeta ??= mode==='target'?'STATIC DC':'D20';
  const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const face=(value,isTarget=false)=>{
    const known=Number.isInteger(value)&&value>=0&&value<=99;
    return isTarget?(known?String(value):'—'):(known?String(value):'·');
  };
  const card=(side,label,value,meta,isTarget=false)=>
    `<div class="broadcast-dice-player broadcast-dice-player--${side}">
      <div class="broadcast-dice-name">${escape(label)}</div>
      <div class="broadcast-die ${isTarget?'broadcast-die--target':'broadcast-die--d20'}" aria-label="${escape(label)} ${isTarget?'target':'d20 roll'}: ${escape(face(value,isTarget))}">
        <span class="broadcast-die-face">${face(value,isTarget)}</span>
        <span class="broadcast-die-type">${isTarget?'TARGET':'D20'}</span>
      </div>
      <div class="broadcast-dice-meta">${escape(meta)}</div>
    </div>`;
  return `<section class="broadcast-dice-console ${live?'is-rolling':''}" aria-label="${escape(title||'Dice graphics')}" role="group">
    <div class="broadcast-dice-heading"><span class="broadcast-dice-live">● RINGSIDE REPLAY</span><strong>${escape(title)}</strong></div>
    <div class="broadcast-dice-matchup">
      ${card('left',leftLabel,leftValue,leftMeta)}
      <span class="broadcast-dice-versus" aria-hidden="true">VS</span>
      ${card('right',rightLabel,rightValue,rightMeta,mode==='target')}
    </div>
    ${caption?`<p class="broadcast-dice-caption">${escape(caption)}</p>`:''}
    ${result?`<div class="broadcast-dice-result" role="status">${escape(result)}</div>`:''}
  </section>`;
}
