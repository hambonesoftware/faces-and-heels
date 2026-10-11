# Faces & Heels v1.5.2 — Coordinated Moves

## Animation changes
- Hip-centred rotation for lifts and falls, with distinct setup, load, hold, release and landing stages.
- Torso/head clearance during paired moves; vertical body separation for pins.
- Fixed-length two-bone arm and leg solving. Grips target the body surface instead of its centre.
- Supported horizontal body slam and inverted suplex; a separate compact finisher performance.
- Forearm contact at the middle of the forearm, defender recoil and separate clothesline passing lanes.
- Alternating approach steps, planted feet during lift holds, and checked floor clearance.
- Smooth entry/recovery blends and impact timing tied to the animation clock.
- Motion Lab: three camera angles, normal/half/quarter speed, pause, restart and single-percent stepping.
- Versioned PWA cache updated to 1.5.2.

## Run the update
Double-click Restart-FH.bat with Docker Desktop running. It builds before replacing the running container and refreshes the app cache. Open http://localhost:8080/motion-lab.html to inspect the moves, or use PLAY MATCH for the game. Select ISOMETRIC for the new animation; SPRITES retains the original artwork/animation.

## Verification on 2026-10-10
All seven Node suites passed, including 1,000 complete seeded match simulations and 22,022 paired-pose samples. Tests cover finite/continuous poses, torso/head envelope separation, constant arm lengths, lift support reach, planted carry feet, mirrored attacker behaviour, recovery endpoints and exact impact callbacks. Offline cache references and JavaScript syntax checks passed.

Visual review: the original Docker Motion Lab was inspected in the app browser. Updated poses were rendered directly from samplePair and drawBlockModel with a CPU depth buffer, then reviewed for both wrestlers. These images are geometry previews, not screenshots of the updated browser UI. Ten moves were sampled at five phases for both attackers, plus side views. A separate 101-frame-per-move check found no below-mat mesh vertices.

The updated live browser preview and Docker rebuild could not be verified in this session: local preview connections timed out, and Docker Desktop denied access to its engine pipe. Run Restart-FH.bat to deploy and review the updated Motion Lab.

## Limits
This remains authored block animation, not a full physics simulation. Torso/head envelopes prevent gross body intersections, but they are not exact collision meshes for fingers, hair and every limb. Original sprite animations are unchanged. Physical phone performance and PWA installation have not been retested.

Older screenshot files and browser/depth results in this package are the v1.5.1 baseline; they are not evidence for the new build.
