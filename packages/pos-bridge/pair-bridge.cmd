@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title MGL PAX A35 Pairing

set "NODE_EXE=%CD%\runtime\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
"%NODE_EXE%" "%CD%\dist\pair.js"
if errorlevel 1 (
  echo [ERROR] Pairing failed. Keep the existing journal and resolve any pending payment.
  pause
  exit /b 1
)

rem Pairing validates the local journal and API pending-payment guard before
rem replacing a key. Stop the old process only after that exchange succeeds.
powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\stop-installed-bridge.ps1" -BridgeDir "%CD%" -PreserveCaller
if errorlevel 1 exit /b 1
powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\register-startup-task.ps1" -BridgeDir "%CD%" -StartNow
if errorlevel 1 exit /b 1
powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\check-bridge-ready.ps1" -BridgeDir "%CD%" -TimeoutSeconds 25
if errorlevel 1 (
  echo [INFO] Paired. Check the USB COM connection and the bridge log.
  pause
  exit /b 1
)
echo [OK] Paired bridge is ready. Check its status in Admin.
pause
