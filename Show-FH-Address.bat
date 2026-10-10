@echo off
setlocal
cd /d "%~dp0"
title Faces ^& Heels Address

echo.
echo Local address:
echo     http://localhost:8080
echo.
echo LAN IPv4 addresses on this PC:
powershell -NoProfile -Command "$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }; foreach ($i in $ips) { Write-Host ('    http://' + $i.IPAddress + ':8080') }"
echo.
echo A phone or tablet must be on the same network and Windows Firewall must allow the port.
echo HTTP is enough to load/play the site, but installable/offline PWA features normally require HTTPS except on localhost.
echo.
pause
