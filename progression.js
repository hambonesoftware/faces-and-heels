// Local-only, versioned progression. No effect on match engine rolls or stats.
export const SAVE_KEY='fh-progress-v1';
export function emptyProgress(){return {version:1,champion:null,series:0,wins:{stone:0,viper:0},losses:{stone:0,viper:0},history:[],palette:'classic',theme:'arena',mode:'quick'};}
export function sanitizeProgress(raw){const def=emptyProgress();if(!raw||raw.version!==1||typeof raw!=='object')return def;return {...def,...raw,wins:{...def.wins,...raw.wins},losses:{...def.losses,...raw.losses},history:Array.isArray(raw.history)?raw.history.slice(-30):[]};}
export function loadProgress(storage){try{return sanitizeProgress(JSON.parse(storage.getItem(SAVE_KEY)));}catch{return emptyProgress();}}
export function saveProgress(storage,data){storage.setItem(SAVE_KEY,JSON.stringify(sanitizeProgress(data)));}
export function recordResult(progress,winner,loser,actions,highlights=[]){const next=sanitizeProgress(progress);next.wins[winner]++;next.losses[loser]++;next.series++;next.history.push({winner,loser,actions,highlights:highlights.slice(-6),number:next.series});next.history=next.history.slice(-30);if(next.mode==='championship'&&next.series%3===0)next.champion=winner;if(next.series>=2)next.palette='spotlight';if(next.series>=3)next.theme='championship';return next;}
export function resetProgress(storage){storage.removeItem(SAVE_KEY);return emptyProgress();}
