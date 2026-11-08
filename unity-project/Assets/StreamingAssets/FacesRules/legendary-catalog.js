// Original rules define five styles, 8–10 style-based Legendary candidates,
// a four-Legendary loadout limit, and Mat Pass unlocks, but do not name moves.
// These names are proposals, NOT transcribed from the original mind map.
// Only finished, verified entries can be learned and used in a match.
export const WRESTLING_STYLES=Object.freeze(['Powerhouse','Showman','Daredevil','Mat Technician','Ironheart']);
export const MAX_LEGENDARY_MOVES=4;
export const MAX_MAT_PASSES=10;
export const LEGENDARY_CATALOG=Object.freeze({
  Powerhouse:Object.freeze([
    {id:'flash-finisher',name:'Flashpoint Driver',status:'playable',signatureFor:'stone'},
    {id:'avalanche-powerbomb',name:'Avalanche Powerbomb',status:'planned'},
    {id:'iron-spinebuster',name:'Iron Spinebuster',status:'planned'},
    {id:'thunder-slam',name:'Thunder Slam',status:'planned'},
    {id:'running-powerslam',name:'Running Powerslam',status:'planned'},
    {id:'mountain-drop',name:'Mountain Drop',status:'planned'},
    {id:'titan-bomb',name:'Titan Bomb',status:'planned'},
    {id:'crushing-lariat',name:'Crushing Lariat',status:'planned'}
  ]),
  Showman:Object.freeze([
    {id:'showstopper',name:'The Showstopper',status:'planned'},
    {id:'encore-elbow',name:'Encore Elbow Drop',status:'planned'},
    {id:'curtain-call',name:'Curtain Call',status:'planned'},
    {id:'spotlight-kick',name:'Spotlight Kick',status:'planned'},
    {id:'showboat-driver',name:'Showboat Driver',status:'planned'},
    {id:'final-bow',name:'Final Bow',status:'planned'},
    {id:'red-carpet-drop',name:'Red Carpet Drop',status:'planned'},
    {id:'headline-slam',name:'Headline Slam',status:'planned'}
  ]),
  Daredevil:Object.freeze([
    {id:'viper-bite',name:"Viper's Bite",status:'playable',signatureFor:'viper'},
    {id:'skyfall-senton',name:'Skyfall Senton',status:'planned'},
    {id:'shooting-star',name:'Shooting Star Press',status:'planned'},
    {id:'phoenix-splash',name:'Phoenix Splash',status:'planned'},
    {id:'corkscrew-drop',name:'Corkscrew Drop',status:'planned'},
    {id:'springboard-cutter',name:'Springboard Cutter',status:'planned'},
    {id:'flash-hurricanrana',name:'Flash Hurricanrana',status:'planned'},
    {id:'top-rope-diver',name:'Top-Rope Diver',status:'planned'}
  ]),
  'Mat Technician':Object.freeze([
    {id:'final-crossface',name:'Final Crossface',status:'planned'},
    {id:'master-armbar',name:'Master Armbar',status:'planned'},
    {id:'victory-bridge',name:'Victory Bridge',status:'planned'},
    {id:'leg-trap',name:'Leg Trap',status:'planned'},
    {id:'technical-fall',name:'Technical Fall',status:'planned'},
    {id:'dragon-lock',name:'Dragon Lock',status:'planned'},
    {id:'octopus-hold',name:'Octopus Hold',status:'planned'},
    {id:'ankle-capture',name:'Ankle Capture',status:'planned'}
  ]),
  Ironheart:Object.freeze([
    {id:'iron-will',name:'Iron Will Slam',status:'planned'},
    {id:'last-stand',name:'Last Stand',status:'planned'},
    {id:'unyielding-clutch',name:'Unyielding Clutch',status:'planned'},
    {id:'marathon-driver',name:'Marathon Driver',status:'planned'},
    {id:'fortress-bomb',name:'Fortress Bomb',status:'planned'},
    {id:'iron-grip',name:'Iron Grip',status:'planned'},
    {id:'second-wind',name:'Second Wind Driver',status:'planned'},
    {id:'heartbreaker',name:'Heartbreaker',status:'planned'}
  ])
});
export function getLegendaryCandidate(style,id){
  return LEGENDARY_CATALOG[style]?.find(move=>move.id===id)||null;
}
export function isLegendaryLearnable(style,id){
  return getLegendaryCandidate(style,id)?.status==='playable';
}
