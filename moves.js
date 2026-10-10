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
    id: 'forearm-smash',
    name: 'Forearm Smash',
    category: 'strike',
    stat: 'Power',
    staminaCost: 5,
    staminaDamage: 4,
    damageDie: 8,
    crowdGain: 0,
    description: 'Drive a forearm into the opponent\'s head.',
    requirements: {
      attackerPostures: ['standing'],
      defenderPostures: ['standing', 'kneeling']
    },
    targeting: { mode: 'fixed', bodyParts: ['head'] },
    result: { defenderPosture: 'standing' }
  },
  {
    id: 'running-clothesline',
    name: 'Running Clothesline',
    category: 'strike',
    stat: 'Power',
    staminaCost: 6,
    staminaDamage: 6,
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
    staminaDamage: 5,
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
    staminaDamage: 6,
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
    staminaDamage: 5,
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
    staminaDamage: 4,
    damageDie: 8,
    crowdGain: 0,
    description: 'Control a prone opponent on the mat.',
    requirements: {
      attackerPostures: ['standing', 'kneeling'],
      defenderPostures: ['prone']
    },
    targeting: { mode: 'fixed', bodyParts: ['core'] },
    result: { defenderPosture: 'prone' }
  },
  {
    id: 'flash-finisher',
    name: 'Flashpoint Driver',
    category: 'special',
    stat: 'Power',
    staminaCost: 10,
    staminaDamage: 10,
    damageDie: 12,
    crowdGain: 1,
    heatPopRequired: 2,
    legendary: true,
    description: 'A high-impact special that leaves the opponent prone.',
    requirements: {
      attackerPostures: ['standing'],
      defenderPostures: ['standing']
    },
    targeting: { mode: 'fixed', bodyParts: ['core'] },
    result: { defenderPosture: 'prone' }
  }
];

export const reactionMove = {
  id: 'shove-counter',
  name: 'Shove Counter',
  category: 'reaction',
  stat: 'Power',
  staminaCost: 5,
  staminaDamage: 4,
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
  neutralAction: false,
  winnerId: null,
  turnCounter: 0,
  pendingFailure: null,
  mustFinishTargetId: null,
  legalBodyTargets: ['head', 'core', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'],
  wrestlers: {
    stone: {
      ...wrestlerDefinitions.stone,
      stamina: wrestlerDefinitions.stone.maxStamina,
      crowdResource: 2,
      posture: 'standing',
      condition: 'Mostly Healthy',
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
