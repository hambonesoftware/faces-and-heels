# Faces & Heels v1.5.2 — Coordinated Moves

[Play the game](https://hambonesoftware.github.io/faces-and-heels/) · [Preview coordinated moves](https://hambonesoftware.github.io/faces-and-heels/motion-lab.html)

Paired animation now uses supported lifts, fixed-length limbs, torso/head separation, planted carry feet, and smoother landings and recovery. The Motion Lab provides slow motion, scrubbing, both attackers, and multiple camera angles.

See [ANIMATION_UPDATE.md](ANIMATION_UPDATE.md) for verification and remaining limitations.

## Run locally

Start Docker Desktop, then run `Start-FH.bat`. Use `Restart-FH.bat` after changes. For a Node preview, run `npm start`.

## Tests

Run `npm test`. Checks include 1,000 complete matches, 22,022 paired animation samples, mesh topology, and offline asset references.

The PWA supports installation and offline use after loading over HTTPS or localhost. GitHub Pages and Docker share the same relative asset paths.
