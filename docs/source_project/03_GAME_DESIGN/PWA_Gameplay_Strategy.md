# PWA Gameplay Strategy

## Why a PWA fits

A PWA can provide:

- installable home-screen experience;
- touch-first fullscreen play;
- iPhone, iPad, Android, desktop coverage from one codebase;
- service-worker caching for fast repeat loads;
- local persistence;
- online multiplayer through a backend when desired;
- easy link-based match invites.

## Offline / online split

### Offline-capable

- character creation;
- move browsing;
- local practice / AI match if implemented;
- saved local wrestlers;
- rule reference;
- cached art and animations.

### Online-required

- authenticated multiplayer;
- authoritative random rolls if anti-cheat matters;
- campaign synchronization;
- shared match history;
- invitations / presence.

## Recommended interaction model

Do not simulate analog walking around the ring. The wrestlers' visual poses represent rules state. The player chooses legal moves and the engine animates the transition.

This allows the game to look animated while remaining faithful to the tabletop system.
