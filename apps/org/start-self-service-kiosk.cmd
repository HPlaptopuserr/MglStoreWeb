@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "DRY_RUN="
set "KIOSK_URL="
if /I "%~1"=="--dry-run" (
  set "DRY_RUN=1"
) else (
  set "KIOSK_URL=%~1"
)
if /I "%~2"=="--dry-run" set "DRY_RUN=1"
if not defined KIOSK_URL set "KIOSK_URL=%MGL_SELF_SERVICE_URL%"
if not defined KIOSK_URL set "KIOSK_URL=http://localhost:3004/dashboard/self-service?silentPrint=1"

set "BROWSER_EXE="

rem Opera GX is the browser currently used on this cashier PC.
if exist "%LOCALAPPDATA%\Programs\Opera GX\opera.exe" set "BROWSER_EXE=%LOCALAPPDATA%\Programs\Opera GX\opera.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if not defined BROWSER_EXE (
  echo [ERROR] Opera GX, Chrome esvel Edge oldsongui.
  echo Chromium browser suulgaad dahin ajilluulna uu.
  pause
  exit /b 1
)

set "KIOSK_PROFILE=%LOCALAPPDATA%\MGLStore\SelfServiceKioskBrowser"

set "SILENT_PRINT_READY=1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-self-service-printer.ps1"
if errorlevel 1 (
  set "IS_LOCAL_TEST="
  if /I not "!KIOSK_URL:http://localhost=!"=="!KIOSK_URL!" set "IS_LOCAL_TEST=1"
  if /I not "!KIOSK_URL:http://127.0.0.1=!"=="!KIOSK_URL!" set "IS_LOCAL_TEST=1"

  if defined IS_LOCAL_TEST (
    set "SILENT_PRINT_READY="
    for /f "tokens=1 delims=?" %%A in ("!KIOSK_URL!") do set "KIOSK_URL=%%~A"
    echo [TEST] Kiosk will open without automatic printing.
  ) else (
    echo.
    echo [STOPPED] Direct printing is not ready. The kiosk was not opened.
    if defined DRY_RUN exit /b 2
    pause
    exit /b 2
  )
)

if defined DRY_RUN (
  echo BROWSER=!BROWSER_EXE!
  echo PROFILE=!KIOSK_PROFILE!
  echo URL=!KIOSK_URL!
  if defined SILENT_PRINT_READY (
    echo FLAGS=--kiosk --kiosk-printing
  ) else (
    echo FLAGS=--kiosk
  )
  exit /b 0
)

if defined SILENT_PRINT_READY (
  start "MGL Self Service" "!BROWSER_EXE!" ^
    --user-data-dir="!KIOSK_PROFILE!" ^
    --kiosk ^
    --kiosk-printing ^
    --no-first-run ^
    --disable-session-crashed-bubble ^
    --disable-pinch ^
    "!KIOSK_URL!"
) else (
  start "MGL Self Service Test" "!BROWSER_EXE!" ^
    --user-data-dir="!KIOSK_PROFILE!" ^
    --kiosk ^
    --no-first-run ^
    --disable-session-crashed-bubble ^
    --disable-pinch ^
    "!KIOSK_URL!"
)

exit /b 0
