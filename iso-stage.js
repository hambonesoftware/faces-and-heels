const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const lerpPt=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),z:mix(a.z,b.z,t)});

const COLORS={
  stone:{skin:'#d99a72',skinDark:'#a86348',skinLight:'#f2bb8c',gear:'#c42435',gear2:'#f0c33e',boot:'#c51e31',hair:'#e3b33e',rim:'#48cfff'},
  viper:{skin:'#c98966',skinDark:'#8f513e',skinLight:'#e4a67f',gear:'#17191f',gear2:'#c92a43',boot:'#15171c',hair:'#17171b',rim:'#ff5573'}
};

function baseSkeleton(id){
  const broad=id==='stone'?1.12:.98;
  return {
    pelvis:{x:0,y:0,z:1.25}, waist:{x:0,y:0,z:1.75}, chest:{x:0,y:0,z:2.45}, neck:{x:0,y:0,z:2.95}, head:{x:0,y:0,z:3.38},
    lShoulder:{x:-.62*broad,y:0,z:2.65}, rShoulder:{x:.62*broad,y:0,z:2.65},
    lElbow:{x:-.88*broad,y:.03,z:2.10}, rElbow:{x:.88*broad,y:.03,z:2.10},
    lHand:{x:-.86*broad,y:.04,z:1.55}, rHand:{x:.86*broad,y:.04,z:1.55},
    lHip:{x:-.34,y:0,z:1.25}, rHip:{x:.34,y:0,z:1.25},
    lKnee:{x:-.38,y:.03,z:.67}, rKnee:{x:.38,y:.03,z:.67},
    lAnkle:{x:-.39,y:.05,z:.13}, rAnkle:{x:.39,y:.05,z:.13},
    lToe:{x:-.39,y:-.18,z:.04}, rToe:{x:.39,y:-.18,z:.04}
  };
}

function cloneSkel(s){const o={};for(const [k,p] of Object.entries(s))o[k]={...p};return o;}
function blendSkel(a,b,t){const o={};for(const k of Object.keys(a))o[k]=lerpPt(a[k],b[k],t);return o;}
function pose(id,name,t,role){
  const s=baseSkeleton(id); const p=cloneSkel(s); const dir=role==='attacker'?1:-1;
  const A=(k,x=0,y=0,z=0)=>{p[k].x+=x;p[k].y+=y;p[k].z+=z};
  if(name==='idle'){
    const bob=Math.sin(t*Math.PI*2)*.025; for(const q of Object.values(p))q.z+=bob;
    A('lHand',0,.02,.04); A('rHand',0,.02,-.02);
  }
  if(name==='forearm'){
    if(role==='attacker'){
      const q=ease(clamp(t/.55)); const rec=ease(clamp((t-.55)/.45));
      p.rElbow={x:mix(.82,.38,q),y:mix(.02,-.22,q),z:mix(2.15,2.58,q)};
      p.rHand={x:mix(.83,-.10,q),y:mix(.03,-.36,q),z:mix(1.6,2.72,q)};
      p.chest.x-=.12*q; p.head.x-=.08*q; p.waist.x-=.05*q;
      if(rec>0) return blendSkel(p,s,rec);
    }else{
      const hit=ease(clamp((t-.48)/.22)); const rec=ease(clamp((t-.75)/.25));
      p.head.x-=.22*hit; p.head.z-=.10*hit; p.chest.x-=.12*hit; p.rShoulder.x-=.09*hit;
      if(rec>0)return blendSkel(p,s,rec);
    }
  }
  if(name==='clothesline'){
    if(role==='attacker'){
      const q=ease(clamp(t/.6)); p.rShoulder.x=.50; p.rElbow={x:1.08,y:-.18,z:2.55}; p.rHand={x:1.28,y:-.22,z:2.48};
      p.chest.x-=.16*q; p.lHand.z+=.2*q;
    }else{
      const q=ease(clamp((t-.42)/.5)); p.head.x-=.35*q;p.chest.x-=.46*q;p.waist.x-=.30*q; p.lKnee.z-=.33*q;p.rKnee.z-=.28*q;
    }
  }
  if(name==='headlock'){
    if(role==='attacker'){
      p.rShoulder={x:.42,y:-.05,z:2.56};p.rElbow={x:.10,y:-.25,z:2.38};p.rHand={x:-.10,y:-.28,z:2.08};
      p.lHand={x:.18,y:-.32,z:2.05}; p.chest.x-=.12;
    } else {p.head.x=.08;p.head.z-=.24;p.chest.x=.15;p.lHand={x:-.12,y:-.25,z:1.9};p.rHand={x:.3,y:-.22,z:1.86};}
  }
  if(name==='lockup'){
    if(role==='attacker'){
      p.rHand={x:.37,y:-.30,z:2.62};p.lHand={x:.14,y:-.35,z:2.38};p.rElbow={x:.52,y:-.17,z:2.45};p.lElbow={x:-.2,y:-.20,z:2.23};p.chest.x-=.08;
    } else {p.lHand={x:-.36,y:-.30,z:2.62};p.rHand={x:-.14,y:-.35,z:2.38};p.lElbow={x:-.52,y:-.17,z:2.45};p.rElbow={x:.2,y:-.20,z:2.23};p.chest.x+=.08;}
  }
  if(name==='suplex'){
    if(role==='attacker'){
      const lift=ease(clamp((t-.16)/.42)); const slam=ease(clamp((t-.62)/.30));
      p.rHand={x:.20,y:-.26,z:mix(2.15,2.86,lift)}; p.lHand={x:-.18,y:-.28,z:mix(2.08,2.72,lift)};
      p.rElbow={x:.45,y:-.10,z:mix(2.28,2.78,lift)};p.lElbow={x:-.42,y:-.12,z:mix(2.20,2.67,lift)};
      p.chest.z-=.12*slam;p.head.z-=.12*slam;
    } else {
      const lift=ease(clamp((t-.15)/.42)); const slam=ease(clamp((t-.58)/.36));
      for(const k of Object.keys(p)){p[k].z+=2.25*lift-2.2*slam; p[k].x*=mix(1,.78,lift);}
      if(lift>.15){const ang=Math.PI*mix(0,.94,lift)*(1-slam*.18); const pivot={...p.pelvis}; for(const k of Object.keys(p)){const dx=p[k].x-pivot.x,dz=p[k].z-pivot.z;p[k].x=pivot.x+dx*Math.cos(ang)-dz*Math.sin(ang);p[k].z=pivot.z+dx*Math.sin(ang)+dz*Math.cos(ang);}}
      if(slam>.55){for(const k of Object.keys(p))p[k].z=Math.max(.10,p[k].z-(slam-.55)*1.4);}
    }
  }
  if(name==='body_slam'){
    if(role==='attacker'){const q=ease(clamp((t-.12)/.5));p.rHand={x:.28,y:-.25,z:mix(1.75,2.42,q)};p.lHand={x:-.25,y:-.23,z:mix(2.1,2.55,q)};}
    else{const q=ease(clamp((t-.2)/.45));const fall=ease(clamp((t-.65)/.3));for(const k of Object.keys(p)){p[k].z+=1.25*q-1.2*fall;p[k].x+=.18*q;}p.head.x+=.4*q;p.lKnee.z+=.25*q;}
  }
  if(name==='dragon_screw'){
    if(role==='attacker'){p.rHand={x:.52,y:-.28,z:.72};p.lHand={x:.23,y:-.27,z:.76};p.chest.z-=.32;}
    else{const q=ease(clamp((t-.3)/.55));p.rAnkle.z+=.55*q;p.rKnee.z+=.26*q;p.chest.x-=.55*q;p.head.x-=.65*q;p.waist.z-=.45*q;}
  }
  if(name==='prone' || name==='pin' || name==='kickout'){
    const q=name==='kickout'?Math.sin(clamp(t)*Math.PI):0;
    const flat=baseSkeleton(id); for(const k of Object.keys(flat)){p[k]={x:flat[k].x*1.12,y:flat[k].z*.20,z:.16+Math.abs(flat[k].x)*.04};}
    p.head.z=.28;p.chest.z=.22+q*.28;p.waist.z=.18+q*.18;p.lShoulder.z=.20+q*.2;p.rShoulder.z=.20+q*.2;
    if(name==='pin'&&role==='attacker'){for(const k of Object.keys(p)){p[k].z+=.42;p[k].x*=.82;}p.chest.z=.72;p.head.z=.88;p.lHand.z=.28;p.rHand.z=.28;}
  }
  return p;
}

export class IsoStage{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.dpr=Math.min(2,devicePixelRatio||1);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.active=true;this.lastTime=performance.now();this.playback=null;this.postures={stone:'standing',viper:'standing'};this.impactPulse=0;this.impactKind='strike';this.particles=[];this.camera={zoom:1,up:0};this.loop=this.loop.bind(this);}
  async init(){this.resize();requestAnimationFrame(this.loop);}
  resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);}
  setRestingState({postures={}}={}){if(this.playback)return;this.postures={...this.postures,...postures};}
  resetPositions(){}
  pulseImpact(kind='strike'){this.impactPulse=1;this.impactKind=kind;const n=kind==='slam'?18:10;for(let i=0;i<n;i++)this.particles.push({a:(Math.PI*2*i/n),r:0,life:1});}
  async playPair(attackerAnim,defenderAnim,options={}){const attackerId=options.attackerId||'stone';const defenderId=attackerId==='stone'?'viper':'stone';const name=options.choreography||attackerAnim;const duration=options.duration||({suplex:1250,body_slam:1150,dragon_screw:1050,headlock:950,clothesline:900,forearm:760,lockup:1100}[name]||900);this.playback={name,start:performance.now(),duration,attackerId,defenderId,impactAt:(options.impactFrame??5)/10,impactFired:false,onImpact:options.onImpact,hitStopMs:options.hitStopMs||0,freezeUntil:0,resolve:null};return new Promise(res=>this.playback.resolve=res);}
  playPin({pinningId='stone'}={}){this.playback={name:'pin',start:performance.now(),duration:1e9,attackerId:pinningId,defenderId:pinningId==='stone'?'viper':'stone',impactAt:2,impactFired:true,resolve:null};}
  playKickout({pinnedId='viper',onImpact}={}){const pinningId=pinnedId==='stone'?'viper':'stone';return this.playPair('pin','kickout',{attackerId:pinningId,choreography:'kickout',duration:800,impactFrame:4,onImpact,hitStopMs:50});}
  project(pt,root,modelRot=0){const w=this.canvas.width/this.dpr,h=this.canvas.height/this.dpr;const scale=Math.min(w/9,h/5.2)*this.camera.zoom;let x=pt.x,y=pt.y,z=pt.z;const c=Math.cos(modelRot),s=Math.sin(modelRot);const rx=x*c-y*s,ry=x*s+y*c;x=rx;y=ry;const wx=root.x+x,wy=root.y+y;return {x:w*.5+(wx+wy*.54)*scale,y:h*.80+(wy*.28-z)*scale-this.camera.up*scale,depth:wy+z*.02};}
  actorState(id,t,name,role){let root={x:id==='stone'?-1.38:1.38,y:id==='stone'?.12:-.06,z:0},rot=id==='stone'?0:Math.PI;
    const approach=['forearm','clothesline','headlock','lockup','suplex','body_slam','dragon_screw'].includes(name);if(approach){const q=ease(clamp(t/.28));root.x=mix(root.x,id==='stone'?-0.42:0.42,q);}
    if(name==='suplex'&&role==='defender')root.x+=id==='stone'?.10:-.10;
    if(name==='body_slam'&&role==='defender')root.x+=id==='stone'?.16:-.16;
    if(name==='dragon_screw'&&role==='defender')root.x+=id==='stone'?.22:-.22;
    if(name==='prone'||(this.postures[id]==='prone'&&!this.playback))root.x=id==='stone'?-0.65:.65;
    const poseName=this.playback?name:(this.postures[id]==='prone'?'prone':'idle');return {root,rot,skel:pose(id,poseName,t,role)};
  }
  drawShadow(actor,alpha=1){const p=this.project({x:0,y:0,z:.02},actor.root,actor.rot);const ctx=this.ctx;ctx.save();ctx.globalAlpha=.30*alpha;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(p.x,p.y,42*this.camera.zoom,11*this.camera.zoom,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  limb(a,b,width,color,hi){const ctx=this.ctx;ctx.save();ctx.lineCap='round';ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle=hi;ctx.globalAlpha=.33;ctx.lineWidth=Math.max(2,width*.22);ctx.beginPath();ctx.moveTo(a.x-width*.12,a.y-width*.08);ctx.lineTo(b.x-width*.12,b.y-width*.08);ctx.stroke();ctx.restore();}
  drawActor(id,actor,alpha=1){const C=COLORS[id],ctx=this.ctx;const P={};for(const [k,v] of Object.entries(actor.skel))P[k]=this.project(v,actor.root,actor.rot);this.drawShadow(actor,alpha);ctx.save();ctx.globalAlpha=alpha;
    const legW=id==='stone'?25:22,armW=id==='stone'?24:20;
    // far limbs first
    this.limb(P.rHip,P.rKnee,legW,C.skinDark,C.rim);this.limb(P.rKnee,P.rAnkle,legW*.88,C.skin,C.skinLight);this.limb(P.rShoulder,P.rElbow,armW,C.skinDark,C.rim);this.limb(P.rElbow,P.rHand,armW*.88,C.skin,C.skinLight);
    // boots
    this.limb(P.rAnkle,P.rToe,legW*.95,C.boot,C.gear2);this.limb(P.lAnkle,P.lToe,legW*.95,C.boot,C.gear2);
    // torso polygon
    ctx.beginPath();ctx.moveTo(P.lShoulder.x,P.lShoulder.y);ctx.lineTo(P.rShoulder.x,P.rShoulder.y);ctx.lineTo(P.rHip.x,P.rHip.y);ctx.lineTo(P.lHip.x,P.lHip.y);ctx.closePath();const g=ctx.createLinearGradient(P.lShoulder.x,P.lShoulder.y,P.rHip.x,P.rHip.y);g.addColorStop(0,C.skinLight);g.addColorStop(.45,C.skin);g.addColorStop(1,C.skinDark);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#301b18aa';ctx.lineWidth=2;ctx.stroke();
    // trunks
    ctx.beginPath();ctx.moveTo(P.lHip.x,P.lHip.y-6);ctx.lineTo(P.rHip.x,P.rHip.y-6);ctx.lineTo(P.rHip.x,P.rHip.y+15);ctx.lineTo(P.lHip.x,P.lHip.y+15);ctx.closePath();ctx.fillStyle=C.gear;ctx.fill();ctx.strokeStyle=C.gear2;ctx.lineWidth=2;ctx.stroke();
    // near limbs
    this.limb(P.lHip,P.lKnee,legW,C.skin,C.skinLight);this.limb(P.lKnee,P.lAnkle,legW*.9,C.skin,C.skinLight);this.limb(P.lShoulder,P.lElbow,armW,C.skin,C.skinLight);this.limb(P.lElbow,P.lHand,armW*.9,C.skin,C.skinLight);
    // fists
    for(const h of [P.lHand,P.rHand]){ctx.fillStyle=C.skin;ctx.strokeStyle=C.skinDark;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(h.x,h.y,armW*.47,armW*.40,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
    // head
    ctx.fillStyle=C.skin;ctx.strokeStyle=C.skinDark;ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(P.head.x,P.head.y,18*(id==='stone'?1.08:.95),22,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    // hair / identity
    ctx.fillStyle=C.hair;if(id==='stone'){ctx.beginPath();ctx.ellipse(P.head.x,P.head.y-16,20,8,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle=C.gear;ctx.fillRect(P.head.x-19,P.head.y-15,38,5);ctx.fillStyle=C.gear2;ctx.fillRect(P.head.x+7,P.head.y-15,7,5);ctx.fillStyle=C.hair;ctx.fillRect(P.head.x-20,P.head.y-9,5,20);ctx.fillRect(P.head.x+15,P.head.y-9,5,20);}else{ctx.beginPath();ctx.moveTo(P.head.x-4,P.head.y-20);ctx.lineTo(P.head.x+3,P.head.y-36);ctx.lineTo(P.head.x+8,P.head.y-18);ctx.fill();ctx.strokeStyle=C.gear2;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(P.head.x+2,P.head.y-3);ctx.lineTo(P.head.x+10,P.head.y+5);ctx.stroke();}
    // chest identity accents
    ctx.strokeStyle=C.rim;ctx.globalAlpha=.32;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(P.lShoulder.x,P.lShoulder.y);ctx.lineTo(P.chest.x,P.chest.y);ctx.stroke();
    ctx.restore();
  }
  drawImpact(){if(this.impactPulse<=0)return;const w=this.canvas.width/this.dpr,h=this.canvas.height/this.dpr,ctx=this.ctx,r=(1-this.impactPulse)*100+18;ctx.save();ctx.globalAlpha=this.impactPulse*.8;ctx.strokeStyle=this.impactKind==='slam'?'#FFC72C':'#fff';ctx.lineWidth=this.impactKind==='slam'?5:3;ctx.beginPath();ctx.ellipse(w*.5,h*.57,r,r*.28,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  update(now,dt){if(this.impactPulse>0)this.impactPulse=Math.max(0,this.impactPulse-dt/260);for(const p of this.particles){p.r+=dt*.10;p.life-=dt/520;}this.particles=this.particles.filter(p=>p.life>0);if(!this.playback){this.camera.zoom=mix(this.camera.zoom,1,0.08);this.camera.up=mix(this.camera.up,0,0.08);return;}const p=this.playback;if(p.freezeUntil&&now<p.freezeUntil)return;const t=clamp((now-p.start)/p.duration);const preset={suplex:[1.11,.44],body_slam:[1.08,.16],headlock:[1.10,.04],lockup:[1.10,.04],pin:[1.14,-.18],kickout:[1.14,-.18],forearm:[1.055,.04],clothesline:[1.06,.03],dragon_screw:[1.08,-.02]}[p.name]||[1.04,0];this.camera.zoom=mix(this.camera.zoom,preset[0],.10);this.camera.up=mix(this.camera.up,preset[1]*(p.name==='suplex'?Math.sin(t*Math.PI):1),.10);if(!p.impactFired&&t>=p.impactAt){p.impactFired=true;this.pulseImpact(['suplex','body_slam','dragon_screw'].includes(p.name)?'slam':'strike');p.onImpact?.();if(p.hitStopMs)p.freezeUntil=now+p.hitStopMs;}if(t>=1&&p.duration<1e8){const r=p.resolve;this.playback=null;r?.();}}
  drawParticles(){const ctx=this.ctx,w=this.canvas.width/this.dpr,h=this.canvas.height/this.dpr;ctx.save();for(const p of this.particles){ctx.globalAlpha=p.life*.5;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(w*.5+Math.cos(p.a)*p.r,h*.58+Math.sin(p.a)*p.r*.35,2.2,0,Math.PI*2);ctx.fill();}ctx.restore();}
  loop(now){if(!this.active)return;const dt=Math.min(50,now-this.lastTime);this.lastTime=now;this.update(now,dt);const w=this.canvas.width/this.dpr,h=this.canvas.height/this.dpr;const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,w,h);let t=.5+Math.sin(now/650)*.02,name='idle',aId='stone',dId='viper';if(this.playback){t=clamp((now-this.playback.start)/this.playback.duration);name=this.playback.name;aId=this.playback.attackerId;dId=this.playback.defenderId;}const A=this.actorState(aId,t,name,'attacker'),D=this.actorState(dId,t,name,'defender');const order=[{id:aId,a:A},{id:dId,a:D}].sort((u,v)=>u.a.root.y-v.a.root.y);for(const item of order)this.drawActor(item.id,item.a);this.drawParticles();this.drawImpact();requestAnimationFrame(this.loop);}
}
