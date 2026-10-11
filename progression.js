// Local-only, versioned progression. No effect on match engine rolls or stats.
export const SAVE_KEY='fh-progress-v1';
export function emptyProgress(){return {version:1,champion:null,series:0,wins:{stone:0,viper:0},losses:{stone:0,viper:0},history:[],palette:'classic',theme:'arena',mode:'quick',matPasses:10,learnedLegendaries:{stone:['flash-finisher'],viper:['viper-bite']}};}
export function sanitizeProgress(raw){const def=emptyProgress();if(!raw||raw.version!==1||typeof raw!=='object')return def;return {...def,...raw,
  matPasses:Math.max(0,Math.min(10,Number.isInteger(raw.matPasses)?raw.matPasses:10)),
  learnedLegendaries:{
    stone:Array.isArray(raw.learnedLegendaries?.stone)?[...new Set(raw.learnedLegendaries.stone.filter(id=>id==='flash-finisher'))].slice(0,4):def.learnedLegendaries.stone.slice(),
    viper:Array.isArray(raw.learnedLegendaries?.viper)?[...new Set(raw.learnedLegendaries.viper.filter(id=>id==='viper-bite'))].slice(0,4):def.learnedLegendaries.viper.slice()
  },
  wins:{...def.wins,...raw.wins},losses:{...def.losses,...raw.losses},
  history:Array.isArray(raw.history)?raw.history.slice(-30):[]};}
export function loadProgress(storage){try{return sanitizeProgress(JSON.parse(storage.getItem(SAVE_KEY)));}catch{return emptyProgress();}}
export function saveProgress(storage,data){storage.setItem(SAVE_KEY,JSON.stringify(sanitizeProgress(data)));}
export function recordResult(progress,winner,loser,actions,highlights=[]){const next=sanitizeProgress(progress);next.wins[winner]++;next.losses[loser]++;next.series++;next.history.push({winner,loser,actions,highlights:highlights.slice(-6),number:next.series});next.history=next.history.slice(-30);if(next.mode==='championship'&&next.series%3===0)next.champion=winner;if(next.series>=2)next.palette='spotlight';if(next.series>=3)next.theme='championship';return next;}
// Mat Passes only unlock completed, style-matched Legendary Moves. Planned
// moves are visible in the catalog but cannot be purchased or used.
export function learnLegendary(progress,wrestlerId,style,moveId){
  const p=sanitizeProgress(progress);
  const styles={stone:'Powerhouse',viper:'Daredevil'};
  const signatures={stone:'flash-finisher',viper:'viper-bite'};
  if(!styles[wrestlerId]||styles[wrestlerId]!==style||signatures[wrestlerId]!==moveId)
    return {ok:false,reason:'This signature is not available to this wrestler',progress:p};
  const known=p.learnedLegendaries[wrestlerId];
  if(known.includes(moveId))return {ok:false,reason:'Already learned',progress:p};
  if(known.length>=4)return {ok:false,reason:'Maximum four Legendary Moves',progress:p};
  if(p.matPasses<1)return {ok:false,reason:'No Mat Passes remaining',progress:p};
  known.push(moveId);p.matPasses--;
  return {ok:true,progress:p};
}
export function resetProgress(storage){storage.removeItem(SAVE_KEY);return emptyProgress();}
