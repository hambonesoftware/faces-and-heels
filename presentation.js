// Presentation is deliberately independent from gameplay resolution.
export const DEFAULT_PRESENTATION={muted:false,reducedMotion:false,reducedFlash:false,fast:false};
export function safeSettings(raw){return {...DEFAULT_PRESENTATION,...Object.fromEntries(Object.entries(raw||{}).filter(([k,v])=>k in DEFAULT_PRESENTATION&&typeof v==='boolean'))};}
export function readSettings(storage){try{return safeSettings(JSON.parse(storage.getItem('fh-presentation-v1')));}catch{return safeSettings();}}
export function saveSettings(storage,options){const safe=safeSettings(options);storage.setItem('fh-presentation-v1',JSON.stringify(safe));return safe;}
export function delayFor(ms,settings){return settings.fast?Math.min(ms,Math.round(ms*.25)):settings.reducedMotion?Math.min(ms,100):ms;}
export function tacticalLabel(move){if(move.category==='special')return 'FINISHER';if(move.result?.defenderPosture==='prone')return 'SET UP PIN';if(move.targeting?.bodyParts?.some(x=>x==='core'))return 'TARGET CORE';if(move.crowdGain>0)return 'BUILD CROWD';if(move.staminaCost<=5)return 'LOW COST';return 'TECHNIQUE';}
export function chanceToHit(statMod, target, bonus=0){let wins=0;for(let d=1;d<=20;d++)if(d+statMod+bonus>=target)wins++;return Math.round(wins*5);}
export class MatchAudio {
  constructor(){this.ctx=null;this.muted=false;}
  unlock(){if(this.muted)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx ||= new C();this.ctx.resume?.();}catch{}}
  cue(kind){if(this.muted||!this.ctx)return;const table={select:[[420,.045]],bell:[[680,.20],[920,.25]],light:[[120,.06]],heavy:[[80,.16],[46,.24]],count:[[380,.12]],reversal:[[520,.07],[740,.10]],victory:[[440,.13],[550,.17],[700,.25]],finisher:[[220,.20],[90,.20]],crowd:[[260,.06],[320,.08]]};let t=this.ctx.currentTime;for(const [freq,dur] of table[kind]||table.select){const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=kind==='heavy'?'triangle':'sine';osc.frequency.setValueAtTime(freq,t);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.075,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);osc.connect(gain).connect(this.ctx.destination);osc.start(t);osc.stop(t+dur+.012);t+=dur*.6;}}
}
