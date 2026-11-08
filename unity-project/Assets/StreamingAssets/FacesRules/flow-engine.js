const BODY_LABELS = {
  head: 'Head',
  core: 'Core',
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftWrist: 'Left Wrist',
  rightWrist: 'Right Wrist',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
  leftAnkle: 'Left Ankle',
  rightAnkle: 'Right Ankle'
};

export function bodyLabel(id) {
  return BODY_LABELS[id] || id;
}

export function isMoveLegal(move, state) {
  const attackerPostures = move.requirements?.attackerPostures || [];
  const defenderPostures = move.requirements?.defenderPostures || [];

  if (attackerPostures.length && !attackerPostures.includes(state.attacker.posture)) {
    return false;
  }

  if (defenderPostures.length && !defenderPostures.includes(state.defender.posture)) {
    return false;
  }

  if (typeof move.heatPopRequired === 'number' && state.attacker.crowdResource < move.heatPopRequired) {
    return false;
  }

  if (typeof move.staminaCost === 'number' && state.attacker.stamina < move.staminaCost) {
    return false;
  }

  return true;
}

export function getLegalMovesByCategory(moves, category, state) {
  return moves.filter((move) => move.category === category && isMoveLegal(move, state));
}

export function getCategoryRoute(moves, category, state) {
  const legalMoves = getLegalMovesByCategory(moves, category, state);

  if (legalMoves.length === 0) {
    return {
      kind: 'unavailable',
      category,
      legalMoves
    };
  }

  if (legalMoves.length === 1) {
    return {
      kind: 'directMove',
      category,
      move: legalMoves[0],
      legalMoves
    };
  }

  return {
    kind: 'moveChooser',
    category,
    legalMoves
  };
}

export function resolveTargetDecision(move, state) {
  const targeting = move.targeting || { mode: 'none', bodyParts: [] };
  const candidateBodyParts = Array.isArray(targeting.bodyParts) ? targeting.bodyParts : [];
  const legalBodyTargets = new Set(state.legalBodyTargets || candidateBodyParts);
  const legalCandidates = candidateBodyParts.filter((part) => legalBodyTargets.has(part));

  switch (targeting.mode) {
    case 'none':
      return {
        kind: 'resolved',
        mode: 'none',
        values: [],
        reason: 'Move has no body-part target.'
      };

    case 'fixed': {
      const fixed = legalCandidates[0] || candidateBodyParts[0] || null;
      return {
        kind: fixed ? 'resolved' : 'unavailable',
        mode: 'fixed',
        values: fixed ? [fixed] : [],
        reason: fixed ? 'Fixed by move definition.' : 'Fixed target is not legal.'
      };
    }

    case 'all':
      return {
        kind: legalCandidates.length ? 'resolved' : 'unavailable',
        mode: 'all',
        values: legalCandidates,
        reason: 'Move applies to all legal listed targets.'
      };

    case 'derived':
      return {
        kind: 'resolved',
        mode: 'derived',
        values: legalCandidates.slice(0, 1),
        reason: 'Target is derived by the rules engine.'
      };

    case 'chooseOne':
      if (legalCandidates.length === 0) {
        return {
          kind: 'unavailable',
          mode: 'chooseOne',
          values: [],
          reason: 'No legal target remains.'
        };
      }

      if (legalCandidates.length === 1) {
        return {
          kind: 'resolved',
          mode: 'chooseOne',
          values: [legalCandidates[0]],
          reason: 'Only one legal target remains, so it is auto-selected.'
        };
      }

      return {
        kind: 'choice',
        mode: 'chooseOne',
        values: legalCandidates,
        reason: 'Player must choose one legal target.'
      };

    default:
      return {
        kind: 'unavailable',
        mode: targeting.mode,
        values: [],
        reason: `Unknown targeting mode: ${targeting.mode}`
      };
  }
}

export function buildMoveFlow(move, state) {
  const targetDecision = resolveTargetDecision(move, state);

  if (targetDecision.kind === 'unavailable') {
    return {
      kind: 'unavailable',
      move,
      targetDecision
    };
  }

  if (targetDecision.kind === 'choice') {
    return {
      kind: 'needsTargetChoice',
      move,
      targetDecision
    };
  }

  return {
    kind: 'readyToConfirm',
    move,
    targetDecision,
    selectedTarget: targetDecision.values[0] || null
  };
}

export function getActionButtonModel(moves, category, state) {
  const route = getCategoryRoute(moves, category, state);
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  if (route.kind === 'unavailable') {
    return {
      category,
      disabled: true,
      label: categoryLabel,
      sublabel: 'No legal moves',
      route
    };
  }

  if (route.kind === 'directMove') {
    const targetDecision = resolveTargetDecision(route.move, state);
    const targetText = targetDecision.kind === 'resolved' && targetDecision.values.length === 1
      ? bodyLabel(targetDecision.values[0])
      : categoryLabel;

    return {
      category,
      disabled: false,
      label: route.move.name,
      sublabel: `${categoryLabel} · ${targetText}`,
      route
    };
  }

  return {
    category,
    disabled: false,
    label: categoryLabel,
    sublabel: `${route.legalMoves.length} legal moves`,
    route
  };
}
