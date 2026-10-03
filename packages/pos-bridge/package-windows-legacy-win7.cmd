@echo off
setlocal

cd /d "%~dp0"

if "%~1"=="" (
  echo [ERROR] Node.js 12 node.exe zam zaaj ogno uu.
  echo Example:
  echo   package-windows-legacy-win7.cmd C:\tmp\node-v12.22.12-win-x64\node.exe
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\package-windows.ps1" -LegacyWin7 -NodeExe "%~1"

if errorlevel 1 (
  echo.
  echo [ERROR] Legacy Windows package uusgeh ajil amjiltgui bolloo.
  pause
  exit /b 1
)

echo.
echo [OK] Legacy Windows package uuslee.
pause
