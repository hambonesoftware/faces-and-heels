import {IsoStage} from './iso-stage.js?v=1.15.0';
import {MOVE_TIMING} from './choreography.js?v=1.15.0';
const stage=new IsoStage(document.querySelector('canvas'));
const get=id=>document.getElementById(id),move=get('move'),attacker=get('attacker'),view=get('view'),timeline=get('timeline'),play=get('play'),speed=get('speed'),camera=get('camera');
const defs={knee_lift:['idle','idle',14],dropkick:['idle','idle',14],ddt:['idle','idle',14],neckbreaker:['idle','idle',14],hip_toss:['idle','idle',14],spinebuster:['idle','idle',14],elbow_drop:['idle','idle',14],stomp:['idle','idle',14],knee_drop:['idle','idle',14],leg_drop:['idle','idle',14],armbar:['idle','idle',14],ankle_lock:['idle','idle',14],shove_counter:['idle','idle',14],pick_up:['idle','idle',14],pull_to_knees:['idle','idle',12],snap_down:['idle','idle',12],idle:['idle','idle',4],lockup:['idle','idle',4],forearm:['forearm','forearm_hit',10],suplex:['suplex','suplex_taken',14],clothesline:['clothesline','clothesline_hit',10],body_slam:['body_slam','body_slam_taken',14],dragon_screw:['dragon_screw','dragon_screw_taken',12],headlock:['headlock','headlock_taken',10],pin:['pin','prone',4],kickout:['pin','kickout',6],finisher:['suplex','suplex_taken',14]};
let playing=false,progress=0,last=0;
function pose(t){
 const name=move.value,who=attacker.value,other=who==='stone'?'viper':'stone';stage.mode=Object.hasOwn(MOVE_TIMING,name)&&!['lockup','forearm','suplex','clothesline','body_slam','dragon_screw','headlock','pin','kickout'].includes(name)?'iso':view.value;stage.cameraAngle=Number(camera.value);stage.preview={name:name==='idle'?null:name,t,attacker:who};
 const [a,d,n]=defs[name];stage.display[who].anim=a;stage.display[other].anim=d;stage.display[who].frame=stage.display[other].frame=Math.min(n-1,Math.floor(t*n));stage.resetActorTransforms();stage.applyChoreography(name==='finisher'?'suplex':name,t,who);stage.solveContacts(name==='finisher'?'suplex':name,t,who);
 timeline.value=Math.round(t*1000);get('position').value=Math.round(t*100)+'%';
 const phases=name==='pick_up'?[[.22,'Close on grounded rival'],[.42,'Secure neck and shoulder'],[.64,'Lift to knees'],[.86,'Pull to standing'],[1.01,'Release into controlled standing']]:name==='pull_to_knees'?[[.25,'Reach for neck and shoulder'],[.52,'Bring torso off the mat'],[.78,'Set knees beneath opponent'],[1.01,'Hold kneeling position']]:name==='snap_down'?[[.25,'Secure upper-body grip'],[.5,'Pull forward and downward'],[.77,'Controlled mat contact'],[1.01,'Release and reset']]:['suplex','finisher'].includes(name)?[[.18,'Step in'],[.3,'Grip and lower hips'],[.49,'Lift together'],[.62,'Balanced hold'],[.82,'Rotate and release'],[1.01,'Back bump and settle']]:name==='body_slam'?[[.2,'Step in'],[.34,'Scoop and load'],[.5,'Lift together'],[.61,'Supported carry'],[.8,'Release and fall'],[1.01,'Landing and recovery']]:[[.25,'Set up'],[.48,'Commit'],[.65,'Contact and response'],[1.01,'Follow-through']];
 get('status').textContent=move.selectedOptions[0].textContent+' · '+phases.find(([end])=>t<end)[1]+(t===1?' · Replay to watch again':'')+(stage.mode==='iso'&&view.value!=='iso'?' · Procedural 3D used: no exact sprite atlas':'');
}
function stop(){playing=false;play.textContent='PLAY';}
for(const input of [move,attacker])input.addEventListener('input',()=>{stop();progress=0;pose(progress);});
for(const input of [view,camera])input.addEventListener('input',()=>pose(progress));
timeline.addEventListener('input',()=>{stop();progress=Number(timeline.value)/1000;pose(progress);});
play.addEventListener('click',()=>{if(playing){stop();return}if(progress>=1)progress=0;playing=true;last=performance.now();play.textContent='PAUSE';});
get('restart').addEventListener('click',()=>{progress=0;playing=true;last=performance.now();play.textContent='PAUSE';pose(0);});
for(const [id,delta] of [['previous',-.01],['next',.01]])get(id).addEventListener('click',()=>{stop();progress=Math.max(0,Math.min(1,progress+delta));pose(progress);});
function tick(now){if(playing){progress=Math.min(1,progress+(now-last)*Number(speed.value)/(MOVE_TIMING[move.value]?.duration||2000));pose(progress);if(progress===1)stop();}last=now;requestAnimationFrame(tick);}
await stage.init();pose(0);requestAnimationFrame(tick);
