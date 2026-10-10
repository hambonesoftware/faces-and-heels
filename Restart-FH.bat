@echo off
setlocal
cd /d "%~dp0"
title Restart Faces ^& Heels

echo Rebuilding and restarting Faces ^& Heels...
docker compose down >nul 2>nul
docker compose build --no-cache
if errorlevel 1 goto :eof
docker compose up -d --force-recreate
if errorlevel 1 (
    echo.
    echo ERROR: Faces ^& Heels failed to restart.
    pause
    exit /b 1
)

echo.
echo Faces ^& Heels is running at http://localhost:8080
start "" "http://localhost:8080/reset.html?fh=1.5.0&r=%RANDOM%%RANDOM%"
timeout /t 2 /nobreak >nul
exit /b 0
