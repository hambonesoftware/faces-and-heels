@echo off
setlocal
cd /d "%~dp0"
title Update Faces ^& Heels

echo Building Faces ^& Heels v1.5.2 coordinated moves...
docker compose build
if errorlevel 1 (
    echo Build failed. The current running container has not been replaced.
    pause
    exit /b 1
)
docker compose up -d --force-recreate
if errorlevel 1 (
    echo Unable to start Faces ^& Heels. Check Docker Desktop.
    pause
    exit /b 1
)
echo Updated container started. Opening the new Motion Lab...
timeout /t 3 /nobreak >nul
start "" "http://localhost:8080/reset.html?fh=1.5.2&next=motion-lab.html"
exit /b 0
