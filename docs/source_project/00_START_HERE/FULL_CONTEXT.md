# Faces & Heels — Consolidated Context


---

# FILE: 00_START_HERE/PROJECT_CONTEXT.md

# Project Context

## Project

**Faces & Heels** is a professional-wrestling tabletop role-playing game being adapted into a digital game.

The original concept was an **Avrae-style Discord gaming system**. During the design discussion, the project explored a newer Discord-native approach using a Discord Activity plus bot/application commands. The current conversation then shifted toward a **touch-first PWA for phones and tablets**, with Discord potentially remaining as a social/optional integration rather than being the only game surface.

## Core identity

The digital game should preserve the tabletop game's strategic structure rather than becoming an arcade wrestling game. The digital layer should automate bookkeeping and make legal actions obvious while keeping the underlying dice, stamina, body-part damage, positioning, momentum state, Heat/Pop, pins, submissions, promos, and progression visible when relevant.

## Current UX direction

The user explicitly preferred the later, simplified match-screen concept over the earlier feature-dense dashboard. The desired screen is calm and touch-friendly:

- wrestler name, stamina, Pop/Heat, and a compact health summary at the top;
- ring and wrestler visuals in the center;
- clear turn indicator;
- four or so large contextual action buttons at the bottom;
- move choices presented in a temporary bottom sheet;
- body-part detail, match history, and deeper rules available on demand rather than always visible.

## Current graphics direction under discussion

A realistic implementation path is **2D sprite / pose animation** rather than full 3D. The recommended concept is a hybrid:

- shared layered wrestler body parts / clothing / hair / accessories;
- simple skeletal or tweened animation for idle, breathing, taunts, walk, stagger, rise, celebration;
- synchronized two-wrestler authored pose sequences for contact moves such as suplexes, headlocks, DDTs, slams, submissions, pins, and kickouts;
- game-engine effects for impact flashes, camera shake, ring bounce, particles, crowd reactions, and UI feedback.

This graphics approach is a recommendation, not yet a locked rule.

## Implementation principle

The rules engine should remain independent of the UI and rendering technology. A match state should be resolvable without Phaser, React, Discord, or any specific front end. That allows the same engine to support PWA play, Discord integration, AI testing, and future native wrappers.


---

# FILE: 00_START_HERE/SOURCE_PRIORITY.md

# Source Priority and Canon Levels

Use these precedence levels when future files disagree.

## Level 1 — Canon / Creator Source

`01_ORIGINAL_RULES/Faces & Heels Rules.pdf`

This is the supplied rules source. Do not rewrite an ambiguity into certainty.

## Level 2 — Explicit creator decisions from the design conversation

Captured in `07_CHATGPT_WORK_HANDOFF/Decision_Log.md`.

Examples include the historical Avrae/Discord conception and the creator's positive approval of the simplified screen direction.

## Level 3 — Working design direction

Files in `03_GAME_DESIGN` summarize the design direction developed collaboratively. These should guide prototypes but may be revised.

## Level 4 — Technical recommendations

Files in `04_TECHNICAL_DESIGN` and `06_IMPLEMENTATION` are implementation recommendations. They are not game rules.

## Level 5 — Examples / placeholders

Files in `08_EXAMPLE_DATA` are deliberately non-canon implementation examples. Names, values, costs, move statistics, and effects in those files must not be treated as approved rules unless later promoted to canon.


---

# FILE: 01_ORIGINAL_RULES/Rules_Organized.md

# Faces & Heels Rules — Organized Source Summary

This file reorganizes the supplied PDF for easier reference. It does **not** resolve gaps or change ambiguous wording. Where the source appears incomplete, that is called out explicitly.

## Match start and momentum

- Roll off using the **Big Gold Dice (BGD), a d20**, to determine the neutral move.
- Winner chooses Neutral/Neutral move.
- Roll Neutral with modifier using the BGD.
- Winner becomes the **(H) wrestler**.
- Loser becomes the **(L) wrestler**.
- The H wrestler attempts a move.
- The chosen move's body-position requirement must match current match body positions.
- Stamina is removed for the move.
- Source lists `-5` for a common move and `-10` for a legendary move, plus body-part cost language elsewhere.
- On success: roll damage, adjust body positions, adjust H/N/L.
- On failure: L may attempt a Reaction against the move maker's CON.
- On successful Reaction: roll damage, adjust body positions, adjust H/N/L.
- On failed Reaction: maintain existing H/N/L.

## Move properties

The source says moves include or interact with:

- body requirement modifier per body part of the move maker;
- body position requirements for move taker and move maker;
- stamina cost;
- body points per body part;
- legendary cost `-10`;
- reaction cost `-5`;
- a damage roll on success;
- a joint/body assignment threshold check on the move taker;
- ending body positions for move taker and move maker;
- a Match Level requirement.

The source also mentions **"Stamina Dice assigned — full roll to move taker"**, but does not define Stamina Dice elsewhere.

## Common and Legendary moves

- Common Move: list of 20 moves all wrestlers can choose from.
- Legendary Move: style-dependent list of 8–10 moves the wrestler will choose from.
- Character maximum: 20 Common Moves.
- Character maximum: 4 Legendary Moves.

The supplied PDF does not contain the actual move catalogs.

## Bonus action

- A move maker can reposition themselves or the move taker once during a move.

The permitted reposition transitions are not defined in the supplied document.

## Reactions

- A Reaction is a move the move taker may make when the move maker fails a move.
- Reactions have no bonus action.
- Reactions do not permit repositioning.
- Reaction moves are selected from the wrestler's Common Move list.

## Body parts and base thresholds

| Body Part | Threshold |
|---|---:|
| Head | 4 |
| Core | 7 |
| Left Arm | 5 |
| Left Wrist | 4 |
| Right Arm | 5 |
| Right Wrist | 4 |
| Right Leg | 6 |
| Right Ankle | 5 |
| Left Leg | 6 |
| Left Ankle | 5 |

After a successful move, damage dice are rolled. If the damage roll exceeds the defender's threshold for the targeted body part, the defender gains a body-point mark on that part.

The next source sentence is incomplete: **"Every move also has one or more body parts required to perform it. When a player uses a move, they must add their own…"**

## Heat / Pop Dice

- Determined by Attitude.
- Face wrestlers receive **Pop Dice**.
- Heel wrestlers receive **Heat Dice**.
- Heat/Pop are gained during promos, some Common Moves, and all Legendary Moves.
- Heat/Pop Dice can be added to any roll.
- Heat/Pop Dice can be spent at any time on the wrestler's turn to gain `+10 Stamina`.

Die size, spending timing, pool cap, and how many may be added at once are not stated.

## Promos

- Promos happen before a match.
- Purpose: work the crowd, state goals, and gain additional Heat/Pop Dice.
- Promos use 3 BGD rolls.
- Each roll can gain 1 Heat/Pop Die.
- Wrestler must roll at or below their **level** to gain the die.

The meaning of "level" in this rule is not defined in the supplied document.

## Pin / Submission

### Pin eligibility

- If the move taker's ending body position is prone, the move maker may attempt a Pin.
- Finishers can immediately transition into the pin mechanic on success.

### Pin

- Three head-to-head BGD rolls.
- Each wrestler rolls the BGD.
- Pinning wrestler subtracts their Core body points.
- Pinned wrestler subtracts all of their body points.
- If the pinned wrestler wins any roll, the match becomes Neutral/Neutral with both wrestlers prone.
- The previously pinned wrestler gets to make a move.
- The previously pinned wrestler gains `+10 Stamina`.
- If the pinned wrestler does not win any of the three rolls, the match ends.

### Submission

The source states: **"The (L) wrestler subtracts their body points associated with the move assignment."** A complete submission procedure is not present.

## Stamina

- Main energy resource.
- Moves cost stamina.
- Moves take stamina away from the targeted player.
- If a player reaches 0 Stamina, the H wrestler must make a pin or submission move.
- Players regain `+10 Stamina` during every move at a turn starting from neutral position.
- Both players gain stamina on N/N rolls.

Exact target-stamina damage and neutral recovery timing require clarification.

## Leveling up

### Hitting the Gym

- Adds to Core Stats.
- Player receives two `+1` increases to assign to any Core Stat.

### Hitting the Mat

- Adds moves and increases body-part threshold.
- Add 1 Legendary Move from the wrestler's style.
- Add one `+1` increase to the threshold of any body part.

### Limits

- 10 Gym Passes.
- 10 Mat Passes.
- They may be used at any time and in any order.

The method of earning/receiving passes is not stated.

## Player character

### Main Stats

- Power
- Promo
- Agility
- Acrobatics
- Fortitude

For each stat value, roll `2d12` and add them together.

- No maximum stat value.
- Source says: **"The stat modifier is the (Stat MOD 5)"**.

This phrase is ambiguous and should not be interpreted without creator confirmation.

### Stamina

- Total of all Main Stats.

### Conditioning (CON)

- `10 + character's Fortitude` according to source wording.
- Represents resistance to being hurt.
- Defensive stat offensive players roll against.

Whether raw Fortitude or a Fortitude modifier was intended should be confirmed.

### Attitude

- Face
- Heel

### Styles

- Powerhouse
- Showman
- Daredevil
- Mat Technician
- Ironheart

## Match Level

- Level 0: outside of the ring.
- Level 1: ring.
- Level 2: ropes.
- Wrestlers must meet the Match Level requirement of a move before using it.

The movement procedure between Match Levels is not defined.


---

# FILE: 02_RULES_ANALYSIS/Rules_Completeness_Audit.md

# Rules Completeness Audit

## Overall status

The supplied rules contain a recognizable and implementable **core match loop**, but they are not yet deterministic enough for a software engine to resolve every situation without human interpretation.

A prototype can be built now if unresolved mechanics are represented as explicit placeholders. A rules-complete 1.0 needs the decisions below.

## High-priority gaps — block deterministic implementation

### 1. Exact move-attempt formula

Known:
- BGD is a d20.
- Conditioning is the defensive stat.
- Heat/Pop can be added to rolls.
- Moves reference body requirements and modifiers.

Missing:
- exact attack equation;
- which stat each move uses;
- tie behavior;
- whether body damage affects the attacker, defender, or both during the attempt;
- whether a natural 1/20 has special meaning.

### 2. H / N / L transition rules

H/N/L is central to the flow, but the source frequently says only **"Adjust (H/N/L)"**. Software needs an explicit transition table for:

- successful normal move;
- successful reaction;
- failed reaction;
- move that explicitly changes momentum;
- pin kickout;
- submission escape;
- neutral recovery.

### 3. Turn continuation

After a successful move, it is not explicit whether:

- H continues immediately;
- control passes;
- another neutral roll occurs;
- move outcome controls the next actor.

This determines the rhythm of the entire game.

### 4. Body requirement modifier

The original document's sentence ends mid-rule: **"When a player uses a move, they must add their own…"**

The software cannot infer the intended relationship among body points, damaged limbs, move requirements, and roll modifiers.

### 5. Conditioning mathematics

The source says stats are generated with `2d12`, then says `CON = 10 + Fortitude`.

If raw Fortitude is intended, typical CON values may exceed a plain d20 result unless attack bonuses are correspondingly large. This may be intentional, but the formula should be confirmed rather than corrected silently.

### 6. "Stat MOD 5"

This phrase could mean several different things:

- mathematical modulo 5;
- modifier equals stat divided by 5;
- a modifier gained at every 5 stat points;
- something else.

Must be explicitly defined.

## Medium-priority gaps

### Heat / Pop

Need:
- die size;
- maximum pool;
- whether spent dice are consumed;
- maximum spend on one roll;
- whether dice are chosen before or after seeing a roll;
- whether Heat/Pop may be spent on defense, pins, submissions, reactions, promos, damage, etc.

### Damage and body points

Need:
- damage dice per move;
- maximum marks per body part, if any;
- mechanical effect of accumulated marks;
- whether marks ever make a body part unusable;
- whether thresholds are static or modified during the match.

### Stamina

Need:
- exact cost formula including body-part costs;
- target stamina loss on landed moves;
- minimum stamina required to attempt an action;
- effect of insufficient stamina;
- whether stamina can exceed starting maximum after recovery.

### Reactions

Need:
- exact attack formula;
- whether a successful Reaction flips H/L;
- whether Heat/Pop may be used;
- what happens if the reacting wrestler cannot pay cost;
- explicit prohibition or permission for chained reactions.

### Pin ties and modifier timing

Need:
- tie result on each head-to-head roll;
- whether body-point penalties apply to every roll;
- whether Pop/Heat may modify pin rolls;
- whether rolls are simultaneous or attacker-first.

### Submission procedure

Need full resolution mechanic, including escape condition and match-ending condition.

### Positions

Need a controlled vocabulary of positions and orientations, such as:
- standing;
- kneeling;
- seated;
- prone face-up / face-down if distinction matters;
- front / rear / side orientation;
- corner / ropes / center if spatial state matters.

Only include states the rules actually need.

### Bonus reposition

Need legal transitions and limits.

### Match Level transitions

Need to define how a wrestler gets outside, into the ring, or onto the ropes and whether Match Level is per wrestler or a shared move context.

### Promos

Need the definition of "level" used for the roll-at-or-below check.

### Progression

Need to define how Gym/Mat Passes are awarded and whether the 10/10 quantities are starting pools, lifetime caps, or campaign limits.

## Missing content data

Even after the engine rules are complete, the product needs:

- 20 Common Moves;
- 8–10 Legendary Moves per style;
- Finisher definitions;
- each move's required positions;
- target body parts;
- move-maker body requirements;
- stat used;
- stamina cost;
- damage dice;
- ending positions;
- H/N/L outcome if move-specific;
- Match Level requirement;
- Heat/Pop reward if applicable;
- animation/action tags.


---

# FILE: 02_RULES_ANALYSIS/Open_Rules_Decisions.md

# Open Rules Decisions

Use this as a creator decision checklist. Do not mark an item resolved unless the creator explicitly approves the answer.

## Core resolution

- [ ] What is the exact move-attempt formula?
- [ ] Which Main Stat does each move use, and is that stored per move?
- [ ] What exactly does "Stat MOD 5" mean?
- [ ] Is Conditioning `10 + raw Fortitude`, `10 + Fortitude modifier`, or something else?
- [ ] What happens on a tie against CON?
- [ ] Do natural 1 / natural 20 results have special effects?

## H / N / L and turns

- [ ] Define H, N, and L in plain language.
- [ ] On normal move success, who acts next?
- [ ] On normal move failure, what happens if no Reaction is used?
- [ ] On Reaction success, who becomes H/L?
- [ ] On Reaction failure, confirm existing H/L remains.
- [ ] What creates N/N besides kickout/escape and initial neutral state?
- [ ] When exactly is a new Neutral roll performed?

## Positions

- [ ] Final list of body-position states.
- [ ] Final list of orientation states.
- [ ] Is ring location separate from body position?
- [ ] Is Match Level tracked separately for each wrestler?
- [ ] Define valid bonus-action reposition transitions.
- [ ] Define how to enter/leave ring and climb/use ropes.

## Stamina

- [ ] Common Move base cost.
- [ ] Legendary Move base cost.
- [ ] Reaction base cost.
- [ ] Body-point/body-part cost formula.
- [ ] How much stamina does a landed move remove from the target?
- [ ] Can a wrestler act if they cannot pay full cost?
- [ ] Can stamina exceed starting maximum?
- [ ] Clarify neutral-position recovery timing.
- [ ] Define "Stamina Dice assigned — full roll to move taker" or remove it.

## Damage and body parts

- [ ] What damage dice does each move use?
- [ ] Maximum body points per body part?
- [ ] What penalty does each body point cause?
- [ ] How do move-maker body points affect a move that requires those parts?
- [ ] Are thresholds modified by body points during a match?
- [ ] Can a body part become unusable?

## Heat / Pop

- [ ] Die size.
- [ ] Maximum number held.
- [ ] Maximum spent on one roll.
- [ ] Spend before or after base roll?
- [ ] Are spent dice consumed?
- [ ] Can Heat/Pop modify damage rolls?
- [ ] Can Heat/Pop modify pin/submission rolls?
- [ ] Can Heat/Pop modify Reaction rolls?

## Promos

- [ ] Define "level" for promo checks.
- [ ] Is Promo stat involved directly?
- [ ] Are promos freeform roleplay only, or do choices/tags affect mechanics?
- [ ] Can multiple wrestlers participate in a promo segment?

## Pins

- [ ] Confirm body-point modifiers are subtracted from each BGD result.
- [ ] Define tie handling.
- [ ] Can Heat/Pop be spent during pin rolls?
- [ ] Are all three rolls made even if the defender wins an earlier one, or does the kickout resolve immediately?

## Submissions

- [ ] Full submission roll sequence.
- [ ] Which body points apply and to whom?
- [ ] Escape condition.
- [ ] Win condition.
- [ ] Whether position is changed on escape.

## Progression

- [ ] How are Gym Passes earned?
- [ ] How are Mat Passes earned?
- [ ] Are 10/10 starting resources, campaign maximums, or lifetime maximums?
- [ ] When can passes be spent relative to matches?

## Content

- [ ] Canon 20 Common Moves.
- [ ] Canon 8–10 Legendary Move pool for Powerhouse.
- [ ] Canon 8–10 Legendary Move pool for Showman.
- [ ] Canon 8–10 Legendary Move pool for Daredevil.
- [ ] Canon 8–10 Legendary Move pool for Mat Technician.
- [ ] Canon 8–10 Legendary Move pool for Ironheart.
- [ ] Finisher rules and finisher list.


---

# FILE: 03_GAME_DESIGN/Product_Vision.md

# Product Vision

## Elevator pitch

**Faces & Heels** is a touch-first digital wrestling TTRPG / tactics game where players build wrestlers, cut promos, manage crowd momentum, target body parts, chain position-dependent moves, react to failures, and fight toward pins or submissions.

The digital game should feel like **playing a wrestling match**, not filling out a spreadsheet.

## What digital should automate

- legal-move filtering;
- position requirements;
- Match Level requirements;
- stamina costs and recovery;
- damage rolls and body thresholds;
- Heat/Pop spending;
- H/N/L state;
- Reaction availability;
- pin/submission resolution;
- progression bookkeeping;
- match history.

## What players should decide

- which move to attempt;
- whether to reposition;
- which body part to target when a move allows choice;
- when to spend Heat/Pop;
- whether to take a Reaction;
- when to pin or submit;
- character build, attitude, style, moves, and progression choices;
- promo roleplay and story choices.

## Experience goals

- playable comfortably with one hand in portrait for menus and two thumbs in landscape for matches;
- readable on an iPhone-sized display;
- no permanent dashboard overload;
- most turns resolved in a few taps;
- dramatic dice and impact feedback without long unskippable animations;
- spectators can understand what just happened;
- desktop/tablet should feel spacious without changing core rules.

## Product positioning

Primary direction under discussion: installable **PWA** for phone, tablet, and desktop.

Possible companion integration: Discord for identity, community, promos, campaigns, invitations, match-result sharing, or a Discord Activity version using the same rules engine.


---

# FILE: 03_GAME_DESIGN/Touch_First_UX.md

# Touch-First UX Direction

## Approved preference from conversation

The user rejected the earlier busy dashboard direction and responded positively to the simplified version. Treat the simplified concept image in `05_VISUAL_DIRECTION/03_clean_match_ui_concept.png` as the current UX reference, while recognizing that generated concept art is illustrative rather than a pixel-perfect specification.

## Core rule

The match screen should answer four questions instantly:

1. Whose turn is it?
2. What condition are the wrestlers in?
3. Where / in what position are they?
4. What can I do now?

## Persistent UI

Keep visible:

- wrestler names;
- stamina bar/value;
- Pop or Heat indicator;
- small condition label;
- current position when relevant;
- ring scene;
- turn/momentum banner;
- 3–5 large action buttons.

## Contextual UI

Hide behind taps/sheets:

- full body-part diagram;
- exact body-point marks;
- detailed roll history;
- move encyclopedia text;
- progression details;
- full character sheet;
- complete match log.

## Phone orientation

### Landscape match mode

Preferred for active matches because it provides enough width for two wrestler status areas and a ring.

### Portrait support

Use for:

- wrestler creation;
- move book;
- character sheet;
- promos;
- campaign screens;
- settings;
- match history.

A portrait match fallback can stack opponent status, ring, and action bar vertically if required.

## Touch targets

Design for finger use, not mouse precision:

- primary buttons roughly 44 CSS px or larger;
- no hover-only information;
- swipe should not be required for critical actions;
- safe-area insets for iPhone notches / home indicator;
- bottom sheets should be reachable by thumb;
- destructive or irreversible choices need clear confirmation.

## Accessibility

- do not encode body damage only by color;
- allow reduced-motion mode;
- scalable text;
- high-contrast mode where practical;
- labels on icons;
- animation may be skipped without changing match state.


---

# FILE: 04_TECHNICAL_DESIGN/Architecture.md

# Proposed Technical Architecture — NOT YET CANON

## Recommended stack

### Client

- TypeScript
- Vite
- Phaser 3 for ring scene, sprites, tweens, camera, particles, and animation timing
- React for menus, sheets, character management, settings, campaign UI, and accessibility-friendly form controls
- PWA manifest + service worker
- IndexedDB for local cache / offline state

React can overlay or surround the Phaser canvas. The rules engine should be a plain TypeScript package used by both.

### Rules package

`packages/rules-engine`

Pure TypeScript. No DOM, Phaser, React, Discord, network, or database dependencies.

Responsibilities:

- validate match state;
- calculate legal moves;
- calculate costs/modifiers;
- resolve moves/reactions;
- resolve damage and thresholds;
- resolve H/N/L transitions;
- resolve pins/submissions;
- emit deterministic state-transition events;
- serialize/restore match state.

### Backend — for multiplayer

A small TypeScript server, for example Fastify or equivalent:

- authentication;
- campaign and wrestler persistence;
- match rooms;
- authoritative action validation;
- authoritative random rolls when required;
- WebSocket events;
- reconnect/resume;
- match history.

### Database

PostgreSQL for production multiplayer data.

Local-only prototype can begin with JSON fixtures + IndexedDB and add the backend after the core match loop is proven.

## High-level flow

```text
Touch / UI
   |
   v
UI Intent
   |
   v
Rules Engine ----> Validation Result
   |                    |
   | accepted           | rejected + reason
   v                    v
State Transition      UI Feedback
   |
   +--> Animation Events
   |
   +--> Persist / Sync
```

## Rules events separate from visuals

Example engine event sequence:

```text
MOVE_DECLARED
STAMINA_SPENT
ROLL_PERFORMED
MOVE_SUCCEEDED
DAMAGE_ROLLED
BODY_POINT_ADDED
POSITION_CHANGED
MOMENTUM_CHANGED
TURN_CHANGED
```

The renderer decides how those events look. The engine decides what actually happened.

## Multiplayer authority

Never let the animation decide state. If online multiplayer is implemented:

1. Player submits intent.
2. Authoritative engine validates and resolves.
3. Server emits result/event log.
4. Both clients animate the same result.

That keeps reconnects and desync recovery possible.


---

# FILE: 04_TECHNICAL_DESIGN/Animation_and_Sprite_System.md

# Animation and Sprite System — Recommended Direction

## Recommendation

Use a **hybrid 2D system** rather than full 3D or pure frame-by-frame animation for every wrestler.

## Why

Professional wrestling contains many synchronized two-person contact moves. Independent skeletal characters can look disconnected when hands, heads, hips, and limbs need to line up exactly. Full unique frame sheets for every custom wrestler would create an asset explosion.

The hybrid approach shares motion while allowing wrestler customization.

## Character layers

Potential layers:

- base body / skin;
- head / facial features;
- hair;
- beard;
- torso gear;
- trunks/tights;
- boots;
- knee pads;
- elbow pads;
- wrist tape;
- tattoos / decals;
- optional accessories.

All layers use the same pose coordinate system.

## Single-wrestler motion

Good candidates for bones/tweens/interpolation:

- idle breathing;
- ready stance;
- walking / ring reposition;
- taunt;
- stagger;
- get-up;
- celebration;
- turn/facing change.

## Paired contact moves

Use synchronized authored key poses for both wrestlers:

- lockup;
- headlock;
- clothesline impact;
- body slam;
- vertical suplex;
- German suplex;
- DDT;
- leg lock;
- armbar;
- pin;
- kickout;
- submission escape.

Each move animation references a common timeline. The attacker's and defender's pose tracks advance together.

## Example timeline

A suplex can be represented as something like:

```text
0 ms      approach / lock
120 ms    hook
260 ms    bend/load
420 ms    lift
620 ms    vertical hold
800 ms    rotate
940 ms    fall
1080 ms   IMPACT
1180 ms   bounce
1350 ms   release
1600 ms   final positions
```

These timings are examples, not rules.

## Engine effects

Use programmed effects to make short sprite sequences feel strong:

- camera shake;
- hit-stop (brief intentional pause at impact);
- ring/mat squash or bounce;
- impact flash;
- small dust/debris particles;
- crowd animation pulse;
- sound and optional controller haptic feedback where supported;
- damage/status pop-up;
- quick zoom for finisher/pin moments.

## Asset packing

Author/source files may be layered, but production should use atlases such as:

```text
stone_base.webp
stone_base.json
gear_pack_01.webp
gear_pack_01.json
moves_common_01.webp
moves_common_01.json
```

The renderer should support swapping cosmetic layers without changing the move logic.

## AI-generated art policy for production workflow

Generated images can be useful for:

- character design exploration;
- front/side/back references;
- palette and gear concepts;
- key pose reference;
- environment concepts;
- UI visual targets.

Do not assume independently generated frames will maintain production-level consistency. Standardize/redraw or use generated art as reference for a repeatable layered character template.

## First animation proof

Implement only two test wrestlers and a small set of moves:

- idle;
- prone;
- get-up;
- strike/clothesline;
- ground hold;
- leg drop;
- vertical suplex;
- pin;
- kickout;
- victory.

Prove scale, alignment, pairing, mobile performance, and customization before producing a large move library.


---

# FILE: 06_IMPLEMENTATION/Roadmap.md

# Proposed Roadmap

## Phase 0 — Lock the missing rules

Resolve the high-priority questions in `02_RULES_ANALYSIS/Open_Rules_Decisions.md`.

Deliverable: `Rules_v1.0.md` with deterministic formulas and state transitions.

## Phase 1 — Headless rules engine

Build and test without graphics.

- wrestler data model;
- move data model;
- body-part system;
- stamina;
- BGD roll injection;
- H/N/L state machine;
- move validation;
- Reaction flow;
- pin flow;
- serialization;
- deterministic tests.

Deliverable: automated simulation can complete matches from scripted choices.

## Phase 2 — Touch UI prototype

- Vite/React app shell;
- Phaser ring scene;
- landscape match layout;
- simplified HUD;
- bottom-sheet move chooser;
- dice overlay;
- body-status detail sheet;
- PWA manifest/service worker.

Deliverable: match can be played locally on iPhone/iPad/desktop browser.

## Phase 3 — Animation proof

- layered wrestler template;
- two cosmetic variants;
- idle/prone/get-up;
- several paired moves;
- hit-stop/camera shake/ring response;
- reduced-motion mode.

Deliverable: prove the art pipeline before content expansion.

## Phase 4 — Content tools

Build internal data editor or validated JSON workflow for:

- moves;
- styles;
- body requirements;
- damage dice;
- end positions;
- animation keys;
- Heat/Pop rewards.

Deliverable: adding a move does not require editing engine code.

## Phase 5 — Persistence and character creation

- local wrestler library;
- character creation;
- progression;
- move selection;
- import/export;
- save migration/versioning.

## Phase 6 — Multiplayer backend

- accounts or invite identities;
- match rooms;
- WebSocket synchronization;
- authoritative validation / rolls;
- reconnect/resume;
- match history.

## Phase 7 — Discord companion integration

Optional after the PWA loop is proven:

- challenge/invite command;
- wrestler/result cards;
- campaign server tools;
- promos/story sharing;
- possibly a Discord Activity client using the same API.

## Phase 8 — Campaign / promotion systems

- cards;
- rivalries;
- championships;
- seasons;
- GM/promoter tools;
- rankings only if the creator wants them;
- expanded progression/content.


---

# FILE: 07_CHATGPT_WORK_HANDOFF/Decision_Log.md

# Decision Log

This distinguishes explicit creator direction from assistant recommendations.

## Creator-originated / explicitly stated

### Original platform concept

Faces & Heels was originally conceived as an **Avrae-style system for Discord gaming**.

Status: historical product requirement / context.

### Interest in touch/mobile PWA

The creator asked how to make the rules into a **PWA-style programmed game for touch screens and mobile devices**.

Status: current direction being explored.

### Simplified match UI

After being shown a less-busy match mockup, the creator responded **"Now you're talking"** and asked to see that expectation.

Status: strong UX preference. Use the simplified concept as the current visual baseline.

### Sprite / 2D animation interest

The creator asked whether character sprite sheets could be produced and programmed or whether 2D animation should be used.

Status: graphics implementation direction under active exploration; no final selection explicitly stated by creator yet.

## Assistant recommendations — not creator-approved canon unless later confirmed

- PWA as primary client with optional Discord companion.
- TypeScript + React + Phaser.
- independent headless rules engine.
- hybrid 2D system: layered characters + simple skeletal/tweened single-character motions + synchronized paired contact-move poses.
- PostgreSQL/WebSocket backend later for multiplayer.
- contextual bottom sheets and compact body status rather than permanent body diagrams.

## Rules status

No missing/ambiguous rule listed in `Open_Rules_Decisions.md` should be considered decided merely because an implementation example exists in this package.
