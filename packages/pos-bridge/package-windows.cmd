@echo off
setlocal

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\package-windows.ps1" %*

if errorlevel 1 (
  echo.
  echo [ERROR] Windows package uusgeh ajil amjiltgui bolloo.
  pause
  exit /b 1
)

echo.
echo [OK] Windows package uuslee.
pause
