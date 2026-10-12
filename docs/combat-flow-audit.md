# Faces & Heels — Defensive Combat Flow Audit (v1.18)

This document records the implemented digital playtest flow. High/Low is an **advantage relationship**, not a ban on defensive actions. Posture (standing, kneeling, prone), controlling hold, exhaustion and learned repertoire remain separate facts.

## Phase / action matrix

| Engine phase | Decision owner | Allowed action | Advantage after |
| --- | --- | --- | --- |
| NEUTRAL_ROLL | Both | Opposed d20 + Agility; both recover 10 STA | Winner H, loser L |
| ACTION_SELECT | Current controlling wrestler | Learned legal Common/Legendary or universal setup, crowd recovery, prone scramble, catch breath fallback | H retained until counter/neutral |
| REACTION | Defender of missed attack (normally L) | Trained posture-compatible Common Move counter, or pass | Counter success flips H; a takedown grants pin opportunity; fail/pass retains previous state |
| PIN_OPPORTUNITY | H | Attempt pin or decline pin (if target has stamina) | Begin PIN or give defender GROUND_DEFENSE |
| GROUND_DEFENSE | **Prone Low** | D20 + Agility scramble (2 STA, even if exhausted); cover up; stay down | Successful scramble: Low kneeling, N/N; failure/cover/pass: H continues offense |
| PIN | **Pinned Low** | Opposed d20 roll on **each count**; unable to interrupt by ordinary attack | Winning any count kicks out to N/N next-action scramble; losing count 3 ends match |
| HOLD_ESCAPE | **Grappled Low** | D20 + Agility (up to 2 STA). A zero-STA player still rolls. | Success breaks hold -> Neutral; failure returns to holder; failed *last chance* means submission |
| HOLD | H holder | Tighten pressure, voluntarily release, or switch into another **learned** compatible hold | Tighten/transition -> immediate HOLD_ESCAPE; release -> pin opportunity while opponent prone |
| MATCH_COMPLETE | Nobody | No actions | Terminal |

Other UI-only phases (`ROLLING`, `ANIMATING`, `TARGET_CHOICE`, `SELECTED`, `PIN_DEFENSE`) are presentation states. They must not be mistaken for additional engine turns.

## Responses must not be stolen by High

- Every pin count belongs to the wrestler whose shoulders are down, **not** the pinning wrestler. Opposed dice are still calculated for both.
- Opening a sustained Armbar, Headlock or Ankle Lock **immediately** gives Low one escape d20.
- Every additional squeeze or switch of holds gives Low **another** escape attempt; Low can still roll at zero stamina before being declared submitted.
- Declining a voluntary pin gives the prone opponent a one-turn defensive window before H can hit again. Low may scramble to kneeling on a contested roll, choose protective cover, or pass.
- A failed offensive roll opens only the legal counters **personally learned** by that wrestler and compatible with the current postures. Standing reversals are not playable from prone or while locked in a submission.
- Wrestler signature Legendary moves never appear in reactions; only appropriately learned Common Moves do.

## Stamina, posture, and action balance

A landed normal move's listed opponent stamina loss exceeds attacker cost. Cover Up can absorb up to 3 stamina of an upcoming landed move but never reduce its nominal damage below the attacker cost plus one; it also adds 2 to the relevant body-mark threshold for that one hit. An already exhausted rival may take less *actual* damage than the nominal amount, because stamina is clamped to zero. A failed attack costs its own wrestler stamina but inflicts none.

A successful ground scramble ends with the Low wrestler **kneeling**, not teleporting to standing; a failed scramble finishes prone. Hold switches cost 3 STA and drain 4 nominally; they keep the rival prone and the two wrestlers in connected, interpolated grip poses. This is scripted, collision-audited pose interpolation, **not** full rigid-body physics.

## Enforcement and ownership

- `turn-controller.js` is the sole player permission policy. Engine methods validate `ACTION_IDS` before mutating state.
- `ground-defense.js` defines the low-controlled mat escape and bracing rules.
- `reaction-selection.js` restricts reactions to the defender's trained Common Moves.
- `hold-transitions.js` enumerates only compatible, learned sustained holds.
- `match-engine.js` resolves deterministic rolls, postures, stamina, control and terminal outcomes; `app.js` displays authorized choices; `choreography.js` and `iso-stage.js` animate the result.

## Acceptance tests

`test-turn-controller.mjs`, `test-pin-defense-extended.mjs`, `test-ground-defense.mjs`, `test-reaction-selection.mjs`, `test-hold-transitions.mjs`, `test-combat-state-graph.mjs`, `test-sustained-holds.mjs`, `test-animation-roster.mjs`, `test-move-transitions.mjs`, and `test-simulations.mjs` cover permission windows, movement/collision volumes, invalid calls, terminal states and repeatable full matches.

`npm test` executes the full suite, including 1,000 matches by default, through GitHub's `combat-ci.yml` workflow. The test design enforces **no live phase without an enabled next action**, detects invalid owner/phase combinations and guards the player's defensive turn.

### Boundaries and possible future refinements

- Only Stone and Viper have playable finishers. Other style move catalogs are proposals, not fully choreographed attacks.
- Full mesh/limb-body collision simulation and real-phone visual review remain separate tasks. Existing animation regression tests check joints and conservative torso/head volumes, not an anatomical rigid-body solver.
- Ground defense triggers specifically after a declined pin; adding other knockdown interruption windows would require a rules-design decision, not a silent blanket buff.
- Submission pressure, escape difficulty, and protective cover values are digital-game playtest tuning decisions, not verbatim unresolved tabletop wording.
