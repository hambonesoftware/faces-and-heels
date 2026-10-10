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
