# Faces & Heels — 100-Bout Classic Wrestling Sequence Audit

**Original benchmark:** v1.19 (initial Solo Showdown pacing, before the v1.19.1 follow-up). The first results table below is retained for comparison. The newer v1.19.1 sample appears at the bottom.

**Method:** 100 *deterministically seeded AI-versus-AI engine matches*, with legal moves, actual d20 rolls, counters, pins, submission turns, and action history from the playable rules engine. The test is reproducible with `npm run test:classic` and included in `npm test`. These are **not videos of 100 historical matches**, nor an exact quantitative study of 1980s–1990s wrestling. The aim is recognizable opening-to-finish sequencing and varied match flow.

## Historical comparison points

- [Ric Flair / Ricky Steamboat trilogy interview — WWE](https://www.wwe.com/classics/wcw/ric-flair-ricky-steamboat-trilogy-interview): deliberate holds/arm drags, trading control and escalation rather than continuous finishing moves.
- [Flair vs Steamboat III detailed match review — TJR Wrestling](https://tjrwrestling.net/feature/5-star-match-reviews-ric-flair-vs-ricky-steamboat-iii-nwa-wrestlewar-89-music-city-showdown/): early lockups, technical sequences and limb work, harder exchanges and significant closing submission/pin sequences.
- [Bret Hart vs Mr. Perfect, SummerSlam 1991 discussion](https://forums.prowrestlingonly.com/topic/18699-1991-08-26-wwf-summerslam-bret-hart-vs-mr-perfect/): traded slams, believable near falls, timely momentum changes, and a decisive finishing sequence.

Historical examples establish qualitative narrative patterns, **not statistical targets** for how many moves must occur or their exact frequency.

## Reproducible outcome (100 complete bouts)

| Measure | Value | Assessment |
| --- | ---: | --- |
| Finished matches | 100 / 100 | No engine lockups |
| Mean offensive move attempts | 18.52 | Match lengths vary; median 16, 90th percentile 34 |
| Mean distinct successful moves | 7.73 | Reasonable move-list variety |
| Mean positioning/setup actions | 2.07 | Not dominating offense |
| Bouts opening with a recognizable basic strike/grapple | 99 / 100 | Classic foundation present |
| Bouts with a signature finisher in the first third | 2 / 100 | Opening finishers rare |
| Bouts with three identical consecutive moves | 0 / 100 | Reduced accidental repetition |
| Bouts featuring a submission hold | 73 / 100 | Holds are prominent |
| Average pins attempted | 4.15 | Many nearfalls; may feel high in short bouts |
| Pinfall / submission finishes | 89 / 11 | Pinfall the common finish |
| Mean changes in controlling wrestler | 1.31 | Comebacks occur, but consistency needs work |
| Bouts with no change of High control | 35 / 100 | **Needs refinement** |
| Total opponent submission-pressure actions | 80 | Ongoing holds actually used |

**Most attempted offense:** Forearm Smash (241), Knee Lift (188), Elbow Drop and Stomp (132 each), Body Slam (127), Knee Drop (125), Leg Drop (124), Dropkick (122), Ground Headlock (105), and Armbar (92). These are attempts across the *entire* 100-bout sample, not per match.

**Wrestler identity:** Stone lands Powerhouse signatures (74 Body Slams, 51 Vertical Suplexes, 17 Spinebusters). Viper lands distinct Daredevil/technical sequences (68 Dropkicks, 51 DDTs, 58 Armbars). Stone has a playable Flashpoint Driver; Viper has Viper's Bite. **The named finishers land infrequently** in the sample (8 and 5 respectively), so the final beats of many bouts are still ordinary maneuvers.

## Changes applied to game AI

The `classicMoveRating()` policy in `solo-ai.js` now:

1. Prefers opening fundamentals: Forearm Smash, Knee Lift, Hip Toss, and selected early takedowns.
2. Rewards different techniques and penalizes exact repetition of the previous one or two personally executed moves.
3. Keeps style identity recognizable instead of choosing only the globally best mathematical stamina trade.
4. Penalizes gratuitous Snap Down / Pickup loops (positioning, not endless offense).
5. Holds back Legendary finishers until meaningful opponent wear, then favors them and reasonable setup opportunities.
6. Adjusts AI willingness to pin so early takedowns generate fewer unrealistic immediate pin gambles while late pins matter.
7. Preserves fair dice and existing wrestler loadouts: no auto-success, scripted winner, hidden reroll or unlearned move access.

## Where the game still differs from a real traditional wrestling match

- Not enough **comebacks** in 35% of bouts. Better hope spots/roll reversals are an engine-design opportunity rather than something to fake with a random guaranteed comeback.
- Distinct **late-match finishing sequences** are infrequent; many bouts end after a generic impact move followed by three successful counts.
- There is no detailed **rope positioning / rope break**, corner sequence, Irish whip, top-rope risk, or referee-location system.
- Fatigue and stamina are simulated, but **selling injuries**, crowd heat, moral dynamics, ring geography and theatrical pauses need a presentation/AI layer.
- Matches are deterministic simulations and **not** human-vs-human video comparisons; they cannot validate actual visuals, impact timing, or whether the motion *looks* convincing at normal mobile framerate.

## How to inspect actual transcripts

GitHub Actions runs `node test-classic-wrestling.mjs`, writes `audit-output/classic-match-100.json` (individual seeded bouts, every attempted move, full event transcripts), then uploads the file as the **faces-heels-classic-100-match-transcripts** build artifact, retained for 30 days. Review the latest successful [Faces & Heels combat regression run](https://github.com/hambonesoftware/faces-and-heels/actions) and its Artifacts section. Rerun locally with `npm run test:classic`.

The quality gates assert at least five unique moves per match on average, technical/strike foundations in at least 80 of 100 openings, no more than 10 opening-finishers or three-identical-move streaks, at least 25 bouts featuring holds, and no more than five setups on average. These are **provisional development gates**, not historical wrestling measurements.

---

## v1.19.1 follow-up: 100 additional controlled bouts

The move-choice policy was adjusted after identifying **hard slams/dropkicks/DDTs in the opening exchanges**, occasional immediate repeat attacks, excessive early pin attempts, and finishers that rarely featured in the ending.

Source comparisons remain qualitative: the [Flair–Steamboat trilogy WWE interview](https://www.wwe.com/classics/wcw/ric-flair-ricky-steamboat-trilogy-interview) emphasizes contrasting faster/slower segments, and detailed [WrestleWar 1989 coverage](https://tjrwrestling.net/feature/5-star-match-reviews-ric-flair-vs-ricky-steamboat-iii-nwa-wrestlewar-89-music-city-showdown/) documents opening lockups, headlocks, arm targeting and counters. Our game is **not recreating those matches, their exact statistics or their individual move lists**.

Run `npm run test:pacing` to replay the **same 100 deterministic seeds** with the current `solo-ai.js` on both sides. This is separate from `npm run test:classic`, which also generates the complete traditional 100-bout transcript artifact.

| Measured statistic | Pre-tuning 100 bouts | v1.19.1 after tuning |
| --- | ---: | ---: |
| Completed matches | 100 | **100** |
| Stone wins / Viper wins | 55 / 45 | **42 / 58** |
| Mean attack attempts | 23.13 | **21.53** |
| Mean pin attempts | 4.46 | **3.44** |
| Mean sustained-hold openings | 3.00 | **3.17** |
| Mean successful escapes | 1.29 | **1.54** |
| Legendary move attempts, all 100 bouts | 38 | **54** |
| Submission finishes | 13 | **23** |
| Immediate repeat move by same wrestler | 37 across 2,313 attempts | **16 across 2,153 attempts** |
| Heavy/flashy offense within first 3 attack attempts | Unmeasured in original run | **7 of 300 (2.3%)** |
| Legendary attempts in first 6 attacks | Unmeasured in original run | **0** |

The independent, existing `test-classic-wrestling.mjs` suite also passed another 100 complete matches on the updated AI, using a **different seed family**. That second sample recorded 19.18 attack attempts, 8.45 distinct successful moves, 3.54 pins, 6.23 changes in controlling wrestler per match, and only 7 matches without a control swing (versus 35 in its original pilot). All 100 matches opened with at least one basic technical or striking move; 80 matches featured a submission hold, 26 attempted a finisher and 20 landed one. This supports the direction of the tuning without claiming that the target percentages match real-world historical data.

A majority of bouts now begin with Hip Toss, Forearm Smash, Knee Lift or Dragon Screw. Those four account for **99 opening moves** out of 100; one opened with a Body Slam. Later bouts feature the larger slams, Dropkick, DDT and signatures according to posture, stamina, known wrestler repertoire and normal dice rolls. Match winners remain uncontrolled.

The revised AI also favors **Knee Lift → Snap Down → mat wrestling** when the defender drops to kneeling, instead of repeating Forearm Smash simply because few other strikes remain legal from that posture. A short repeat-chain penalty limits frequent `Snap Down → Pick Up → Knee Lift → Snap Down` sequences.

**Five match tapes** are printed by `test-classic-match-pacing.mjs` along with the full move frequency distribution, opener counts, pin counts, finishes and repetition statistics. Individual match transcripts with intervening control, pin and escape events are available in the main `test-classic-wrestling.mjs` JSON artifact.

**Remaining gaps:** Rope breaks, armdrags/wristlocks, standing chain-grapples, corner work, injury selling and referee interactions require new rules and physically correct paired animations. These should not be approximated by manipulating move priorities or falsely described as already implemented.

