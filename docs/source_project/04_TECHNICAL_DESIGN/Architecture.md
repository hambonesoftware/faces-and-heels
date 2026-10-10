# Proposed Technical Architecture — NOT YET CANON

## Recommended stack

### Client

- TypeScript
- Vite
- Phaser 3 for ring scene, sprites, tweens, camera, particles, and animation timing
- React for menus, sheets, character management, settings, campaign UI, and accessibility-friendly form controls
- PWA manifest + service worker
- IndexedDB for local cache / offline state

React can overlay or surround the Phaser canvas. The rules engine should be a plain TypeScript package used by both.

### Rules package

`packages/rules-engine`

Pure TypeScript. No DOM, Phaser, React, Discord, network, or database dependencies.

Responsibilities:

- validate match state;
- calculate legal moves;
- calculate costs/modifiers;
- resolve moves/reactions;
- resolve damage and thresholds;
- resolve H/N/L transitions;
- resolve pins/submissions;
- emit deterministic state-transition events;
- serialize/restore match state.

### Backend — for multiplayer

A small TypeScript server, for example Fastify or equivalent:

- authentication;
- campaign and wrestler persistence;
- match rooms;
- authoritative action validation;
- authoritative random rolls when required;
- WebSocket events;
- reconnect/resume;
- match history.

### Database

PostgreSQL for production multiplayer data.

Local-only prototype can begin with JSON fixtures + IndexedDB and add the backend after the core match loop is proven.

## High-level flow

```text
Touch / UI
   |
   v
UI Intent
   |
   v
Rules Engine ----> Validation Result
   |                    |
   | accepted           | rejected + reason
   v                    v
State Transition      UI Feedback
   |
   +--> Animation Events
   |
   +--> Persist / Sync
```

## Rules events separate from visuals

Example engine event sequence:

```text
MOVE_DECLARED
STAMINA_SPENT
ROLL_PERFORMED
MOVE_SUCCEEDED
DAMAGE_ROLLED
BODY_POINT_ADDED
POSITION_CHANGED
MOMENTUM_CHANGED
TURN_CHANGED
```

The renderer decides how those events look. The engine decides what actually happened.

## Multiplayer authority

Never let the animation decide state. If online multiplayer is implemented:

1. Player submits intent.
2. Authoritative engine validates and resolves.
3. Server emits result/event log.
4. Both clients animate the same result.

That keeps reconnects and desync recovery possible.
