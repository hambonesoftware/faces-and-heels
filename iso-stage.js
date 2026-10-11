import { MeshRenderer } from './mesh-renderer.js?v=1.9.0';
import { drawBlockModel } from './block-model.js?v=1.9.0';
import { samplePair, blendPairs, MOVE_TIMING, transformJoint } from './choreography.js?v=1.9.0';
import { SpriteStage } from './sprite-stage.js?v=1.9.0';

// The original procedural pipeline's tapered solids, faceted lighting and
// identity palette, implemented as runtime meshes. No network artwork/library.
const add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>mul(a,1/(Math.hypot(...a)||1));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
const RIGHT=[.8,0,-.6], UP=[-.342,.821,-.456], VIEW=[.493,.571,.657];
const LIGHT=unit([-.5,1,.7]);
const palettes={stone:{skin:'#de8b4c',hair:'#f7c33e',gear:'#d0182d',trim:'#ffc11b',boot:'#ffc11b'},viper:{skin:'#c87955',hair:'#18151a',gear:'#161a22',trim:'#d1263d',boot:'#171b22'}};
function shade(hex,k){let n=parseInt(hex.slice(1),16);return `rgb(${[n>>16,(n>>8)&255,n&255].map(v=>Math.round(Math.min(255,v*k))).join(',')})`}
export { samplePair } from './choreography.js?v=1.9.0';
export class IsoStage extends SpriteStage {
  constructor(canvas){super(canvas);this.meshRenderer=new MeshRenderer();this.mode='iso';this.postures={};this.pinId=null;this.preview=null;this.compareCanvas=document.createElement('canvas');this.spriteView=new SpriteStage(this.compareCanvas);this.spriteView.resizeObserver.disconnect();this.spriteView.active=false;}
  setRestingState(options={}){super.setRestingState(options);if(!this.playback){this.transition=this.lastPair?{from:this.lastPair,start:performance.now(),duration:750}:null;this.postures=options.postures||{};this.pinId=null;}}
  playPair(a,d,o={}){
    this.pinId=null;const name=o.moveId==='flash-finisher'?'finisher':o.choreography,timing=MOVE_TIMING[name];
    const options={...o};this.entryPair=this.lastPair;this.transition=null;
    if(this.mode!=='sprite'&&timing){options.duration=this.fast?timing.duration*.55:timing.duration;if(timing.impact!==undefined&&Number.isInteger(o.impactFrame)){const counts={forearm:10,clothesline:10,suplex:14,finisher:14,body_slam:14,dragon_screw:12,headlock:10,kickout:8};options.impactFrame=Math.floor(timing.impact*(counts[name]||10));}}
    if(this.mode!=='sprite'&&timing?.impact!==undefined)options.impactProgress=timing.impact;
    const promise=super.playPair(a,d,options);this.playback.isoName=name;return promise;
  }
  playPin(o={}){super.playPin(o);this.pinId=o.pinningId||'stone';this.transition=this.lastPair?{from:this.lastPair,start:performance.now(),duration:650}:null;}
  playLockup(attackerId='stone'){return this.playPair('idle','idle',{attackerId,choreography:'lockup',duration:1100});}
  cameraPoint(p){const a=this.cameraAngle||0;return [p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];}
  project(p){p=this.cameraPoint(p);return [this.ox+dot(p,RIGHT)*this.scale,this.oy-dot(p,UP)*this.scale,dot(p,VIEW)];}
  face(points,color){let normal=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));if(dot(this.cameraPoint(normal),VIEW)<0)return;let projected=points.map(p=>this.project(p));this.faces.push({p:projected,z:projected.reduce((s,p)=>s+p[2],0)/projected.length,color:shade(color,.56+Math.max(0,dot(normal,LIGHT))*.52)});}
  solid(center,size,color,transformFn=p=>p){let [w,h,d]=size.map(v=>v/2),v=[[-w,-h,-d],[w,-h,-d],[w,h,-d],[-w,h,-d],[-w,-h,d],[w,-h,d],[w,h,d],[-w,h,d]].map(p=>transformFn(add(p,center)));for(let ix of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[1,2,6,5],[0,4,7,3]])this.face(ix.map(i=>v[i]),color);}
  ellipsoid(center,size,color,fn=p=>p){let v=[];const rings=6,n=10;for(let r=0;r<=rings;r++){let phi=Math.PI*r/rings;for(let i=0;i<n;i++){let th=2*Math.PI*i/n;v.push(fn(add(center,[size[0]*Math.sin(phi)*Math.cos(th),size[1]*Math.cos(phi),size[2]*Math.sin(phi)*Math.sin(th)])));}}for(let r=0;r<rings;r++)for(let i=0;i<n;i++)this.face([v[r*n+i],v[r*n+(i+1)%n],v[(r+1)*n+(i+1)%n],v[(r+1)*n+i]],color);}
  limb(a,b,r1,r2,color){let axis=unit(sub(b,a)),x=unit(cross(axis,Math.abs(axis[2])>.9?[1,0,0]:[0,0,1])),z=unit(cross(x,axis)),n=10,v=[];for(let [c,r] of [[a,r1],[b,r2]])for(let i=0;i<n;i++){let t=i*2*Math.PI/n;v.push(add(c,add(mul(x,Math.cos(t)*r),mul(z,Math.sin(t)*r*.88))));}for(let i=0;i<n;i++)this.face([v[n+i],v[n+(i+1)%n],v[(i+1)%n],v[i]],color);this.ellipsoid(a,[r1,r1,r1*.9],color);this.ellipsoid(b,[r2,r2,r2*.9],color);}
  model(a){drawBlockModel(this,a);}
  ring(){this.solid([0,-.38,0],[8,.75,5.4],'#302a21');this.solid([0,-.03,0],[8,.09,5.4],'#d7cdb6');this.faces.forEach(f=>f.z=-100);
    for(let x of [-4,4])for(let z of [-2.7,2.7]){
      this.solid([x,1.04,z],[.19,2.2,.19],x<0?'#d8b768':'#c65461');
      for(let y of [.75,1.35,1.95])this.solid([x,y,z],[.36,.25,.36],'#302a21');
    }
    for(let y of [.75,1.35,1.95]){
      for(let z of [-2.7,2.7])this.limb([-4,y,z],[4,y,z],.027,.027,'#e7ddc5');
      for(let x of [-4,4])this.limb([x,y,-2.7],[x,y,2.7],.027,.027,'#e7ddc5');
    }
  }
  paintIso(width,height,now){let ctx=this.ctx;this.scale=Math.min(width/10.8,height/9.8);this.ox=width*.5;this.oy=height*.66;this.faces=[];this.ring();
    let p=this.playback,t=p?clamp((now-p.start)/p.duration):0;
    if(p?.freezeUntil&&now<p.freezeUntil)t=p.freezeProgress??(p.freezeFrame+.1)/p.frameCount;
    let name=p?.isoName||p?.choreography,attacker=p?.attackerId||'stone';
    if(this.pinId){name='pin';attacker=this.pinId;t=1;}
    if(this.preview){({name,t,attacker='stone'}=this.preview);}
    let pair=samplePair(name,t,attacker,this.postures,this.reducedMotion?0:now);
    if(!this.preview){
      if(p&&this.entryPair&&t<.14)pair=blendPairs(this.entryPair,pair,ease(t/.14));
      else if(!p&&this.transition){const u=clamp((now-this.transition.start)/this.transition.duration);pair=blendPairs(this.transition.from,pair,ease(u));if(u===1)this.transition=null;}
      this.lastPair=pair;
    }
    for(let a of Object.values(pair)){
      const shadow=[];const prone=Math.abs(Math.sin(a.roll))>.6;for(let i=0;i<24;i++){const theta=i/24*Math.PI*2;shadow.push(this.project([a.root[0]+Math.cos(theta)*(prone?1.7:.65),.06,a.root[2]+Math.sin(theta)*.42]));}this.faces.push({p:shadow,z:-99,color:'rgba(25,44,57,.27)'});this.model(a);
    }
    const mesh=this.meshRenderer.paint(this.faces,width,height,this.dpr);if(mesh){ctx.drawImage(mesh,0,0,width,height);}else{this.faces.sort((a,b)=>a.z-b.z);for(let face of this.faces){ctx.beginPath();face.p.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=face.color;ctx.fill();}}
    ctx.font=`italic 900 ${Math.max(9,this.scale*.28)}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#897c62';const logo=this.project([0,.08,2]);ctx.fillText('FACES & HEELS',logo[0],logo[1]);
    if(this.impactPulse>0&&!this.reducedFlash){const defender=pair[attacker==='stone'?'viper':'stone'],slam=['suplex','finisher','body_slam','dragon_screw'].includes(name);let point=this.project(slam?[defender.j.chest[0],.12,defender.j.chest[2]]:defender.j.head);ctx.strokeStyle=`rgba(255,235,170,${this.impactPulse})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(point[0],point[1],this.scale*(1-this.impactPulse)*1.7+8,this.scale*(slam?.3:.8)*(1-this.impactPulse)+5,0,0,Math.PI*2);ctx.stroke();}
    ctx.textAlign='left';ctx.fillStyle='#b5cddd';ctx.font='700 10px system-ui';
  }
  paintComparison(w,h){let c=this.compareCanvas,v=this.spriteView;c.width=Math.round(w*this.dpr);c.height=Math.round(h*this.dpr);v.dpr=this.dpr;v.images=this.images;v.display=this.display;v.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    v.ctx.fillStyle='#091727';v.ctx.fillRect(0,0,w,h);v.ctx.fillStyle='#9dacba';v.ctx.beginPath();v.ctx.moveTo(w*.12,h*.68);v.ctx.lineTo(w*.88,h*.68);v.ctx.lineTo(w*.98,h*.96);v.ctx.lineTo(w*.02,h*.96);v.ctx.fill();
    v.drawActor('stone',v.display.stone);v.drawActor('viper',v.display.viper);v.ctx.fillStyle='#b5cddd';v.ctx.font='700 10px system-ui';v.ctx.fillText('ORIGINAL SPRITES · SAME MATCH',14,h-14);
    this.ctx.drawImage(c,w,0,w,h);this.ctx.strokeStyle='#2a4558';this.ctx.beginPath();this.ctx.moveTo(w,0);this.ctx.lineTo(w,h);this.ctx.stroke();
  }
  loop(now){if(!this.active)return;if(this.mode==='sprite'){super.loop(now);return;}
    let dt=Math.min(50,now-this.lastTime);this.lastTime=now;const completed=this.playback;this.update(now,dt);
    if(completed&&!this.playback){this.lastPair=samplePair(completed.isoName||completed.choreography,1,completed.attackerId);this.transition={from:this.lastPair,start:now,duration:750};}
    let w=this.canvas.width/this.dpr,h=this.canvas.height/this.dpr;
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.ctx.clearRect(0,0,w,h);let width=this.mode==='compare'?w/2:w;
    this.ctx.save();this.ctx.beginPath();this.ctx.rect(0,0,width,h);this.ctx.clip();this.paintIso(width,h,now);this.ctx.restore();if(this.mode==='compare')this.paintComparison(width,h);requestAnimationFrame(this.loop);
  }
}

