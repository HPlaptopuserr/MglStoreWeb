@echo off
setlocal

cd /d "%~dp0"
title MGL POS Bridge

set "NODE_EXE=%CD%\runtime\node.exe"
if exist "%NODE_EXE%" (
  echo [MGL POS Bridge] Using bundled Node runtime.
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo [MGL POS Bridge] Node.js was not found.
    echo Use package-windows.cmd on the developer machine to create a portable bridge package,
    echo or install Node.js LTS on this PC.
    pause
    exit /b 1
  )
  set "NODE_EXE=node"
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
"%NODE_EXE%" dist\index.js

echo.
echo [MGL POS Bridge] Stopped.
pause
