# v1.6.0 Ringside

- Rebuilt the UI stylesheet around a charcoal, ivory, gold, and crimson wrestling broadcast identity.
- Added original vector wrestler portraits and illustrations for all seven moves.
- Added a match-poster introduction, broadcast HUD, illustrated action cards, move details and chance meter.
- Connected body silhouette regions to their actual damage marks.
- Expanded victory records and championship milestone presentation.
- Moved renderer comparison controls and Motion Lab into presentation settings.
- Added modal focus management, Escape handling, and keyboard focus trapping.
- Updated versioned assets and the offline cache while retaining match rules and progression compatibility.
- Passed the full existing test suite, including 1,000 complete matches and 22,022 paired animation samples.

# v1.5 Iso Action Figures

- Added dependency-free articulated isometric wrestler renderer.
- Made Iso Action Figures the default visual renderer.
- Preserved legacy procedural sprite renderer as a runtime comparison option.
- Added pseudo-3D body volume, depth sorting, shaded limbs/torso, ground shadows, and identity-specific Stone/Viper details.
- Added camera behavior for standing exchanges, grapples, throws, ground actions, pins, and kickouts.
- Reused the existing complete match engine; no combat math was changed.
- Updated service-worker cache to v1.5 and cached both renderer paths for offline use.
- Added v1.5 regression tests and retained 1,000-match simulation gate.
