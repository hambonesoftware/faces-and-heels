# Faces & Heels — Solo Showdown (v1.19.0)

**[Play the wrestling game](https://hambonesoftware.github.io/faces-and-heels/)** · **[Motion Lab](https://hambonesoftware.github.io/faces-and-heels/motion-lab.html)**

A colorful, 2016-inspired turn-based wrestling game and installable PWA. Under the hood it uses the Faces & Heels tabletop framework: Big Gold Dice (d20), High/Low control, stamina, damage marks, signature finishers, reactions, pins and sustained submissions.

## Playing a match

On the title screen, select **Solo vs CPU** (default) or **Pass & Play** (local two-person testing). In Solo mode, pick **Stone** (Powerhouse Face) or **Viper** (Daredevil Heel) and select **Rookie**, **Standard** or **Veteran** difficulty. The CPU controls the opposing wrestler. A short ringside tutorial can be enabled or disabled.

Use the horizontally scrolling action strip **below the ring** to select one of your learned legal moves. Read the target, stamina cost and opponent stamina loss before rolling. Pin a prone opponent, counter a missed attack with a trained move, contest holds with escape dice, and recover from prone while the opponent has High control.

The CPU **does not alter or inspect upcoming dice rolls**. It selects among legal moves using stamina, posture, control, learned repertoire and match situation, then executes the same d20 and animation routines as a player. Higher difficulty selects better moves more consistently; dice remain fair. Pass & Play still requires both corners to be controlled manually.

Current prototype wrestlers:
- **Stone:** 9 Common Moves, Powerhouse style, exclusive Flashpoint Driver finisher.
- **Viper:** 10 Common Moves, Daredevil style, exclusive Viper's Bite finisher.

The original five-style Legendary candidate catalogs remain proposals. Only finished moves are playable.

## Rules and combat interface

- **High/Low control:** High gets offense, but the Low wrestler retains permitted pins, counters, escapes and ground-defense responses.
- **Submission holds:** Armbar, Headlock and Ankle Lock remain active across turns. Defenders immediately roll to escape; holders can squeeze, switch to compatible learned holds or release. Exhaustion still allows a last-chance escape die.
- **Pins:** The pinned wrestler rolls on each of three counts. Kickouts and submissions have distinct victory/posture outcomes.
- **Ground defense:** After High declines a pin, Low can scramble to kneeling, cover up or stay down.
- **Stamina:** The listed impact to the opponent exceeds the move's attacker cost on successful actions; actual loss is clamped by the opponent's remaining stamina.
- **UI:** Compact swipeable move strip, context-specific dice and defenses, 3D procedural wrestling models, animations sampled for move art, separate ring and controls.
- **Career:** Local win/loss history and championship series. Mat Pass unlock candidates are gated to playable moves. This is not yet a fully featured career mode.

## Local development

```bash
npm start
# http://localhost:8155
npm test
npm run test:solo
npm run test:combat-flow
npm run test:animation
```

Or run `Start-FH.bat` under Docker Desktop and `Restart-FH.bat` after updates. GitHub Pages serves the root of `main`; all paths remain relative.

`npm test` runs the complete match-rules, 3D choreography, UI, PWA and solo opponent suites. **The solo policy is exercised in 180 full simulated matches**, covering both wrestlers and three difficulties, in addition to the regular 1,000-match combat suite. GitHub Actions uses Node 22.

Match setup is saved under `fh-match-setup-v1` in local storage, progression under `fh-progress-v1`, and presentation preferences under `fh-presentation-v1`. The service worker keeps current versioned and required unversioned modules cached for offline PWA use.

## Known boundaries

This is an early public playtest, not an online multiplayer game. The AI is a deterministic heuristic policy, not machine learning. The game currently does **not** save an unfinished match for resume. The 3D models use authored synchronized moves and conservative joint/core collision checks—not complete mesh-level rigid-body physics. Touch ergonomics, visual contact and performance need real-device playtesting.

See the [100-match classic wrestling review](docs/classic-wrestling-100-match-review.md), [combat-flow audit](docs/combat-flow-audit.md) and [animation update](ANIMATION_UPDATE.md) for the state matrix and renderer limitations. All original tabletop content not explicitly established by the source mind map is a provisional digital design choice.
