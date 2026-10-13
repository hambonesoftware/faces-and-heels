export const BODY_THRESHOLDS = {
  head: 4,
  core: 7,
  leftArm: 5,
  rightArm: 5,
  leftWrist: 4,
  rightWrist: 4,
  leftLeg: 6,
  rightLeg: 6,
  leftAnkle: 5,
  rightAnkle: 5
};

// v1.12 endurance balance: every successful move drains more opponent stamina than its own cost.
// Setup actions represent resistance and exertion, but never grant body marks or pins.
// v1.3 digital-playtest character sheets.
// Raw Main Stats intentionally total to each wrestler's starting Stamina, matching the source rules.
// The exact "Stat MOD 5" wording in the source remains unresolved; v1.3 uses the provisional
// modifier function implemented in match-engine.js and records that choice in the bundled spec.
export const wrestlerDefinitions = {
  stone: {
    id: 'stone',
    name: 'STONE',
    attitude: 'face',
    style: 'Powerhouse',
    commonMoves:['irish-whip','rebound-clothesline','corner-whip','corner-splash','forearm-smash','running-clothesline','knee-lift','body-slam','vertical-suplex','spinebuster','elbow-drop','stomp','ground-headlock','standing-wristlock','standing-headlock'],
    legendaryMoves:['flash-finisher'],
    crowdResourceName: 'POP',
    stats: {
      Power: 16,
      Promo: 11,
      Agility: 12,
      Acrobatics: 10,
      Fortitude: 15
    },
    maxStamina: 64,
    bodyThresholds: { ...BODY_THRESHOLDS }
  },
  viper: {
    id: 'viper',
    name: 'VIPER',
    attitude: 'heel',
    style: 'Daredevil',
    commonMoves:['forearm-smash','dropkick','neckbreaker','hip-toss','dragon-screw','ddt','leg-drop','knee-drop','armbar','ankle-lock','standing-wristlock','standing-headlock'],
    legendaryMoves:['viper-bite'],
    crowdResourceName: 'HEAT',
    stats: {
      Power: 14,
      Promo: 10,
      Agility: 16,
      Acrobatics: 10,
      Fortitude: 15
    },
    maxStamina: 65,
    bodyThresholds: { ...BODY_THRESHOLDS }
  }
};

export const demoMoves = [
  {
    id:'irish-whip',name:'Irish Whip to Ropes',category:'setup',stat:'Power',
    staminaCost:3,staminaDamage:4,damageDie:4,crowdGain:0,automatic:true,
    description:'Send your standing opponent into the ropes and set up the rebound.',
    requirements:{attackerPostures:['standing'],defenderPostures:['standing']},
    targeting:{mode:'none',bodyParts:[]},result:{defenderPosture:'standing'}
  },
  {
    id:'rebound-clothesline',name:'Rebound Clothesline',category:'strike',stat:'Power',
    staminaCost:5,staminaDamage:9,damageDie:8,crowdGain:1,
    description:'Catch a rival bouncing off the ropes with a timed clothesline.',
    requirements:{attackerPostures:['standing'],defenderPostures:['standing']},
    targeting:{mode:'fixed',bodyParts:['head']},result:{defenderPosture:'prone'}
  },
  {
    id:'corner-whip',name:'Whip into Turnbuckle',category:'setup',stat:'Power',
    staminaCost:3,staminaDamage:4,damageDie:4,crowdGain:0,automatic:true,
    description:'Drive your rival into the turnbuckle for a corner attack.',
    requirements:{attackerPostures:['standing'],defenderPostures:['standing']},
    targeting:{mode:'none',bodyParts:[]},result:{defenderPosture:'standing'}
  },
  {
    id:'corner-splash',name:'Turnbuckle Splash',category:'strike',stat:'Power',
    staminaCost:6,staminaDamage:10,damageDie:8,crowdGain:0,
    description:'Charge into a trapped opponent in the corner.',
    requirements:{attackerPostures:['standing'],defenderPostures:['standing']},
    targeting:{mode:'fixed',bodyParts:['core']},result:{defenderPosture:'prone'}
  },
  {
    id:'standing-wristlock',name:'Standing Wristlock',category:'grapple',stat:'Agility',
    staminaCost:4,staminaDamage:6,damageDie:6,crowdGain:0,
    description:'Trap the wrist while standing. Defender may escape or reverse control; holder can switch to a headlock.',
    requirements:{attackerPostures:['standing'],defenderPostures:['standing']},
    targeting:{mode:'fixed',bodyParts:['leftWrist']},
    sustained:{tickCost:2,tickDamage:3,escapeCost:2,holdStat:'Agility'},
    result:{attackerPosture:'standing',defenderPosture:'standing'}
  },
  {
    id:'standing-headlock',name:'Standing Side Headlock',category:'grapple',stat:'Power',
    staminaCost:5,staminaDamage:7,damageDie:8,crowdGain:0,
    description:'Lock the head from standing. The opponent may fight free or reverse; holder can switch to wrist control.',
    requirements:{attackerPostures:['standing'],defenderPostures:['standing']},
    targeting:{mode:'fixed',bodyParts:['head']},
    sustained:{tickCost:2,tickDamage:4,escapeCost:2,holdStat:'Power'},
    result:{attackerPosture:'standing',defenderPosture:'standing'}
  },
  {
    id: 'collar-elbow-tie-up',
    name: 'Collar-and-Elbow Tie-Up',
    category: 'setup',
    stat: 'Power',
    staminaCost: 2,
    staminaDamage: 3,
    damageDie: 4,
    crowdGain: 0,
    description: 'Lock up in the center of the ring. The next standing grapple gains +2 control; a missed follow-up opens a counter.',
    requirements: { attackerPostures: ['standing'], defenderPostures: ['standing'] },
    targeting: { mode: 'none', bodyParts: [] },
    result: { attackerPosture: 'standing', defenderPosture: 'standing' },
    automatic: true
  },
  {
    "id": "pick-up-opponent",
    "name": "Pick Up Opponent",
    "category": "setup",
    "stat": "Power",
    "staminaCost": 2,
    "staminaDamage": 3,
    "damageDie": 4,
    "crowdGain": 0,
    "description": "Pull a downed rival to their feet while maintaining High control.",
    "requirements": {
      "attackerPostures": [
        "standing",
        "kneeling"
      ],
      "defenderPostures": [
        "prone"
      ]
    },
    "targeting": {
      "mode": "none",
      "bodyParts": []
    },
    "result": {
      "attackerPosture": "standing",
      "defenderPosture": "standing"
    },
    "automatic": true
  },
  {
    "id": "pull-to-knees",
    "name": "Pull to Knees",
    "category": "setup",
    "stat": "Power",
    "staminaCost": 1,
    "staminaDamage": 2,
    "damageDie": 4,
    "crowdGain": 0,
    "description": "Haul the opponent upright to a kneeling position.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "prone"
      ]
    },
    "targeting": {
      "mode": "none",
      "bodyParts": []
    },
    "result": {
      "defenderPosture": "kneeling"
    },
    "automatic": true
  },
  {
    "id": "snap-down",
    "name": "Snap Down",
    "category": "setup",
    "stat": "Power",
    "staminaCost": 2,
    "staminaDamage": 3,
    "damageDie": 4,
    "crowdGain": 0,
    "description": "Pull the opponent down onto the canvas without releasing control.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "standing",
        "kneeling"
      ]
    },
    "targeting": {
      "mode": "none",
      "bodyParts": []
    },
    "result": {
      "defenderPosture": "prone"
    },
    "automatic": true
  },
  {
    "id": "knee-lift",
    "name": "Knee Lift",
    "category": "strike",
    "stat": "Power",
    "staminaCost": 4,
    "staminaDamage": 6,
    "damageDie": 8,
    "crowdGain": 0,
    "description": "Drive a knee up and leave the opponent kneeling.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "standing",
        "kneeling"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "head"
      ]
    },
    "result": {
      "defenderPosture": "kneeling"
    }
  },
  {
    "id": "dropkick",
    "name": "Dropkick",
    "category": "strike",
    "stat": "Acrobatics",
    "staminaCost": 5,
    "staminaDamage": 7,
    "damageDie": 8,
    "crowdGain": 0,
    "description": "Launch both boots into the opponent\u0027s upper body and knock them flat.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "standing"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "core"
      ]
    },
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "ddt",
    "name": "DDT",
    "category": "grapple",
    "stat": "Power",
    "staminaCost": 6,
    "staminaDamage": 9,
    "damageDie": 10,
    "crowdGain": 0,
    "description": "Hook the head and plant the opponent into the mat.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "standing",
        "kneeling"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "head"
      ]
    },
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "neckbreaker",
    "name": "Neckbreaker",
    "category": "grapple",
    "stat": "Agility",
    "staminaCost": 5,
    "staminaDamage": 8,
    "damageDie": 8,
    "crowdGain": 0,
    "description": "Twist the neck and drive the opponent down.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "standing"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "head"
      ]
    },
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "hip-toss",
    "name": "Hip Toss",
    "category": "grapple",
    "stat": "Agility",
    "staminaCost": 4,
    "staminaDamage": 7,
    "damageDie": 8,
    "crowdGain": 0,
    "description": "Redirect the opponent over the hip.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "standing"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "core"
      ]
    },
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "spinebuster",
    "name": "Spinebuster",
    "category": "grapple",
    "stat": "Power",
    "staminaCost": 7,
    "staminaDamage": 10,
    "damageDie": 12,
    "crowdGain": 0,
    "description": "Lift and drive the opponent flat onto the canvas.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "standing"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "core"
      ]
    },
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "elbow-drop",
    "name": "Elbow Drop",
    "category": "strike",
    "stat": "Power",
    "staminaCost": 4,
    "staminaDamage": 6,
    "damageDie": 8,
    "crowdGain": 0,
    "description": "Drop an elbow across a grounded rival.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "prone"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "core"
      ]
    },
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "stomp",
    "name": "Stomp",
    "category": "strike",
    "stat": "Power",
    "staminaCost": 3,
    "staminaDamage": 5,
    "damageDie": 6,
    "crowdGain": 0,
    "description": "Stomp a grounded rival.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "prone"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "core"
      ]
    },
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "knee-drop",
    "name": "Knee Drop",
    "category": "strike",
    "stat": "Power",
    "staminaCost": 4,
    "staminaDamage": 6,
    "damageDie": 8,
    "crowdGain": 0,
    "description": "Land a driving knee onto the opponent.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "prone"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "core"
      ]
    },
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "leg-drop",
    "name": "Leg Drop",
    "category": "strike",
    "stat": "Power",
    "staminaCost": 5,
    "staminaDamage": 7,
    "damageDie": 10,
    "crowdGain": 0,
    "description": "Drop a heavy leg across the upper body.",
    "requirements": {
      "attackerPostures": [
        "standing"
      ],
      "defenderPostures": [
        "prone"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "core"
      ]
    },
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "armbar",
    "name": "Armbar",
    "category": "grapple",
    "stat": "Agility",
    "staminaCost": 5,
    "staminaDamage": 8,
    "damageDie": 8,
    "crowdGain": 0,
    "description": "Work the opponent's arm on the canvas.",
    "requirements": {
      "attackerPostures": [
        "standing",
        "kneeling"
      ],
      "defenderPostures": [
        "prone"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "leftArm"
      ]
    },
    "sustained": {"tickCost":2,"tickDamage":4,"escapeCost":2,"holdStat":"Agility"},
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    "id": "ankle-lock",
    "name": "Ankle Lock",
    "category": "grapple",
    "stat": "Power",
    "staminaCost": 5,
    "staminaDamage": 8,
    "damageDie": 8,
    "crowdGain": 0,
    "description": "Torque the ankle while controlling a downed opponent.",
    "requirements": {
      "attackerPostures": [
        "standing",
        "kneeling"
      ],
      "defenderPostures": [
        "prone"
      ]
    },
    "targeting": {
      "mode": "fixed",
      "bodyParts": [
        "leftLeg"
      ]
    },
    "sustained": {"tickCost":2,"tickDamage":4,"escapeCost":2,"holdStat":"Power"},
    "result": {
      "defenderPosture": "prone"
    }
  },
  {
    id: 'forearm-smash',
    name: 'Forearm Smash',
    category: 'strike',
    stat: 'Power',
    staminaCost: 5,
    staminaDamage: 7,
    damageDie: 8,
    crowdGain: 0,
    description: 'Drive a forearm into the opponent\'s head.',
    requirements: {
      attackerPostures: ['standing'],
      defenderPostures: ['standing', 'kneeling']
    },
    targeting: { mode: 'fixed', bodyParts: ['head'] },
    result: { defenderPosture: 'standing', preserveDefenderPosture: true }
  },
  {
    id: 'running-clothesline',
    name: 'Running Clothesline',
    category: 'strike',
    stat: 'Power',
    staminaCost: 6,
    staminaDamage: 8,
    damageDie: 10,
    crowdGain: 1,
    description: 'Step through with a heavy clothesline that snaps the opponent to the mat.',
    requirements: {
      attackerPostures: ['standing'],
      defenderPostures: ['standing']
    },
    targeting: { mode: 'fixed', bodyParts: ['head'] },
    result: { defenderPosture: 'prone' }
  },
  {
    id: 'vertical-suplex',
    name: 'Vertical Suplex',
    category: 'grapple',
    stat: 'Power',
    staminaCost: 5,
    staminaDamage: 8,
    damageDie: 10,
    crowdGain: 0,
    description: 'Lift and drive the opponent onto the mat.',
    requirements: {
      attackerPostures: ['standing'],
      defenderPostures: ['standing']
    },
    targeting: { mode: 'fixed', bodyParts: ['core'] },
    result: { defenderPosture: 'prone' }
  },
  {
    id: 'body-slam',
    name: 'Body Slam',
    category: 'grapple',
    stat: 'Power',
    staminaCost: 6,
    staminaDamage: 9,
    damageDie: 10,
    crowdGain: 1,
    description: 'Scoop the opponent across the body and drive them onto the mat.',
    requirements: {
      attackerPostures: ['standing'],
      defenderPostures: ['standing']
    },
    targeting: { mode: 'fixed', bodyParts: ['core'] },
    result: { defenderPosture: 'prone' }
  },
  {
    id: 'dragon-screw',
    name: 'Dragon Screw',
    category: 'grapple',
    stat: 'Agility',
    staminaCost: 5,
    staminaDamage: 8,
    damageDie: 10,
    crowdGain: 0,
    description: 'Catch a leg and torque the opponent to the mat.',
    requirements: {
      attackerPostures: ['standing'],
      defenderPostures: ['standing']
    },
    targeting: { mode: 'chooseOne', bodyParts: ['leftLeg', 'rightLeg'] },
    result: { defenderPosture: 'prone' }
  },
  {
    id: 'ground-headlock',
    name: 'Ground Headlock',
    category: 'grapple',
    stat: 'Power',
    staminaCost: 5,
    staminaDamage: 8,
    damageDie: 8,
    crowdGain: 0,
    description: 'Control a prone opponent on the mat.',
    requirements: {
      attackerPostures: ['standing', 'kneeling'],
      defenderPostures: ['prone']
    },
    targeting: { mode: 'fixed', bodyParts: ['head'] },
    sustained: { tickCost:2, tickDamage:4, escapeCost:2, holdStat:'Power' },
    result: { defenderPosture: 'prone' }
  },
  {
    id: 'flash-finisher',
    name: 'Flashpoint Driver',
    category: 'special',
    stat: 'Power',
    staminaCost: 10,
    staminaDamage: 16,
    damageDie: 12,
    crowdGain: 1,
    heatPopRequired: 2,
    legendary: true,
    legendaryStyle:'Powerhouse',
    signatureFor:'stone',
    description: 'A high-impact special that leaves the opponent prone.',
    requirements: {
      attackerPostures: ['standing'],
      defenderPostures: ['standing']
    },
    targeting: { mode: 'fixed', bodyParts: ['core'] },
    result: { defenderPosture: 'prone' }
  }  ,{
    id:'viper-bite',
    name:"Viper's Bite",
    category:'special',
    stat:'Agility',
    staminaCost:10,
    staminaDamage:16,
    damageDie:12,
    crowdGain:1,
    heatPopRequired:2,
    legendary:true,
    legendaryStyle:'Daredevil',
    signatureFor:'viper',
    description:'A twisting spring-in neck cutter: Viper clamps the head, spins, and drops the rival to the mat. A successful hit immediately offers a pin.',
    requirements:{attackerPostures:['standing'],defenderPostures:['standing']},
    targeting:{mode:'fixed',bodyParts:['head']},
    result:{defenderPosture:'prone'}
  }

];

export const reactionMove = {
  id: 'shove-counter',
  name: 'Shove Counter',
  category: 'reaction',
  stat: 'Power',
  staminaCost: 5,
  staminaDamage: 7,
  damageDie: 6,
  crowdGain: 1,
  targeting: { mode: 'fixed', bodyParts: ['core'] },
  result: {
    attackerPosture: 'standing',
    defenderPosture: 'standing'
  }
};

export function freshBodyDamage() {
  return {
    head: 0,
    core: 0,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0
  };
}

export const demoState = {
  rulesetVersion: '1.3-playtest',
  matchLevel: 1,
  phase: 'NEUTRAL_ROLL',
  activeWrestlerId: null,
  roles: { stone: 'N', viper: 'N' },
  pinEligible: false,
  pinningWrestlerId: null,
  pinCount: 0,
  neutralAction: false,
  winnerId: null,
  turnCounter: 0,
  moveHistory: [],
  pendingFailure: null,
  activeHold: null,
  ringPosition: null,
  groundDefense: null,
  mustFinishTargetId: null,
  legalBodyTargets: ['head', 'core', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'],
  wrestlers: {
    stone: {
      ...wrestlerDefinitions.stone,
      stamina: wrestlerDefinitions.stone.maxStamina,
      crowdResource: 2,
      posture: 'standing',
      condition: 'Mostly Healthy',
      groundGuard: 0,
      bodyDamage: freshBodyDamage()
    },
    viper: {
      ...wrestlerDefinitions.viper,
      stamina: wrestlerDefinitions.viper.maxStamina,
      crowdResource: 2,
      posture: 'standing',
      condition: 'Mostly Healthy',
      bodyDamage: freshBodyDamage()
    }
  }
};
