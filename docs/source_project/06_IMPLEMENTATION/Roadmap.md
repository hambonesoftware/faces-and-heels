# Proposed Roadmap

## Phase 0 — Lock the missing rules

Resolve the high-priority questions in `02_RULES_ANALYSIS/Open_Rules_Decisions.md`.

Deliverable: `Rules_v1.0.md` with deterministic formulas and state transitions.

## Phase 1 — Headless rules engine

Build and test without graphics.

- wrestler data model;
- move data model;
- body-part system;
- stamina;
- BGD roll injection;
- H/N/L state machine;
- move validation;
- Reaction flow;
- pin flow;
- serialization;
- deterministic tests.

Deliverable: automated simulation can complete matches from scripted choices.

## Phase 2 — Touch UI prototype

- Vite/React app shell;
- Phaser ring scene;
- landscape match layout;
- simplified HUD;
- bottom-sheet move chooser;
- dice overlay;
- body-status detail sheet;
- PWA manifest/service worker.

Deliverable: match can be played locally on iPhone/iPad/desktop browser.

## Phase 3 — Animation proof

- layered wrestler template;
- two cosmetic variants;
- idle/prone/get-up;
- several paired moves;
- hit-stop/camera shake/ring response;
- reduced-motion mode.

Deliverable: prove the art pipeline before content expansion.

## Phase 4 — Content tools

Build internal data editor or validated JSON workflow for:

- moves;
- styles;
- body requirements;
- damage dice;
- end positions;
- animation keys;
- Heat/Pop rewards.

Deliverable: adding a move does not require editing engine code.

## Phase 5 — Persistence and character creation

- local wrestler library;
- character creation;
- progression;
- move selection;
- import/export;
- save migration/versioning.

## Phase 6 — Multiplayer backend

- accounts or invite identities;
- match rooms;
- WebSocket synchronization;
- authoritative validation / rolls;
- reconnect/resume;
- match history.

## Phase 7 — Discord companion integration

Optional after the PWA loop is proven:

- challenge/invite command;
- wrestler/result cards;
- campaign server tools;
- promos/story sharing;
- possibly a Discord Activity client using the same API.

## Phase 8 — Campaign / promotion systems

- cards;
- rivalries;
- championships;
- seasons;
- GM/promoter tools;
- rankings only if the creator wants them;
- expanded progression/content.
