@echo off
title PEN FIGHT room server
cd /d "%~dp0"
echo PEN FIGHT room server  (ws://THIS-PC-IP:8765)
echo Phones and this PC must be on the same Wi-Fi / hotspot. Keep this window open while playing.
echo Allow it in Windows Firewall (Private network) when asked, or open port 8765.
node room-server.js
pause
