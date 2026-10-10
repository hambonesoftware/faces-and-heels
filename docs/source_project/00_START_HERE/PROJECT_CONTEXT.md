# Project Context

## Project

**Faces & Heels** is a professional-wrestling tabletop role-playing game being adapted into a digital game.

The original concept was an **Avrae-style Discord gaming system**. During the design discussion, the project explored a newer Discord-native approach using a Discord Activity plus bot/application commands. The current conversation then shifted toward a **touch-first PWA for phones and tablets**, with Discord potentially remaining as a social/optional integration rather than being the only game surface.

## Core identity

The digital game should preserve the tabletop game's strategic structure rather than becoming an arcade wrestling game. The digital layer should automate bookkeeping and make legal actions obvious while keeping the underlying dice, stamina, body-part damage, positioning, momentum state, Heat/Pop, pins, submissions, promos, and progression visible when relevant.

## Current UX direction

The user explicitly preferred the later, simplified match-screen concept over the earlier feature-dense dashboard. The desired screen is calm and touch-friendly:

- wrestler name, stamina, Pop/Heat, and a compact health summary at the top;
- ring and wrestler visuals in the center;
- clear turn indicator;
- four or so large contextual action buttons at the bottom;
- move choices presented in a temporary bottom sheet;
- body-part detail, match history, and deeper rules available on demand rather than always visible.

## Current graphics direction under discussion

A realistic implementation path is **2D sprite / pose animation** rather than full 3D. The recommended concept is a hybrid:

- shared layered wrestler body parts / clothing / hair / accessories;
- simple skeletal or tweened animation for idle, breathing, taunts, walk, stagger, rise, celebration;
- synchronized two-wrestler authored pose sequences for contact moves such as suplexes, headlocks, DDTs, slams, submissions, pins, and kickouts;
- game-engine effects for impact flashes, camera shake, ring bounce, particles, crowd reactions, and UI feedback.

This graphics approach is a recommendation, not yet a locked rule.

## Implementation principle

The rules engine should remain independent of the UI and rendering technology. A match state should be resolvable without Phaser, React, Discord, or any specific front end. That allows the same engine to support PWA play, Discord integration, AI testing, and future native wrappers.
