// Original vector artwork. No external assets or font requests.
const frame = (content, viewBox='0 0 120 90', label='') => `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${content}</svg>`;
export function portrait(id) {
  const stone=id==='stone';
  return frame(`<path fill="${stone?'#ba8a3b':'#803541'}" d="M0 0h120v140H0z"/><path fill="#171615" opacity=".35" d="M0 116 120 22v118H0z"/><path fill="${stone?'#d89b6c':'#bb8066'}" stroke="#26211e" stroke-width="3" d="M6 140v-26l20-20 20-8V70h28v16l20 8 20 20v26z"/><path fill="${stone?'#dfad7c':'#ca9075'}" stroke="#26211e" stroke-width="3" d="m37 27 23-10 24 10 2 28-10 23-16 8-17-8-10-24z"/><path fill="${stone?'#e0bc61':'#211b22'}" d="m32 42 3-20 25-13 27 15 2 25-11-19-17-5-17 5-7 15z"/>${stone?'<path fill="#b33236" d="M33 31h54v9H33z"/><path fill="#ecd080" d="m43 63 17-7 17 7-4 8-13-5-13 5z"/>':'<path fill="#211b22" d="m76 18 11 9 7 52-17-12 4-29z"/><path stroke="#bd3c4b" stroke-width="3" d="m75 43-7 19"/>'}<path stroke="#2b2422" stroke-width="3" d="M43 48h10m14 0h10M56 72h8"/><path fill="${stone?'#b33236':'#211b22'}" d="M17 106 31 94l14 28h30l14-28 15 12-7 34H24z"/><path fill="${stone?'#edd078':'#b73e50'}" d="m60 122 7 7-7 8-7-8z"/>`,'0 0 120 140',stone?'Stone, the powerhouse':'Viper, the daredevil');
}
const poses = {
  'forearm-smash': [[30,30,31,45,14,58,51,38,22,76,41,76],[80,31,78,48,59,42,94,59,69,77,89,77]],
  'running-clothesline': [[26,28,34,46,14,46,78,37,15,76,53,73],[87,42,78,58,62,44,98,69,64,77,96,80]],
  'vertical-suplex': [[48,32,47,49,25,42,72,23,31,80,61,80],[73,70,69,53,86,43,54,40,63,10,83,11]],
  'body-slam': [[41,31,40,48,21,57,70,50,28,81,53,81],[90,46,73,43,65,60,88,62,57,23,58,38]],
  'dragon-screw': [[31,36,32,53,16,66,70,59,23,81,44,81],[87,31,85,48,66,40,103,60,64,64,95,78]],
  'ground-headlock': [[46,37,43,51,22,68,79,51,33,78,63,78],[86,56,72,66,54,60,89,78,41,72,49,81]],
  'flash-finisher': [[48,30,48,48,27,43,74,29,32,80,64,80],[76,66,68,49,85,40,53,35,65,8,87,13]]
};

Object.assign(poses,{
  'pick-up-opponent':[[34,22,40,46,62,52,44,58,31,79,54,79],[77,48,77,65,60,70,93,71,64,82,91,82]],
  'pull-to-knees':[[32,23,39,43,61,49,48,53,30,79,52,79],[78,48,77,65,63,67,90,64,71,80,87,80]],
  'snap-down':[[31,21,39,42,68,53,51,56,28,80,56,80],[79,52,73,65,59,63,91,72,63,81,90,81]],
  'knee-lift':[[28,21,41,43,21,58,54,56,40,70,66,43],[81,41,79,56,65,60,91,63,72,81,89,80]],
  'dropkick':[[22,47,40,49,17,40,49,35,78,36,79,49],[92,49,84,65,64,60,104,75,65,79,100,82]],
  'ddt':[[27,55,39,65,62,52,56,64,25,81,57,82],[71,67,69,72,56,60,91,73,59,81,87,82]],
  'neckbreaker':[[28,56,40,65,59,51,48,64,23,80,59,82],[70,60,70,70,59,62,90,73,57,82,92,83]],
  'hip-toss':[[38,23,39,47,69,47,48,61,30,81,55,82],[82,40,75,48,50,40,96,53,66,23,95,27]],
  'spinebuster':[[30,34,38,48,58,38,67,52,26,80,54,82],[83,57,69,61,54,51,93,64,60,25,93,26]],
  'elbow-drop':[[39,45,42,56,70,61,25,46,25,79,57,78],[82,70,69,72,55,65,92,77,62,82,91,82]],
  'stomp':[[35,23,37,48,19,61,57,62,32,79,75,69],[85,73,73,74,54,64,97,77,63,82,96,82]],
  'knee-drop':[[30,37,40,52,22,62,53,63,31,79,79,64],[86,72,72,73,54,66,94,77,65,82,92,82]],
  'leg-drop':[[31,57,40,64,18,54,59,56,62,75,81,69],[87,73,73,72,55,63,96,75,64,82,92,82]],
  'armbar':[[31,56,42,67,71,61,51,70,27,80,61,82],[89,68,74,73,55,59,99,76,62,81,93,81]],
  'ankle-lock':[[33,24,42,45,72,66,58,66,28,80,53,80],[82,67,74,71,59,65,94,76,57,83,95,82]]
});
const colorGroups={
  setup:{top:'#154b59',bottom:'#0d223f',bright:'#3ef4c2',accent:'#75dcff'},
  strike:{top:'#5b2350',bottom:'#161c43',bright:'#ff5d7a',accent:'#ffca69'},
  grapple:{top:'#32296d',bottom:'#171b40',bright:'#bd91ff',accent:'#57c7ff'},
  special:{top:'#8a4a24',bottom:'#292340',bright:'#ffd14c',accent:'#fc7583'}
};
const moveCategory=id=>{
  if(['pick-up-opponent','pull-to-knees','snap-down'].includes(id))return 'setup';
  if(['forearm-smash','running-clothesline','knee-lift','dropkick','elbow-drop','stomp','knee-drop','leg-drop'].includes(id))return 'strike';
  if(id==='flash-finisher')return 'special';
  return 'grapple';
};

function figure(p,color){
  const [hx,hy,cx,cy,lx,ly,rx,ry,fx,fy,gx,gy]=p;
  return `<g stroke="#10152b" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".96"><path d="M${lx} ${ly} ${cx} ${cy} ${rx} ${ry} M${fx} ${fy} ${cx} ${cy+10} ${gx} ${gy}"/></g>
  <g stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M${lx} ${ly} ${cx} ${cy} ${rx} ${ry} M${fx} ${fy} ${cx} ${cy+10} ${gx} ${gy}"/></g>
  <path fill="${color}" stroke="#10152b" stroke-width="2.5" d="m${cx-9} ${cy-6} 18 0-3 19h-12z"/>
  <circle cx="${hx}" cy="${hy}" r="8" fill="${color}" stroke="#10152b" stroke-width="3"/>
  <path d="M${hx-4} ${hy-1}h7" stroke="#10152b" stroke-width="1.5" opacity=".8"/>`;
}
export function moveArt(id) {
  const p=poses[id]||poses['forearm-smash'], colors=colorGroups[moveCategory(id)];
  const grad='move-bg-'+id;
  return frame(`<defs>
    <linearGradient id="${grad}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors.top}"/>
      <stop offset="100%" stop-color="${colors.bottom}"/>
    </linearGradient>
  </defs>
  <rect width="120" height="90" fill="url(#${grad})"/>
  <path d="M0 74 120 25V90H0Z" fill="#10233b" opacity=".55"/>
  <path d="M0 16 120 4M0 26 120 14M0 89 120 77" stroke="${colors.bright}" stroke-width="1.2" opacity=".25"/>
  <path d="M0 78h120M0 84h120" stroke="${colors.accent}" stroke-width="2" opacity=".46"/>
  <path d="M-4 40h27M97 51h28" stroke="${colors.accent}" stroke-width="4" opacity=".35"/>
  <path d="M11 7 19 7M23 7h15" stroke="${colors.bright}" stroke-width="2.5" opacity=".8"/>
  ${figure(p[1],'#fc5d79')}
  ${figure(p[0],'#4cdeef')}
  <path d="M103 22 111 16M105 28 118 26M102 15 102 8" stroke="${colors.accent}" stroke-width="3" stroke-linecap="round"/>
  <path d="M0 0h120v90H0z" fill="none" stroke="${colors.bright}" stroke-width="1" opacity=".2"/>`);
}
export function damageDiagram(damage) {
  const parts=[['head',43,4,34,30],['core',34,39,52,55],['leftArm',9,42,18,66],['rightArm',93,42,18,66],['leftLeg',34,100,22,70],['rightLeg',64,100,22,70]];
  const colors=['#797967','#c5a74d','#c3783e','#bb3945'];
  return frame(parts.map(([key,x,y,w,h])=>{const n=damage[key]||0;return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${colors[Math.min(3,n)]}" stroke="#262421" stroke-width="3"/><text x="${x+w/2}" y="${y+h/2+5}" text-anchor="middle" fill="#fff8e6" font-family="system-ui" font-weight="bold" font-size="14">${n}</text>`;}).join(''),'0 0 120 176','Body damage marks, from zero to three per region');
}
