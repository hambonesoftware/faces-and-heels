# PWA / Mobile Requirements

## Installability

- Web App Manifest.
- Standalone display mode where supported.
- App icons and splash assets.
- Theme/background colors.
- HTTPS in production.
- Service worker for shell and static asset caching.

## iPhone / iPad considerations

- safe-area CSS insets;
- orientation handling without losing match state;
- prevent accidental page zoom during active gameplay where appropriate while preserving accessibility;
- large tap targets;
- no hover dependency;
- audio starts only after user interaction where browser policies require it;
- pause / restore cleanly after app backgrounding;
- IndexedDB persistence before suspension-sensitive transitions.

## Asset strategy

Do not preload every wrestler and move animation in the game at once.

Load:

1. app shell and current wrestler cosmetics;
2. common match UI;
3. current wrestler move animation bundles;
4. additional assets on demand.

Use WebP/AVIF where practical for static assets, and texture atlases for sprite animation.

## Performance targets

Working targets for prototype:

- responsive UI at 60 fps on modern phones;
- character animation may intentionally use 8–12 authored frames per second while transforms/effects run smoothly;
- minimize overdraw and huge transparent textures;
- provide reduced-motion mode;
- use device-pixel-ratio caps if high-resolution canvases become expensive.

## Offline behavior

Never let service-worker caching create two different active app versions during a match. New versions should activate between sessions or after explicit reload/update handling.
