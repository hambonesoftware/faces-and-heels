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
