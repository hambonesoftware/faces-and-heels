import * as rules from './match-engine.js';
import { bodyLabel, resolveTargetDecision } from './flow-engine.js';
import { demoMoves } from './moves.js';
import { chooseAiAction, isAiDecision, sanitizeMatchSetup } from './solo-ai.js';
import { animationByMove } from './combat-animation-map.js';
import { samplePair, blendPairs, MOVE_TIMING } from './choreography.js';
import { drawBlockModel } from './block-model.js';

let state = rules.cloneInitialState();
let setup = sanitizeMatchSetup({ mode: 'solo', playerId: 'stone' });
let shown = rest();
const roll = sides => 1 + Math.floor(Math.random() * sides);
const d20 = () => roll(20);
const moveName = id => demoMoves.find(move => move.id === id)?.name ?? id;
const who = id => id === 'stone' ? 'Stone' : 'Viper';
const holdName = { armbar:'armbar', 'ankle-lock':'ankle_lock', 'ground-headlock':'headlock',
    'standing-wristlock':'standing_wristlock', 'standing-headlock':'standing_headlock' };

function rest() {
    const postures = Object.fromEntries(Object.entries(state.wrestlers).map(([id,w]) => [id,w.posture]));
    if (state.activeHold) {
        return samplePair(holdName[state.activeHold.moveId], .60, state.activeHold.holderId, postures);
    }
    if ((state.phase === 'PIN' || state.winMethod === 'pinfall') && state.pinningWrestlerId) {
        return samplePair('pin', 1, state.pinningWrestlerId, postures);
    }
    if (state.ringPosition) {
        const name = state.ringPosition.zone === 'corner' ? 'corner_whip' : 'irish_whip';
        return samplePair(name, 1, rules.opponentId(state.ringPosition.targetId), postures);
    }
    return samplePair(null, 0, 'stone', postures);
}

const encodePose = pair => {
    const groups = new Map();
    for (const actor of Object.values(pair)) {
        const faces = [];
        let floor = Infinity;
        drawBlockModel({ face(points, color) {
            faces.push([points, color]);
            for (const point of points) floor = Math.min(floor, point[1]);
        } }, actor);
        const clearance = Math.max(0, -floor) + .015;
        for (const [points, color] of faces) {
            const vertices = groups.get(color) ?? [];
            groups.set(color, vertices);
            for (let i = 1; i < points.length - 1; i++) {
                for (const [x,y,z] of [points[0],points[i],points[i+1]]) {
                    vertices.push(x,y + clearance,z);
                }
            }
        }
    }
    return groups;
};

function writeClip(segments) {
    const stream = [];
    const allocate = size => new DataView(new ArrayBuffer(size));
    const count = allocate(4);
    count.setInt32(0,segments.length,true);
    stream.push(count);
    for (const segment of segments) {
        const samples = Math.max(1, Math.round(segment.duration * 24) + 1);
        const first = encodePose(segment.pose(0));
        const colors = [...first.keys()].sort();
        const sizes = colors.map(color => first.get(color).length);
        const size = sizes.reduce((a,b)=>a+b,0);
        const header = allocate(12 + 8 * colors.length);
        header.setInt32(0,samples,true);
        header.setFloat32(4,segment.duration,true);
        header.setInt32(8,colors.length,true);
        colors.forEach((color,i)=>{
            header.setInt32(12+8*i,parseInt(color.slice(1),16),true);
            header.setInt32(16+8*i,sizes[i]/3,true);
        });
        const frames = allocate(samples * size * 2);
        let offset = 0;
        for (let frame=0;frame<samples;frame++) {
            const groups = frame===0 ? first : encodePose(segment.pose(frame/(samples-1)));
            for (let i=0;i<colors.length;i++) {
                const vertices = groups.get(colors[i]);
                if (vertices?.length !== sizes[i]) throw Error('Animation geometry changed during a clip.');
                for (const value of vertices) {
                    if (!Number.isFinite(value) || Math.abs(value)>31) throw Error('Invalid wrestler position.');
                    frames.setInt16(offset,Math.round(value*1000),true);
                    offset += 2;
                }
            }
        }
        stream.push(header,frames);
    }
    const clip = new Uint8Array(stream.reduce((sum,section)=>sum+section.byteLength,0));
    let offset = 0;
    for (const section of stream) {
        clip.set(new Uint8Array(section.buffer),offset);
        offset += section.byteLength;
    }
    return clip;
}

function blendSegment(from,to,duration) {
    const articulated = Object.values(from).some(actor=>actor.frames) || Object.values(to).some(actor=>actor.frames);
    return {duration,pose:t=>blendPairs(from,to,articulated ? .00001 + .99998*t : t)};
}

function animation(move, actor, postures, preview=false) {
    const next = preview ? samplePair(move,1,actor,postures) : rest();
    if (!move) {
        const clip = writeClip([blendSegment(shown,next,.30),{duration:0,pose:()=>next}]);
        shown = next;
        return clip;
    }
    const pose = t => samplePair(move,t,actor,postures);
    const first=pose(0), last=pose(1);
    const segments = [
        blendSegment(shown,first,.22),
        {duration:MOVE_TIMING[move].duration/1000,pose}
    ];
    if (!preview) segments.push(blendSegment(last,next,.32),{duration:0,pose:()=>next});
    shown=next;
    return writeClip(segments);
}

function actions() {
    const turn=rules.getAvailableActions(state);
    const result=[];
    const add = (id,label,moveId='',target='',boost=false)=>result.push({id,label,moveId,target,boost});
    for (const action of turn.actions.filter(item=>item.enabled)) {
        if(action.id==='select-move'){
            for(const move of rules.getLegalMoves(state)){
                const targets=resolveTargetDecision(move,rules.perspectiveState(state));
                for(const target of targets.kind==='choice'?targets.values:['']){
                    const label=move.name+(target?' / '+bodyLabel(target):'')+'  ['+move.staminaCost+' STA]';
                    add(action.id,label,move.id,target);
                    if(rules.attackBoostEligibility(state,move).available)
                        add(action.id,label+' + crowd d6',move.id,target,true);
                }
            }
        }else if(action.id==='react'){
            for(const move of rules.getAvailableReactions(state))add(action.id,'Counter / '+move.name,move.id);
        }else if(action.id==='hold-switch'){
            for(const move of rules.availableHoldTransitions(state))add(action.id,'Switch to '+moveName(move.id),move.id);
        }else add(action.id,action.label);
    }
    return result;
}

const aiActions = {
    move:'select-move',pin:'start-pin','skip-pin':'skip-pin','pin-defense':'pin-count',
    reaction:'react','pass-reaction':'pass-reaction','tighten-hold':'hold-squeeze',
    'switch-hold':'hold-switch','release-hold':'hold-release','escape-hold':'hold-escape',
    'scramble-ground':'ground-scramble','cover-ground':'ground-cover',
    stand:'scramble-up',recover:'crowd-recover',breath:'catch-breath'
};

function action(request){
    const previous = Object.fromEntries(Object.entries(state.wrestlers).map(([id,w])=>[id,w.posture]));
    if(request.id==='cpu'){
        const decision=chooseAiAction(state,{setup});
        if(!decision || !aiActions[decision.type])throw Error('No CPU turn is pending.');
        request={...decision,id:aiActions[decision.type],boost:decision.crowdSpend>0};
    }
    let actor=rules.getAvailableActions(state).actorId, motion=null, message='', result;
    switch(request.id){
    case 'neutral-roll':
        result=rules.resolveNeutralRoll(state,d20(),d20());
        message='Control dice  '+result.stoneRoll+' / '+result.viperRoll+(result.tie?'  ·  Tie':'  ·  '+who(result.winnerId)+' takes control');
        break;
    case 'select-move':{
        const move=rules.getLegalMoves(state).find(move=>move.id===request.moveId);
        if(!move)throw Error('Choose a legal move.');
        const boost=request.boost?1:0;
        result=rules.resolveMoveAttempt(state,{moveId:move.id,target:request.target||null,attackRoll:d20(),damageRoll:roll(move.damageDie),crowdSpend:boost,crowdRolls:boost?[roll(6)]:[]});
        if(result.success)motion=animationByMove[move.id].choreography;
        message=who(actor)+' · '+move.name+(move.automatic?'':('  ·  d20 '+result.attackRoll+'  ·  '+(result.success?'HIT':'MISS')));
        break;
    }
    case 'react':{
        const move=rules.getAvailableReactions(state).find(move=>move.id===request.moveId);
        if(!move)throw Error('Choose a legal counter.');
        result=rules.resolveReaction(state,{reactionMoveId:move.id,reactionRoll:d20(),damageRoll:roll(move.damageDie)});
        if(result.success)motion=animationByMove[move.id].choreography;
        message='Counter / '+move.name+'  ·  d20 '+result.reactionRoll+(result.success?'  ·  HIT':'  ·  MISS');
        break;
    }
    case 'pass-reaction': rules.declineReaction(state); message='Counter passed'; break;
    case 'start-pin':
        result=rules.startPin(state); actor=result.pinningId; motion='pin'; message=who(actor)+' hooks the leg'; break;
    case 'pin-count':
        result=rules.resolvePinCount(state,{pinningId:state.pinningWrestlerId,count:(state.pinCount||0)+1,pinningRoll:d20(),pinnedRoll:d20()});
        if(result.kickout){motion='kickout';actor=result.pinningId;}
        message='Count '+result.count+'  ·  '+result.pinningTotal+' vs '+result.pinnedTotal+(result.kickout?'  ·  KICKOUT':'');
        break;
    case 'skip-pin': rules.skipPin(state); message='Pin opportunity passed'; break;
    case 'hold-escape':
        result=rules.escapeHold(state,{escapeRoll:d20()});
        message='Escape roll '+result.escapeRoll+(result.success?'  ·  ESCAPED':'  ·  HOLD STAYS');
        break;
    case 'hold-squeeze': rules.maintainHold(state); message=who(actor)+' tightens the hold'; break;
    case 'hold-release': rules.releaseHold(state); message=who(actor)+' releases the hold'; break;
    case 'hold-switch': rules.transitionHold(state,{moveId:request.moveId}); message='Switch to '+moveName(request.moveId); break;
    case 'ground-scramble':
    case 'ground-cover':
    case 'ground-pass': {
        const choice=request.id.slice('ground-'.length);
        result=rules.resolveGroundDefense(state,{choice,roll:d20()});
        if(choice==='scramble')motion=result.success?'ground_scramble':'ground_scramble_fail';
        message=choice==='scramble'?'Scramble  ·  '+(result.success?'UP TO KNEES':'STILL DOWN'):choice==='cover'?'Cover up':'Stay down';
        break;
    }
    case 'scramble-up': rules.scrambleUp(state,actor); message=who(actor)+' gets up'; break;
    case 'crowd-recover': rules.spendCrowdForStamina(state,actor,1); message=who(actor)+' recovers stamina'; break;
    case 'catch-breath': rules.catchBreathToNeutral(state,actor); message=who(actor)+' catches their breath'; break;
    default: throw Error('Unknown match action.');
    }
    return { message, clip:animation(motion,actor??'stone',previous) };
}

const previews=Object.entries(animationByMove).map(([id,value])=>({id:value.choreography,label:moveName(id)}));
previews.find(item=>item.id==='shove_counter').label='Shove Counter';
previews.push({id:'pin',label:'Pin'},{id:'kickout',label:'Kickout'});
export function handle(request){
    let result;
    if(request.id==='start'){
        state=rules.cloneInitialState();
        setup=sanitizeMatchSetup({mode:request.mode,playerId:request.actor});
        shown=rest();
        result={message:'Contest for High control',clip:writeClip([{duration:0,pose:()=>shown}])};
    }else if(request.id==='preview'){
        if(!previews.some(item=>item.id===request.moveId))throw Error('Unknown preview.');
        const actor=request.actor==='viper'?'viper':'stone';
        result={message:previews.find(item=>item.id===request.moveId).label,clip:animation(request.moveId,actor,{},true)};
    }else if(request.id==='resume'){
        result={message:'Match resumed',clip:animation(null,'stone',{})};
    }else result=action(request);
    const turn=rules.getAvailableActions(state);
    return {...result,phase:turn.phase,actor:turn.actorId??'',winner:state.winnerId??'',
        stone:state.wrestlers.stone,viper:state.wrestlers.viper,actions:actions(),previews,
        cpu:turn.phase!=='NEUTRAL_ROLL' && isAiDecision(state,setup)};
}

