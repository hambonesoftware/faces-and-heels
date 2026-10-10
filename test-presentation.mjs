import assert from 'node:assert/strict';
import {emptyProgress,recordResult,sanitizeProgress,loadProgress,saveProgress,resetProgress} from './progression.js';
import {tacticalLabel,chanceToHit,delayFor,safeSettings} from './presentation.js';
import {demoMoves} from './moves.js';
const mock=new Map();const storage={getItem:k=>mock.get(k)||null,setItem:(k,v)=>mock.set(k,v),removeItem:k=>mock.delete(k)};
let p=emptyProgress();assert.equal(loadProgress(storage).series,0);p.mode='championship';for(let i=0;i<3;i++)p=recordResult(p,i%2?'viper':'stone',i%2?'stone':'viper',20,['Counter']);saveProgress(storage,p);assert.equal(loadProgress(storage).series,3);assert.ok(loadProgress(storage).champion);assert.equal(resetProgress(storage).series,0);assert.equal(loadProgress(storage).series,0);
assert.equal(sanitizeProgress({version:99}).series,0);assert.equal(safeSettings({fast:true,bogus:'yes'}).bogus,undefined);assert.equal(delayFor(800,{fast:true}),200);assert.equal(chanceToHit(0,11),50);assert.equal(tacticalLabel(demoMoves.find(m=>m.id==='body-slam')),'SET UP PIN');
console.log('Presentation and progression tests passed.');
