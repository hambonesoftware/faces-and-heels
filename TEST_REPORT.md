# Faces & Heels v1.5 — Test Report

## Automated validation completed

`npm test` passed with the existing release gate plus the new v1.5 renderer check.

- Smart Flow tests: PASS
- v1.1 identity/contact-anchor tests: PASS
- v1.3 complete-match-loop unit tests: PASS
- Presentation/progression tests: PASS
- v1.5 isometric renderer/source checks: PASS
- Full-match simulations: **1,000 / 1,000 completed with a valid winner**
- Stone wins: 544
- Viper wins: 456
- Average engine steps: 29.1
- Maximum engine steps: 204
- Average pin attempts: 6.27
- Average reactions: 3.80
- Successful/failed reactions: 2179 / 1618
- Average control changes: 4.56
- Average Neutral rolls: 2.50
- Average recovery actions: 0.90
- Average post-kickout scrambles: 5.91
- Kickouts: count 1 = 2914; count 2 = 1527; count 3 = 830
- Crowd spends: roll boosts = 2727; stamina recovery = 866
- Body marks added: 1889

The simulation totals remain identical to the v1.4 seeded baseline, which is expected because v1.5 changes presentation rather than combat resolution.

## Static/source validation

- `node --check app.js`: PASS
- `node --check iso-stage.js`: PASS
- `node --check sw.js`: PASS
- Procedural Python generator compilation: PASS
- Service worker includes both isometric renderer code and the legacy sprite set for offline fallback.

## Browser validation limitation

A local HTTP server was started and Chromium headless capture was attempted at a phone-sized viewport. Chromium did not complete the capture in this execution environment, so no screenshot is claimed as an observed browser render of v1.5. This package therefore has automated source/gameplay validation but still needs a human browser/device visual pass after launch.

## Docker limitation

Docker Desktop is not available inside this execution environment. The existing v1.4 Docker configuration and Windows launch scripts were preserved and version-bumped, but the container itself was not started here.

## Recommended manual acceptance pass

After `Start-FH.bat` launches the game:
1. Play the opening Neutral roll in ISO mode.
2. Compare Forearm Smash, Headlock, Body Slam, Dragon Screw, Clothesline, Vertical Suplex, pin, and kickout.
3. Open Menu → Presentation settings → Wrestler renderer → Legacy Sprites and replay the same sequences.
4. Decide whether the increase in depth/contact readability is large enough to justify a later true-WebGL renderer.
