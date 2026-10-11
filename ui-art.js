import { samplePair } from './choreography.js?v=1.16.0';
import { animationByMove } from './combat-animation-map.js?v=1.16.0';
import { demoMoves, reactionMove } from './moves.js?v=1.16.0';
// Original vector artwork. No external assets or font requests.
const frame = (content, viewBox='0 0 120 90', label='') => `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${content}</svg>`;
export function portrait(id) {
  const stone=id==='stone';
  return frame(`<path fill="${stone?'#12548c':'#6f2d78'}" d="M0 0h120v140H0z"/><path fill="#10162e" opacity=".35" d="M0 116 120 22v118H0z"/><path fill="${stone?'#d89b6c':'#bb8066'}" stroke="#11182e" stroke-width="3" d="M6 140v-26l20-20 20-8V70h28v16l20 8 20 20v26z"/><path fill="${stone?'#dfad7c':'#ca9075'}" stroke="#26211e" stroke-width="3" d="m37 27 23-10 24 10 2 28-10 23-16 8-17-8-10-24z"/><path fill="${stone?'#e0bc61':'#211b22'}" d="m32 42 3-20 25-13 27 15 2 25-11-19-17-5-17 5-7 15z"/>${stone?'<path fill="#b33236" d="M33 31h54v9H33z"/><path fill="#ecd080" d="m43 63 17-7 17 7-4 8-13-5-13 5z"/>':'<path fill="#211b22" d="m76 18 11 9 7 52-17-12 4-29z"/><path stroke="#bd3c4b" stroke-width="3" d="m75 43-7 19"/>'}<path stroke="#10162e" stroke-width="3" d="M43 48h10m14 0h10M56 72h8"/><path fill="${stone?'#b33236':'#211b22'}" d="M17 106 31 94l14 28h30l14-28 15 12-7 34H24z"/><path fill="${stone?'#edd078':'#b73e50'}" d="m60 122 7 7-7 8-7-8z"/>`,'0 0 120 140',stone?'Stone, the powerhouse':'Viper, the daredevil');
}
// These thumbnails are sampled from the SAME articulated paired choreography
// as the in-ring 3D renderer. A move can no longer show a different canned pose
// in the action bar than the performer uses in the match.
export const MOVE_ART_TIMES=Object.freeze({
  'pick-up-opponent':.58,'pull-to-knees':.66,'snap-down':.57,
  'knee-lift':.49,'dropkick':.48,'ddt':.63,'neckbreaker':.6,
  'hip-toss':.57,'spinebuster':.57,'elbow-drop':.68,'stomp':.59,
  'knee-drop':.7,'leg-drop':.75,'armbar':.6,'ankle-lock':.56,
  'forearm-smash':.5,'running-clothesline':.56,'vertical-suplex':.55,
  'body-slam':.55,'dragon-screw':.58,'ground-headlock':.57,
  'flash-finisher':.55,'viper-bite':.61,'shove-counter':.49
});
const colorGroups={
  setup:{top:'#154b59',bottom:'#0d223f',bright:'#3ef4c2',accent:'#75dcff'},
  strike:{top:'#5b2350',bottom:'#161c43',bright:'#ff5d7a',accent:'#ffca69'},
  grapple:{top:'#32296d',bottom:'#171b40',bright:'#bd91ff',accent:'#57c7ff'},
  special:{top:'#8a4a24',bottom:'#292340',bright:'#ffd14c',accent:'#fc7583'},
  reaction:{top:'#582b53',bottom:'#211d48',bright:'#ff728c',accent:'#faac6d'}
};
const r2=n=>Number(n.toFixed(2));
function drawWrestler(pose,project,color,dark){
  const j=pose.j,p=key=>project(j[key]),pts=arr=>arr.map(key=>p(key).map(r2).join(',')).join(' ');
  const segments=[['pelvis','lk','la'],['pelvis','rk','ra'],['ls','le','lh'],['rs','re','rh']];
  const limbs=segments.map((seg,i)=>`<polyline points="${pts(seg)}" fill="none" stroke="#10172b" stroke-width="${i<2?9:8}" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${pts(seg)}" fill="none" stroke="${i<2?color:dark}" stroke-width="${i<2?5:4}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const [ls,rs,pel,chest,head]=['ls','rs','pelvis','chest','head'].map(p);
  const torso=`${r2(ls[0])},${r2(ls[1])} ${r2(rs[0])},${r2(rs[1])} ${r2(pel[0]+4)},${r2(pel[1])} ${r2(pel[0]-4)},${r2(pel[1])}`;
  return `<g data-wrestler="${pose.id}">
  ${limbs}
  <polygon points="${torso}" fill="${dark}" stroke="#10172b" stroke-width="3" stroke-linejoin="round"/>
  <path d="M${r2(chest[0])} ${r2(chest[1])} L${r2(pel[0])} ${r2(pel[1])}" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="${r2(head[0])}" cy="${r2(head[1])}" r="5.7" fill="${color}" stroke="#10172b" stroke-width="2.4"/>
  <path d="M${r2(head[0]-2)} ${r2(head[1]-1)} h4" stroke="#10172b" stroke-width="1.2"/>
  </g>`;
}
export function moveArt(id){
  const move=demoMoves.find(item=>item.id===id)||(reactionMove.id===id?reactionMove:null);
  const animation=animationByMove[id];
  if(!move||!animation)throw new Error('No documented wrestling pose for '+id);
  const poseTime=MOVE_ART_TIMES[id];
  if(typeof poseTime!=='number')throw new Error('No matching move artwork moment for '+id);
  const opponentStart=move.requirements?.defenderPostures?.[0]||'standing';
  const pair=samplePair(animation.choreography,poseTime,'stone',{viper:opponentStart});
  const projected=Object.values(pair).flatMap(wrestler=>Object.values(wrestler.j).map(v=>[v[0]+v[2]*.52, -v[1]+v[2]*.16]));
  const minX=Math.min(...projected.map(p=>p[0])),maxX=Math.max(...projected.map(p=>p[0]));
  const minY=Math.min(...projected.map(p=>p[1])),maxY=Math.max(...projected.map(p=>p[1]));
  const scale=Math.min(99/Math.max(.7,maxX-minX),72/Math.max(.7,maxY-minY));
  const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
  const project=([x,y,z])=>[60+(x+z*.52-centerX)*scale,47+(-y+z*.16-centerY)*scale];
  const category=move.category;
  const colors=colorGroups[category]||colorGroups.grapple;
  const grad='move-bg-'+id;
  const wrestlers=Object.values(pair).sort((a,b)=>a.j.pelvis[2]-b.j.pelvis[2]);
  const figures=wrestlers.map(p=>drawWrestler(p,project,p.id==='stone'?'#5feaff':'#ff697f',p.id==='stone'?'#2b84d3':'#bb355f')).join('');
  return frame(`<defs><linearGradient id="${grad}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${colors.top}"/><stop offset="100%" stop-color="${colors.bottom}"/>
  </linearGradient></defs>
  <g data-choreography="${animation.choreography}" data-pose-time="${poseTime}">
    <rect width="120" height="90" fill="url(#${grad})"/>
    <path d="M0 69 120 42V90H0Z" fill="#07162d" opacity=".46"/>
    <path d="M-5 16 124 -2M-5 29 124 11M-5 85 124 67" stroke="${colors.bright}" stroke-width="1" opacity=".24"/>
    <path d="M0 76h120M0 86h120" stroke="${colors.accent}" stroke-width="2" opacity=".35"/>
    ${figures}
    <path d="M101 17 111 10M105 25 119 21M99 10 101 2" stroke="${colors.accent}" stroke-width="3" stroke-linecap="round"/>
    <path d="M0 0h120v90H0z" fill="none" stroke="${colors.bright}" opacity=".27"/>
  </g>`);
}
export function damageDiagram(damage) {
  const parts=[['head',43,4,34,30],['core',34,39,52,55],['leftArm',9,42,18,66],['rightArm',93,42,18,66],['leftLeg',34,100,22,70],['rightLeg',64,100,22,70]];
  const colors=['#797967','#c5a74d','#c3783e','#bb3945'];
  return frame(parts.map(([key,x,y,w,h])=>{const n=damage[key]||0;return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${colors[Math.min(3,n)]}" stroke="#11182e" stroke-width="3"/><text x="${x+w/2}" y="${y+h/2+5}" text-anchor="middle" fill="#fff8e6" font-family="system-ui" font-weight="bold" font-size="14">${n}</text>`;}).join(''),'0 0 120 176','Body damage marks, from zero to three per region');
}
