@echo off
setlocal

cd /d "%~dp0"
title MGL POS Bridge Installer

echo.
echo ==========================================
echo   MGL POS Bridge - Android PGW Installer
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js oldsongui.
  echo Node.js LTS suulgaad dahin ajilluulna uu.
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "bridge.env" (
  echo [SETUP] bridge.env uusgej baina...
  (
    echo BRIDGE_PROVIDER=android-pgw
    echo BRIDGE_PORT=7420
    echo ANDROID_PGW_PORT=auto
    echo ANDROID_PGW_AMOUNT_MULTIPLIER=100
    echo ANDROID_PGW_BAUD_RATE=9600
    echo ANDROID_PGW_DATA_BITS=8
    echo ANDROID_PGW_STOP_BITS=1
    echo ANDROID_PGW_PARITY=none
    echo ANDROID_PGW_TIMEOUT_MS=120000
    echo ANDROID_PGW_HEALTH_TIMEOUT_MS=4000
    echo ANDROID_PGW_RESPONSE_IDLE_MS=700
  ) > "bridge.env"
) else (
  echo [OK] bridge.env baina.
)

if not exist "dist\index.js" (
  echo [BUILD] dist\index.js oldsongui. Build hiih gej baina...
  where pnpm >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] pnpm oldsongui tul bridge build hiij chadsangui.
    echo Developer machine deer:
    echo   pnpm --filter @mgl/pos-bridge build
    echo gej build hiigeed ene folder-iig cashier PC ruu huulna uu.
    echo.
    pause
    exit /b 1
  )
  call pnpm build
  if errorlevel 1 (
    echo [ERROR] Bridge build amjiltgui bolloo.
    pause
    exit /b 1
  )
)

if not exist "start-windows.cmd" (
  echo [ERROR] start-windows.cmd oldsongui.
  pause
  exit /b 1
)

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_DIR%\MGL POS Bridge.lnk"
set "PS_FILE=%TEMP%\mgl-pos-bridge-startup.ps1"

echo [SETUP] Windows Startup shortcut uusgej baina...
(
  echo $ErrorActionPreference = 'Stop'
  echo $shell = New-Object -ComObject WScript.Shell
  echo $shortcut = $shell.CreateShortcut('%SHORTCUT%')
  echo $shortcut.TargetPath = $env:ComSpec
  echo $shortcut.Arguments = '/c ""%~dp0start-windows.cmd""'
  echo $shortcut.WorkingDirectory = '%~dp0'
  echo $shortcut.WindowStyle = 7
  echo $shortcut.Description = 'MGL POS Bridge for Android PGW terminal'
  echo $shortcut.Save()
) > "%PS_FILE%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_FILE%"
if errorlevel 1 (
  echo [ERROR] Startup shortcut uusgej chadsangui.
  pause
  exit /b 1
)

del "%PS_FILE%" >nul 2>nul

echo.
echo [OK] Suulgalt duuslaa.
echo [OK] PC login hiih burd bridge automataar asna.
echo [OK] Health URL: http://127.0.0.1:7420/health
echo.
echo Odoo bridge-iig shuud asaay.
echo Terminal USB-eer zalgagdsan esehiig shalgaad Enter darna uu.
pause

call "%~dp0start-windows.cmd"
