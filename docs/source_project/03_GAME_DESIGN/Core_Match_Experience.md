# Core Match Experience

## Match loop

The intended digital loop should preserve the source flow:

1. Establish Neutral / H / L state.
2. H wrestler chooses a legal move.
3. Optional bonus reposition if the rule allows it.
4. Pay stamina.
5. Resolve move attempt.
6. On success: damage, body-threshold check, ending positions, H/N/L update.
7. On failure: L wrestler may choose a Reaction from legal Common Moves.
8. Resolve Reaction and update state.
9. Offer pin/submission when conditions permit.
10. Continue until match-ending pin/submission or future stipulation rules.

## Digital turn presentation

The engine may track many variables, but the screen should emphasize only:

- whose turn / who has momentum;
- both wrestlers' stamina and Heat/Pop;
- current positions;
- compact condition summary;
- immediately legal actions.

Everything else is contextual.

## Typical touch interaction

### Ring view

Large buttons:

- Grapple
- Strike
- Special
- Pin / contextual finish action

### Category tap

Open a bottom sheet containing only relevant moves. Locked moves may appear below available moves with a short reason if useful for learning.

### Move tap

Show a concise confirmation sheet:

- move name;
- stamina cost;
- relevant stat;
- target body part;
- expected ending position;
- Heat/Pop spend controls;
- Attempt Move button.

### Resolution

Center-stage BGD roll animation, modifiers, comparison, success/failure, then brief impact animation.

### Aftermath

Return to ring view with updated positions, stamina, condition, and turn/momentum state.

## Dramatic moments

Pins, submissions, finishers, and major Legendary Moves should briefly take over the screen. Routine actions should resolve quickly.
