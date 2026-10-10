# Testing Plan

## Rules tests

Every approved rule should have deterministic unit tests using injected dice values.

Examples:

- illegal starting position rejects move without spending stamina;
- insufficient stamina behavior matches approved rule;
- successful move applies correct body threshold test;
- failed move opens exactly one Reaction opportunity if eligible;
- failed Reaction preserves state where source says so;
- pin penalties apply exactly as approved;
- kickout creates N/N, both prone, +10 stamina to previously pinned wrestler, and grants the next move as specified;
- zero-stamina rule forces pin/submission choice as defined.

## Distribution tests

For formulas involving random rolls, simulate large batches to check pacing:

- hit rate by stat range;
- average turns per match;
- body-point accumulation;
- stamina depletion;
- pin success versus total body damage;
- Heat/Pop generation/spend rate.

These simulations validate balance but do not replace creator intent.

## UI tests

- iPhone portrait menus;
- iPhone landscape match;
- iPad landscape;
- Android phone baseline;
- desktop browser;
- touch only, no mouse;
- resume after app background;
- reconnect after network loss;
- large text;
- reduced motion.

## Animation tests

For every paired move:

- attacker and defender anchors align;
- no visible foot sliding at start/end beyond acceptable tolerance;
- ending pose matches rules state;
- reversing character skin/gear does not change alignment;
- animation skip lands in exactly the same final state;
- low-end device maintains acceptable frame pacing.
