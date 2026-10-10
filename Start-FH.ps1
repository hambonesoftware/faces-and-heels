$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      FACES & HEELS - STARTING" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker was not found. Install Docker Desktop first." -ForegroundColor Red
    Write-Host "https://www.docker.com/products/docker-desktop/"
    Read-Host "Press Enter to close"
    exit 1
}

& docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Compose is not available. Update/start Docker Desktop." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    $dockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktop) {
        Write-Host "Starting Docker Desktop..."
        Start-Process $dockerDesktop
    }

    Write-Host "Waiting for Docker Desktop..."
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Seconds 3
        & docker info *> $null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        Write-Host "Docker Desktop did not become ready in time." -ForegroundColor Red
        Read-Host "Press Enter to close"
        exit 1
    }
}

Write-Host "Building and starting Faces & Heels..."
& docker compose down --remove-orphans *> $null
docker compose build --no-cache
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }
docker compose up -d --force-recreate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Faces & Heels failed to start. Run: docker compose logs" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "Faces & Heels is running at http://localhost:8080" -ForegroundColor Green
Start-Sleep -Seconds 2
Start-Process ("http://localhost:8080/reset.html?fh=1.5.0&t=" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
