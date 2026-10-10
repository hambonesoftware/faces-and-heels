# Faces & Heels v1.4 — Docker Quick Start

This package is a static Nginx Docker deployment of the complete v1.4 PWA.

## Start on Windows

1. Install Docker Desktop.
2. Extract this ZIP to a normal folder.
3. Double-click `Start-FH.bat`.
4. The launcher rebuilds with `--no-cache`, force-recreates the container, opens the cache-reset page, and then loads v1.4.

Default address:

`http://localhost:8080`

## Stop

`Stop-FH.bat`

## Restart after edits

`Restart-FH.bat`

## LAN address

`Show-FH-Address.bat`

Use the displayed LAN address from a phone/tablet on the same network. PWA installation/offline support may require HTTPS when not using localhost.

## Manual commands

```powershell
docker compose down
docker compose build --no-cache
docker compose up -d --force-recreate
```

Logs:

```powershell
docker compose logs -f
```

## Test the match engine

Docker is not required for the Node tests.

```powershell
npm test
```

The default suite runs unit/flow/anchor tests plus 1,000 full-match simulations.
