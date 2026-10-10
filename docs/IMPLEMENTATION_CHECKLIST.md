# Faces & Heels — vNext Implementation Checklist

## Rules / Decision Resolver
- [ ] Create a UI-facing Decision Resolver.
- [ ] Implement the 0 / 1 / many choice policy.
- [ ] Auto-resolve single legal target.
- [ ] Auto-resolve fixed costs and fixed effects.
- [ ] Default optional resource spend to none.
- [ ] Hide transiently impossible moves.
- [ ] Keep strategically useful locked moves visible only when beneficial.
- [ ] Emit opportunities and reactions explicitly.
- [ ] Keep a transparent match log.

## HUD
- [ ] Compact mirrored fighter HUDs.
- [ ] Stamina + Pop/Heat.
- [ ] Major status only.
- [ ] Arena dominates screen.
- [ ] Contextual Action Dock.
- [ ] Dice overlay.
- [ ] Event overlay.
- [ ] Body Status drawer.
- [ ] Move Detail drawer.
- [ ] Match Log drawer.
- [ ] Responsive portrait/landscape/tablet/desktop.

## Procedural Sprite System
- [ ] Extract CharacterDefinition from the current Python renderer.
- [ ] Extract Pose from `draw_character()`.
- [ ] Add named skeleton joints.
- [ ] Add root transform.
- [ ] Add AnimationClip/keyframes.
- [ ] Add paired attacker/defender clips.
- [ ] Add authored event markers.
- [ ] Export transparent sprite atlases.
- [ ] Export JSON atlas metadata.

## First Animation Set
- [ ] Idle.
- [ ] Ready.
- [ ] Head hit reaction.
- [ ] Body hit reaction.
- [ ] Staggered.
- [ ] Prone.
- [ ] Get up.
- [ ] Forearm Smash.
- [ ] Headlock.
- [ ] Vertical Suplex.
- [ ] Pin.
- [ ] Kickout.

## Runtime
- [ ] Canvas 2D sprite renderer.
- [ ] requestAnimationFrame presentation loop.
- [ ] 12–18 fps sprite timeline.
- [ ] Root anchoring.
- [ ] Horizontal flip support.
- [ ] Camera shake.
- [ ] Hit stop.
- [ ] Impact flash.
- [ ] Simple particles.
- [ ] Ring/mat bounce.
- [ ] Event synchronization.

## UX Acceptance
- [ ] Forearm Smash never asks for Head.
- [ ] One legal reaction never opens a list.
- [ ] Pin is contextual.
- [ ] No permanent dice panel.
- [ ] No permanent full body-damage panel.
- [ ] Normal phone view shows 2–4 primary decisions.
- [ ] Full rules remain reachable.
- [ ] No routine confirmation dialog.
- [ ] Next phase auto-advances when there is no decision.

## Vertical Slice
- [ ] Stone vs Viper.
- [ ] Forearm Smash.
- [ ] One target-choice move.
- [ ] Vertical Suplex.
- [ ] One reaction.
- [ ] Pin opportunity.
- [ ] Kickout sequence.
- [ ] Pop/Heat feedback.
- [ ] Match log.
- [ ] Playtest on iPhone-sized viewport.
- [ ] Playtest on iPad landscape.
