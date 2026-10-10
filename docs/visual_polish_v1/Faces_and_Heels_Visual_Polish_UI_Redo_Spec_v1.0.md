# Faces & Heels — Visual Polish + Button + Overall UI Redo Specification v1.0

**Target build:** next major visual pass after v0.9 Contact & Impact  
**Scope:** Procedural wrestler graphics, arena, VFX, camera, HUD, buttons, action dock, typography, spacing, and overall presentation  
**Existing architecture retained:** procedural Python sprite generation + Canvas runtime + Smart Flow decision compression  
**Core UX principle retained:** **Facts are labels. Decisions are buttons.**  
**Visual target:** **Stylized Arcade Wrestling Figures** — simplified enough to animate and read on mobile, polished enough to feel like a commercial game.

---

# 1. Executive Review of v0.9

v0.9 proves the animation architecture, Smart Flow, paired root motion, and contextual HUD. The next weakness is not rules or interaction logic; it is **presentation quality**.

The current screen and sprite system read as a capable prototype because:

1. wrestler anatomy is constructed from clearly visible geometric modules;
2. muscles are represented as line divisions rather than sculpted masses;
3. limbs meet at obvious seams;
4. faces, hair, boots, pads, and gear are readable but not materially rich;
5. lighting is mostly flat and local rather than arena-driven;
6. the ring/crowd/background are functional but do not create spectacle;
7. buttons are still visually similar to web-app controls;
8. the action dock contains too much bordered chrome;
9. category filters compete with actual moves;
10. impact effects are present but not yet strong enough to disguise simplified sprite motion;
11. typography and card framing do not yet feel fully integrated with the wrestler art.

The redesign must address **character rendering + arena + effects + UI at the same time**.

---

# 2. Overall Art Direction

## Name

**Stylized Arcade Wrestling Figures**

## Visual references in principle

Use the production advantages of:

- low-poly / toy-like characters;
- exaggerated arcade fighting-game silhouettes;
- collectible wrestling action figures;
- mobile combat HUDs;
- comic-book impact effects.

Do **not** imitate any one existing game's copyrighted visual identity.

## Character goals

At phone scale, every wrestler should read by:

- silhouette;
- hair/headgear;
- color scheme;
- body type;
- signature gear;
- stance.

## Rendering goals

The sprites should look intentionally designed, not merely procedurally assembled.

Use:

- large readable forms;
- beveled/faceted surfaces;
- 3-tone shading;
- contact shadows;
- rim lighting;
- restrained specular highlights;
- strong gear color blocking;
- minimal but effective seams/detail;
- slight perspective exaggeration.

---

# 3. Character Geometry Redesign

## 3.1 Torso

### Current issue
The chest is visibly subdivided into rectangular muscle cells, making the body resemble a segmented toy prototype.

### Redo
Build the torso from 3–5 large sculptural masses:

- upper chest / clavicle shelf;
- ribcage;
- abdominal wedge;
- left/right lat silhouette;
- pelvis/trunk transition.

### Shape rules
- shoulders wider than hips;
- chest depth emphasized by side-face shadow;
- centerline should be subtle;
- abdominal definition should be implied by planes/shadows, not outlined six-pack boxes;
- waist should taper more dramatically.

---

# 4. Shoulder and Arm Redesign

## Current issue
Upper arms and forearms read as independent tubes/blocks.

## Redo

### Shoulder
Use a capped deltoid shape overlapping the upper arm.

### Upper arm
Taper from shoulder to elbow.

### Forearm
Wider near elbow, narrower near wrist, with one highlight plane.

### Hands
Increase size 5–10% and simplify fingers into graphic fist/glove masses.

### Joint treatment
Hide visual seams through:
- overlap;
- dark contact shadow;
- wrist/armband placement;
- elbow pad where appropriate.

---

# 5. Leg and Boot Redesign

## Thighs
Use stronger front/side planes and a clear knee transition.

## Lower legs
Taper toward ankle.

## Knees
Pads should sit over the leg rather than appear painted on.

## Boots
Boots are one of the strongest identity features and should be upgraded significantly.

Add:
- sole;
- toe cap;
- shin panel;
- top cuff;
- 2–3 simplified lace/strap marks;
- secondary-color inset;
- subtle highlight plane.

Oversize boots approximately 5–8% over realistic proportions.

---

# 6. Head, Face, Hair and Facial Hair

## Face

Maintain simplified avatar readability.

Add:
- brow ridge;
- cheek/jaw planes;
- clearer nose wedge;
- stronger jaw;
- small shadow under lower lip;
- expression variants.

Avoid realistic skin rendering.

## Eyes

Use:
- white/cream eye shape;
- dark iris/pupil;
- brow angle to carry expression.

## Hair

Hair must be built as 3–7 overlapping masses:
- crown;
- side masses;
- rear mass;
- loose strands only where silhouette benefits.

Use:
- darker underside;
- midtone body;
- narrow highlight strip.

## Mustache / beard

Treat facial hair as a designed silhouette, not a flat color mark.

---

# 7. Gear and Material System

Each material must have a distinct rendering recipe.

## Skin
- warm midtone;
- cooler/darker shadow;
- small warm highlight;
- subtle arena rim light;
- strongest specular only on shoulder/chest/forearm.

## Fabric trunks / pads
- mostly matte;
- edge highlight;
- seam line only where useful;
- graphic panels should be large and readable.

## Boots
- slightly glossier than fabric;
- clear sole;
- shin highlight.

## Hair
- broad grouped highlight;
- darker internal layer.

## Metallic accessories, if used
- high contrast;
- tiny bright highlight;
- no large smooth gradient.

---

# 8. Lighting Model v2

Every sprite render should receive a consistent arena-light rig.

## Key light
Warm-neutral overhead/front light.

## Fill
Low-intensity cool front fill.

## Face rim
Cyan/blue edge light from one arena side.

## Heel rim
Red/magenta edge light from opposite side.

## Contact/AO shadow
Add darkening where surfaces meet:
- chin/chest;
- arm/torso;
- trunks/thighs;
- knee pad/leg;
- boot/ankle;
- grabbing hand/opponent.

## Ground shadow
Each wrestler gets a soft, elliptical contact shadow.

## Important
Rim colors come from arena lighting, not wrestler allegiance. They should not recolor skin or gear.

---

# 9. Sprite Rendering Quality

## Supersampling
Continue rendering above final size and downsample with Lanczos.

Recommended:
- source: 3×–4×;
- runtime atlas frame: 512×512 standard;
- 768×768 for complex paired animations when required.

## Outline
Use a restrained dark contour only where needed to preserve silhouette.

Target:
- 1–2 final pixels at 512 px frame size;
- avoid thick cartoon sticker borders.

## Edge cleanup
No visible gaps between connected body pieces at normal playback scale.

---

# 10. Arena Redesign

The arena must be upgraded at the same time as the wrestlers.

## Ring

Improve:
- mat shading;
- subtle center spotlight;
- apron panels;
- turnbuckle forms;
- rope highlight/shadow;
- corner post depth.

## Crowd

Use three depth layers:

### Far crowd
Low-detail dark shapes.

### Mid crowd
Colored shirts, heads, signs.

### Near crowd
Larger silhouettes, occasional signs and arms.

## Atmosphere

Add:
- arena haze;
- spotlight cones;
- occasional camera-flash particles;
- colored crowd wash;
- darker vignette away from ring.

## Parallax

During camera push:
- far crowd moves least;
- ropes/mat move more;
- foreground FX move most.

---

# 11. VFX Redesign

## Strike impact
- 1-frame white flash;
- short directional streak;
- 6–12 impact particles;
- 60–80 ms hit stop;
- 2–4 px screen shake;
- defender recoil.

## Heavy slam
- larger radial ring;
- mat dust;
- 80–110 ms hit stop;
- vertical screen kick;
- ring bounce;
- crowd brightness pulse.

## Submission
- purple tension pulse;
- affected limb highlight;
- subtle vignette;
- minimal particles.

## Signature
- short gold energy sweep;
- background dims slightly;
- crowd lighting rises.

## Finisher
- arena light cut;
- gold/white title sting;
- camera push;
- heavier impact package;
- no excessive particle spam.

---

# 12. Camera Presentation

The camera should create perceived production value without requiring more sprite detail.

## Normal
Medium-wide full-ring presentation.

## Strike
3–6% push-in during windup.

## Grapple
6–10% push-in once contact begins.

## Suplex lift
Track upward slightly with defender.

## Slam
Quick downward camera kick, then settle.

## Pin
Lower, tighter framing.

## Kickout
Fast micro-zoom out on escape.

All camera moves must respect Reduced Motion.

---

# 13. Overall HUD Review

The current HUD has the right information architecture but too much visible card chrome.

## Keep
- mirrored fighter HUDs;
- arena dominance;
- contextual action dock;
- Smart Flow;
- body/status drawers;
- event overlays;
- contextual pin/reaction flow.

## Redo
- reduce borders;
- reduce nested boxes;
- reduce filter prominence;
- increase whitespace around actual decisions;
- use typography and lighting instead of rectangles to create hierarchy;
- make the action dock feel like a game control surface, not a form panel;
- visually connect HUD accents to arena lighting.

---

# 14. Overall Screen Redo

## 14.1 Permanent HUD

Reduce fighter HUD height by approximately 10–15%.

Use:
- portrait;
- name;
- one stamina bar;
- compact Pop/Heat pips;
- one status chip.

Remove decorative text such as redundant READY labels during routine play.

## 14.2 Arena

Increase visible arena height by approximately 8–15% on phone.

Allow sprites to overlap HUD-safe areas only during spectacle moves if they remain readable.

## 14.3 Action Dock

Normal state should feel visually lighter.

Preferred:
- section title;
- 2–4 move buttons/cards;
- no permanent explanatory sentence;
- category filters hidden until needed.

If there are four or fewer useful moves:
**do not show category filters at all.**

If more than four:
show a single filter icon or compact segmented filter.

## 14.4 Selected Move

Do not use three separate fact boxes.

Replace:

```text
Target box | Power box | Choice box
```

with one concise metadata line:

```text
HEAD  ·  5 STA  ·  POWER +2
```

Then:

```text
[ Boost ]                [ ROLL d20 ]
```

This removes web-form visual density.

---

# 15. Button System Redesign

This section is mandatory for the next implementation pass.

The existing UI uses many similar rounded bordered rectangles. The new system must establish clear button roles.

---

# 16. Button Type A — Primary Action

Examples:
- ROLL d20
- KICK OUT
- APPLY
- CONFIRM only when genuinely necessary

## Visual
- largest button in current decision area;
- high-contrast fill;
- minimal border;
- 56–64 px phone height;
- bold label;
- optional small secondary label.

## Color
Normal match primary:
- cool electric cyan/blue.

Special opportunity primary:
- gold.

Danger/destructive:
- red only when semantically appropriate.

## Motion
Press:
- scale to 0.975;
- highlight compresses;
- 80–100 ms.

Release:
- 120–160 ms spring back.

---

# 17. Button Type B — Move Button

Move controls should feel like game actions, not cards from a settings page.

## Anatomy

```text
[icon]  FOREARM SMASH              5 STA
        HEAD
```

## Visual
- dark raised surface;
- no full bright border by default;
- 3–4 px accent rail or corner glow;
- larger title;
- metadata muted;
- cost isolated.

## Category accents
- Strike: red accent;
- Grapple: cyan/blue accent;
- Submission: purple accent;
- Special/Signature: gold accent.

The entire button should **not** be filled with the category color.

---

# 18. Button Type C — Choice Button

For genuine choices only.

Examples:
- LEFT LEG / RIGHT LEG
- COUNTER / EVADE
- PIN NOW / CONTINUE

## Visual
- large text;
- short labels;
- same visual weight when choices are equivalent;
- one may become primary only if the rules clearly privilege it.

For binary body targets:

```text
LEFT LEG          RIGHT LEG
```

Use two large side-by-side segments.

---

# 19. Button Type D — Secondary / Utility

Examples:
- Boost;
- Back;
- More;
- Match Log;
- Body Status.

## Visual
- dark/transparent;
- subtle border or no border;
- smaller than primary;
- never competes with the current move.

Back should often be icon-only with accessible label.

---

# 20. Button Type E — Opportunity

Examples:
- PIN NOW
- FINISHER
- SIGNATURE

## Visual
Gold is reserved for these high-value moments.

Use:
- gold edge glow;
- restrained animated pulse;
- optional small star/crown/spark icon.

Do not permanently display gold controls.

---

# 21. Button Type F — Reaction

Examples:
- COUNTER
- ROPE ESCAPE
- PASS

## Visual
Use a clearly different reaction banner/state in the Action Dock.

The main reaction can use cyan/blue or white.
Pass remains secondary/ghost.

Do not use an entirely new page.

---

# 22. Button Type G — Locked / Unavailable

## Visual
- low contrast;
- no glow;
- no misleading hover;
- concise requirement.

Example:

```text
FLASHPOINT DRIVER
Needs 3 Pop
```

Do not put a lock icon on every unavailable move if the reason text is sufficient.

---

# 23. Button State Matrix

Every button must implement:

- default;
- pressed;
- selected;
- disabled;
- focus-visible;
- loading/resolving;
- success handoff where useful.

## Press feedback
Target: under 50 ms visible response.

## Focus
3 px high-contrast outline.

## Disabled
Must remain readable and explain why when strategically useful.

---

# 24. Button Density Rules

Phone portrait:
- 2–4 primary move buttons visible;
- no more than 1 primary CTA at once unless the state genuinely presents equivalent choices;
- minimum 48×48 touch target;
- preferred move height 64–76 px.

Landscape:
- action buttons can become a single horizontal row.

Tablet:
- do not expand buttons simply because space exists.

---

# 25. Typography Redo

Use fewer sizes, stronger hierarchy.

## Display
Move/event names:
- condensed bold;
- uppercase only for short dramatic labels.

## UI
System font initially.

## Hierarchy

- Event: 32–48 px
- Selected move: 20–26 px
- Move button title: 15–17 px
- HUD wrestler name: 14–16 px
- Metadata: 11–13 px
- Never use tiny 7–9 px text for critical information on the actual CSS layout.

---

# 26. Color Redo

Retain semantic palette but reduce simultaneous saturation.

## Base
- near-black navy;
- desaturated blue-gray surfaces.

## Arena accents
- cyan side light;
- magenta/red side light;
- warm white center.

## UI semantic colors
- Strike: red;
- Grapple: cyan;
- Submission: purple;
- Opportunity/Signature: gold;
- Success: green;
- Warning: orange.

## Rule
At any one moment, one accent color should dominate the current decision.

---

# 27. Selected-Move Redesign

### Current
Selected move screen includes multiple bordered fact boxes.

### Redo

```text
FOREARM SMASH
Strike

HEAD · 5 STA · POWER +2

Optional: +1 Pop Boost

[ Boost ]                       [ ROLL d20 ]
```

Target is text because it is fixed.

If target is not fixed, the target-choice state appears before this screen.

---

# 28. Move Browser Redesign

## If 4 or fewer legal moves
Show moves directly.
Hide category filters.

## If 5–8 legal moves
Show:
- first 4 contextually useful;
- `MORE MOVES` button;
- optional filter drawer.

## If 9+
Use a move drawer with filters.

The routine turn screen should not look like a move database.

---

# 29. Fighter HUD Redesign

## Left / Right fighter bars

Each contains:
- 40–48 px portrait;
- wrestler name;
- stamina bar;
- numeric stamina;
- Pop/Heat pips;
- one condition chip.

## Status examples
- STAGGERED
- PRONE
- CONTROLLED
- FINISHER READY

## Remove
- redundant READY text;
- long labels;
- visible body-part bars.

---

# 30. Drawers Redesign

Body Status, Match Log, Rules and More remain drawers.

Improve:
- larger text;
- less boxed content;
- stronger section headings;
- use body silhouette heat map;
- swipe/drag-to-close on touch where practical.

---

# 31. Overall Screen Review Checklist

Every new screenshot must be reviewed at:
- 390×844 phone portrait;
- 844×390 phone landscape;
- 1194×834 tablet;
- 1440×900 desktop.

Review questions:

1. Is the ring the largest visual area?
2. Do wrestlers read instantly against the background?
3. Is there one obvious next action?
4. Are there any one-option menus?
5. Are any labels unnecessarily inside buttons?
6. Are category filters visible without being needed?
7. Is any text under 11 CSS px and important?
8. Are too many borders visible?
9. Does gold still feel special?
10. Can a player understand the current state without opening a drawer?
11. Does the screen look like a game before reading any words?
12. Does a screenshot still look polished with all animations frozen?

---

# 32. Overall Redo Procedure

The next implementation pass should use a deliberate review/redesign loop.

## Step 1 — Baseline screenshots
Capture current:
- idle turn;
- selected Forearm Smash;
- target choice;
- dice;
- impact;
- pin opportunity;
- body drawer.

## Step 2 — Strip unnecessary chrome
Remove:
- redundant borders;
- explanatory microcopy;
- always-visible filters;
- redundant boxes.

## Step 3 — Apply button system
Replace every interactive control with a defined Button Type A–G.

## Step 4 — Upgrade character renderer
Implement shape + lighting improvements.

## Step 5 — Upgrade arena
Implement depth, crowd, rope, mat and lighting improvements.

## Step 6 — Upgrade VFX/camera
Apply move-class FX packages.

## Step 7 — Capture same screenshots
Use identical states/viewports.

## Step 8 — Side-by-side review
Score each screen:
- silhouette;
- hierarchy;
- readability;
- spectacle;
- touch clarity;
- commercial polish.

## Step 9 — Redo failures
Any screen under target score is revised before adding more move content.

---

# 33. Visual Review Scoring

Score 1–5.

## Character silhouette
5 = readable wrestler/body type at thumbnail scale.

## Character rendering
5 = deliberate sculpted/faceted style with convincing materials.

## Arena
5 = layered depth and clear center-stage focus.

## Action clarity
5 = one obvious primary decision.

## Button quality
5 = game control, not web form.

## Color hierarchy
5 = one dominant accent and semantic colors remain clear.

## Motion/impact
5 = impact feels powerful without excessive effects.

## Overall commercial polish
5 = screenshot could plausibly appear on an app-store game listing.

### Gate
No key screen ships below **4/5** in Action Clarity or Button Quality.
Average visual score target: **4/5 or better**.

---

# 34. Implementation Order

## Visual Pass A — UI/Buttons
1. remove unnecessary filter row on simple turns;
2. redesign move buttons;
3. simplify selected move metadata;
4. redesign Primary/Secondary/Opportunity/Reaction controls;
5. enlarge important text;
6. reduce card borders.

## Visual Pass B — Character Renderer
1. torso;
2. shoulders/arms;
3. legs/boots;
4. head/hair;
5. material system;
6. lighting/contact shadows.

## Visual Pass C — Arena
1. ring;
2. crowd layers;
3. spotlight/haze;
4. ropes/posts;
5. parallax.

## Visual Pass D — Impact
1. strike;
2. heavy slam;
3. submission;
4. signature;
5. finisher;
6. pin/kickout.

## Visual Pass E — Review/Redo
Capture all canonical states, score them, redo failures.

---

# 35. Acceptance Criteria

A visual-polish build passes when:

- character pieces no longer read as disconnected geometric blocks at gameplay scale;
- abs/chest are primarily modeled with shape and shading rather than line boxes;
- shoulders overlap arms naturally;
- boots have distinctive silhouette and layered design;
- hair/facial hair have multiple depth layers;
- contact shadows are visible at joints and grapples;
- sprites receive consistent arena rim lighting;
- arena has at least three depth layers;
- normal turn has no unnecessary category filters when ≤4 moves are available;
- selected move uses one metadata line rather than three fact cards;
- button roles are visually distinct;
- only one dominant primary CTA appears in ordinary states;
- gold is reserved for opportunities/signatures/finishers;
- no critical text is rendered at tiny sizes;
- impact FX are move-class specific;
- the same key screens score at least 4/5 on average in the review matrix;
- the rules engine and Smart Flow behavior remain unchanged.

---

# 36. Product Principle

The next graphics pass should not make Faces & Heels more realistic.

It should make it **more intentional**.

The target feeling is:

> **Big characters. Strong silhouettes. Dramatic arena light. Clear decisions. Violent-looking impacts. Minimal UI friction.**

And the UI test remains:

> **If it is not a choice, it should not look like a button.**
