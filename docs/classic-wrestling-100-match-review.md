# Faces & Heels — 100-match classic-wrestling realism audit

**Date:** October 12, 2026  
**Test:** `node test-classic-wrestling.mjs`, 100 seeded matches (`0xFACED001` onward), with Stone and Viper both controlled by the real Standard CPU policy and resolved through the actual combat engine.  
**Verification:** [Successful CI run](https://github.com/hambonesoftware/faces-and-heels/actions/runs/38281291848) · [100 full match event transcripts (artifact)](https://github.com/hambonesoftware/faces-and-heels/actions/runs/38281291848/artifacts/11760813423)

## Important methodology limits

These are **100 complete engine simulations, not 100 recorded live broadcasts**, and the historical examples below are **qualitative design references, not a statistically sampled dataset**. One `attackCount` means one attack attempt, not one minute or one camera-cut animation. Pin counts, reversals, lockups and defensive rolls are separate events. The test does not judge every limb collision in the live renderer.

We compare the basic narrative shape of wrestling to:
- [Flair vs. Steamboat, 1989 trilogy](https://www.wwe.com/classics/wcw/ric-flair-ricky-steamboat-trilogy-interview), especially hand-fighting, arm drags, hold reversals, tactical exchanges and recoveries.
- [Bret Hart vs. Mr. Perfect, SummerSlam 1991](https://www.wwe.com/shows/summerslam/history/greatestmatches), especially coherent suplex and elbow sequences, near-falls and a recognizable finishing hold.

## Observed results

| Test statistic | 100-match result |
| --- | ---: |
| Complete match outcomes | 100 / 100 |
| Attack attempts per match, mean / median / 90th percentile | 18.52 / 16 / 34 |
| Unique successful move types per match, mean | 7.73 |
| Automatic positioning setups per match, mean | 2.07 |
| Control swings per match, mean | 5.30 |
| Matches with no control swing | 11 |
| Matches under 10 attacks | 26 |
| Matches over 30 attacks | 16 |
| Matches featuring a submission hold | 73 |
| Holds applied per match, mean | 1.43 |
| Pin attempts per match, mean | 4.15 |
| Matches with a two-count kickout | 58 |
| Total two-count kickouts | 114 |
| Matches with a finisher attempt | 19 |
| Matches with a successful finisher hit | 11 |
| Early-finisher attempts (in opening third of attacks) | 2 bouts |
| Matches opening with recognizable basic strike/technical exchange | 99 |
| Matches with three consecutive identical attacks by one wrestler | 0 |
| Results by method | 89 pinfalls / 11 submissions |

**Measurement correction:** An earlier version incorrectly reset the previous High controller when play went to Neutral, undercounting control changes. The fixed audit remembers the last actual controller across lockups and neutral resets. It reports 5.3 control swings per bout (11 bouts without one), replacing an earlier misleading value of 1.31 (35 without).

## What already resembles classic wrestling

1. **Recognizable openings:** The CPU generally opens with a strike, hip toss, dropkick or analogous basic move rather than rushing a finisher.
2. **Control can be contested:** Counters, pins, kickouts, defensive scrambles, prolonged submissions and changing High/Low conditions let a match have multiple momentum shifts.
3. **Wrestler identity:** Stone's successful Powerhouse offense includes Body Slam (74 hits), Vertical Suplex (51) and Ground Headlock (59); Viper's Daredevil style uses Dropkick (68), DDT (51), Hip Toss (44) and Armbar (58). These totals are across the sample, not per match.
4. **False finishes:** Fifty-eight bouts include at least one escape from a two-count pin.
5. **Less spam:** Repetition-sensitive CPU scoring and limited setup incentives produce zero sampled three-attack repeat streaks and a mean of just over two setup moves per match.

## What still breaks the historic-wrestling illusion

### 1. A quarter of bouts end too quickly for the classic feature-match goal

26/100 bouts finish in fewer than ten attacks, sometimes after a regular DDT or Body Slam. Some real matches are intentionally short, but this is too common **if every match is meant to feel like a 1980s/1990s feature bout**. Avoid rigging individual d20 outcomes to eliminate short matches: use explicit match types/length targets, stamina and pin resilience that players can see and understand, with rules clarified before tuning.

### 2. Signature finishers are not yet important enough

Only 19 matches include a finisher attempt; only 11 a successful finisher hit. Most victories follow ordinary moves and pins. A better climax would arise from earning Heat/Pop and setting up a standing opponent for the learned Legendary finisher; any improvement must retain the original d20 contests, wrestler loadouts and credible kickouts.

### 3. Foundational classic wrestling moves are missing

These real matches lean heavily on **standing headlocks, armdrags, wristlocks, elbow-and-collar ties, chops, Irish whips and rope breaks**. Our current roster has a Ground Headlock but not a standing wrist/arm control sequence or interactive ring ropes. Adding only another finisher would not address this realism gap.

### 4. Body-part psychology is too shallow

The real wrestlers could work a knee/arm for several exchanges and have that weakness matter to the finish. The game records localized body marks and prioritizes damaged targets, but lacks richer limb-selling, held target transitions, rope-dependent counterplay and finish-specific targeted vulnerability.

### 5. Arena position is mostly cosmetic

Rope breaks, corner attacks, out-of-ring recoveries, top-rope spots and ring awareness would make the simulation feel substantially more like two real people wrestling. They require **both positional rules and authentic paired animation**; do not add action-bar moves with generic fallback footage.

## Recommended next move (in order)

1. Add a real **standing clinch → wristlock/headlock → arm drag/counter → rope break** subsystem with synchronized, collision-audited two-body animation. This makes ordinary exchanges credible before considering more finishers.
2. Introduce explicit **Match Style** settings such as Quick Match versus Classic Main Event so short matches remain possible, while longer builds have an honest, exposed stamina/pin-resilience model.
3. Encourage AI to transition from accumulated wear and body work into its known **signature finisher**, then a dramatic pin or submission; do not script the outcome.
4. Add turnbuckle/ropes awareness, limb selling and match log readability; subsequently run another reproducible 100-match audit and compare metrics.

## Reproducibility

Run `npm run test:classic` on a Node 22 checkout. This creates `audit-output/classic-match-100.json` with summary metrics, seeded decisions, move attempts and complete event transcripts. On every push to `main`, the combat regression workflow runs the classic audit and uploads it as an Actions artifact retained for 30 days. The regression suite also includes full match simulations and existing move-art/choreography tests.

**Bottom line:** The core pacing now somewhat resembles classic wrestling, especially holds, kickouts, varied attacks and momentum shifts. It is not yet an exact reproduction of actual in-ring move lists, because core standing grapples and rope mechanics do not exist. The next step is to build those authentic fundamentals, not invent more finishing moves.
