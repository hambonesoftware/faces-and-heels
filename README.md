# Faces & Heels v1.5 — Iso Action Figures

v1.5 is the playable camera/renderer experiment recommended after v1.4. It keeps the complete Stone-vs-Viper match loop and adds a new default **isometric articulated action-figure renderer** while retaining the v1.4 procedural sprite renderer as an in-game fallback/comparison mode.

## Windows / Docker quick start

1. Install and start Docker Desktop.
2. Extract this ZIP.
3. Double-click `Start-FH.bat` (or `Start-FH.cmd`).
4. The launcher rebuilds and opens `http://localhost:8080` through `reset.html`, which clears older service-worker caches first.

Use `Stop-FH.bat` to stop the container and `Restart-FH.bat` after source changes.

## Compare the two renderers

Open **Menu → Presentation settings → Wrestler renderer**.

- **ISO ACTION FIGURES** — default v1.5 renderer. Dependency-free Canvas 2D articulated pseudo-3D models, isometric projection, depth ordering, shaded body masses, camera presets, and soft contact shadows.
- **LEGACY SPRITES** — the v1.4 generated sprite atlases and contact-anchor renderer.

The match engine and dice outcomes are identical in both modes.

## Why this prototype exists

The purpose of v1.5 is to answer one product question: does three-quarter/isometric staging make grapples, throws, overlap, and character volume read better enough to justify moving farther toward a WebGL/true-3D renderer?

No downloaded models or AI-generated wrestler art are used. Stone and Viper are still generated from code and retain the chunky action-figure proportions established in earlier builds.

## Offline PWA

The service worker caches both `iso-stage.js` and the full legacy sprite set. Once loaded successfully over a secure context (HTTPS, or localhost for development), the PWA can continue to run offline.

## Tests

Run:

```bash
npm test
```

The release gate includes the existing Smart Flow, contact-anchor, complete-match-loop, presentation/progression tests, v1.5 renderer checks, and **1,000 complete automated matches**.

See `TEST_REPORT.md` and `docs/V1.5_ISO_ACTION_FIGURES.md` for exact results and limitations.
