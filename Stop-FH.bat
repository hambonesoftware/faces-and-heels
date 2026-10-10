@echo off
setlocal
cd /d "%~dp0"
title Stop Faces ^& Heels

echo Stopping Faces ^& Heels...
docker compose down
if errorlevel 1 (
    echo.
    echo ERROR: Faces ^& Heels could not be stopped.
    pause
    exit /b 1
)

echo.
echo Faces ^& Heels has stopped.
timeout /t 2 /nobreak >nul
exit /b 0
