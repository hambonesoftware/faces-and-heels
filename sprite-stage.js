const BASE = './assets/sprites/generated';

const ATLAS_DEFS = {
  stone: {
    idle: ['stone_idle.png', 4, 8],
    forearm: ['stone_forearm.png', 10, 16],
    forearm_hit: ['stone_forearm_hit.png', 10, 16],
    clothesline: ['stone_clothesline.png', 10, 16],
    clothesline_hit: ['stone_clothesline_hit.png', 10, 16],
    body_slam: ['stone_body_slam.png', 14, 16],
    body_slam_taken: ['stone_body_slam_taken.png', 14, 16],
    suplex: ['stone_suplex.png', 14, 16],
    suplex_taken: ['stone_suplex_taken.png', 14, 16],
    dragon_screw: ['stone_dragon_screw.png', 12, 15],
    dragon_screw_taken: ['stone_dragon_screw_taken.png', 12, 15],
    headlock: ['stone_headlock.png', 10, 12],
    headlock_taken: ['stone_headlock_taken.png', 10, 12],
    prone: ['stone_prone.png', 4, 8],
    pin: ['stone_pin.png', 6, 10],
    kickout: ['stone_kickout.png', 8, 14]
  },
  viper: {
    idle: ['viper_idle.png', 4, 8],
    forearm: ['viper_forearm.png', 10, 16],
    forearm_hit: ['viper_forearm_hit.png', 10, 16],
    clothesline: ['viper_clothesline.png', 10, 16],
    clothesline_hit: ['viper_clothesline_hit.png', 10, 16],
    body_slam: ['viper_body_slam.png', 14, 16],
    body_slam_taken: ['viper_body_slam_taken.png', 14, 16],
    suplex: ['viper_suplex.png', 14, 16],
    suplex_taken: ['viper_suplex_taken.png', 14, 16],
    dragon_screw: ['viper_dragon_screw.png', 12, 15],
    dragon_screw_taken: ['viper_dragon_screw_taken.png', 12, 15],
    headlock: ['viper_headlock.png', 10, 12],
    headlock_taken: ['viper_headlock_taken.png', 10, 12],
    prone: ['viper_prone.png', 4, 8],
    pin: ['viper_pin.png', 6, 10],
    kickout: ['viper_kickout.png', 8, 14]
  }
};

const FRAME_W = 320;
const FRAME_H = 400;

const DEFAULT_DISPLAY = {
  stone: { anim: 'idle', frame: 0, mirror: false, x: 0.34, y: 0.92, scale: 0.78, rotation: 0 },
  viper: { anim: 'idle', frame: 0, mirror: true, x: 0.66, y: 0.92, scale: 0.78, rotation: 0 }
};

const CHOREOGRAPHY = {
  forearm: {
    hitStopMs: 72,
    impactPoint: [0.53, 0.48],
    impactKind: 'strike',
    stone: [
      [0.00, .34, .92, .78, 0],
      [0.24, .38, .92, .79, 0],
      [0.50, .43, .92, .80, 0],
      [0.62, .44, .92, .80, 0],
      [0.78, .39, .92, .79, 0],
      [1.00, .34, .92, .78, 0]
    ],
    viper: [
      [0.00, .66, .92, .78, 0],
      [0.38, .59, .92, .78, 0],
      [0.52, .57, .92, .78, 0],
      [0.67, .61, .93, .78, 0],
      [0.82, .64, .92, .78, 0],
      [1.00, .66, .92, .78, 0]
    ]
  },
  suplex: {
    hitStopMs: 92,
    impactPoint: [0.54, 0.73],
    impactKind: 'slam',
    stone: [
      [0.00, .34, .92, .78, 0],
      [0.18, .42, .92, .79, 0],
      [0.34, .46, .93, .80, 0],
      [0.52, .47, .91, .80, 0],
      [0.68, .47, .92, .80, 0],
      [0.78, .45, .94, .80, 0],
      [0.90, .40, .93, .79, 0],
      [1.00, .35, .92, .78, 0]
    ],
    viper: [
      [0.00, .66, .92, .78, 0],
      [0.18, .57, .92, .78, 0],
      [0.34, .52, .91, .78, 0],
      [0.48, .50, .79, .80, 0],
      [0.58, .50, .70, .81, 0],
      [0.68, .51, .73, .81, 0],
      [0.76, .55, .91, .80, 0],
      [0.86, .60, .95, .79, 0],
      [1.00, .64, .95, .78, 0]
    ]
  },
  dragon_screw: {
    hitStopMs: 82,
    impactPoint: [0.56, 0.72],
    impactKind: 'slam',
    stone: [
      [0.00, .34, .92, .78, 0],
      [0.22, .42, .94, .79, 0],
      [0.40, .45, .95, .80, 0],
      [0.58, .46, .95, .80, 0],
      [0.72, .44, .96, .80, 0],
      [0.88, .39, .94, .79, 0],
      [1.00, .34, .92, .78, 0]
    ],
    viper: [
      [0.00, .66, .92, .78, 0],
      [0.22, .58, .92, .78, 0],
      [0.42, .55, .91, .79, 0],
      [0.58, .55, .93, .80, 0],
      [0.70, .57, .96, .80, 0],
      [0.84, .61, .96, .79, 0],
      [1.00, .64, .96, .78, 0]
    ]
  },
  clothesline: {
    hitStopMs: 84,
    impactPoint: [0.54, 0.49],
    impactKind: 'strike',
    stone: [
      [0.00, .34, .92, .78, 0],
      [0.24, .39, .92, .79, 0],
      [0.48, .45, .92, .80, 0],
      [0.62, .47, .92, .80, 0],
      [0.78, .42, .92, .79, 0],
      [1.00, .35, .92, .78, 0]
    ],
    viper: [
      [0.00, .66, .92, .78, 0],
      [0.36, .60, .92, .78, 0],
      [0.54, .57, .92, .78, 0],
      [0.70, .60, .95, .79, 0],
      [0.86, .63, .97, .79, 0],
      [1.00, .64, .97, .78, 0]
    ]
  },
  body_slam: {
    hitStopMs: 102,
    impactPoint: [0.54, 0.74],
    impactKind: 'slam',
    stone: [
      [0.00, .34, .92, .78, 0],
      [0.18, .42, .92, .79, 0],
      [0.34, .47, .93, .80, 0],
      [0.52, .48, .90, .81, 0],
      [0.68, .48, .91, .81, 0],
      [0.80, .46, .95, .80, 0],
      [0.92, .40, .94, .79, 0],
      [1.00, .35, .92, .78, 0]
    ],
    viper: [
      [0.00, .66, .92, .78, 0],
      [0.18, .58, .92, .78, 0],
      [0.34, .53, .90, .79, 0],
      [0.50, .51, .77, .80, 0],
      [0.66, .51, .75, .81, 0],
      [0.78, .55, .92, .80, 0],
      [0.90, .60, .96, .79, 0],
      [1.00, .64, .96, .78, 0]
    ]
  },
  headlock: {
    hitStopMs: 55,
    impactPoint: [0.54, 0.68],
    impactKind: 'grapple',
    stone: [
      [0.00, .34, .92, .78, 0],
      [0.22, .42, .94, .80, 0],
      [0.42, .46, .96, .81, 0],
      [0.62, .47, .96, .81, 0],
      [1.00, .47, .96, .81, 0]
    ],
    viper: [
      [0.00, .64, .96, .78, 0],
      [0.24, .58, .96, .79, 0],
      [0.45, .55, .96, .79, 0],
      [0.66, .55, .96, .79, 0],
      [1.00, .55, .96, .79, 0]
    ]
  },
  pin: {
    hitStopMs: 0,
    impactPoint: [0.54, 0.74],
    impactKind: 'grapple',
    stone: [[0, .46, .96, .80, 0], [1, .47, .96, .80, 0]],
    viper: [[0, .56, .96, .79, 0], [1, .56, .96, .79, 0]]
  },
  kickout: {
    hitStopMs: 65,
    impactPoint: [0.56, 0.68],
    impactKind: 'kickout',
    stone: [[0, .47, .96, .80, 0], [.55, .47, .96, .80, 0], [1, .42, .94, .79, 0]],
    viper: [[0, .56, .96, .79, 0], [.55, .56, .93, .80, 0], [1, .61, .92, .78, 0]]
  }
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sampleTrack(track, t) {
  if (!track?.length) return null;
  if (t <= track[0][0]) return track[0].slice(1);
  for (let i = 1; i < track.length; i++) {
    const prev = track[i - 1];
    const next = track[i];
    if (t <= next[0]) {
      const span = Math.max(0.0001, next[0] - prev[0]);
      const local = easeInOut((t - prev[0]) / span);
      return [
        lerp(prev[1], next[1], local),
        lerp(prev[2], next[2], local),
        lerp(prev[3], next[3], local),
        lerp(prev[4], next[4], local)
      ];
    }
  }
  return track[track.length - 1].slice(1);
}

function copyActor(source) {
  return { ...source };
}

const CONTACT_SOLVERS = {
  forearm: [
    { start: .44, end: .64, attacker: 'r_hand', defender: 'head', strength: .72, maxX: .026, maxY: .035 }
  ],
  clothesline: [
    { start: .42, end: .64, attacker: 'r_hand', defender: 'upper_chest', strength: .70, maxX: .028, maxY: .032 }
  ],
  suplex: [
    { start: .16, end: .38, attacker: 'hands_center', defender: 'upper_chest', strength: .48, maxX: .030, maxY: .040 },
    { start: .38, end: .73, attacker: 'hands_center', defender: 'waist', strength: .54, maxX: .032, maxY: .052 }
  ],
  body_slam: [
    { start: .18, end: .44, attacker: 'hands_center', defender: 'chest', strength: .50, maxX: .032, maxY: .044 },
    { start: .44, end: .73, attacker: 'hands_center', defender: 'waist', strength: .56, maxX: .035, maxY: .055 }
  ],
  dragon_screw: [
    { start: .27, end: .78, attacker: 'hands_center', defender: 'r_ankle', strength: .62, maxX: .034, maxY: .048 }
  ],
  headlock: [
    { start: .34, end: 1.0, attacker: 'r_hand', defender: 'head', strength: .46, maxX: .028, maxY: .038 },
    { start: .38, end: 1.0, attacker: 'l_hand', defender: 'r_shoulder', strength: .34, maxX: .022, maxY: .030 }
  ],
  pin: [
    { start: 0, end: 1, attacker: 'chest', defender: 'upper_chest', strength: .28, maxX: .018, maxY: .028 }
  ]
};

function contactEnvelope(t, start, end) {
  if (t <= start || t >= end) return 0;
  const span = Math.max(.0001, end - start);
  const local = (t - start) / span;
  const edge = .18;
  if (local < edge) return easeInOut(local / edge);
  if (local > 1 - edge) return easeInOut((1 - local) / edge);
  return 1;
}

export class SpriteStage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = new Map();
    this.meta = new Map();
    this.debugAnchors = new URLSearchParams(location.search).get('debugAnchors') === '1';
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.display = {
      stone: copyActor(DEFAULT_DISPLAY.stone),
      viper: copyActor(DEFAULT_DISPLAY.viper)
    };
    this.playback = null;
    this.impactPulse = 0;
    this.impactKind = 'strike';
    this.impactPoint = [0.52, 0.48];
    this.particles = [];
    this.lastTime = performance.now();
    this.active = true;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.loop = this.loop.bind(this);
  }

  async init() {
    const jobs = [];
    Object.entries(ATLAS_DEFS).forEach(([wrestler, defs]) => {
      Object.entries(defs).forEach(([anim, [file]]) => {
        const key = `${wrestler}:${anim}`;
        jobs.push(loadImage(`${BASE}/${file}`).then(image => this.images.set(key, image)));
      });
    });
    jobs.push(fetch(`${BASE}/manifest.json`).then(r => r.json()).then(manifest => {
      Object.entries(manifest.atlases || {}).forEach(([key, meta]) => this.meta.set(key, meta));
    }));
    await Promise.all(jobs);
    this.resize();
    requestAnimationFrame(this.loop);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const width = Math.round(rect.width * this.dpr);
    const height = Math.round(rect.height * this.dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  resetActorTransforms() {
    this.display.stone.x = DEFAULT_DISPLAY.stone.x;
    this.display.stone.y = DEFAULT_DISPLAY.stone.y;
    this.display.stone.scale = DEFAULT_DISPLAY.stone.scale;
    this.display.stone.rotation = 0;
    this.display.viper.x = DEFAULT_DISPLAY.viper.x;
    this.display.viper.y = DEFAULT_DISPLAY.viper.y;
    this.display.viper.scale = DEFAULT_DISPLAY.viper.scale;
    this.display.viper.rotation = 0;
  }

  setRestingState({ postures = {} } = {}) {
    if (this.playback) return;
    this.resetActorTransforms();
    for (const id of ['stone', 'viper']) {
      const prone = postures[id] === 'prone';
      this.display[id].anim = prone ? 'prone' : 'idle';
      this.display[id].frame = 0;
      if (prone) {
        this.display[id].x = id === 'stone' ? 0.38 : 0.62;
        this.display[id].y = 0.96;
      }
    }
  }

  pulseImpact(kind = 'strike', point = null) {
    this.impactPulse = 1;
    this.impactKind = kind;
    if (point) this.impactPoint = point;
    this.spawnParticles(kind, this.impactPoint);
  }

  spawnParticles(kind, point) {
    const count = kind === 'slam' ? 22 : kind === 'kickout' ? 16 : 12;
    const spread = kind === 'slam' ? 1.25 : 1;
    for (let i = 0; i < count; i++) {
      const angle = (-Math.PI * .85) + (Math.PI * .7) * (i / Math.max(1, count - 1));
      const speed = (28 + (i % 5) * 7) * spread;
      this.particles.push({
        x: point[0],
        y: point[1],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: kind === 'slam' ? 3.5 : 2.5,
        kind
      });
    }
  }

  applyChoreography(name, t, attackerId = 'stone') {
    const choreo = CHOREOGRAPHY[name];
    if (!choreo) return;
    const defenderId = attackerId === 'stone' ? 'viper' : 'stone';
    const attackerTrack = sampleTrack(choreo.stone, t);
    const defenderTrack = sampleTrack(choreo.viper, t);
    const orient = (sample) => {
      if (!sample) return null;
      if (attackerId === 'stone') return sample;
      return [1 - sample[0], sample[1], sample[2], -sample[3]];
    };
    const a = orient(attackerTrack);
    const d = orient(defenderTrack);
    if (a) [this.display[attackerId].x, this.display[attackerId].y, this.display[attackerId].scale, this.display[attackerId].rotation] = a;
    if (d) [this.display[defenderId].x, this.display[defenderId].y, this.display[defenderId].scale, this.display[defenderId].rotation] = d;
  }

  frameAnchor(wrestler, actor, anchorName) {
    const meta = this.meta.get(`${wrestler}:${actor.anim}`);
    const frame = Math.max(0, Math.min(actor.frame || 0, (meta?.anchors?.length || 1) - 1));
    return meta?.anchors?.[frame]?.[anchorName] || null;
  }

  anchorToNormalized(wrestler, actor, anchorName) {
    const anchor = this.frameAnchor(wrestler, actor, anchorName);
    if (!anchor) return null;
    const logicalW = this.canvas.width / this.dpr;
    const logicalH = this.canvas.height / this.dpr;
    if (!logicalW || !logicalH) return null;
    const scale = actor.scale * Math.min(logicalW / 900, logicalH / 460) * 1.58;
    const mirror = actor.mirror ? -1 : 1;
    const dx = (anchor[0] - FRAME_W / 2) * scale * mirror;
    const dy = (anchor[1] - FRAME_H) * scale;
    return [actor.x + dx / logicalW, actor.y + dy / logicalH];
  }

  solveContacts(name, t, attackerId = 'stone') {
    const rules = CONTACT_SOLVERS[name];
    if (!rules?.length || !this.meta.size) return;
    const defenderId = attackerId === 'stone' ? 'viper' : 'stone';
    let totalX = 0, totalY = 0, totalWeight = 0;
    for (const rule of rules) {
      const envelope = contactEnvelope(t, rule.start, rule.end);
      if (!envelope) continue;
      const a = this.anchorToNormalized(attackerId, this.display[attackerId], rule.attacker);
      const d = this.anchorToNormalized(defenderId, this.display[defenderId], rule.defender);
      if (!a || !d) continue;
      const dx = Math.max(-rule.maxX, Math.min(rule.maxX, a[0] - d[0]));
      const dy = Math.max(-rule.maxY, Math.min(rule.maxY, a[1] - d[1]));
      const weight = rule.strength * envelope;
      totalX += dx * weight; totalY += dy * weight; totalWeight += weight;
    }
    if (!totalWeight) return;
    const dx = totalX / totalWeight;
    const dy = totalY / totalWeight;
    this.display[attackerId].x -= dx * .16;
    this.display[attackerId].y -= dy * .10;
    this.display[defenderId].x += dx * .84;
    this.display[defenderId].y += dy * .90;
  }

  async playPair(attackerAnim, defenderAnim, options = {}) {
    const attackerId = options.attackerId || 'stone';
    const defenderId = attackerId === 'stone' ? 'viper' : 'stone';
    const aDef = ATLAS_DEFS[attackerId][attackerAnim];
    const dDef = ATLAS_DEFS[defenderId][defenderAnim];
    const frameCount = Math.max(aDef?.[1] || 1, dDef?.[1] || 1);
    const fps = options.fps || Math.max(aDef?.[2] || 12, dDef?.[2] || 12);
    const duration = options.duration || (frameCount / fps) * 1000;
    const impactFrame = Number.isInteger(options.impactFrame) ? options.impactFrame : null;
    const choreoName = options.choreography || null;
    const choreo = CHOREOGRAPHY[choreoName] || null;
    const hitStopMs = Number.isFinite(options.hitStopMs) ? options.hitStopMs : (choreo?.hitStopMs || 0);
    const impactKind = options.impactKind || choreo?.impactKind || 'strike';
    const impactPoint = options.impactPoint || choreo?.impactPoint || [0.52, 0.48];
    const start = performance.now();

    this.playback = {
      attackerAnim,
      defenderAnim,
      start,
      duration,
      frameCount,
      fps,
      impactFrame,
      impactFired: false,
      onImpact: options.onImpact,
      choreography: choreoName,
      hitStopMs,
      impactKind,
      impactPoint,
      attackerId,
      defenderId,
      freezeUntil: 0,
      freezeFrame: null,
      freezeApplied: false,
      resolve: null
    };

    this.applyChoreography(choreoName, 0, attackerId);

    return new Promise(resolve => {
      this.playback.resolve = resolve;
    });
  }

  playPin({ pinningId = 'stone' } = {}) {
    const pinnedId = pinningId === 'stone' ? 'viper' : 'stone';
    this.playback = null;
    this.display[pinningId].anim = 'pin';
    this.display[pinningId].frame = 5;
    this.display[pinnedId].anim = 'prone';
    this.display[pinnedId].frame = 0;
    this.applyChoreography('pin', 1, pinningId);
  }

  async playKickout({ pinnedId = 'viper', onImpact } = {}) {
    const pinningId = pinnedId === 'stone' ? 'viper' : 'stone';
    return this.playPair('pin', 'kickout', {
      attackerId: pinningId,
      choreography: 'kickout',
      impactFrame: 4,
      hitStopMs: 65,
      impactKind: 'kickout',
      onImpact
    });
  }

  resetPositions() {
    this.resetActorTransforms();
  }

  updateParticles(dt) {
    const logicalW = this.canvas.width / this.dpr;
    const logicalH = this.canvas.height / this.dpr;
    for (const p of this.particles) {
      p.x += (p.vx / Math.max(1, logicalW)) * (dt / 1000);
      p.y += (p.vy / Math.max(1, logicalH)) * (dt / 1000);
      p.vy += 70 * (dt / 1000);
      p.life -= dt / (p.kind === 'slam' ? 620 : 460);
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  update(now, dt) {
    if (this.impactPulse > 0) this.impactPulse = Math.max(0, this.impactPulse - dt / 250);
    this.updateParticles(dt);

    if (!this.playback) {
      const idleFrame = Math.floor(now / 170) % 4;
      if (this.display.stone.anim === 'idle') this.display.stone.frame = idleFrame;
      if (this.display.viper.anim === 'idle') this.display.viper.frame = (idleFrame + 2) % 4;
      return;
    }

    const p = this.playback;

    if (p.freezeUntil && now < p.freezeUntil) {
      if (Number.isInteger(p.freezeFrame)) {
        this.display[p.attackerId].frame = Math.min(p.freezeFrame, (ATLAS_DEFS[p.attackerId][p.attackerAnim]?.[1] || 1) - 1);
        this.display[p.defenderId].frame = Math.min(p.freezeFrame, (ATLAS_DEFS[p.defenderId][p.defenderAnim]?.[1] || 1) - 1);
      }
      return;
    }

    if (p.freezeUntil && !p.freezeApplied) {
      p.start += p.hitStopMs;
      p.freezeApplied = true;
    }

    const elapsed = now - p.start;
    const raw = clamp01(elapsed / p.duration);
    const frame = Math.min(p.frameCount - 1, Math.floor(Math.min(.9999, raw) * p.frameCount));

    this.display[p.attackerId].anim = p.attackerAnim;
    this.display[p.defenderId].anim = p.defenderAnim;
    this.display[p.attackerId].frame = Math.min(frame, (ATLAS_DEFS[p.attackerId][p.attackerAnim]?.[1] || 1) - 1);
    this.display[p.defenderId].frame = Math.min(frame, (ATLAS_DEFS[p.defenderId][p.defenderAnim]?.[1] || 1) - 1);
    this.applyChoreography(p.choreography, raw, p.attackerId);
    this.solveContacts(p.choreography, raw, p.attackerId);

    if (p.impactFrame !== null && !p.impactFired && frame >= p.impactFrame) {
      p.impactFired = true;
      p.freezeFrame = frame;
      if (p.hitStopMs > 0) p.freezeUntil = now + p.hitStopMs;
      this.pulseImpact(p.impactKind, p.impactPoint);
      p.onImpact?.();
      return;
    }

    if (elapsed >= p.duration) {
      const resolve = p.resolve;
      this.playback = null;
      resolve?.();
    }
  }

  drawActor(name, actor, cameraScale = 1) {
    const image = this.images.get(`${name}:${actor.anim}`) || this.images.get(`${name}:idle`);
    if (!image) return;

    const logicalW = this.canvas.width / this.dpr;
    const logicalH = this.canvas.height / this.dpr;
    const scale = actor.scale * Math.min(logicalW / 900, logicalH / 460) * 1.58 * cameraScale;
    const dw = FRAME_W * scale;
    const dh = FRAME_H * scale;
    const x = logicalW * actor.x;
    const y = logicalH * actor.y;
    const sx = actor.frame * FRAME_W;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate((actor.rotation || 0) * Math.PI / 180);
    if (actor.mirror) this.ctx.scale(-1, 1);
    this.ctx.drawImage(image, sx, 0, FRAME_W, FRAME_H, -dw / 2, -dh, dw, dh);
    this.ctx.restore();
  }

  drawDebugAnchors() {
    if (!this.debugAnchors) return;
    const colors = { stone: '#2DBBFF', viper: '#FF405F' };
    const names = ['head','neck','chest','waist','l_hand','r_hand','l_ankle','r_ankle'];
    this.ctx.save();
    this.ctx.font = '10px system-ui';
    for (const wrestler of ['stone','viper']) {
      const actor=this.display[wrestler];
      for (const name of names) {
        const pt=this.anchorToNormalized(wrestler,actor,name);
        if (!pt) continue;
        const x=(this.canvas.width/this.dpr)*pt[0], y=(this.canvas.height/this.dpr)*pt[1];
        this.ctx.fillStyle=colors[wrestler]; this.ctx.beginPath(); this.ctx.arc(x,y,3,0,Math.PI*2); this.ctx.fill();
        this.ctx.fillStyle='#fff'; this.ctx.fillText(name,x+5,y-4);
      }
    }
    this.ctx.restore();
  }

  drawImpact() {
    if (this.impactPulse <= 0) return;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const t = 1 - this.impactPulse;
    const eased = easeInOut(t);
    const cx = w * this.impactPoint[0];
    const cy = h * this.impactPoint[1];
    const slam = this.impactKind === 'slam';
    const kickout = this.impactKind === 'kickout';
    const radius = 18 + eased * (slam ? 128 : 88);
    this.ctx.save();

    // One-frame-style impact bloom. This is deliberately runtime VFX rather than baked into sprites.
    const glow = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * .9);
    glow.addColorStop(0, kickout ? `rgba(255,199,44,${.58*this.impactPulse})` : `rgba(255,255,255,${.72*this.impactPulse})`);
    glow.addColorStop(.18, slam ? `rgba(255,199,120,${.34*this.impactPulse})` : `rgba(91,214,255,${.24*this.impactPulse})`);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius*.9, 0, Math.PI*2);
    this.ctx.fill();

    this.ctx.globalAlpha = this.impactPulse * (slam ? .95 : .82);
    this.ctx.strokeStyle = kickout ? '#FFC72C' : '#FFFFFF';
    this.ctx.lineCap = 'round';
    const rays = slam ? 20 : 13;
    for (let i = 0; i < rays; i++) {
      const a = (Math.PI * 2 * i) / rays + (slam ? 0 : -.28);
      const inner = radius * (slam ? .30 : .42);
      const outer = radius * (.78 + (i%3)*.08);
      this.ctx.lineWidth = slam ? (i%2 ? 3 : 5) : (i%2 ? 2.5 : 4);
      this.ctx.beginPath();
      this.ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      this.ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      this.ctx.stroke();
    }

    // Heavy slams add a horizontal mat shock ring and dust line.
    if (slam) {
      this.ctx.globalAlpha = this.impactPulse * .60;
      this.ctx.strokeStyle = '#DDE8F1';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy + radius*.18, radius*.95, radius*.24, 0, 0, Math.PI*2);
      this.ctx.stroke();
    } else {
      // Directional strike streak sells speed without extra sprite frames.
      this.ctx.globalAlpha = this.impactPulse * .55;
      this.ctx.strokeStyle = '#FF6C83';
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(cx-radius*.90,cy+radius*.10);
      this.ctx.lineTo(cx-radius*.18,cy-radius*.08);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawParticles() {
    if (!this.particles.length) return;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.ctx.save();
    for (const p of this.particles) {
      this.ctx.globalAlpha = Math.max(0, p.life) * .7;
      this.ctx.fillStyle = p.kind === 'kickout' ? '#FFC72C' : '#D8E2EC';
      this.ctx.beginPath();
      this.ctx.arc(w * p.x, h * p.y, p.size * Math.max(.5, p.life), 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  loop(now) {
    if (!this.active) return;
    const dt = Math.min(50, now - this.lastTime);
    this.lastTime = now;
    this.update(now, dt);

    const logicalW = this.canvas.width / this.dpr;
    const logicalH = this.canvas.height / this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, logicalW, logicalH);

    const p = this.playback;
    const progress = p ? clamp01((now - p.start) / Math.max(1, p.duration)) : 0;
    const cameraScale = p ? 1 + Math.sin(progress * Math.PI) * (p.choreography === 'suplex' ? .085 : p.choreography === 'forearm' ? .045 : .035) : 1;

    // Contact moves look more convincing when the defender is drawn first and the attacker overlaps the hold.
    const attackerFront = p && ['dragon_screw', 'headlock'].includes(p.choreography);
    const defenderFront = p && ['suplex','body_slam'].includes(p.choreography) && progress > .34 && progress < .78;

    if (p && defenderFront) {
      this.drawActor(p.attackerId, this.display[p.attackerId], cameraScale);
      this.drawActor(p.defenderId, this.display[p.defenderId], cameraScale);
    } else if (p && attackerFront) {
      this.drawActor(p.defenderId, this.display[p.defenderId], cameraScale);
      this.drawActor(p.attackerId, this.display[p.attackerId], cameraScale);
    } else {
      this.drawActor('stone', this.display.stone, cameraScale);
      this.drawActor('viper', this.display.viper, cameraScale);
    }

    this.drawDebugAnchors();
    this.drawParticles();
    this.drawImpact();
    requestAnimationFrame(this.loop);
  }
}
