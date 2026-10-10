# Data Model — Proposed

## Design rule

Separate **character definition**, **match state**, **move definition**, and **presentation assets**. Do not hard-code moves into rendering code.

## Wrestler definition

Suggested fields:

- id
- display name
- attitude: Face / Heel
- style
- Main Stats
- starting/max stamina derived according to approved rules
- body thresholds
- learned Common Move IDs
- learned Legendary Move IDs
- finisher IDs if separate
- Gym/Mat progression
- cosmetic loadout

## Body parts

Use stable IDs:

```text
head
core
leftArm
leftWrist
rightArm
rightWrist
leftLeg
leftAnkle
rightLeg
rightAnkle
```

These map directly to the original source list.

## Move definitions

Move data should contain mechanics and presentation references, not executable custom code wherever possible.

See `Move_Definition_Schema.json`.

## Match event log

Keep a canonical event list that is more structured than human-readable text. Example:

```json
{
  "type": "BODY_POINT_ADDED",
  "targetWrestlerId": "viper",
  "bodyPart": "core",
  "amount": 1,
  "sourceMoveId": "example-ground-headlock"
}
```

The UI can turn this into animation, text, sound, replay, or Discord output.

## Versioning

Every saved match should store a ruleset version. If the creator changes a formula later, historical matches can still be interpreted correctly.
