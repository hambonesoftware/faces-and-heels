# Faces & Heels v1.6.0 — Ringside

[Play the game](https://hambonesoftware.github.io/faces-and-heels/) · [Motion Lab](https://hambonesoftware.github.io/faces-and-heels/motion-lab.html)

A tactical wrestling PWA presented as a live wrestling show. Ringside replaces the navy dashboard styling with charcoal, printed ivory move cards, championship gold, and crimson. Original vector portraits and paired-pose illustrations need no external assets or font downloads.

## Ringside interface

- Match-poster introduction with Stone, Viper, rivalry context, and a clear start action.
- Broadcast wrestler nameplates, segmented stamina tracks, POP/HEAT tokens, and control indicators.
- Illustrated legal move cards and selected-move descriptions, targeting, dice details, chance meter, and crowd boost.
- Distinct counter, pin, and victory presentation with records and championship milestones.
- Body diagram displaying the actual damage marks for each body region.
- Responsive desktop, portrait phone, and landscape layouts; keyboard focus management and modal focus trapping.
- Renderer comparisons and Motion Lab are available under Presentation settings → Arena tools & build info.

The match rules, local progression save keys, and coordinated wrestler animation remain compatible with the previous release. See [ANIMATION_UPDATE.md](ANIMATION_UPDATE.md) for the animation engine and remaining limitations.

## Run locally

Start Docker Desktop, then run `Start-FH.bat`. Use `Restart-FH.bat` after changes. For a Node preview, run `npm start` and visit `http://localhost:8155`.

## Tests and deployment

Run `npm test`. Checks include 1,000 complete matches, 22,022 paired animation samples, mesh topology, and offline asset references.

GitHub Pages publishes the root of `main`. The PWA supports installation and offline use after loading over HTTPS or localhost. Version 1.6.0 uses a fresh service-worker cache including `ui-art.js`. GitHub Pages and Docker share relative asset paths.
