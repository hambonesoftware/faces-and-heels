# Discord Integration Strategy

## Historical direction

Faces & Heels was originally conceived as an **Avrae-style Discord gaming system**.

The design discussion later considered a modern Discord approach:

- Discord Activity for the interactive board;
- application commands / bot for challenges, sheets, campaign actions, and result posting;
- normal chat for promos and roleplay.

## Current PWA-oriented interpretation

If the PWA becomes the primary game client, Discord can be optional rather than mandatory.

Potential integration levels:

### Level 0 — No Discord dependency

PWA handles all play. Players share invite links manually.

### Level 1 — Share / community integration

- share match result cards to Discord;
- campaign invite links;
- public wrestler/profile links;
- promo text export.

### Level 2 — Bot companion

- `/challenge` creates a PWA match link;
- `/wrestler` displays a compact sheet;
- `/card` posts scheduled match cards;
- `/result` posts completed results;
- campaign roles and championships can be surfaced in server channels.

### Level 3 — Discord Activity client

The same rules/API can power an Activity inside Discord for players who want to remain in voice/chat while wrestling.

## Architecture requirement

Discord must not contain the canonical rules logic. Both Discord and PWA should call the same independent match engine/backend.
