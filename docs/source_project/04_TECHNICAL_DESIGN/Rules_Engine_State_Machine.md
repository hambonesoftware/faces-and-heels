# Rules Engine State Machine — Proposed Structure

This document defines software structure, not missing game-rule answers.

## Suggested phases

```text
MATCH_SETUP
PROMO_PHASE
NEUTRAL_ROLL
ACTION_SELECTION
MOVE_CONFIRMATION
MOVE_RESOLUTION
REACTION_SELECTION
REACTION_RESOLUTION
DAMAGE_RESOLUTION
POSITION_RESOLUTION
PIN_OPPORTUNITY
PIN_RESOLUTION
SUBMISSION_RESOLUTION
TURN_ADVANCE
MATCH_COMPLETE
```

Phases whose rules are not yet defined should be feature-flagged or blocked until approved.

## Match state categories

### Persistent wrestler data

- wrestler identity/name;
- Main Stats;
- style;
- attitude;
- learned Common Moves;
- learned Legendary Moves;
- body thresholds;
- progression.

### Per-match wrestler state

- current stamina;
- current Heat/Pop pool;
- body-point marks;
- posture/orientation;
- Match Level/location;
- momentum role H/N/L;
- temporary effects;
- eligible reaction state.

### Match-level state

- participants;
- active actor;
- phase;
- pending action;
- roll history;
- turn counter;
- winner/result;
- ruleset version.

## Determinism

Given:

- a starting state;
- an action intent;
- explicit random results;

…the engine should produce the same resulting state every time. This allows unit tests, replays, multiplayer synchronization, and debugging.
