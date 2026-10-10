# Generated Sprite Assets

This directory is reserved for exported procedural wrestler sprite atlases and their JSON metadata.

The implementation target is defined in:

- `../../docs/Faces_and_Heels_Match_UX_HUD_Spec_v1.0.md`
- `../../docs/IMPLEMENTATION_CHECKLIST.md`

Initial animation priority:

1. Idle
2. Ready
3. Head hit reaction
4. Body hit reaction
5. Staggered
6. Prone
7. Get up
8. Forearm Smash
9. Headlock
10. Vertical Suplex
11. Pin
12. Kickout

Runtime target: Canvas 2D compositor using `requestAnimationFrame()`, with sprite animation authored around 12–18 fps and runtime impact FX layered separately.
