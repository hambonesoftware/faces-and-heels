# Faces & Heels — Match UX + HUD Specification v1.0

**Status:** Implementation-ready UX direction  
**Primary target:** Touch-first PWA on iPhone/iPad, responsive to desktop  
**Art direction:** Procedurally generated 2.5D wrestler sprites rendered from the Python character system  
**Core UX principle:** **Facts are labels. Decisions are buttons.**

---

# 1. Product Goal

Faces & Heels should preserve the depth of the wrestling rules while making a turn feel fast, readable, dramatic, and game-like.

The player should experience:

> **Watch the match → make one meaningful choice → see the result → respond to the next meaningful opportunity.**

The player should not experience:

> category → move → target → modifier → resource → confirm → roll → acknowledge → continue

unless each of those steps represents a genuine choice.

The rules engine can remain complex. The player-facing flow should not feel complex.

---

# 2. Design Pillars

## 2.1 Arena First

The ring and wrestlers are the primary visual content. UI hugs the edges and bottom of the screen instead of competing with the match.

Target visual allocation during normal play:

- Ring / wrestlers / animation: **60–72%**
- Permanent HUD: **10–15%**
- Contextual decision area: **18–25%**
- Modal/full-screen UI: **0% during routine turns**

## 2.2 Only Real Decisions Become Controls

For every rules question, the UI applies the **0 / 1 / many rule**:

- **0 legal values:** hide or disable the action with a concise reason.
- **1 legal value:** auto-select it and show it as information.
- **2–4 legal values:** show direct touch choices.
- **5+ legal values:** show a compact filtered drawer or carousel.

Examples:

- Forearm Smash can only hit Head → **no target picker**.
- Dragon Screw may target either leg → show **LEFT LEG / RIGHT LEG**.
- A move has a fixed stamina cost → show the cost; do not ask the player to approve it.
- A move requires the opponent standing → hide it while the opponent is prone, or show it locked if teaching the requirement is useful.
- Only one reaction is legal → show **REACTION NAME / PASS** instead of opening a reaction browser.

## 2.3 One Decision Zone

Nearly all active player interaction occurs in one bottom **Action Dock**.

The dock changes according to match state:

- normal turn → legal moves
- target required → legal targets
- reaction window → legal reactions
- pin opportunity → Pin Now / Continue
- submission decision → relevant submission choices
- kickout → kickout controls
- optional boost → boost controls
- results → brief Continue only when automatic continuation would be confusing

The player learns one place to look for “what can I do now?”

## 2.4 Information Is Progressive

Information is divided into four priorities:

### Critical
What must be decided now.

### Important
Stamina, Pop/Heat, turn owner, major condition, signature/finisher readiness.

### Useful
Target, cost, power, odds, modifiers.

### Reference
Body map, exact formulas, move description, history, glossary.

Only **Critical + Important** deserve permanent space.

## 2.5 Spectacle Replaces Dialogs

Game events should appear as animated match feedback rather than form dialogs.

Examples:

- FOREARM SMASH!
- CRITICAL!
- HEAD +1
- STAGGERED
- PIN OPPORTUNITY
- KICKOUT AT 2!
- FINISHER READY

These overlays appear over or near the ring, then disappear automatically.

---

# 3. Visual Architecture

The match view has five layers.

## Layer A — Permanent Fighter HUD

Always visible.

Left side: Player / active wrestler  
Right side: Opponent

Each compact fighter HUD contains:

- small portrait
- wrestler name
- stamina bar + numeric value
- Pop or Heat pips
- one compact major-status line/icon
- signature/finisher readiness indicator when relevant

Do **not** permanently display:

- full body damage
- every condition
- full move modifiers
- dice math
- long move descriptions

## Layer B — Arena Stage

Dominant central region.

Contains:

- ring
- background crowd
- wrestler sprites
- animation FX
- contextual anchor indicators only when required
- dice/result presentation
- temporary event text

The arena must remain visible through nearly the entire turn.

## Layer C — Contextual Action Dock

Bottom decision zone.

Default content:

- 2–4 immediately useful move cards
- optional lightweight category filters when needed
- secondary “More” control for utility/reference actions

The dock should **not** become a vertically scrolling app menu during normal play.

## Layer D — Transient Event Layer

Appears above the arena.

Used for:

- roll
- result
- damage
- status change
- opportunity prompts
- signature/finisher availability
- dramatic match moments

These overlays should disappear without requiring acknowledgment unless the rules require a new decision.

## Layer E — Detail Drawer

Opened intentionally by the player.

Used for:

- body status
- move details
- wrestler sheet
- exact dice breakdown
- match log
- glossary/help

Detail UI overlays or slides over the match without navigating away from it.

---

# 4. Canonical Match Screen

## 4.1 Portrait Mobile

Reference design size: **390 × 844 CSS px**

Structure:

```text
┌──────────────────────────────────────┐
│ STONE ███████ 72     51 █████ VIPER │
│ ★★★ POP             HEAT 🔥🔥🔥     │
├──────────────────────────────────────┤
│                                      │
│                                      │
│              THE RING                │
│                                      │
│        procedural wrestler sprites   │
│                                      │
│                                      │
├──────────────────────────────────────┤
│ STONE'S TURN                         │
│                                      │
│ [FOREARM] [HEADLOCK] [IRISH WHIP]   │
│ [        ★ FLASHPOINT DRIVER       ] │
└──────────────────────────────────────┘
```

The permanent HUD should consume approximately **90–110 px**.

The action dock should usually consume **150–210 px**.

Everything between belongs to the match.

## 4.2 Landscape Phone

Reference: **844 × 390**

- Fighter HUDs remain in the top corners.
- Arena consumes center 70%+ of screen.
- Action dock becomes a horizontal strip across the bottom.
- Move cards use icons + short labels.
- Detail information appears in side drawers rather than bottom sheets where possible.

## 4.3 Tablet Landscape

Reference: **1194 × 834**

- Ring remains centered.
- Fighter HUDs may expand slightly to include one more status line.
- Action dock remains compact rather than becoming desktop-sized.
- Body-status and match-history drawers can open as side panels.
- Do not fill extra tablet space with permanent information simply because room exists.

## 4.4 Desktop

Reference: **1440 × 900**

Desktop should preserve the console/mobile game composition.

Do not revert to an admin/dashboard layout.

Optional side panels may appear only when the user opens them.

---

# 5. Turn Flow

The core turn loop is:

```text
TURN START
    ↓
ACTION CHOICE
    ↓
ONLY IF NEEDED: TARGET / VARIANT / RESOURCE CHOICE
    ↓
ROLL / RESOLUTION
    ↓
ANIMATION + IMPACT
    ↓
RESULT
    ↓
ONLY IF CREATED: OPPORTUNITY / REACTION
    ↓
TURN HANDOFF
```

The system should automatically skip every unnecessary state.

---

# 6. Match UX State Machine

## 6.1 TURN_START

Purpose:
- establish whose turn it is
- refresh legal actions
- briefly pulse active wrestler HUD

UI:
- active HUD highlight
- small “STONE'S TURN” banner
- legal action cards populate

Duration:
- 250–450 ms visual transition
- no confirmation tap

Transition:
- automatically → ACTION_SELECT

## 6.2 ACTION_SELECT

Purpose:
- player selects an actual move or meaningful high-level action

UI:
- 2–4 move cards
- category filters only if the move set is too large
- unavailable strategic goals may remain visible in a locked state with a reason

Example:

```text
FOREARM SMASH
Strike · Head
6 STA

HEADLOCK
Grapple · Control
5 STA

IRISH WHIP
Grapple · Reposition
4 STA
```

Primary interaction:
- tap = select
- press/hold or info affordance = move details

Transition logic:
- if selected move has no unresolved player choices → RESOLUTION_READY
- if one unresolved choice exists → CHOICE_REQUIRED
- if multiple sequential real choices exist → CHOICE_REQUIRED until resolved

## 6.3 CHOICE_REQUIRED

Used only for a genuine decision.

Examples:
- left leg vs right leg
- choose one of multiple legal reactions
- optional spend of Pop/Heat
- choose legal reposition destination
- choose submission branch if the rules actually allow a choice

UI:
- replace action cards with direct choices
- provide Back if returning is rules-safe

Example:

```text
DRAGON SCREW

Choose target

[ LEFT LEG ]    [ RIGHT LEG ]
```

Do not show:
- fixed cost selector
- fixed damage type
- fixed body part
- one-item option lists

## 6.4 RESOLUTION_READY

Purpose:
- show a compact final intent summary without creating a mandatory confirmation screen unless accidental activation would be costly

Preferred behavior:
- move card expands in place
- resolved facts appear as labels
- one primary action appears

Example:

```text
FOREARM SMASH
STRIKE · HEAD

6 STA        POWER +2

[ Boost ]        [ ROLL d20 ]
```

The target is information, not a control.

For low-risk common actions, the game may allow:
- tap move → immediately roll

This can become an advanced setting after testing.

## 6.5 ROLLING

Purpose:
- make the dice feel like part of the match

UI:
- most controls fade
- translucent or stylized d20 appears over the arena
- die animates quickly
- final number snaps into focus
- arithmetic remains secondary

Example:

```text
       d20
       18

FOREARM SMASH
SUCCESS
```

Optional small line:
`18 + Power 2 vs 15`

Do not permanently dedicate a side panel to dice.

## 6.6 ANIMATING

Purpose:
- show the move

UI:
- Action Dock collapses or fades
- Fighter HUD remains visible but reduced in emphasis
- sprite animation plays
- camera/FX support the impact

No user controls unless the rules explicitly contain an interrupt/reaction window.

## 6.7 IMPACT

At the authored impact frame:

- 60–90 ms hit stop for major strikes
- short camera shake
- impact flash
- optional particle burst
- crowd response
- damage/status update

Text example:

```text
FOREARM SMASH!
HEAD +1
STAGGERED
```

The feedback should appear for approximately 700–1200 ms depending on importance.

## 6.8 OPPORTUNITY

Entered only if the resolved action creates a new player decision.

Examples:

```text
PIN OPPORTUNITY

[ PIN NOW ]     Continue
```

or:

```text
FINISHER READY

[ FLASHPOINT DRIVER ]
Continue
```

Opportunity prompts may partially cover the bottom of the arena but should not become modal dialogs.

## 6.9 REACTION

When the opponent has a legal response, the same Action Dock becomes the reaction dock.

Example:

```text
VIPER CAN REACT

[ COUNTER ]  [ ROPE ESCAPE ]  [ PASS ]
```

One legal reaction:

```text
VIPER CAN COUNTER

[ COUNTER ]            Pass
```

Do not open a separate reaction screen.

## 6.10 TURN_HANDOFF

- resolved overlays clear
- state updates
- opposing HUD pulses
- Action Dock refreshes for the next actor

No Continue button unless pacing or multiplayer synchronization requires one.

---

# 7. Decision Compression Rules

These rules should be implemented centrally, not screen by screen.

## Rule DC-01 — Fixed Target

If a move has exactly one legal target:

```text
target = auto-select
UI = label only
```

Example:
Forearm Smash → Head

## Rule DC-02 — Fixed Cost

If stamina/resource cost is fixed:
- display it
- validate affordability
- deduct during resolution
- do not ask player to choose it

## Rule DC-03 — Fixed Position Outcome

If a move always causes a known position/state:
- resolve automatically
- communicate as result feedback

## Rule DC-04 — Optional Resource Spend

Default optional spending to **none**.

Expose as:
- Boost
- Spend Pop
- Spend Heat
- Advanced

Do not interrupt every move with an optional-resource screen.

## Rule DC-05 — Legal Move Visibility

Recommended behavior:

- transiently impossible move → hide from primary dock
- strategically important locked move → show locked with short requirement
- signature/finisher goal → may remain visible as a progress target

Example:
`FLASHPOINT DRIVER — needs 3 Pop`

## Rule DC-06 — Auto-Advance

If the player has no decision after a result:
- automatically continue to the next state.

## Rule DC-07 — Meaningful Cancel

Back/Cancel exists only before an irreversible resolution.

Once the dice roll resolves or an online opponent receives the action, do not provide a fake cancel.

---

# 8. Action Dock Specification

## 8.1 Move Card Anatomy

Minimum card:

```text
[ICON] FOREARM SMASH
       Head · 6 STA
```

Optional third datum:
- success indicator
- power
- status icon

Never show more than three compact pieces of metadata on the collapsed card.

## 8.2 Card Priority

Cards should be ordered by:

1. contextually recommended / core legal actions
2. recently used or wrestler-signature actions
3. situational actions
4. utility actions behind More

Do not reorder wildly every turn. Preserve muscle memory where practical.

## 8.3 Number of Visible Cards

Phone:
- ideal: 3
- acceptable: 2–4

Tablet/desktop:
- ideal: 3–5

If more actions exist:
- horizontal carousel
- category filter
- More drawer

Avoid a long vertical list.

## 8.4 Categories

Categories are optional **filters**, not mandatory navigation.

Example:

`ALL   STRIKE   GRAPPLE   SPECIAL`

If a category contains only one useful move, the game may surface that move directly.

## 8.5 Press and Hold

Press/hold or explicit info tap opens:

- full move description
- exact target logic
- exact cost
- modifiers
- special effects
- requirements
- rules wording

This supports new players without slowing experienced players.

---

# 9. Fighter HUD Specification

Each fighter HUD must communicate state in under one second.

## Required

- portrait
- name
- stamina bar
- stamina numeric value
- Pop or Heat
- active-turn highlight
- one major status state

## Conditional

- damaged body-part alert
- signature ready
- finisher ready
- prone / stunned / controlled
- submission danger
- pin danger

## Example

```text
STONE
████████░░ 72
★★★ POP
⚠ RIGHT ARM
```

## Body Damage

Full limb/body bars are not permanent.

If a body part becomes relevant:
- show a compact warning
- briefly highlight that region
- allow portrait tap → full Body Status drawer

---

# 10. Body Status Drawer

Opened by tapping wrestler HUD/portrait.

Contains:

- front/back procedural body diagram
- Head
- Neck
- Core
- Left Arm
- Right Arm
- Left Leg
- Right Leg
- Feet if the rules require them
- current conditions
- relevant damage thresholds

Use color plus icon/text.

Never rely only on red/orange/green.

The drawer closes without changing match state.

---

# 11. Roll Presentation

Dice are entertainment, not bookkeeping.

## Visual Sequence

1. selected move compresses toward arena
2. die appears
3. 300–550 ms roll
4. result snaps
5. SUCCESS / FAILURE / CRITICAL appears
6. animation begins quickly

Target total time before move animation:
**approximately 600–900 ms**

## Arithmetic

Default:
- show final die
- show result

Optional compact breakdown:
`18 + 2 vs 15`

Exact formula remains available in detail/history.

---

# 12. Event Feedback System

Event feedback is divided into three levels.

## Minor
Examples:
- STA -4
- Head +1
- Position changed

Duration:
400–750 ms

Presentation:
small chip/text near affected fighter.

## Major
Examples:
- STAGGERED
- COUNTER!
- SIGNATURE READY
- ROPE BREAK

Duration:
700–1200 ms

Presentation:
large central or near-character banner.

## Spectacle
Examples:
- CRITICAL!
- FINISHER CONNECTS!
- KICKOUT AT 2!
- PINFALL!
- MATCH WON

Duration:
1000–2200 ms

Presentation:
full arena treatment, stronger camera/lighting/audio.

---

# 13. Color System

## Foundation

| Token | Color | Use |
|---|---|---|
| `bg.game` | `#050A12` | global background |
| `bg.arenaChrome` | `#08111D` | HUD surrounding arena |
| `surface.1` | `#0C1725` | cards |
| `surface.2` | `#132236` | raised/selected cards |
| `line.subtle` | `#263A52` | borders |
| `text.primary` | `#F5F8FC` | primary text |
| `text.secondary` | `#A3B4C8` | metadata |
| `text.muted` | `#71849A` | tertiary text |

## Gameplay Roles

| Token | Color | Meaning |
|---|---|---|
| `face.blue` | `#2DBBFF` | Face/player-positive, turn focus |
| `heel.red` | `#FF405F` | Heel/opponent/aggression |
| `spotlight.gold` | `#FFC72C` | signatures, finishers, pin opportunity |
| `success.green` | `#38D996` | successful outcome |
| `warning.orange` | `#FF9F43` | low stamina, danger |
| `submission.purple` | `#A65CFF` | submission/control mechanics |
| `critical.white` | `#FFFFFF` | impact flash |
| `disabled.gray` | `#526174` | unavailable |

## Rules

- Blue and red identify sides/roles but never replace labels.
- Gold is rare and valuable.
- Green is reserved for resolution/availability, not general decoration.
- Purple should remain mechanically meaningful.
- Avoid rainbow-card UI where every action has an unrelated color.
- The arena is darker than the controls so actions remain readable.

---

# 14. Typography

Use a two-level typography strategy.

## Display / Match Callouts

Purpose:
- move names
- CRITICAL
- PINFALL
- turn banners

Style:
- condensed, bold, high-impact
- uppercase where appropriate

## System / HUD

Purpose:
- stats
- costs
- labels
- accessibility
- detail drawers

Recommended initial stack:
`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Use bundled display fonts only after licensing/performance are settled.

Minimum practical sizes:

- body metadata: 12–13 px
- interactive card metadata: 13–14 px
- action label: 15–18 px
- HUD name: 14–18 px
- major event: 28–48 px depending on viewport

---

# 15. Touch and Interaction

Minimum touch target:
**48 × 48 CSS px**

Preferred primary action height:
**54–64 px**

Move cards:
**68–86 px** high on portrait mobile

Input feedback:
- pressed state within 50 ms
- scale or brightness response
- optional subtle sound
- haptic/vibration only where platform support exists

No hover dependency.

---

# 16. Motion Language

Motion should communicate state, not decorate everything.

## Standard Durations

| Interaction | Duration |
|---|---:|
| button press | 70–100 ms |
| dock content change | 160–220 ms |
| bottom sheet/drawer | 220–300 ms |
| turn pulse | 250–450 ms |
| roll animation | 300–550 ms |
| hit stop | 60–90 ms |
| camera shake | 120–220 ms |
| minor event text | 400–750 ms |
| major event | 700–1200 ms |

## Principles

- actions move toward the arena
- results burst outward from impact
- drawers slide from screen edges
- no slow page transitions during a turn
- respect Reduced Motion

---

# 17. Procedural Sprite Animation Direction

The existing Python wrestler renderer is the source art system.

The current renderer already has:

- independent head
- torso
- upper/lower arms
- hands
- upper/lower legs
- boots
- costume pieces
- named joint coordinates
- faceted pseudo-3D geometry
- lighting
- procedural background
- supersampling

The next version should separate **character definition**, **pose**, **animation**, and **rendering**.

---

# 18. Sprite Skeleton

Recommended logical joints:

```text
root
pelvis
spine_lower
spine_upper
neck
head

left_shoulder
left_elbow
left_wrist
left_hand

right_shoulder
right_elbow
right_wrist
right_hand

left_hip
left_knee
left_ankle
left_foot

right_hip
right_knee
right_ankle
right_foot
```

Optional contact anchors:

```text
head_grab
neck_grab
left_shoulder_grab
right_shoulder_grab
chest_center
waist_center
left_wrist_grab
right_wrist_grab
left_knee_target
right_knee_target
left_ankle_target
right_ankle_target
```

---

# 19. Character Definition

Character appearance must be separate from animation.

Example conceptual data:

```json
{
  "id": "stone",
  "proportions": {
    "height": 1.0,
    "shoulders": 1.08,
    "chest": 1.10,
    "arms": 1.05,
    "legs": 1.00,
    "hands": 1.08,
    "boots": 1.07
  },
  "appearance": {
    "skin": "#DE8B4C",
    "hairStyle": "long",
    "hairColor": "#F7C33E",
    "facialHair": "handlebar"
  },
  "gear": {
    "primary": "#D0182D",
    "secondary": "#FFC11B",
    "boots": "#FFC11B"
  }
}
```

Any character using the supported skeleton should be able to play the same animation clip.

---

# 20. Pose Model

A Pose contains:

- joint positions and/or rotations
- root position
- root facing
- optional scale adjustments
- contact-anchor overrides
- expression state

The renderer must not hard-code the wrestling stance inside `draw_character()`.

Instead:

```text
draw_character(character_definition, pose, camera)
```

---

# 21. Animation Clip Format

Each move is a sequence of keyframes.

Example concept:

```json
{
  "id": "forearm_smash",
  "fps": 15,
  "durationMs": 720,
  "events": [
    { "timeMs": 310, "type": "impact" }
  ],
  "tracks": {
    "attacker": [
      { "timeMs": 0, "pose": "ready" },
      { "timeMs": 130, "pose": "forearm_windup" },
      { "timeMs": 310, "pose": "forearm_impact" },
      { "timeMs": 500, "pose": "forearm_followthrough" },
      { "timeMs": 720, "pose": "ready" }
    ],
    "defender": [
      { "timeMs": 0, "pose": "ready" },
      { "timeMs": 310, "pose": "head_hit" },
      { "timeMs": 510, "pose": "recoil" },
      { "timeMs": 720, "pose": "staggered" }
    ]
  }
}
```

The game engine uses the authored `impact` event to synchronize:

- hit stop
- flash
- sound
- camera shake
- damage text
- state changes

---

# 22. Paired Wrestling Animations

Grapples require coordinated attacker and defender timelines.

Examples:

- lockup
- headlock
- Irish whip
- body slam
- vertical suplex
- German suplex
- submission
- pin
- kickout

Each paired animation defines:

- attacker root transform
- defender root transform
- attacker pose
- defender pose
- contact anchors
- authored event markers

Both tracks share the same timeline.

---

# 23. Sprite Export

Recommended initial art FPS:
**15 fps**

Acceptable:
**12–18 fps**

Runtime UI can still render at 60 Hz.

Recommended transparent frame canvas:
- mobile standard: 512 × 512 per wrestler
- high-detail/paired moves: 768 × 768 if needed

Use:
- transparent PNG atlas initially
- WebP atlas when quality/support testing is complete
- JSON metadata per atlas

Metadata should include:

```json
{
  "animation": "forearm_smash",
  "fps": 15,
  "frameCount": 12,
  "frames": [],
  "origin": [256, 470],
  "events": {
    "impact": 5
  }
}
```

---

# 24. Sprite Runtime

Recommended first implementation:
**HTML Canvas 2D**

Responsibilities:

- draw arena background
- draw wrestler frames
- apply root position
- horizontal flip when appropriate
- camera zoom/pan
- flash
- shake
- simple particles
- shadows
- transient text

Use `requestAnimationFrame()` for the presentation loop.

Sprite animation frame advancement may run at 12–18 fps while the compositor stays at display refresh rate.

---

# 25. Animation Production Priority

## Phase A — Core States

1. idle
2. ready
3. hit head
4. hit body
5. stagger
6. prone
7. get up
8. victory
9. defeated

## Phase B — Core Actions

1. Forearm Smash
2. basic grapple lockup
3. Headlock
4. Irish Whip
5. Body Slam
6. Vertical Suplex
7. Pin
8. Kickout

## Phase C — Personality

1. taunts
2. signature setup
3. finisher
4. crowd celebration
5. entrance poses

Do not attempt the entire move library before one polished match loop works.

---

# 26. Impact Effects

The sprite art should be supported by inexpensive effects.

Recommended stack:

- 60–90 ms hit stop
- 2–5 px camera shake on phone
- 1–2 frame white impact flash
- small radial line burst
- mat/ring bounce
- crowd brightness pulse
- short particle burst
- audio impact layer
- optional controller/device vibration where supported

These effects should be generated by the game runtime, not baked into every sprite sheet.

---

# 27. Gamification Without Changing Rules

The UX can feel more game-like without inventing new mechanics.

Use existing match information as spectacle:

## Pop / Heat

Represent as:
- stars
- flames
- meter glow
- crowd lighting

When it changes:
- pip animates
- crowd reacts
- brief "+POP" / "+HEAT" indicator

## Signature / Finisher Availability

When the existing rules say it becomes available:
- gold rim pulse
- short audio sting
- card moves into a priority position
- temporary FINISHER READY event

## Damage

Do not add arbitrary health bars if the rules use body damage.

Instead:
- body region warning
- reaction animation
- color/intensity change
- condition label

## Match Momentum

Only visualize a momentum system if it already exists in the rules or is explicitly added later.

Do not invent hidden modifiers merely for the HUD.

---

# 28. Tutorial and Learnability

New players should learn by playing.

## First Use

The first time a UI concept appears:

- brief one-line hint
- no blocking tutorial page

Examples:

`Hold a move to see full rules.`

`Gold actions are signatures or finishers.`

`Only legal choices are shown here.`

## Repeated Use

Hints disappear.

A Help/Rules drawer remains available.

---

# 29. Accessibility

Required:

- 48 px minimum touch targets
- no meaning conveyed by color alone
- readable contrast
- scalable text where feasible
- reduced motion option
- sound-independent result feedback
- animation-independent state text
- high-contrast focus state for keyboard/assistive use
- landscape and portrait support
- safe-area support for notches/home indicators

Example:
`🔥 HEAT 3` rather than three unlabeled red icons alone.

---

# 30. Audio UX

Audio should reinforce state.

Suggested categories:

- UI tap
- legal selection
- unavailable selection
- dice roll
- impact light
- impact heavy
- mat slam
- crowd rise
- crowd boo
- signature ready
- finisher ready
- kickout
- pinfall
- victory

Audio must never be required to understand the result.

---

# 31. PWA Performance Budgets

Target:

- UI response after touch: **<100 ms**
- visual compositor: **60 fps where device allows**
- no long main-thread tasks during routine interaction
- preload only current wrestlers + likely next animations
- lazy-load rare move atlases
- minimize layout shifts
- avoid full-DOM rerender for each sprite frame

Initial asset target per active match:
- keep loaded animation/image assets practical for mobile memory
- unload or cache rare move atlases intelligently
- prefer compressed atlases after visual validation

---

# 32. Match Logging

The game should maintain a detailed rules log without making it permanent HUD.

Log examples:

```text
Stone selected Forearm Smash.
Target auto-resolved: Head.
Roll: 18 + Power 2 vs Defense 15.
Success.
Viper Head +1.
Viper became Staggered.
```

Accessible through:
`More → Match Log`

This preserves tabletop transparency while keeping the main screen clean.

---

# 33. Error and Rule Feedback

Errors should be local and short.

Bad:
`Action could not be performed due to invalid state.`

Good:
`Needs opponent standing.`

Bad:
full modal explaining insufficient stamina.

Good:
move card disabled:
`Needs 8 STA`

If a server/rules error occurs:
- preserve current match state
- show a compact error banner
- provide Retry
- do not silently advance the turn

---

# 34. Example: Forearm Smash

Rules facts:
- category: Strike
- only target: Head
- fixed stamina cost
- power modifier
- may create status based on result

Player flow:

```text
ACTION DOCK
[ FOREARM SMASH ]
        ↓ tap

FOREARM SMASH
Head · 6 STA · Power +2

[ Boost ]        [ ROLL d20 ]
        ↓

d20 = 18
SUCCESS
        ↓

sprite animation
        ↓
impact marker
        ↓

FOREARM SMASH!
HEAD +1
STAGGERED
        ↓

next actual decision
```

No target screen.

---

# 35. Example: Dragon Screw

If both legs are legal:

```text
[ DRAGON SCREW ]
        ↓

CHOOSE TARGET

[ LEFT LEG ]  [ RIGHT LEG ]
        ↓

ROLL
        ↓

animation/result
```

If only the right leg is legal due to match state:

```text
[ DRAGON SCREW ]
        ↓

Target: RIGHT LEG
[ ROLL ]
```

No one-option target screen.

---

# 36. Example: Vertical Suplex Into Pin Opportunity

```text
[ VERTICAL SUPLEX ]
        ↓
roll
        ↓
paired sprite animation
        ↓
impact
        ↓
VIPER PRONE
        ↓
PIN OPPORTUNITY

[ PIN NOW ]    Continue
```

`PIN` is not a permanent match button.

---

# 37. Example: Reaction

Incoming move creates two legal reactions:

```text
STONE ATTACKS

VIPER CAN REACT

[ COUNTER ]  [ EVADE ]  Pass
```

If Counter is the only legal reaction:

```text
COUNTER AVAILABLE

[ COUNTER ]       Pass
```

No reaction browser.

---

# 38. Pin Presentation

Pin mode reuses the arena rather than switching to a dashboard.

During pin:

- sprites show pin position
- referee/count presentation overlays the ring
- normal action dock is replaced by pin controls
- fighter HUD remains visible

Example:

```text
          2!

     [ KICK OUT ]
```

If the rules include resource spending, expose only the legal current spend options.

After kickout:
- dramatic event
- sprites separate/recover
- Action Dock returns automatically

---

# 39. Submission Presentation

Submission state:

- paired sprite animation loops or holds
- body region under stress is highlighted
- dock presents only legal submission decisions
- stamina/body/status remain visible
- escape/result transitions happen without leaving the ring

Purple is the primary submission accent.

---

# 40. Navigation Outside the Match

Primary match screen should not carry full app navigation.

Use a compact menu for:

- Match Log
- Wrestler Details
- Rules
- Settings
- Exit Match

During critical animations/rolls, menu can remain available but should not visually compete.

---

# 41. Visual Hierarchy Rules

1. Wrestlers first.
2. Current decision second.
3. Match resources third.
4. Detailed rules fourth.
5. App navigation last.

If a screen violates that order, redesign it.

---

# 42. Anti-Patterns to Remove

Do not use:

- permanent giant Pin button
- permanent dice-results panel
- permanent body-part bars
- every rule state in separate boxed cards
- one-option selectors
- confirmation dialog after every move
- vertical lists of all moves during every turn
- simultaneous competing red/blue/gold/purple glows everywhere
- desktop-dashboard framing around the ring
- large empty card chrome
- unnecessary labels explaining obvious controls

---

# 43. Implementation Components

Recommended UI components:

```text
MatchScreen
├── FighterHUDLeft
├── FighterHUDRight
├── ArenaStage
│   ├── SpriteRenderer
│   ├── DiceOverlay
│   ├── EventOverlay
│   ├── ImpactFX
│   └── OpportunityOverlay
├── ActionDock
│   ├── MoveCard
│   ├── ChoiceButton
│   ├── CategoryFilter
│   └── SecondaryActions
├── BodyStatusDrawer
├── MoveDetailDrawer
├── MatchLogDrawer
└── MatchMenu
```

Rules logic should not live inside visual components.

---

# 44. UX Adapter Between Rules and UI

Introduce a UI-facing decision model.

Concept:

```text
Rules Engine
     ↓
Match State
     ↓
Decision Resolver
     ↓
UI Decision Model
     ↓
HUD
```

The Decision Resolver determines:

- current actor
- legal actions
- hidden impossible actions
- visible locked actions
- unresolved choices
- auto-resolved facts
- opportunities
- reactions
- event text
- next automatic transition

This prevents the UI from reimplementing the rules.

---

# 45. Suggested UI Decision Model

Conceptual structure:

```json
{
  "phase": "ACTION_SELECT",
  "actorId": "stone",
  "actions": [
    {
      "id": "forearm_smash",
      "label": "Forearm Smash",
      "category": "strike",
      "cost": { "stamina": 6 },
      "resolvedFacts": {
        "target": "head"
      },
      "choices": [],
      "enabled": true
    }
  ],
  "opportunity": null,
  "reaction": null
}
```

The HUD renders this model.

It does not inspect raw rule tables directly.

---

# 46. Acceptance Criteria — Smart Flow

A build passes Smart Flow when:

- Forearm Smash never asks which body part to hit if Head is its only legal target.
- Fixed stamina cost is never presented as a choice.
- A single legal reaction does not open a reaction list.
- Pin is not permanently visible when pinning is impossible.
- A pin opportunity appears immediately after the rules create one.
- Optional resource spend defaults to none.
- Routine turns require no unnecessary confirmation.
- Full rules remain accessible on demand.

---

# 47. Acceptance Criteria — HUD

A build passes HUD quality when:

- the ring is the largest visual element
- wrestler state can be understood in under one second
- no more than 2–4 primary decisions usually compete at once on phone
- permanent UI does not obscure wrestler animation
- dice does not occupy permanent screen real estate
- body status is available but not always expanded
- major events are readable without opening a log
- colors have consistent semantic meaning

---

# 48. Acceptance Criteria — Sprite Animation

A build passes the first animation milestone when:

- the same character definition can render idle and at least four different poses
- pose is external to character drawing code
- Forearm Smash renders attacker + defender frames
- impact has an authored event marker
- the browser can play the exported sprite animation smoothly
- wrestler colors/gear stay consistent across frames
- feet/root do not visibly drift during stationary animations
- paired grapple contact is believable at phone scale
- animation can trigger runtime hit stop/flash/shake at the impact marker

---

# 49. Vertical Slice: “One Great Turn”

The first production milestone should include only enough content to prove the full experience.

## Wrestlers
- Stone
- Viper

## States
- standing
- staggered
- prone
- pinning

## Moves
- Forearm Smash
- Headlock
- Vertical Suplex

## Match interactions
- one target-choice example
- one reaction example
- one pin opportunity
- one kickout sequence

## Presentation
- new permanent HUD
- new Action Dock
- dice overlay
- procedural sprite animations
- hit stop
- camera shake
- impact text
- Pop/Heat visual feedback
- body-status drawer
- move-detail drawer
- match log

The milestone is successful when one complete turn feels polished enough that adding more moves is primarily content work, not another UX redesign.

---

# 50. Development Order

## Phase 1 — Rules/UI Adapter
Implement the Decision Resolver and 0/1/many choice policy.

## Phase 2 — Static HUD
Build fighter HUDs, arena stage, action dock, drawers, event layer.

## Phase 3 — Sprite Refactor
Refactor the Python renderer into:
- CharacterDefinition
- Skeleton
- Pose
- AnimationClip
- Renderer
- Exporter

## Phase 4 — First Animations
Export:
- idle
- Forearm Smash
- hit reaction
- Vertical Suplex
- prone
- pin
- kickout

## Phase 5 — Runtime Animation
Canvas sprite player + event markers + impact FX.

## Phase 6 — Full Vertical Slice
Wire rules → smart decisions → roll → animation → result → opportunity → next turn.

## Phase 7 — Responsive Pass
Phone portrait, phone landscape, tablet landscape, desktop.

## Phase 8 — Content Expansion
Add moves and wrestlers only after the vertical slice passes usability testing.

---

# 51. Final Product Principle

Faces & Heels should feel like a wrestling game that happens to contain a deep rules engine, not a rules application decorated with wrestlers.

The desired experience is:

> **See the match. Make the decision. Feel the impact.**

Everything in the HUD, animation system, color language, and flow should reinforce those three beats.
