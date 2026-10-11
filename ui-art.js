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
function figure(p, color) {
  const [hx,hy,cx,cy,lx,ly,rx,ry,fx,fy,gx,gy]=p;
  return `<g stroke="#24201d" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><path d="M${lx} ${ly} ${cx} ${cy} ${rx} ${ry}M${fx} ${fy} ${cx} ${cy+12} ${gx} ${gy}"/></g><g stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M${lx} ${ly} ${cx} ${cy} ${rx} ${ry}M${fx} ${fy} ${cx} ${cy+12} ${gx} ${gy}"/></g><path stroke="#24201d" stroke-width="3" fill="${color}" d="m${cx-9} ${cy-5} 18 0-3 20h-12z"/><circle cx="${hx}" cy="${hy}" r="8" fill="${color}" stroke="#24201d" stroke-width="3"/>`;
}
export function moveArt(id) {
  const p=poses[id]||poses['body-slam'];
  return frame(`<path fill="#e6ddc8" d="M0 0h120v90H0z"/><path fill="#c9bfa9" d="m0 90 120-72v72z"/><path stroke="#8b7e67" opacity=".45" d="M0 70h120M0 78h120"/>${figure(p[1],'#ac4d52')}${figure(p[0],'#d2a64d')}<path stroke="#fff5d6" stroke-width="3" d="m102 18 8-6m-7 17 10-1m-14-3 2-10"/>`);
}
export function damageDiagram(damage) {
  const parts=[['head',43,4,34,30],['core',34,39,52,55],['leftArm',9,42,18,66],['rightArm',93,42,18,66],['leftLeg',34,100,22,70],['rightLeg',64,100,22,70]];
  const colors=['#797967','#c5a74d','#c3783e','#bb3945'];
  return frame(parts.map(([key,x,y,w,h])=>{const n=damage[key]||0;return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${colors[Math.min(3,n)]}" stroke="#262421" stroke-width="3"/><text x="${x+w/2}" y="${y+h/2+5}" text-anchor="middle" fill="#fff8e6" font-family="system-ui" font-weight="bold" font-size="14">${n}</text>`;}).join(''),'0 0 120 176','Body damage marks, from zero to three per region');
}
