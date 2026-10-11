@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Faces ^& Heels
cd /d "%~dp0"

echo.
echo ==========================================
echo       FACES ^& HEELS - STARTING
echo ==========================================
echo.

where docker >nul 2>nul
if errorlevel 1 goto docker_missing

docker compose version >nul 2>nul
if errorlevel 1 goto compose_missing

docker info >nul 2>nul
if not errorlevel 1 goto docker_ready

echo Docker is installed, but the Docker engine is not running.
set "DOCKER_DESKTOP=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
if not exist "!DOCKER_DESKTOP!" set "DOCKER_DESKTOP=%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
if not exist "!DOCKER_DESKTOP!" goto docker_not_running

echo Starting Docker Desktop...
powershell -NoProfile -Command "Start-Process -FilePath '%DOCKER_DESKTOP%' -WindowStyle Hidden"
echo Waiting for Docker Desktop to become ready...
set /a tries=0

:wait_for_docker
timeout /t 3 /nobreak >nul
docker info >nul 2>nul
if not errorlevel 1 goto docker_ready
set /a tries+=1
if !tries! GEQ 40 goto docker_timeout
goto wait_for_docker

:docker_ready
echo Docker is ready.
echo.
echo Building and starting Faces ^& Heels...
docker compose down --remove-orphans >nul 2>nul
docker compose build --no-cache
if errorlevel 1 goto start_failed
docker compose up -d --force-recreate
if errorlevel 1 goto start_failed

echo.
echo Faces ^& Heels is running.
echo.
echo Local address:
echo     http://localhost:8080  ^(v1.5 televised arena^)
echo.
echo Opening the game...
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/reset.html?fh=1.5.2&r=%RANDOM%%RANDOM%"
echo.
echo You can close this window. Docker keeps the game running.
echo Double-click Stop-FH.bat when you want to stop it.
echo.
pause
exit /b 0

:docker_missing
echo ERROR: Docker was not found.
echo Install Docker Desktop, then run Start-FH.bat again.
echo https://www.docker.com/products/docker-desktop/
echo.
pause
exit /b 1

:compose_missing
echo ERROR: Docker Compose is not available.
echo Update/start Docker Desktop and try again.
echo.
pause
exit /b 1

:docker_not_running
echo ERROR: Docker is installed, but Docker Desktop could not be started automatically.
echo Start Docker Desktop manually, wait until it is ready, then run Start-FH.bat again.
echo.
pause
exit /b 1

:docker_timeout
echo.
echo ERROR: Docker Desktop did not become ready in about two minutes.
echo Start Docker Desktop manually and try again.
echo.
pause
exit /b 1

:start_failed
echo.
echo ERROR: Faces ^& Heels failed to build or start.
echo.
echo For details run:
echo     docker compose logs
echo.
pause
exit /b 1
