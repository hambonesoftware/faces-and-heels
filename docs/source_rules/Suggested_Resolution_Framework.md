# Suggested Resolution Framework — NOT CANON

This file is intentionally separated from the source rules. It contains implementation-friendly options to discuss with the creator.

## Goal

Resolve ambiguities with the smallest changes possible while preserving the original ideas:

- BGD d20 resolution;
- H/N/L momentum;
- position-gated moves;
- stamina economy;
- targeted body damage;
- Face/Heel Heat/Pop resource;
- reactions after failed offense;
- three-count pin drama.

## Recommended decision method

For each unresolved mechanic:

1. State the exact source wording.
2. List 2–3 plausible interpretations.
3. Simulate at least 20 representative rolls where math is involved.
4. Select the interpretation that best preserves wrestling pacing and creator intent.
5. Record the approved rule in a future `Rules_v1.0.md`.
6. Add an automated unit test for that rule.

## H/N/L recommendation pattern to evaluate

A simple deterministic state machine would be easiest to teach and animate. For example only—not approved:

- Normal move success: attacker remains H, defender remains L.
- Normal move failure: defender may Reaction.
- Successful Reaction: reactor becomes H; original attacker becomes L.
- Failed/declined Reaction: existing H/L remains.
- Specific moves may explicitly force N/N.
- Kickout produces N/N and both prone as stated in the source.

This is only one candidate; the creator should approve or replace it.

## Position system recommendation pattern

Keep the vocabulary deliberately small. Every new state multiplies the move-validation combinations. Separate:

- `posture` — standing, kneeling, seated, prone;
- `facing` — front, rear, side if needed;
- `matchLevel` — outside, ring, ropes.

Only add corner/apron/turnbuckle as separate states if moves genuinely need them.

## Math validation

Before locking attack/CON formulas, generate distributions for low, average, and high characters and verify:

- Common moves hit often enough to keep the match moving.
- Legendary moves feel meaningful but are not automatic.
- Body damage creates escalating vulnerability.
- Pin odds increase as a wrestler is worn down.
- Stamina pressure produces a climax instead of a stall.
