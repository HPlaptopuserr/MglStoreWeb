@echo off
setlocal
title MGL Self Service Kiosk Setup

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-self-service-kiosk-shortcut.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] MGL Self Service Kiosk setup failed.
  pause
  exit /b 1
)

echo.
echo [OK] Setup complete. Use the MGL Self Service Kiosk icon on Desktop.
pause
exit /b 0
