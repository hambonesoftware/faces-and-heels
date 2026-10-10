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
