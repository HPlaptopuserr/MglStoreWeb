param(
  [string]$OutputRoot = "",
  [string]$NodeExe = "",
  [switch]$LegacyWin7
)

$ErrorActionPreference = "Stop"

$PackageDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$RepoRoot = Resolve-Path (Join-Path $PackageDir "..\..")

if (-not $OutputRoot -or $OutputRoot.Trim().Length -eq 0) {
  $OutputRoot = "C:\tmp\mgl-pos-bridge-release"
}

$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$PackageDirPath = [System.IO.Path]::GetFullPath($PackageDir)
$BuildStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$PackageSuffix = if ($LegacyWin7) { "legacy-win7" } else { "android-pgw" }
$OutDir = Join-Path $OutputRoot "mgl-pos-bridge-$PackageSuffix-$BuildStamp"
$ZipPath = Join-Path $OutputRoot "mgl-pos-bridge-$PackageSuffix.zip"
$ZipFileName = Split-Path -Leaf $ZipPath
$InstallerWorkDir = Join-Path $OutputRoot "installer-work"
$InstallerExePath = Join-Path $OutputRoot "MGL-POS-Bridge-$PackageSuffix-Installer.exe"

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  Push-Location $WorkingDirectory
  try {
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$FilePath $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Assert-SafeOutputPath {
  param([string]$PathToCheck)

  $fullPath = [System.IO.Path]::GetFullPath($PathToCheck)
  if (-not $fullPath.StartsWith($PackageDirPath, [System.StringComparison]::OrdinalIgnoreCase) -and
      -not $fullPath.StartsWith((Resolve-Path "C:\tmp").Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Output path must be inside the pos-bridge package directory or C:\tmp. Got: $fullPath"
  }
}

Assert-SafeOutputPath $OutputRoot

$pnpm = (Get-Command pnpm -ErrorAction Stop).Source
$npm = (Get-Command npm -ErrorAction Stop).Source

if (-not $NodeExe -or $NodeExe.Trim().Length -eq 0) {
  $NodeExe = (Get-Command node -ErrorAction Stop).Source
}
$NodeExe = [System.IO.Path]::GetFullPath($NodeExe)
if (-not (Test-Path $NodeExe)) {
  throw "Node runtime not found: $NodeExe"
}

$NodeDir = Split-Path -Parent $NodeExe
$PackageNpm = $npm
if ($LegacyWin7) {
  $NodeVersionText = (& $NodeExe -v) 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $NodeVersionText) {
    throw "Legacy Node runtime could not be executed: $NodeExe"
  }
  if ($NodeVersionText -notmatch "^v12\.") {
    throw "LegacyWin7 package requires Node.js 12.x runtime. Got $NodeVersionText from $NodeExe"
  }

  $CandidateNpm = Join-Path $NodeDir "npm.cmd"
  if (-not (Test-Path $CandidateNpm)) {
    throw "Legacy Node npm.cmd not found next to node.exe: $CandidateNpm"
  }
  $PackageNpm = $CandidateNpm
}

Write-Host "[BUILD] Compiling @mgl/pos-bridge..."
if ($LegacyWin7) {
  Invoke-Checked $pnpm @("--filter", "@mgl/pos-bridge", "exec", "tsc", "-p", "tsconfig.json", "--target", "ES2019") $RepoRoot
} else {
  Invoke-Checked $pnpm @("--filter", "@mgl/pos-bridge", "build") $RepoRoot
}

if (-not (Test-Path $OutputRoot)) {
  New-Item -ItemType Directory -Path $OutputRoot | Out-Null
}

Write-Host "[PACKAGE] Copying bridge files..."
New-Item -ItemType Directory -Path $OutDir | Out-Null
Copy-Item -LiteralPath (Join-Path $PackageDir "package.json") -Destination $OutDir -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "check-bridge-ready.ps1") -Destination $OutDir -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "dist") -Destination $OutDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "install-android-pgw.cmd") -Destination $OutDir -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "register-startup-task.ps1") -Destination $OutDir -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "start-windows.cmd") -Destination $OutDir -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "start-windows-task.ps1") -Destination $OutDir -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "stop-installed-bridge.ps1") -Destination $OutDir -Force

if ($LegacyWin7) {
  $PackageJsonPath = Join-Path $OutDir "package.json"
  $PackageJson = Get-Content -Raw -LiteralPath $PackageJsonPath | ConvertFrom-Json
  $PackageJson.dependencies.serialport = "10.5.0"
  $PackageJson | Add-Member -NotePropertyName "engines" -NotePropertyValue @{ node = ">=12 <13" } -Force
  $PackageJson | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $PackageJsonPath -Encoding ASCII
}

Write-Host "[PACKAGE] Installing production dependencies..."
if ($LegacyWin7) {
  Invoke-Checked $PackageNpm @("install", "--only=production", "--no-audit", "--no-fund", "--scripts-prepend-node-path=true") $OutDir
} else {
  Invoke-Checked $PackageNpm @("install", "--omit=dev", "--no-audit", "--no-fund") $OutDir
}

$RuntimeDir = Join-Path $OutDir "runtime"
New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
Copy-Item -LiteralPath $NodeExe -Destination (Join-Path $RuntimeDir "node.exe") -Force

if ($LegacyWin7) {
  Set-Content `
    -LiteralPath (Join-Path $OutDir "windows-7-compatible.marker") `
    -Value "MGL POS Bridge Windows 7 runtime: Node.js 12.x" `
    -Encoding ASCII
}

$PayloadFiles = @(Get-ChildItem -LiteralPath $OutDir -Recurse | Where-Object { -not $_.PSIsContainer })
$ExpectedFileCount = $PayloadFiles.Count
$ExpectedByteCount = ($PayloadFiles | Measure-Object -Property Length -Sum).Sum

if (Test-Path $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Write-Host "[ZIP] Creating flash-drive zip..."
Compress-Archive -Path (Join-Path $OutDir "*") -DestinationPath $ZipPath -Force

if (Get-Command iexpress.exe -ErrorAction SilentlyContinue) {
  Write-Host "[EXE] Creating self-extracting installer..."
  if (Test-Path $InstallerWorkDir) {
    Remove-Item -LiteralPath $InstallerWorkDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $InstallerWorkDir | Out-Null

  Copy-Item -LiteralPath $ZipPath -Destination (Join-Path $InstallerWorkDir $ZipFileName) -Force

  $ExtractorPath = Join-Path $InstallerWorkDir "extract-zip.ps1"
  @'
param(
  [string]$ZipPath,
  [string]$DestinationPath,
  [int]$ExpectedFileCount,
  [Int64]$ExpectedByteCount
)

$ErrorActionPreference = "Stop"

function Get-ExtractedPayload {
  $Files = @(Get-ChildItem -LiteralPath $DestinationPath -Recurse | Where-Object { -not $_.PSIsContainer })
  $Bytes = ($Files | Measure-Object -Property Length -Sum).Sum
  if ($Bytes -eq $null) {
    $Bytes = 0
  }

  return New-Object PSObject -Property @{
    FileCount = $Files.Count
    ByteCount = [Int64]$Bytes
  }
}

$ExpandArchive = Get-Command Expand-Archive -ErrorAction SilentlyContinue
if ($ExpandArchive) {
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $DestinationPath -Force
} else {
  $Shell = New-Object -ComObject Shell.Application
  $ZipFolder = $Shell.NameSpace($ZipPath)
  $DestinationFolder = $Shell.NameSpace($DestinationPath)
  if ($ZipFolder -eq $null -or $DestinationFolder -eq $null) {
    throw "Windows ZIP extractor could not open the package or destination."
  }

  $DestinationFolder.CopyHere($ZipFolder.Items(), 20)
  $Deadline = (Get-Date).AddMinutes(5)
  do {
    Start-Sleep -Milliseconds 500
    $Payload = Get-ExtractedPayload
  } while (
    ($Payload.FileCount -ne $ExpectedFileCount -or $Payload.ByteCount -ne $ExpectedByteCount) -and
    (Get-Date) -lt $Deadline
  )
}

$Payload = Get-ExtractedPayload
if ($Payload.FileCount -ne $ExpectedFileCount -or $Payload.ByteCount -ne $ExpectedByteCount) {
  throw "ZIP extraction did not finish correctly. Expected $ExpectedFileCount files / $ExpectedByteCount bytes; got $($Payload.FileCount) files / $($Payload.ByteCount) bytes."
}
'@ | Set-Content -LiteralPath $ExtractorPath -Encoding ASCII

  $BootstrapPath = Join-Path $InstallerWorkDir "install-from-zip.cmd"
  $ResultDialogPath = Join-Path $InstallerWorkDir "show-install-result.ps1"
  @'
param(
  [int]$ExitCode = 1,
  [string]$Stage = "install"
)

$Title = "MGL POS Bridge Installer"
$InstallDir = Join-Path $env:LOCALAPPDATA "MGLStore\pos-bridge"
$LogPath = Join-Path $InstallDir "logs\bridge.log"

if ($ExitCode -eq 0) {
  $Message = @"
MGL POS Bridge AMJILTTAI SUULGAGDLAA.

Tuluv: AJILLAJ BAINA
Health: http://127.0.0.1:7420/health
Suulgasan zam: $InstallDir

Odoo POS deer kartiin tulburuu dahin oroldono uu.
"@
  $Icon = 64
} else {
  if ($Stage -eq "extract") {
    $Problem = "Installer failiig zadlah ued ALDAA garlaa."
  } else {
    $Problem = "POS Bridge-iig suulgah esvel asaah ued ALDAA garlaa."
  }

  $Message = @"
$Problem

Extract log: $env:TEMP\mgl-pos-bridge-install-extract.log
Log: $LogPath
Copy log: $env:TEMP\mgl-pos-bridge-install-robocopy.log

Installer-iig Run as administrator songoltoor dahin ajilluulna uu.
"@
  $Icon = 16
}

try {
  $Shell = New-Object -ComObject WScript.Shell
  $null = $Shell.Popup($Message, 0, $Title, $Icon)
} catch {
  Write-Host $Message
}
'@ | Set-Content -LiteralPath $ResultDialogPath -Encoding ASCII

  @"
@echo off
setlocal EnableExtensions
title MGL POS Bridge Installer

set "ZIP_PATH=%~dp0$ZipFileName"
set "EXTRACT_DIR=%TEMP%\mgl-pos-bridge-installer-%RANDOM%-%RANDOM%"
set "EXTRACT_LOG=%TEMP%\mgl-pos-bridge-install-extract.log"

echo ==================================================
echo   MGL POS Bridge suulgaj / shinechilj baina...
echo ==================================================
echo.
echo Ene tsonhiig suulgalt duustal bitgii haana uu.
echo.

if exist "%EXTRACT_LOG%" del /q "%EXTRACT_LOG%" >nul 2>nul
if exist "%EXTRACT_DIR%" rmdir /s /q "%EXTRACT_DIR%" >nul 2>nul
mkdir "%EXTRACT_DIR%" >"%EXTRACT_LOG%" 2>&1
if errorlevel 1 (
  echo [ERROR] Temporary folder uusgej chadsangui: %EXTRACT_DIR%
  type "%EXTRACT_LOG%"
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0show-install-result.ps1" -ExitCode 1 -Stage extract
  exit /b 1
)

echo [1/3] Installer failiig zadalj baina...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0extract-zip.ps1" -ZipPath "%ZIP_PATH%" -DestinationPath "%EXTRACT_DIR%" -ExpectedFileCount $ExpectedFileCount -ExpectedByteCount $ExpectedByteCount >>"%EXTRACT_LOG%" 2>&1
if errorlevel 1 (
  echo [ERROR] Installer zadlahad aldaa garlaa.
  echo [INFO] Extract log: %EXTRACT_LOG%
  type "%EXTRACT_LOG%"
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0show-install-result.ps1" -ExitCode 1 -Stage extract
  cd /d "%~dp0"
  rmdir /s /q "%EXTRACT_DIR%" >nul 2>nul
  exit /b 1
)

echo [2/3] Huuchin bridge-iig zogsooj, shine huvilbariig suulgaj baina...
call "%EXTRACT_DIR%\install-android-pgw.cmd" --no-pause
set "INSTALL_EXIT=%ERRORLEVEL%"
cd /d "%~dp0"
rmdir /s /q "%EXTRACT_DIR%" >nul 2>nul

echo [3/3] Suulgaltin tuluv shalgaj baina...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0show-install-result.ps1" -ExitCode %INSTALL_EXIT% -Stage install
exit /b %INSTALL_EXIT%
"@ | Set-Content -LiteralPath $BootstrapPath -Encoding ASCII

  $SedPath = Join-Path $InstallerWorkDir "mgl-pos-bridge.sed"
  $SedContent = @"
[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=1
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles

[Strings]
InstallPrompt=MGL POS Bridge-iig suulgah esvel shinechleh uu? Huuchin bridge automataar zogsono.
DisplayLicense=
FinishMessage=
TargetName=$InstallerExePath
FriendlyName=MGL POS Bridge $PackageSuffix Installer
AppLaunched=install-from-zip.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
FILE0="$ZipFileName"
FILE1="install-from-zip.cmd"
FILE2="extract-zip.ps1"
FILE3="show-install-result.ps1"

[SourceFiles]
SourceFiles0=$InstallerWorkDir\

[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
%FILE3%=
"@
  Set-Content -LiteralPath $SedPath -Value $SedContent -Encoding ASCII

  if (Test-Path $InstallerExePath) {
    Remove-Item -LiteralPath $InstallerExePath -Force
  }

  Invoke-Checked "iexpress.exe" @("/N", "/Q", $SedPath) $InstallerWorkDir
  $InstallerDeadline = (Get-Date).AddSeconds(60)
  while (-not (Test-Path $InstallerExePath) -and (Get-Date) -lt $InstallerDeadline) {
    Start-Sleep -Milliseconds 250
  }
  if (-not (Test-Path $InstallerExePath)) {
    Write-Host "[WARN] iexpress.exe did not create an installer exe on this Windows setup; use the zip package."
  }
} else {
  Write-Host "[WARN] iexpress.exe not found; only zip package was created."
}

Write-Host ""
Write-Host "[OK] Portable package:"
Write-Host "     $OutDir"
Write-Host "[OK] Flash-drive zip:"
Write-Host "     $ZipPath"
if (Test-Path $InstallerExePath) {
  Write-Host "[OK] Flash-drive installer exe:"
  Write-Host "     $InstallerExePath"
}
Write-Host ""
if (Test-Path $InstallerExePath) {
  Write-Host "Copy the exe to the cashier PC, then run it."
} else {
  Write-Host "Copy the zip or folder to the cashier PC, then run install-android-pgw.cmd."
}
