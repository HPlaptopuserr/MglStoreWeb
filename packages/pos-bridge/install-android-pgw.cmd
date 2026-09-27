@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"
title MGL POS Bridge Installer

set "INSTALL_DIR=%LOCALAPPDATA%\MGLStore\pos-bridge"
set "IS_INSTALLED="
set "NO_START="
set "NO_PAUSE="
set "ROBOCOPY_EXCLUDED_DIRS=.git .turbo release"

if exist "%CD%\..\..\pnpm-workspace.yaml" (
  set "ROBOCOPY_EXCLUDED_DIRS=.git .turbo release node_modules"
)

:parse_args
if "%~1"=="" goto after_parse_args
if /I "%~1"=="--installed" set "IS_INSTALLED=1"
if /I "%~1"=="--no-start" set "NO_START=1"
if /I "%~1"=="--no-pause" set "NO_PAUSE=1"
shift
goto parse_args

:after_parse_args

ver | find "6.1." >nul
if not errorlevel 1 (
  if not exist "windows-7-compatible.marker" (
    echo [ERROR] Ene POS Bridge package Windows 7-d tohirohgui shine Node.js runtime-tai baina.
    echo [ERROR] mgl-pos-bridge-legacy-win7.zip package-iig ashiglana uu.
    echo.
    if not defined NO_PAUSE pause
    exit /b 1
  )
)

if not defined IS_INSTALLED (
  if /I not "%CD%"=="%INSTALL_DIR%" (
    echo [SETUP] Bridge-iig cashier PC deer suulgaj baina...
    echo [SETUP] Source: %CD%
    echo [SETUP] Target: %INSTALL_DIR%
    echo.

    if exist "%~dp0stop-installed-bridge.ps1" (
      echo [SETUP] Huuchin bridge process-iig zogsooj baina...
      powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-installed-bridge.ps1" -BridgeDir "%INSTALL_DIR%"
      if errorlevel 1 (
        echo [WARN] Huuchin bridge process-iig buren zogsooj chadsangui. File copy hiij shalgana.
      )
    )

    if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
    echo [SETUP] Bridge files-iig shinechilj baina...
    robocopy "%CD%" "%INSTALL_DIR%" /MIR /XD %ROBOCOPY_EXCLUDED_DIRS% /XF "bridge.env" /R:3 /W:1 /NP /LOG:"%TEMP%\mgl-pos-bridge-install-robocopy.log" >nul
    if errorlevel 8 (
      echo [ERROR] Bridge files huulahad aldaa garlaa.
      if exist "%TEMP%\mgl-pos-bridge-install-robocopy.log" type "%TEMP%\mgl-pos-bridge-install-robocopy.log"
      if not defined NO_PAUSE pause
      exit /b 1
    )
    echo [OK] Bridge files shinechlegdlee.

    if defined NO_START (
      if defined NO_PAUSE (
        call "%INSTALL_DIR%\install-android-pgw.cmd" --installed --no-start --no-pause
      ) else (
        call "%INSTALL_DIR%\install-android-pgw.cmd" --installed --no-start
      )
    ) else (
      if defined NO_PAUSE (
        call "%INSTALL_DIR%\install-android-pgw.cmd" --installed --no-pause
      ) else (
        call "%INSTALL_DIR%\install-android-pgw.cmd" --installed
      )
    )
    exit /b !ERRORLEVEL!
  )
)

echo.
echo ==========================================
echo   MGL POS Bridge - Android PGW Installer
echo ==========================================
echo.

set "NODE_EXE=%CD%\runtime\node.exe"
if exist "%NODE_EXE%" (
  echo [OK] Bundled Node runtime baina.
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Node.js oldsongui.
    echo Developer machine deer package-windows.cmd ajilluulaad portable package uusgene uu,
    echo esvel ene PC deer Node.js LTS suulgaad dahin ajilluulna uu.
    echo https://nodejs.org/
    echo.
    if not defined NO_PAUSE pause
    exit /b 1
  )
  echo [OK] System Node.js baina.
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
    echo   pnpm --filter @mgl/pos-bridge package:windows
    echo gej portable package uusgeed cashier PC ruu huulna uu.
    echo.
    if not defined NO_PAUSE pause
    exit /b 1
  )
  call pnpm build
  if errorlevel 1 (
    echo [ERROR] Bridge build amjiltgui bolloo.
    if not defined NO_PAUSE pause
    exit /b 1
  )
)

if not exist "node_modules\body-parser" (
  echo [SETUP] Production dependencies dutuu baina. npm install hiij baina...
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] npm oldsongui tul dependency suulgaj chadsangui.
    echo Developer machine deer:
    echo   pnpm --filter @mgl/pos-bridge package:windows
    echo gej portable package uusgeed cashier PC ruu huulna uu.
    echo.
    if not defined NO_PAUSE pause
    exit /b 1
  )
  call npm install --omit=dev --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] Production dependencies suulgahad aldaa garlaa.
    if not defined NO_PAUSE pause
    exit /b 1
  )
)

if not exist "start-windows.cmd" (
  echo [ERROR] start-windows.cmd oldsongui.
  if not defined NO_PAUSE pause
  exit /b 1
)

if not exist "register-startup-task.ps1" (
  echo [ERROR] register-startup-task.ps1 oldsongui.
  if not defined NO_PAUSE pause
  exit /b 1
)

if not exist "start-windows-task.ps1" (
  echo [ERROR] start-windows-task.ps1 oldsongui.
  if not defined NO_PAUSE pause
  exit /b 1
)

if not exist "stop-installed-bridge.ps1" (
  echo [ERROR] stop-installed-bridge.ps1 oldsongui.
  if not defined NO_PAUSE pause
  exit /b 1
)

if not exist "check-bridge-ready.ps1" (
  echo [ERROR] check-bridge-ready.ps1 oldsongui.
  if not defined NO_PAUSE pause
  exit /b 1
)

echo [SETUP] Windows Scheduled Task uusgeed bridge-iig asaaj baina...
if defined NO_START (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-startup-task.ps1" -BridgeDir "%CD%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-startup-task.ps1" -BridgeDir "%CD%" -StartNow
)
if errorlevel 1 (
  echo [ERROR] Scheduled Task uusgeh esvel bridge-iig asaahad aldaa garlaa.
  if not defined NO_PAUSE pause
  exit /b 1
)

echo.
echo [OK] Suulgalt duuslaa.
echo [OK] PC login hiisnii daraa bridge automataar asna.
echo [OK] Bridge untrah uyd Windows dahin asaah gej oroldono.
echo [OK] Health URL: http://127.0.0.1:7420/health
echo.

if defined NO_START (
  echo [OK] --no-start songoson tul bridge-iig odoo shuud asaahgui.
  exit /b 0
)

echo [OK] Bridge background deer asah gej baina.
echo [OK] Ene installer console-iig haasan ch bridge ajillasan heveeree baina.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-bridge-ready.ps1" -BridgeDir "%CD%" -TimeoutSeconds 25
if errorlevel 1 (
  echo.
  echo [WARN] Bridge asahgui baina. Deerh log-iig zurag avaad yavuulna uu.
  echo [WARN] Turshij uzeh bol start-windows.cmd-iig ajilluulaad aldaag ni harj bolno.
  if not defined NO_PAUSE pause
  exit /b 1
)

if not defined NO_PAUSE pause
exit /b 0
