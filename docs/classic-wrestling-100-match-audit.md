# Faces & Heels — 100-Bout Classic Wrestling Sequence Audit

**Build:** v1.19, Solo Showdown, classic-match pacing tuning.

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
