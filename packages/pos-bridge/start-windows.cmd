@echo off
setlocal

cd /d "%~dp0"
title MGL POS Bridge

where node >nul 2>nul
if errorlevel 1 (
  echo [MGL POS Bridge] Node.js is not installed or not in PATH.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)

if not exist "dist\index.js" (
  echo [MGL POS Bridge] dist\index.js was not found.
  echo Build the bridge first from the repository root:
  echo   pnpm --filter @mgl/pos-bridge build
  pause
  exit /b 1
)

echo [MGL POS Bridge] Starting...
echo [MGL POS Bridge] Health URL: http://127.0.0.1:7420/health
node dist\index.js

echo.
echo [MGL POS Bridge] Stopped.
pause
