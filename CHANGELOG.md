# v1.5 Iso Action Figures

- Added dependency-free articulated isometric wrestler renderer.
- Made Iso Action Figures the default visual renderer.
- Preserved legacy procedural sprite renderer as a runtime comparison option.
- Added pseudo-3D body volume, depth sorting, shaded limbs/torso, ground shadows, and identity-specific Stone/Viper details.
- Added camera behavior for standing exchanges, grapples, throws, ground actions, pins, and kickouts.
- Reused the existing complete match engine; no combat math was changed.
- Updated service-worker cache to v1.5 and cached both renderer paths for offline use.
- Added v1.5 regression tests and retained 1,000-match simulation gate.
